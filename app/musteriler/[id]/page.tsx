"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { money } from "@/components/ui";
import {
  IArrowLeft, IEdit, ICheck, IReceipt, ISparkle, IPlayCircle, IBriefcase, ICheckCircle, IClock,
} from "@/components/Icons";

const supabase = createClient();

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
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 bg-teal rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2.5 h-2.5 bg-teal rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2.5 h-2.5 bg-teal rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </main>
  );

  const activeService = services.find((s) => s.status === "devam ediyor") || services[0];
  const pendingPayments = payments.filter((p) => p.status === "bekliyor");
  const upcomingContent = calendar.filter((c) => c.status === "planlandı").slice(0, 5);
  const pendingTasks = tasks.filter((t) => t.status === "bekliyor");

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Link href="/musteriler" className="v-press h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center shrink-0" aria-label="Geri">
          <IArrowLeft size={19} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="v-overline mb-0.5">Müşteri</p>
          <h1 className="text-[22px] font-extrabold tracking-tight leading-tight truncate">{customer.brand_name || customer.name}</h1>
        </div>
        <button onClick={() => setEditing(!editing)} className={`v-btn !py-2.5 !px-4 !text-[13px] shrink-0 ${editing ? "v-btn-soft" : "v-btn-white"}`}>
          <IEdit size={15} /> {editing ? "İptal" : "Düzenle"}
        </button>
      </header>

      {/* Edit form */}
      {editing && (
        <section className="v-card p-4 mb-4 grid gap-2.5">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad soyad" className="v-input" />
          <input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="Marka adı" className="v-input" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" className="v-input" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notlar" rows={3} className="v-input resize-none" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="v-input">
            <option>aktif müşteri</option>
            <option>potansiyel müşteri</option>
            <option>pasif müşteri</option>
            <option>eski müşteri</option>
          </select>
          <button onClick={saveEdit} className="v-btn v-btn-dark w-full">Kaydet</button>
        </section>
      )}

      {/* Özet kartlar */}
      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="v-card p-4">
          <p className="v-overline mb-1">Toplam alınan</p>
          <p className="v-num text-[20px] font-extrabold text-mint">{money(totalPaid)}</p>
        </div>
        <div className="v-card p-4">
          <p className="v-overline mb-1">Bekleyen</p>
          <p className="v-num text-[20px] font-extrabold text-rose">{money(pendingTotal)}</p>
        </div>
      </section>

      {/* Aktif hizmet */}
      {activeService && (
        <section className="v-hero p-4 mb-4">
          <div className="relative z-10">
            <p className="v-overline !text-white/50 mb-1">Aktif hizmet</p>
            <h2 className="font-extrabold text-lg">{activeService.service_name || "Hizmet"}</h2>
            <div className="flex gap-4 mt-1.5 text-sm flex-wrap">
              {activeService.monthly_fee > 0 && <span className="v-num font-extrabold text-emerald-300">{money(activeService.monthly_fee)}/ay</span>}
              {activeService.payment_day && <span className="text-white/60 font-medium text-xs self-center">Her ayın {activeService.payment_day}. günü</span>}
              {activeService.start_date && <span className="text-white/60 font-medium text-xs self-center">Başlangıç: {dateLabel(activeService.start_date)}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Bekleyen tahsilatlar */}
      {pendingPayments.length > 0 && (
        <section className="mb-4">
          <p className="v-overline mb-2">Bekleyen tahsilatlar</p>
          <div className="grid gap-2">
            {pendingPayments.map((p) => (
              <div key={p.id} className="v-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{p.title}</p>
                  <p className="text-xs text-mute font-medium">{dateLabel(p.due_date)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="v-num font-extrabold text-rose text-sm">{money(Number(p.amount))}</span>
                  <button onClick={() => markPaid(p.id, Number(p.amount), p.title)} className="v-btn v-btn-mint !py-2 !px-3 !text-xs">
                    <ICheck size={13} /> Ödendi
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
          <p className="v-overline mb-2">Bekleyen görevler</p>
          <div className="grid gap-2">
            {pendingTasks.map((t) => (
              <div key={t.id} className="v-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{t.title}</p>
                  <p className="text-xs text-mute font-medium">{dateLabel(t.followup_date)}</p>
                  {t.message_suggestion && <p className="text-xs text-mute font-medium mt-1 italic line-clamp-1">"{t.message_suggestion}"</p>}
                </div>
                <span className={`v-chip shrink-0 ${t.priority === "acil" ? "v-chip-rose" : "v-chip-amber"}`}>{t.priority || "normal"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* İçerik takvimi */}
      {upcomingContent.length > 0 && (
        <section className="mb-4">
          <p className="v-overline mb-2">İçerik takvimi</p>
          <div className="grid gap-2">
            {upcomingContent.map((c) => (
              <div key={c.id} className="v-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-[rgba(45,163,199,0.12)] text-teal-deep rounded-2xl grid place-items-center shrink-0">
                    <IPlayCircle size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{c.content_title}</p>
                    <p className="text-xs text-mute font-medium">{dateLabel(c.publish_date)}</p>
                  </div>
                </div>
                <span className={`v-chip shrink-0 ${c.status === "tamamlandı" ? "v-chip-mint" : "v-chip-amber"}`}>
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
          <p className="v-overline mb-2">Tüm hizmetler</p>
          <div className="grid gap-2">
            {services.map((s) => (
              <div key={s.id} className="v-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{s.service_name}</p>
                  <p className="text-xs text-mute font-medium">{s.service_type} · Başlangıç: {dateLabel(s.start_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="v-num font-extrabold text-sm">{money(s.monthly_fee)}/ay</p>
                  <span className={`text-xs font-extrabold ${s.status === "devam ediyor" ? "text-mint" : "text-mute"}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aktivite geçmişi */}
      {logs.length > 0 && (
        <section className="mb-4">
          <p className="v-overline mb-2">Aktivite geçmişi</p>
          <div className="grid gap-2">
            {logs.map((l) => (
              <div key={l.id} className="v-card p-3.5 flex gap-3">
                <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${
                  l.action_type === "tamamlandı" ? "bg-[#e8f7f1] text-mint" : "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                }`}>
                  {l.action_type === "iş" ? <IBriefcase size={15} /> : l.action_type === "tamamlandı" ? <ICheckCircle size={15} /> : <IClock size={15} />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{l.action_title}</p>
                  {l.action_detail && <p className="text-xs text-mute font-medium line-clamp-2">{l.action_detail}</p>}
                  <p className="text-[11px] text-mute font-medium mt-0.5">{dateLabel(l.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Müşteri bilgileri */}
      <section className="v-card p-4 mb-4">
        <p className="v-overline mb-3">Müşteri bilgileri</p>
        <div className="grid gap-2.5 text-sm">
          <div className="flex justify-between"><span className="text-mute font-medium">Ad Soyad</span><span className="font-bold">{customer.name}</span></div>
          {customer.brand_name && customer.brand_name !== customer.name && (
            <div className="flex justify-between"><span className="text-mute font-medium">Marka</span><span className="font-bold">{customer.brand_name}</span></div>
          )}
          {customer.phone && (
            <div className="flex justify-between"><span className="text-mute font-medium">Telefon</span><a href={`tel:${customer.phone}`} className="font-extrabold text-teal-deep">{customer.phone}</a></div>
          )}
          <div className="flex justify-between"><span className="text-mute font-medium">Durum</span><span className="font-bold">{customer.status}</span></div>
          <div className="flex justify-between"><span className="text-mute font-medium">Kaynak</span><span className="font-bold">{customer.source || "—"}</span></div>
          <div className="flex justify-between"><span className="text-mute font-medium">Eklendi</span><span className="font-bold">{dateLabel(customer.created_at)}</span></div>
          {customer.notes && <div className="mt-1 pt-2.5 border-t border-line"><p className="v-overline mb-1">Not</p><p className="text-sm font-medium text-sub">{customer.notes}</p></div>}
        </div>
      </section>

      {/* Hızlı Aksiyonlar */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/fatura/${id}`} className="v-card v-press flex flex-col items-center justify-center p-4 gap-2">
          <div className="h-10 w-10 rounded-2xl bg-canvas text-teal-deep grid place-items-center"><IReceipt size={19} /></div>
          <p className="font-bold text-sm">Fatura Oluştur</p>
        </Link>
        <Link href="/asistan" className="v-press relative overflow-hidden flex flex-col items-center justify-center rounded-[24px] p-4 gap-2 text-white shadow-[0_12px_32px_rgba(45,163,199,0.35)]"
          style={{ background: "linear-gradient(135deg, #2da3c7, #e8a33d)" }}>
          <div className="h-10 w-10 rounded-2xl bg-white/15 grid place-items-center"><ISparkle size={19} /></div>
          <p className="font-bold text-sm">Asistana Sor</p>
        </Link>
      </div>
    </main>
  );
}
