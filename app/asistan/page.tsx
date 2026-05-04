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

export default function AsistanPage() {
  const [fullName, setFullName] = useState("Kullanıcı");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
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

      const name = profile?.full_name || "Kullanıcı";
      const firstName = name.trim().split(" ")[0];

      setFullName(name);
      setMessages([
        {
          role: "assistant",
          text: `Merhaba ${firstName} 👋 Bana doğal şekilde yazabilirsin. Örn: “Markete 300 TL verdim” veya “Suite Halı 20000 TL ödeme yaptı”.`,
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

    try {
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
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Hata oluştu: " + err.message },
      ]);
    }

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
                ? "ml-auto bg-slate-950 text-white"
                : "mr-auto bg-white text-slate-950"
            }`}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>

            {msg.proposal && (
              <div className="mt-3 rounded-2xl bg-purple-50 border border-purple-100 p-3">
                <p className="text-xs font-black text-purple-600 mb-2">
                  ✨ ÖNERİ
                </p>

                <button
                  onClick={() => approveProposal(msg.proposal)}
                  className="w-full bg-slate-950 text-white rounded-xl p-3 text-sm font-black"
                >
                  Onayla
                </button>
              </div>
            )}

            {msg.record && (
              <div
                className={`mt-3 rounded-2xl border p-3 ${
                  msg.record.type === "gelir"
                    ? "bg-emerald-50 border-emerald-100"
                    : msg.record.type === "gider"
                    ? "bg-orange-50 border-orange-100"
                    : "bg-purple-50 border-purple-100"
                }`}
              >
                <p className="text-xs font-black text-purple-600 mb-1">
                  ✨ {String(msg.record.type || "KAYIT").toUpperCase()}
                </p>
                <h3 className="font-black">{msg.record.title}</h3>
                {typeof msg.record.amount === "number" && (
                  <p className="text-2xl font-black">
                    {money(msg.record.amount)}
                  </p>
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
            placeholder="Örn: Markete 300 TL verdim"
            className="flex-1 bg-slate-100 rounded-2xl px-4 outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white font-black"
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}
