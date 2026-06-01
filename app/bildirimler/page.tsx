"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
import Link from "next/link";


function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function BildirimlerPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("due_date", today())
      .order("due_date", { ascending: true });

    const { data: followups } = await supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("followup_date", today())
      .order("followup_date", { ascending: true });

    const { data: contents } = await supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "planlandı")
      .lte("publish_date", today())
      .order("publish_date", { ascending: true });

    setItems([
      ...(payments || []).map((x: any) => ({
        ...x,
        itemType: "payment",
        type: "Tahsilat",
        icon: "₺",
        title: x.title,
        desc: `${money(Number(x.amount || 0))} bekleyen ödeme`,
        date: x.due_date,
      })),
      ...(followups || []).map((x: any) => ({
        ...x,
        itemType: "followup",
        type: "Takip",
        icon: "□",
        title: x.title,
        desc: "Bekleyen takip görevi",
        date: x.followup_date,
      })),
      ...(contents || []).map((x: any) => ({
        ...x,
        itemType: "content",
        type: "İçerik",
        icon: "◉",
        title: x.content_title,
        desc: "Paylaşım kontrolü gerekiyor",
        date: x.publish_date,
      })),
    ]);
  }

  useEffect(() => {
    load();
  }, []);

  async function completeItem(item: any) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    if (item.itemType === "payment") {
      await supabase
        .from("payment_tracking")
        .update({ status: "ödendi", paid_date: today(), income_created: true })
        .eq("id", item.id);

      if (!item.income_created) {
      const { data: createdIncome } = await supabase.from("income").insert({
        user_id: user.id,
        title: item.title,
        amount: Number(item.amount || 0),
        income_date: today(),
        payment_method: "Bildirim merkezi",
        note: "Bildirim merkezinden ödendi yapıldı.",
      }).select().single();

      await supabase
        .from("payment_tracking")
        .update({ income_id: createdIncome?.id, income_created: true })
        .eq("id", item.id);
      }
    }

    if (item.itemType === "followup") {
      await supabase
        .from("followups")
        .update({ status: "tamamlandı" })
        .eq("id", item.id);
    }

    if (item.itemType === "content") {
      await supabase
        .from("content_calendar")
        .update({ status: "tamamlandı" })
        .eq("id", item.id);

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        customer_id: item.customer_id,
        service_id: item.service_id || null,
        action_title: "İçerik paylaşıldı",
        action_detail: `${item.content_title} bildirim merkezinden tamamlandı.`,
        action_type: "tamamlandı",
      });
    }

    load();
  }

  const C = { primary:"#006879", secondary:"#835500", bg:"#f8f9fa", card:"#ffffff", border:"#bdc8cc", textMain:"#191c1d", textSub:"#3e484b", error:"#ba1a1a" };

  return (
    <main style={{minHeight:"100vh",background:C.bg,color:C.textMain,fontFamily:"'Manrope',sans-serif",paddingBottom:96}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
        <div>
          <h1 style={{fontWeight:700,fontSize:18,margin:0}}>Bildirimler</h1>
          <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>Bugün dikkat etmen gerekenler</p>
        </div>
        <Link href="/" style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontWeight:600,color:C.textSub,textDecoration:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>Ana</Link>
      </header>

      <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>
        {/* Özet */}
        <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{fontSize:11,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif",letterSpacing:"0.06em"}}>BEKLEYEN BİLDİRİM</p>
            <p style={{fontSize:36,fontWeight:700,color:items.length>0?C.error:C.primary,fontFamily:"'Manrope',sans-serif",lineHeight:1.1}}>{items.length}</p>
          </div>
          {items.length > 0 && <span style={{fontSize:28}}>⚠️</span>}
        </div>

        {/* Liste */}
        <div style={{display:"grid",gap:10}}>
          {items.map((item, i) => {
            const typeColor = item.itemType==="payment" ? C.error : item.itemType==="content" ? C.primary : C.secondary;
            return (
              <div key={`${item.itemType}-${item.id}-${i}`} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${typeColor}`,background:C.card,padding:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:`${typeColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {item.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:10,fontWeight:700,color:typeColor,letterSpacing:"0.06em",marginBottom:2,fontFamily:"'Hanken Grotesk',sans-serif"}}>{item.type} · {item.date}</p>
                    <p style={{fontWeight:700,fontSize:14,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif",margin:0}}>{item.title}</p>
                    <p style={{fontSize:12,color:C.textSub,margin:0}}>{item.desc}</p>
                  </div>
                </div>
                <button onClick={()=>completeItem(item)} style={{width:"100%",padding:"10px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
                  {item.itemType==="payment"?"✓ Ödendi Yap":item.itemType==="content"?"✓ Paylaşıldı Yap":"✓ Tamamlandı Yap"}
                </button>
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:32,textAlign:"center"}}>
              <p style={{fontSize:32,marginBottom:8}}>✅</p>
              <p style={{fontWeight:700,fontSize:15,color:C.textMain,marginBottom:4}}>Harika!</p>
              <p style={{fontSize:13,color:C.textSub}}>Bugün için bekleyen bildirim yok.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
