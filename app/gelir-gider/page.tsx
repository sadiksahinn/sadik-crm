"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, today } from "@/components/ui";
import { IReceipt, ITrendUp, ITrendDown, IEdit, ITrash } from "@/components/Icons";
import { confirmedExpenses } from "@/utils/finance";

const supabase = createClient();
const CHANNELS = [
  ["qr", "QR"],
  ["temassiz", "Temassız"],
  ["fiziksel_kart", "Fiziksel kart"],
  ["internet", "İnternet"],
  ["bilinmiyor", "Bilinmiyor"],
] as const;

function noteValue(note: string, label: string) {
  const part = String(note || "").split(" · ").find((value) => value.startsWith(`${label}: `));
  return part ? part.slice(label.length + 2).trim() : "";
}

function editableRecord(item: any) {
  if (item.type !== "gider") return item;
  const note = String(item.note || "");
  return {
    ...item,
    explanation: noteValue(note, "Açıklama"),
    merchant: noteValue(note, "İşyeri") || item.title || "",
    city: noteValue(note, "Şehir"),
    channel: noteValue(note, "Ödeme") || "bilinmiyor",
    status: noteValue(note, "Durum") || "kesinleşmiş",
    project: noteValue(note, "İş/Proje"),
  };
}

export default function GelirGiderPage() {
  const [tab, setTab] = useState<"gelir" | "gider">("gelir");
  const [records, setRecords] = useState<any[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return (window.location.href = "/login");
    setLoading(true);

    const { data: incomes } = await supabase.from("income").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: expenses } = await supabase.from("expenses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

    setIncomeTotal((incomes || []).reduce((t, i) => t + Number(i.amount || 0), 0));
    setExpenseTotal(confirmedExpenses(expenses).reduce((t, i) => t + Number(i.amount || 0), 0));

    setRecords([
      ...(incomes || []).map((i:any) => ({ ...i, type: "gelir" })),
      ...(expenses || []).map((e:any) => ({ ...e, type: "gider" })),
    ].sort((a,b) => {
      const aDate = String(a.type === "gelir" ? a.income_date : a.expense_date);
      const bDate = String(b.type === "gelir" ? b.income_date : b.expense_date);
      return bDate.localeCompare(aDate) || String(b.created_at).localeCompare(String(a.created_at));
    }));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("ekle");
      if (requested === "gelir" || requested === "gider") setTab(requested);
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!editing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editing]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const payload:any = {
      user_id: user.id,
      title: String(form.get("title") || ""),
      amount: Number(form.get("amount") || 0),
      payment_method: String(form.get("method") || "Nakit"),
      note: [
        String(form.get("note") || "").trim(),
        String(form.get("project") || "").trim() ? `İş/Proje: ${String(form.get("project") || "").trim()}` : "",
      ].filter(Boolean).join(" · "),
    };

    if (tab === "gelir") {
      payload.income_date = String(form.get("date") || today());
      const { error } = await supabase.from("income").insert(payload);
      if (error) {
        alert("Gelir ekleme hatası: " + error.message);
        return;
      }
    } else {
      payload.expense_date = String(form.get("date") || today());
      payload.category = String(form.get("category") || "Genel");
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) {
        alert("Gider ekleme hatası: " + error.message);
        return;
      }
    }

    formElement.reset();
    await load();
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

    if (editing.type === "gider") {
      payload.category = editing.category || "Diğer";
      payload.note = [
        editing.explanation ? `Açıklama: ${editing.explanation}` : "Açıklama bekleniyor",
        editing.merchant ? `İşyeri: ${editing.merchant}` : "",
        editing.city ? `Şehir: ${editing.city}` : "",
        `Ödeme: ${editing.channel || "bilinmiyor"}`,
        `Durum: ${editing.status || "kesinleşmiş"}`,
        editing.project ? `İş/Proje: ${editing.project}` : "",
      ].filter(Boolean).join(" · ");
    }

    const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
    if (error) {
      alert("Güncelleme hatası: " + error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteRecord(item:any) {
    if (!confirm("Bu kaydı silmek istiyor musun?")) return;
    const table = item.type === "gelir" ? "income" : "expenses";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      alert("Silme hatası: " + error.message);
      return;
    }
    load();
  }

  const net = incomeTotal - expenseTotal;

  return (
    <>
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Gelir & Gider" subtitle="Kasa hareketleri" />

      {/* Özet hero */}
      <section className="v-hero p-5 mb-5">
        <div className="relative z-10">
          <p className="v-overline !text-white/50 mb-1">Net bakiye</p>
          <p className={`v-num text-[34px] font-extrabold leading-none mb-4 ${net >= 0 ? "text-white" : "text-rose-300"}`}>{money(net)}</p>
          <div className="flex gap-6">
            <div>
              <p className="v-overline !text-white/40">Gelir</p>
              <p className="v-num font-extrabold text-emerald-300 mt-0.5">{money(incomeTotal)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Gider</p>
              <p className="v-num font-extrabold text-rose-300 mt-0.5">{money(expenseTotal)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Kayıt formu */}
      <section className="v-card p-4 mb-5">
        <div className="v-seg mb-4">
          <button onClick={() => setTab("gelir")} className={`v-seg-btn ${tab === "gelir" ? "active" : ""}`}>Gelir Ekle</button>
          <button onClick={() => setTab("gider")} className={`v-seg-btn ${tab === "gider" ? "active" : ""}`}>Gider Ekle</button>
        </div>

        <form onSubmit={save} className="grid gap-2.5">
          <input name="title" required placeholder={tab === "gelir" ? "Örn: Suite Halı ödeme" : "Örn: Market"} className="v-input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input name="amount" required type="number" placeholder="Tutar ₺" className="v-input" />
            <input name="date" type="date" defaultValue={today()} className="v-input" />
          </div>
          {tab === "gider" && <input name="category" placeholder="Kategori" className="v-input" />}
          <input name="project" placeholder="İş / proje (isteğe bağlı)" className="v-input" />
          <select name="method" className="v-input">
            <option>Nakit</option><option>Havale/EFT</option><option>Kredi Kartı</option><option>Diğer</option>
          </select>
          <textarea name="note" placeholder="Not (isteğe bağlı)" rows={2} className="v-input resize-none" />
          <button className={`v-btn ${tab === "gelir" ? "v-btn-dark" : "v-btn-dark"} w-full`}>
            {tab === "gelir" ? <ITrendUp size={17} /> : <ITrendDown size={17} />}
            {tab === "gelir" ? "Geliri Kaydet" : "Gideri Kaydet"}
          </button>
        </form>
      </section>

      {/* Hareketler */}
      <h2 className="v-overline mb-3">Son hareketler</h2>
      <section className="grid gap-2.5">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${i}`} className="skeleton h-[76px]" />
        ))}
        {!loading && records.length === 0 && (
          <EmptyState icon={<IReceipt size={24} />} title="Henüz kayıt yok" hint="İlk gelir veya gideri yukarıdan ekle." />
        )}
        {!loading && records.map((r) => {
          const isIncome = r.type === "gelir";
          return (
            <div key={`${r.type}-${r.id}`} className="v-card p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${isIncome ? "bg-[#e8f7f1] text-mint" : "bg-[#fdeef1] text-rose"}`}>
                  {isIncome ? <ITrendUp size={18} /> : <ITrendDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{r.title}</h3>
                  <p className="text-mute text-xs font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{r.payment_method || "Yöntem yok"}{r.category ? ` · ${r.category}` : ""}</span>
                  </p>
                </div>
                <p className={`v-num font-extrabold text-[15px] shrink-0 ${isIncome ? "text-mint" : "text-rose"}`}>
                  {isIncome ? "+" : "−"}{money(Number(r.amount))}
                </p>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing(editableRecord(r))} className="v-btn v-btn-soft flex-1 !py-2.5 !text-[13px]">
                  <IEdit size={15} /> Düzenle
                </button>
                <button onClick={() => deleteRecord(r)} className="v-btn v-btn-rose !py-2.5 !px-4 !text-[13px]">
                  <ITrash size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </section>

    </main>

      {/* Düzenleme sheet — portal, mobilde dönüştürülmüş sayfa kapsayıcısından etkilenmez */}
      {editing && createPortal(
        <section role="dialog" aria-modal="true" aria-labelledby="record-dialog-title" className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[99999] flex items-end justify-center" onClick={() => setEditing(null)}>
          <div className="v-sheet-enter bg-white rounded-t-[28px] p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] w-full max-w-[520px] max-h-[88dvh] overflow-y-auto shadow-[0_-20px_60px_rgba(11,16,32,0.22)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <h2 id="record-dialog-title" className="text-xl font-extrabold tracking-tight">Kaydı düzenle</h2>
            <p className="text-sm text-mute mt-1 mb-4">{editing.type === "gider" ? "Açıklama ve harcama bilgilerini ayrı ayrı düzenle." : "Başlık, tutar ve açıklamayı güncelle."}</p>
            <div className="grid gap-2.5">
              <label className="grid gap-1.5"><span className="v-overline">Başlık</span><input value={editing.title || ""} onChange={(e) => setEditing({...editing, title:e.target.value})} className="v-input" /></label>
              <label className="grid gap-1.5"><span className="v-overline">Tutar</span><input value={editing.amount || ""} type="number" onChange={(e) => setEditing({...editing, amount:e.target.value})} className="v-input" /></label>
              {editing.type === "gider" ? <>
                <label className="grid gap-1.5"><span className="v-overline">Bu harcama ne içindi?</span><textarea aria-label="Açıklama" placeholder="Örn: Antalya tatilinde akşam yemeği" value={editing.explanation || ""} rows={3} onChange={(e) => setEditing({...editing, explanation:e.target.value})} className="v-input resize-none" /></label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="grid gap-1.5"><span className="v-overline">Kategori</span><select value={editing.category || "Diğer"} onChange={(e) => setEditing({...editing, category:e.target.value})} className="v-input">{["Market","Ulaşım","Yemek","Fatura","Sağlık","Eğlence","Konaklama","Akaryakıt","Kira","Abonelik","Diğer"].map(value => <option key={value}>{value}</option>)}</select></label>
                  <label className="grid gap-1.5"><span className="v-overline">Şehir</span><input placeholder="Örn: Ankara" value={editing.city || ""} onChange={(e) => setEditing({...editing, city:e.target.value})} className="v-input" /></label>
                </div>
                <label className="grid gap-1.5"><span className="v-overline">Ödeme şekli</span><select value={editing.channel || "bilinmiyor"} onChange={(e) => setEditing({...editing, channel:e.target.value})} className="v-input">{CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </> : <label className="grid gap-1.5"><span className="v-overline">Açıklama</span><textarea aria-label="Açıklama" placeholder="Açıklama ekle" value={editing.note || ""} rows={3} onChange={(e) => setEditing({...editing, note:e.target.value})} className="v-input resize-none" /></label>}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={updateRecord} className="v-btn v-btn-dark">Kaydet</button>
                <button onClick={() => setEditing(null)} className="v-btn v-btn-soft">Vazgeç</button>
              </div>
            </div>
          </div>
        </section>,
        document.body
      )}
    </>
  );
}
