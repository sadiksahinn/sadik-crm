"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

export default function GelirGiderPage() {
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Nakit");
  const [note, setNote] = useState("");
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: incomes } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setIncomeTotal((incomes || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));
    setExpenseTotal((expenses || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));

    const mixed = [
      ...(incomes || []).map((x: any) => ({ ...x, kind: "gelir" })),
      ...(expenses || []).map((x: any) => ({ ...x, kind: "gider" })),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    setRecords(mixed);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRecord() {
    if (!title.trim() || !amount) {
      alert("Başlık ve tutar gir.");
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      alert("Oturum bulunamadı.");
      setLoading(false);
      return;
    }

    if (tab === "income") {
      const { error } = await supabase.from("income").insert({
        user_id: user.id,
        title,
        amount: Number(amount),
        income_date: today(),
        payment_method: method,
        note,
      });

      if (error) {
        alert("Gelir ekleme hatası: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        title,
        amount: Number(amount),
        expense_date: today(),
        category: "Genel",
        payment_method: method,
        note,
      });

      if (error) {
        alert("Gider ekleme hatası: " + error.message);
        setLoading(false);
        return;
      }
    }

    setTitle("");
    setAmount("");
    setNote("");
    setLoading(false);
    load();
  }

  const net = incomeTotal - expenseTotal;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-32">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black">Gelir - Gider</h1>
          <p className="text-slate-500">Kasa ve finans takibi</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-slate-500">Gelir</p>
          <h2 className="text-2xl font-black text-emerald-600">{money(incomeTotal)}</h2>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-slate-500">Gider</p>
          <h2 className="text-2xl font-black text-red-600">{money(expenseTotal)}</h2>
        </div>

        <div className="bg-slate-950 text-white rounded-3xl p-4 shadow-sm">
          <p className="text-slate-300">Net</p>
          <h2 className="text-2xl font-black">{money(net)}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[32px] p-5 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setTab("income")}
            className={`rounded-2xl p-4 font-black ${tab === "income" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            Gelir Ekle
          </button>

          <button
            onClick={() => setTab("expense")}
            className={`rounded-2xl p-4 font-black ${tab === "expense" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            Gider Ekle
          </button>
        </div>

        <div className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tab === "income" ? "Örn: Suite Halı ödeme" : "Örn: Market"}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="Tutar"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          >
            <option>Nakit</option>
            <option>Havale/EFT</option>
            <option>Kredi Kartı</option>
            <option>Diğer</option>
          </select>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not"
            className="bg-slate-100 rounded-2xl p-4 outline-none min-h-[100px]"
          />

          <button
            onClick={saveRecord}
            disabled={loading}
            className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-black tracking-wide text-slate-700 mb-3">SON KAYITLAR</h2>

        <div className="grid gap-3">
          {records.map((r) => (
            <div key={`${r.kind}-${r.id}`} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className={`text-xs font-black ${r.kind === "gelir" ? "text-emerald-600" : "text-red-600"}`}>
                  {r.kind.toUpperCase()}
                </p>
                <h3 className="font-black">{r.title}</h3>
                <p className="text-slate-500 text-sm">{r.payment_method || "Yöntem yok"}</p>
              </div>

              <p className="text-xl font-black">{money(r.amount)}</p>
            </div>
          ))}

          {records.length === 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-slate-500">
              Henüz kayıt yok.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
