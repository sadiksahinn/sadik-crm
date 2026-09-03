"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { NetTrend, Donut } from "@/components/Charts";
import { PageHeader, money } from "@/components/ui";
import { monthInfo } from "@/utils/date";
import { profitLossExpenses } from "@/utils/finance";
import Link from "next/link";
import { ISparkle, IChevronRight } from "@/components/Icons";

const supabase = createClient();

const CAT_COLORS = ["#2da3c7", "#e8a33d", "#8b5cf6", "#f43f5e", "#059669", "#f59e0b", "#64748b"];

// Son 6 ayın etiketleri ve anahtarları
function last6Months() {
  return Array.from({ length: 6 }, (_, index) => {
    const month = monthInfo(index - 5);
    return { key: month.key, label: month.shortLabel };
  });
}

function monthRange(offset: number) {
  const month = monthInfo(offset);
  return { start: month.start, end: month.end, label: month.label };
}

type MonthData = { label: string; income: number; expense: number; net: number };

function noteValue(note: string, label: string) {
  const part = String(note || "").split(" · ").find((value) => value.startsWith(`${label}: `));
  return part ? part.slice(label.length + 2).trim() : "";
}

export default function RaporlarPage() {
  const [selectedTab, setSelectedTab] = useState<"aylik" | "musteriler" | "kategoriler" | "baglamlar">("aylik");
  const [months, setMonths] = useState<MonthData[]>([]);
  const [currentIncome, setCurrentIncome] = useState<any[]>([]);
  const [currentExpenses, setCurrentExpenses] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<{ name: string; paid: number; pending: number }[]>([]);
  const [trend6, setTrend6] = useState<{ label: string; net: number }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { window.location.href = "/login"; return; }

      // Son 3 ay
      const ranges = [monthRange(-2), monthRange(-1), monthRange(0)];

      const monthResults: MonthData[] = await Promise.all(
        ranges.map(async (r) => {
          const [{ data: inc }, { data: exp }] = await Promise.all([
            supabase.from("income").select("amount").eq("user_id", user.id).gte("income_date", r.start).lte("income_date", r.end),
            supabase.from("expenses").select("amount,note").eq("user_id", user.id).gte("expense_date", r.start).lte("expense_date", r.end),
          ]);
          const income = (inc || []).reduce((t, x) => t + Number(x.amount || 0), 0);
          const expense = profitLossExpenses(exp).reduce((t, x) => t + Number(x.amount || 0), 0);
          return { label: r.label, income, expense, net: income - expense };
        })
      );
      setMonths(monthResults);

      // 6 aylık net trend — tek seferde çekip aya göre topla
      const months6 = last6Months();
      const sixStart = months6[0].key + "-01";
      const [{ data: inc6 }, { data: exp6 }] = await Promise.all([
        supabase.from("income").select("amount,income_date").eq("user_id", user.id).gte("income_date", sixStart),
        supabase.from("expenses").select("amount,expense_date,note").eq("user_id", user.id).gte("expense_date", sixStart),
      ]);
      const incByM: Record<string, number> = {};
      const expByM: Record<string, number> = {};
      (inc6 || []).forEach((r: any) => { const k = String(r.income_date).slice(0, 7); incByM[k] = (incByM[k] || 0) + Number(r.amount || 0); });
      profitLossExpenses(exp6).forEach((r: any) => { const k = String(r.expense_date).slice(0, 7); expByM[k] = (expByM[k] || 0) + Number(r.amount || 0); });
      setTrend6(months6.map((m) => ({ label: m.label, net: (incByM[m.key] || 0) - (expByM[m.key] || 0) })));

      const cur = monthRange(0);

      const [
        { data: incData },
        { data: expData },
        { data: payData },
        { data: customers },
        { data: payments },
      ] = await Promise.all([
        supabase.from("income").select("*").eq("user_id", user.id).gte("income_date", cur.start).lte("income_date", cur.end).order("income_date", { ascending: false }),
        supabase.from("expenses").select("*").eq("user_id", user.id).gte("expense_date", cur.start).lte("expense_date", cur.end).order("expense_date", { ascending: false }),
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").order("due_date", { ascending: true }),
        supabase.from("customers").select("id, name, brand_name").eq("user_id", user.id),
        supabase.from("payment_tracking").select("*").eq("user_id", user.id),
      ]);

      setCurrentIncome(incData || []);
      setCurrentExpenses(profitLossExpenses(expData));
      setPendingPayments(payData || []);

      // Müşteri bazlı kâr
      if (customers && payments) {
        const cd = customers.map((c: any) => {
          const cPay = payments.filter((p: any) => p.customer_id === c.id);
          const paid = cPay.filter((p: any) => p.status === "ödendi").reduce((t, p: any) => t + Number(p.amount || 0), 0);
          const pending = cPay.filter((p: any) => p.status === "bekliyor").reduce((t, p: any) => t + Number(p.amount || 0), 0);
          return { name: c.brand_name || c.name, paid, pending };
        }).filter((c) => c.paid > 0 || c.pending > 0).sort((a, b) => b.paid - a.paid);
        setCustomerData(cd);
      }
    }
    load();
  }, []);

  const cur = months[2] || { label: "", income: 0, expense: 0, net: 0 };
  const totalPending = pendingPayments.reduce((t, p) => t + Number(p.amount || 0), 0);

  const categoryBreakdown = currentExpenses
    .reduce((acc: any[], item: any) => {
      const key = item.category || "Genel";
      const found = acc.find((x) => x.category === key);
      if (found) found.total += Number(item.amount || 0);
      else acc.push({ category: key, total: Number(item.amount || 0) });
      return acc;
    }, [])
    .sort((a, b) => b.total - a.total);

  const contextBreakdown = useMemo(() => currentExpenses.reduce((acc: { context: string; total: number; count: number }[], item: any) => {
    const key = noteValue(item.note, "Bağlam") || "Belirtilmedi";
    const found = acc.find((value) => value.context === key);
    if (found) { found.total += Number(item.amount || 0); found.count += 1; }
    else acc.push({ context: key, total: Number(item.amount || 0), count: 1 });
    return acc;
  }, []).sort((a, b) => b.total - a.total), [currentExpenses]);

  const projectBreakdown = useMemo(() => {
    const projects = new Map<string, { name: string; income: number; expense: number; net: number }>();
    const add = (name: string, type: "income" | "expense", amount: number) => {
      if (!name) return;
      const current = projects.get(name) || { name, income: 0, expense: 0, net: 0 };
      current[type] += amount;
      current.net = current.income - current.expense;
      projects.set(name, current);
    };
    currentIncome.forEach((item) => add(noteValue(item.note, "İş/Proje"), "income", Number(item.amount || 0)));
    currentExpenses.forEach((item) => add(noteValue(item.note, "İş/Proje"), "expense", Number(item.amount || 0)));
    return Array.from(projects.values()).sort((a, b) => b.income + b.expense - (a.income + a.expense));
  }, [currentExpenses, currentIncome]);

  const savingsRate = cur.income > 0 ? Math.round((cur.net / cur.income) * 100) : 0;
  const profitableProject = projectBreakdown.filter((item) => item.income > 0).sort((a, b) => b.net - a.net)[0];
  const lossProject = projectBreakdown.filter((item) => item.net < 0).sort((a, b) => a.net - b.net)[0];

  const insights = useMemo(() => {
    const result: string[] = [];
    const previousExpense = months[1]?.expense || 0;
    if (previousExpense > 0 && cur.expense > 0) {
      const change = Math.round(((cur.expense - previousExpense) / previousExpense) * 100);
      if (Math.abs(change) >= 5) result.push(`Giderlerin geçen aya göre %${Math.abs(change)} ${change > 0 ? "arttı" : "azaldı"}.`);
    }
    if (categoryBreakdown[0]) result.push(`Bu ay en yüksek gider kategorin ${categoryBreakdown[0].category}: ${money(categoryBreakdown[0].total)}.`);
    if (contextBreakdown[0] && contextBreakdown[0].context !== "Belirtilmedi") result.push(`${contextBreakdown[0].context} bağlamındaki harcamaların ${money(contextBreakdown[0].total)}.`);
    const unexplained = currentExpenses.filter((item) => !noteValue(item.note, "Açıklama")).length;
    if (unexplained > 0) result.push(`${unexplained} harcama hâlâ açıklama bekliyor; rapor doğruluğu için tamamlamalısın.`);
    if (totalPending > 0) result.push(`${money(totalPending)} bekleyen tahsilatın var.`);
    return result.slice(0, 4);
  }, [categoryBreakdown, contextBreakdown, cur.expense, currentExpenses, months, totalPending]);

  const maxBar = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Rapor" title="Raporlar" subtitle="Son 3 ay analiz" />

      {/* Net durum hero */}
      <section className="v-hero p-5 mb-4">
        <div className="relative z-10">
          <p className="v-overline !text-white/50 mb-1">Bu ay net durum</p>
          <h2 className={`v-num text-[34px] font-extrabold leading-none ${cur.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(cur.net)}</h2>
          <p className="text-white/55 text-xs font-medium mt-2">
            Tahsilatlar kapanırsa → <span className="v-num font-bold text-white/85">{money(cur.net + totalPending)}</span>
          </p>
        </div>
      </section>

      <section className="v-card p-5 mb-4 border border-[rgba(45,163,199,0.22)]">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2da3c7] to-[#e8a33d] text-white grid place-items-center shrink-0"><ISparkle size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="v-overline text-teal-deep">Asistan yorumu</p>
            <h2 className="mt-1 font-extrabold tracking-tight">Bu ay dikkat etmen gerekenler</h2>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {(insights.length ? insights : ["Yeterli veri oluştuğunda gider değişimlerini ve fırsatları burada göstereceğim."]).map((insight) => (
            <p key={insight} className="rounded-2xl bg-canvas px-3.5 py-3 text-xs font-semibold leading-5 text-sub">{insight}</p>
          ))}
        </div>
      </section>

      <section className="v-card p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="v-overline">Karar merkezi</p><h2 className="mt-1 font-extrabold tracking-tight">Kazanç mı, kayıp mı?</h2></div>
          <span className={`v-chip ${cur.net >= 0 ? "v-chip-mint" : "v-chip-rose"}`}>{cur.net >= 0 ? "Artıdasın" : "Eksidesin"}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-canvas p-3.5"><p className="v-overline">Kazanç oranı</p><p className={`v-num mt-1 text-xl font-extrabold ${savingsRate >= 0 ? "text-mint" : "text-rose"}`}>%{savingsRate}</p><p className="mt-1 text-[10px] font-semibold text-mute">Gelirden gider çıktıktan sonra</p></div>
          <div className="rounded-2xl bg-canvas p-3.5"><p className="v-overline">Her ₺100 gelirden</p><p className={`v-num mt-1 text-xl font-extrabold ${cur.net >= 0 ? "text-mint" : "text-rose"}`}>{money(cur.income > 0 ? (cur.net / cur.income) * 100 : 0)}</p><p className="mt-1 text-[10px] font-semibold text-mute">Sende kalan net tutar</p></div>
        </div>
        <div className="mt-3 grid gap-2">
          {profitableProject && <p className="rounded-2xl bg-[#e8f7f1] px-3.5 py-3 text-xs font-bold leading-5 text-[#08745b]">Tekrar değerlendir: {profitableProject.name} bu ay {money(profitableProject.net)} net kazandırdı.</p>}
          {lossProject && <p className="rounded-2xl bg-[#fdeef1] px-3.5 py-3 text-xs font-bold leading-5 text-rose">Dikkat: {lossProject.name} için gelirden {money(Math.abs(lossProject.net))} daha fazla harcama görünüyor.</p>}
          {!projectBreakdown.length && <p className="rounded-2xl bg-[rgba(232,163,61,0.12)] px-3.5 py-3 text-xs font-bold leading-5 text-[#8a5a10]">Harcama ve gelirlerde “İş / proje” alanını kullandıkça hangi işin gerçekten kazandırdığını burada göstereceğim.</p>}
        </div>
      </section>

      {projectBreakdown.length > 0 && (
        <section className="v-card p-5 mb-4">
          <p className="font-extrabold tracking-tight">İş ve proje kârlılığı</p>
          <p className="mt-1 mb-3 text-xs font-medium text-mute">Aynı proje adıyla bağlanan gelir ve giderler</p>
          {projectBreakdown.map((item) => (
            <div key={item.name} className="border-b border-line py-3 last:border-0">
              <div className="flex items-start justify-between gap-3"><p className="min-w-0 font-bold text-sm break-words">{item.name}</p><p className={`v-num shrink-0 font-extrabold text-sm ${item.net >= 0 ? "text-mint" : "text-rose"}`}>{money(item.net)}</p></div>
              <p className="mt-1 text-[11px] font-semibold text-mute">Gelir {money(item.income)} · Gider {money(item.expense)}</p>
            </div>
          ))}
        </section>
      )}

      {/* Net trend — son 6 ay */}
      <section className="v-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-extrabold tracking-tight">Net Trend</p>
          <span className="v-overline">Son 6 ay</span>
        </div>
        {trend6.length > 0
          ? <NetTrend points={trend6} height={160} />
          : <div className="skeleton h-[160px]" />}
      </section>

      {/* 3 aylık bar grafik */}
      <section className="v-card p-5 mb-4">
        <p className="font-extrabold tracking-tight mb-4">Son 3 Ay</p>
        <div className="flex items-end gap-3 h-32 mb-3">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1.5 items-end h-28">
                <div
                  className="flex-1 rounded-t-lg"
                  style={{ background: "#059669", height: `${(m.income / maxBar) * 100}%`, minHeight: m.income > 0 ? "8px" : "0", opacity: 0.85 }}
                />
                <div
                  className="flex-1 rounded-t-lg"
                  style={{ background: "#e11d48", height: `${(m.expense / maxBar) * 100}%`, minHeight: m.expense > 0 ? "8px" : "0", opacity: 0.75 }}
                />
              </div>
              <p className="text-[10px] text-mute font-bold text-center leading-tight">{m.label.split(" ")[0]}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs font-semibold text-sub">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} /> Gelir</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#e11d48" }} /> Gider</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-line">
          {months.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-mute font-semibold">{m.label}</p>
              <p className="v-num text-xs font-extrabold text-mint">{money(m.income)}</p>
              <p className="v-num text-xs font-semibold text-rose">{money(m.expense)}</p>
              <p className={`v-num text-xs font-extrabold ${m.net >= 0 ? "text-ink" : "text-rose"}`}>{money(m.net)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="v-seg mb-4">
        {(["aylik", "kategoriler", "baglamlar", "musteriler"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`v-seg-btn ${selectedTab === tab ? "active" : ""}`}
          >
            {tab === "aylik" ? "Bu Ay" : tab === "musteriler" ? "Müşteri" : tab === "baglamlar" ? "Bağlam" : "Kategori"}
          </button>
        ))}
      </div>

      {/* Bu Ay */}
      {selectedTab === "aylik" && (
        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="v-card p-4">
              <p className="v-overline">Gelir</p>
              <p className="v-num text-[20px] font-extrabold text-mint mt-0.5">{money(cur.income)}</p>
              <p className="text-mute text-xs font-medium">{currentIncome.length} kayıt</p>
            </div>
            <div className="v-card p-4">
              <p className="v-overline">Gider</p>
              <p className="v-num text-[20px] font-extrabold text-rose mt-0.5">{money(cur.expense)}</p>
              <p className="text-mute text-xs font-medium">{currentExpenses.length} kayıt</p>
            </div>
          </div>
          <div className="v-card p-4">
            <p className="v-overline mb-1">Bekleyen tahsilat</p>
            <p className="v-num text-[20px] font-extrabold text-[#a16a14]">{money(totalPending)}</p>
            <p className="text-mute text-xs font-medium">{pendingPayments.length} kayıt</p>
          </div>
          <div className="v-card p-4">
            <p className="font-extrabold tracking-tight mb-3">Son Gelirler</p>
            {currentIncome.slice(0, 5).map((i) => (
              <div key={i.id} className="flex justify-between py-2 border-b border-line last:border-0 text-sm">
                <span className="text-sub font-medium truncate pr-2">{i.title}</span>
                <span className="v-num font-extrabold text-mint whitespace-nowrap">{money(Number(i.amount))}</span>
              </div>
            ))}
            {currentIncome.length === 0 && <p className="text-mute text-sm">Bu ay gelir kaydı yok.</p>}
          </div>
        </section>
      )}

      {selectedTab === "baglamlar" && (
        <section className="v-card p-5">
          <p className="font-extrabold tracking-tight">Harcama Bağlamları</p>
          <p className="mt-1 mb-3 text-xs font-medium text-mute">Tatil, iş, ev ve kişisel yaşam harcamaların</p>
          {contextBreakdown.length === 0 && <p className="text-mute text-sm">Bu ay bağlam verisi yok.</p>}
          {contextBreakdown.map((item, index) => {
            const pct = Math.round((item.total / (cur.expense || 1)) * 100);
            return (
              <div key={item.context} className="py-3 border-b border-line last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="font-bold text-sm">{item.context}</p><p className="text-xs font-medium text-mute">{item.count} hareket · %{pct}</p></div>
                  <p className="v-num shrink-0 font-extrabold text-rose text-sm">{money(item.total)}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#e8ecf4] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: CAT_COLORS[index % CAT_COLORS.length] }} /></div>
              </div>
            );
          })}
          <Link href="/harcamalar" className="v-btn v-btn-soft w-full mt-4 !py-3 !text-xs">Hareketleri incele <IChevronRight size={14} /></Link>
        </section>
      )}

      {/* Müşteriler */}
      {selectedTab === "musteriler" && (
        <section className="v-card p-5">
          <p className="font-extrabold tracking-tight mb-3">Müşteri Bazlı Tahsilat</p>
          {customerData.length === 0 && <p className="text-mute text-sm">Henüz müşteri bazlı veri yok.</p>}
          {customerData.map((c, i) => (
            <div key={i} className="py-3 border-b border-line last:border-0">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-sm">{c.name}</span>
                <span className="v-num font-extrabold text-mint text-sm">{money(c.paid)}</span>
              </div>
              {c.pending > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-mute font-medium">Bekleyen</span>
                  <span className="v-num text-rose font-bold">{money(c.pending)}</span>
                </div>
              )}
              <div className="mt-2 bg-[#e8ecf4] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ background: "#059669", width: `${Math.min((c.paid / (c.paid + c.pending || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Kategoriler */}
      {selectedTab === "kategoriler" && (
        <section className="v-card p-5">
          <p className="font-extrabold tracking-tight mb-3">Bu Ay Gider Kategorileri</p>
          {categoryBreakdown.length === 0 && <p className="text-mute text-sm">Bu ay gider kaydı yok.</p>}
          {categoryBreakdown.length > 0 && (
            <div className="flex items-center gap-4 mb-4">
              <Donut
                size={140}
                centerLabel="kategori"
                data={categoryBreakdown.map((c, i) => ({ label: c.category, value: c.total, color: CAT_COLORS[i % CAT_COLORS.length] }))}
              />
              <div className="flex-1 grid gap-1.5">
                {categoryBreakdown.slice(0, 6).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-sub font-semibold truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="v-num font-extrabold text-ink whitespace-nowrap ml-2">%{Math.round((c.total / cur.expense) * 100) || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {categoryBreakdown.map((c) => {
            const pct = Math.round((c.total / cur.expense) * 100) || 0;
            return (
              <div key={c.category} className="py-3 border-b border-line last:border-0">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-sm">{c.category}</span>
                  <span className="v-num font-extrabold text-rose text-sm">{money(c.total)}</span>
                </div>
                <div className="bg-[#e8ecf4] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ background: "#e11d48", opacity: 0.75, width: `${pct}%` }} />
                </div>
                <p className="text-xs text-mute font-medium mt-1">%{pct}</p>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
