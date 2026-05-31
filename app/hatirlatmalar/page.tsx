"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

function today() { return new Date().toISOString().slice(0, 10); }

type Item = { id: string; title: string; date: string; status: string; priority?: string; description?: string; source: "followup" | "reminder" };

export default function HatirlatmalarPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"bekliyor" | "tamamlandı" | "tümü">("bekliyor");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(today());
  const [priority, setPriority] = useState("normal");

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { window.location.href = "/login"; return; }

    const [{ data: followups }, { data: reminders }] = await Promise.all([
      supabase.from("followups").select("*").eq("user_id", user.id).order("followup_date", { ascending: true }),
      supabase.from("reminders").select("*").eq("user_id", user.id).order("reminder_date", { ascending: true }),
    ]);

    const combined: Item[] = [
      ...(followups || []).map((x: any) => ({
        id: `f-${x.id}`,
        title: x.title,
        date: x.followup_date,
        status: x.status,
        priority: x.priority,
        description: x.description || x.message_suggestion,
        source: "followup" as const,
        _raw: x,
      })),
      ...(reminders || []).map((x: any) => ({
        id: `r-${x.id}`,
        title: x.title,
        date: x.reminder_date,
        status: x.status,
        description: x.note,
        source: "reminder" as const,
        _raw: x,
      })),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    setItems(combined as any);
  }

  useEffect(() => { load(); }, []);

  async function saveReminder() {
    if (!title.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase.from("followups").insert({ user_id: user.id, title, description: detail, followup_date: date, status: "bekliyor", priority });
    setTitle(""); setDetail(""); setDate(today()); setPriority("normal");
    load();
  }

  async function completeItem(item: any) {
    const table = item.source === "followup" ? "followups" : "reminders";
    const rawId = item._raw.id;
    await supabase.from(table).update({ status: "tamamlandı" }).eq("id", rawId);
    load();
  }

  async function deleteItem(item: any) {
    if (!confirm("Bu hatırlatma silinsin mi?")) return;
    const table = item.source === "followup" ? "followups" : "reminders";
    await supabase.from(table).delete().eq("id", item._raw.id);
    load();
  }

  const filtered = filter === "tümü" ? items : items.filter(i => i.status === filter);
  const pendingCount = items.filter(i => i.status === "bekliyor").length;

  return (
    <main className="min-h-screen bg-[#F5F6FA] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#1E3A5F] text-xs font-black tracking-wide">VALKEA TASKS</p>
          <h1 className="text-3xl font-black">Hatırlatmalar</h1>
          <p className="text-slate-500">{pendingCount} bekleyen görev</p>
        </div>
        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
      </header>

      {/* Yeni hatırlatma */}
      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-xl font-black mb-4">Yeni Hatırlatma</h2>
        <div className="grid gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" className="bg-slate-100 rounded-2xl p-4 outline-none text-sm" />
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Açıklama (isteğe bağlı)" rows={2} className="bg-slate-100 rounded-2xl p-4 outline-none text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-100 rounded-2xl p-4 outline-none text-sm" />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-slate-100 rounded-2xl p-4 outline-none text-sm">
              <option value="normal">Normal</option>
              <option value="önemli">Önemli</option>
              <option value="acil">Acil</option>
            </select>
          </div>
          <button onClick={saveReminder} className="bg-gradient-to-r from-[#0B1437] to-[#1E3A5F] text-white rounded-2xl p-4 font-black">
            Kaydet
          </button>
        </div>
      </section>

      {/* Filtre */}
      <div className="flex gap-2 mb-4">
        {(["bekliyor", "tamamlandı", "tümü"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-black transition-colors ${filter === f ? "bg-[#0B1437] text-white" : "bg-white text-slate-500 shadow-sm"}`}
          >
            {f === "bekliyor" ? `Bekliyor (${pendingCount})` : f === "tamamlandı" ? "Tamamlandı" : "Tümü"}
          </button>
        ))}
      </div>

      {/* Liste */}
      <section className="grid gap-3">
        {filtered.map((item: any) => (
          <div key={item.id} className="bg-white rounded-[24px] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-black text-[#1E3A5F]">{item.date}</p>
                  {item.priority && item.priority !== "normal" && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.priority === "acil" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                      {item.priority}
                    </span>
                  )}
                </div>
                <h3 className="font-black">{item.title}</h3>
                {item.description && <p className="text-slate-500 text-sm mt-1">{item.description}</p>}
              </div>
              <span className={`text-xs font-black px-2 py-1 rounded-xl ${item.status === "tamamlandı" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                {item.status}
              </span>
            </div>

            {item.status !== "tamamlandı" && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => completeItem(item)} className="bg-emerald-50 text-emerald-600 rounded-2xl py-2.5 font-black text-sm">
                  ✅ Tamamlandı
                </button>
                <button onClick={() => deleteItem(item)} className="bg-red-50 text-red-500 rounded-2xl py-2.5 font-black text-sm">
                  Sil
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-[24px] p-5 shadow-sm text-slate-500 text-sm">
            {filter === "bekliyor" ? "Bekleyen hatırlatma yok." : "Bu kategoride kayıt yok."}
          </div>
        )}
      </section>
    </main>
  );
}
