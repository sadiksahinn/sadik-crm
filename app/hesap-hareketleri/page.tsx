"use client";

import { useEffect, useMemo, useState } from "react";
import FinanceSections from "@/components/FinanceSections";
import { EmptyState, money, PageHeader } from "@/components/ui";
import { IBank, ITrendDown } from "@/components/Icons";
import { createClient } from "@/utils/supabase/client";
import { isAccountMovement } from "@/utils/finance";
import { dateKey } from "@/utils/date";

const supabase = createClient();

export default function AccountMovementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("ay");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data } = await supabase.from("expenses").select("*").eq("user_id", user.id)
        .order("expense_date", { ascending:false }).order("created_at", { ascending:false });
      setItems((data || []).filter(isAccountMovement));
      setLoading(false);
    }
    load();
  }, []);

  const visible = useMemo(() => {
    const today = dateKey();
    const week = dateKey(new Date(Date.now() - 6 * 86_400_000));
    return items.filter(item => period === "tumu" || (period === "bugun" ? item.expense_date === today : period === "hafta" ? item.expense_date >= week : String(item.expense_date).startsWith(today.slice(0,7))));
  }, [items, period]);
  const total = visible.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <main className="v-enter min-h-screen w-full min-w-0 overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Hesap Hareketleri" subtitle="Havale, EFT ve hesaptan çıkan ödemeler" />
      <FinanceSections />
      <section className="v-hero p-5 mb-4">
        <p className="v-overline !text-white/50">Hesaptan çıkan toplam</p>
        <p className="v-num mt-1 text-[32px] font-extrabold">{money(total)}</p>
        <p className="mt-2 text-xs font-medium text-white/60">{visible.length} hesap hareketi · Günlük gider toplamına dahildir</p>
      </section>
      <div className="v-seg mb-4">
        {[["bugun","Bugün"],["hafta","7 gün"],["ay","Bu ay"],["tumu","Tümü"]].map(([value,label]) => <button key={value} onClick={()=>setPeriod(value)} className={`v-seg-btn ${period===value?"active":""}`}>{label}</button>)}
      </div>
      <section className="grid gap-2.5">
        {loading && [1,2,3].map(i=><div key={i} className="skeleton h-24" />)}
        {!loading && visible.length===0 && <EmptyState icon={<IBank size={24} />} title="Hesap hareketi bulunamadı" hint="Havale ve EFT kayıtları burada kartlardan ayrı gösterilir." />}
        {visible.map(item => <article key={item.id} className="v-card min-w-0 overflow-hidden p-4 flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#fdeef1] text-rose grid place-items-center"><ITrendDown size={18} /></div>
          <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold">{item.title}</h2><p className="mt-1 text-[11px] font-semibold text-mute">{item.expense_date} · {item.payment_method || "Hesap"}</p><p className="mt-1 truncate text-[11px] text-sub">{String(item.note || "").replace(/^Açıklama:\s*/i, "").split(" · ")[0]}</p></div>
          <p className="v-num shrink-0 text-sm font-extrabold text-rose">-{money(Number(item.amount || 0))}</p>
        </article>)}
      </section>
    </main>
  );
}
