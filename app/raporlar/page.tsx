"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { NetTrend, Donut } from "@/components/Charts";
import { PageHeader, money } from "@/components/ui";

const supabase = createClient();

const CAT_COLORS = ["#2da3c7", "#e8a33d", "#8b5cf6", "#f43f5e", "#059669", "#f59e0b", "#64748b"];

// Son 6 ayın etiketleri ve anahtarları
function last6Months() {
  const arr: { key: string; label: string }[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push({ key: m.toISOString().slice(0, 7), label: m.toLocaleDateString("tr-TR", { month: "short" }) });
  }
  return arr;
}

function monthRange(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = d.toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  const label = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return { start, end, label };
}

type MonthData = { label: string; income: number; expense: number; net: number };

export default function RaporlarPage() {
  const [selectedTab, setSelectedTab] = useState<"aylik" | "musteriler" | "kategoriler">("aylik");
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
            supabase.from("expenses").select("amount").eq("user_id", user.id).gte("expense_date", r.start).lte("expense_date", r.end),
          ]);
          const income = (inc || []).reduce((t, x) => t + Number(x.amount || 0), 0);
          const expense = (exp || []).reduce((t, x) => t + Number(x.amount || 0), 0);
          return { label: r.label, income, expense, net: income - expense };
        })
      );
      setMonths(monthResults);

      // 6 aylık net trend — tek seferde çekip aya göre topla
      const months6 = last6Months();
      const sixStart = months6[0].key + "-01";
      const [{ data: inc6 }, { data: exp6 }] = await Promise.all([
        supabase.from("income").select("amount,income_date").eq("user_id", user.id).gte("income_date", sixStart),
        supabase.from("expenses").select("amount,expense_date").eq("user_id", user.id).gte("expense_date", sixStart),
      ]);
      const incByM: Record<string, number> = {};
      const expByM: Record<string, number> = {};
      (inc6 || []).forEach((r: any) => { const k = String(r.income_date).slice(0, 7); incByM[k] = (incByM[k] || 0) + Number(r.amount || 0); });
      (exp6 || []).forEach((r: any) => { const k = String(r.expense_date).slice(0, 7); expByM[k] = (expByM[k] || 0) + Number(r.amount || 0); });
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
      setCurrentExpenses(expData || []);
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
        {(["aylik", "musteriler", "kategoriler"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`v-seg-btn ${selectedTab === tab ? "active" : ""}`}
          >
            {tab === "aylik" ? "Bu Ay" : tab === "musteriler" ? "Müşteriler" : "Kategoriler"}
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
