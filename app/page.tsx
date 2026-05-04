"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";

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

function firstName(name: string) {
  return (name || "Kullanıcı").trim().split(" ")[0];
}

function greeting(name: string) {
  const hour = new Date().getHours();
  return `${hour >= 5 && hour < 12 ? "Günaydın" : "Merhaba"}, ${firstName(name)}`;
}

function Spark({ color = "#8b5cf6" }: { color?: string }) {
  return (
    <svg viewBox="0 0 120 44" className="w-24 h-10">
      <path d="M5 34 C20 12, 28 35, 42 22 S65 8, 78 22 S98 38, 115 10" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"/>
      <path d="M5 34 C20 12, 28 35, 42 22 S65 8, 78 22 S98 38, 115 10 L115 44 L5 44 Z" fill={color} opacity=".12"/>
    </svg>
  );
}

export default function HomePage() {
  const [fullName, setFullName] = useState("Kullanıcı");
  const [avatar, setAvatar] = useState("");
  const [customerCount, setCustomerCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [agenda, setAgenda] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
    const { data: userData } = await supabase.auth.getUser();


      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const user = session.session.user;

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

      const { count: customers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: tasks } = await supabase
        .from("followups")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("followup_date", today);

      const { data: incomes } = await supabase
        .from("income")
        .select("amount")
        .eq("user_id", user.id)
        .eq("income_date", today);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .eq("expense_date", today);

      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("followup_date", today)
        .limit(3);

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "planlandı")
        .lte("publish_date", today)
        .limit(3);

      setCustomerCount(customers || 0);
      setTaskCount(tasks || 0);
      setTodayIncome((incomes || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0));
      setTodayExpense((expenses || []).reduce((a: number, b: any) => a + Number(b.amount || 0), 0));

      setAgenda([
        ...(followups || []).map((x: any) => ({
          icon: "💸",
          title: x.title,
          sub: "Ödeme / takip bekliyor",
          type: "Ödeme",
          color: "orange",
        })),
        ...(contents || []).map((x: any) => ({
          icon: "🎬",
          title: x.content_title,
          sub: "Paylaşım kontrolü",
          type: "İçerik",
          color: "pink",
        })),
      ].slice(0, 3));
    }

    load();
  }, []);

  const net = todayIncome - todayExpense;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-4 pb-32">
      <header className="flex items-center justify-between mb-4">
        <div className="relative w-40 h-16">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain object-left" priority />
        </div>

        <div className="flex items-center gap-3">
          <button className="h-14 w-14 rounded-2xl bg-white shadow-sm grid place-items-center text-2xl relative">
            🔔
            <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
          </button>

          <Link href="/profil" className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow-lg grid place-items-center text-slate-950 font-black text-xl">
            {avatar ? <img src={avatar} className="h-full w-full object-cover" alt="Profil" /> : firstName(fullName)[0]}
          </Link>
        </div>
      </header>

      <section className="mb-4">
        <h1 className="text-[30px] leading-tight font-black">{greeting(fullName)} 👋</h1>
        <p className="text-slate-500 text-base mt-1">Gününü birlikte planlayalım.</p>
      </section>

      <section className="relative overflow-hidden bg-white rounded-[30px] p-4 shadow-sm mb-5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#61aebd] to-[#e5ab53]" />
        <div className="absolute right-0 top-12 h-44 w-44 rounded-full bg-gradient-to-br from-blue-100 via-fuchsia-100 to-orange-100 blur-xl opacity-80" />

        <div className="relative z-10">
          <p className="text-[#61aebd] font-black text-sm mb-4">BUGÜN</p>
          <h2 className="text-[26px] font-black leading-tight">
            Bugün odak: {taskCount || agenda.length || 0} kritik işlem
          </h2>
          <p className="text-slate-500 mt-2">Planla, yönet, büyüt.</p>

          <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
            <div>
              <div className="h-10 w-10 bg-blue-50 rounded-2xl grid place-items-center text-xl mb-2">✓</div>
              <p className="text-xl font-black">{taskCount}</p>
              <p className="text-xs text-slate-500">Görev</p>
            </div>

            <div>
              <div className="h-10 w-10 bg-[#61aebd]/10 rounded-2xl grid place-items-center text-xl mb-2">👥</div>
              <p className="text-xl font-black">{customerCount}</p>
              <p className="text-xs text-slate-500">Müşteri</p>
            </div>

            <div>
              <div className="h-10 w-10 bg-orange-50 rounded-2xl grid place-items-center text-xl mb-2">₺</div>
              <p className="text-xl font-black">{money(todayIncome)}</p>
              <p className="text-xs text-slate-500">Gelir</p>
            </div>
          </div>

          <Link href="/asistan" className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#61aebd] to-[#e5ab53] px-5 py-3 text-slate-950 font-black shadow-lg">
            Günlük Net: {money(net)} <span>›</span>
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black tracking-wide text-slate-700">HIZLI ERİŞİM</h2>
          <Link href="/asistan" className="text-[#61aebd] font-black text-sm">Düzenle ✎</Link>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            ["+", "Müşteri\nEkle", "/musteriler"],
            ["☏", "Mesaj\nGönder", "/asistan"],
            ["▣", "İçerik\nOluştur", "/asistan"],
            ["◔", "Rapor\nAl", "/asistan"],
            ["✧", "Asistan’a\nSor", "/asistan"],
          ].map(([icon, label, href]) => (
            <Link key={label} href={href} className="bg-white rounded-[22px] p-3 shadow-sm text-center min-h-[82px] flex flex-col items-center justify-center">
              <div className="text-2xl bg-slate-50 h-10 w-10 rounded-2xl grid place-items-center mb-2 text-[#61aebd]">
                {icon}
              </div>
              <p className="text-[12px] font-black whitespace-pre-line leading-tight">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 bg-[#61aebd]/10 rounded-2xl grid place-items-center text-xl">👥</div>
            <span className="text-xs text-[#61aebd] bg-[#61aebd]/10 px-2 py-1 rounded-full font-black">↑ %12</span>
          </div>
          <h3 className="mt-3 font-black">Müşteriler</h3>
          <p className="text-3xl font-black mt-2">{customerCount}</p>
          <p className="text-slate-500 text-sm">Aktif portföy</p>
          <Spark color="#a855f7" />
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 bg-emerald-50 rounded-2xl grid place-items-center text-xl">₺</div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-black">↑ %0</span>
          </div>
          <h3 className="mt-3 font-black">Gelir</h3>
          <p className="text-3xl font-black mt-2">{money(todayIncome)}</p>
          <p className="text-slate-500 text-sm">Bugünkü gelir</p>
          <Spark color="#22c55e" />
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 bg-red-50 rounded-2xl grid place-items-center text-xl">↘</div>
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-black">↑ %0</span>
          </div>
          <h3 className="mt-3 font-black">Gider</h3>
          <p className="text-3xl font-black mt-2">{money(todayExpense)}</p>
          <p className="text-slate-500 text-sm">Bugünkü gider</p>
          <Spark color="#f43f5e" />
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[26px] p-4 shadow-sm block">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 bg-blue-50 rounded-2xl grid place-items-center text-xl">⌁</div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-black">↑ %0</span>
          </div>
          <h3 className="mt-3 font-black">Net Kasa</h3>
          <p className="text-3xl font-black mt-2">{money(net)}</p>
          <p className="text-slate-500 text-sm">Toplam durum</p>
          <Spark color="#3b82f6" />
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black tracking-wide text-slate-700">BUGÜNÜN AJANDASI</h2>
          <Link href="/hatirlatmalar" className="text-[#61aebd] font-black text-sm">Tümü →</Link>
        </div>

        <div className="relative pl-8">
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#61aebd] to-[#e5ab53] rounded-full" />

          {(agenda.length ? agenda : [
            { icon: "☏", title: "Müşteri Araması", sub: "Bugün için takip görünmüyor", type: "Müşteri" },
            { icon: "▣", title: "İçerik Planı", sub: "Yeni plan ekleyebilirsin", type: "İçerik" },
            { icon: "₺", title: "Ödeme Takibi", sub: "Bekleyen ödeme kontrolü", type: "Ödeme" },
          ]).map((item, i) => (
            <div key={i} className="relative bg-white rounded-[22px] p-4 shadow-sm mb-3 flex items-center justify-between">
              <span className="absolute -left-[31px] h-3 w-3 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53]" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 grid place-items-center text-2xl">{item.icon}</div>
                <div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="text-slate-500 text-sm">{item.sub}</p>
                </div>
              </div>
              <div className="text-xs text-[#61aebd] font-black">{item.type} ›</div>
            </div>
          ))}
        </div>
      </section>

      <Link href="/asistan" className="fixed bottom-28 right-6 h-16 w-16 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow-[0_18px_45px_rgba(168,85,247,0.45)] grid place-items-center text-slate-950 text-4xl z-[9998]">
        +
      </Link>
    </main>
  );
}
