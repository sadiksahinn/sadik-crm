"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
      await supabase.from("income").insert(payload);
    } else {
      payload.expense_date = String(form.get("date") || today());
      payload.category = String(form.get("category") || "Genel");
      await supabase.from("expenses").insert(payload);
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

    await supabase.from(table).update(payload).eq("id", editing.id);
    setEditing(null);
    load();
  }

  async function deleteRecord(item:any) {
    if (!confirm("Bu kaydı silmek istiyor musun?")) return;
    const table = item.type === "gelir" ? "income" : "expenses";
    await supabase.from(table).delete().eq("id", item.id);
    load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Finans</h1>
          <p className="text-slate-500">Gelir, gider ve kasa takibi</p>
        </div>
        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
      </header>

      <section className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">Gelir</p>
          <h2 className="text-lg font-black text-emerald-600">{money(incomeTotal)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">Gider</p>
          <h2 className="text-lg font-black text-red-600">{money(expenseTotal)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">Net</p>
          <h2 className="text-lg font-black">{money(incomeTotal - expenseTotal)}</h2>
        </div>
      </section>

      <section className="bg-white rounded-[28px] p-4 shadow-sm mb-5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setTab("gelir")} className={`rounded-2xl p-4 font-black ${tab === "gelir" ? "bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white" : "bg-slate-100"}`}>Gelir Ekle</button>
          <button onClick={() => setTab("gider")} className={`rounded-2xl p-4 font-black ${tab === "gider" ? "bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white" : "bg-slate-100"}`}>Gider Ekle</button>
        </div>

        <form onSubmit={save} className="grid gap-3">
          <input name="title" required placeholder={tab === "gelir" ? "Örn: Suite Halı ödeme" : "Örn: Market"} className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input name="amount" required type="number" placeholder="Tutar" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input name="date" type="date" defaultValue={today()} className="bg-slate-100 rounded-2xl p-4 outline-none" />
          {tab === "gider" && <input name="category" placeholder="Kategori" className="bg-slate-100 rounded-2xl p-4 outline-none" />}
          <select name="method" className="bg-slate-100 rounded-2xl p-4 outline-none">
            <option>Nakit</option><option>Havale/EFT</option><option>Kredi Kartı</option><option>Diğer</option>
          </select>
          <textarea name="note" placeholder="Not" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <button className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black">{tab === "gelir" ? "Geliri Kaydet" : "Gideri Kaydet"}</button>
        </form>
      </section>

      <section className="grid gap-3">
        {records.map((r) => (
          <div key={`${r.type}-${r.id}`} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between gap-3">
              <div>
                <p className={`text-xs font-black ${r.type === "gelir" ? "text-emerald-600" : "text-red-600"}`}>{r.type.toUpperCase()}</p>
                <h3 className="font-black">{r.title}</h3>
                <p className="text-slate-500 text-sm">{r.payment_method || "Yöntem yok"}</p>
              </div>
              <p className="font-black">{money(Number(r.amount))}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => setEditing(r)} className="bg-slate-100 rounded-xl p-3 font-black">Düzenle</button>
              <button onClick={() => deleteRecord(r)} className="bg-red-50 text-red-600 rounded-xl p-3 font-black">Sil</button>
            </div>
          </div>
        ))}
      </section>

      {editing && (
        <section className="fixed inset-0 bg-slate-950/30 z-[99999] grid place-items-end">
          <div className="bg-white rounded-t-[32px] p-5 w-full shadow-2xl">
            <h2 className="text-2xl font-black mb-4">Kaydı Düzenle</h2>
            <div className="grid gap-3">
              <input value={editing.title || ""} onChange={(e) => setEditing({...editing, title:e.target.value})} className="bg-slate-100 rounded-2xl p-4 outline-none" />
              <input value={editing.amount || ""} type="number" onChange={(e) => setEditing({...editing, amount:e.target.value})} className="bg-slate-100 rounded-2xl p-4 outline-none" />
              <textarea value={editing.note || ""} onChange={(e) => setEditing({...editing, note:e.target.value})} className="bg-slate-100 rounded-2xl p-4 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={updateRecord} className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black">Kaydet</button>
                <button onClick={() => setEditing(null)} className="bg-slate-100 rounded-2xl p-4 font-black">Vazgeç</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
