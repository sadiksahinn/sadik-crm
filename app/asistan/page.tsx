"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  record?: any;
  proposal?: any;
};

function recordStyle(type: string) {
  if (type === "gelir") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (type === "gider") return "bg-red-50 border-red-200 text-red-900";
  if (type === "iş") return "bg-[#61aebd]/10 border-[#61aebd]/30 text-purple-900";
  if (type === "plan") return "bg-blue-50 border-blue-200 text-blue-900";
  return "bg-slate-50 border-slate-200 text-slate-900";
}

export default function AsistanPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  

  useEffect(() => {

    async function loadAutoMessage() {
      if (autoMessageLoaded) return;

      try {
        const res = await fetch("/api/asistan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Günlük özet ver" }),
        });

        const data = await res.json();

        if (data?.message) {
          setMessages((prev:any) => [
            ...prev,
            { role: "assistant", content: data.message },
          ]);
        }

        setAutoMessageLoaded(true);
      } catch (e) {
        console.log("AI auto load error");
      }
    }

    loadAutoMessage();
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const firstName = (profile?.full_name || "Kullanıcı").split(" ")[0];

      const today = new Date().toISOString().slice(0, 10);

      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("due_date", today);

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "planlandı")
        .lte("publish_date", today);

      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("followup_date", today);

      const paymentTotal = (payments || []).reduce((t:any, i:any) => t + Number(i.amount || 0), 0);

      const intro =
        (payments?.length || contents?.length || followups?.length)
          ? `Merhaba ${firstName} 👋 Bugün ${payments?.length || 0} tahsilat, ${contents?.length || 0} içerik ve ${followups?.length || 0} takip kontrolün var. Bekleyen tahsilat toplamı: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(paymentTotal)}.`
          : `Merhaba ${firstName} 👋 Bugün kritik bir takip görünmüyor. Yeni iş, tahsilat veya içerik planı ekleyebilirsin.`;

      setMessages([
        {
          role: "assistant",
          text: intro,
        },
      ]);
    }

    loadProfile();
  }, []);

  async function sendMessage() {
    const text = command.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setCommand("");
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: text,
        access_token: sessionData.session?.access_token,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: data.message || "İşlem tamamlandı.",
        record: data.record,
        proposal: data.proposal,
      },
    ]);

    setLoading(false);
  }

  async function approveProposal(proposal: any) {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan/onay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal,
        access_token: sessionData.session?.access_token,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: data.message || "Kaydedildi.",
        record: data.record,
      },
    ]);

    setLoading(false);
  }

  async function handlePaymentAction(record: any, action: "paid" | "later") {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan/odeme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record,
        action,
        access_token: sessionData.session?.access_token,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: data.message || "İşlem tamamlandı.",
        record: data.record,
      },
    ]);

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Valkea Asistan</h1>
          <p className="text-slate-500 text-sm">Konuşarak CRM yönet.</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="grid gap-3 mb-5">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[88%] rounded-[24px] p-4 shadow-sm ${
              msg.role === "user"
                ? "ml-auto bg-white text-slate-950"
                : "mr-auto bg-white text-slate-950"
            }`}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>

            {msg.proposal && (
              <div className="mt-3 rounded-2xl bg-white border border-[#61aebd]/30 p-3">
                <p className="text-xs font-black text-[#61aebd] mb-2">
                  ✨ ONAY BEKLEYEN ÖNERİ
                </p>

                <div className="text-sm text-slate-700 leading-relaxed">
                  {msg.proposal.customer_name && (
                    <p><b>Müşteri:</b> {msg.proposal.customer_name}</p>
                  )}
                  {msg.proposal.amount > 0 && (
                    <p><b>Tutar:</b> {money(msg.proposal.amount)}</p>
                  )}
                  {msg.proposal.reels && <p><b>Reels:</b> Ayda {msg.proposal.reels}</p>}
                  {msg.proposal.story && <p><b>Story:</b> Ayda {msg.proposal.story}</p>}
                  {msg.proposal.post && <p><b>Post:</b> Ayda {msg.proposal.post}</p>}
                </div>

                {msg.proposal.missing_questions?.length > 0 && (
                  <div className="mt-3 rounded-xl bg-[#61aebd]/10 p-3">
                    <p className="text-xs font-black text-purple-700 mb-1">
                      Eksik bilgiler
                    </p>
                    <ul className="text-sm list-disc pl-4 text-purple-900">
                      {msg.proposal.missing_questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => approveProposal(msg.proposal)}
                    className="bg-white text-slate-950 rounded-xl p-3 text-sm font-black"
                  >
                    Onayla
                  </button>

                  <button
                    onClick={() =>
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", text: "Tamam, kaydetmedim. Bilgileri netleştirince tekrar yazabilirsin." },
                      ])
                    }
                    className="bg-slate-100 rounded-xl p-3 text-sm font-black"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            {msg.record && (
              <div className={`mt-3 rounded-2xl border p-3 ${recordStyle(msg.record.type)}`}>
                <p className="text-xs font-black mb-1">
                  ✨ {String(msg.record.type || "KAYIT").toUpperCase()} KAYDI
                </p>

                <h3 className="font-black">{msg.record.title}</h3>

                {typeof msg.record.amount === "number" && (
                  <p className="text-2xl font-black">{money(msg.record.amount)}</p>
                )}

                {msg.record.ask_payment && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => handlePaymentAction(msg.record, "paid")}
                      className="bg-emerald-600 text-slate-950 rounded-xl p-3 text-sm font-black"
                    >
                      Ödeme Aldım
                    </button>

                    <button
                      onClick={() => handlePaymentAction(msg.record, "later")}
                      className="bg-white rounded-xl p-3 text-sm font-black shadow-sm"
                    >
                      Sonra Alacağım
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-white rounded-[24px] p-4 shadow-sm text-slate-500">
            İşleniyor...
          </div>
        )}
      </section>

      <section className="fixed bottom-4 left-4 right-4 bg-white rounded-[28px] p-3 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <div className="flex gap-2">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Örn: Suite Halı ile aylık 20000 TL iş aldım"
            className="flex-1 bg-slate-100 rounded-2xl px-4 outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-slate-950 font-black"
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}
