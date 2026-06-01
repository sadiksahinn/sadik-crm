"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();
const C = { primary:"#006879",secondary:"#835500",secFixed:"#feb956",dark:"#2e3132",bg:"#f8f9fa",card:"#ffffff",border:"#bdc8cc",textMain:"#191c1d",textSub:"#3e484b",error:"#ba1a1a" };

function money(v: number) { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v||0); }
function today() { return new Date().toISOString().slice(0,10); }

export default function TahsilatlarPage() {
  const [items, setItems]   = useState<any[]>([]);
  const [title, setTitle]   = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate]     = useState(today());
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data } = await supabase.from("payment_tracking").select("*").eq("user_id",user.id).order("due_date",{ascending:true});
    setItems(data||[]);
  }
  useEffect(() => { load(); }, []);

  async function addPayment() {
    if (!title.trim()||!amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("payment_tracking").insert({user_id:user.id,title,amount:Number(amount),due_date:date,status:"bekliyor"});
    setTitle(""); setAmount(""); setDate(today()); setAdding(false); load();
  }

  async function markPaid(item: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("payment_tracking").update({status:"ödendi",paid_date:today(),income_created:true}).eq("id",item.id);
    if (!item.income_created) {
      const { data: inc } = await supabase.from("income").insert({user_id:user.id,title:item.title,amount:Number(item.amount||0),income_date:today(),payment_method:"Tahsilat"}).select().single();
      if (inc) await supabase.from("payment_tracking").update({income_id:inc.id}).eq("id",item.id);
    }
    load();
  }

  async function deletePayment(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await supabase.from("payment_tracking").delete().eq("id",id);
    load();
  }

  const pending   = items.filter(i => i.status !== "ödendi");
  const paid      = items.filter(i => i.status === "ödendi");
  const overdue   = pending.filter(i => i.due_date < today());
  const pendingTotal = pending.reduce((t,i) => t+Number(i.amount||0),0);
  const overdueTotal = overdue.reduce((t,i) => t+Number(i.amount||0),0);
  const paidTotal    = paid.reduce((t,i) => t+Number(i.amount||0),0);

  return (
    <main className="min-h-screen pb-24" style={{background:C.bg,color:C.textMain,fontFamily:"'Manrope',sans-serif"}}>
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 h-14 border-b" style={{background:C.card,borderColor:C.border}}>
        <div>
          <h1 className="font-bold text-base">Tahsilatlar</h1>
          <p className="text-xs" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Bekleyen ve tamamlanan ödemeler</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setAdding(v=>!v)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>+ Ekle</button>
          <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-bold border" style={{borderColor:C.border,color:C.textSub}}>Ana</Link>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {/* Gecikmiş uyarı */}
        {overdue.length > 0 && (
          <section className="rounded-xl p-4 mb-4 flex items-center gap-4" style={{background:`linear-gradient(135deg,${C.error},${C.secondary})`}}>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">⚠️</div>
            <div>
              <h2 className="font-bold text-white">Gecikmiş Ödeme</h2>
              <p className="text-white/80 text-xs">{overdue.length} müşteri · {money(overdueTotal)}</p>
            </div>
          </section>
        )}

        {/* Yeni ekle formu */}
        {adding && (
          <section className="rounded-xl border p-4 mb-4" style={{background:C.card,borderColor:C.border}}>
            <p className="font-bold text-sm mb-3">Yeni Tahsilat</p>
            <div className="grid gap-2">
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Başlık" className="rounded-lg px-3 py-2.5 text-sm border outline-none" style={{borderColor:C.border}} />
              <div className="grid grid-cols-2 gap-2">
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="Tutar" className="rounded-lg px-3 py-2.5 text-sm border outline-none" style={{borderColor:C.border}} />
                <input value={date} onChange={e=>setDate(e.target.value)} type="date" className="rounded-lg px-3 py-2.5 text-sm border outline-none" style={{borderColor:C.border}} />
              </div>
              <div className="flex gap-2">
                <button onClick={addPayment} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{background:C.primary}}>Kaydet</button>
                <button onClick={()=>setAdding(false)} className="flex-1 py-2.5 rounded-lg text-sm border" style={{borderColor:C.border,color:C.textSub}}>İptal</button>
              </div>
            </div>
          </section>
        )}

        {/* Bekleyen */}
        {pending.length > 0 && (
          <section className="mb-4">
            <p className="text-xs font-bold tracking-widest mb-3" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>BEKLİYEN ({pending.length})</p>
            <div className="space-y-3">
              {pending.map((item) => {
                const isOvr = item.due_date < today();
                const init = item.title.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={item.id} className="rounded-xl border-l-4 border p-4" style={{background:C.card,borderLeftColor:isOvr?C.error:C.primary,borderColor:C.border}}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{background:`${isOvr?C.error:C.primary}18`,color:isOvr?C.error:C.primary}}>{init}</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{item.title}</p>
                        <p className="text-xs" style={{color:C.textSub}}>Vade: {item.due_date}</p>
                      </div>
                      <p className="font-bold text-base" style={{color:isOvr?C.error:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(Number(item.amount))}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>markPaid(item)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1" style={{background:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>✓ Ödendi</button>
                      <button onClick={()=>{
                        const msg=`Merhaba, ${item.title} için ${money(Number(item.amount||0))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
                        navigator.clipboard.writeText(msg).catch(()=>{});
                        alert("WhatsApp mesajı kopyalandı");
                      }} className="px-3 py-2 rounded-lg text-xs border flex items-center gap-1" style={{borderColor:C.border,color:C.primary}}>💬 Mesaj</button>
                      <button onClick={()=>deletePayment(item.id)} className="px-3 py-2 rounded-lg text-xs border" style={{borderColor:C.border,color:C.error}}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Özet */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4" style={{background:C.dark}}>
            <p className="text-[10px] tracking-widest text-white/50 mb-1" style={{fontFamily:"'Hanken Grotesk',sans-serif"}}>BEKLEYEN</p>
            <p className="font-bold text-xl text-white">{money(pendingTotal)}</p>
            <p className="text-xs text-white/40 mt-1">{pending.length} kayıt</p>
          </div>
          <div className="rounded-xl p-4 border" style={{background:C.card,borderColor:C.border}}>
            <p className="text-[10px] tracking-widest mb-1" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>ALINAN</p>
            <p className="font-bold text-xl" style={{color:C.primary}}>{money(paidTotal)}</p>
            <p className="text-xs mt-1" style={{color:C.textSub}}>{paid.length} tahsilat</p>
          </div>
        </div>

        {/* Tamamlananlar */}
        {paid.length > 0 && (
          <section>
            <p className="text-xs font-bold tracking-widest mb-3" style={{color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>TAMAMLANDI ({paid.length})</p>
            <div className="space-y-2">
              {paid.map((item) => (
                <div key={item.id} className="rounded-xl border p-4 flex justify-between items-center opacity-75" style={{background:C.card,borderColor:C.border}}>
                  <div>
                    <p className="font-semibold text-sm" style={{color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{item.title}</p>
                    <p className="text-xs" style={{color:C.textSub}}>{item.paid_date||item.due_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm" style={{color:"#10b981",fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(Number(item.amount))}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:"#10b98120",color:"#10b981"}}>✓</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {items.length===0 && (
          <div className="rounded-xl border p-8 text-center" style={{background:C.card,borderColor:C.border}}>
            <p className="text-sm" style={{color:C.textSub}}>Henüz tahsilat yok.</p>
          </div>
        )}
      </div>
    </main>
  );
}
