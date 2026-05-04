"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

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

export default function Home() {
  const [ready, setReady] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);

  useEffect(() => {
    async function start() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/login";
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      const { data: incomes } = await supabase
        .from("income")
        .select("amount")
        .eq("income_date", today);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("expense_date", today);

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "tamamlandı");

      setCustomerCount(count || 0);
      setTodayIncome(incomes?.reduce((t, i) => t + Number(i.amount), 0) || 0);
      setTodayExpense(expenses?.reduce((t, i) => t + Number(i.amount), 0) || 0);
      setPendingTasks(taskCount || 0);
      setReady(true);
    }

    start();
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#f7f8fc] grid place-items-center">
        <div className="font-bold text-slate-500">Valkea açılıyor...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-5">
        <div className="relative h-12 w-40">
          <Image src="/valkea-logo.png" alt="Valkea Assistant" fill priority className="object-contain object-left" />
        </div>

        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-full bg-white shadow-lg grid place-items-center text-sm">🔔</div>
          <Link href="/profil" className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 shadow-lg grid place-items-center text-white font-black">
            S
          </Link>
        </div>
      </header>

      <section className="mb-4">
        <h1 className="text-3xl font-black tracking-tight">Günaydın, Sadık 👋</h1>
        <p className="text-slate-500 mt-1 text-base">Gününü birlikte planlayalım.</p>
      </section>

      <section className="relative overflow-hidden rounded-[26px] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] p-4 mb-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400" />
        <p className="text-xs font-black text-purple-600">BUGÜN</p>
        <h2 className="text-2xl font-black mt-2">Kontrol sende.</h2>
        <p className="text-slate-500 text-sm mt-1">Planla, yönet, büyüt.</p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 grid place-items-center">✓</div>
            <div className="text-2xl font-black mt-2">{pendingTasks}</div>
            <p className="text-xs text-slate-500">Görev</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50 grid place-items-center">👥</div>
            <div className="text-2xl font-black mt-2">{customerCount}</div>
            <p className="text-xs text-slate-500">Müşteri</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="h-9 w-9 rounded-xl bg-orange-50 grid place-items-center">₺</div>
            <div className="text-xl font-black mt-2">{money(todayIncome)}</div>
            <p className="text-xs text-slate-500">Gelir</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/musteriler" className="bg-white rounded-[22px] p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-blue-50 grid place-items-center mb-3">👥</div>
          <p className="text-slate-500 text-sm">Müşteriler</p>
          <h3 className="text-2xl font-black">{customerCount}</h3>
          <p className="text-xs text-slate-400">Aktif portföy</p>
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[22px] p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-purple-50 grid place-items-center mb-3">₺</div>
          <p className="text-slate-500 text-sm">Gelir</p>
          <h3 className="text-2xl font-black">{money(todayIncome)}</h3>
          <p className="text-xs text-slate-400">Bugünkü gelir</p>
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[22px] p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-red-50 grid place-items-center mb-3">↘</div>
          <p className="text-slate-500 text-sm">Gider</p>
          <h3 className="text-2xl font-black">{money(todayExpense)}</h3>
          <p className="text-xs text-slate-400">Bugünkü gider</p>
        </Link>

        <Link href="/hatirlatmalar" className="bg-white rounded-[22px] p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-orange-50 grid place-items-center mb-3">📈</div>
          <p className="text-slate-500 text-sm">Performans</p>
          <h3 className="text-2xl font-black">%78</h3>
          <p className="text-xs text-slate-400">Aylık durum</p>
        </Link>
      </section>

      <Link href="/asistan" className="fixed right-5 bottom-24 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 shadow-2xl grid place-items-center text-white text-3xl">
        +
      </Link>

      <nav className="fixed bottom-4 left-3 right-3 rounded-[24px] bg-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.18)] p-2 grid grid-cols-5 gap-1">
        <Link href="/" className="text-center text-purple-600 font-bold text-[11px]">🏠<br />Ana</Link>
        <Link href="/asistan" className="text-center text-slate-500 font-bold text-[11px]">🤖<br />Asistan</Link>
        <Link href="/hatirlatmalar" className="text-center text-slate-500 font-bold text-[11px]">📋<br />Görev</Link>
        <Link href="/musteriler" className="text-center text-slate-500 font-bold text-[11px]">👥<br />CRM</Link>
        <Link href="/profil" className="text-center text-slate-500 font-bold text-[11px]">👤<br />Profil</Link>
      </nav>
    </main>
  );
}
