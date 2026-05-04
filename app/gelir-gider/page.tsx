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

type Income = {
  id: string;
  title: string;
  amount: number;
  income_date: string;
  payment_method: string | null;
  note: string | null;
};

type Expense = {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  note: string | null;
};

export default function GelirGiderPage() {
  const [tab, setTab] = useState<"gelir" | "gider">("gelir");
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();

    const { data: userData } = await supabase.auth.getUser();

    const { data: incomeData } = await supabase
      .from("income")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    setIncomes(incomeData || []);
    setExpenses(expenseData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalIncome = incomes.reduce((t, i) => t + Number(i.amount), 0);
  const totalExpense = expenses.reduce((t, i) => t + Number(i.amount), 0);
  const net = totalIncome - totalExpense;

  async function addIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("income").insert({
      title: String(form.get("title") || ""),
      amount: Number(form.get("amount") || 0),
      income_date: String(form.get("date") || today),
      payment_method: String(form.get("payment_method") || ""),
      note: String(form.get("note") || ""),
    });

    setLoading(false);

    if (error) {
      alert("Gelir ekleme hatası: " + error.message);
      return;
    }

    e.currentTarget.reset();
    loadData();
  }

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("expenses").insert({
      title: String(form.get("title") || ""),
      category: String(form.get("category") || ""),
      amount: Number(form.get("amount") || 0),
      expense_date: String(form.get("date") || today),
      payment_method: String(form.get("payment_method") || ""),
      note: String(form.get("note") || ""),
    });

    setLoading(false);

    if (error) {
      alert("Gider ekleme hatası: " + error.message);
      return;
    }

    e.currentTarget.reset();
    loadData();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Gelir - Gider</h1>
          <p className="text-slate-500 text-sm">Kasa ve finans takibi</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-slate-500 text-xs">Gelir</p>
          <h2 className="text-xl font-black">{money(totalIncome)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-slate-500 text-xs">Gider</p>
          <h2 className="text-xl font-black">{money(totalExpense)}</h2>
        </div>
        <div className="bg-slate-950 text-white rounded-2xl p-3 shadow-sm">
          <p className="text-slate-300 text-xs">Net</p>
          <h2 className="text-xl font-black">{money(net)}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[26px] p-4 shadow-sm mb-5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setTab("gelir")}
            className={`rounded-2xl p-3 font-bold ${tab === "gelir" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            Gelir Ekle
          </button>
          <button
            onClick={() => setTab("gider")}
            className={`rounded-2xl p-3 font-bold ${tab === "gider" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            Gider Ekle
          </button>
        </div>

        {tab === "gelir" ? (
          <form onSubmit={addIncome} className="grid gap-3">
            <input name="title" required placeholder="Gelir başlığı / müşteri" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <input name="amount" required type="number" placeholder="Tutar" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <input name="date" type="date" defaultValue={today} className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <select name="payment_method" className="bg-slate-100 rounded-2xl p-4 outline-none">
              <option value="nakit">Nakit</option>
              <option value="havale">Havale</option>
              <option value="kart">Kart</option>
              <option value="diğer">Diğer</option>
            </select>
            <textarea name="note" placeholder="Not" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <button disabled={loading} className="bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400 text-white rounded-2xl p-4 font-black">
              {loading ? "Kaydediliyor..." : "Geliri Kaydet"}
            </button>
          </form>
        ) : (
          <form onSubmit={addExpense} className="grid gap-3">
            <input name="title" required placeholder="Gider başlığı" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <input name="amount" required type="number" placeholder="Tutar" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <input name="category" placeholder="Kategori: reklam, yakıt, yemek..." className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <input name="date" type="date" defaultValue={today} className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <select name="payment_method" className="bg-slate-100 rounded-2xl p-4 outline-none">
              <option value="nakit">Nakit</option>
              <option value="havale">Havale</option>
              <option value="kart">Kart</option>
              <option value="diğer">Diğer</option>
            </select>
            <textarea name="note" placeholder="Not" className="bg-slate-100 rounded-2xl p-4 outline-none" />
            <button disabled={loading} className="bg-slate-950 text-white rounded-2xl p-4 font-black">
              {loading ? "Kaydediliyor..." : "Gideri Kaydet"}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">SON KAYITLAR</h2>

        <div className="grid gap-3">
          {[...incomes.map(i => ({...i, type: "gelir"})), ...expenses.map(e => ({...e, type: "gider"}))]
            .slice(0, 12)
            .map((item: any) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between gap-3">
                <div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="text-slate-500 text-sm">
                    {item.type === "gelir" ? "Gelir" : "Gider"} · {item.payment_method || "Yöntem yok"}
                  </p>
                </div>
                <div className={item.type === "gelir" ? "text-emerald-600 font-black" : "text-red-500 font-black"}>
                  {item.type === "gelir" ? "+" : "-"}{money(Number(item.amount))}
                </div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
