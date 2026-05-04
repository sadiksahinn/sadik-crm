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

export default function TakvimPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return (window.location.href = "/login");

    const { data: contents } = await supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user.id)
      .order("publish_date", { ascending: true });

    const { data: payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    const { data: followups } = await supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .order("followup_date", { ascending: true });

    setItems([
      ...(contents || []).map((x:any) => ({
        type: "İçerik",
        icon: "◉",
        title: x.content_title,
        date: x.publish_date,
        status: x.status,
      })),
      ...(payments || []).map((x:any) => ({
        type: "Tahsilat",
        icon: "₺",
        title: x.title,
        date: x.due_date,
        status: x.status,
      })),
      ...(followups || []).map((x:any) => ({
        type: "Takip",
        icon: "□",
        title: x.title,
        date: x.followup_date,
        status: x.status,
      })),
    ].sort((a,b) => String(a.date).localeCompare(String(b.date))));
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA CALENDAR</p>
          <h1 className="text-3xl font-black">Takvim</h1>
          <p className="text-slate-500">İş, ödeme ve içerik planı</p>
        </div>
        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <p className="text-slate-500 text-sm">Bugün</p>
        <h2 className="text-3xl font-black">{today()}</h2>
      </section>

      <section className="grid gap-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-[24px] p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#61aebd]/10 text-[#61aebd] grid place-items-center text-2xl font-black">
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-black text-[#e5ab53]">{item.type} · {item.date}</p>
                <h3 className="font-black">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.status || "planlandı"}</p>
              </div>
            </div>
            <span className="text-slate-400 font-black">›</span>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-white rounded-[24px] p-5 shadow-sm text-slate-500">
            Takvimde kayıt yok.
          </div>
        )}
      </section>
    </main>
  );
}
