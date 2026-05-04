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

export default function GelirGiderPage() {
  const [tab, setTab] = useState<"gelir" | "gider">("gelir");
  const [records, setRecords] = useState<any[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
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

    setIncomeTotal((incomes || []).reduce((t, i) => t + Number(i.amount || 0), 0));
    setExpenseTotal((expenses || []).reduce((t, i) => t + Number(i.amount || 0), 0));

    setRecords([
      ...(incomes || []).map((i: any) => ({ ...i, type: "gelir" })),
      ...(expenses || []).map((e: any) => ({ ...e, type: "gider" })),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      alert("Oturum bulunamadı.");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      title: String(form.get("title") || ""),
      amount: Number(form.get("amount") || 0),
      payment_method: String(form.get("method") || "Nakit"),
      note: String(form.get("note") || ""),
    };

    if (tab === "gelir") {
      const { error } = await supabase.from("income").insert({
        ...payload,
        income_date: String(form.get("date") || today()),
      });

      if (error) {
        alert("Gelir ekleme hatası: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("expenses").insert({
        ...payload,
        expense_date: String(form.get("date") || today()),
        category: String(form.get("category") || "Genel"),
      });

      if (error) {
        alert("Gider ekleme hatası: " + error.message);
        setLoading(false);
        return;
      }
    }

    e.currentTarget.reset();
    setLoading(false);
    load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Gelir - Gider</h1>
          <p className="text-slate-500">Manuel kasa kaydı</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">Gelir</p>
          <h2 className="text-lg font-black text-emerald-600">{money(incomeTotal)}</h2>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">Gider</p>
          <h2 className="text-lg font-black text-red-600">{money(expenseTotal)}</h2>
        </div>

        <div className="bg-slate-950 text-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-300">Net</p>
          <h2 className="text-lg font-black">{money(incomeTotal - expenseTotal)}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[28px] p-4 shadow-sm mb-5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab("gelir")}
            className={`rounded-2xl p-4 font-black ${
              tab === "gelir"
                ? "bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Gelir Ekle
          </button>

          <button
            type="button"
            onClick={() => setTab("gider")}
            className={`rounded-2xl p-4 font-black ${
              tab === "gider"
                ? "bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Gider Ekle
          </button>
        </div>

        <form onSubmit={saveRecord} className="grid gap-3">
          <input name="title" required placeholder={tab === "gelir" ? "Örn: Suite Halı ödeme" : "Örn: Market"} className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input name="amount" required type="number" placeholder="Tutar" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input name="date" type="date" defaultValue={today()} className="bg-slate-100 rounded-2xl p-4 outline-none" />

          {tab === "gider" && (
            <input name="category" placeholder="Kategori: market, yakıt, reklam..." className="bg-slate-100 rounded-2xl p-4 outline-none" />
          )}

          <select name="method" className="bg-slate-100 rounded-2xl p-4 outline-none">
            <option>Nakit</option>
            <option>Havale/EFT</option>
            <option>Kredi Kartı</option>
            <option>Diğer</option>
          </select>

          <textarea name="note" placeholder="Not" className="bg-slate-100 rounded-2xl p-4 outline-none min-h-[90px]" />

          <button disabled={loading} className="bg-slate-950 text-white rounded-2xl p-4 font-black">
            {loading ? "Kaydediliyor..." : tab === "gelir" ? "Geliri Kaydet" : "Gideri Kaydet"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-black tracking-wide text-slate-700 mb-3">SON KAYITLAR</h2>

        <div className="grid gap-3">
          {records.map((r) => (
            <div key={`${r.type}-${r.id}`} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between gap-3">
              <div>
                <p className={`text-xs font-black ${r.type === "gelir" ? "text-emerald-600" : "text-red-600"}`}>
                  {r.type.toUpperCase()}
                </p>
                <h3 className="font-black">{r.title}</h3>
                <p className="text-slate-500 text-sm">{r.payment_method || "Yöntem yok"}</p>
              </div>

              <p className={`font-black ${r.type === "gelir" ? "text-emerald-600" : "text-red-600"}`}>
                {r.type === "gelir" ? "+" : "-"}{money(Number(r.amount))}
              </p>
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
