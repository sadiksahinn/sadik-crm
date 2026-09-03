"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { PageHeader, EmptyState, money, today } from "@/components/ui";
import { IBell, ILira, ICheck, IPlayCircle, ICheckCircle, IReceipt, ICard, IWallet } from "@/components/Icons";
import { getValidSession } from "@/utils/auth-client";

const supabase = createClient();

export default function BildirimlerPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const session = await getValidSession(supabase);
    const user = session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const monthStart = today().slice(0, 7) + "-01";
    const monthKey = today().slice(0, 7);
    const daysInMonth = new Date(Number(today().slice(0, 4)), Number(today().slice(5, 7)), 0).getDate();
    const dueDate = (day: number) => `${monthKey}-${String(Math.min(Math.max(Number(day) || 1, 1), daysInMonth)).padStart(2, "0")}`;
    const paidThisMonth = (item: any) => !!item.is_paid_this_month && String(item.last_paid_date || "").slice(0, 7) === monthKey;

    const [{ data: payments }, { data: followups }, { data: contents }, { data: reminders }, { data: expenses }, { data: fixed }, { data: cards }, { data: loans }, { data: loanPayments }] = await Promise.all([
      supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("due_date", today())
      .order("due_date", { ascending: true }),
      supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("followup_date", today())
      .order("followup_date", { ascending: true }),
      supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "planlandı")
      .lte("publish_date", today())
      .order("publish_date", { ascending: true }),
      supabase.from("reminders").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("reminder_date", today()).order("reminder_date"),
      supabase.from("expenses").select("*").eq("user_id", user.id).gte("expense_date", monthStart).order("expense_date", { ascending: false }),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
      supabase.from("loans").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("note").eq("user_id", user.id).eq("payment_method", "Kredi Taksiti").gte("expense_date", monthStart),
    ]);

    const pendingExpenses = (expenses || []).filter((item: any) => !String(item.note || "").includes("Açıklama:"));
    const unpaidFixed = (fixed || []).filter((item: any) => !paidThisMonth(item));
    const unpaidCards = (cards || []).filter((item: any) => !paidThisMonth(item) && Number(item.min_payment || 0) > 0);
    const unpaidLoans = (loans || []).filter((item: any) => Number(item.monthly_payment || 0) > 0 && !(loanPayments || []).some((payment: any) => String(payment.note || "").includes(`loan:${item.id}`)));

    setItems([
      ...(payments || []).map((x: any) => ({
        ...x,
        itemType: "payment",
        type: "Tahsilat",
        title: x.title,
        desc: `${money(Number(x.amount || 0))} bekleyen ödeme`,
        date: x.due_date,
      })),
      ...(followups || []).map((x: any) => ({
        ...x,
        itemType: "followup",
        type: "Takip",
        title: x.title,
        desc: "Bekleyen takip görevi",
        date: x.followup_date,
      })),
      ...(contents || []).map((x: any) => ({
        ...x,
        itemType: "content",
        type: "İçerik",
        title: x.content_title,
        desc: "Paylaşım kontrolü gerekiyor",
        date: x.publish_date,
      })),
      ...(reminders || []).map((x: any) => ({ ...x, itemType: "reminder", type: "Hatırlatma", title: x.title, desc: x.note || "Bugün tamamlanması gerekiyor", date: x.reminder_date })),
      ...pendingExpenses.map((x: any) => ({ ...x, itemType: "expense", type: "Harcama", title: x.title, desc: `${money(Number(x.amount || 0))} · Bu harcama ne içindi?`, date: x.expense_date, href: "/harcamalar?durum=bekleyen" })),
      ...unpaidFixed.map((x: any) => ({ ...x, itemType: "bill", type: "Fatura", title: x.title, desc: `${money(Number(x.amount || 0))} ödeme kontrolü`, date: dueDate(x.due_day), href: "/sabit-giderler" })),
      ...unpaidCards.map((x: any) => ({ ...x, itemType: "card", type: "Kart", title: `${x.bank_name} ${x.card_name || "kart"}`, desc: `${money(Number(x.min_payment || 0))} asgari ödeme`, date: dueDate(x.payment_day), href: "/kartlar" })),
      ...unpaidLoans.map((x: any) => ({ ...x, itemType: "loan", type: "Kredi", title: x.title || `${x.bank_name} kredisi`, desc: `${money(Number(x.monthly_payment || 0))} taksit`, date: dueDate(x.payment_day), href: "/krediler" })),
    ].sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function completeItem(item: any) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    if (item.itemType === "payment") {
      await supabase
        .from("payment_tracking")
        .update({ status: "ödendi", paid_date: today(), income_created: true })
        .eq("id", item.id);

      if (!item.income_created) {
      const { data: createdIncome } = await supabase.from("income").insert({
        user_id: user.id,
        title: item.title,
        amount: Number(item.amount || 0),
        income_date: today(),
        payment_method: "Bildirim merkezi",
        note: "Bildirim merkezinden ödendi yapıldı.",
      }).select().single();

      await supabase
        .from("payment_tracking")
        .update({ income_id: createdIncome?.id, income_created: true })
        .eq("id", item.id);
      }
    }

    if (item.itemType === "followup") {
      await supabase
        .from("followups")
        .update({ status: "tamamlandı" })
        .eq("id", item.id);
    }

    if (item.itemType === "reminder") {
      await supabase
        .from("reminders")
        .update({ status: "tamamlandı" })
        .eq("id", item.id);
    }

    if (item.itemType === "content") {
      await supabase
        .from("content_calendar")
        .update({ status: "tamamlandı" })
        .eq("id", item.id);

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        customer_id: item.customer_id,
        service_id: item.service_id || null,
        action_title: "İçerik paylaşıldı",
        action_detail: `${item.content_title} bildirim merkezinden tamamlandı.`,
        action_type: "tamamlandı",
      });
    }

    load();
  }

  const itemIcon = (t: string) =>
    t === "payment" ? <ILira size={18} />
      : t === "content" ? <IPlayCircle size={18} />
      : t === "expense" ? <IWallet size={18} />
      : t === "bill" ? <IReceipt size={18} />
      : t === "card" || t === "loan" ? <ICard size={18} />
      : <ICheck size={18} />;

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Bildirim" title="Bildirimler" subtitle="Bugün dikkat etmen gerekenler" />

      {/* Özet hero */}
      <section className="v-hero p-5 mb-5">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="v-overline !text-white/50 mb-1">Bekleyen bildirim</p>
            <h2 className="v-num text-[38px] font-extrabold leading-none">{items.length}</h2>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">
            <IBell size={26} />
          </div>
        </div>
      </section>

      <section className="v-stagger grid gap-2.5">
        {items.map((item, i) => (
          <div key={`${item.itemType}-${item.id}-${i}`} className="v-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${
                  item.itemType === "payment" ? "bg-[rgba(232,163,61,0.14)] text-[#a16a14]"
                  : item.itemType === "content" ? "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                  : "bg-[#e8f7f1] text-mint"
                }`}>
                  {itemIcon(item.itemType)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-mute">{item.type} · {item.date}</p>
                  <h3 className="font-bold text-sm truncate">{item.title}</h3>
                  <p className="text-mute text-xs font-medium truncate">{item.desc}</p>
                </div>
              </div>
            </div>

            {item.href ? (
              <Link href={item.href} className="v-btn v-btn-dark w-full mt-3 !py-3 !text-[13px]">
                İncele ve tamamla
              </Link>
            ) : (
              <button onClick={() => completeItem(item)} className="v-btn v-btn-dark w-full mt-3 !py-3 !text-[13px]">
                <ICheck size={15} />
                {item.itemType === "payment" ? "Ödendi Yap" : item.itemType === "content" ? "Paylaşıldı Yap" : "Tamamlandı Yap"}
              </button>
            )}
          </div>
        ))}

        {!loading && items.length === 0 && (
          <EmptyState icon={<ICheckCircle size={24} />} title="Bugün için bekleyen bildirim yok" hint="Her şey kontrol altında." />
        )}
      </section>
    </main>
  );
}
