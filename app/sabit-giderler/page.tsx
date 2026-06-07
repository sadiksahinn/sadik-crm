"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();
const C = { primary:"#3fa7c9", secondary:"#e0a23c", dark:"#1c2b4d", bg:"#f7f8fc", card:"#ffffff", border:"#e2e8f0", textMain:"#0f172a", textSub:"#64748b", error:"#ef4444" };

function money(v: number) { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v||0); }
function today() { return new Date().toISOString().slice(0,10); }
const THIS_MONTH = new Date().toISOString().slice(0,7); // "YYYY-MM"
// "Bu ay ödendi" yalnızca son ödeme bu ayda ise geçerli — ay dönünce otomatik sıfırlanır
const isPaidThisMonth = (i: any) => !!i.is_paid_this_month && String(i.last_paid_date || "").slice(0,7) === THIS_MONTH;

const CATEGORIES = [
  { value:"kira",      label:"🏠 Kira" },
  { value:"aidat",     label:"🏢 Aidat" },
  { value:"elektrik",  label:"⚡ Elektrik" },
  { value:"su",        label:"💧 Su" },
  { value:"doğalgaz",  label:"🔥 Doğalgaz" },
  { value:"internet",  label:"🌐 İnternet" },
  { value:"telefon",   label:"📱 Telefon" },
  { value:"abonelik",  label:"📺 Abonelik" },
  { value:"sigorta",   label:"🛡️ Sigorta" },
  { value:"diğer",     label:"📋 Diğer" },
];

