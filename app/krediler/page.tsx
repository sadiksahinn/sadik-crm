"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, Progress } from "@/components/ui";
import { ICard, IBank, IPlus, ITrash, ICheck, ICar, IHomeAlt, IUser, IBriefcase, IEdit } from "@/components/Icons";
import { dateKey } from "@/utils/date";

const supabase = createClient();

const LOAN_TYPES = ["bireysel","konut","araç","ihtiyaç","taşıt"];
const CARD_BANKS = ["Enpara","Ziraat","Yapı Kredi","İş Bankası","Garanti","Akbank","Halkbank","Vakıfbank","QNB","ING","Diğer"];

const currentDate = () => dateKey();
const currentMonth = () => currentDate().slice(0, 7);

export default function KredilerPage() {
  const [cards, setCards]     = useState<any[]>([]);
  const [loans, setLoans]     = useState<any[]>([]);
  const [cardPayments, setCardPayments] = useState<any[]>([]);
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string|null>(null);
  const [addingLoan, setAddingLoan] = useState(false);
  const [payingCardId, setPayingCardId] = useState<string|null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<"min"|"full"|"custom">("custom");
  const [cardPeriod, setCardPeriod] = useState<"statement"|"current"|"future">("current");
  const [cardForm, setCardForm] = useState({ bank_name:"", card_name:"", credit_limit:"", current_balance:"", payment_day:"", min_payment:"" });
  const [loanForm, setLoanForm] = useState({ bank_name:"", loan_type:"bireysel", title:"", total_amount:"", remaining_amount:"", monthly_payment:"", payment_day:"", remaining_months:"" });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }
    const [{ data: c }, { data: l }, { data: cp }, { data: lp }] = await Promise.all([
      supabase.from("credit_cards").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("loans").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("card_payments").select("*").eq("user_id",user.id).order("payment_date",{ascending:false}),
      supabase.from("expenses").select("*").eq("user_id",user.id).eq("payment_method","Kredi Taksiti").gte("expense_date",currentMonth()+"-01"),
    ]);
    setCards(c||[]); setLoans(l||[]); setCardPayments(cp||[]); setLoanPayments(lp||[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Bir kartın bu ay yaptığı ödemeler / son ödeme (geçmişten hesaplanır — ay dönünce otomatik sıfırlanır)
  function cardMonthPayments(cardId: string) {
    return cardPayments.filter(p => p.card_id === cardId && String(p.payment_date||"").slice(0,7) === currentMonth());
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
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı.");

      const { data: payment, error: paymentError } = await supabase.from("card_payments").insert({
        user_id: user.id, card_id: card.id, amount,
        payment_type: payType, payment_date: currentDate(),
      }).select("id").single();
      if (paymentError || !payment) throw paymentError || new Error("Ödeme kaydı oluşturulamadı.");

      const newBalance = Math.max(0, Number(card.current_balance||0) - amount);
      const { data: updatedCard, error: cardError } = await supabase.from("credit_cards").update({
        current_balance: newBalance, is_paid_this_month: true, last_paid_date: currentDate(),
      }).eq("id", card.id).eq("user_id", user.id).select("id").maybeSingle();
      if (cardError || !updatedCard) {
        await supabase.from("card_payments").delete().eq("id", payment.id).eq("user_id", user.id);
        throw cardError || new Error("Kart borcu güncellenemedi.");
      }

      setPayingCardId(null); setPayAmount(""); setPayType("custom");
      await load();
    } catch (error) {
      alert(error instanceof Error ? `Ödeme kaydedilemedi: ${error.message}` : "Ödeme kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user||!cardForm.bank_name) return;
    const values = { ...cardForm, credit_limit:Number(cardForm.credit_limit)||0, current_balance:Number(cardForm.current_balance)||0, payment_day:Number(cardForm.payment_day)||0, min_payment:Number(cardForm.min_payment)||0 };
    if (editingCardId) {
      await supabase.from("credit_cards").update(values).eq("id", editingCardId).eq("user_id", user.id);
    } else {
      await supabase.from("credit_cards").insert({ user_id:user.id, ...values });
    }
    setCardForm({ bank_name:"", card_name:"", credit_limit:"", current_balance:"", payment_day:"", min_payment:"" });
    setEditingCardId(null); setAddingCard(false); load();
  }

  function editCard(card: any) {
    setCardForm({
      bank_name: String(card.bank_name || ""),
      card_name: String(card.card_name || ""),
      credit_limit: String(Number(card.credit_limit) || ""),
      current_balance: String(Number(card.current_balance) || ""),
      payment_day: String(Number(card.payment_day) || ""),
      min_payment: String(Number(card.min_payment) || ""),
    });
    setEditingCardId(card.id);
    setAddingCard(true);
    window.scrollTo({ top: 250, behavior: "smooth" });
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

  function loanPaidThisMonth(loanId: string) {
    return loanPayments.some(payment => String(payment.note || "").includes(`loan:${loanId}`));
  }

  async function toggleLoanPaid(loan: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const note = `Aylık kredi taksiti · loan:${loan.id}`;
    if (loanPaidThisMonth(loan.id)) {
      await supabase.from("expenses").delete().eq("user_id", user.id).eq("payment_method", "Kredi Taksiti").eq("note", note).gte("expense_date", currentMonth() + "-01");
    } else {
      await supabase.from("expenses").insert({
        user_id: user.id,
        title: loan.title || `${loan.bank_name} kredisi`,
        amount: Number(loan.monthly_payment || 0),
        expense_date: currentDate(),
        category: "Kredi",
        payment_method: "Kredi Taksiti",
        note,
      });
    }
    load();
  }

  const isVirtualCard = (card: any) => /sanal/i.test(String(card.card_name || ""));
  // Sanal kart borcu ana kart ekstresine de yansıdığı için toplamda ikinci kez sayılmaz.
  const payableCards = cards.filter(card => !isVirtualCard(card));
  const totalCardBalance  = payableCards.reduce((t,c)=>t+Number(c.current_balance||0),0);
  const totalCardMinimum  = payableCards.reduce((t,c)=>t+Number(c.min_payment||0),0);
  const totalLoanMonthly  = loans.reduce((t,l)=>t+Number(l.monthly_payment||0),0);
  const totalMonthly      = totalCardMinimum + totalLoanMonthly;
  const totalPaidThisMonth = cardPayments
    .filter(p => String(p.payment_date||"").slice(0,7) === currentMonth())
    .reduce((t,p)=>t+Number(p.amount||0), 0);

  function paymentDayText(dayValue: unknown, balanceValue: unknown) {
    const day = Number(dayValue || 0);
    const balance = Number(balanceValue || 0);
    if (!day) return "Son ödeme günü girilmedi";
    if (balance <= 0) return "Ödenecek kart borcu yok";
    const todayDay = Number(currentDate().slice(-2));
    if (day === todayDay) return "Son ödeme günü bugün";
    if (day > todayDay) return `Ödemeye ${day - todayDay} gün kaldı`;
    return `Son ödeme günü ayın ${day}. günü`;
  }

  const cardTheme = (card: any) => card.bank_name === "Garanti"
    ? "linear-gradient(145deg, #008c49 0%, #00a650 55%, #00763f 100%)"
    : "linear-gradient(135deg, #1a2540 0%, #0d1426 60%, #14304a 100%)";

  const loanIcon = (type: string) => {
    if (type === "konut") return <IHomeAlt size={18} />;
    if (type === "araç" || type === "taşıt") return <ICar size={18} />;
    if (type === "ihtiyaç") return <IBriefcase size={18} />;
    return <IUser size={18} />;
  };

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Kartlar ve Krediler" subtitle="Borçlarını, limitlerini ve ödeme günlerini takip et" />

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
        <button onClick={()=>{ setEditingCardId(null); setCardForm({ bank_name:"", card_name:"", credit_limit:"", current_balance:"", payment_day:"", min_payment:"" }); setAddingCard(v=>!v); }} className="v-btn v-btn-dark !py-2 !px-3.5 !text-xs">
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
              <button onClick={saveCard} className="v-btn v-btn-dark flex-1">{editingCardId ? "Güncelle" : "Kaydet"}</button>
              <button onClick={()=>{ setAddingCard(false); setEditingCardId(null); }} className="v-btn v-btn-soft flex-1">İptal</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-7 v-stagger overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-3">
        {loading && [1,2].map(i => <div key={i} className="skeleton h-[170px]" />)}
        {cards.map(card => {
          const usage = card.credit_limit > 0 ? Math.round((card.current_balance/card.credit_limit)*100) : 0;
          const paid = cardPaidThisMonth(card.id);
          const last = cardLastPayment(card.id);
          const isPaying = payingCardId === card.id;
          return (
            <article key={card.id} className="v-card v-credit-card-shell overflow-hidden min-w-[88%] sm:min-w-[420px] snap-center">
              {/* Kart görünümlü üst kısım */}
              <div className="v-credit-card relative p-5 text-white"
                style={{ background: cardTheme(card) }}>
                <div className="v-card-orb absolute -top-10 -right-10 h-36 w-36 rounded-full bg-teal/25 blur-2xl" />
                <div className="v-card-shine" aria-hidden="true" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center border border-white/10"><ICard size={18} /></span>
                      <div>
                        <p className="font-extrabold text-[16px] leading-tight">{card.card_name || `${card.bank_name} Kartım`}</p>
                        <p className="text-[11px] text-white/60 font-bold mt-0.5">{card.bank_name} · {isVirtualCard(card) ? "Sanal kart" : "Kredi kartı"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>editCard(card)} aria-label={`${card.card_name || "Kart"} düzenle`} className="v-press h-8 w-8 rounded-xl bg-white/10 grid place-items-center text-white/70">
                      <IEdit size={14} />
                    </button>
                    <button onClick={()=>deleteCard(card.id)} aria-label={`${card.card_name || "Kart"} sil`} className="v-press h-8 w-8 rounded-xl bg-white/10 grid place-items-center text-white/70">
                      <ITrash size={14} />
                    </button>
                  </div>
                </div>
                <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/45 font-extrabold">Güncel borç</p>
                    <p className="v-num text-[26px] font-black leading-none mt-1">{money(card.current_balance)}</p>
                  </div>
                  <span className={`v-chip border ${Number(card.current_balance||0) <= 0 ? "bg-emerald-400/15 text-emerald-200 border-emerald-300/20" : "bg-amber-300/10 text-amber-200 border-amber-200/15"}`}>
                    {paymentDayText(card.payment_day, card.current_balance)}
                  </span>
                </div>
                {card.credit_limit > 0 && (
                  <div className="relative z-10 mt-3.5">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Limitin %{usage} kullanıldı</span>
                      <span className={`v-num text-[11px] font-extrabold ${usage>80?"text-rose-300":"text-amber-300"}`}>%{usage}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${usage}%`, background: usage>80?"#fb7185":usage>60?"#fbbf24":"#34d399" }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="v-seg mb-3" aria-label="Kart dönemi">
                  <button onClick={()=>setCardPeriod("statement")} className={`v-seg-btn ${cardPeriod === "statement" ? "active" : ""}`}>Ekstre</button>
                  <button onClick={()=>setCardPeriod("current")} className={`v-seg-btn ${cardPeriod === "current" ? "active" : ""}`}>Dönem içi</button>
                  <button onClick={()=>setCardPeriod("future")} className={`v-seg-btn ${cardPeriod === "future" ? "active" : ""}`}>Gelecek dönem</button>
                </div>
                {cardPeriod !== "current" && (
                  <p className="text-[11px] text-mute font-semibold mb-3 px-1">
                    {cardPeriod === "statement" ? "Kesilmiş ekstre tutarı kart bilgileriyle birlikte güncellendiğinde burada görünür." : "Taksitli gelecek dönem hareketleri yüklendiğinde burada görünür."}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center py-2 rounded-xl bg-canvas">
                    <p className="v-overline !text-[9px]">Toplam limit</p>
                    <p className="v-num font-extrabold text-[13px]">{money(card.credit_limit)}</p>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-[#e8f7f1]">
                    <p className="v-overline !text-[9px] !text-mint/70">Kullanılabilir</p>
                    <p className="v-num font-extrabold text-[13px] text-mint">{money(Math.max(0, Number(card.credit_limit||0)-Number(card.current_balance||0)))}</p>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-[rgba(232,163,61,0.12)]">
                    <p className="v-overline !text-[9px] !text-[#a16a14]/70">Asgari ödeme</p>
                    <p className="v-num font-extrabold text-[13px] text-[#a16a14]">{money(card.min_payment)}</p>
                  </div>
                </div>

                {/* Ödeme takibi */}
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    {paid > 0
                      ? <span className="v-chip v-chip-mint"><ICheck size={12} /> Bu ay {money(paid)} ödendi</span>
                      : <span className="text-xs text-mute font-medium">Bu ay ödeme kaydı bulunmuyor</span>}
                    {last && <p className="text-[11px] text-mute font-medium mt-1">Son ödeme: {last.payment_date} · {money(last.amount)}</p>}
                  </div>
                  {!isVirtualCard(card) ? (
                    <button onClick={()=>openPay(card)} className={`v-btn !py-2 !px-3.5 !text-xs whitespace-nowrap ${isPaying ? "v-btn-soft" : "v-btn-teal"}`}>
                      {isPaying?"Ödeme alanını kapat":"Borç öde"}
                    </button>
                  ) : <span className="v-chip v-chip-teal">Ana kart ekstresine yansır</span>}
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
                      <button disabled={saving} onClick={()=>saveCardPayment(card)} className="v-btn v-btn-mint flex-1 !py-2.5 !text-[13px] disabled:opacity-50">
                        <ICheck size={15} /> {saving ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
                      </button>
                      <button onClick={()=>setPayingCardId(null)} className="v-btn v-btn-soft flex-1 !py-2.5 !text-[13px]">İptal</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-line">
                  <button onClick={()=>!isVirtualCard(card) && openPay(card)} disabled={isVirtualCard(card)} className="v-card-action">
                    <span className="v-card-action-icon"><ICheck size={17} /></span>
                    <span>{isVirtualCard(card) ? "Ana karttan öde" : "Borç öde"}</span>
                  </button>
                  <Link href="/harcamalar" className="v-card-action">
                    <span className="v-card-action-icon"><ICard size={17} /></span>
                    <span>Harcamalar</span>
                  </Link>
                  <button onClick={()=>editCard(card)} className="v-card-action">
                    <span className="v-card-action-icon"><IEdit size={17} /></span>
                    <span>Ayarlar</span>
                  </button>
                </div>
              </div>
            </article>
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
          const paid = loanPaidThisMonth(loan.id);
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
              <button onClick={()=>toggleLoanPaid(loan)} className={`v-btn w-full mt-3 !py-2.5 !text-[13px] ${paid ? "v-btn-soft" : "v-btn-mint"}`}>
                <ICheck size={15} /> {paid ? "Bu ay ödendi (geri al)" : "Taksiti ödendi işaretle"}
              </button>
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
