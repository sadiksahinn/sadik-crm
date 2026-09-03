"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { money } from "@/components/ui";
import { ISparkle, ITrash, ICamera, IMic, ISend, ICheck } from "@/components/Icons";
import { dateKey, daysFromToday } from "@/utils/date";
import { fetchWithSession, getValidSession } from "@/utils/auth-client";
import { transactionTitle } from "@/utils/transaction-label";

const supabase = createClient();

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  image?: string; // base64 önizleme
  record?: any;
  proposal?: any;
  documentItems?: any[];
  documentSaved?: boolean;
};

type AssistantBrief = {
  pendingExplanations: number;
  unpaidPayments: number;
  overdueCollections: number;
  possibleDuplicates: number;
  monthIncome: number;
  monthExpense: number;
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [recording, setRecording] = useState(false);
  const [brief, setBrief] = useState<AssistantBrief | null>(null);
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
      const session = await getValidSession(supabase);
      const user = session?.user;
      if (!user) { window.location.href = "/login"; return; }

      // Sohbet geçmişini göster; görev özeti her açılışta canlı veriden yenilenir.
      let restoredHistory = false;
      const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
      if (saved) {
        try {
          const history = JSON.parse(saved);
          if (Array.isArray(history) && history.length > 0) { setMessages(history); restoredHistory = true; }
        } catch {}
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const firstName = (profile?.full_name || "Kullanıcı").trim().split(" ")[0];
      const today = dateKey();
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

      const [
        { data: payments },
        { data: contents },
        { data: followups },
        { data: todayIncome },
        { data: weekPayments },
        { data: fixedExpenses },
        { data: creditCards },
        { data: loans },
        { data: loanPayments },
        { data: monthExpenses },
        { data: monthIncomes },
      ] = await Promise.all([
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today),
        supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
        supabase.from("income").select("amount").eq("user_id", user.id).eq("income_date", today),
        supabase.from("payment_tracking").select("amount,due_date,title").eq("user_id", user.id).eq("status", "bekliyor")
          .gt("due_date", today)
          .lte("due_date", daysFromToday(7))
          .order("due_date", { ascending: true }).limit(3),
        supabase.from("fixed_expenses").select("title,amount,due_day,is_paid_this_month,last_paid_date").eq("user_id", user.id),
        supabase.from("credit_cards").select("bank_name,card_name,min_payment,payment_day,is_paid_this_month,last_paid_date").eq("user_id", user.id),
        supabase.from("loans").select("id,bank_name,title,monthly_payment,payment_day").eq("user_id", user.id),
        supabase.from("expenses").select("note").eq("user_id", user.id).eq("payment_method", "Kredi Taksiti").gte("expense_date", today.slice(0, 7) + "-01"),
        supabase.from("expenses").select("id,title,amount,expense_date,note,category").eq("user_id", user.id).gte("expense_date", today.slice(0, 7) + "-01"),
        supabase.from("income").select("amount,income_date").eq("user_id", user.id).gte("income_date", today.slice(0, 7) + "-01"),
      ]);

      const paymentTotal = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const todayTotal = (todayIncome || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const monthKey = today.slice(0, 7);
      const paidThisMonth = (item: any) => !!item.is_paid_this_month && String(item.last_paid_date || "").slice(0, 7) === monthKey;
      const unpaidFixed = (fixedExpenses || []).filter((item: any) => !paidThisMonth(item));
      const unpaidCards = (creditCards || []).filter((item: any) => !paidThisMonth(item) && Number(item.min_payment || 0) > 0);
      const monthlyLoans = (loans || []).filter((item: any) => Number(item.monthly_payment || 0) > 0 && !(loanPayments || []).some((payment: any) => String(payment.note || "").includes(`loan:${item.id}`)));
      const outgoingTotal = [...unpaidFixed, ...unpaidCards].reduce((sum: number, item: any) => sum + Number(item.amount || item.min_payment || 0), 0)
        + monthlyLoans.reduce((sum: number, item: any) => sum + Number(item.monthly_payment || 0), 0);
      const outgoingCount = unpaidFixed.length + unpaidCards.length + monthlyLoans.length;
      const pendingExplanations = (monthExpenses || []).filter((item: any) => !String(item.note || "").includes("Açıklama:")).length;
      const duplicateKeys = new Map<string, number>();
      (monthExpenses || []).forEach((item: any) => {
        const key = `${String(item.expense_date || "").slice(0, 10)}|${Number(item.amount || 0).toFixed(2)}|${String(item.title || "").trim().toLocaleLowerCase("tr-TR")}`;
        duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
      });
      setBrief({
        pendingExplanations,
        unpaidPayments: outgoingCount,
        overdueCollections: (payments || []).length,
        possibleDuplicates: [...duplicateKeys.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
        monthIncome: (monthIncomes || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
        monthExpense: (monthExpenses || []).filter((item: any) => String(item.category || "").toLocaleLowerCase("tr-TR") !== "depozito").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
      });

      const urgentLines: string[] = [];
      if ((payments || []).length > 0) urgentLines.push(`• ${payments!.length} gecikmiş tahsilat — ${money(paymentTotal)}`);
      if ((contents || []).length > 0) urgentLines.push(`• ${contents!.length} yayınlanmayı bekleyen içerik`);
      if ((followups || []).length > 0) urgentLines.push(`• ${followups!.length} bekleyen görev`);
      if (outgoingCount > 0) urgentLines.push(`• ${outgoingCount} kart, kredi veya fatura ödemesi — ${money(outgoingTotal)}`);

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

      if (!restoredHistory) setMessages([{ role: "assistant", text: intro }]);
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

    try {
      const res = await fetchWithSession(supabase, "/api/asistan", (accessToken) => ({
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text, access_token: accessToken }),
      }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Asistan şu anda yanıt veremedi.");
      setMessages((prev) => [...prev, { role: "assistant", text: data.message || "İşlem tamamlandı.", record: data.record, proposal: data.proposal }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Asistan şu anda yanıt veremedi." }]);
    } finally { setLoading(false); }
  }

  async function approveProposal(proposal: any) {
    setLoading(true);
    try {
      const res = await fetchWithSession(supabase, "/api/asistan/onay", (accessToken) => ({
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal, access_token: accessToken }),
      }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Kayıt onaylanamadı.");
      setMessages((prev) => [...prev, { role: "assistant", text: data.message || "Kaydedildi.", record: data.record }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Kayıt onaylanamadı." }]);
    } finally { setLoading(false); }
  }

  async function handleImageUpload(file: File) {
    if (!file || loading) return;

    const isPdf = file.type === "application/pdf" || file.name.toLocaleLowerCase("tr-TR").endsWith(".pdf");
    const maxSize = isPdf ? 10 * 1024 * 1024 : 12 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessages((prev) => [...prev, { role: "assistant", text: `${isPdf ? "PDF" : "Görüntü"} dosyası en fazla ${isPdf ? "10" : "12"} MB olabilir.` }]);
      return;
    }

    setShowQuick(false);

    // Önizleme için base64'e çevir
    const previewUrl = isPdf ? "" : await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setMessages((prev) => [...prev, { role: "user", text: `${isPdf ? "Belge" : "Ekran görüntüsü"} yükledim: ${file.name}`, image: previewUrl || undefined }]);
    setLoading(true);
    try {
      const analysisRes = await fetchWithSession(supabase, isPdf ? "/api/asistan/pdf" : "/api/asistan/gorsel", (accessToken) => {
        const form = new FormData();
        form.append("image", file);
        form.append("access_token", accessToken);
        return { method: "POST", body: form };
      }, 90_000);
      const analysis = await analysisRes.json();

      if (!analysisRes.ok || !analysis.ok || !analysis.items?.length) {
        throw new Error(analysis.summary || analysis.message || "Belgeden yeni bir finansal hareket çıkarılamadı.");
      }

      const preparedItems = analysis.items.map((item: any) => {
        const suggestion = String(item.context_suggestion || "").trim();
        const suggestedContext = /tatil|seyahat|otel/i.test(suggestion) ? "Tatil" : /iş|müşteri|proje/i.test(suggestion) ? "İş" : "Kişisel";
        return { ...item, title: transactionTitle(item.title, item.merchant), explanation: String(item.explanation || ""), context: item.context || suggestedContext, project: item.project || suggestion };
      });
      const giderler = preparedItems.filter((i: any) => i.type === "gider");
      const gelirler = preparedItems.filter((i: any) => i.type === "gelir");
      const total = preparedItems.reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const privacyWarning = analysis.sensitive_data_warning
        ? "\n\n⚠️ Belgede kart numarası veya güvenlik kodu gibi hassas bilgi görünüyor. Bu bilgileri kaydetmiyorum; güvenliğin için kartını bankandan yenilemeni öneririm."
        : "";
      const summary = `${analysis.summary || "Belgeyi inceledim."}\n\n` +
        `${analysis.items.length} kalem buldum` +
        (giderler.length ? ` · ${giderler.length} gider` : "") +
        (gelirler.length ? ` · ${gelirler.length} gelir` : "") +
        `\nToplam: ${money(total)}${privacyWarning}\n\nKontrol et; onayından sonra kaydedeceğim.`;

      setMessages((prev) => [...prev, { role: "assistant", text: summary, documentItems: preparedItems }]);
    } catch (error) {
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "Analiz beklenenden uzun sürdü. Bağlantını kontrol edip tekrar deneyebilirsin."
        : error instanceof Error ? error.message : "Belge şu anda analiz edilemedi. Lütfen tekrar dene.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function saveDocumentItems(messageIndex: number, items: any[]) {
    if (loading || !items.length) return;
    const unexplained = items.filter((item) => item.type === "gider" && !String(item.explanation || "").trim());
    if (unexplained.length) {
      setMessages((prev) => [...prev, { role: "assistant", text: `${unexplained.length} giderin açıklaması eksik. Neden harcadığını yazmadan kaydetmeyeceğim.` }]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetchWithSession(supabase, "/api/asistan/gorsel-kaydet", (accessToken) => ({
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, access_token: accessToken }),
      }));
      const result = await response.json();
      setMessages((prev) => prev.map((message, index) =>
        index === messageIndex ? { ...message, documentSaved: result.ok, documentItems: result.ok ? undefined : message.documentItems } : message
      ));
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: result.ok ? result.message || "İşlemleri kaydettim." : result.message || "Kayıt sırasında bir sorun oluştu.",
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Kayıt sırasında bir sorun oluştu." }]);
    } finally {
      setLoading(false);
    }
  }

  function discardDocumentItems(messageIndex: number) {
    setMessages((prev) => prev.map((message, index) =>
      index === messageIndex ? { ...message, documentItems: undefined } : message
    ));
    setMessages((prev) => [...prev, { role: "assistant", text: "Tamam, belgedeki işlemleri kaydetmedim." }]);
  }

  function removeDocumentItem(messageIndex: number, itemIndex: number) {
    setMessages((prev) => prev.map((message, index) =>
      index === messageIndex
        ? { ...message, documentItems: (message.documentItems || []).filter((_, currentIndex) => currentIndex !== itemIndex) }
        : message
    ));
  }

  function updateDocumentItem(messageIndex: number, itemIndex: number, field: string, value: string) {
    setMessages((prev) => prev.map((message, index) => {
      if (index !== messageIndex) return message;
      return {
        ...message,
        documentItems: (message.documentItems || []).map((item, currentIndex) =>
          currentIndex === itemIndex ? { ...item, [field]: value } : item
        ),
      };
    }));
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
        try {
          const res = await fetchWithSession(supabase, "/api/asistan/ses", (accessToken) => {
            const form = new FormData();
            form.append("audio", blob, "kayit.webm");
            form.append("access_token", accessToken);
            return { method: "POST", body: form };
          }, 60_000);
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok || !data.text) throw new Error(data.message || "Ses anlaşılamadı.");
          setLoading(false);
          await sendMessage(data.text);
        } catch (error) {
          setMessages((prev) => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Ses anlaşılamadı." }]);
        } finally { setLoading(false); }
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
      <header className="sticky top-0 z-[100] bg-canvas/95 backdrop-blur-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
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
      <section className="flex-1 px-4 pb-64 pt-2 grid gap-3 content-start">

        {brief && (
          <section className="v-card overflow-hidden border border-line">
            <div className="bg-ink px-4 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="v-overline !text-white/45">Asistan görev merkezi</p>
                  <h2 className="mt-1 text-base font-extrabold">Kontrol bende, onay sende</h2>
                </div>
                <AiOrb size={36} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Bu ay gelir</p><p className="v-num mt-1 text-sm font-extrabold text-emerald-300">{money(brief.monthIncome)}</p></div>
                <div className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Bu ay gider</p><p className="v-num mt-1 text-sm font-extrabold text-rose-300">{money(brief.monthExpense)}</p></div>
              </div>
            </div>
            <div className="grid gap-2 p-3">
              <Link href="/harcamalar?durum=bekleyen" className="v-press flex items-center justify-between rounded-2xl bg-canvas px-3.5 py-3">
                <span><strong className="block text-sm">Harcamaları açıkla</strong><small className="mt-0.5 block text-[11px] font-semibold text-mute">Açıklanmayanları sırayla tamamla</small></span>
                <span className={`v-chip ${brief.pendingExplanations ? "v-chip-amber" : "v-chip-mint"}`}>{brief.pendingExplanations}</span>
              </Link>
              <Link href="/sabit-giderler" className="v-press flex items-center justify-between rounded-2xl bg-canvas px-3.5 py-3">
                <span><strong className="block text-sm">Ödemeleri kontrol et</strong><small className="mt-0.5 block text-[11px] font-semibold text-mute">Kart, kredi, kira ve faturalar</small></span>
                <span className={`v-chip ${brief.unpaidPayments ? "v-chip-rose" : "v-chip-mint"}`}>{brief.unpaidPayments}</span>
              </Link>
              {(brief.overdueCollections > 0 || brief.possibleDuplicates > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/tahsilatlar" className="v-press rounded-2xl bg-[#fff4df] p-3"><strong className="block text-lg text-[#9a6517]">{brief.overdueCollections}</strong><small className="text-[10px] font-bold text-sub">gecikmiş tahsilat</small></Link>
                  <button type="button" onClick={()=>sendMessage("Bu ay tekrar olabilecek harcamaları bul ve açıkla")} className="v-press rounded-2xl bg-[#eef1fb] p-3 text-left"><strong className="block text-lg text-[#36528c]">{brief.possibleDuplicates}</strong><small className="text-[10px] font-bold text-sub">olası tekrar</small></button>
                </div>
              )}
            </div>
          </section>
        )}

        {showQuick && messages.length > 0 && (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              className="v-press w-full rounded-2xl bg-ink text-white px-4 py-3.5 flex items-center gap-3 text-left disabled:opacity-50"
            >
              <span className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center"><ICamera size={19} /></span>
              <span className="min-w-0"><strong className="block text-sm">Ekran görüntüsü, ekstre veya PDF yükle</strong><small className="block text-white/60 mt-0.5">Hareketleri bulayım, sen onaylayınca kaydedeyim</small></span>
            </button>
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

                {/* Belge/ekstre analizi: kullanıcı onaylamadan finans kaydı oluşturulmaz */}
                {msg.documentItems && msg.documentItems.length > 0 && (
                  <div className="mt-3">
                    <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                      {msg.documentItems.map((item, itemIndex) => (
                        <div key={itemIndex} className="rounded-2xl border border-line bg-canvas p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <label className="block text-xs font-semibold">İşlem adı
                                <input value={item.title || ""} onChange={(event) => updateDocumentItem(index, itemIndex, "title", event.target.value)} className="v-input mt-1 !text-base" placeholder="İşyeri veya gelir kaynağı" />
                              </label>
                              <p className="mt-0.5 text-[11px] font-medium text-mute">
                                {item.date || "Tarih belirtilmedi"} · {item.city || item.category || "Diğer"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`v-num text-[13px] font-extrabold ${item.type === "gelir" ? "text-mint" : "text-rose"}`}>
                                {item.type === "gelir" ? "+" : "-"}{money(Number(item.amount || 0))}
                              </p>
                              <span className={`v-chip !px-2 !py-0.5 !text-[9px] ${item.type === "gelir" ? "v-chip-mint" : "v-chip-rose"}`}>
                                {item.type === "gelir" ? "Gelir" : "Gider"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocumentItem(index, itemIndex)}
                              className="v-press h-8 w-8 rounded-xl bg-white border border-line text-mute grid place-items-center shrink-0"
                              aria-label={`${item.title} kaydını listeden çıkar`}
                            >
                              <ITrash size={13} />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              value={item.category || "Diğer"}
                              onChange={(event) => updateDocumentItem(index, itemIndex, "category", event.target.value)}
                              className="v-input !rounded-xl !px-3 !py-2.5 !text-[12px]"
                              aria-label={`${item.title} kategorisi`}
                            >
                              {["Market","Ulaşım","Yemek","Fatura","Sağlık","Eğlence","Konaklama","Akaryakıt","Kira","Abonelik","Diğer"].map(category => <option key={category}>{category}</option>)}
                            </select>
                            <select
                              value={item.card_source || "bilinmiyor"}
                              onChange={(event) => updateDocumentItem(index, itemIndex, "card_source", event.target.value)}
                              className="v-input !rounded-xl !px-3 !py-2.5 !text-[12px]"
                              aria-label={`${item.title} kartı`}
                            >
                              <option value="ana_kart">Enpara kartım</option>
                              <option value="sanal_kart">Sanal kartım</option>
                              <option value="bilinmiyor">Kart bilinmiyor</option>
                            </select>
                          </div>
                          <select
                            value={item.payment_channel || "bilinmiyor"}
                            onChange={(event) => updateDocumentItem(index, itemIndex, "payment_channel", event.target.value)}
                            className="v-input mt-2 !rounded-xl !px-3 !py-2.5 !text-[12px]"
                            aria-label={`${item.title} ödeme yöntemi`}
                          >
                            <option value="temassiz">Temassız</option>
                            <option value="qr">QR ile ödeme</option>
                            <option value="fiziksel_kart">Fiziksel kart</option>
                            <option value="internet">İnternet / sanal kart</option>
                            <option value="bilinmiyor">Yöntem bilinmiyor</option>
                          </select>
                          <input
                            value={item.explanation || ""}
                            onChange={(event) => updateDocumentItem(index, itemIndex, "explanation", event.target.value)}
                            placeholder="Bu harcama ne içindi? Örn. Antalya tatili"
                            className="v-input mt-2 !rounded-xl !px-3 !py-2.5 !text-[12px]"
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select value={item.context || "Kişisel"} onChange={(event) => updateDocumentItem(index, itemIndex, "context", event.target.value)} className="v-input !rounded-xl !px-3 !py-2.5 !text-[12px]" aria-label={`${item.title} bağlamı`}>
                              {["Kişisel","Ev","İş","Tatil","Sağlık","Aile","Eğitim"].map(context => <option key={context}>{context}</option>)}
                            </select>
                            <input value={item.project || ""} onChange={(event) => updateDocumentItem(index, itemIndex, "project", event.target.value)} placeholder="İş / proje" className="v-input !rounded-xl !px-3 !py-2.5 !text-[12px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => saveDocumentItems(index, msg.documentItems || [])}
                        disabled={loading || (msg.documentItems || []).some(item => item.type === "gider" && !String(item.explanation || "").trim())}
                        className="v-btn v-btn-dark flex-1 !py-2.5 !text-[13px]"
                      >
                        <ICheck size={15} /> Onayla ve kaydet
                      </button>
                      <button
                        onClick={() => discardDocumentItems(index)}
                        disabled={loading}
                        className="v-btn v-btn-soft !py-2.5 !px-4 !text-[13px]"
                      >
                        Vazgeç
                      </button>
                    </div>
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
        accept="image/*,application/pdf"
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
        style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 78px)" }}
      >
        <div className="flex gap-2 items-center">
          {/* Kamera */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || recording}
            className="v-press h-11 w-11 rounded-full bg-canvas text-sub grid place-items-center shrink-0 disabled:opacity-40"
            title="Fiş, ekstre PDF'i veya belge fotoğrafı"
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