export default function SabitGiderlerPage() {
  const [items, setItems]   = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title:"", amount:"", due_day:"", category:"kira" });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }
    const { data } = await supabase.from("fixed_expenses").select("*").eq("user_id",user.id).order("due_day",{ascending:true});
    setItems(data||[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user||!form.title) return;
    await supabase.from("fixed_expenses").insert({ user_id:user.id, title:form.title, amount:Number(form.amount)||0, due_day:Number(form.due_day)||0, category:form.category });
    setForm({ title:"", amount:"", due_day:"", category:"kira" });
    setAdding(false); load();
  }

  async function togglePaid(item: any) {
    const nowPaid = !isPaidThisMonth(item);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("fixed_expenses").update({ is_paid_this_month:nowPaid, last_paid_date: nowPaid ? today() : null }).eq("id",item.id);
    if (nowPaid) {
      // Ödendi işaretlenince gider tablosuna da kaydet
      await supabase.from("expenses").insert({ user_id:user.id, title:item.title, amount:Number(item.amount||0), expense_date:today(), category:item.category, payment_method:"Sabit Gider", note:`Aylık sabit gider - ${item.category}` });
    } else {
      // Geri alınınca bu ay oluşturulan sabit gider kaydını da temizle (hayalet gider olmasın)
      await supabase.from("expenses").delete()
        .eq("user_id", user.id).eq("title", item.title)
        .eq("payment_method", "Sabit Gider").gte("expense_date", THIS_MONTH + "-01");
    }
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await supabase.from("fixed_expenses").delete().eq("id",id);
    load();
  }

  const totalMonthly  = items.reduce((t,i)=>t+Number(i.amount||0),0);
  const totalPaid     = items.filter(isPaidThisMonth).reduce((t,i)=>t+Number(i.amount||0),0);
  const totalUnpaid   = totalMonthly - totalPaid;
  const paidCount     = items.filter(isPaidThisMonth).length;
  const today_day     = new Date().getDate();

  const catLabel = (v: string) => CATEGORIES.find(c=>c.value===v)?.label || v;

  return (
    <main style={{minHeight:"100vh",background:C.bg,fontFamily:"'Manrope',sans-serif",paddingBottom:100}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{fontWeight:700,fontSize:18,margin:0,color:C.textMain}}>Fatura & Sabit Giderler</h1>
          <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>Kira, aidat, faturalar, abonelikler</p>
        </div>
        <Link href="/" style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontWeight:600,color:C.textSub,textDecoration:"none"}}>Ana</Link>
      </header>

      <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>

        {/* Özet */}
        <section style={{borderRadius:12,padding:20,marginBottom:16,background:C.dark,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:100,height:100,borderRadius:"50%",opacity:0.15,background:`radial-gradient(circle,${C.primary},transparent)`,transform:"translate(30%,-30%)"}} />
          <p style={{fontSize:10,letterSpacing:"0.08em",color:"rgba(255,255,255,0.5)",marginBottom:4,fontFamily:"'Hanken Grotesk',sans-serif"}}>AYLIK SABİT GİDERLER</p>
          <p style={{fontSize:36,fontWeight:700,color:"#f87171",margin:"0 0 12px",letterSpacing:"-0.02em"}}>{money(totalMonthly)}</p>
          <div style={{display:"flex",gap:20}}>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>ÖDENDİ</p><p style={{fontWeight:700,fontSize:14,color:"#4ade80"}}>{money(totalPaid)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>KALAN</p><p style={{fontWeight:700,fontSize:14,color:"#fbbf24"}}>{money(totalUnpaid)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>DURUM</p><p style={{fontWeight:700,fontSize:14,color:"#4ade80"}}>{paidCount}/{items.length}</p></div>
          </div>
        </section>

        {/* Progress */}
        {items.length > 0 && (
          <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>Bu ay ödenme durumu</span>
              <span style={{fontSize:12,fontWeight:700,color:C.primary,fontFamily:"'Hanken Grotesk',sans-serif"}}>%{Math.round((paidCount/items.length)*100)}</span>
            </div>
            <div style={{height:8,borderRadius:4,background:"#e5e7eb",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"#10b981",width:`${(paidCount/items.length)*100}%`,transition:"width 0.3s"}} />
            </div>
          </div>
        )}

        {/* Ekle butonu */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>KALEMLER ({items.length})</p>
          <button onClick={()=>setAdding(v=>!v)} style={{padding:"6px 12px",borderRadius:8,background:C.primary,color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>+ Ekle</button>
        </div>

        {adding && (
          <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14,marginBottom:12}}>
            <div style={{display:"grid",gap:8}}>
              <input placeholder="Başlık (örn: Elektrik faturası)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <input placeholder="Aylık tutar (₺)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Ödeme günü (1-31)" type="number" min="1" max="31" value={form.due_day} onChange={e=>setForm({...form,due_day:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              </div>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div style={{display:"flex",gap:8}}>
                <button onClick={save} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>Kaydet</button>
                <button onClick={()=>setAdding(false)} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontWeight:600,fontSize:13,cursor:"pointer",color:C.textSub}}>İptal</button>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        <div style={{display:"grid",gap:8}}>
          {items.map(item => {
            const isDue = item.due_day && Math.abs(item.due_day - today_day) <= 3;
            const borderColor = isPaidThisMonth(item) ? "#10b981" : isDue ? C.error : C.primary;
            return (
              <div key={item.id} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${borderColor}`,background:C.card,padding:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:`${borderColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {catLabel(item.category).split(" ")[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                      <p style={{fontWeight:700,fontSize:14,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif",margin:0}}>{item.title}</p>
                      <p style={{fontWeight:700,fontSize:15,color:isPaidThisMonth(item)?"#10b981":C.error,fontFamily:"'Manrope',sans-serif",margin:0}}>{money(Number(item.amount))}</p>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{catLabel(item.category).split(" ").slice(1).join(" ")}</span>
                      {item.due_day && <span style={{fontSize:11,color:isDue&&!isPaidThisMonth(item)?C.error:C.textSub,fontWeight:isDue?700:400,fontFamily:"'Hanken Grotesk',sans-serif"}}>· Her ayın {item.due_day}. günü</span>}
                      {isDue && !isPaidThisMonth(item) && <span style={{fontSize:10,fontWeight:700,background:`${C.error}20`,color:C.error,padding:"2px 6px",borderRadius:4,fontFamily:"'Hanken Grotesk',sans-serif"}}>YAKLAŞIYOR</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={()=>togglePaid(item)} style={{flex:1,padding:"9px 0",borderRadius:8,background:isPaidThisMonth(item)?"#f3f4f5":C.primary,color:isPaidThisMonth(item)?C.textSub:"#fff",fontWeight:700,fontSize:12,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>
                    {isPaidThisMonth(item)?"✓ Ödendi (geri al)":"Ödendi İşaretle"}
                  </button>
                  <button onClick={()=>deleteItem(item.id)} style={{padding:"9px 14px",borderRadius:8,border:`1px solid #fecaca`,background:"#fef2f2",fontSize:12,cursor:"pointer",color:C.error}}>Sil</button>
                </div>
              </div>
            );
          })}
          {items.length===0 && !adding && (
            <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:32,textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:8}}>🧾</p>
              <p style={{fontSize:13,color:C.textSub}}>Henüz sabit gider eklenmedi.</p>
              <p style={{fontSize:12,color:C.textSub,marginTop:4}}>Kira, aidat, elektrik, internet gibi aylık sabit giderlerinizi ekleyin.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
