"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, today, Progress } from "@/components/ui";
import {
  IHomeAlt, IBuilding, IZap, IDroplet, IFlame, IGlobe, IPhone, ITv, IShield, IFile,
  IPlus, ITrash, ICheck, IReceipt,
} from "@/components/Icons";
import { dateKey } from "@/utils/date";
import FinanceSections from "@/components/FinanceSections";

const supabase = createClient();

const currentMonth = () => dateKey().slice(0, 7);
const NATURA_PROPERTY = "Batıkent Çakırlar Natura D-7";
const RENT_MARKER = `Taşınmaz: ${NATURA_PROPERTY}`;
const confirmedRentPayments: Record<string, number> = {
  "2026-09-01": 55000,
  "2026-08-01": 55000,
  "2026-06-30": 55000,
  "2026-05-31": 55000,
  "2026-04-30": 48000,
  "2026-03-27": 55000,
  "2026-02-20": 110000,
};
// "Bu ay ödendi" yalnızca son ödeme bu ayda ise geçerli — ay dönünce otomatik sıfırlanır
const isPaidThisMonth = (i: any) => !!i.is_paid_this_month && String(i.last_paid_date || "").slice(0,7) === currentMonth();
const billingAccountNumber = (title: string) => {
  const match = String(title || "").match(/(?:Sözleşme|Abone)\s+(\d{7,12})/i);
  return match?.[1] || "";
};

const CATEGORIES: { value: string; label: string; icon: ReactNode }[] = [
  { value:"kira",      label:"Kira",      icon:<IHomeAlt size={18} /> },
  { value:"aidat",     label:"Aidat",     icon:<IBuilding size={18} /> },
  { value:"elektrik",  label:"Elektrik",  icon:<IZap size={18} /> },
  { value:"su",        label:"Su",        icon:<IDroplet size={18} /> },
  { value:"doğalgaz",  label:"Doğalgaz",  icon:<IFlame size={18} /> },
  { value:"internet",  label:"İnternet",  icon:<IGlobe size={18} /> },
  { value:"telefon",   label:"Telefon",   icon:<IPhone size={18} /> },
  { value:"abonelik",  label:"Abonelik",  icon:<ITv size={18} /> },
  { value:"sigorta",   label:"Sigorta",   icon:<IShield size={18} /> },
  { value:"diğer",     label:"Diğer",     icon:<IFile size={18} /> },
];

