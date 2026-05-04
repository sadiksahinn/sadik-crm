"use client";

import { useState } from "react";
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
  record?: {
    id: string;
    type: "gelir" | "gider" | "hatırlatma" | "müşteri" | "iş";
    title: string;
    amount?: number;
    table?: string;
  };
  proposal?: any;
};

export default function AsistanPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Merhaba Sadık 👋 Bana doğal şekilde yazabilirsin. Örn: “Markete 300 TL verdim” veya “Suite Halı 20000 TL ödedi”.",
    },
  ]);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ChatMessage["record"] | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

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
          access_token: sessionData.session?.access_token
        }),
      });

      const data = await res.json();

      const record = data.record
        ? {
            id: data.record.id,
            type: data.type,
            title: data.record.title,
            amount: data.record.amount,
            table: data.record.table,
          }
        : undefined;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.message || "İşlem tamamlandı.",
          record,
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
        access_token: sessionData.session?.access_token
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

  async function deleteRecord(record: NonNullable<ChatMessage["record"]>) {
    const ok = confirm("Bu kaydı silmek istiyor musun?");
    if (!ok || !record.table) return;

    await supabase.from(record.table).delete().eq("id", record.id);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `🗑️ Kayıt silindi: ${record.title}`,
      },
    ]);
  }

  function openEdit(record: NonNullable<ChatMessage["record"]>) {
    setEditing(record);
    setEditTitle(record.title || "");
    setEditAmount(record.amount ? String(record.amount) : "");
  }

  async function saveEdit() {
    if (!editing?.table) return;

    const payload: any = {};

    if (editing.table === "income" || editing.table === "expenses") {
      payload.title = editTitle;
      payload.amount = Number(editAmount || 0);
    }

    if (editing.table === "reminders") {
      payload.title = editTitle;
    }

    if (editing.table === "customers") {
      payload.name = editTitle;
      payload.brand_name = editTitle;
    }

    await supabase.from(editing.table).update(payload).eq("id", editing.id);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `✅ Kayıt güncellendi: ${editTitle}${editAmount ? " · " + money(Number(editAmount)) : ""}`,
      },
    ]);

    setEditing(null);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Valkea Asistan</h1>
          <p className="text-slate-500 text-sm">Konuşarak kayıt oluştur.</p>
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
                <p className="text-xs font-black text-purple-600 mb-2">✨ ÖNERİLEN PLAN</p>

                <div className="text-sm text-slate-700 leading-relaxed">
                  <p><b>Müşteri:</b> {msg.proposal.customer_name}</p>
                  {msg.proposal.reels && <p><b>Reels:</b> Ayda {msg.proposal.reels}</p>}
                  {msg.proposal.story && <p><b>Story:</b> Ayda {msg.proposal.story}</p>}
                  {msg.proposal.post && <p><b>Post:</b> Ayda {msg.proposal.post}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => approveProposal(msg.proposal)}
                    className="bg-slate-950 text-white rounded-xl p-3 text-sm font-black"
                  >
                    Onayla
                  </button>

                  <button
                    onClick={() =>
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", text: "Tamam, kaydetmedim. Daha net bilgi verirsen yeniden önerebilirim." },
                      ])
                    }
                    className="bg-white rounded-xl p-3 text-sm font-black shadow-sm"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            {msg.record && (
              <div className={`mt-3 rounded-2xl border p-3 ${
                msg.record.type === "gelir"
                  ? "bg-emerald-50 border-emerald-100"
                  : msg.record.type === "gider"
                  ? "bg-orange-50 border-orange-100"
                  : msg.record.type === "iş" || msg.record.type === "müşteri"
                  ? "bg-purple-50 border-purple-100"
                  : "bg-blue-50 border-blue-100"
              }`}>
                <p className="text-xs font-black text-purple-600 mb-1">
                  ✨ {msg.record.type.toUpperCase()} KAYDI
                </p>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">{msg.record.title}</h3>
                    {typeof msg.record.amount === "number" && (
                      <p className="text-2xl font-black text-slate-950">
                        {money(msg.record.amount)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => openEdit(msg.record!)}
                    className="bg-white rounded-xl p-3 text-sm font-black shadow-sm"
                  >
                    Düzenle
                  </button>

                  <button
                    onClick={() => deleteRecord(msg.record!)}
                    className="bg-red-50 text-red-600 rounded-xl p-3 text-sm font-black"
                  >
                    Sil
                  </button>
                </div>
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

      {editing && (
        <section className="fixed left-4 right-4 bottom-28 bg-white rounded-[28px] p-4 shadow-[0_20px_70px_rgba(15,23,42,0.25)] border border-slate-100">
          <h2 className="text-xl font-black mb-3">Kaydı Düzenle</h2>

          <div className="grid gap-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-slate-100 rounded-2xl p-4 outline-none"
              placeholder="Başlık"
            />

            {(editing.type === "gelir" || editing.type === "gider") && (
              <input
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                type="number"
                className="bg-slate-100 rounded-2xl p-4 outline-none"
                placeholder="Tutar"
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saveEdit}
                className="bg-slate-950 text-white rounded-2xl p-4 font-black"
              >
                Kaydet
              </button>

              <button
                onClick={() => setEditing(null)}
                className="bg-slate-100 rounded-2xl p-4 font-black"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </section>
      )}

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
