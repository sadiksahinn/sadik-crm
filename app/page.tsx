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

// Son N günün tarih dizisi: ["2026-05-26", ..., "2026-06-01"]
function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

// Mini bar chart — gerçek veriler
function BarChart({ data, color, height = 36 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const bw = 8; const gap = 3;
  const W = data.length * (bw + gap) - gap;
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} className="overflow-visible">
      {data.map((v, i) => {
        const h = Math.max(Math.round((v / max) * (height - 4)), 2);
        const x = i * (bw + gap);
        const isToday = i === data.length - 1;
        return (
          <rect key={i} x={x} y={height - h} width={bw} height={h} rx={3}
            fill={color} opacity={isToday ? 1 : 0.35 + (i / data.length) * 0.5} />
        );
      })}
    </svg>
  );
}

// İki renkli bar chart (gelir vs gider yan yana)
function DualBarChart({ income, expense, height = 48 }: { income: number[]; expense: number[]; height?: number }) {
  const max = Math.max(...income, ...expense, 1);
  const bw = 6; const gap = 2; const pairGap = 5;
  const pairW = bw * 2 + gap;
  const W = income.length * (pairW + pairGap) - pairGap;
  const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const today = new Date().getDay(); // 0=pazar, 1=pzt...
  return (
    <svg width={W} height={height + 14} viewBox={`0 0 ${W} ${height + 14}`}>
      {income.map((inc, i) => {
        const exp = expense[i] || 0;
        const ih = Math.max(Math.round((inc / max) * height), 2);
        const eh = Math.max(Math.round((exp / max) * height), 2);
        const x = i * (pairW + pairGap);
        const isToday = i === income.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={height - ih} width={bw} height={ih} rx={2}
              fill="#61aebd" opacity={isToday ? 1 : 0.4 + (i / income.length) * 0.4} />
            <rect x={x + bw + gap} y={height - eh} width={bw} height={eh} rx={2}
              fill="#e5ab53" opacity={isToday ? 1 : 0.4 + (i / income.length) * 0.4} />
          </g>
        );
      })}
    </svg>
  );
}

// Sayı 0'dan hedefe yumuşakça akar (premium his)
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const from = 0;
    const dur = 700;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(display)}</>;
}

