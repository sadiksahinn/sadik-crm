"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, today } from "@/components/ui";
import { ILira, IAlert, ICheck, IMessage, ITrash, IPlus } from "@/components/Icons";

const supabase = createClient();

export default function TahsilatlarPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addPayment() {
    if (!title.trim() || !amount) {
      alert("Başlık ve tutar gir.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("payment_tracking").insert({
      user_id: user.id,
      title,
      amount: Number(amount),
      due_date: date,
      status: "bekliyor",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setAmount("");
    setDate(today());
    load();
  }

  async function markPaid(item: any) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase
      .from("payment_tracking")
      .update({
        status: "ödendi",
        paid_date: today(),
        income_created: true,
      })
      .eq("id", item.id);

    if (!item.income_created) {
      const { data: createdIncome } = await supabase.from("income").insert({
      user_id: user.id,
      title: item.title,
      amount: Number(item.amount || 0),
      income_date: today(),
      payment_method: "Tahsilat",
      note: "Tahsilat ekranından ödendi olarak işaretlendi.",
    }).select().single();

    await supabase
      .from("payment_tracking")
      .update({ income_id: createdIncome?.id, income_created: true })
      .eq("id", item.id);
    }

    load();
  }

  async function deletePayment(item: any) {
    if (!confirm("Bu tahsilat kaydı silinsin mi?")) return;

    await supabase.from("payment_tracking").delete().eq("id", item.id);
    load();
  }

  const pending = items.filter((i) => i.status !== "ödendi");
  const paid = items.filter((i) => i.status === "ödendi");
  const pendingTotal = pending.reduce((t, i) => t + Number(i.amount || 0), 0);
  const overdue = pending.filter((i) => i.due_date < today());
  const overdueTotal = overdue.reduce((t, i) => t + Number(i.amount || 0), 0);

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Tahsilatlar" subtitle="Bekleyen ödemeleri takip et" />

      {/* Gecikmiş uyarısı */}
      {overdue.length > 0 && (
        <section className="relative overflow-hidden rounded-[24px] p-5 mb-4 text-white shadow-[0_14px_36px_rgba(225,29,72,0.3)]"
          style={{ background: "linear-gradient(140deg, #e11d48, #be123c)" }}>
          <div className="flex items-center gap-2 mb-1.5 opacity-90">
            <IAlert size={15} />
            <p className="v-overline !text-white/70">Gecikmiş tahsilat</p>
          </div>
          <p className="v-num text-[30px] font-extrabold leading-none">{money(overdueTotal)}</p>
          <p className="text-white/80 text-xs font-medium mt-1.5">{overdue.length} ödeme vadesi geçti — hemen takip et</p>
        </section>
      )}

      {/* Özet */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="v-card p-4">
          <p className="v-overline">Bekleyen</p>
          <h2 className="v-num text-[20px] font-extrabold text-[#a16a14] mt-0.5">{money(pendingTotal)}</h2>
          <p className="text-mute text-xs font-medium mt-0.5">{pending.length} kayıt</p>
        </div>
        <div className="v-card p-4">
          <p className="v-overline">Tahsil edildi</p>
          <h2 className="v-num text-[20px] font-extrabold text-mint mt-0.5">{paid.length}</h2>
          <p className="text-mute text-xs font-medium mt-0.5">ödeme tamamlandı</p>
        </div>
      </section>

      {/* Yeni tahsilat */}
      <section className="v-card p-4 mb-5">
        <h2 className="font-extrabold tracking-tight mb-3">Yeni Tahsilat</h2>
        <div className="grid gap-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Suite Halı ödeme" className="v-input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Tutar ₺" className="v-input" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="v-input" />
          </div>
          <button onClick={addPayment} className="v-btn v-btn-dark w-full">
            <IPlus size={17} /> Tahsilat Ekle
          </button>
        </div>
      </section>

      {/* Liste */}
      <section className="grid gap-2.5">
        {loading && Array.from({ length: 3 }).map((_, i) => <div key={`sk-${i}`} className="skeleton h-[110px]" />)}
        {!loading && items.map((item) => {
          const isPaid = item.status === "ödendi";
          const isOverdue = !isPaid && item.due_date < today();
          return (
          <div key={item.id} className={`v-card p-4 ${isOverdue ? "!border-rose/30 !bg-[#fff7f8]" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${
                isPaid ? "bg-[#e8f7f1] text-mint" : isOverdue ? "bg-[#fdeef1] text-rose" : "bg-[rgba(232,163,61,0.14)] text-[#a16a14]"
              }`}>
                <ILira size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{item.title}</h3>
                  {isOverdue && <span className="v-chip v-chip-rose !text-[9px] !px-2 !py-0.5">GECİKMİŞ</span>}
                </div>
                <p className={`text-xs font-medium mt-0.5 ${isOverdue ? "text-rose" : "text-mute"}`}>
                  Vade: {item.due_date} · {isPaid ? "ödendi" : "bekliyor"}
                </p>
              </div>
              <p className={`v-num font-extrabold text-[15px] shrink-0 ${isPaid ? "text-mint" : isOverdue ? "text-rose" : "text-ink"}`}>
                {money(Number(item.amount))}
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              {!isPaid ? (
                <button onClick={() => markPaid(item)} className="v-btn v-btn-mint flex-1 !py-2.5 !text-[13px]">
                  <ICheck size={15} /> Ödendi
                </button>
              ) : (
                <div className="v-btn v-btn-soft flex-1 !py-2.5 !text-[13px] pointer-events-none opacity-70">
                  <ICheck size={15} /> Tamamlandı
                </div>
              )}
              <button
                onClick={() => {
                  const msg = `Merhaba, ${item.title} için ${money(Number(item.amount || 0))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
                  navigator.clipboard.writeText(msg);
                  alert("WhatsApp mesajı kopyalandı.");
                }}
                className="v-btn v-btn-soft !py-2.5 !px-4 !text-[13px] !text-teal-deep"
              >
                <IMessage size={15} />
              </button>
              <button onClick={() => deletePayment(item)} className="v-btn v-btn-rose !py-2.5 !px-4 !text-[13px]">
                <ITrash size={15} />
              </button>
            </div>
          </div>
          );
        })}

        {!loading && items.length === 0 && (
          <EmptyState icon={<ILira size={24} />} title="Henüz tahsilat kaydı yok" hint="Bekleyen ödemeleri buradan takip edebilirsin." />
        )}
      </section>
    </main>
  );
}
