"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FinanceSections from "@/components/FinanceSections";
import { EmptyState, money, PageHeader, Progress } from "@/components/ui";
import { IAlert, ICard, IChevronRight, IClock } from "@/components/Icons";
import { createClient } from "@/utils/supabase/client";
import { isCardExpense } from "@/utils/finance";
import { dateKey } from "@/utils/date";

const supabase = createClient();

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const [{data: cardData}, {data: expenses}] = await Promise.all([
        supabase.from("credit_cards").select("*").eq("user_id",user.id).order("payment_day",{ascending:true}),
        supabase.from("expenses").select("*").eq("user_id",user.id).order("expense_date",{ascending:false}).order("created_at",{ascending:false}),
      ]);
      setCards(cardData || []);
      setItems((expenses || []).filter(isCardExpense));
      setLoading(false);
    }
    load();
  }, []);

  const today = dateKey();
  const monthItems = useMemo(() => items.filter(item => String(item.expense_date).startsWith(today.slice(0,7))), [items, today]);
  const monthTotal = monthItems.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const todayDay = Number(today.slice(-2));
  const alerts = cards.filter(card => Number(card.current_balance||0)>0 && Number(card.payment_day||0)>0 && Number(card.payment_day)-todayDay<=5);

  return (
    <main className="v-enter min-h-screen w-full min-w-0 overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Kredi Kartları" subtitle="Kart borçları, limitler ve kart harcamaları" />
      <FinanceSections />
      {alerts.length>0 && <section className="mb-4 rounded-3xl border border-amber/25 bg-[rgba(232,163,61,0.12)] p-4">
        <div className="flex gap-3"><IAlert className="shrink-0 text-[#a16a14]" size={20}/><div><p className="text-sm font-extrabold">{alerts.length} kart ödemesi yaklaşıyor</p><p className="mt-1 text-xs font-semibold text-[#8b672c]">Son ödeme tarihlerini kaçırmaman için takip ediyorum.</p></div></div>
      </section>}
      <section className="v-hero p-5 mb-4"><p className="v-overline !text-white/50">Bu ay kart harcaması</p><p className="v-num mt-1 text-[32px] font-extrabold">{money(monthTotal)}</p><p className="mt-2 text-xs font-medium text-white/60">{monthItems.length} kart hareketi</p></section>
      <section className="grid gap-3 mb-5">
        {cards.map(card => { const usage=Number(card.credit_limit||0)>0?Math.min(100,Number(card.current_balance||0)/Number(card.credit_limit)*100):0; return <article key={card.id} className="v-card p-4">
          <div className="flex items-start gap-3"><div className="h-11 w-11 rounded-2xl bg-ink text-[#5fc4e4] grid place-items-center"><ICard size={19}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{card.card_name||`${card.bank_name} kart`}</p><p className="mt-0.5 text-[11px] font-semibold text-mute">{card.bank_name} · Son ödeme ayın {card.payment_day||"—"}. günü</p></div><p className="v-num shrink-0 text-sm font-extrabold text-rose">{money(Number(card.current_balance||0))}</p></div>
          <div className="mt-3"><Progress pct={usage}/><div className="mt-1.5 flex justify-between text-[10px] font-bold text-mute"><span>Limit kullanımı %{Math.round(usage)}</span><span>{money(Number(card.credit_limit||0))} limit</span></div></div>
        </article>})}
        {!loading&&cards.length===0&&<EmptyState icon={<ICard size={24}/>} title="Kart tanımlı değil" hint="Kart bilgilerini Kart Yönetimi bölümünden ekleyebilirsin."/>}
      </section>
      <Link href="/krediler" className="v-btn v-btn-dark mb-5 w-full">Kartları ve ödemeleri yönet <IChevronRight size={15}/></Link>
      <div className="mb-3 flex items-center justify-between"><p className="v-overline">Son kart hareketleri</p><span className="flex items-center gap-1 text-[10px] font-bold text-mute"><IClock size={12}/> yeni → eski</span></div>
      <section className="grid gap-2.5">{monthItems.slice(0,20).map(item=><article key={item.id} className="v-card min-w-0 overflow-hidden p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{item.title}</p><p className="mt-1 text-[11px] font-semibold text-mute">{item.expense_date} · {item.payment_method}</p></div><p className="v-num shrink-0 text-sm font-extrabold text-rose">-{money(Number(item.amount||0))}</p></article>)}</section>
    </main>
  );
}
