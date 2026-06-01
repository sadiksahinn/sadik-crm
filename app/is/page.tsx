"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();
const C = { primary:"#61aebd", secondary:"#e5ab53", dark:"#1a1a2e", bg:"#f7f8fc", card:"#ffffff", border:"#e2e8f0", textMain:"#0f172a", textSub:"#64748b", error:"#ef4444" };

function money(v: number) { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v||0); }
function today() { return new Date().toISOString().slice(0,10); }

export default function IsPage() {
  const [customers, setCustomers]   = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [tasks, setTasks]           = useState<any[]>([]);
  const [contents, setContents]     = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab]               = useState<"ozet"|"musteriler"|"tahsilat"|"gorev">("ozet");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }

    const [{ data: cust },{ data: cols },{ data: fols },{ data: conts },{ data: acts }] = await Promise.all([
      supabase.from("customers").select("*,client_services(monthly_fee,status)").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("payment_tracking").select("*").eq("user_id",user.id).eq("status","bekliyor").order("due_date",{ascending:true}),
      supabase.from("followups").select("*").eq("user_id",user.id).eq("status","bekliyor").order("followup_date",{ascending:true}),
      supabase.from("content_calendar").select("*").eq("user_id",user.id).eq("status","planlandı").lte("publish_date", new Date(Date.now()+7*86400000).toISOString().slice(0,10)).order("publish_date",{ascending:true}),
      supabase.from("activity_logs").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
    ]);
    setCustomers(cust||[]); setCollections(cols||[]); setTasks(fols||[]); setContents(conts||[]); setActivities(acts||[]);
  }

  useEffect(() => { load(); }, []);

  async function markTaskDone(id: string) {
    await supabase.from("followups").update({status:"tamamlandı"}).eq("id",id);
    load();
  }

  async function markCollectionPaid(item: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("payment_tracking").update({status:"ödendi",paid_date:today(),income_created:true}).eq("id",item.id);
    if (!item.income_created) {
      await supabase.from("income").insert({user_id:user.id,title:item.title,amount:Number(item.amount||0),income_date:today(),payment_method:"İş Alanı"});
    }
    load();
  }

  const colTotal = collections.reduce((t,c)=>t+Number(c.amount||0),0);
  const overdueCollections = collections.filter(c=>c.due_date<today());
  const activeCustomers = customers.filter(c=>{
    const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
    return !!svc;
  });
  const monthlyRevenue = activeCustomers.reduce((t,c)=>{
    const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
    return t + Number(svc?.monthly_fee||0);
  },0);

  return (
    <main style={{minHeight:"100vh",background:C.bg,fontFamily:"'Manrope',sans-serif",paddingBottom:100}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{fontWeight:700,fontSize:18,margin:0,color:C.textMain}}>İş Alanı</h1>
          <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>Müşteriler, tahsilatlar, görevler, içerik</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Link href="/musteriler" style={{padding:"8px 12px",borderRadius:10,background:C.primary,fontSize:12,fontWeight:700,color:"#fff",textDecoration:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>+ Müşteri</Link>
          <Link href="/" style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:12,fontWeight:600,color:C.textSub,textDecoration:"none"}}>Ana</Link>
        </div>
      </header>

      <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>

        {/* Özet kartı */}
        <section style={{borderRadius:12,padding:20,marginBottom:16,background:C.dark,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:100,height:100,borderRadius:"50%",opacity:0.15,background:`radial-gradient(circle,${C.primary},transparent)`,transform:"translate(30%,-30%)"}} />
          <p style={{fontSize:10,letterSpacing:"0.08em",color:"rgba(255,255,255,0.5)",marginBottom:4,fontFamily:"'Hanken Grotesk',sans-serif"}}>AYLIK TEKRARLI GELİR</p>
          <p style={{fontSize:36,fontWeight:700,color:"#4ade80",margin:"0 0 12px",letterSpacing:"-0.02em"}}>{money(monthlyRevenue)}</p>
          <div style={{display:"flex",gap:16}}>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>AKTİF MÜŞTERİ</p><p style={{fontWeight:700,fontSize:14,color:"#4ade80"}}>{activeCustomers.length}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>TOPLAM MÜŞTERİ</p><p style={{fontWeight:700,fontSize:14,color:"#93c5fd"}}>{customers.length}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>TAHSİLAT</p><p style={{fontWeight:700,fontSize:14,color:"#fbbf24"}}>{money(colTotal)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>GÖREV</p><p style={{fontWeight:700,fontSize:14,color:"#a78bfa"}}>{tasks.length}</p></div>
          </div>
        </section>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {([["ozet","Özet"],["musteriler","Müşteriler"],["tahsilat","Tahsilat"],["gorev","Görevler"]] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px 0",borderRadius:8,fontWeight:700,fontSize:11,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif",background:tab===k?C.primary:"#f3f4f5",color:tab===k?"#fff":C.textSub}}>
              {l}
            </button>
          ))}
        </div>

        {/* ÖZET */}
        {tab==="ozet" && (
          <div style={{display:"grid",gap:10}}>
            {/* Gecikmiş tahsilatlar */}
            {overdueCollections.length > 0 && (
              <div style={{borderRadius:12,padding:14,background:`linear-gradient(135deg,${C.error},${C.secondary})`,color:"#fff"}}>
                <p style={{fontWeight:700,fontSize:14,margin:"0 0 4px"}}>⚠️ Gecikmiş Tahsilat</p>
                <p style={{fontSize:12,opacity:0.85,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{overdueCollections.length} müşterinin ödemesi gecikti</p>
              </div>
            )}
            {/* Yaklaşan içerik */}
            {contents.length > 0 && (
              <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14}}>
                <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:C.textSub,marginBottom:10,fontFamily:"'Hanken Grotesk',sans-serif"}}>BU HAFTA İÇERİK ({contents.length})</p>
                {contents.slice(0,3).map((c:any)=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <p style={{fontSize:13,fontWeight:600,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>◉ {c.content_title}</p>
                    <span style={{fontSize:11,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{c.publish_date}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Son aktiviteler */}
            {activities.length > 0 && (
              <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14}}>
                <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:C.textSub,marginBottom:10,fontFamily:"'Hanken Grotesk',sans-serif"}}>SON AKTİVİTELER</p>
                {activities.slice(0,5).map((a:any)=>(
                  <div key={a.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:18,flexShrink:0}}>{a.action_type==="iş"?"💼":a.action_type==="tamamlandı"?"✅":"📌"}</span>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:C.textMain,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{a.action_title}</p>
                      {a.action_detail && <p style={{fontSize:11,color:C.textSub,margin:0}}>{a.action_detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MÜŞTERİLER */}
        {tab==="musteriler" && (
          <div style={{display:"grid",gap:10}}>
            {customers.map(c=>{
              const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
              return (
                <Link key={c.id} href={`/musteriler/${c.id}`} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${svc?C.primary:C.border}`,background:C.card,padding:14,textDecoration:"none",display:"block"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:`${C.primary}18`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:C.primary,flexShrink:0}}>
                        {(c.brand_name||c.name||"?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{fontWeight:700,fontSize:14,color:C.textMain,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{c.brand_name||c.name}</p>
                        <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{c.phone||"—"}</p>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {svc && <p style={{fontWeight:700,fontSize:13,color:C.primary,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(svc.monthly_fee)}/ay</p>}
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:svc?`${C.primary}18`:"#f3f4f5",color:svc?C.primary:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{svc?"aktif":"pasif"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {customers.length===0 && (
              <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:32,textAlign:"center"}}>
                <p style={{fontSize:28,marginBottom:8}}>👥</p>
                <p style={{fontSize:13,color:C.textSub}}>Henüz müşteri yok.</p>
                <Link href="/musteriler" style={{display:"inline-block",marginTop:10,padding:"8px 16px",borderRadius:8,background:C.primary,color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>Müşteri Ekle</Link>
              </div>
            )}
          </div>
        )}

        {/* TAHSİLAT */}
        {tab==="tahsilat" && (
          <div style={{display:"grid",gap:10}}>
            {collections.map(item=>{
              const isOvr = item.due_date < today();
              const init = item.title.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
              return (
                <div key={item.id} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${isOvr?C.error:C.primary}`,background:C.card,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:`${isOvr?C.error:C.primary}18`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:isOvr?C.error:C.primary,flexShrink:0}}>{init}</div>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:700,fontSize:14,color:C.textMain,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{item.title}</p>
                      <p style={{fontSize:12,color:isOvr?C.error:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{isOvr?"Gecikmiş":"Vade"}: {item.due_date}</p>
                    </div>
                    <p style={{fontWeight:700,fontSize:15,color:isOvr?C.error:C.primary,margin:0,fontFamily:"'Manrope',sans-serif"}}>{money(Number(item.amount))}</p>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>markCollectionPaid(item)} style={{flex:1,padding:"9px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:12,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>✓ Ödendi</button>
                    <button onClick={()=>{
                      const msg=`Merhaba, ${item.title} için ${money(Number(item.amount))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
                      navigator.clipboard.writeText(msg).catch(()=>{});
                      alert("WhatsApp mesajı kopyalandı");
                    }} style={{padding:"9px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontSize:12,cursor:"pointer",color:C.primary}}>💬</button>
                  </div>
                </div>
              );
            })}
            {collections.length===0 && (
              <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:32,textAlign:"center"}}>
                <p style={{fontSize:28,marginBottom:8}}>✅</p>
                <p style={{fontSize:13,color:C.textSub}}>Bekleyen tahsilat yok.</p>
              </div>
            )}
          </div>
        )}

        {/* GÖREVLER */}
        {tab==="gorev" && (
          <div style={{display:"grid",gap:10}}>
            {tasks.map(task=>{
              const isOvr = task.followup_date < today();
              return (
                <div key={task.id} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${isOvr?C.error:C.secondary}`,background:C.card,padding:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:700,fontSize:14,color:C.textMain,margin:"0 0 4px",fontFamily:"'Hanken Grotesk',sans-serif"}}>{task.title}</p>
                      <p style={{fontSize:12,color:isOvr?C.error:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{task.followup_date}{isOvr?" (gecikti)":""}</p>
                      {task.message_suggestion && <p style={{fontSize:11,color:C.textSub,margin:"4px 0 0",fontStyle:"italic",fontFamily:"'Hanken Grotesk',sans-serif"}}>"{task.message_suggestion}"</p>}
                    </div>
                    {task.priority && task.priority!=="normal" && <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:task.priority==="acil"?`${C.error}20`:`${C.secondary}20`,color:task.priority==="acil"?C.error:C.secondary,fontFamily:"'Hanken Grotesk',sans-serif"}}>{task.priority}</span>}
                  </div>
                  <button onClick={()=>markTaskDone(task.id)} style={{width:"100%",padding:"9px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:12,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>✓ Tamamlandı</button>
                </div>
              );
            })}
            {tasks.length===0 && (
              <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:32,textAlign:"center"}}>
                <p style={{fontSize:28,marginBottom:8}}>✅</p>
                <p style={{fontSize:13,color:C.textSub}}>Bekleyen görev yok.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
