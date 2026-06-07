"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();
const C = { primary:"#3fa7c9", secondary:"#e0a23c", dark:"#1c2b4d", bg:"#f7f8fc", card:"#ffffff", border:"#e2e8f0", textMain:"#0f172a", textSub:"#64748b", error:"#ef4444" };

function money(v: number) { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v||0); }

const LOAN_TYPES = ["bireysel","konut","araç","ihtiyaç","taşıt"];
const CARD_BANKS = ["Ziraat","Yapı Kredi","İş Bankası","Garanti","Akbank","Halkbank","Vakıfbank","QNB","ING","Diğer"];

const THIS_MONTH = new Date().toISOString().slice(0, 7); // "YYYY-MM"
const TODAY = new Date().toISOString().slice(0, 10);

export default function KredilerPage() {
  const [cards, setCards]     = useState<any[]>([]);
  const [loans, setLoans]     = useState<any[]>([]);
  const [cardPayments, setCardPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [addingLoan, setAddingLoan] = useState(false);
  const [payingCardId, setPayingCardId] = useState<string|null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<"min"|"full"|"custom">("custom");
  const [cardForm, setCardForm] = useState({ bank_name:"", card_name:"", credit_limit:"", current_balance:"", payment_day:"", min_payment:"" });
  const [loanForm, setLoanForm] = useState({ bank_name:"", loan_type:"bireysel", title:"", total_amount:"", remaining_amount:"", monthly_payment:"", payment_day:"", remaining_months:"" });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }
    const [{ data: c }, { data: l }, { data: cp }] = await Promise.all([
      supabase.from("credit_cards").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("loans").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("card_payments").select("*").eq("user_id",user.id).order("payment_date",{ascending:false}),
    ]);
    setCards(c||[]); setLoans(l||[]); setCardPayments(cp||[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Bir kartın bu ay yaptığı ödemeler / son ödeme (geçmişten hesaplanır — ay dönünce otomatik sıfırlanır)
  function cardMonthPayments(cardId: string) {
    return cardPayments.filter(p => p.card_id === cardId && String(p.payment_date||"").slice(0,7) === THIS_MONTH);
  }
  function cardPaidThisMonth(cardId: string) {
    return cardMonthPayments(cardId).reduce((t,p)=>t+Number(p.amount||0), 0);
  }
  function cardLastPayment(cardId: string) {
    return cardPayments.find(p => p.card_id === cardId) || null;
  }

  async function openPay(card: any) {
    if (payingCardId === card.id) { setPayingCardId(null); return; }
    setPayingCardId(card.id);
    setPayType("custom");
    setPayAmount(String(Number(card.min_payment) || ""));
  }

  async function saveCardPayment(card: any) {
    const amount = Number(payAmount) || 0;
    if (amount <= 0) { alert("Geçerli bir tutar gir."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1) Ödeme geçmişine yaz
    await supabase.from("card_payments").insert({
      user_id: user.id, card_id: card.id, amount,
      payment_type: payType, payment_date: TODAY,
    });
    // 2) Kart borcunu düş + bu ay ödendi işaretle
    const newBalance = Math.max(0, Number(card.current_balance||0) - amount);
    await supabase.from("credit_cards").update({
      current_balance: newBalance, is_paid_this_month: true, last_paid_date: TODAY,
    }).eq("id", card.id);

    setPayingCardId(null); setPayAmount(""); setPayType("custom");
    load();
  }

  async function saveCard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user||!cardForm.bank_name) return;
    await supabase.from("credit_cards").insert({ user_id:user.id, ...cardForm, credit_limit:Number(cardForm.credit_limit)||0, current_balance:Number(cardForm.current_balance)||0, payment_day:Number(cardForm.payment_day)||0, min_payment:Number(cardForm.min_payment)||0 });
    setCardForm({ bank_name:"", card_name:"", credit_limit:"", current_balance:"", payment_day:"", min_payment:"" });
    setAddingCard(false); load();
  }

  async function saveLoan() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user||!loanForm.bank_name) return;
    await supabase.from("loans").insert({ user_id:user.id, ...loanForm, total_amount:Number(loanForm.total_amount)||0, remaining_amount:Number(loanForm.remaining_amount)||0, monthly_payment:Number(loanForm.monthly_payment)||0, payment_day:Number(loanForm.payment_day)||0, remaining_months:Number(loanForm.remaining_months)||0 });
    setLoanForm({ bank_name:"", loan_type:"bireysel", title:"", total_amount:"", remaining_amount:"", monthly_payment:"", payment_day:"", remaining_months:"" });
    setAddingLoan(false); load();
  }

  async function deleteCard(id: string) { if(!confirm("Silinsin mi?")) return; await supabase.from("credit_cards").delete().eq("id",id); load(); }
  async function deleteLoan(id: string) { if(!confirm("Silinsin mi?")) return; await supabase.from("loans").delete().eq("id",id); load(); }

  const totalCardBalance  = cards.reduce((t,c)=>t+Number(c.current_balance||0),0);
  const totalCardMinimum  = cards.reduce((t,c)=>t+Number(c.min_payment||0),0);
  const totalLoanMonthly  = loans.reduce((t,l)=>t+Number(l.monthly_payment||0),0);
  const totalMonthly      = totalCardMinimum + totalLoanMonthly;
  const totalPaidThisMonth = cardPayments
    .filter(p => String(p.payment_date||"").slice(0,7) === THIS_MONTH)
    .reduce((t,p)=>t+Number(p.amount||0), 0);

  const loanIcon = (type: string) => ({ konut:"🏠", araç:"🚗", taşıt:"🚗", bireysel:"👤", ihtiyaç:"💼" }[type] || "💳");

  return (
    <main style={{minHeight:"100vh",background:C.bg,fontFamily:"'Manrope',sans-serif",paddingBottom:100}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{fontWeight:700,fontSize:18,margin:0,color:C.textMain}}>Krediler</h1>
          <p style={{fontSize:12,color:C.textSub,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>Kredi kartları, krediler, araç kredisi</p>
        </div>
        <Link href="/" style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontWeight:600,color:C.textSub,textDecoration:"none"}}>Ana</Link>
      </header>

      <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>

        {/* Aylık yükümlülük özet kartı */}
        <section style={{borderRadius:12,padding:20,marginBottom:16,background:C.dark,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:100,height:100,borderRadius:"50%",opacity:0.15,background:`radial-gradient(circle,${C.primary},transparent)`,transform:"translate(30%,-30%)"}} />
          <p style={{fontSize:10,letterSpacing:"0.08em",color:"rgba(255,255,255,0.5)",marginBottom:4,fontFamily:"'Hanken Grotesk',sans-serif"}}>AYLIK TOPLAM YÜKÜMLÜLÜK</p>
          <p style={{fontSize:36,fontWeight:700,color:"#f87171",margin:"0 0 12px",letterSpacing:"-0.02em"}}>{money(totalMonthly)}</p>
          <div style={{display:"flex",gap:20}}>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>K.KARTI MİNİMUM</p><p style={{fontWeight:700,fontSize:14,color:"#fbbf24"}}>{money(totalCardMinimum)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>KREDİ TAKSİT</p><p style={{fontWeight:700,fontSize:14,color:"#fb923c"}}>{money(totalLoanMonthly)}</p></div>
            <div><p style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'Hanken Grotesk',sans-serif"}}>K.KARTI BORÇ</p><p style={{fontWeight:700,fontSize:14,color:"#f87171"}}>{money(totalCardBalance)}</p></div>
          </div>
          {totalPaidThisMonth > 0 && (
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>✅</span>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.7)",margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>
                Bu ay ödenen: <span style={{fontWeight:700,color:"#34d399"}}>{money(totalPaidThisMonth)}</span>
              </p>
            </div>
          )}
        </section>

        {/* ── KREDİ KARTLARI ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>KREDİ KARTLARI ({cards.length})</p>
          <button onClick={()=>setAddingCard(v=>!v)} style={{padding:"6px 12px",borderRadius:8,background:C.primary,color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>+ Ekle</button>
        </div>

        {addingCard && (
          <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14,marginBottom:12}}>
            <div style={{display:"grid",gap:8}}>
              <select value={cardForm.bank_name} onChange={e=>setCardForm({...cardForm,bank_name:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
                <option value="">Banka Seç</option>
                {CARD_BANKS.map(b=><option key={b}>{b}</option>)}
              </select>
              <input placeholder="Kart adı (örn: Bonus)" value={cardForm.card_name} onChange={e=>setCardForm({...cardForm,card_name:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <input placeholder="Limit (₺)" type="number" value={cardForm.credit_limit} onChange={e=>setCardForm({...cardForm,credit_limit:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Mevcut Borç (₺)" type="number" value={cardForm.current_balance} onChange={e=>setCardForm({...cardForm,current_balance:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Son Ödeme Günü" type="number" min="1" max="31" value={cardForm.payment_day} onChange={e=>setCardForm({...cardForm,payment_day:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Min. Ödeme (₺)" type="number" value={cardForm.min_payment} onChange={e=>setCardForm({...cardForm,min_payment:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveCard} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>Kaydet</button>
                <button onClick={()=>setAddingCard(false)} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontWeight:600,fontSize:13,cursor:"pointer",color:C.textSub}}>İptal</button>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"grid",gap:10,marginBottom:20}}>
          {loading && [1,2].map(i => <div key={i} className="skeleton" style={{height:150}} />)}
          {cards.map(card => {
            const usage = card.credit_limit > 0 ? Math.round((card.current_balance/card.credit_limit)*100) : 0;
            return (
              <div key={card.id} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid #f59e0b`,background:C.card,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:20}}>💳</span>
                      <p style={{fontWeight:700,fontSize:15,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{card.bank_name} {card.card_name||""}</p>
                    </div>
                    {card.payment_day && <p style={{fontSize:12,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Son ödeme: Her ayın {card.payment_day}. günü</p>}
                  </div>
                  <button onClick={()=>deleteCard(card.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid #fecaca`,background:"#fef2f2",fontSize:11,cursor:"pointer",color:C.error}}>Sil</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#f3f4f5"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>LİMİT</p>
                    <p style={{fontWeight:700,fontSize:13,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(card.credit_limit)}</p>
                  </div>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#fef2f2"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>BORÇ</p>
                    <p style={{fontWeight:700,fontSize:13,color:C.error,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(card.current_balance)}</p>
                  </div>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#fffbeb"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>MİNİMUM</p>
                    <p style={{fontWeight:700,fontSize:13,color:"#d97706",fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(card.min_payment)}</p>
                  </div>
                </div>
                {card.credit_limit > 0 && (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Kullanım</span>
                      <span style={{fontSize:11,fontWeight:700,color:usage>80?C.error:"#d97706",fontFamily:"'Hanken Grotesk',sans-serif"}}>%{usage}</span>
                    </div>
                    <div style={{height:6,borderRadius:4,background:"#e5e7eb",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:usage>80?C.error:usage>60?"#f59e0b":"#10b981",width:`${usage}%`}} />
                    </div>
                  </div>
                )}

                {/* ── Ödeme takibi ── */}
                {(() => {
                  const paid = cardPaidThisMonth(card.id);
                  const last = cardLastPayment(card.id);
                  const isPaying = payingCardId === card.id;
                  const chip = (a:boolean) => ({ padding:"7px 10px", borderRadius:8, border:`1px solid ${a?C.primary:C.border}`, background:a?"#eef7f9":"#fff", color:a?C.primary:C.textSub, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif" } as const);
                  return (
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                        <div>
                          {paid > 0
                            ? <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:"#059669",background:"#ecfdf5",borderRadius:8,padding:"4px 9px"}}>✓ Bu ay {money(paid)} ödendi</span>
                            : <span style={{fontSize:12,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Bu ay henüz ödeme yok</span>}
                          {last && <p style={{fontSize:11,color:C.textSub,margin:"4px 0 0",fontFamily:"'Hanken Grotesk',sans-serif"}}>Son ödeme: {last.payment_date} · {money(last.amount)}</p>}
                        </div>
                        <button onClick={()=>openPay(card)} style={{padding:"8px 14px",borderRadius:9,background:isPaying?"#f3f4f5":C.primary,color:isPaying?C.textSub:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif",whiteSpace:"nowrap"}}>{isPaying?"Kapat":"Ödeme Yap"}</button>
                      </div>

                      {isPaying && (
                        <div style={{marginTop:10,display:"grid",gap:8}}>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {Number(card.min_payment)>0 && <button onClick={()=>{setPayType("min");setPayAmount(String(Number(card.min_payment)));}} style={chip(payType==="min")}>Min: {money(card.min_payment)}</button>}
                            {Number(card.current_balance)>0 && <button onClick={()=>{setPayType("full");setPayAmount(String(Number(card.current_balance)));}} style={chip(payType==="full")}>Tüm borç: {money(card.current_balance)}</button>}
                          </div>
                          <input type="number" placeholder="Tutar (₺)" value={payAmount} onChange={e=>{setPayAmount(e.target.value);setPayType("custom");}} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>saveCardPayment(card)} style={{flex:1,padding:"10px 0",borderRadius:8,background:"#059669",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>Ödemeyi Kaydet</button>
                            <button onClick={()=>setPayingCardId(null)} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontWeight:600,fontSize:13,cursor:"pointer",color:C.textSub}}>İptal</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {!loading && cards.length===0 && !addingCard && (
            <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:24,textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:8}}>💳</p>
              <p style={{fontSize:13,color:C.textSub}}>Henüz kredi kartı eklenmedi.</p>
            </div>
          )}
        </div>

        {/* ── KREDİLER ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>KREDİLER ({loans.length})</p>
          <button onClick={()=>setAddingLoan(v=>!v)} style={{padding:"6px 12px",borderRadius:8,background:C.primary,color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>+ Ekle</button>
        </div>

        {addingLoan && (
          <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:14,marginBottom:12}}>
            <div style={{display:"grid",gap:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <input placeholder="Banka adı" value={loanForm.bank_name} onChange={e=>setLoanForm({...loanForm,bank_name:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <select value={loanForm.loan_type} onChange={e=>setLoanForm({...loanForm,loan_type:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>
                  {LOAN_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <input placeholder="Açıklama (örn: Araç kredisi - Toyota)" value={loanForm.title} onChange={e=>setLoanForm({...loanForm,title:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <input placeholder="Toplam tutar (₺)" type="number" value={loanForm.total_amount} onChange={e=>setLoanForm({...loanForm,total_amount:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Kalan borç (₺)" type="number" value={loanForm.remaining_amount} onChange={e=>setLoanForm({...loanForm,remaining_amount:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Aylık taksit (₺)" type="number" value={loanForm.monthly_payment} onChange={e=>setLoanForm({...loanForm,monthly_payment:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Ödeme günü" type="number" min="1" max="31" value={loanForm.payment_day} onChange={e=>setLoanForm({...loanForm,payment_day:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
                <input placeholder="Kalan ay" type="number" value={loanForm.remaining_months} onChange={e=>setLoanForm({...loanForm,remaining_months:e.target.value})} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none"}} />
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveLoan} style={{flex:1,padding:"10px 0",borderRadius:8,background:C.primary,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif"}}>Kaydet</button>
                <button onClick={()=>setAddingLoan(false)} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontWeight:600,fontSize:13,cursor:"pointer",color:C.textSub}}>İptal</button>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"grid",gap:10}}>
          {loading && <div className="skeleton" style={{height:150}} />}
          {loans.map(loan => {
            const progress = loan.total_amount > 0 ? Math.round(((loan.total_amount - loan.remaining_amount)/loan.total_amount)*100) : 0;
            return (
              <div key={loan.id} style={{borderRadius:12,border:`1px solid ${C.border}`,borderLeft:`4px solid ${C.error}`,background:C.card,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:20}}>{loanIcon(loan.loan_type)}</span>
                      <p style={{fontWeight:700,fontSize:15,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{loan.bank_name}</p>
                    </div>
                    <p style={{fontSize:12,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{loan.title||loan.loan_type} {loan.payment_day?`· Her ayın ${loan.payment_day}. günü`:""}</p>
                  </div>
                  <button onClick={()=>deleteLoan(loan.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid #fecaca`,background:"#fef2f2",fontSize:11,cursor:"pointer",color:C.error}}>Sil</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#fef2f2"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>KALAN BORÇ</p>
                    <p style={{fontWeight:700,fontSize:13,color:C.error,fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(loan.remaining_amount)}</p>
                  </div>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#fffbeb"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>AYLIK TAKSİT</p>
                    <p style={{fontWeight:700,fontSize:13,color:"#d97706",fontFamily:"'Hanken Grotesk',sans-serif"}}>{money(loan.monthly_payment)}</p>
                  </div>
                  <div style={{textAlign:"center",padding:"8px",borderRadius:8,background:"#f3f4f5"}}>
                    <p style={{fontSize:10,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>KALAN AY</p>
                    <p style={{fontWeight:700,fontSize:13,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{loan.remaining_months||"—"}</p>
                  </div>
                </div>
                {loan.total_amount > 0 && (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>Ödenen</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#10b981",fontFamily:"'Hanken Grotesk',sans-serif"}}>%{progress}</span>
                    </div>
                    <div style={{height:6,borderRadius:4,background:"#e5e7eb",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:"#10b981",width:`${progress}%`}} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!loading && loans.length===0 && !addingLoan && (
            <div style={{borderRadius:12,border:`1px solid ${C.border}`,background:C.card,padding:24,textAlign:"center"}}>
              <p style={{fontSize:28,marginBottom:8}}>🏦</p>
              <p style={{fontSize:13,color:C.textSub}}>Henüz kredi eklenmedi.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
