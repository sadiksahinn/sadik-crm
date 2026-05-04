"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TahsilatlarPage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    setItems(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addPayment() {
    if (!title.trim() || !amount) {
      alert("Başlık ve tutar gir.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("payment_tracking").insert({
      user_id: user.id,
      title,
      amount: Number(amount),
      due_date: date,
      status: "bekliyor",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setAmount("");
    setDate(today());
    load();
  }

  async function markPaid(item: any) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase
      .from("payment_tracking")
      .update({
        status: "ödendi",
        paid_date: today(),
      })
      .eq("id", item.id);

    await supabase.from("income").insert({
      user_id: user.id,
      title: item.title,
      amount: Number(item.amount || 0),
      income_date: today(),
      payment_method: "Tahsilat",
      note: "Tahsilat ekranından ödendi olarak işaretlendi.",
    });

    load();
  }

  async function deletePayment(item: any) {
    if (!confirm("Bu tahsilat kaydı silinsin mi?")) return;

    await supabase.from("payment_tracking").delete().eq("id", item.id);
    load();
  }

  const pending = items.filter((i) => i.status !== "ödendi");
  const paid = items.filter((i) => i.status === "ödendi");
  const pendingTotal = pending.reduce((t, i) => t + Number(i.amount || 0), 0);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Tahsilatlar</h1>
          <p className="text-slate-500">Bekleyen ödemeleri takip et</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Bekleyen</p>
          <h2 className="text-2xl font-black text-red-600">{money(pendingTotal)}</h2>
        </div>

        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Ödenen</p>
          <h2 className="text-2xl font-black text-emerald-600">{paid.length}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-xl font-black mb-4">Yeni Tahsilat</h2>

        <div className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Suite Halı ödeme"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="Tutar"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <button
            onClick={addPayment}
            className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black"
          >
            Tahsilat Ekle
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{item.due_date}</p>
                <h3 className="font-black">{item.title}</h3>
                <p className={item.status === "ödendi" ? "text-emerald-600 font-black" : "text-red-500 font-black"}>
                  {item.status}
                </p>
              </div>

              <p className="text-xl font-black">{money(Number(item.amount))}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {item.status !== "ödendi" ? (
                <button
                  onClick={() => markPaid(item)}
                  className="bg-emerald-50 text-emerald-600 rounded-xl p-3 font-black"
                >
                  Ödendi
                </button>
              ) : (
                <div className="bg-slate-100 rounded-xl p-3 font-black text-center">
                  Tamam
                </div>
              )}

              <button
                onClick={() => {
                  const msg = `Merhaba, ${item.title} için ${money(Number(item.amount || 0))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
                  navigator.clipboard.writeText(msg);
                  alert("WhatsApp mesajı kopyalandı.");
                }}
                className="bg-[#61aebd]/10 text-[#61aebd] rounded-xl p-3 font-black"
              >
                Mesaj
              </button>

              <button
                onClick={() => deletePayment(item)}
                className="bg-red-50 text-red-600 rounded-xl p-3 font-black col-span-2"
              >
                Sil
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm text-slate-500">
            Henüz tahsilat kaydı yok.
          </div>
        )}
      </section>
    </main>
  );
}
