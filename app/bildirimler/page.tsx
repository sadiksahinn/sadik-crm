"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, money, today } from "@/components/ui";
import { IBell, ILira, ICheck, IPlayCircle, ICheckCircle } from "@/components/Icons";

const supabase = createClient();

export default function BildirimlerPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("due_date", today())
      .order("due_date", { ascending: true });

    const { data: followups } = await supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .lte("followup_date", today())
      .order("followup_date", { ascending: true });

    const { data: contents } = await supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "planlandı")
      .lte("publish_date", today())
      .order("publish_date", { ascending: true });

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
    ]);
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
    t === "payment" ? <ILira size={18} /> : t === "content" ? <IPlayCircle size={18} /> : <ICheck size={18} />;

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

            <button
              onClick={() => completeItem(item)}
              className="v-btn v-btn-dark w-full mt-3 !py-3 !text-[13px]"
            >
              <ICheck size={15} />
              {item.itemType === "payment"
                ? "Ödendi Yap"
                : item.itemType === "content"
                ? "Paylaşıldı Yap"
                : "Tamamlandı Yap"}
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <EmptyState icon={<ICheckCircle size={24} />} title="Bugün için bekleyen bildirim yok" hint="Her şey kontrol altında." />
        )}
      </section>
    </main>
  );
}
