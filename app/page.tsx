"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";

const supabase = createClient();

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function firstName(name: string) {
  return (name || "Kullanıcı").trim().split(" ")[0];
}

function greeting(name: string) {
  const hour = new Date().getHours();
  const prefix = hour >= 5 && hour < 12 ? "Günaydın" : "Merhaba";
  return `${prefix}, ${firstName(name)}`;
}

function Spark({ color = "#8b5cf6" }: { color?: string }) {
  return (
    <svg viewBox="0 0 120 44" className="w-24 h-10">
      <path
        d="M5 34 C20 12, 28 35, 42 22 S65 8, 78 22 S98 38, 115 10"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M5 34 C20 12, 28 35, 42 22 S65 8, 78 22 S98 38, 115 10 L115 44 L5 44 Z"
        fill={color}
        opacity=".1"
      />
    </svg>
  );
}

export default function HomePage() {
  const [fullName, setFullName]               = useState("Kullanıcı");
  const [avatar, setAvatar]                   = useState("");
  const [customerCount, setCustomerCount]     = useState(0);
  const [taskCount, setTaskCount]             = useState(0);
  const [todayIncome, setTodayIncome]         = useState(0);
  const [todayExpense, setTodayExpense]       = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);
  const [collectionCount, setCollectionCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [agenda, setAgenda]                   = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const user = sessionData.session.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarding_completed) {
        window.location.href = "/onboarding";
        return;
      }

      setFullName(profile?.full_name || "Kullanıcı");
      setAvatar(profile?.avatar_url || "");

      const today = new Date().toISOString().slice(0, 10);

      const [
        { count: customers },
        { count: tasks },
        { data: incomes },
        { data: expenses },
        { data: collections },
        { data: payments },
        { data: followups },
        { data: contents },
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("followups").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
        supabase.from("income").select("amount").eq("user_id", user.id).eq("income_date", today),
        supabase.from("expenses").select("amount").eq("user_id", user.id).eq("expense_date", today),
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today).order("due_date", { ascending: true }).limit(3),
        supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today).limit(3),
        supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today).limit(3),
      ]);

      const incomeTotal     = (incomes || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
      const expenseTotal    = (expenses || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
      const collectionTotal = (collections || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      setCustomerCount(customers || 0);
      setTaskCount(tasks || 0);
      setTodayIncome(incomeTotal);
      setTodayExpense(expenseTotal);
      setTodayCollections(collectionTotal);
      setCollectionCount((collections || []).length);

      setNotificationCount(
        (payments || []).length + (followups || []).length + (contents || []).length
      );

      setAgenda([
        ...(payments || []).map((x: any) => ({
          icon: "₺",
          title: x.title,
          sub: `${money(Number(x.amount || 0))} tahsilat bekliyor`,
          type: "Tahsilat",
        })),
        ...(followups || []).map((x: any) => ({
          icon: "✓",
          title: x.title,
          sub: "Takip bekliyor",
          type: "Görev",
        })),
        ...(contents || []).map((x: any) => ({
          icon: "▶",
          title: x.content_title,
          sub: "Paylaşım kontrolü",
          type: "İçerik",
        })),
      ].slice(0, 4));
    }

    load();
  }, []);

  const net = todayIncome - todayExpense;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-4 pb-32">

      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="relative w-40 h-16">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain object-left" priority />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/bildirimler"
            className="h-14 w-14 rounded-2xl bg-white shadow-sm grid place-items-center text-2xl relative"
          >
            🔔
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-[#e5ab53] text-white text-xs font-black grid place-items-center">
                {notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/profil"
            className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow-lg grid place-items-center font-black text-xl"
          >
            {avatar
              ? <img src={avatar} className="h-full w-full object-cover" alt="Profil" />
              : <span className="text-slate-950">{firstName(fullName)[0]}</span>
            }
          </Link>
        </div>
      </header>

      {/* Selamlama */}
      <section className="mb-4">
        <h1 className="text-[30px] leading-tight font-black">{greeting(fullName)} 👋</h1>
        <p className="text-slate-500 text-base mt-1">Gününü birlikte planlayalım.</p>
      </section>

      {/* Hero kart */}
      <section className="relative overflow-hidden bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#61aebd] to-[#e5ab53]" />
        <div className="absolute right-0 top-10 h-44 w-44 rounded-full bg-gradient-to-br from-[#61aebd]/10 via-white to-[#e5ab53]/10 blur-xl opacity-80" />

        <div className="relative z-10">
          <p className="text-[#61aebd] font-black text-xs tracking-widest mb-3">BUGÜN</p>
          <h2 className="text-[22px] font-black leading-tight">
            {taskCount + collectionCount > 0
              ? `${taskCount + collectionCount} kritik işlem var`
              : "Temiz bir gün ✨"}
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-4">Planla, yönet, büyüt.</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <div className="h-10 w-10 bg-blue-50 rounded-2xl grid place-items-center text-lg mb-2">✓</div>
              <p className="text-xl font-black">{taskCount}</p>
              <p className="text-xs text-slate-500">Görev</p>
            </div>
            <div>
              <div className="h-10 w-10 bg-[#61aebd]/10 rounded-2xl grid place-items-center text-lg mb-2">👥</div>
              <p className="text-xl font-black">{customerCount}</p>
              <p className="text-xs text-slate-500">Müşteri</p>
            </div>
            <div>
              <div className="h-10 w-10 bg-emerald-50 rounded-2xl grid place-items-center text-lg mb-2">₺</div>
              <p className="text-xl font-black">{money(todayIncome)}</p>
              <p className="text-xs text-slate-500">Gelir</p>
            </div>
          </div>

          <Link
            href="/tahsilatlar"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#61aebd] to-[#e5ab53] px-5 py-3 text-slate-950 font-black shadow text-sm"
          >
            {collectionCount > 0
              ? `${collectionCount} bekleyen tahsilat · ${money(todayCollections)}`
              : "Bekleyen tahsilat yok"}
            <span>›</span>
          </Link>
        </div>
      </section>

      {/* Hızlı erişim */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black tracking-widest text-slate-500">HIZLI ERİŞİM</h2>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {([
            ["+",  "Müşteri\nEkle",  "/musteriler"],
            ["↑₺", "Gelir\nEkle",    "/gelir-gider"],
            ["▣",  "Takvim",         "/takvim"],
            ["◔",  "Raporlar",       "/raporlar"],
            ["✧",  "Asistan",        "/asistan"],
          ] as [string, string, string][]).map(([icon, label, href]) => (
            <Link
              key={label}
              href={href}
              className="bg-white rounded-[22px] p-2.5 shadow-sm text-center flex flex-col items-center justify-center min-h-[76px]"
            >
              <div className="text-xl bg-slate-50 h-10 w-10 rounded-xl grid place-items-center mb-1.5 text-[#61aebd] font-black">
                {icon}
              </div>
              <p className="text-[11px] font-black whitespace-pre-line leading-tight text-slate-700">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* İstatistik kartları */}
      <section className="grid grid-cols-2 gap-3 mb-5">

        <Link href="/musteriler" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="h-11 w-11 bg-[#61aebd]/10 rounded-2xl grid place-items-center text-xl mb-3">👥</div>
          <h3 className="font-black text-sm text-slate-500">Müşteriler</h3>
          <p className="text-3xl font-black mt-1">{customerCount}</p>
          <p className="text-slate-400 text-xs mt-1">Aktif portföy</p>
          <Spark color="#61aebd" />
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="h-11 w-11 bg-emerald-50 rounded-2xl grid place-items-center text-xl mb-3">₺</div>
          <h3 className="font-black text-sm text-slate-500">Gelir</h3>
          <p className="text-3xl font-black mt-1">{money(todayIncome)}</p>
          <p className="text-slate-400 text-xs mt-1">Bugünkü gelir</p>
          <Spark color="#22c55e" />
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="h-11 w-11 bg-red-50 rounded-2xl grid place-items-center text-xl mb-3">↘</div>
          <h3 className="font-black text-sm text-slate-500">Gider</h3>
          <p className="text-3xl font-black mt-1">{money(todayExpense)}</p>
          <p className="text-slate-400 text-xs mt-1">Bugünkü gider</p>
          <Spark color="#f43f5e" />
        </Link>

        <Link href="/tahsilatlar" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="h-11 w-11 bg-amber-50 rounded-2xl grid place-items-center text-xl mb-3">⏳</div>
          <h3 className="font-black text-sm text-slate-500">Tahsilat</h3>
          <p className="text-3xl font-black mt-1">{money(todayCollections)}</p>
          <p className="text-slate-400 text-xs mt-1">
            {collectionCount > 0 ? `${collectionCount} bekleyen` : "Bekleyen yok"}
          </p>
          <Spark color="#f59e0b" />
        </Link>

      </section>

      {/* Net durum şeridi */}
      <section className="bg-white rounded-[26px] px-5 py-4 shadow-sm mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-500 tracking-widest">GÜNLÜK NET</p>
          <p className={`text-2xl font-black mt-0.5 ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {money(net)}
          </p>
        </div>
        <Link
          href="/gelir-gider"
          className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 font-black rounded-2xl px-4 py-2.5 text-sm"
        >
          Detay ›
        </Link>
      </section>

      {/* Ajanda */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black tracking-widest text-slate-500">BUGÜNÜN AJANDASI</h2>
          <Link href="/hatirlatmalar" className="text-[#61aebd] font-black text-xs">Tümü →</Link>
        </div>

        {agenda.length === 0 ? (
          <div className="bg-white rounded-[22px] p-5 shadow-sm text-center">
            <p className="text-slate-400 text-sm">Bugün için bekleyen takip yok.</p>
            <Link href="/asistan" className="mt-3 inline-block text-[#61aebd] font-black text-sm">
              Asistan'a sor →
            </Link>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#61aebd] to-[#e5ab53] rounded-full" />
            {agenda.map((item, i) => (
              <div key={i} className="relative bg-white rounded-[22px] p-4 shadow-sm mb-3 flex items-center justify-between">
                <span className="absolute -left-[31px] h-3 w-3 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53]" />
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-50 grid place-items-center text-lg font-black text-[#61aebd]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{item.title}</h3>
                    <p className="text-slate-500 text-xs">{item.sub}</p>
                  </div>
                </div>
                <span className="text-xs text-[#61aebd] font-black">{item.type} ›</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAB asistan butonu */}
      <Link
        href="/asistan"
        className="fixed bottom-28 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow-[0_12px_40px_rgba(97,174,189,0.5)] grid place-items-center text-slate-950 text-2xl font-black z-[9998]"
      >
        ✦
      </Link>

    </main>
  );
}
