"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, today, Progress } from "@/components/ui";
import {
  IHomeAlt, IBuilding, IZap, IDroplet, IFlame, IGlobe, IPhone, ITv, IShield, IFile,
  IPlus, ITrash, ICheck, IReceipt,
} from "@/components/Icons";

const supabase = createClient();

const THIS_MONTH = new Date().toISOString().slice(0,7); // "YYYY-MM"
// "Bu ay ödendi" yalnızca son ödeme bu ayda ise geçerli — ay dönünce otomatik sıfırlanır
const isPaidThisMonth = (i: any) => !!i.is_paid_this_month && String(i.last_paid_date || "").slice(0,7) === THIS_MONTH;

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
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title:"", amount:"", due_day:"", category:"kira" });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href="/login"; return; }
    const { data } = await supabase.from("fixed_expenses").select("*").eq("user_id",user.id).order("due_day",{ascending:true});
    setItems(data||[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user||!form.title) return;
    await supabase.from("fixed_expenses").insert({ user_id:user.id, title:form.title, amount:Number(form.amount)||0, due_day:Number(form.due_day)||0, category:form.category });
    setForm({ title:"", amount:"", due_day:"", category:"kira" });
    setAdding(false); load();
  }

  async function togglePaid(item: any) {
    const nowPaid = !isPaidThisMonth(item);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("fixed_expenses").update({ is_paid_this_month:nowPaid, last_paid_date: nowPaid ? today() : null }).eq("id",item.id);
    if (nowPaid) {
      // Ödendi işaretlenince gider tablosuna da kaydet
      await supabase.from("expenses").insert({ user_id:user.id, title:item.title, amount:Number(item.amount||0), expense_date:today(), category:item.category, payment_method:"Sabit Gider", note:`Aylık sabit gider - ${item.category}` });
    } else {
      // Geri alınınca bu ay oluşturulan sabit gider kaydını da temizle (hayalet gider olmasın)
      await supabase.from("expenses").delete()
        .eq("user_id", user.id).eq("title", item.title)
        .eq("payment_method", "Sabit Gider").gte("expense_date", THIS_MONTH + "-01");
    }
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await supabase.from("fixed_expenses").delete().eq("id",id);
    load();
  }

  const totalMonthly  = items.reduce((t,i)=>t+Number(i.amount||0),0);
  const totalPaid     = items.filter(isPaidThisMonth).reduce((t,i)=>t+Number(i.amount||0),0);
  const totalUnpaid   = totalMonthly - totalPaid;
  const paidCount     = items.filter(isPaidThisMonth).length;
  const today_day     = new Date().getDate();

  const cat = (v: string) => CATEGORIES.find(c=>c.value===v) || CATEGORIES[CATEGORIES.length-1];

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Sabit Giderler" subtitle="Kira, aidat, faturalar, abonelikler" />

      {/* Özet hero */}
      <section className="v-hero p-5 mb-4">
        <div className="relative z-10">
          <p className="v-overline !text-white/50 mb-1">Aylık sabit giderler</p>
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
              <p className="v-overline !text-white/40">Durum</p>
              <p className="v-num font-extrabold text-emerald-300 text-sm mt-0.5">{paidCount}/{items.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* İlerleme */}
      {items.length > 0 && (
        <div className="v-card p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-[13px] font-bold">Bu ay ödenme durumu</span>
            <span className="v-num text-[13px] font-extrabold text-teal-deep">%{Math.round((paidCount/items.length)*100)}</span>
          </div>
          <Progress pct={(paidCount/items.length)*100} />
        </div>
      )}

      {/* Ekle */}
      <div className="flex justify-between items-center mb-3">
        <p className="v-overline">Kalemler ({items.length})</p>
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
      <div className="grid gap-2.5">
        {items.map(item => {
          const paid = isPaidThisMonth(item);
          const isDue = item.due_day && Math.abs(item.due_day - today_day) <= 3;
          const c = cat(item.category);
          return (
            <div key={item.id} className="v-card p-4">
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${
                  paid ? "bg-[#e8f7f1] text-mint" : isDue ? "bg-[#fdeef1] text-rose" : "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                }`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-bold text-sm truncate">{item.title}</p>
                    <p className={`v-num font-extrabold text-[15px] shrink-0 ${paid ? "text-mint" : "text-ink"}`}>{money(Number(item.amount))}</p>
                  </div>
                  <div className="flex gap-1.5 items-center mt-0.5 flex-wrap">
                    <span className="text-[11px] text-mute font-medium">{c.label}</span>
                    {item.due_day ? (
                      <span className={`text-[11px] font-medium ${isDue && !paid ? "text-rose font-bold" : "text-mute"}`}>
                        · her ayın {item.due_day}. günü
                      </span>
                    ) : null}
                    {isDue && !paid && <span className="v-chip v-chip-rose !text-[9px] !px-2 !py-0.5">YAKLAŞIYOR</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={()=>togglePaid(item)} className={`v-btn flex-1 !py-2.5 !text-[13px] ${paid ? "v-btn-soft" : "v-btn-mint"}`}>
                  <ICheck size={15} /> {paid ? "Ödendi (geri al)" : "Ödendi İşaretle"}
                </button>
                <button onClick={()=>deleteItem(item.id)} className="v-btn v-btn-rose !py-2.5 !px-4 !text-[13px]">
                  <ITrash size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {items.length===0 && !adding && (
          <EmptyState
            icon={<IReceipt size={24} />}
            title="Henüz sabit gider eklenmedi"
            hint="Kira, aidat, elektrik, internet gibi aylık sabit giderlerini ekle."
          />
        )}
      </div>
    </main>
  );
}
