"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  record?: any;
  proposal?: any;
};

const QUICK_ACTIONS = [
  "Bugün ne yapıyoruz?",
  "Tahsilat durumu?",
  "Günlük özet",
  "Nasıl gidiyor?",
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
  if (type === "iş") return "bg-[#61aebd]/10 border-[#61aebd]/20 text-slate-950";
  if (type === "hatırlatma") return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-slate-50 border-slate-200 text-slate-950";
}

export default function AsistanPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    async function loadIntro() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const firstName = (profile?.full_name || "Kullanıcı").trim().split(" ")[0];
      const today = new Date().toISOString().slice(0, 10);

      const [{ data: payments }, { data: contents }, { data: followups }] =
        await Promise.all([
          supabase
            .from("payment_tracking")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "bekliyor")
            .lte("due_date", today),
          supabase
            .from("content_calendar")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "planlandı")
            .lte("publish_date", today),
          supabase
            .from("followups")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "bekliyor")
            .lte("followup_date", today),
        ]);

      const paymentTotal = (payments || []).reduce(
        (t: number, i: any) => t + Number(i.amount || 0),
        0
      );

      const intro =
        payments?.length || contents?.length || followups?.length
          ? `Merhaba ${firstName} 👋\n\nBugün takip listende:\n💰 ${payments?.length || 0} tahsilat (${money(paymentTotal)})\n📲 ${contents?.length || 0} içerik kontrolü\n✅ ${followups?.length || 0} görev bekliyor\n\nNe ile başlamak istersin?`
          : `Merhaba ${firstName} 👋\n\nBugün kritik bir takip görünmüyor. Yeni iş, tahsilat veya içerik planı ekleyebilirsin.`;

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

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-36">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA AI</p>
          <h1 className="text-3xl font-black">Asistan</h1>
          <p className="text-slate-500">Konuşarak işlerini yönet.</p>
        </div>

        <Link
          href="/"
          className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black"
        >
          Ana
        </Link>
      </header>

      {/* Quick actions */}
      {showQuick && messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="whitespace-nowrap rounded-2xl bg-white border border-[#61aebd]/20 px-4 py-2 text-sm font-black text-[#61aebd] shadow-sm flex-shrink-0"
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
                ? "ml-auto bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-white"
                : "mr-auto bg-white text-slate-950"
            }`}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>

            {msg.proposal && (
              <div className="mt-3 rounded-2xl bg-slate-50 border border-[#61aebd]/20 p-3">
                <p className="text-xs font-black text-[#61aebd] mb-1">ONAY BEKLİYOR</p>

                {msg.proposal.missing_questions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Açık sorular:</p>
                    {msg.proposal.missing_questions.map((q: string, i: number) => (
                      <p key={i} className="text-xs text-slate-600">• {q}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => approveProposal(msg.proposal)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-xl p-3 text-sm font-black disabled:opacity-50"
                >
                  ✅ Onayla ve Kaydet
                </button>
              </div>
            )}

            {msg.record && (
              <div
                className={`mt-3 rounded-2xl border p-3 ${recordStyle(msg.record.type)}`}
              >
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
                <span className="w-2 h-2 bg-[#61aebd] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[#61aebd] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#61aebd] rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm">Düşünüyor...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      <section className="fixed bottom-4 left-4 right-4 bg-white rounded-[28px] p-3 shadow-[0_18px_60px_rgba(15,23,42,0.18)] z-[9999]">
        <div className="flex gap-2">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Örn: Suite Halı 20.000₺ ödedi"
            className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm"
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading || !command.trim()}
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-white font-black text-xl disabled:opacity-40 flex items-center justify-center"
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}
