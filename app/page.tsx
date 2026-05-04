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
  const [avatar, setAvatar] = useState("");
  const [fullName, setFullName] = useState("Sadık");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [topCategory, setTopCategory] = useState("Yok");
  const [lastRecords, setLastRecords] = useState<any[]>([]);

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

      const { data: allIncome } = await supabase
        .from("income")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      const incomeTotal = allIncome?.reduce((t, i) => t + Number(i.amount), 0) || 0;
      const expenseTotal = allExpenses?.reduce((t, i) => t + Number(i.amount), 0) || 0;

      const categories: Record<string, number> = {};
      allExpenses?.forEach((e: any) => {
        const key = e.category || "Diğer";
        categories[key] = (categories[key] || 0) + Number(e.amount);
      });

      const top = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

      const records = [
        ...(allIncome || []).map((i: any) => ({ ...i, type: "gelir" })),
        ...(allExpenses || []).map((e: any) => ({ ...e, type: "gider" })),
      ]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      setCustomerCount(count || 0);
      setTodayIncome(incomes?.reduce((t, i) => t + Number(i.amount), 0) || 0);
      setTodayExpense(expenses?.reduce((t, i) => t + Number(i.amount), 0) || 0);
      setPendingTasks(taskCount || 0);
      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      setTopCategory(top ? top[0] : "Yok");
      setLastRecords(records);
      setAvatar(localStorage.getItem("valkea-avatar") || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, onboarding_completed")
        .eq("id", data.session.user.id)
        .single();

      if (!profile?.onboarding_completed) {
        window.location.href = "/onboarding";
        return;
      }

      setAvatar(profile?.avatar_url || "");
      setFullName(profile?.full_name || "Kullanıcı");
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
          <Link href="/profil" className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 shadow-lg grid place-items-center text-white font-black">
            {avatar ? (
              <img src={avatar} alt="Profil" className="h-full w-full object-cover" />
            ) : (
              "S"
            )}
          </Link>
        </div>
      </header>

      <section className="mb-4">
        <h1 className="text-3xl font-black tracking-tight">Günaydın, {fullName} 👋</h1>
        <p className="text-slate-500 mt-1 text-base">Gününü birlikte planlayalım.</p>
      </section>

      <section className="relative overflow-hidden rounded-[26px] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] p-4 mb-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400" />
        <p className="text-xs font-black text-purple-600">BUGÜN</p>
        <h2 className="text-2xl font-black mt-2">Kontrol sende.</h2>
        <p className="text-slate-500 text-sm mt-1">Planla, yönet, büyüt.</p>
        <div className="mt-3 inline-flex rounded-full bg-slate-950 text-white px-4 py-2 text-sm font-black">
          Günlük Net: {money(todayIncome - todayExpense)}
        </div>

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

        <Link href="/raporlar" className="bg-white rounded-[22px] p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-orange-50 grid place-items-center mb-3">📊</div>
          <p className="text-slate-500 text-sm">Net Kasa</p>
          <h3 className="text-2xl font-black">{money(totalIncome - totalExpense)}</h3>
          <p className="text-xs text-slate-400">Toplam durum</p>
        </Link>
      </section>

      <section className="mb-5">
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">KISA RAPOR</h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-[22px] p-4 shadow-sm">
            <p className="text-slate-500 text-sm">Toplam Gelir</p>
            <h3 className="text-xl font-black text-emerald-600">{money(totalIncome)}</h3>
          </div>

          <div className="bg-white rounded-[22px] p-4 shadow-sm">
            <p className="text-slate-500 text-sm">Toplam Gider</p>
            <h3 className="text-xl font-black text-red-500">{money(totalExpense)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[22px] p-4 shadow-sm mb-3">
          <p className="text-slate-500 text-sm">En Çok Gider Kategorisi</p>
          <h3 className="text-xl font-black">{topCategory}</h3>
        </div>

        <div className="grid gap-2">
          {lastRecords.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500">{item.type === "gelir" ? "Gelir" : item.category || "Gider"}</p>
              </div>
              <p className={item.type === "gelir" ? "font-black text-emerald-600" : "font-black text-red-500"}>
                {item.type === "gelir" ? "+" : "-"}{money(Number(item.amount))}
              </p>
            </div>
          ))}
        </div>
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
