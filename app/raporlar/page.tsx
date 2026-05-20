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

function thisMonthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

export default function RaporlarPage() {
  const [income, setIncome] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const month = thisMonthPrefix();

    const { data: incomeData } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", user.id)
      .gte("income_date", `${month}-01`)
      .lte("income_date", `${month}-31`)
      .order("income_date", { ascending: false });

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", `${month}-01`)
      .lte("expense_date", `${month}-31`)
      .order("expense_date", { ascending: false });

    const { data: paymentData } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .order("due_date", { ascending: true });

    const { data: customerData } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setIncome(incomeData || []);
    setExpenses(expenseData || []);
    setPayments(paymentData || []);
    setCustomers(customerData || []);
  }

  useEffect(() => {
    load();
  }, []);

  const totalIncome = income.reduce((t, i) => t + Number(i.amount || 0), 0);
  const totalExpense = expenses.reduce((t, i) => t + Number(i.amount || 0), 0);
  const totalPayment = payments.reduce((t, i) => t + Number(i.amount || 0), 0);
  const net = totalIncome - totalExpense;

  const topExpense = expenses
    .reduce((acc: any[], item: any) => {
      const key = item.category || "Genel";
      const found = acc.find((x) => x.category === key);
      if (found) found.total += Number(item.amount || 0);
      else acc.push({ category: key, total: Number(item.amount || 0) });
      return acc;
    }, [])
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">
            VALKEA REPORT
          </p>
          <h1 className="text-3xl font-black">Aylık Rapor</h1>
          <p className="text-slate-500">Bu ay finans ve iş özeti</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <p className="text-[#61aebd] text-xs font-black">NET DURUM</p>
        <h2 className={`text-4xl font-black mt-2 ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {money(net)}
        </h2>
        <p className="text-slate-500 mt-2">
          {net >= 0
            ? "Bu ay kârdasın. Tahsilatları kapatırsan net durum daha da güçlenir."
            : "Bu ay giderlerin gelirden yüksek. Harcama kalemlerini kontrol et."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Gelir</p>
          <h2 className="text-2xl font-black text-emerald-600">{money(totalIncome)}</h2>
        </div>

        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Gider</p>
          <h2 className="text-2xl font-black text-red-500">{money(totalExpense)}</h2>
        </div>

        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Bekleyen Tahsilat</p>
          <h2 className="text-2xl font-black text-[#e5ab53]">{money(totalPayment)}</h2>
        </div>

        <div className="bg-white rounded-[26px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Müşteri</p>
          <h2 className="text-2xl font-black">{customers.length}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-xl font-black mb-4">AI Finans Yorumu</h2>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-[#61aebd]/10 p-4">
            <p className="font-black">Tasarruf Alanı</p>
            <p className="text-sm text-slate-600 mt-1">
              En yüksek gider kalemin {topExpense[0]?.category || "henüz yok"}.
              Bu kalemi takip ederek ay sonunda daha net tasarruf analizi çıkarabiliriz.
            </p>
          </div>

          <div className="rounded-2xl bg-[#e5ab53]/10 p-4">
            <p className="font-black">Tahsilat Uyarısı</p>
            <p className="text-sm text-slate-600 mt-1">
              Bekleyen tahsilat toplamın {money(totalPayment)}.
              Bu tutar kapanırsa aylık net durumun {money(net + totalPayment)} olur.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm">
        <h2 className="text-xl font-black mb-4">Gider Dağılımı</h2>

        <div className="grid gap-3">
          {topExpense.map((item) => (
            <div key={item.category} className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="font-black">{item.category}</p>
              <p className="font-black text-red-500">{money(item.total)}</p>
            </div>
          ))}

          {topExpense.length === 0 && (
            <p className="text-slate-500">Bu ay gider kaydı yok.</p>
          )}
        </div>
      </section>
    </main>
  );
}