export default function HomePage() {
  const [fullName, setFullName]           = useState("Kullanıcı");
  const [avatar, setAvatar]               = useState("");
  const [customerCount, setCustomerCount] = useState(0);
  const [taskCount, setTaskCount]         = useState(0);
  const [todayIncome, setTodayIncome]     = useState(0);
  const [todayExpense, setTodayExpense]   = useState(0);
  const [monthIncome, setMonthIncome]     = useState(0);
  const [monthExpense, setMonthExpense]   = useState(0);
  const [collectionTotal, setColTotal]    = useState(0);
  const [collectionCount, setColCount]    = useState(0);
  const [overdueCount, setOverdueCount]   = useState(0);
  const [notifCount, setNotifCount]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [agenda, setAgenda]               = useState<any[]>([]);
  const [weekIncome, setWeekIncome]       = useState<number[]>(Array(7).fill(0));
  const [weekExpense, setWeekExpense]     = useState<number[]>(Array(7).fill(0));

  useEffect(() => {
    async function load() {
      const { data: sd } = await supabase.auth.getSession();
      if (!sd.session) { window.location.href = "/login"; return; }
      const uid = sd.session.user.id;

      const { data: p } = await supabase.from("profiles")
        .select("full_name,avatar_url,onboarding_completed").eq("id", uid).single();
      if (!p?.onboarding_completed) { window.location.href = "/onboarding"; return; }
      setFullName(p?.full_name || "Kullanıcı");
      setAvatar(p?.avatar_url?.startsWith("data:") ? "" : (p?.avatar_url || ""));

      const today = new Date().toISOString().slice(0, 10);
      const days7 = lastNDays(7);
      const monthStart = today.slice(0, 7) + "-01";

      const [
        { count: cust }, { count: tasks },
        { data: inc7 }, { data: exp7 },
        { data: incMonth }, { data: expMonth },
        { data: allPending }, { data: cols }, { data: pays }, { data: fols }, { data: conts },
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("followups").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("status", "bekliyor").lte("followup_date", today),
        supabase.from("income").select("amount,income_date").eq("user_id", uid).gte("income_date", days7[0]).lte("income_date", today),
        supabase.from("expenses").select("amount,expense_date").eq("user_id", uid).gte("expense_date", days7[0]).lte("expense_date", today),
        supabase.from("income").select("amount").eq("user_id", uid).gte("income_date", monthStart).lte("income_date", today),
        supabase.from("expenses").select("amount").eq("user_id", uid).gte("expense_date", monthStart).lte("expense_date", today),
        // Tüm bekleyen tahsilatlar (Tahsilatlar & Raporlar ile tutarlı)
        supabase.from("payment_tracking").select("amount").eq("user_id", uid).eq("status", "bekliyor"),
        // Vadesi gelmiş/geçmiş → "gecikmiş" rozeti + ajanda
        supabase.from("payment_tracking").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("payment_tracking").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("due_date", today).order("due_date", { ascending: true }).limit(3),
        supabase.from("followups").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("followup_date", today).limit(3),
        supabase.from("content_calendar").select("*").eq("user_id", uid).eq("status", "planlandı").lte("publish_date", today).limit(3),
      ]);

      // 7 günlük veriyi tarihe göre eşleştir
      const incByDay = Object.fromEntries(days7.map(d => [d, 0]));
      const expByDay = Object.fromEntries(days7.map(d => [d, 0]));
      (inc7 || []).forEach((r: any) => { if (incByDay[r.income_date] !== undefined) incByDay[r.income_date] += Number(r.amount || 0); });
      (exp7 || []).forEach((r: any) => { if (expByDay[r.expense_date] !== undefined) expByDay[r.expense_date] += Number(r.amount || 0); });

      const wi = days7.map(d => incByDay[d]);
      const we = days7.map(d => expByDay[d]);
      setWeekIncome(wi);
      setWeekExpense(we);

      const todayInc = incByDay[today] || 0;
      const todayExp = expByDay[today] || 0;
      setTodayIncome(todayInc);
      setTodayExpense(todayExp);

      setMonthIncome((incMonth || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));
      setMonthExpense((expMonth || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));

      const colTot = (allPending || []).reduce((t, i: any) => t + Number(i.amount || 0), 0);
      setCustomerCount(cust || 0); setTaskCount(tasks || 0);
      setColTotal(colTot); setColCount((allPending || []).length);
      setOverdueCount((cols || []).length);
      setNotifCount((cols || []).length + (fols || []).length + (conts || []).length);

      setAgenda([
        ...(pays || []).map((x: any) => ({ icon: "₺", title: x.title, sub: `${money(Number(x.amount || 0))} tahsilat`, type: "Tahsilat", href: "/tahsilatlar" })),
        ...(fols || []).map((x: any) => ({ icon: "✓", title: x.title, sub: "Bekliyor", type: "Görev", href: "/hatirlatmalar" })),
        ...(conts || []).map((x: any) => ({ icon: "▶", title: x.content_title, sub: "Paylaşım", type: "İçerik", href: "/takvim" })),
      ].slice(0, 4));

      setLoading(false);
    }
    load();
  }, []);

  const monthNet = monthIncome - monthExpense;
  const net = todayIncome - todayExpense;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const week7Labels = lastNDays(7).map((d, i) => i === 6 ? "Bug." : dayLabels[(new Date(d).getDay() + 6) % 7]);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-4 pb-32">

      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="relative w-36 h-14">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain object-left" priority />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bildirimler" className="h-12 w-12 rounded-2xl bg-white shadow-sm grid place-items-center text-xl relative">
            🔔
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#e5ab53] text-white text-[10px] font-black grid place-items-center">
                {notifCount}
              </span>
            )}
          </Link>
          <Link href="/profil" className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow grid place-items-center font-black text-lg">
            {avatar ? <img src={avatar} className="h-full w-full object-cover" alt="" /> : <span className="text-slate-950">{firstName(fullName)[0]}</span>}
          </Link>
        </div>
      </header>

      {/* Selamlama */}
      <div className="mb-4">
        <h1 className="text-2xl font-black">{greet}, {firstName(fullName)} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gününü birlikte planlayalım.</p>
      </div>

      {/* ── HERO KART — Aylık Net + 7 Günlük Bar Grafik ── */}
      <section className="v-enter relative overflow-hidden rounded-[28px] p-5 mb-5 shadow-lg"
        style={{ background: "linear-gradient(135deg, #61aebd 0%, #4a9aaa 40%, #e5ab53 100%)" }}>

        {/* Dekoratif daireler */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />

        <div className="relative z-10">
          <p className="text-white/70 text-[10px] font-black tracking-widest mb-1">BU AY NET DURUM</p>
          <p className={`text-4xl font-black text-white mb-1 leading-none`} style={{ letterSpacing: "-0.02em" }}>
            <CountUp value={monthNet} format={money} />
          </p>
          <p className="text-white/60 text-xs mb-4">
            {monthNet >= 0 ? `↑ Kârdayız` : `↓ Zarardayız`} · Gelir {money(monthIncome)} · Gider {money(monthExpense)}
          </p>

          {/* Bar grafik */}
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-white/60 text-[10px] font-black tracking-widest mb-2">SON 7 GÜN</p>
            <div className="flex items-end gap-1.5 h-12">
              {weekIncome.map((inc, i) => {
                const exp = weekExpense[i] || 0;
                const maxVal = Math.max(...weekIncome, ...weekExpense, 1);
                const incH = Math.max(Math.round((inc / maxVal) * 44), 2);
                const expH = Math.max(Math.round((exp / maxVal) * 44), 2);
                const isToday = i === 6;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex gap-0.5 items-end h-11">
                      <div className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${incH}px`, background: "rgba(255,255,255,0.9)", opacity: isToday ? 1 : 0.45 + (i / 7) * 0.4 }} />
                      <div className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${expH}px`, background: "rgba(255,255,255,0.5)", opacity: isToday ? 0.8 : 0.3 + (i / 7) * 0.3 }} />
                    </div>
                    <span className={`text-[8px] font-black ${isToday ? "text-white" : "text-white/50"}`}>
                      {week7Labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              <span className="flex items-center gap-1 text-[9px] text-white/60">
                <span className="w-2 h-2 rounded bg-white/90 inline-block" /> Gelir
              </span>
              <span className="flex items-center gap-1 text-[9px] text-white/60">
                <span className="w-2 h-2 rounded bg-white/50 inline-block" /> Gider
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 STAT KARTI ── */}
      <section className="v-stagger grid grid-cols-2 gap-3 mb-5">

        <Link href="/gelir-gider" className="bg-white rounded-[24px] p-4 shadow-sm block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-emerald-50 rounded-2xl grid place-items-center text-lg">💚</div>
            <span className="text-xs font-black text-emerald-500">+bugün</span>
          </div>
          <p className="text-xs text-slate-500 font-black">BUGÜN GELİR</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{money(todayIncome)}</p>
          <div className="mt-2">
            <BarChart data={weekIncome} color="#22c55e" height={28} />
          </div>
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[24px] p-4 shadow-sm block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-red-50 rounded-2xl grid place-items-center text-lg">❤️</div>
            <span className="text-xs font-black text-red-400">bugün</span>
          </div>
          <p className="text-xs text-slate-500 font-black">BUGÜN GİDER</p>
          <p className="text-2xl font-black text-red-500 mt-0.5">{money(todayExpense)}</p>
          <div className="mt-2">
            <BarChart data={weekExpense} color="#ef4444" height={28} />
          </div>
        </Link>

        <Link href="/tahsilatlar" className="bg-white rounded-[24px] p-4 shadow-sm block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-amber-50 rounded-2xl grid place-items-center text-lg">⏳</div>
            {overdueCount > 0
              ? <span className="text-xs font-black text-red-500">{overdueCount} gecikmiş</span>
              : collectionCount > 0 && <span className="text-xs font-black text-amber-500">{collectionCount} bekleyen</span>}
          </div>
          <p className="text-xs text-slate-500 font-black">BEKLEYEN TAHSİLAT</p>
          <p className="text-2xl font-black text-amber-500 mt-0.5">{money(collectionTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{collectionCount > 0 ? `${collectionCount} ödeme · ${overdueCount} gecikmiş` : "Bekleyen yok"}</p>
        </Link>

        <Link href="/musteriler" className="bg-white rounded-[24px] p-4 shadow-sm block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[#61aebd]/10 rounded-2xl grid place-items-center text-lg">👥</div>
            <span className="text-xs font-black text-[#61aebd]">aktif</span>
          </div>
          <p className="text-xs text-slate-500 font-black">MÜŞTERİLER</p>
          <p className="text-2xl font-black mt-0.5">{customerCount}</p>
          <p className="text-xs text-slate-400 mt-1">{taskCount > 0 ? `${taskCount} görev bekliyor` : "Görev yok"}</p>
        </Link>

      </section>

      {/* ── NET DURUM şerit ── */}
      <section className="bg-white rounded-[24px] px-5 py-4 shadow-sm mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 tracking-widest">GÜNLÜK NET</p>
          <p className={`text-2xl font-black mt-0.5 ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}><CountUp value={net} format={money} /></p>
        </div>
        <Link href="/gelir-gider" className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 font-black rounded-2xl px-4 py-2.5 text-sm">
          Detay ›
        </Link>
      </section>

      {/* ── HIZLI ERİŞİM ── */}
      <section className="mb-6">
        <h2 className="text-[10px] font-black tracking-widest text-slate-400 mb-3">HIZLI ERİŞİM</h2>
        <div className="grid grid-cols-5 gap-2">
          {([
            ["💼", "İş\nAlanı",  "/is"],
            ["💳", "Krediler",   "/krediler"],
            ["🧾", "Sabit\nGider", "/sabit-giderler"],
            ["📊", "Raporlar",   "/raporlar"],
            ["✦",  "Asistan",   "/asistan"],
          ] as [string, string, string][]).map(([icon, label, href]) => (
            <Link key={label} href={href}
              className="bg-white rounded-[20px] p-2.5 shadow-sm text-center flex flex-col items-center justify-center min-h-[72px]">
              <div className="text-xl bg-slate-50 h-9 w-9 rounded-xl grid place-items-center mb-1.5 text-[#61aebd] font-black">
                {icon}
              </div>
              <p className="text-[10px] font-black whitespace-pre-line leading-tight text-slate-600">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── AJANDA ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-black tracking-widest text-slate-400">BUGÜNÜN AJANDASI</h2>
          <Link href="/hatirlatmalar" className="text-[#61aebd] font-black text-xs">Tümü →</Link>
        </div>

        {agenda.length === 0 ? (
          <div className="bg-white rounded-[22px] p-5 shadow-sm text-center">
            <p className="text-3xl mb-2">✨</p>
            <p className="text-slate-400 text-sm font-black">Bugün temiz!</p>
            <Link href="/asistan" className="mt-2 inline-block text-[#61aebd] font-black text-sm">Asistan'a sor →</Link>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#61aebd] to-[#e5ab53] rounded-full" />
            {agenda.map((item, i) => (
              <Link key={i} href={item.href}
                className="relative bg-white rounded-[22px] p-4 shadow-sm mb-3 flex items-center justify-between block">
                <span className="absolute -left-[31px] h-3 w-3 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53]" />
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#61aebd]/10 grid place-items-center text-lg font-black text-[#61aebd]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{item.title}</h3>
                    <p className="text-slate-500 text-xs">{item.sub}</p>
                  </div>
                </div>
                <span className="text-xs text-[#61aebd] font-black">{item.type} ›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <Link href="/asistan"
        className="fixed bottom-28 right-5 h-14 w-14 rounded-full bg-gradient-to-br from-[#61aebd] to-[#e5ab53] shadow-[0_12px_40px_rgba(97,174,189,0.5)] grid place-items-center text-slate-950 text-2xl font-black z-[9998]">
        ✦
      </Link>
    </main>
  );
}
