"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}

function dateLabel(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MusteriDetayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer]     = useState<any>(null);
  const [services, setServices]     = useState<any[]>([]);
  const [payments, setPayments]     = useState<any[]>([]);
  const [tasks, setTasks]           = useState<any[]>([]);
  const [calendar, setCalendar]     = useState<any[]>([]);
  const [logs, setLogs]             = useState<any[]>([]);
  const [totalPaid, setTotalPaid]   = useState(0);
  const [pendingTotal, setPending]  = useState(0);
  const [editing, setEditing]       = useState(false);
  const [form, setForm]             = useState({ name: "", brand_name: "", phone: "", notes: "", status: "" });

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/login"); return; }

    const { data: c } = await supabase.from("customers").select("*").eq("id", id).single();
    if (!c) { router.push("/musteriler"); return; }
    setCustomer(c);
    setForm({ name: c.name, brand_name: c.brand_name || "", phone: c.phone || "", notes: c.notes || "", status: c.status || "aktif müşteri" });

    const [
      { data: svc },
      { data: pay },
      { data: flw },
      { data: cal },
      { data: act },
    ] = await Promise.all([
      supabase.from("client_services").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("payment_tracking").select("*").eq("customer_id", id).order("due_date", { ascending: true }),
      supabase.from("followups").select("*").eq("customer_id", id).order("followup_date", { ascending: true }),
      supabase.from("content_calendar").select("*").eq("customer_id", id).order("publish_date", { ascending: true }),
      supabase.from("activity_logs").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ]);

    setServices(svc || []);
    setPayments(pay || []);
    setTasks(flw || []);
    setCalendar(cal || []);
    setLogs(act || []);

    const paid = (pay || []).filter((p: any) => p.status === "ödendi").reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
    const pending = (pay || []).filter((p: any) => p.status === "bekliyor").reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
    setTotalPaid(paid);
    setPending(pending);
  }

  useEffect(() => { load(); }, [id]);

  async function saveEdit() {
    await supabase.from("customers").update({ name: form.name, brand_name: form.brand_name, phone: form.phone, notes: form.notes, status: form.status }).eq("id", id);
    setEditing(false);
    load();
  }

  async function markPaid(payId: string, amount: number, title: string) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("payment_tracking").update({ status: "ödendi", paid_date: today, income_created: true }).eq("id", payId);
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("income").insert({ user_id: userData.user?.id, title, amount, income_date: today, payment_method: "Müşteri sayfası", note: "Müşteri detayından ödendi yapıldı." });
    load();
  }

  if (!customer) return (
    <main className="min-h-screen bg-[#f7f8fc] flex items-center justify-center">
      <div className="flex gap-1">
        <span className="w-3 h-3 bg-[#61aebd] rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-3 h-3 bg-[#61aebd] rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-3 h-3 bg-[#61aebd] rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </main>
  );

  const activeService = services.find((s) => s.status === "devam ediyor") || services[0];
  const pendingPayments = payments.filter((p) => p.status === "bekliyor");
  const upcomingContent = calendar.filter((c) => c.status === "planlandı").slice(0, 5);
  const pendingTasks = tasks.filter((t) => t.status === "bekliyor");

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Link href="/musteriler" className="h-11 w-11 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-lg">
          ←
        </Link>
        <div className="flex-1">
          <p className="text-[#61aebd] text-xs font-black tracking-wide">MÜŞTERİ</p>
          <h1 className="text-2xl font-black leading-tight">{customer.brand_name || customer.name}</h1>
        </div>
        <button onClick={() => setEditing(!editing)} className="h-11 px-4 bg-white rounded-2xl shadow-sm font-black text-sm">
          {editing ? "İptal" : "Düzenle"}
        </button>
      </header>

      {/* Edit form */}
      {editing && (
        <section className="bg-white rounded-[24px] p-4 shadow-sm mb-4 grid gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad soyad" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="Marka adı" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notlar" rows={3} className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm">
            <option>aktif müşteri</option>
            <option>potansiyel müşteri</option>
            <option>pasif müşteri</option>
            <option>eski müşteri</option>
          </select>
          <button onClick={saveEdit} className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl py-3 font-black text-sm">
            Kaydet
          </button>
        </section>
      )}

      {/* Özet kartlar */}
      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-[24px] p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">Toplam Alınan</p>
          <p className="text-2xl font-black text-emerald-600">{money(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-[24px] p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">Bekleyen</p>
          <p className="text-2xl font-black text-red-500">{money(pendingTotal)}</p>
        </div>
      </section>

      {/* Aktif hizmet */}
      {activeService && (
        <section className="bg-gradient-to-br from-[#61aebd] to-[#e5ab53] rounded-[24px] p-4 shadow-sm mb-4 text-white">
          <p className="text-xs font-black opacity-70 mb-1">AKTİF HİZMET</p>
          <h2 className="font-black text-lg">{activeService.service_name || "Hizmet"}</h2>
          <div className="flex gap-4 mt-2 text-sm">
            {activeService.monthly_fee > 0 && <span className="font-black">{money(activeService.monthly_fee)}/ay</span>}
            {activeService.payment_day && <span className="opacity-80">Her ayın {activeService.payment_day}. günü</span>}
            {activeService.start_date && <span className="opacity-80">Başlangıç: {dateLabel(activeService.start_date)}</span>}
          </div>
        </section>
      )}

      {/* Bekleyen tahsilatlar */}
      {pendingPayments.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">BEKLİYEN TAHSİLATLAR</p>
          <div className="grid gap-2">
            {pendingPayments.map((p) => (
              <div key={p.id} className="bg-white rounded-[20px] p-4 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm">{p.title}</p>
                  <p className="text-xs text-slate-500">{dateLabel(p.due_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-red-500">{money(Number(p.amount))}</span>
                  <button onClick={() => markPaid(p.id, Number(p.amount), p.title)} className="bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-xs font-black">
                    Ödendi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Görevler */}
      {pendingTasks.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">BEKLEYEN GÖREVLER</p>
          <div className="grid gap-2">
            {pendingTasks.map((t) => (
              <div key={t.id} className="bg-white rounded-[20px] p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-sm">{t.title}</p>
                  <p className="text-xs text-slate-500">{dateLabel(t.followup_date)}</p>
                  {t.message_suggestion && <p className="text-xs text-slate-400 mt-1 italic">"{t.message_suggestion}"</p>}
                </div>
                <span className="text-xs bg-amber-50 text-amber-600 rounded-xl px-3 py-1.5 font-black">{t.priority || "normal"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* İçerik takvimi */}
      {upcomingContent.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">İÇERİK TAKVİMİ</p>
          <div className="grid gap-2">
            {upcomingContent.map((c) => (
              <div key={c.id} className="bg-white rounded-[20px] p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[#61aebd]/10 rounded-xl flex items-center justify-center text-lg">◉</div>
                  <div>
                    <p className="font-black text-sm">{c.content_title}</p>
                    <p className="text-xs text-slate-500">{dateLabel(c.publish_date)}</p>
                  </div>
                </div>
                <span className={`text-xs rounded-xl px-3 py-1.5 font-black ${c.status === "tamamlandı" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tüm hizmetler */}
      {services.length > 1 && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">TÜM HİZMETLER</p>
          <div className="grid gap-2">
            {services.map((s) => (
              <div key={s.id} className="bg-white rounded-[20px] p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-sm">{s.service_name}</p>
                  <p className="text-xs text-slate-500">{s.service_type} · Başlangıç: {dateLabel(s.start_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{money(s.monthly_fee)}/ay</p>
                  <span className={`text-xs font-black ${s.status === "devam ediyor" ? "text-emerald-500" : "text-slate-400"}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aktivite geçmişi */}
      {logs.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">AKTİVİTE GEÇMİŞİ</p>
          <div className="grid gap-2">
            {logs.map((l) => (
              <div key={l.id} className="bg-white rounded-[20px] p-3 shadow-sm flex gap-3">
                <div className="h-9 w-9 bg-[#61aebd]/10 rounded-xl flex items-center justify-center text-sm font-black text-[#61aebd] flex-shrink-0">
                  {l.action_type === "iş" ? "💼" : l.action_type === "tamamlandı" ? "✅" : l.action_type === "plan" ? "📋" : "📌"}
                </div>
                <div>
                  <p className="font-black text-sm">{l.action_title}</p>
                  {l.action_detail && <p className="text-xs text-slate-500">{l.action_detail}</p>}
                  <p className="text-xs text-slate-400">{dateLabel(l.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Müşteri bilgileri */}
      <section className="bg-white rounded-[24px] p-4 shadow-sm mb-4">
        <p className="text-xs font-black tracking-wide text-slate-500 mb-3">MÜŞTERİ BİLGİLERİ</p>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Ad Soyad</span><span className="font-black">{customer.name}</span></div>
          {customer.brand_name && customer.brand_name !== customer.name && (
            <div className="flex justify-between"><span className="text-slate-500">Marka</span><span className="font-black">{customer.brand_name}</span></div>
          )}
          {customer.phone && (
            <div className="flex justify-between"><span className="text-slate-500">Telefon</span><a href={`tel:${customer.phone}`} className="font-black text-[#61aebd]">{customer.phone}</a></div>
          )}
          <div className="flex justify-between"><span className="text-slate-500">Durum</span><span className="font-black">{customer.status}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Kaynak</span><span className="font-black">{customer.source || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Eklendi</span><span className="font-black">{dateLabel(customer.created_at)}</span></div>
          {customer.notes && <div className="mt-2 pt-2 border-t border-slate-100"><p className="text-slate-500 text-xs mb-1">Not</p><p className="text-sm">{customer.notes}</p></div>}
        </div>
      </section>

      {/* Hızlı Aksiyonlar */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/fatura/${id}`}
          className="flex flex-col items-center justify-center bg-white rounded-[24px] p-4 shadow-sm gap-1"
        >
          <span className="text-2xl">🧾</span>
          <p className="font-black text-sm">Fatura Oluştur</p>
        </Link>
        <Link
          href="/asistan"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-[#61aebd] to-[#e5ab53] rounded-[24px] p-4 shadow-sm gap-1 text-white"
        >
          <span className="text-2xl">💬</span>
          <p className="font-black text-sm">Asistana Sor</p>
        </Link>
      </div>
    </main>
  );
}
