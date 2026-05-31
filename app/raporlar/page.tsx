"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
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
    <main className="min-h-screen bg-[#F5F6FA] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#1E3A5F] text-xs font-black tracking-wide">VALKEA REPORT</p>
          <h1 className="text-3xl font-black">Raporlar</h1>
          <p className="text-slate-500">Son 3 ay analiz</p>
        </div>
        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
      </header>

      {/* Net durum */}
      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-4">
        <p className="text-[#1E3A5F] text-xs font-black">BU AY NET DURUM</p>
        <h2 className={`text-4xl font-black mt-1 ${cur.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{money(cur.net)}</h2>
        <p className="text-slate-400 text-sm mt-1">Tahsilatlar kapanırsa → {money(cur.net + totalPending)}</p>
      </section>

      {/* 3 aylık bar grafik */}
      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-4">
        <p className="font-black mb-4">Son 3 Ay</p>
        <div className="flex items-end gap-3 h-32 mb-3">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end h-28">
                <div
                  className="flex-1 bg-emerald-400 rounded-t-xl"
                  style={{ height: `${(m.income / maxBar) * 100}%`, minHeight: m.income > 0 ? "8px" : "0" }}
                />
                <div
                  className="flex-1 bg-red-400 rounded-t-xl"
                  style={{ height: `${(m.expense / maxBar) * 100}%`, minHeight: m.expense > 0 ? "8px" : "0" }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold text-center leading-tight">{m.label.split(" ")[0]}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded" /> Gelir</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded" /> Gider</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
          {months.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-slate-400">{m.label}</p>
              <p className="text-xs font-black text-emerald-600">{money(m.income)}</p>
              <p className="text-xs text-red-500">{money(m.expense)}</p>
              <p className={`text-xs font-black ${m.net >= 0 ? "text-slate-700" : "text-red-500"}`}>{money(m.net)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["aylik", "musteriler", "kategoriler"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-black transition-colors ${selectedTab === tab ? "bg-[#0B1437] text-white" : "bg-white text-slate-500 shadow-sm"}`}
          >
            {tab === "aylik" ? "Bu Ay" : tab === "musteriler" ? "Müşteriler" : "Kategoriler"}
          </button>
        ))}
      </div>

      {/* Bu Ay */}
      {selectedTab === "aylik" && (
        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[24px] p-4 shadow-sm">
              <p className="text-xs text-slate-500">Gelir</p>
              <p className="text-2xl font-black text-emerald-600">{money(cur.income)}</p>
              <p className="text-xs text-slate-400">{currentIncome.length} kayıt</p>
            </div>
            <div className="bg-white rounded-[24px] p-4 shadow-sm">
              <p className="text-xs text-slate-500">Gider</p>
              <p className="text-2xl font-black text-red-500">{money(cur.expense)}</p>
              <p className="text-xs text-slate-400">{currentExpenses.length} kayıt</p>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Bekleyen Tahsilat</p>
            <p className="text-2xl font-black text-amber-500">{money(totalPending)}</p>
            <p className="text-xs text-slate-400">{pendingPayments.length} kayıt</p>
          </div>
          <div className="bg-white rounded-[24px] p-4 shadow-sm">
            <p className="font-black mb-3">Son Gelirler</p>
            {currentIncome.slice(0, 5).map((i) => (
              <div key={i.id} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                <span className="text-slate-700 truncate pr-2">{i.title}</span>
                <span className="font-black text-emerald-600 whitespace-nowrap">{money(Number(i.amount))}</span>
              </div>
            ))}
            {currentIncome.length === 0 && <p className="text-slate-400 text-sm">Bu ay gelir kaydı yok.</p>}
          </div>
        </section>
      )}

      {/* Müşteriler */}
      {selectedTab === "musteriler" && (
        <section className="bg-white rounded-[30px] p-5 shadow-sm">
          <p className="font-black mb-3">Müşteri Bazlı Tahsilat</p>
          {customerData.length === 0 && <p className="text-slate-400 text-sm">Henüz müşteri bazlı veri yok.</p>}
          {customerData.map((c, i) => (
            <div key={i} className="py-3 border-b border-slate-100 last:border-0">
              <div className="flex justify-between mb-1">
                <span className="font-black text-sm">{c.name}</span>
                <span className="font-black text-emerald-600 text-sm">{money(c.paid)}</span>
              </div>
              {c.pending > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Bekleyen</span>
                  <span className="text-red-400 font-semibold">{money(c.pending)}</span>
                </div>
              )}
              <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${Math.min((c.paid / (c.paid + c.pending || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Kategoriler */}
      {selectedTab === "kategoriler" && (
        <section className="bg-white rounded-[30px] p-5 shadow-sm">
          <p className="font-black mb-3">Bu Ay Gider Kategorileri</p>
          {categoryBreakdown.length === 0 && <p className="text-slate-400 text-sm">Bu ay gider kaydı yok.</p>}
          {categoryBreakdown.map((c) => {
            const pct = Math.round((c.total / cur.expense) * 100) || 0;
            return (
              <div key={c.category} className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex justify-between mb-1">
                  <span className="font-black text-sm">{c.category}</span>
                  <span className="font-black text-red-500 text-sm">{money(c.total)}</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">%{pct}</p>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
