"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  image?: string; // base64 önizleme
  record?: any;
  proposal?: any;
};

const QUICK_ACTIONS = [
  "Bugün ne yapıyoruz?",
  "Bu ay ne kadar ödemem var?",
  "Kredi kartı borcum ne?",
  "Tahsilat durumu?",
  "Günlük özet",
  "Tasarruf önerisi",
];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function recordStyle(type: string) {
  if (type === "gelir") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (type === "gider") return "bg-red-50 border-red-200 text-red-900";
  if (type === "iş") return "bg-[#3fa7c9]/10 border-[#3fa7c9]/20 text-slate-950";
  if (type === "hatırlatma") return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-slate-50 border-slate-200 text-slate-950";
}

export default function AsistanPage() {
  const STORAGE_KEY = "valkea_chat_history";

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    async function loadIntro() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { window.location.href = "/login"; return; }

      // Geçmiş varsa sadece auth kontrolü yap, intro mesajı tekrar ekleme
      const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
      if (saved && JSON.parse(saved).length > 0) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const firstName = (profile?.full_name || "Kullanıcı").trim().split(" ")[0];
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

      const [
        { data: payments },
        { data: contents },
        { data: followups },
        { data: todayIncome },
        { data: weekPayments },
      ] = await Promise.all([
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today),
        supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
        supabase.from("income").select("amount").eq("user_id", user.id).eq("income_date", today),
        supabase.from("payment_tracking").select("amount,due_date,title").eq("user_id", user.id).eq("status", "bekliyor")
          .gt("due_date", today)
          .lte("due_date", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
          .order("due_date", { ascending: true }).limit(3),
      ]);

      const paymentTotal = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const todayTotal = (todayIncome || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      const urgentLines: string[] = [];
      if ((payments || []).length > 0) urgentLines.push(`💰 ${payments!.length} gecikmiş tahsilat — ${money(paymentTotal)}`);
      if ((contents || []).length > 0) urgentLines.push(`📲 ${contents!.length} yayınlanmayı bekleyen içerik`);
      if ((followups || []).length > 0) urgentLines.push(`✅ ${followups!.length} bekleyen görev`);

      const weekLines = (weekPayments || []).map((p: any) => `  · ${p.title} — ${money(Number(p.amount))} (${p.due_date})`);

      let intro = `${greeting} ${firstName} 👋\n\n`;

      if (urgentLines.length > 0) {
        intro += `Bugün acil:\n${urgentLines.join("\n")}`;
      } else {
        intro += `Bugün için acil bir şey yok.`;
      }

      if (todayTotal > 0) intro += `\n\n🎉 Bugün ${money(todayTotal)} gelir aldın.`;

      if (weekLines.length > 0) {
        intro += `\n\nBu hafta yaklaşan tahsilatlar:\n${weekLines.join("\n")}`;
      }

      intro += `\n\nNe yapmak istiyorsun? Fotoğraf çek, sesli söyle veya yaz.`;

      setMessages([{ role: "assistant", text: intro }]);
    }
    loadIntro();
  }, []);

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? command).trim();
    if (!text || loading) return;

    setShowQuick(false);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setCommand("");
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: text, access_token: sessionData.session?.access_token }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.message || "İşlem tamamlandı.", record: data.record, proposal: data.proposal },
    ]);
    setLoading(false);
  }

  async function approveProposal(proposal: any) {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan/onay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, access_token: sessionData.session?.access_token }),
    });

    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.message || "Kaydedildi.", record: data.record },
    ]);
    setLoading(false);
  }

  async function handleImageUpload(file: File) {
    if (!file || loading) return;

    setShowQuick(false);

    // Önizleme için base64'e çevir
    const previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setMessages((prev) => [...prev, { role: "user", text: "", image: previewUrl }]);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    // 1. Analiz
    const form = new FormData();
    form.append("image", file);
    form.append("access_token", sessionData.session?.access_token || "");

    const analysisRes = await fetch("/api/asistan/gorsel", { method: "POST", body: form });
    const analysis = await analysisRes.json();

    if (!analysis.ok || !analysis.items?.length) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: analysis.message || "Belgeden finansal hareket çıkarılamadı." },
      ]);
      setLoading(false);
      return;
    }

    // 2. Otomatik kaydet
    const saveRes = await fetch("/api/asistan/gorsel-kaydet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: analysis.items, access_token: sessionData.session?.access_token }),
    });
    const save = await saveRes.json();

    const giderler = analysis.items.filter((i: any) => i.type === "gider");
    const gelirler = analysis.items.filter((i: any) => i.type === "gelir");
    const total = analysis.items.reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

    const summary = save.ok
      ? `🧾 Belge kaydedildi · ${analysis.items.length} kalem\n` +
        (giderler.length ? `❤️ ${giderler.length} gider` : "") +
        (giderler.length && gelirler.length ? " · " : "") +
        (gelirler.length ? `💚 ${gelirler.length} gelir` : "") +
        `\nToplam: ${money(total)}`
      : save.message || "Kayıt sırasında hata oluştu.";

    setMessages((prev) => [...prev, { role: "assistant", text: summary }]);
    setLoading(false);
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return;

        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();

        const form = new FormData();
        form.append("audio", blob, "kayit.webm");
        form.append("access_token", sessionData.session?.access_token || "");

        const res = await fetch("/api/asistan/ses", { method: "POST", body: form });
        const data = await res.json();
        setLoading(false);

        if (data.ok && data.text) {
          // Transkripti direkt asistana gönder
          sendMessage(data.text);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.message || "Ses anlaşılamadı." },
          ]);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Mikrofon erişimi sağlanamadı. Tarayıcı iznini kontrol et." },
      ]);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-36">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#3fa7c9] text-xs font-black tracking-wide">VALKEA AI</p>
          <h1 className="text-3xl font-black">Asistan</h1>
          <p className="text-slate-500">Konuşarak işlerini yönet.</p>
        </div>
        <div className="flex gap-2">
          {messages.length > 1 && (
            <button
              onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); setShowQuick(true); }}
              className="bg-white rounded-2xl px-3 py-3 shadow-sm font-black text-slate-400 text-sm"
              title="Sohbeti temizle"
            >
              🗑
            </button>
          )}
          <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
        </div>
      </header>

      {showQuick && messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="whitespace-nowrap rounded-2xl bg-white border border-[#3fa7c9]/20 px-4 py-2 text-sm font-black text-[#3fa7c9] shadow-sm flex-shrink-0"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <section className="grid gap-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[88%] rounded-[24px] p-4 shadow-sm ${
              msg.role === "user"
                ? "ml-auto bg-gradient-to-br from-[#3fa7c9] to-[#e0a23c] text-white"
                : "mr-auto bg-white text-slate-950"
            }`}
          >
            {msg.image && (
              <img
                src={msg.image}
                alt="Yüklenen görsel"
                className="rounded-2xl max-h-52 w-full object-cover mb-2"
              />
            )}
            {msg.text && (
              <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
            )}

            {/* Kısa onay kartı — sadece iki buton */}
            {msg.proposal && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approveProposal(msg.proposal)}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#3fa7c9] to-[#e0a23c] text-white rounded-2xl py-3 text-sm font-black disabled:opacity-50"
                >
                  ✅ Evet, kaydet
                </button>
                <button
                  onClick={() =>
                    setMessages((prev) => [
                      ...prev,
                      { role: "assistant", text: "Tamam, kaydedmedim. Başka bir şey var mı?" },
                    ])
                  }
                  disabled={loading}
                  className="flex-1 bg-slate-100 text-slate-600 rounded-2xl py-3 text-sm font-black disabled:opacity-50"
                >
                  ❌ Hayır
                </button>
              </div>
            )}

            {msg.record && (
              <div className={`mt-3 rounded-2xl border p-3 ${recordStyle(msg.record.type)}`}>
                <p className="text-xs font-black mb-1">
                  {String(msg.record.type || "KAYIT").toUpperCase()} KAYDI
                </p>
                <h3 className="font-black">{msg.record.title}</h3>
                {typeof msg.record.amount === "number" && (
                  <p className="text-2xl font-black">{money(msg.record.amount)}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-white rounded-[24px] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-[#3fa7c9] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[#3fa7c9] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#3fa7c9] rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm">{recording ? "Dinliyor..." : "Düşünüyor..."}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = "";
        }}
      />

      <section className="fixed bottom-4 left-4 right-4 bg-white rounded-[28px] p-3 shadow-[0_18px_60px_rgba(15,23,42,0.18)] z-[9999]">
        <div className="flex gap-2 items-center">
          {/* Kamera */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || recording}
            className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            title="Fiş veya belge fotoğrafı"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Metin */}
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={recording ? "Dinliyor..." : "Örn: Suite Halı 20.000₺ ödedi"}
            disabled={recording}
            className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm disabled:opacity-50"
          />

          {/* Mikrofon */}
          <button
            onClick={toggleRecording}
            disabled={loading && !recording}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
              recording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-500 disabled:opacity-40"
            }`}
            title={recording ? "Kaydı durdur" : "Sesli komut"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Gönder */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !command.trim() || recording}
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#3fa7c9] to-[#e0a23c] text-white font-black text-xl disabled:opacity-40 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}
