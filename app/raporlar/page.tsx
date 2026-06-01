"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();
const C = { primary:"#006879",secondary:"#835500",dark:"#2e3132",bg:"#f8f9fa",card:"#ffffff",border:"#bdc8cc",textMain:"#191c1d",textSub:"#3e484b",error:"#ba1a1a" };

function money(v: number) { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v||0); }

function monthRange(offset: number) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()+offset);
  const start = d.toISOString().slice(0,10);
  const end = new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10);
  const label = d.toLocaleDateString("tr-TR",{month:"short"});
  return { start, end, label };
}

type MonthData = { label:string; income:number; expense:number; net:number };

export default function RaporlarPage() {
  const [tab, setTab] = useState<"aylik"|"musteriler"|"kategoriler">("aylik");
  const [months, setMonths] = useState<MonthData[]>([]);
  const [currentIncome, setCurrentIncome] = useState<any[]>([]);
  const [currentExpenses, setCurrentExpenses] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<{name:string;paid:number;pending:number}[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href="/login"; return; }

      const ranges = [monthRange(-2),monthRange(-1),monthRange(0)];
      const monthResults: MonthData[] = await Promise.all(ranges.map(async r => {
        const [{ data: inc },{ data: exp }] = await Promise.all([
          supabase.from("income").select("amount").eq("user_id",user.id).gte("income_date",r.start).lte("income_date",r.end),
          supabase.from("expenses").select("amount").eq("user_id",user.id).gte("expense_date",r.start).lte("expense_date",r.end),
        ]);
        const income=(inc||[]).reduce((t,x)=>t+Number(x.amount||0),0);
        const expense=(exp||[]).reduce((t,x)=>t+Number(x.amount||0),0);
        return { label:r.label, income, expense, net:income-expense };
      }));
      setMonths(monthResults);

      const cur = monthRange(0);
      const [{ data: incData },{ data: expData },{ data: payData },{ data: customers },{ data: payments }] = await Promise.all([
        supabase.from("income").select("*").eq("user_id",user.id).gte("income_date",cur.start).lte("income_date",cur.end).order("income_date",{ascending:false}),
        supabase.from("expenses").select("*").eq("user_id",user.id).gte("expense_date",cur.start).lte("expense_date",cur.end).order("expense_date",{ascending:false}),
        supabase.from("payment_tracking").select("*").eq("user_id",user.id).eq("status","bekliyor").order("due_date",{ascending:true}),
        supabase.from("customers").select("id,name,brand_name").eq("user_id",user.id),
        supabase.from("payment_tracking").select("*").eq("user_id",user.id),
      ]);
      setCurrentIncome(incData||[]); setCurrentExpenses(expData||[]); setPendingPayments(payData||[]);
      if (customers&&payments) {
        const cd=customers.map((c:any)=>{
          const cp=payments.filter((p:any)=>p.customer_id===c.id);
          const paid=cp.filter((p:any)=>p.status==="ödendi").reduce((t,p:any)=>t+Number(p.amount||0),0);
          const pending=cp.filter((p:any)=>p.status==="bekliyor").reduce((t,p:any)=>t+Number(p.amount||0),0);
          return { name:c.brand_name||c.name, paid, pending };
        }).filter((c:any)=>c.paid>0||c.pending>0).sort((a:any,b:any)=>b.paid-a.paid);
        setCustomerData(cd);
      }
    }
    load();
  },[]);

  const cur = months[2]||{label:"",income:0,expense:0,net:0};
  const pendingTotal = pendingPayments.reduce((t,p)=>t+Number(p.amount||0),0);
  const maxBar = Math.max(...months.map(m=>Math.max(m.income,m.expense)),1);
  const efficiency = cur.income>0 ? Math.round((cur.net/cur.income)*100) : 0;

  const catBreak = currentExpenses.reduce((acc:any[],e:any)=>{
    const k=e.category||"Genel";
    const f=acc.find(x=>x.cat===k);
    if(f) f.total+=Number(e.amount||0); else acc.push({cat:k,total:Number(e.amount||0)});
    return acc;
  },[]).sort((a:any,b:any)=>b.total-a.total);

  return (
    <main className="min-h-screen pb-24" style={{background:C.bg,color:C.textMain,fontFamily:"'Manrope',sans-serif"}}>
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 h-14 border-b" style={{background:C.card,borderColor:C.border}}>
        <div>
          <h1 className="font-bold text-base">Raporlar</h1>
          <p className="text-xs" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Finansal performansınızın detaylı analizi</p>
        </div>
        <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-bold border" style={{borderColor:C.border,color:C.textSub}}>Ana</Link>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {/* Net Kâr kartı */}
        <section className="rounded-xl p-5 mb-4 relative overflow-hidden" style={{background:C.dark}}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{background:`radial-gradient(circle,${C.primary},transparent)`,transform:"translate(30%,-30%)"}} />
          <p className="text-[10px] tracking-widest text-white/50 mb-1" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>NET KÂR</p>
          <p className={`text-4xl font-bold mb-1 ${cur.net>=0?"text-green-400":"text-red-400"}`} style={{letterSpacing:"-0.02em"}}>{money(cur.net)}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-green-400" style={{width:`${Math.max(0,Math.min(efficiency,100))}%`}} />
            </div>
            <span className="text-xs text-white/60" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>{efficiency>=0?`Verimli ${efficiency}%`:"Zararda"}</span>
          </div>
          <div className="flex gap-4 mt-4">
            <div><p className="text-[10px] text-white/40" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>GELİR</p><p className="font-bold text-sm text-green-400">{money(cur.income)}</p></div>
            <div><p className="text-[10px] text-white/40" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>GİDER</p><p className="font-bold text-sm text-red-400">{money(cur.expense)}</p></div>
            <div><p className="text-[10px] text-white/40" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>TAHSİLAT</p><p className="font-bold text-sm" style={{color:"#4CD7F6"}}>{money(pendingTotal)}</p></div>
          </div>
        </section>

        {/* Gelir/Gider bar grafik */}
        <section className="rounded-xl border p-5 mb-4" style={{background:C.card,borderColor:C.border}}>
          <p className="font-semibold text-sm mb-4" style={{color:C.textMain}}>Gelir & Gider Karşılaştırması</p>
          <div className="flex items-end gap-4 h-28 mb-3">
            {months.map((m,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-24">
                  <div className="flex-1 rounded-t-lg" style={{height:`${(m.income/maxBar)*100}%`,minHeight:m.income>0?"6px":"0",background:C.primary,opacity:0.85}} />
                  <div className="flex-1 rounded-t-lg" style={{height:`${(m.expense/maxBar)*100}%`,minHeight:m.expense>0?"6px":"0",background:C.error,opacity:0.7}} />
                </div>
                <p className="text-[10px]" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{m.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:C.primary}} /> Gelir</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:C.error}} /> Gider</span>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex rounded-xl border p-1 mb-4" style={{background:C.card,borderColor:C.border}}>
          {(["aylik","musteriler","kategoriler"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors" style={{
              background:tab===t?C.primary:"transparent",
              color:tab===t?"#fff":C.textSub,
              fontFamily:"'Hanken Grotesk',sans-serif",
            }}>
              {t==="aylik"?"Bu Ay":t==="musteriler"?"Müşteriler":"Kategoriler"}
            </button>
          ))}
        </div>

        {/* Bu Ay */}
        {tab==="aylik" && (
          <section className="rounded-xl border p-5" style={{background:C.card,borderColor:C.border}}>
            <p className="font-semibold text-sm mb-3" style={{color:C.textMain}}>Son Gelirler</p>
            {currentIncome.slice(0,6).map((i:any)=>(
              <div key={i.id} className="flex justify-between py-2.5 border-b last:border-0" style={{borderColor:C.border}}>
                <span className="text-sm" style={{color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{i.title}</span>
                <span className="font-bold text-sm" style={{color:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(Number(i.amount))}</span>
              </div>
            ))}
            {currentIncome.length===0&&<p className="text-sm text-center py-4" style={{color:C.textSub}}>Bu ay gelir yok.</p>}
          </section>
        )}

        {/* Müşteriler */}
        {tab==="musteriler" && (
          <section className="rounded-xl border p-5" style={{background:C.card,borderColor:C.border}}>
            <p className="font-semibold text-sm mb-3" style={{color:C.textMain}}>En Çok Tahsilat Yapılan Müşteriler</p>
            {customerData.length===0&&<p className="text-sm text-center py-4" style={{color:C.textSub}}>Veri yok.</p>}
            {customerData.map((c,i)=>{
              const pct=c.paid+c.pending>0?Math.round(c.paid/(c.paid+c.pending)*100):0;
              const init=c.name.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
              const colors=[C.primary,C.secondary,"#5d5c74"];
              return (
                <div key={i} className="py-3 border-b last:border-0" style={{borderColor:C.border}}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{background:colors[i%3]}}>{init}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm" style={{color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{c.name}</p>
                      <p className="text-xs" style={{color:C.textSub}}>Alınan: {money(c.paid)}{c.pending>0?` · Bekleyen: ${money(c.pending)}`:""}</p>
                    </div>
                    <p className="font-bold text-sm" style={{color:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>+{money(c.paid)}</p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.border}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:colors[i%3]}} />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Kategoriler */}
        {tab==="kategoriler" && (
          <section className="rounded-xl border p-5" style={{background:C.card,borderColor:C.border}}>
            <p className="font-semibold text-sm mb-3" style={{color:C.textMain}}>Kategori Dağılımı</p>
            {catBreak.length===0&&<p className="text-sm text-center py-4" style={{color:C.textSub}}>Bu ay gider yok.</p>}
            {catBreak.map((c:any)=>{
              const pct=cur.expense>0?Math.round(c.total/cur.expense*100):0;
              return (
                <div key={c.cat} className="py-3 border-b last:border-0" style={{borderColor:C.border}}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-sm" style={{color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{c.cat}</span>
                    <span className="font-bold text-sm" style={{color:C.error,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(c.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:C.border}}>
                      <div className="h-full rounded-full" style={{width:`${pct}%`,background:C.error,opacity:0.7}} />
                    </div>
                    <span className="text-xs" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>%{pct}</span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