export default function SabitGiderlerPage() {
  const [items, setItems]   = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [rentalIncome, setRentalIncome] = useState<any[]>([]);
  const [view, setView] = useState<"faturalar" | "kiralar">("faturalar");
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title:"", amount:"", due_day:"", category:"kira" });
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }
    const [{ data }, { data: payments }, { data: incomes }] = await Promise.all([
      supabase.from("fixed_expenses").select("*").eq("user_id",user.id).order("due_day",{ascending:true}),
      supabase.from("expenses").select("id,title,amount,expense_date,category,payment_method,note").eq("user_id", user.id)
        .order("expense_date", { ascending:false }),
      supabase.from("income").select("id,title,amount,income_date,payment_method,note").eq("user_id", user.id)
        .order("income_date", { ascending:false }),
    ]);
    let workingPayments = [...(payments || [])];
    const workingFixed = [...(data || [])];

    // Banka ekranında bulunmayan, sabit gider düğmesinden yanlışlıkla üretilmiş kira kayıtlarını kaldır.
    const unverifiedRentIds = workingPayments.filter((payment:any) => {
      const text = `${payment.title || ""} ${payment.note || ""}`;
      if (!/dilek/i.test(text) || String(payment.category || "").toLocaleLowerCase("tr-TR") !== "kira") return false;
      const date = String(payment.expense_date || "").slice(0,10);
      const expected = confirmedRentPayments[date];
      return !expected || (date !== "2026-02-20" && Number(payment.amount || 0) !== expected);
    }).map((payment:any) => payment.id);
    if (unverifiedRentIds.length) {
      await supabase.from("expenses").delete().eq("user_id", user.id).in("id", unverifiedRentIds);
      workingPayments = workingPayments.filter((payment:any) => !unverifiedRentIds.includes(payment.id));
    }

    // Doğrulanmış banka ekranı kaynak kayıttır: eksilen satırları geri kur, tekrar üretme.
    for (const [date, bankAmount] of Object.entries(confirmedRentPayments)) {
      const rentAmount = date === "2026-02-20" ? 55000 : bankAmount;
      const existingRent = workingPayments.find((payment:any) =>
        String(payment.expense_date || "").slice(0,10) === date &&
        Number(payment.amount || 0) === rentAmount &&
        String(payment.category || "").toLocaleLowerCase("tr-TR") === "kira" &&
        /dilek/i.test(`${payment.title || ""} ${payment.note || ""}`)
      );
      if (!existingRent) {
        const { data: restored } = await supabase.from("expenses").insert({
          user_id:user.id, title:`Dilek Yığıcı - ${NATURA_PROPERTY} kira bedeli`, amount:rentAmount,
          expense_date:date, category:"kira", payment_method:"Havale/EFT",
          note:`Açıklama: ${date.slice(0,7)} dönem kirası · ${RENT_MARKER} · Alıcı: Dilek Yığıcı · Durum: ödendi · Kaynak: doğrulanmış banka ekranı`,
        }).select("id,title,amount,expense_date,category,payment_method,note").single();
        if (restored) workingPayments.push(restored);
      }
    }
    const depositExists = workingPayments.some((payment:any) => String(payment.expense_date || "").slice(0,10) === "2026-02-20" && Number(payment.amount || 0) === 55000 && String(payment.category || "").toLocaleLowerCase("tr-TR") === "depozito");
    if (!depositExists) {
      const { data: restoredDeposit } = await supabase.from("expenses").insert({
        user_id:user.id, title:`${NATURA_PROPERTY} depozito alacağı`, amount:55000, expense_date:"2026-02-20",
        category:"depozito", payment_method:"Havale/EFT",
        note:`Açıklama: Kira depozitosu · ${RENT_MARKER} · Alacak/Varlık: Geri alınacak · Alıcı: Dilek Yığıcı · Kaynak: doğrulanmış banka ekranı`,
      }).select("id,title,amount,expense_date,category,payment_method,note").single();
      if (restoredDeposit) workingPayments.push(restoredDeposit);
    }
    if (!workingFixed.some((item:any) => /dilek/i.test(String(item.title || "")) && String(item.category || "").toLocaleLowerCase("tr-TR") === "kira")) {
      const { data: restoredPlan } = await supabase.from("fixed_expenses").insert({
        user_id:user.id, title:`${NATURA_PROPERTY} ev kirası · Dilek Yığıcı`, amount:55000, due_day:30, category:"kira",
        is_paid_this_month:true, last_paid_date:"2026-09-01",
      }).select().single();
      if (restoredPlan) workingFixed.push(restoredPlan);
    }

    // Kullanıcının banka ekranıyla doğruladığı Dilek Yığıcı kira geçmişi.
    // Yalnızca kesin tarih+tutar eşleşmeleri işlenir; görünmeyen aylar varsayılmaz.
    for (const payment of workingPayments) {
      const date = String(payment.expense_date || "").slice(0, 10);
      const expected = confirmedRentPayments[date];
      const isDilek = /dilek/i.test(`${payment.title || ""} ${payment.note || ""}`);
      const isFebruarySplit = date === "2026-02-20" && Number(payment.amount || 0) === 55000 && ["kira","depozito"].includes(String(payment.category || "").toLocaleLowerCase("tr-TR"));
      if (!isDilek || (!isFebruarySplit && Number(payment.amount || 0) !== expected)) continue;
      if (date === "2026-02-20" && expected === 110000 && String(payment.category || "").toLocaleLowerCase("tr-TR") !== "depozito") {
        const rentNote = `Açıklama: Şubat 2026 peşin kira · ${RENT_MARKER} · Alıcı: Dilek Yığıcı · Durum: ödendi`;
        await supabase.from("expenses").update({ amount:55000, category:"kira", note:rentNote }).eq("id", payment.id).eq("user_id", user.id);
        payment.amount = 55000; payment.category = "kira"; payment.note = rentNote;
        const existingDeposit = workingPayments.find((item:any) => String(item.expense_date).slice(0,10) === date && Number(item.amount) === 55000 && String(item.category).toLocaleLowerCase("tr-TR") === "depozito");
        if (!existingDeposit) {
          const { data: deposit } = await supabase.from("expenses").insert({
            user_id:user.id, title:`${NATURA_PROPERTY} depozito alacağı`, amount:55000, expense_date:date,
            category:"depozito", payment_method:payment.payment_method || "Havale/EFT",
            note:`Açıklama: Kira depozitosu · ${RENT_MARKER} · Alacak/Varlık: Geri alınacak · Alıcı: Dilek Yığıcı`,
          }).select("id,title,amount,expense_date,category,payment_method,note").single();
          if (deposit) workingPayments.push(deposit);
        }
      } else if (String(payment.category || "").toLocaleLowerCase("tr-TR") !== "depozito") {
        const nextNote = `Açıklama: ${date.slice(0,7)} dönem kirası · ${RENT_MARKER} · Alıcı: Dilek Yığıcı · Durum: ödendi`;
        if (String(payment.category).toLocaleLowerCase("tr-TR") !== "kira" || !String(payment.note || "").includes(RENT_MARKER)) {
          await supabase.from("expenses").update({ category:"kira", note:nextNote }).eq("id", payment.id).eq("user_id", user.id);
          payment.category = "kira"; payment.note = nextNote;
        }
      }
    }

    // Natura D-7 için daha önce bildirilen su/elektrik aboneliklerini taşınmaza bağla.
    for (const payment of workingPayments) {
      const text = `${payment.title || ""} ${payment.note || ""}`;
      const belongsToNatura = /1025145712|3161075|yuvaköy|yuva köyü|602\s*\/\s*d\s*\/\s*7/i.test(text);
      const category = String(payment.category || "").toLocaleLowerCase("tr-TR");
      if (!belongsToNatura || !["aidat","su","elektrik"].includes(category) || String(payment.note || "").includes(RENT_MARKER)) continue;
      const nextNote = [String(payment.note || "").trim(), RENT_MARKER].filter(Boolean).join(" · ");
      await supabase.from("expenses").update({ note:nextNote }).eq("id", payment.id).eq("user_id", user.id);
      payment.note = nextNote;
    }
    const reconciled = await Promise.all(workingFixed.map(async (item: any) => {
      const account = billingAccountNumber(item.title);
      if (!account) return item;
      const matchedPayments = workingPayments.filter((expense: any) => {
        const expenseTitle = String(expense.title || "");
        const reference = expenseTitle.replace(/\D/g, "").replace(/^0+/, "");
        return reference.includes(account);
      });
      if (!matchedPayments.length) return item;
      const paidAmount = matchedPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
      const lastPayment = matchedPayments.reduce((latest: any, payment: any) =>
        !latest || String(payment.expense_date) > String(latest.expense_date) ? payment : latest, null);
      const next = { ...item, amount:paidAmount, is_paid_this_month:true, last_paid_date:lastPayment.expense_date };
      if (isPaidThisMonth(item) && Number(item.amount || 0) === next.amount && item.last_paid_date === next.last_paid_date) return next;
      await supabase.from("fixed_expenses").update({ amount:next.amount, is_paid_this_month:true, last_paid_date:next.last_paid_date })
        .eq("id", item.id).eq("user_id", user.id);
      return next;
    }));
    setItems(reconciled);
    const billCategories = new Set(["elektrik", "su", "doğalgaz", "internet", "telefon", "abonelik", "sigorta", "aidat", "kira", "depozito"]);
    setPaymentHistory(workingPayments.filter((payment: any) =>
      billCategories.has(String(payment.category || "").toLocaleLowerCase("tr-TR")) ||
      /aski|enerjisa|fatura|abonelik|elektrik|doğalgaz|internet/i.test(String(payment.title || ""))
    ));
    setRentalIncome((incomes || []).filter((income:any) => /kira|daire|kiracı|taşınmaz/i.test(`${income.title || ""} ${income.note || ""}`)));
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ekle") === "1") setAdding(true);
      if (params.get("tur") === "kira") {
        setView("kiralar");
        setForm(current => ({ ...current, category:"kira" }));
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save() {
    const amount = Number(form.amount);
    const dueDay = Number(form.due_day);
    if (!form.title.trim()) { alert("Başlık gir."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { alert("Geçerli bir aylık tutar gir."); return; }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) { alert("Ödeme günü 1 ile 31 arasında olmalı."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("fixed_expenses").insert({ user_id:user.id, title:form.title.trim(), amount, due_day:dueDay, category:form.category });
    if (error) { alert("Sabit gider kaydedilemedi: " + error.message); return; }
    setForm({ title:"", amount:"", due_day:"", category:"kira" });
    setAdding(false); load();
  }

  async function togglePaid(item: any) {
    if (savingId) return;
    const nowPaid = !isPaidThisMonth(item);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingId(item.id);
    const note = `Aylık sabit gider · fixed:${item.id}:${currentMonth()}`;
    try {
      if (nowPaid) {
        const { data: existing, error: existingError } = await supabase.from("expenses").select("id")
          .eq("user_id", user.id).eq("note", note).limit(1);
        if (existingError) throw existingError;
        let createdId = existing?.[0]?.id as string | undefined;
        if (!createdId) {
          const { data: created, error: createError } = await supabase.from("expenses").insert({
            user_id:user.id, title:item.title, amount:Number(item.amount||0), expense_date:today(),
            category:item.category, payment_method:"Sabit Gider", note,
          }).select("id").single();
          if (createError || !created) throw createError || new Error("Gider kaydı oluşturulamadı.");
          createdId = created.id;
        }
        const { data: updated, error: updateError } = await supabase.from("fixed_expenses")
          .update({ is_paid_this_month:true, last_paid_date:today() })
          .eq("id",item.id).eq("user_id", user.id).select("id").maybeSingle();
        if (updateError || !updated) {
          if (!existing?.length && createdId) await supabase.from("expenses").delete().eq("id", createdId).eq("user_id", user.id);
          throw updateError || new Error("Ödeme durumu güncellenemedi.");
        }
      } else {
        const { error: updateError } = await supabase.from("fixed_expenses")
          .update({ is_paid_this_month:false, last_paid_date:null })
          .eq("id",item.id).eq("user_id", user.id);
        if (updateError) throw updateError;
        const { error: deleteError } = await supabase.from("expenses").delete()
          .eq("user_id", user.id).eq("note", note);
        if (deleteError) {
          await supabase.from("fixed_expenses").update({ is_paid_this_month:true, last_paid_date:today() }).eq("id",item.id).eq("user_id", user.id);
          throw deleteError;
        }
      }
      await load();
    } catch (error) {
      alert(error instanceof Error ? `İşlem tamamlanamadı: ${error.message}` : "İşlem tamamlanamadı.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Silinsin mi?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("fixed_expenses").delete().eq("id",id).eq("user_id",user.id);
    if (error) { alert("Sabit gider silinemedi: " + error.message); return; }
    load();
  }

  const isRent = (item: any) => {
    const category = String(item.category || "").toLocaleLowerCase("tr-TR");
    const text = `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("tr-TR");
    return category === "kira" || category === "depozito" || /\bkira\b|depozito/.test(text);
  };
  const visibleItems = items.filter(item => view === "kiralar" ? isRent(item) : !isRent(item));
  const visibleHistory = paymentHistory.filter(item => {
    const matchesView = view === "kiralar" ? isRent(item) : !isRent(item);
    return matchesView && (view === "kiralar" || String(item.expense_date || "").slice(0, 7) === currentMonth());
  });
  const rentHistory = paymentHistory.filter(item => String(item.category || "").toLocaleLowerCase("tr-TR") === "kira" && /dilek/i.test(`${item.title || ""} ${item.note || ""}`) && !!confirmedRentPayments[String(item.expense_date || "").slice(0,10)]);
  const depositHistory = paymentHistory.filter(item => String(item.category || "").toLocaleLowerCase("tr-TR") === "depozito" && (String(item.expense_date || "").slice(0,10) === "2026-02-20" || String(item.note || "").includes(RENT_MARKER)));
  const depositReceivable = depositHistory.reduce((t,i)=>t+Number(i.amount||0),0);
  const propertyBills = paymentHistory.filter(item => String(item.note || "").includes(RENT_MARKER) && ["aidat","su","elektrik"].includes(String(item.category || "").toLocaleLowerCase("tr-TR")));
  const propertyBillTotal = propertyBills.reduce((t,i)=>t+Number(i.amount||0),0);
  const rentalIncomeTotal = rentalIncome.reduce((t,i)=>t+Number(i.amount||0),0);
  const totalMonthly  = visibleItems.filter(i=>String(i.category || "").toLocaleLowerCase("tr-TR") !== "depozito").reduce((t,i)=>t+Number(i.amount||0),0);
  const totalPaid     = visibleItems.filter(isPaidThisMonth).reduce((t,i)=>t+Number(i.amount||0),0);
  const totalUnpaid   = totalMonthly - totalPaid;
  const paidCount     = visibleItems.filter(isPaidThisMonth).length;
  const today_day     = Number(dateKey().slice(-2));
  const overdueCount = visibleItems.filter(item => !isPaidThisMonth(item) && Number(item.due_day || 0) < today_day).length;
  const upcomingCount = visibleItems.filter(item => {
    const due = Number(item.due_day || 0);
    return !isPaidThisMonth(item) && due >= today_day && due - today_day <= 3;
  }).length;

  const cat = (v: string) => CATEGORIES.find(c=>c.value===v) || CATEGORIES[CATEGORIES.length-1];
  return (
    <main className="v-enter min-h-screen w-full min-w-0 overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader
        overline="Valkea Finans"
        title={view === "kiralar" ? "Daireler ve Kiralar" : "Faturalar ve Ödemeler"}
        subtitle={view === "kiralar" ? "Her dairenin gelirini, giderini ve depozitosunu ayrı izle" : "Bu ay ne ödendi, ne kaldı tek ekranda gör"}
      />
      <FinanceSections />

      <nav className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5" aria-label="Ödeme türü">
        <Link href="/sabit-giderler" onClick={()=>setView("faturalar")} className={`v-press rounded-xl px-3 py-2.5 text-center text-xs font-extrabold ${view === "faturalar" ? "bg-white text-ink shadow-sm" : "text-sub"}`}>
          Faturalar
        </Link>
        <Link href="/sabit-giderler?tur=kira" onClick={()=>setView("kiralar")} className={`v-press rounded-xl px-3 py-2.5 text-center text-xs font-extrabold ${view === "kiralar" ? "bg-ink text-white shadow-sm" : "text-sub"}`}>
          Kiralar
        </Link>
      </nav>

      {view === "kiralar" && (
        <section className="v-card p-4 mb-4 border border-[rgba(45,163,199,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="v-overline text-teal-deep">Oturduğum daire</p><h2 className="mt-1 font-extrabold tracking-tight">{NATURA_PROPERTY}</h2><p className="mt-1 text-[11px] font-semibold text-mute">Ev sahibi / alıcı: Dilek Yığıcı</p></div>
            <span className="v-chip v-chip-amber">Gider</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-canvas p-3"><p className="v-overline">Doğrulanan kira</p><p className="v-num mt-1 font-extrabold text-rose">{money(rentHistory.reduce((t,i)=>t+Number(i.amount||0),0))}</p><p className="mt-1 text-[10px] font-semibold text-mute">{rentHistory.length} banka hareketi</p></div>
            <div className="rounded-2xl bg-[#e8f7f1] p-3"><p className="v-overline text-[#08745b]">Depozito alacağım</p><p className="v-num mt-1 font-extrabold text-mint">{money(depositReceivable)}</p><p className="mt-1 text-[10px] font-semibold text-[#08745b]">Gider değil, geri alınacak varlık</p></div>
            <div className="rounded-2xl bg-canvas p-3"><p className="v-overline">Aidat · su · elektrik</p><p className="v-num mt-1 font-extrabold">{money(propertyBillTotal)}</p><p className="mt-1 text-[10px] font-semibold text-mute">Daireye bağlanan faturalar</p></div>
            <div className="rounded-2xl bg-canvas p-3"><p className="v-overline">Bu dairenin net maliyeti</p><p className="v-num mt-1 font-extrabold text-rose">{money(rentHistory.reduce((t,i)=>t+Number(i.amount||0),0) + propertyBillTotal)}</p><p className="mt-1 text-[10px] font-semibold text-mute">Depozito hariç</p></div>
          </div>
        </section>
      )}

      {view === "kiralar" && (
        <section className="v-card p-4 mb-4">
          <div className="flex items-start justify-between gap-3"><div><p className="v-overline text-mint">Kiraya verdiğim daire</p><h2 className="mt-1 font-extrabold tracking-tight">Kira geliri</h2><p className="mt-1 text-[11px] font-semibold text-mute">Kiracıdan gelen ödeme ve o daireye ait giderler burada eşleşecek</p></div><span className="v-chip v-chip-mint">Gelir</span></div>
          <div className="mt-3 rounded-2xl bg-[#e8f7f1] p-3.5"><p className="v-overline text-[#08745b]">Bulunan kira geliri</p><p className="v-num mt-1 text-xl font-extrabold text-mint">{money(rentalIncomeTotal)}</p><p className="mt-1 text-[10px] font-semibold text-[#08745b]">{rentalIncome.length ? `${rentalIncome.length} gelir kaydı` : "Henüz hangi gelir olduğu belirtilmedi"}</p></div>
        </section>
      )}

      {/* Özet hero */}
      <section className="v-hero p-5 mb-4">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="v-overline !text-white/50">{view === "kiralar" ? "Bu ay planlanan kira" : "Bu ay ödenecek toplam"}</p>
            {overdueCount > 0 ? <span className="v-chip bg-rose-400/15 text-rose-200 border border-rose-300/15">{overdueCount} gecikmiş</span> : upcomingCount > 0 ? <span className="v-chip bg-amber-300/10 text-amber-200 border border-amber-200/15">{upcomingCount} ödeme yaklaşıyor</span> : null}
          </div>
          <p className="v-num text-[34px] font-extrabold leading-none text-rose-300 mb-4">{money(totalMonthly)}</p>
          <div className="flex gap-6">
            <div>
              <p className="v-overline !text-white/40">Ödendi</p>
              <p className="v-num font-extrabold text-emerald-300 text-sm mt-0.5">{money(totalPaid)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Kalan</p>
              <p className="v-num font-extrabold text-amber-300 text-sm mt-0.5">{money(totalUnpaid)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">{view === "kiralar" ? "Ödenen kira" : "Ödenen fatura"}</p>
              <p className="v-num font-extrabold text-emerald-300 text-sm mt-0.5">{paidCount} / {visibleItems.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* İlerleme */}
      {visibleItems.length > 0 && (
        <div className="v-card p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-[13px] font-bold">Bu ay ödenme durumu</span>
            <span className="v-num text-[13px] font-extrabold text-teal-deep">%{Math.round((paidCount/visibleItems.length)*100)}</span>
          </div>
          <Progress pct={(paidCount/visibleItems.length)*100} />
        </div>
      )}

      {visibleHistory.length > 0 && (
        <section className="v-card min-w-0 overflow-hidden p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="v-overline">{view === "kiralar" ? "Kira ve depozito geçmişi" : "Bu ay ödenenler"}</p>
              <p className="text-[11px] text-mute font-semibold mt-1">{view === "kiralar" ? "Dönem dönem kira ödemeleri; depozito ayrı tutulur" : "Kart ve hesap hareketlerinden eşleşen faturalar"}</p>
            </div>
            <span className="v-chip v-chip-mint">{visibleHistory.length} kayıt</span>
          </div>
          <div className="min-w-0 grid gap-2.5">
            {visibleHistory.slice(0, view === "kiralar" ? 12 : 8).map((payment: any) => (
              <div key={payment.id} className="grid w-full min-w-0 max-w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl bg-canvas px-3.5 py-3">
                <div className="h-9 w-9 rounded-xl bg-[#e8f7f1] text-mint grid place-items-center shrink-0"><ICheck size={16} /></div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="line-clamp-2 break-words text-[12px] font-bold leading-snug">{payment.title}</p>
                  <p className="text-[10px] text-mute font-semibold mt-0.5">{String(payment.expense_date).split("-").reverse().join(".")} · {String(payment.category || "").toLocaleLowerCase("tr-TR") === "depozito" ? "Depozito" : "Ödendi"}</p>
                </div>
                <p className="v-num max-w-[84px] shrink-0 text-right text-[12px] font-extrabold text-mint">{money(Number(payment.amount || 0))}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ekle */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="v-overline">{view === "kiralar" ? `Kira planları (${visibleItems.length})` : `Faturalar (${visibleItems.length})`}</p>
          <p className="text-[11px] text-mute font-semibold mt-1">Önce geciken ve yaklaşan ödemeler gösterilir</p>
        </div>
        <button onClick={()=>setAdding(v=>!v)} className="v-btn v-btn-dark !py-2 !px-3.5 !text-xs">
          <IPlus size={14} /> Ekle
        </button>
      </div>

      {adding && (
        <div className="v-card p-4 mb-3">
          <div className="grid gap-2.5">
            <input placeholder="Başlık (örn: Elektrik faturası)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="v-input" />
            <div className="grid grid-cols-2 gap-2.5">
              <input placeholder="Aylık tutar (₺)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="v-input" />
              <input placeholder="Ödeme günü (1-31)" type="number" min="1" max="31" value={form.due_day} onChange={e=>setForm({...form,due_day:e.target.value})} className="v-input" />
            </div>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="v-input">
              {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex gap-2.5">
              <button onClick={save} className="v-btn v-btn-dark flex-1">Kaydet</button>
              <button onClick={()=>setAdding(false)} className="v-btn v-btn-soft flex-1">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="grid gap-3 v-stagger">
        {[...visibleItems].sort((a, b) => {
          const score = (item: any) => isPaidThisMonth(item) ? 3 : Number(item.due_day || 32) < today_day ? 0 : Number(item.due_day || 32) - today_day <= 3 ? 1 : 2;
          return score(a) - score(b) || Number(a.due_day || 32) - Number(b.due_day || 32);
        }).map(item => {
          const paid = isPaidThisMonth(item);
          const isOverdue = !paid && item.due_day && Number(item.due_day) < today_day;
          const isDue = !paid && item.due_day && Number(item.due_day) >= today_day && Number(item.due_day) - today_day <= 3;
          const c = cat(item.category);
          return (
            <article key={item.id} className={`v-card p-4 transition-all ${paid ? "opacity-75" : isOverdue ? "ring-1 ring-rose/20" : isDue ? "ring-1 ring-amber/25" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${
                  paid ? "bg-[#e8f7f1] text-mint" : isDue || isOverdue ? "bg-[#fdeef1] text-rose" : "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                }`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-bold text-sm truncate">{item.title}</p>
                    <p className={`v-num font-extrabold text-[15px] shrink-0 ${paid ? "text-mint" : "text-ink"}`}>{Number(item.amount || 0) > 0 ? money(Number(item.amount)) : paid ? "Borç yok" : "Tutar bekleniyor"}</p>
                  </div>
                  <div className="flex gap-1.5 items-center mt-0.5 flex-wrap">
                    <span className="text-[11px] text-mute font-medium">{c.label}</span>
                    {item.due_day ? (
                      <span className={`text-[11px] font-medium ${isDue || isOverdue ? "text-rose font-bold" : "text-mute"}`}>
                        · {isOverdue ? `${today_day - Number(item.due_day)} gün gecikti` : Number(item.due_day) === today_day ? "bugün ödenecek" : `ayın ${item.due_day}. günü`}
                      </span>
                    ) : <span className="text-[11px] text-mute font-medium">· Son ödeme tarihi bekleniyor</span>}
                    {isOverdue && <span className="v-chip v-chip-rose !text-[9px] !px-2 !py-0.5">GECİKMİŞ</span>}
                    {isDue && <span className="v-chip v-chip-amber !text-[9px] !px-2 !py-0.5">YAKLAŞIYOR</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button disabled={savingId === item.id} onClick={()=>togglePaid(item)} className={`v-btn flex-1 !py-2.5 !text-[13px] disabled:opacity-50 ${paid ? "v-btn-soft" : "v-btn-mint"}`}>
                  <ICheck size={15} /> {savingId === item.id ? "İşleniyor..." : paid && Number(item.amount || 0) === 0 ? "Bu dönem borç yok" : paid ? "Ödendi (geri al)" : "Ödendi İşaretle"}
                </button>
                <button onClick={()=>deleteItem(item.id)} className="v-btn v-btn-rose !py-2.5 !px-4 !text-[13px]">
                  <ITrash size={15} />
                </button>
              </div>
            </article>
          );
        })}
        {visibleItems.length===0 && !adding && (
          <EmptyState
            icon={<IReceipt size={24} />}
            title={view === "kiralar" ? "Henüz kira planı eklenmedi" : "Henüz fatura eklenmedi"}
            hint={view === "kiralar" ? "Aylık kira tutarını ve ödeme gününü ekle; geçmiş ödemeler ayrı görünür." : "Aidat, elektrik, su ve internet gibi aylık ödemelerini ekle."}
          />
        )}
      </div>
    </main>
  );
}
