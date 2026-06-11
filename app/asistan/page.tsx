"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { money } from "@/components/ui";
import { IArrowLeft, ISparkle, ITrash, ICamera, IMic, ISend, ICheck } from "@/components/Icons";

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

function recordStyle(type: string) {
  if (type === "gelir") return "bg-[#e8f7f1] border-[#bfe8d8] text-[#065f46]";
  if (type === "gider") return "bg-[#fdeef1] border-[#f8cdd6] text-[#9f1239]";
  if (type === "iş") return "bg-[rgba(45,163,199,0.1)] border-[rgba(45,163,199,0.25)] text-[#186e8d]";
  if (type === "hatırlatma") return "bg-[rgba(232,163,61,0.12)] border-[rgba(232,163,61,0.3)] text-[#a16a14]";
  return "bg-canvas border-line text-ink";
}

/* Asistan avatarı — degrade orb */
function AiOrb({ size = 34 }: { size?: number }) {
  return (
    <div
      className="rounded-full grid place-items-center text-white shrink-0 shadow-[0_4px_14px_rgba(45,163,199,0.4)]"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #2da3c7, #e8a33d)" }}
    >
      <ISparkle size={size * 0.52} />
    </div>
  );
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
      if ((payments || []).length > 0) urgentLines.push(`• ${payments!.length} gecikmiş tahsilat — ${money(paymentTotal)}`);
      if ((contents || []).length > 0) urgentLines.push(`• ${contents!.length} yayınlanmayı bekleyen içerik`);
      if ((followups || []).length > 0) urgentLines.push(`• ${followups!.length} bekleyen görev`);

      const weekLines = (weekPayments || []).map((p: any) => `  · ${p.title} — ${money(Number(p.amount))} (${p.due_date})`);

      let intro = `${greeting} ${firstName} 👋\n\n`;

      if (urgentLines.length > 0) {
        intro += `Bugün acil:\n${urgentLines.join("\n")}`;
      } else {
        intro += `Bugün için acil bir şey yok.`;
      }

      if (todayTotal > 0) intro += `\n\nBugün ${money(todayTotal)} gelir aldın. 🎉`;

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
      ? `Belge kaydedildi · ${analysis.items.length} kalem\n` +
        (giderler.length ? `${giderler.length} gider` : "") +
        (giderler.length && gelirler.length ? " · " : "") +
        (gelirler.length ? `${gelirler.length} gelir` : "") +
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
    <main className="min-h-screen max-w-[520px] mx-auto flex flex-col">

      {/* Üst bar — sabit cam header */}
      <header className="sticky top-0 z-[100] bg-canvas/85 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="v-press h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center shrink-0" aria-label="Ana sayfa">
            <IArrowLeft size={19} />
          </Link>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <AiOrb size={38} />
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold tracking-tight leading-tight">Valkea Asistan</h1>
              <p className="text-[11px] font-semibold flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${recording ? "bg-rose animate-pulse" : loading ? "bg-amber animate-pulse" : "bg-mint"}`} />
                <span className="text-mute">{recording ? "Dinliyor..." : loading ? "Düşünüyor..." : "Çevrimiçi"}</span>
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); setShowQuick(true); }}
              className="v-press h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center text-mute"
              title="Sohbeti temizle"
            >
              <ITrash size={17} />
            </button>
          )}
        </div>
      </header>

      {/* Mesajlar */}
      <section className="flex-1 px-4 pb-44 pt-2 grid gap-3 content-start">

        {showQuick && messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                className="v-press whitespace-nowrap rounded-full bg-white border border-line px-4 py-2.5 text-[13px] font-bold text-teal-deep shadow-sm shrink-0"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div key={index} className={`v-enter flex gap-2 items-end ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && <AiOrb size={28} />}
              <div
                className={`max-w-[82%] p-4 ${
                  isUser
                    ? "rounded-[22px] rounded-br-lg bg-ink text-white shadow-[0_8px_24px_rgba(11,16,32,0.22)]"
                    : "rounded-[22px] rounded-bl-lg bg-white border border-line shadow-sm text-ink"
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
                  <p className="whitespace-pre-line text-sm leading-relaxed font-medium">{msg.text}</p>
                )}

                {/* Onay kartı */}
                {msg.proposal && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approveProposal(msg.proposal)}
                      disabled={loading}
                      className="v-btn v-btn-dark flex-1 !py-2.5 !text-[13px]"
                    >
                      <ICheck size={15} /> Evet, kaydet
                    </button>
                    <button
                      onClick={() =>
                        setMessages((prev) => [
                          ...prev,
                          { role: "assistant", text: "Tamam, kaydetmedim. Başka bir şey var mı?" },
                        ])
                      }
                      disabled={loading}
                      className="v-btn v-btn-soft flex-1 !py-2.5 !text-[13px]"
                    >
                      Hayır
                    </button>
                  </div>
                )}

                {msg.record && (
                  <div className={`mt-3 rounded-2xl border p-3 ${recordStyle(msg.record.type)}`}>
                    <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1 opacity-70">
                      {String(msg.record.type || "kayıt")} kaydı
                    </p>
                    <h3 className="font-extrabold text-sm">{msg.record.title}</h3>
                    {typeof msg.record.amount === "number" && (
                      <p className="v-num text-[22px] font-extrabold mt-0.5">{money(msg.record.amount)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2 items-end">
            <AiOrb size={28} />
            <div className="rounded-[22px] rounded-bl-lg bg-white border border-line shadow-sm px-5 py-4">
              <span className="inline-flex gap-1.5">
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
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

      {/* Giriş barı */}
      <section
        className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[496px] z-[9999] rounded-[26px] border border-line bg-white/95 backdrop-blur-xl p-2.5 shadow-[0_20px_60px_rgba(11,16,32,0.18)]"
        style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2 items-center">
          {/* Kamera */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || recording}
            className="v-press h-11 w-11 rounded-full bg-canvas text-sub grid place-items-center shrink-0 disabled:opacity-40"
            title="Fiş veya belge fotoğrafı"
          >
            <ICamera size={19} />
          </button>

          {/* Metin */}
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={recording ? "Dinliyor..." : "Mesaj yaz veya söyle..."}
            disabled={recording}
            className="flex-1 bg-canvas rounded-full px-4 py-3 outline-none text-sm font-medium disabled:opacity-50 min-w-0"
          />

          {/* Mikrofon */}
          <button
            onClick={toggleRecording}
            disabled={loading && !recording}
            className={`v-press h-11 w-11 rounded-full grid place-items-center shrink-0 transition-colors ${
              recording ? "bg-rose text-white animate-pulse" : "bg-canvas text-sub disabled:opacity-40"
            }`}
            title={recording ? "Kaydı durdur" : "Sesli komut"}
          >
            <IMic size={19} />
          </button>

          {/* Gönder */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !command.trim() || recording}
            className="v-press h-11 w-11 rounded-full grid place-items-center shrink-0 text-white disabled:opacity-40 shadow-[0_8px_20px_rgba(45,163,199,0.4)]"
            style={{ background: "linear-gradient(135deg, #2da3c7, #e8a33d)" }}
            aria-label="Gönder"
          >
            <ISend size={17} />
          </button>
        </div>
      </section>
    </main>
  );
}
