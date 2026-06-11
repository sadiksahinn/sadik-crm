"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { CountUp, money } from "@/components/ui";
import {
  IBell, ISparkle, ITrendUp, ITrendDown, IClock, IUsers,
  IBriefcase, ICard, IReceipt, IChart, IChevronRight, ILira, ICheck, IPlayCircle,
} from "@/components/Icons";

const supabase = createClient();

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
function BarChart({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const bw = 8; const gap = 4;
  const W = data.length * (bw + gap) - gap;
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} className="overflow-visible">
      {data.map((v, i) => {
        const h = Math.max(Math.round((v / max) * (height - 4)), 3);
        const x = i * (bw + gap);
        const isToday = i === data.length - 1;
        return (
          <rect key={i} x={x} y={height - h} width={bw} height={h} rx={3}
            fill={color} opacity={isToday ? 1 : 0.22 + (i / data.length) * 0.4} />
        );
      })}
    </svg>
  );
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

      setWeekIncome(days7.map(d => incByDay[d]));
      setWeekExpense(days7.map(d => expByDay[d]));
      setTodayIncome(incByDay[today] || 0);
      setTodayExpense(expByDay[today] || 0);

      setMonthIncome((incMonth || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));
      setMonthExpense((expMonth || []).reduce((a, b: any) => a + Number(b.amount || 0), 0));

      const colTot = (allPending || []).reduce((t, i: any) => t + Number(i.amount || 0), 0);
      setCustomerCount(cust || 0); setTaskCount(tasks || 0);
      setColTotal(colTot); setColCount((allPending || []).length);
      setOverdueCount((cols || []).length);
      setNotifCount((cols || []).length + (fols || []).length + (conts || []).length);

      setAgenda([
        ...(pays || []).map((x: any) => ({ kind: "pay", title: x.title, sub: `${money(Number(x.amount || 0))} tahsilat`, type: "Tahsilat", href: "/tahsilatlar" })),
        ...(fols || []).map((x: any) => ({ kind: "task", title: x.title, sub: "Bekliyor", type: "Görev", href: "/hatirlatmalar" })),
        ...(conts || []).map((x: any) => ({ kind: "content", title: x.content_title, sub: "Paylaşım", type: "İçerik", href: "/takvim" })),
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
  const week7Labels = lastNDays(7).map((d, i) => i === 6 ? "Bugün" : dayLabels[(new Date(d).getDay() + 6) % 7]);

  const agendaIcon = (kind: string) =>
    kind === "pay" ? <ILira size={17} /> : kind === "task" ? <ICheck size={17} /> : <IPlayCircle size={17} />;

  return (
    <main className="min-h-screen px-4 pt-4 pb-36 max-w-[520px] mx-auto">

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="relative w-32 h-12">
          <Image src="/valkea-logo.png" alt="Valkea" fill sizes="200px" className="object-contain object-left" priority />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bildirimler" className="v-press relative h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center text-ink">
            <IBell size={19} />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose text-white text-[10px] font-extrabold grid place-items-center border-2 border-canvas">
                {notifCount}
              </span>
            )}
          </Link>
          <Link href="/profil" className="v-press h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-br from-teal to-amber shadow-sm grid place-items-center">
            {avatar
              ? <img src={avatar} className="h-full w-full object-cover" alt="" />
              : <span className="text-white font-extrabold text-base">{firstName(fullName)[0]}</span>}
          </Link>
        </div>
      </header>

      {/* Selamlama */}
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">{greet}, {firstName(fullName)}</h1>
        <p className="text-sub text-sm font-medium mt-0.5">Gününü birlikte planlayalım.</p>
      </div>

      {/* ── HERO — Aylık net + 7 günlük grafik ── */}
      <section className="v-hero v-enter p-5 mb-5">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="v-overline !text-white/50">Bu ay net durum</p>
            <span className={`v-chip ${monthNet >= 0 ? "bg-white/10 text-emerald-300" : "bg-white/10 text-rose-300"}`}>
              {monthNet >= 0 ? <ITrendUp size={13} /> : <ITrendDown size={13} />}
              {monthNet >= 0 ? "Kârda" : "Zararda"}
            </span>
          </div>
          {loading
            ? <div className="skeleton h-10 w-40 !bg-white/10 mb-2" />
            : <p className="v-num text-[38px] font-extrabold leading-none mb-2"><CountUp value={monthNet} format={money} /></p>}
          <p className="text-white/55 text-xs font-medium mb-5">
            Gelir <span className="v-num text-emerald-300 font-bold">{money(monthIncome)}</span>
            <span className="mx-1.5 text-white/25">·</span>
            Gider <span className="v-num text-rose-300 font-bold">{money(monthExpense)}</span>
          </p>

          {/* 7 günlük bar grafik */}
          <div className="rounded-2xl bg-white/[0.07] border border-white/[0.06] p-3.5">
            <p className="v-overline !text-white/40 mb-3">Son 7 gün</p>
            <div className="flex items-end gap-1.5 h-12">
              {weekIncome.map((inc, i) => {
                const exp = weekExpense[i] || 0;
                const maxVal = Math.max(...weekIncome, ...weekExpense, 1);
                const incH = Math.max(Math.round((inc / maxVal) * 44), 3);
                const expH = Math.max(Math.round((exp / maxVal) * 44), 3);
                const isToday = i === 6;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-[3px] items-end h-11">
                      <div className="flex-1 rounded-full transition-all"
                        style={{ height: `${incH}px`, background: "#5fc4e4", opacity: isToday ? 1 : 0.4 + (i / 7) * 0.35 }} />
                      <div className="flex-1 rounded-full transition-all"
                        style={{ height: `${expH}px`, background: "#e8a33d", opacity: isToday ? 0.9 : 0.3 + (i / 7) * 0.3 }} />
                    </div>
                    <span className={`text-[8px] font-bold ${isToday ? "text-white" : "text-white/40"}`}>
                      {week7Labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50">
                <span className="w-2 h-2 rounded-full bg-[#5fc4e4] inline-block" /> Gelir
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50">
                <span className="w-2 h-2 rounded-full bg-[#e8a33d] inline-block" /> Gider
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 STAT KARTI ── */}
      <section className="v-stagger grid grid-cols-2 gap-3 mb-5">

        <Link href="/gelir-gider" className="v-card v-press p-4 block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[#e8f7f1] text-mint rounded-2xl grid place-items-center"><ITrendUp size={19} /></div>
            <span className="v-chip v-chip-mint">bugün</span>
          </div>
          <p className="v-overline">Bugün gelir</p>
          <p className="v-num text-[22px] font-extrabold text-mint mt-0.5">{money(todayIncome)}</p>
          <div className="mt-2.5"><BarChart data={weekIncome} color="#059669" height={26} /></div>
        </Link>

        <Link href="/gelir-gider" className="v-card v-press p-4 block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[#fdeef1] text-rose rounded-2xl grid place-items-center"><ITrendDown size={19} /></div>
            <span className="v-chip v-chip-rose">bugün</span>
          </div>
          <p className="v-overline">Bugün gider</p>
          <p className="v-num text-[22px] font-extrabold text-rose mt-0.5">{money(todayExpense)}</p>
          <div className="mt-2.5"><BarChart data={weekExpense} color="#e11d48" height={26} /></div>
        </Link>

        <Link href="/tahsilatlar" className="v-card v-press p-4 block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[rgba(232,163,61,0.14)] text-[#a16a14] rounded-2xl grid place-items-center"><IClock size={19} /></div>
            {overdueCount > 0
              ? <span className="v-chip v-chip-rose">{overdueCount} gecikmiş</span>
              : collectionCount > 0 && <span className="v-chip v-chip-amber">{collectionCount} bekleyen</span>}
          </div>
          <p className="v-overline">Bekleyen tahsilat</p>
          <p className="v-num text-[22px] font-extrabold text-[#a16a14] mt-0.5">{money(collectionTotal)}</p>
          <p className="text-mute text-xs font-medium mt-1.5">{collectionCount > 0 ? `${collectionCount} ödeme · ${overdueCount} gecikmiş` : "Bekleyen yok"}</p>
        </Link>

        <Link href="/musteriler" className="v-card v-press p-4 block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[rgba(45,163,199,0.12)] text-teal-deep rounded-2xl grid place-items-center"><IUsers size={19} /></div>
            <span className="v-chip v-chip-teal">aktif</span>
          </div>
          <p className="v-overline">Müşteriler</p>
          <p className="v-num text-[22px] font-extrabold mt-0.5">{customerCount}</p>
          <p className="text-mute text-xs font-medium mt-1.5">{taskCount > 0 ? `${taskCount} görev bekliyor` : "Görev yok"}</p>
        </Link>

      </section>

      {/* ── GÜNLÜK NET şerit ── */}
      <section className="v-card px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="v-overline">Günlük net</p>
          <p className={`v-num text-[22px] font-extrabold mt-0.5 ${net >= 0 ? "text-mint" : "text-rose"}`}>
            <CountUp value={net} format={money} />
          </p>
        </div>
        <Link href="/gelir-gider" className="v-btn v-btn-dark !py-2.5 !px-4 !text-[13px]">
          Detay <IChevronRight size={15} />
        </Link>
      </section>

      {/* ── HIZLI ERİŞİM ── */}
      <section className="mb-6">
        <h2 className="v-overline mb-3">Hızlı erişim</h2>
        <div className="grid grid-cols-5 gap-2">
          {([
            [<IBriefcase key="b" size={19} />, "İş Alanı", "/is"],
            [<ICard key="c" size={19} />, "Krediler", "/krediler"],
            [<IReceipt key="r" size={19} />, "Faturalar", "/sabit-giderler"],
            [<IChart key="g" size={19} />, "Raporlar", "/raporlar"],
            [<ISparkle key="s" size={19} />, "Asistan", "/asistan"],
          ] as [React.ReactNode, string, string][]).map(([icon, label, href]) => (
            <Link key={label} href={href}
              className="v-card v-press p-2 text-center flex flex-col items-center justify-center min-h-[74px] !rounded-[20px]">
              <div className="h-9 w-9 rounded-xl bg-canvas text-teal-deep grid place-items-center mb-1.5">
                {icon}
              </div>
              <p className="text-[10px] font-bold leading-tight text-sub">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── AJANDA ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="v-overline">Bugünün ajandası</h2>
          <Link href="/hatirlatmalar" className="text-teal-deep font-extrabold text-xs flex items-center gap-0.5">
            Tümü <IChevronRight size={13} />
          </Link>
        </div>

        {agenda.length === 0 ? (
          <div className="v-card p-6 text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-canvas grid place-items-center text-teal-deep">
              <ISparkle size={22} />
            </div>
            <p className="text-sub text-sm font-bold">Bugün temiz!</p>
            <Link href="/asistan" className="mt-1 inline-flex items-center gap-1 text-teal-deep font-extrabold text-sm">
              Asistan'a sor <IChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {agenda.map((item, i) => (
              <Link key={i} href={item.href}
                className="v-card v-press p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-[rgba(45,163,199,0.12)] grid place-items-center text-teal-deep shrink-0">
                    {agendaIcon(item.kind)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{item.title}</h3>
                    <p className="text-mute text-xs font-medium">{item.sub}</p>
                  </div>
                </div>
                <span className="v-chip v-chip-teal shrink-0">{item.type}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <Link href="/asistan"
        className="v-press fixed bottom-28 right-5 h-14 w-14 rounded-full bg-gradient-to-br from-teal to-amber shadow-[0_14px_40px_rgba(45,163,199,0.45)] grid place-items-center text-white z-[9998]">
        <ISparkle size={24} />
      </Link>
    </main>
  );
}
