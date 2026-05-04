"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
        icon: "₺",
        title: x.title,
        desc: `${money(Number(x.amount || 0))} bekleyen ödeme`,
        date: x.due_date,
      })),
      ...(followups || []).map((x: any) => ({
        ...x,
        itemType: "followup",
        type: "Takip",
        icon: "□",
        title: x.title,
        desc: "Bekleyen takip görevi",
        date: x.followup_date,
      })),
      ...(contents || []).map((x: any) => ({
        ...x,
        itemType: "content",
        type: "İçerik",
        icon: "◉",
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

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA ALERTS</p>
          <h1 className="text-3xl font-black">Bildirimler</h1>
          <p className="text-slate-500">Bugün dikkat etmen gerekenler</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <p className="text-slate-500 text-sm">Bekleyen bildirim</p>
        <h2 className="text-4xl font-black">{items.length}</h2>
      </section>

      <section className="grid gap-3">
        {items.map((item, i) => (
          <div key={`${item.itemType}-${item.id}-${i}`} className="bg-white rounded-[24px] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#61aebd]/10 text-[#61aebd] grid place-items-center text-2xl font-black">
                  {item.icon}
                </div>

                <div>
                  <p className="text-xs font-black text-[#e5ab53]">{item.type} · {item.date}</p>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="text-slate-500 text-sm">{item.desc}</p>
                </div>
              </div>

              <span className="text-slate-400 font-black">›</span>
            </div>

            <button
              onClick={() => completeItem(item)}
              className="mt-3 w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-3 font-black"
            >
              {item.itemType === "payment"
                ? "Ödendi Yap"
                : item.itemType === "content"
                ? "Paylaşıldı Yap"
                : "Tamamlandı Yap"}
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-white rounded-[24px] p-5 shadow-sm text-slate-500">
            Bugün için bekleyen bildirim yok.
          </div>
        )}
      </section>
    </main>
  );
}
