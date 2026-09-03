"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { CountUp, money } from "@/components/ui";
import { dateKey } from "@/utils/date";
import { confirmedExpenses } from "@/utils/finance";
import { readProfilePreview, writeProfilePreview } from "@/utils/profile-cache";
import { getValidSession } from "@/utils/auth-client";
import {
  IBell, ISparkle, ITrendUp, ITrendDown, IClock,
  IBriefcase, ICard, IReceipt, IChart, IChevronRight, ILira, ICheck, IPlayCircle,
} from "@/components/Icons";

const supabase = createClient();

function firstName(name: string) { return (name || "Kullanıcı").trim().split(" ")[0]; }

// Son N günün tarih dizisi: ["2026-05-26", ..., "2026-06-01"]
function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    return dateKey(new Date(Date.now() - (n - 1 - i) * 86_400_000));
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
  const [todayIncome, setTodayIncome]     = useState(0);
  const [todayExpense, setTodayExpense]   = useState(0);
  const [monthIncome, setMonthIncome]     = useState(0);
  const [monthExpense, setMonthExpense]   = useState(0);
  const [collectionTotal, setColTotal]    = useState(0);
  const [collectionCount, setColCount]    = useState(0);
  const [overdueCount, setOverdueCount]   = useState(0);
  const [notifCount, setNotifCount]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [panelAccessToken, setPanelAccessToken] = useState("");
  const [agenda, setAgenda]               = useState<any[]>([]);
  const [weekIncome, setWeekIncome]       = useState<number[]>(Array(7).fill(0));
  const [weekExpense, setWeekExpense]     = useState<number[]>(Array(7).fill(0));
  const [upcomingOutflow, setUpcomingOutflow] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [pendingExplanationCount, setPendingExplanationCount] = useState(0);

  useEffect(() => {
    async function load() {
      const session = await getValidSession(supabase);
      if (!session) { window.location.href = "/login"; return; }
      const uid = session.user.id;
      setPanelAccessToken(session.access_token);
      const fallbackName = String(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Kullanıcı").trim();
      const cachedProfile = readProfilePreview(uid);
      setFullName(cachedProfile?.fullName || fallbackName);
      setAvatar(cachedProfile?.avatarUrl || "");

      const { data: p } = await supabase.from("profiles")
        .select("full_name,avatar_url,company_name,profession,onboarding_completed").eq("id", uid).single();
      if (!p?.onboarding_completed) { window.location.href = "/onboarding"; return; }
      setFullName(p?.full_name || fallbackName);
      setAvatar(p?.avatar_url?.startsWith("data:") ? "" : (p?.avatar_url || ""));
      writeProfilePreview(uid, {
        fullName: p?.full_name || fallbackName,
        avatarUrl: p?.avatar_url?.startsWith("data:") ? "" : (p?.avatar_url || ""),
        companyName: p?.company_name || "",
        profession: p?.profession || "",
      });

      const today = dateKey();
      const days7 = lastNDays(7);
      const monthStart = today.slice(0, 7) + "-01";

      const [
        { data: inc7 }, { data: exp7 },
        { data: incMonth }, { data: expMonth },
        { data: allPending }, { data: cols }, { data: pays }, { data: fols }, { data: conts },
        { data: fixedExpenses }, { data: cards }, { data: loans }, { data: reminders }, { data: loanPayments },
      ] = await Promise.all([
        supabase.from("income").select("amount,income_date").eq("user_id", uid).gte("income_date", days7[0]).lte("income_date", today),
        supabase.from("expenses").select("amount,expense_date,note").eq("user_id", uid).gte("expense_date", days7[0]).lte("expense_date", today),
        supabase.from("income").select("amount").eq("user_id", uid).gte("income_date", monthStart).lte("income_date", today),
        supabase.from("expenses").select("amount,note").eq("user_id", uid).gte("expense_date", monthStart).lte("expense_date", today),
        // Tüm bekleyen tahsilatlar (Tahsilatlar & Raporlar ile tutarlı)
        supabase.from("payment_tracking").select("amount").eq("user_id", uid).eq("status", "bekliyor"),
        // Vadesi gelmiş/geçmiş → "gecikmiş" rozeti + ajanda
        supabase.from("payment_tracking").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("payment_tracking").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("due_date", today).order("due_date", { ascending: true }).limit(3),
        supabase.from("followups").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("followup_date", today).limit(3),
        supabase.from("content_calendar").select("*").eq("user_id", uid).eq("status", "planlandı").lte("publish_date", today).limit(3),
        supabase.from("fixed_expenses").select("*").eq("user_id", uid).order("due_day", { ascending: true }),
        supabase.from("credit_cards").select("*").eq("user_id", uid).order("payment_day", { ascending: true }),
        supabase.from("loans").select("*").eq("user_id", uid).order("payment_day", { ascending: true }),
        supabase.from("reminders").select("*").eq("user_id", uid).eq("status", "bekliyor").lte("reminder_date", today).limit(3),
        supabase.from("expenses").select("note").eq("user_id", uid).eq("payment_method", "Kredi Taksiti").gte("expense_date", monthStart),
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
      setMonthExpense(confirmedExpenses(expMonth).reduce((a, b: any) => a + Number(b.amount || 0), 0));
      const explanationCount = (expMonth || []).filter((item: any) => !String(item.note || "").includes("Açıklama:")).length;
      setPendingExplanationCount(explanationCount);

      const colTot = (allPending || []).reduce((t, i: any) => t + Number(i.amount || 0), 0);
      setColTotal(colTot); setColCount((allPending || []).length);
      setOverdueCount((cols || []).length);
      const monthKey = today.slice(0, 7);
      const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
      const dueDate = (day: number) => `${monthKey}-${String(Math.min(Math.max(Number(day) || 1, 1), daysInMonth)).padStart(2, "0")}`;
      const paidThisMonth = (item: any) => !!item.is_paid_this_month && String(item.last_paid_date || "").slice(0, 7) === monthKey;

      const obligations = [
        ...(fixedExpenses || []).filter((x: any) => !paidThisMonth(x)).map((x: any) => ({
          kind: "bill", title: x.title, sub: `${money(Number(x.amount || 0))} ödenecek`, type: "Fatura", href: "/sabit-giderler", date: dueDate(x.due_day), amount: Number(x.amount || 0),
        })),
        ...(cards || []).filter((x: any) => !paidThisMonth(x) && Number(x.min_payment || 0) > 0).map((x: any) => ({
          kind: "card", title: `${x.bank_name} ${x.card_name || "kart"}`, sub: `${money(Number(x.min_payment || 0))} asgari ödeme`, type: "Kart", href: "/krediler", date: dueDate(x.payment_day), amount: Number(x.min_payment || 0),
        })),
        ...(loans || []).filter((x: any) => Number(x.monthly_payment || 0) > 0 && !(loanPayments || []).some((payment: any) => String(payment.note || "").includes(`loan:${x.id}`))).map((x: any) => ({
          kind: "loan", title: x.title || `${x.bank_name} kredisi`, sub: `${money(Number(x.monthly_payment || 0))} taksit`, type: "Kredi", href: "/krediler", date: dueDate(x.payment_day), amount: Number(x.monthly_payment || 0),
        })),
      ];
      setUpcomingOutflow(obligations.reduce((sum, item) => sum + item.amount, 0));
      setUnpaidCount(obligations.length);
      setNotifCount((cols || []).length + (fols || []).length + (conts || []).length + (reminders || []).length + obligations.length + explanationCount);

      const combinedAgenda = [
        ...obligations.map(item => ({ ...item, overdue: item.date < today })),
        ...(pays || []).map((x: any) => ({ kind: "pay", title: x.title, sub: `${money(Number(x.amount || 0))} tahsilat bekleniyor`, type: "Tahsilat", href: "/tahsilatlar", date: x.due_date, overdue: x.due_date < today })),
        ...(fols || []).map((x: any) => ({ kind: "task", title: x.title, sub: "Yapılmayı bekliyor", type: "Görev", href: "/hatirlatmalar", date: x.followup_date, overdue: x.followup_date < today })),
        ...(reminders || []).map((x: any) => ({ kind: "task", title: x.title, sub: "Hatırlatma", type: "Hatırlatma", href: "/hatirlatmalar", date: x.reminder_date, overdue: x.reminder_date < today })),
        ...(conts || []).map((x: any) => ({ kind: "content", title: x.content_title, sub: "Yayınlanmayı bekliyor", type: "İçerik", href: "/takvim", date: x.publish_date, overdue: x.publish_date < today })),
      ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      setAgenda(combinedAgenda.slice(0, 6));

      setLoading(false);
    }
    load();
  }, []);

  const monthNet = monthIncome - monthExpense;
  const net = todayIncome - todayExpense;

  const [greet, setGreet] = useState("Merhaba");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreet(hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar");
  }, []);
  const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const week7Labels = lastNDays(7).map((d, i) => i === 6 ? "Bugün" : dayLabels[(new Date(d).getDay() + 6) % 7]);

  const agendaIcon = (kind: string) =>
    kind === "pay" ? <ILira size={17} /> : kind === "task" ? <ICheck size={17} /> : <IPlayCircle size={17} />;

  function openCustomerCenter(destination: "panel" | "finance") {
    const siteUrl = process.env.NEXT_PUBLIC_VALKEA_SITE_URL || "https://www.valkeastudyo.com";
    if (!panelAccessToken) {
      window.location.href = `${siteUrl}/tr/panel/giris`;
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${siteUrl}/api/panel/auth/assistant`;
    for (const [name, value] of Object.entries({ access_token: panelAccessToken, destination })) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <main className="min-h-screen px-4 pt-4 pb-36 max-w-[520px] mx-auto">

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="relative w-32 h-12">
          <Image src="/valkea-logo.png" alt="Valkea" fill sizes="200px" className="object-contain object-left" priority />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bildirimler" aria-label="Bildirimler" className="v-press relative h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center text-ink">
            <IBell size={19} />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose text-white text-[10px] font-extrabold grid place-items-center border-2 border-canvas">
                {notifCount}
              </span>
            )}
          </Link>
          <Link href="/profil" aria-label="Profil" className="v-press h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-br from-teal to-amber shadow-sm grid place-items-center">
            {avatar
              ? <img src={avatar} className="h-full w-full object-cover" alt="" />
              : <span className="text-white font-extrabold text-base">{firstName(fullName)[0]}</span>}
          </Link>
        </div>
      </header>

      {/* Selamlama */}
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">{greet}, {firstName(fullName)}</h1>
        <p className="text-sub text-sm font-medium mt-0.5">Her şeyi kontrol ettim; bugünün özeti hazır.</p>
      </div>

      {/* Asistanın tek bakışta günlük brifingi */}
      <section className="v-hero v-enter p-5 mb-5">
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/10 border border-white/10 text-[#5fc4e4] grid place-items-center">
              <ISparkle size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="v-overline !text-white/45">Asistan brifingi</p>
              <h2 className="mt-1 text-[19px] font-extrabold tracking-tight">
                {unpaidCount > 0 ? `${unpaidCount} ödemeyi takip ediyorum` : "Ödemelerin yolunda"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-white/60">
                {unpaidCount > 0
                  ? `Bu ay kalan kart, kredi ve faturaların toplamı ${money(upcomingOutflow)}.`
                  : "Bu ay için bekleyen kart, kredi veya fatura kaydı görünmüyor."}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link href="/hatirlatmalar" className="v-btn !py-3 !text-[12px] bg-white/10 text-white border border-white/10">
              Bugünü gör <IChevronRight size={14} />
            </Link>
            <Link href="/asistan" className="v-btn !py-3 !text-[12px] bg-white text-ink">
              <ISparkle size={14} /> Asistana sor
            </Link>
          </div>
        </div>
      </section>

      <section className="v-card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="v-overline">Bugün yapılacaklar</p>
            <p className="mt-1 text-xs font-semibold text-mute">Önce tamamlanması gereken işler</p>
          </div>
          <span className="v-chip v-chip-amber">{pendingExplanationCount + unpaidCount} bekleyen</span>
        </div>
        <div className="grid gap-2">
          <Link href="/harcamalar?durum=bekleyen" className="v-press flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-extrabold"><IReceipt size={17} className="text-teal-deep" /> Harcamaları açıkla</span>
            <span className="v-chip v-chip-amber">{pendingExplanationCount}</span>
          </Link>
          <Link href="/sabit-giderler" className="v-press flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-extrabold"><ICheck size={17} className="text-teal-deep" /> Ödemeleri kontrol et</span>
            <span className="v-chip v-chip-mute">{unpaidCount}</span>
          </Link>
          <Link href="/asistan" className="v-press flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
            <span className="flex items-center gap-2.5 text-sm font-extrabold"><ISparkle size={17} className="text-[#5fc4e4]" /> Ekran görüntüsü veya belge yükle</span>
            <IChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* Valkea müşteri paneli ve mevcut 3D Secure ödeme akışına geçiş */}
      <section className="v-card relative overflow-hidden p-5 mb-5 border-[rgba(45,163,199,0.22)]">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[rgba(45,163,199,0.12)] blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-[#2da3c7] to-[#1d536f] text-white grid place-items-center shadow-sm">
            <ICard size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="v-overline text-teal-deep">Valkea Müşteri Merkezi</p>
            <h2 className="mt-1 text-[17px] font-extrabold tracking-tight">Projelerin, içeriklerin ve ödemelerin tek yerde</h2>
            <p className="mt-1 text-xs leading-5 text-mute">Valkea hizmet paketini görüntüle, teslimlerini takip et ve mevcut Garanti BBVA 3D Secure altyapısıyla kartla öde.</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => openCustomerCenter("panel")} className="v-btn v-btn-soft !py-3 !text-[12px]">
            Müşteri Paneli <IChevronRight size={14} />
          </button>
          <button type="button" onClick={() => openCustomerCenter("finance")} className="v-btn v-btn-dark !py-3 !text-[12px]">
            <ICard size={14} /> Kartla Öde
          </button>
        </div>
      </section>

      {/* ── Aylık net + 7 günlük grafik ── */}
      <section className="v-card p-5 mb-5">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="v-overline">Bu ay net durum</p>
            <span className={`v-chip ${monthNet >= 0 ? "v-chip-mint" : "v-chip-rose"}`}>
              {monthNet >= 0 ? <ITrendUp size={13} /> : <ITrendDown size={13} />}
              {monthNet >= 0 ? "Kârda" : "Zararda"}
            </span>
          </div>
          {loading
            ? <div className="skeleton h-10 w-40 mb-2" />
            : <p className="v-num text-[38px] font-extrabold leading-none mb-2"><CountUp value={monthNet} format={money} /></p>}
          <p className="text-mute text-xs font-medium mb-5">
            Gelir <span className="v-num text-mint font-bold">{money(monthIncome)}</span>
            <span className="mx-1.5 text-line">·</span>
            Gider <span className="v-num text-rose font-bold">{money(monthExpense)}</span>
          </p>

          {/* 7 günlük bar grafik */}
          <div className="rounded-2xl bg-canvas border border-line p-3.5">
            <p className="v-overline mb-3">Son 7 gün</p>
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
                    <span className={`text-[8px] font-bold ${isToday ? "text-ink" : "text-mute"}`}>
                      {week7Labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-mute">
                <span className="w-2 h-2 rounded-full bg-[#5fc4e4] inline-block" /> Gelir
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-mute">
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

        <Link href="/sabit-giderler" className="v-card v-press p-4 block">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 bg-[rgba(45,163,199,0.12)] text-teal-deep rounded-2xl grid place-items-center"><IReceipt size={19} /></div>
            {unpaidCount > 0 && <span className="v-chip v-chip-amber">{unpaidCount} kalem</span>}
          </div>
          <p className="v-overline">Bu ay ödenecek</p>
          <p className="v-num text-[22px] font-extrabold mt-0.5">{money(upcomingOutflow)}</p>
          <p className="text-mute text-xs font-medium mt-1.5">Kart, kredi ve faturalar</p>
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
        <div className="grid grid-cols-3 gap-2">
          {([
            [<IBriefcase key="b" size={19} />, "İş Alanı", "/is"],
            [<ICard key="c" size={19} />, "Kartlar", "/kartlar"],
            [<IReceipt key="r" size={19} />, "Faturalar", "/sabit-giderler"],
            [<ICard key="h" size={19} />, "Harcamalar", "/harcamalar"],
            [<IChart key="g" size={19} />, "Hesap", "/hesap-hareketleri"],
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
          <h2 className="v-overline">Asistanın takip listesi</h2>
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
              Asistana sor <IChevronRight size={14} />
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
                    <p className={`text-xs font-medium ${item.overdue ? "text-rose" : "text-mute"}`}>{item.sub}</p>
                  </div>
                </div>
                <span className={`v-chip shrink-0 ${item.overdue ? "v-chip-rose" : "v-chip-teal"}`}>
                  {item.overdue ? "Gecikti" : item.type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
