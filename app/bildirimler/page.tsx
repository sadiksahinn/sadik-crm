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
        type: "Tahsilat",
        icon: "₺",
        title: x.title,
        desc: `${money(Number(x.amount || 0))} bekleyen ödeme`,
        date: x.due_date,
        href: "/tahsilatlar",
      })),
      ...(followups || []).map((x: any) => ({
        type: "Takip",
        icon: "□",
        title: x.title,
        desc: "Bekleyen takip görevi",
        date: x.followup_date,
        href: "/hatirlatmalar",
      })),
      ...(contents || []).map((x: any) => ({
        type: "İçerik",
        icon: "◉",
        title: x.content_title,
        desc: "Paylaşım kontrolü gerekiyor",
        date: x.publish_date,
        href: "/musteriler",
      })),
    ]);
  }

  useEffect(() => {
    load();
  }, []);

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
          <Link
            key={i}
            href={item.href}
            className="bg-white rounded-[24px] p-4 shadow-sm flex items-center justify-between"
          >
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
          </Link>
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
