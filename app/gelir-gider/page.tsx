"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
import Link from "next/link";


function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

export default function GelirGiderPage() {
  const [tab, setTab] = useState<"gelir" | "gider">("gelir");
  const [records, setRecords] = useState<any[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return (window.location.href = "/login");

    const { data: incomes } = await supabase.from("income").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: expenses } = await supabase.from("expenses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

    setIncomeTotal((incomes || []).reduce((t, i) => t + Number(i.amount || 0), 0));
    setExpenseTotal((expenses || []).reduce((t, i) => t + Number(i.amount || 0), 0));

    setRecords([
      ...(incomes || []).map((i:any) => ({ ...i, type: "gelir" })),
      ...(expenses || []).map((e:any) => ({ ...e, type: "gider" })),
    ].sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))));
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const payload:any = {
      user_id: user.id,
      title: String(form.get("title") || ""),
      amount: Number(form.get("amount") || 0),
      payment_method: String(form.get("method") || "Nakit"),
      note: String(form.get("note") || ""),
    };

    if (tab === "gelir") {
      payload.income_date = String(form.get("date") || today());
      const { error } = await supabase.from("income").insert(payload);
      if (error) {
        alert("Gelir ekleme hatası: " + error.message);
        return;
      }
    } else {
      payload.expense_date = String(form.get("date") || today());
      payload.category = String(form.get("category") || "Genel");
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) {
        alert("Gider ekleme hatası: " + error.message);
        return;
      }
    }

    e.currentTarget.reset();
    load();
  }

  async function updateRecord() {
    if (!editing) return;

    const table = editing.type === "gelir" ? "income" : "expenses";
    const payload:any = {
      title: editing.title,
      amount: Number(editing.amount || 0),
      payment_method: editing.payment_method || "Nakit",
      note: editing.note || "",
    };

    if (editing.type === "gider") payload.category = editing.category || "Genel";

    const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
    if (error) {
      alert("Güncelleme hatası: " + error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteRecord(item:any) {
    if (!confirm("Bu kaydı silmek istiyor musun?")) return;
    const table = item.type === "gelir" ? "income" : "expenses";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      alert("Silme hatası: " + error.message);
      return;
    }
    load();
  }

  const C = { primary:"#006879", bg:"#f8f9fa", card:"#ffffff", border:"#bdc8cc", textMain:"#191c1d", textSub:"#3e484b", error:"#ba1a1a", dark:"#2e3132" };
  const net = incomeTotal - expenseTotal;

  return (
    <main style={{minHeight:"100vh",background:C.bg,color:C.textMain,fontFamily:"'Manrope',sans-serif",paddingBottom:96}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
        <div>
          <h1 style={{fontWeight:700,fontSize:18,margin:0}}>Finans</h1>
          <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>Gelir, gider ve kasa takibi</p>
        </div>
        <Link href="/" style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",fontSize:13,fontWeight:600,color:C.textSub,textDecoration:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>Ana</Link>
      </header>

      <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>
        {/* Özet */}
        <section style={{borderRadius:12,padding:20,marginBottom:16,position:"relative",overflow:"hidden",background:C.dark}}>
          <div style={{position:"absolute",top:0,right:0,width:120,height:120,borderRadius:"50%",opacity:0.15,background:`radial-gradient(circle,${C.primary},transparent)`,transform:"translate(30%,-30%)"}} />
          <p style={{fontSize:10,letterSpacing:"0.08em",color:"rgba(255,255,255,0.5)",marginBottom:4,fontFamily:"'Hanken Grotesk',sans-serif"}}>TOPLAM NET</p>
          <p style={{fontSize:32,fontWeight:700,color:net>=0?"#4ade80":"#f87171",letterSpacing:"-0.02em",margin:"0 0 12px"}}>{money(net)}</p>
          <div style={{display:"flex",gap:20}}>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>GELİR</p><p style={{fontWeight:700,fontSize:14,color:"#4ade80"}}>{money(incomeTotal)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>GİDER</p><p style={{fontWeight:700,fontSize:14,color:"#f87171"}}>{money(expenseTotal)}</p></div>
          </div>
        </section>

        {/* Form */}
        <section style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:16,marginBottom:16}}>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {(["gelir","gider"] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif",background:tab===t?C.primary:"#f3f4f5",color:tab===t?"#fff":C.textSub}}>
                {t==="gelir"?"💚 Gelir Ekle":"❤️ Gider Ekle"}
              </button>
            ))}
          </div>

          <form onSubmit={save} style={{display:"grid",gap:10}}>
            {[
              {name:"title",placeholder:tab==="gelir"?"Örn: Suite Halı ödeme":"Örn: Market"},
              {name:"amount",type:"number",placeholder:"Tutar"},
              {name:"date",type:"date",defaultValue:today()},
            ].map(p => (
              <input key={p.name} {...p} required={p.name!=="date"} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}} />
            ))}
            {tab==="gider" && <input name="category" placeholder="Kategori (Market, Ulaşım...)" style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}} />}
            <select name="method" style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
              <option>Nakit</option><option>Havale/EFT</option><option>Kredi Kartı</option><option>Diğer</option>
            </select>
            <button type="submit" style={{padding:"12px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
              {tab==="gelir"?"Geliri Kaydet":"Gideri Kaydet"}
            </button>
          </form>
        </section>

        {/* Liste */}
        <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:C.textSub,marginBottom:10,fontFamily:"'Hanken Grotesk',sans-serif"}}>TÜM KAYITLAR</p>
        <div style={{display:"grid",gap:8}}>
          {records.map((r) => (
            <div key={`${r.type}-${r.id}`} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${r.type==="gelir"?"#10b981":C.error}`,background:C.card,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <p style={{fontSize:10,fontWeight:700,color:r.type==="gelir"?"#10b981":C.error,letterSpacing:"0.06em",marginBottom:2,fontFamily:"'Hanken Grotesk',sans-serif"}}>{r.type.toUpperCase()}</p>
                  <p style={{fontWeight:700,fontSize:14,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{r.title}</p>
                  <p style={{fontSize:12,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{r.income_date||r.expense_date||""} · {r.payment_method||""}</p>
                </div>
                <p style={{fontWeight:700,fontSize:16,color:r.type==="gelir"?"#10b981":C.error,fontFamily:"'Manrope',sans-serif"}}>{money(Number(r.amount))}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEditing(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontSize:13,fontWeight:600,cursor:"pointer",color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Düzenle</button>
                <button onClick={()=>deleteRecord(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid #fecaca`,background:"#fef2f2",fontSize:13,fontWeight:600,cursor:"pointer",color:C.error,fontFamily:"'Hanken Grotesk',sans-serif"}}>Sil</button>
              </div>
            </div>
          ))}
          {records.length===0 && <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:24,textAlign:"center"}}><p style={{color:C.textSub,fontSize:14}}>Henüz kayıt yok.</p></div>}
        </div>
      </div>

      {editing && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:99999,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:C.card,borderRadius:"20px 20px 0 0",padding:20,width:"100%",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)"}}>
            <p style={{fontWeight:700,fontSize:16,marginBottom:16,color:C.textMain}}>Kaydı Düzenle</p>
            <div style={{display:"grid",gap:10}}>
              <input value={editing.title||""} onChange={e=>setEditing({...editing,title:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <input value={editing.amount||""} type="number" onChange={e=>setEditing({...editing,amount:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <textarea value={editing.note||""} onChange={e=>setEditing({...editing,note:e.target.value})} placeholder="Not" style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <div style={{display:"flex",gap:8}}>
                <button onClick={updateRecord} style={{flex:1,padding:"12px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>Kaydet</button>
                <button onClick={()=>setEditing(null)} style={{flex:1,padding:"12px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontWeight:600,fontSize:14,cursor:"pointer",color:C.textSub}}>Vazgeç</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
