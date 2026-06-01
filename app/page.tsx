"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

const C = {
  primary:   "#006879",
  secondary: "#835500",
  secFixed:  "#feb956",
  dark:      "#2e3132",
  bg:        "#f8f9fa",
  card:      "#ffffff",
  border:    "#bdc8cc",
  textMain:  "#191c1d",
  textSub:   "#3e484b",
  error:     "#ba1a1a",
};

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}
function firstName(name: string) { return (name || "Kullanıcı").trim().split(" ")[0]; }

export default function HomePage() {
  const [fullName, setFullName]     = useState("Kullanıcı");
  const [avatar, setAvatar]         = useState("");
  const [customerCount, setCustomers] = useState(0);
  const [taskCount, setTasks]       = useState(0);
  const [todayIncome, setIncome]    = useState(0);
  const [todayExpense, setExpense]  = useState(0);
  const [colTotal, setColTotal]     = useState(0);
  const [colCount, setColCount]     = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [agenda, setAgenda]         = useState<any[]>([]);
  const [recentCol, setRecentCol]   = useState<any[]>([]);
  const [balanceVisible, setBalVis] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sd } = await supabase.auth.getSession();
      if (!sd.session) { window.location.href = "/login"; return; }
      const uid = sd.session.user.id;

      const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,onboarding_completed").eq("id", uid).single();
      if (!p?.onboarding_completed) { window.location.href = "/onboarding"; return; }
      setFullName(p?.full_name || "Kullanıcı");
      setAvatar(p?.avatar_url?.startsWith("data:") ? "" : (p?.avatar_url || ""));

      const today = new Date().toISOString().slice(0, 10);
      const [
        { count: cust }, { count: tasks },
        { data: inc }, { data: exp },
        { data: cols }, { data: pays }, { data: fols }, { data: conts },
        { data: rcols },
      ] = await Promise.all([
        supabase.from("customers").select("*",{count:"exact",head:true}).eq("user_id",uid),
        supabase.from("followups").select("*",{count:"exact",head:true}).eq("user_id",uid).eq("status","bekliyor").lte("followup_date",today),
        supabase.from("income").select("amount").eq("user_id",uid).eq("income_date",today),
        supabase.from("expenses").select("amount").eq("user_id",uid).eq("expense_date",today),
        supabase.from("payment_tracking").select("*").eq("user_id",uid).eq("status","bekliyor").lte("due_date",today),
        supabase.from("payment_tracking").select("*").eq("user_id",uid).eq("status","bekliyor").lte("due_date",today).order("due_date",{ascending:true}).limit(3),
        supabase.from("followups").select("*").eq("user_id",uid).eq("status","bekliyor").lte("followup_date",today).limit(3),
        supabase.from("content_calendar").select("*").eq("user_id",uid).eq("status","planlandı").lte("publish_date",today).limit(2),
        supabase.from("payment_tracking").select("*,customers(name,brand_name)").eq("user_id",uid).eq("status","ödendi").order("paid_date",{ascending:false}).limit(3),
      ]);

      const iTotal = (inc||[]).reduce((a:number,b:any)=>a+Number(b.amount||0),0);
      const eTotal = (exp||[]).reduce((a:number,b:any)=>a+Number(b.amount||0),0);
      const cTotal = (cols||[]).reduce((t:number,i:any)=>t+Number(i.amount||0),0);
      setCustomers(cust||0); setTasks(tasks||0);
      setIncome(iTotal); setExpense(eTotal);
      setColTotal(cTotal); setColCount((cols||[]).length);
      setNotifCount((pays||[]).length+(fols||[]).length+(conts||[]).length);
      setAgenda([
        ...(pays||[]).map((x:any)=>({icon:"₺",title:x.title,sub:money(Number(x.amount||0))+" tahsilat",type:"tahsilat",href:"/tahsilatlar",urgent:true})),
        ...(fols||[]).map((x:any)=>({icon:"✓",title:x.title,sub:"Görev bekliyor",type:"gorev",href:"/hatirlatmalar",urgent:false})),
        ...(conts||[]).map((x:any)=>({icon:"▶",title:x.content_title,sub:"Paylaşım kontrolü",type:"icerik",href:"/takvim",urgent:false})),
      ].slice(0,4));
      setRecentCol(rcols||[]);
    }
    load();
  }, []);

  const net = todayIncome - todayExpense;
  const hour = new Date().getHours();
  const greet = hour<12?"Günaydın":hour<18?"İyi günler":"İyi akşamlar";
  const initials = firstName(fullName)[0]?.toUpperCase()||"K";

  return (
    <main className="min-h-screen pb-24" style={{ background: C.bg, color: C.textMain, fontFamily: "'Manrope', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 h-16 border-b" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex items-center gap-3">
          <Link href="/profil" className="w-10 h-10 rounded-full overflow-hidden border flex items-center justify-center font-bold text-white text-sm" style={{ background: C.primary, borderColor: C.border }}>
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : initials}
          </Link>
          <div>
            <p className="text-xs" style={{ color: C.textSub, fontFamily: "'Hanken Grotesk',sans-serif" }}>{greet},</p>
            <p className="text-sm font-bold" style={{ color: C.primary, fontFamily: "'Hanken Grotesk',sans-serif" }}>{firstName(fullName)}</p>
          </div>
        </div>

        <span className="text-xl font-bold" style={{ color: C.primary, fontFamily: "'Manrope',sans-serif" }}>Valkea</span>

        <div className="flex items-center gap-1">
          <Link href="/bildirimler" className="relative p-2 rounded-full" style={{ color: C.textSub }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
          </Link>
        </div>
      </header>

      <div className="px-4 pt-5 max-w-lg mx-auto">

        {/* Bakiye Kartı */}
        <section className="rounded-xl p-6 mb-5 relative overflow-hidden" style={{ background: C.dark }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)`, transform: "translate(30%,-30%)" }} />
          <p className="text-xs tracking-widest mb-1 opacity-70" style={{ color: C.primary, fontFamily: "'Hanken Grotesk',sans-serif" }}>TOPLAM BAKİYE</p>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
              {balanceVisible ? money(todayIncome) : "₺ ••••••"}
            </h2>
            <button onClick={() => setBalVis(v => !v)} className="opacity-60 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {balanceVisible
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                }
              </svg>
            </button>
          </div>
          <div className="flex gap-6 mt-6">
            <div>
              <p className="text-xs opacity-50 text-white">Bugün Gelir</p>
              <p className="font-bold text-sm" style={{ color: "#4CD7F6" }}>{money(todayIncome)}</p>
            </div>
            <div>
              <p className="text-xs opacity-50 text-white">Bugün Gider</p>
              <p className="font-bold text-sm text-red-400">{money(todayExpense)}</p>
            </div>
            <div>
              <p className="text-xs opacity-50 text-white">Net</p>
              <p className={`font-bold text-sm ${net>=0?"text-green-400":"text-red-400"}`}>{money(net)}</p>
            </div>
          </div>
        </section>

        {/* 4 Stat Kartı */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: "📈", label: "Gelir", value: money(todayIncome), badge: "+bugün", color: C.primary },
            { icon: "📉", label: "Gider", value: money(todayExpense), badge: "bugün", color: C.error },
            { icon: "💰", label: "Tahsilat", value: `${colCount} Bekleyen`, badge: money(colTotal), color: C.secondary },
            { icon: "✅", label: "Görevler", value: `${taskCount} Bugün`, badge: `${customerCount} müşteri`, color: "#5d5c74" },
          ].map(({ icon, label, value, badge, color }) => (
            <div key={label} className="rounded-xl p-4 border flex flex-col justify-between" style={{ background: C.card, borderColor: C.border }}>
              <div className="flex justify-between items-start mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ background: `${color}18` }}>
                  {icon}
                </div>
                <span className="text-xs font-semibold" style={{ color, fontFamily: "'Hanken Grotesk',sans-serif" }}>{badge}</span>
              </div>
              <p className="text-xs mb-0.5" style={{ color: C.textSub, fontFamily: "'Hanken Grotesk',sans-serif" }}>{label}</p>
              <p className="font-bold text-sm" style={{ color: C.textMain, fontFamily: "'Hanken Grotesk',sans-serif" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Hızlı Aksiyonlar */}
        <div className="flex gap-3 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {[
            { icon: "👤＋", label: "Müşteri Ekle", href: "/musteriler", primary: true },
            { icon: "↑₺",   label: "Gelir Ekle",   href: "/gelir-gider", primary: false },
            { icon: "🧾",   label: "Fatura Kes",    href: `/fatura/${Date.now()}`, primary: false },
            { icon: "📊",   label: "Raporlar",      href: "/raporlar", primary: false },
            { icon: "✦",    label: "Asistan",       href: "/asistan", primary: false },
          ].map(({ icon, label, href, primary }) => (
            <Link key={label} href={href} className="flex flex-col items-center justify-center gap-2 min-w-[90px] h-20 rounded-xl border flex-shrink-0 active:scale-95 transition-transform text-sm font-semibold" style={{
              background: primary ? C.primary : C.card,
              color: primary ? "#fff" : C.primary,
              borderColor: primary ? C.primary : C.border,
              fontFamily: "'Hanken Grotesk',sans-serif",
            }}>
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* Gecikmiş tahsilat uyarısı */}
        {colCount > 0 && (
          <Link href="/tahsilatlar" className="flex items-center gap-4 rounded-xl p-4 mb-5 border-l-4" style={{ background: "#fff8ed", borderLeftColor: C.secondary }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${C.secondary}20` }}>
              <span className="text-lg">⚠️</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: C.secondary }}>Gecikmiş Ödeme</p>
              <p className="text-xs" style={{ color: C.textSub }}>{colCount} müşterinin tahsilatı bekliyor · {money(colTotal)}</p>
            </div>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: C.secondary }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        )}

        {/* Günün Ajandası */}
        <section className="rounded-xl border p-5 mb-5" style={{ background: C.card, borderColor: C.border }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-base" style={{ color: C.textMain }}>Günün Ajandası</h3>
            <Link href="/hatirlatmalar" className="text-xs font-semibold" style={{ color: C.primary, fontFamily: "'Hanken Grotesk',sans-serif" }}>Tümünü Gör</Link>
          </div>
          {agenda.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: C.textSub }}>Bugün için bekleyen takip yok.</p>
          ) : (
            <div className="space-y-2">
              {agenda.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{ background: "#f8f9fa" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{
                    background: item.urgent ? `${C.secondary}18` : `${C.primary}18`,
                    color: item.urgent ? C.secondary : C.primary,
                  }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: C.textMain, fontFamily: "'Hanken Grotesk',sans-serif" }}>{item.title}</p>
                    <p className="text-xs" style={{ color: C.textSub }}>{item.sub}</p>
                  </div>
                  {item.urgent && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${C.secondary}20`, color: C.secondary, fontFamily: "'Hanken Grotesk',sans-serif" }}>Önemli</span>}
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: C.textSub }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Son Tahsilatlar */}
        <section className="rounded-xl border p-5" style={{ background: C.card, borderColor: C.border }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-base" style={{ color: C.textMain }}>Son Tahsilatlar</h3>
            <Link href="/raporlar" className="text-xs font-semibold" style={{ color: C.primary, fontFamily: "'Hanken Grotesk',sans-serif" }}>Raporlar</Link>
          </div>
          {recentCol.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: C.textSub }}>Henüz tahsilat yok.</p>
          ) : (
            <div className="space-y-3">
              {recentCol.map((r: any, i) => {
                const name = r.customers?.brand_name || r.customers?.name || r.title || "—";
                const initials2 = name.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase();
                const colors2 = [`${C.primary}22`, `${C.secondary}22`, `${C.error}22`];
                const tcolors = [C.primary, C.secondary, C.error];
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: C.border }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: colors2[i%3], color: tcolors[i%3] }}>
                        {initials2}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: C.textMain, fontFamily: "'Hanken Grotesk',sans-serif" }}>{name}</p>
                        <p className="text-xs" style={{ color: C.textSub }}>{r.paid_date || "—"}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm" style={{ color: C.primary, fontFamily: "'Hanken Grotesk',sans-serif" }}>+{money(Number(r.amount||0))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
