"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";

const supabase = createClient();

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}

function firstName(name: string) { return (name || "Kullanıcı").trim().split(" ")[0]; }

export default function HomePage() {
  const [fullName, setFullName]         = useState("Kullanıcı");
  const [avatar, setAvatar]             = useState("");
  const [customerCount, setCustomers]   = useState(0);
  const [taskCount, setTasks]           = useState(0);
  const [todayIncome, setIncome]        = useState(0);
  const [todayExpense, setExpense]      = useState(0);
  const [collectionTotal, setColTotal]  = useState(0);
  const [collectionCount, setColCount]  = useState(0);
  const [notifCount, setNotifCount]     = useState(0);
  const [agenda, setAgenda]             = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { window.location.href = "/login"; return; }
      const user = sessionData.session.user;

      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, onboarding_completed").eq("id", user.id).single();
      if (!profile?.onboarding_completed) { window.location.href = "/onboarding"; return; }

      setFullName(profile?.full_name || "Kullanıcı");
      setAvatar(profile?.avatar_url?.startsWith("data:") ? "" : (profile?.avatar_url || ""));

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

      const incomeTotal  = (incomes || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
      const expenseTotal = (expenses || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
      const colTotal     = (collections || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      setCustomers(customers || 0);
      setTasks(tasks || 0);
      setIncome(incomeTotal);
      setExpense(expenseTotal);
      setColTotal(colTotal);
      setColCount((collections || []).length);
      setNotifCount((payments || []).length + (followups || []).length + (contents || []).length);

      setAgenda([
        ...(payments || []).map((x: any) => ({ icon: "₺", title: x.title, sub: money(Number(x.amount || 0)) + " tahsilat", type: "tahsilat", href: "/tahsilatlar" })),
        ...(followups || []).map((x: any) => ({ icon: "✓", title: x.title, sub: "Görev bekliyor", type: "gorev", href: "/hatirlatmalar" })),
        ...(contents || []).map((x: any) => ({ icon: "▶", title: x.content_title, sub: "Paylaşım kontrolü", type: "icerik", href: "/takvim" })),
      ].slice(0, 4));
    }
    load();
  }, []);

  const net = todayIncome - todayExpense;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <main className="min-h-screen bg-[#F5F6FA] text-[#0B1437] px-4 pt-5 pb-32">

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="relative w-32 h-12">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain object-left" priority />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bildirimler" className="h-11 w-11 rounded-2xl bg-white shadow-sm grid place-items-center relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#0B1437]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center">{notifCount}</span>
            )}
          </Link>
          <Link href="/profil" className="h-11 w-11 rounded-full overflow-hidden bg-[#0B1437] grid place-items-center font-black text-white text-base shadow-sm">
            {avatar ? <img src={avatar} className="h-full w-full object-cover" alt="" /> : firstName(fullName)[0]}
          </Link>
        </div>
      </header>

      {/* Selamlama */}
      <div className="mb-4">
        <p className="text-[#64748B] text-sm">{greet},</p>
        <h1 className="text-2xl font-black">{firstName(fullName)}</h1>
      </div>

      {/* Ana bakiye kartı */}
      <section className="rounded-3xl p-5 mb-4 overflow-hidden relative" style={{ background: "linear-gradient(135deg, #0B1437 0%, #1E3A5F 100%)" }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #10B981, transparent)", transform: "translate(30%, -30%)" }} />
        <p className="text-white/60 text-xs font-semibold tracking-widest mb-1">GÜNLÜK NET DURUM</p>
        <p className={`text-4xl font-black mb-4 ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(net)}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-white/50 text-[10px] font-semibold">GELİR</p>
            <p className="text-emerald-400 font-black text-base mt-0.5">{money(todayIncome)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-white/50 text-[10px] font-semibold">GİDER</p>
            <p className="text-red-400 font-black text-base mt-0.5">{money(todayExpense)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-white/50 text-[10px] font-semibold">TAHSİLAT</p>
            <p className="text-amber-400 font-black text-base mt-0.5">{money(collectionTotal)}</p>
          </div>
        </div>
      </section>

      {/* Tahsilat uyarısı */}
      {collectionCount > 0 && (
        <Link href="/tahsilatlar" className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-100 rounded-xl grid place-items-center">
              <span className="text-amber-600 font-black text-sm">₺</span>
            </div>
            <div>
              <p className="font-black text-sm text-amber-800">{collectionCount} bekleyen tahsilat</p>
              <p className="text-amber-600 text-xs">{money(collectionTotal)} tahsil edilecek</p>
            </div>
          </div>
          <span className="text-amber-500 font-black">›</span>
        </Link>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/musteriler" className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-blue-50 rounded-xl grid place-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xs text-[#64748B]">Müşteriler</span>
          </div>
          <p className="text-3xl font-black">{customerCount}</p>
          <p className="text-xs text-[#64748B] mt-1">Aktif portföy</p>
        </Link>

        <Link href="/hatirlatmalar" className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-purple-50 rounded-xl grid place-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="text-xs text-[#64748B]">Görevler</span>
          </div>
          <p className="text-3xl font-black">{taskCount}</p>
          <p className="text-xs text-[#64748B] mt-1">Bekleyen</p>
        </Link>
      </div>

      {/* Hızlı erişim */}
      <section className="mb-5">
        <p className="text-xs font-bold tracking-widest text-[#64748B] mb-3">HIZLI ERİŞİM</p>
        <div className="grid grid-cols-5 gap-2">
          {([
            { icon: "＋", label: "Müşteri", href: "/musteriler" },
            { icon: "↑₺", label: "Gelir", href: "/gelir-gider" },
            { icon: "📅", label: "Takvim", href: "/takvim" },
            { icon: "◔", label: "Raporlar", href: "/raporlar" },
            { icon: "✦", label: "Asistan", href: "/asistan" },
          ]).map(({ icon, label, href }) => (
            <Link key={label} href={href} className="bg-white rounded-2xl py-3 shadow-sm flex flex-col items-center justify-center gap-1">
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-bold text-[#64748B]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Günün ajandası */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold tracking-widest text-[#64748B]">BUGÜNÜN AJANDASI</p>
          <Link href="/hatirlatmalar" className="text-xs font-bold text-[#1E3A5F]">Tümü →</Link>
        </div>

        {agenda.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-[#64748B] text-sm mb-2">Bugün için bekleyen takip yok.</p>
            <Link href="/asistan" className="text-sm font-bold text-[#1E3A5F]">Asistan'a sor →</Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {agenda.map((item, i) => (
              <Link key={i} href={item.href} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center font-black text-sm ${
                    item.type === "tahsilat" ? "bg-amber-50 text-amber-600" :
                    item.type === "gorev"    ? "bg-purple-50 text-purple-600" :
                                              "bg-blue-50 text-blue-600"
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#0B1437]">{item.title}</p>
                    <p className="text-xs text-[#64748B]">{item.sub}</p>
                  </div>
                </div>
                <span className="text-[#64748B] text-sm">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <Link href="/asistan" className="fixed bottom-28 right-5 h-14 w-14 rounded-full bg-[#0B1437] shadow-lg grid place-items-center text-white text-xl z-[9998]">
        ✦
      </Link>
    </main>
  );
}
