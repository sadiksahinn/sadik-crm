"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, Progress } from "@/components/ui";
import { ICard, IBank, IPlus, ITrash, ICheck, ICar, IHomeAlt, IUser, IBriefcase } from "@/components/Icons";

const supabase = createClient();

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

  const loanIcon = (type: string) => {
    if (type === "konut") return <IHomeAlt size={18} />;
    if (type === "araç" || type === "taşıt") return <ICar size={18} />;
    if (type === "ihtiyaç") return <IBriefcase size={18} />;
    return <IUser size={18} />;
  };

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Krediler" subtitle="Kredi kartları ve krediler" />

      {/* Aylık yükümlülük hero */}
      <section className="v-hero p-5 mb-5">
        <div className="relative z-10">
          <p className="v-overline !text-white/50 mb-1">Aylık toplam yükümlülük</p>
          <p className="v-num text-[34px] font-extrabold leading-none text-rose-300 mb-4">{money(totalMonthly)}</p>
          <div className="flex gap-5 flex-wrap">
            <div>
              <p className="v-overline !text-white/40">K.kartı min.</p>
              <p className="v-num font-extrabold text-amber-300 text-sm mt-0.5">{money(totalCardMinimum)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Kredi taksit</p>
              <p className="v-num font-extrabold text-orange-300 text-sm mt-0.5">{money(totalLoanMonthly)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">K.kartı borç</p>
              <p className="v-num font-extrabold text-rose-300 text-sm mt-0.5">{money(totalCardBalance)}</p>
            </div>
          </div>
          {totalPaidThisMonth > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-400/20 text-emerald-300 grid place-items-center"><ICheck size={12} /></span>
              <p className="text-xs text-white/65 font-medium">
                Bu ay ödenen: <span className="v-num font-extrabold text-emerald-300">{money(totalPaidThisMonth)}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── KREDİ KARTLARI ── */}
      <div className="flex justify-between items-center mb-3">
        <p className="v-overline">Kredi kartları ({cards.length})</p>
        <button onClick={()=>setAddingCard(v=>!v)} className="v-btn v-btn-dark !py-2 !px-3.5 !text-xs">
          <IPlus size={14} /> Ekle
        </button>
      </div>

      {addingCard && (
        <div className="v-card p-4 mb-3">
          <div className="grid gap-2.5">
            <select value={cardForm.bank_name} onChange={e=>setCardForm({...cardForm,bank_name:e.target.value})} className="v-input">
              <option value="">Banka Seç</option>
              {CARD_BANKS.map(b=><option key={b}>{b}</option>)}
            </select>
            <input placeholder="Kart adı (örn: Bonus)" value={cardForm.card_name} onChange={e=>setCardForm({...cardForm,card_name:e.target.value})} className="v-input" />
            <div className="grid grid-cols-2 gap-2.5">
              <input placeholder="Limit (₺)" type="number" value={cardForm.credit_limit} onChange={e=>setCardForm({...cardForm,credit_limit:e.target.value})} className="v-input" />
              <input placeholder="Mevcut Borç (₺)" type="number" value={cardForm.current_balance} onChange={e=>setCardForm({...cardForm,current_balance:e.target.value})} className="v-input" />
              <input placeholder="Son Ödeme Günü" type="number" min="1" max="31" value={cardForm.payment_day} onChange={e=>setCardForm({...cardForm,payment_day:e.target.value})} className="v-input" />
              <input placeholder="Min. Ödeme (₺)" type="number" value={cardForm.min_payment} onChange={e=>setCardForm({...cardForm,min_payment:e.target.value})} className="v-input" />
            </div>
            <div className="flex gap-2.5">
              <button onClick={saveCard} className="v-btn v-btn-dark flex-1">Kaydet</button>
              <button onClick={()=>setAddingCard(false)} className="v-btn v-btn-soft flex-1">İptal</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 mb-6">
        {loading && [1,2].map(i => <div key={i} className="skeleton h-[170px]" />)}
        {cards.map(card => {
          const usage = card.credit_limit > 0 ? Math.round((card.current_balance/card.credit_limit)*100) : 0;
          const paid = cardPaidThisMonth(card.id);
          const last = cardLastPayment(card.id);
          const isPaying = payingCardId === card.id;
          return (
            <div key={card.id} className="v-card overflow-hidden">
              {/* Kart görünümlü üst kısım */}
              <div className="relative p-4 text-white"
                style={{ background: "linear-gradient(135deg, #1a2540 0%, #0d1426 60%, #14304a 100%)" }}>
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-teal/20 blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <ICard size={17} />
                      <p className="font-extrabold text-[15px]">{card.bank_name} {card.card_name||""}</p>
                    </div>
                    {card.payment_day ? <p className="text-xs text-white/50 font-medium">Son ödeme: her ayın {card.payment_day}. günü</p> : null}
                  </div>
                  <button onClick={()=>deleteCard(card.id)} className="v-press h-8 w-8 rounded-xl bg-white/10 grid place-items-center text-white/70">
                    <ITrash size={14} />
                  </button>
                </div>
                {card.credit_limit > 0 && (
                  <div className="relative z-10 mt-3.5">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Kullanım</span>
                      <span className={`v-num text-[11px] font-extrabold ${usage>80?"text-rose-300":"text-amber-300"}`}>%{usage}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${usage}%`, background: usage>80?"#fb7185":usage>60?"#fbbf24":"#34d399" }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center py-2 rounded-xl bg-canvas">
                    <p className="v-overline !text-[9px]">Limit</p>
                    <p className="v-num font-extrabold text-[13px]">{money(card.credit_limit)}</p>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-[#fdeef1]">
                    <p className="v-overline !text-[9px] !text-rose/70">Borç</p>
                    <p className="v-num font-extrabold text-[13px] text-rose">{money(card.current_balance)}</p>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-[rgba(232,163,61,0.12)]">
                    <p className="v-overline !text-[9px] !text-[#a16a14]/70">Minimum</p>
                    <p className="v-num font-extrabold text-[13px] text-[#a16a14]">{money(card.min_payment)}</p>
                  </div>
                </div>

                {/* Ödeme takibi */}
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    {paid > 0
                      ? <span className="v-chip v-chip-mint"><ICheck size={12} /> Bu ay {money(paid)} ödendi</span>
                      : <span className="text-xs text-mute font-medium">Bu ay henüz ödeme yok</span>}
                    {last && <p className="text-[11px] text-mute font-medium mt-1">Son ödeme: {last.payment_date} · {money(last.amount)}</p>}
                  </div>
                  <button onClick={()=>openPay(card)} className={`v-btn !py-2 !px-3.5 !text-xs whitespace-nowrap ${isPaying ? "v-btn-soft" : "v-btn-teal"}`}>
                    {isPaying?"Kapat":"Ödeme Yap"}
                  </button>
                </div>

                {isPaying && (
                  <div className="mt-3 grid gap-2.5">
                    <div className="flex gap-2 flex-wrap">
                      {Number(card.min_payment)>0 && (
                        <button onClick={()=>{setPayType("min");setPayAmount(String(Number(card.min_payment)));}}
                          className={`v-chip v-press cursor-pointer ${payType==="min" ? "v-chip-teal !ring-1 !ring-teal" : "v-chip-mute"}`}>
                          Min: {money(card.min_payment)}
                        </button>
                      )}
                      {Number(card.current_balance)>0 && (
                        <button onClick={()=>{setPayType("full");setPayAmount(String(Number(card.current_balance)));}}
                          className={`v-chip v-press cursor-pointer ${payType==="full" ? "v-chip-teal !ring-1 !ring-teal" : "v-chip-mute"}`}>
                          Tüm borç: {money(card.current_balance)}
                        </button>
                      )}
                    </div>
                    <input type="number" placeholder="Tutar (₺)" value={payAmount} onChange={e=>{setPayAmount(e.target.value);setPayType("custom");}} className="v-input" />
                    <div className="flex gap-2.5">
                      <button onClick={()=>saveCardPayment(card)} className="v-btn v-btn-mint flex-1 !py-2.5 !text-[13px]">
                        <ICheck size={15} /> Ödemeyi Kaydet
                      </button>
                      <button onClick={()=>setPayingCardId(null)} className="v-btn v-btn-soft flex-1 !py-2.5 !text-[13px]">İptal</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!loading && cards.length===0 && !addingCard && (
          <EmptyState icon={<ICard size={24} />} title="Henüz kredi kartı eklenmedi" hint="Kartlarını ekleyip borç ve ödeme takibini buradan yap." />
        )}
      </div>

      {/* ── KREDİLER ── */}
      <div className="flex justify-between items-center mb-3">
        <p className="v-overline">Krediler ({loans.length})</p>
        <button onClick={()=>setAddingLoan(v=>!v)} className="v-btn v-btn-dark !py-2 !px-3.5 !text-xs">
          <IPlus size={14} /> Ekle
        </button>
      </div>

      {addingLoan && (
        <div className="v-card p-4 mb-3">
          <div className="grid gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <input placeholder="Banka adı" value={loanForm.bank_name} onChange={e=>setLoanForm({...loanForm,bank_name:e.target.value})} className="v-input" />
              <select value={loanForm.loan_type} onChange={e=>setLoanForm({...loanForm,loan_type:e.target.value})} className="v-input">
                {LOAN_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <input placeholder="Açıklama (örn: Araç kredisi - Toyota)" value={loanForm.title} onChange={e=>setLoanForm({...loanForm,title:e.target.value})} className="v-input" />
            <div className="grid grid-cols-2 gap-2.5">
              <input placeholder="Toplam tutar (₺)" type="number" value={loanForm.total_amount} onChange={e=>setLoanForm({...loanForm,total_amount:e.target.value})} className="v-input" />
              <input placeholder="Kalan borç (₺)" type="number" value={loanForm.remaining_amount} onChange={e=>setLoanForm({...loanForm,remaining_amount:e.target.value})} className="v-input" />
              <input placeholder="Aylık taksit (₺)" type="number" value={loanForm.monthly_payment} onChange={e=>setLoanForm({...loanForm,monthly_payment:e.target.value})} className="v-input" />
              <input placeholder="Ödeme günü" type="number" min="1" max="31" value={loanForm.payment_day} onChange={e=>setLoanForm({...loanForm,payment_day:e.target.value})} className="v-input" />
              <input placeholder="Kalan ay" type="number" value={loanForm.remaining_months} onChange={e=>setLoanForm({...loanForm,remaining_months:e.target.value})} className="v-input" />
            </div>
            <div className="flex gap-2.5">
              <button onClick={saveLoan} className="v-btn v-btn-dark flex-1">Kaydet</button>
              <button onClick={()=>setAddingLoan(false)} className="v-btn v-btn-soft flex-1">İptal</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {loading && <div className="skeleton h-[150px]" />}
        {loans.map(loan => {
          const progress = loan.total_amount > 0 ? Math.round(((loan.total_amount - loan.remaining_amount)/loan.total_amount)*100) : 0;
          return (
            <div key={loan.id} className="v-card p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[rgba(45,163,199,0.12)] text-teal-deep grid place-items-center shrink-0">
                    {loanIcon(loan.loan_type)}
                  </div>
                  <div>
                    <p className="font-extrabold text-[15px]">{loan.bank_name}</p>
                    <p className="text-xs text-mute font-medium">{loan.title||loan.loan_type}{loan.payment_day?` · her ayın ${loan.payment_day}. günü`:""}</p>
                  </div>
                </div>
                <button onClick={()=>deleteLoan(loan.id)} className="v-press h-8 w-8 rounded-xl bg-[#fdeef1] text-rose grid place-items-center">
                  <ITrash size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center py-2 rounded-xl bg-[#fdeef1]">
                  <p className="v-overline !text-[9px] !text-rose/70">Kalan borç</p>
                  <p className="v-num font-extrabold text-[13px] text-rose">{money(loan.remaining_amount)}</p>
                </div>
                <div className="text-center py-2 rounded-xl bg-[rgba(232,163,61,0.12)]">
                  <p className="v-overline !text-[9px] !text-[#a16a14]/70">Aylık taksit</p>
                  <p className="v-num font-extrabold text-[13px] text-[#a16a14]">{money(loan.monthly_payment)}</p>
                </div>
                <div className="text-center py-2 rounded-xl bg-canvas">
                  <p className="v-overline !text-[9px]">Kalan ay</p>
                  <p className="v-num font-extrabold text-[13px]">{loan.remaining_months||"—"}</p>
                </div>
              </div>
              {loan.total_amount > 0 && (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-mute font-semibold">Ödenen</span>
                    <span className="v-num text-[11px] font-extrabold text-mint">%{progress}</span>
                  </div>
                  <Progress pct={progress} />
                </div>
              )}
            </div>
          );
        })}
        {!loading && loans.length===0 && !addingLoan && (
          <EmptyState icon={<IBank size={24} />} title="Henüz kredi eklenmedi" hint="Konut, araç veya ihtiyaç kredilerini buradan takip et." />
        )}
      </div>
    </main>
  );
}
