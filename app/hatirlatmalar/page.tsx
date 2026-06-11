"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, EmptyState, today } from "@/components/ui";
import { ICheck, ITrash, ICheckCircle, IPlus } from "@/components/Icons";

const supabase = createClient();

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
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Görevler" title="Hatırlatmalar" subtitle={`${pendingCount} bekleyen görev`} />

      {/* Yeni hatırlatma */}
      <section className="v-card p-4 mb-5">
        <h2 className="font-extrabold tracking-tight mb-3">Yeni Hatırlatma</h2>
        <div className="grid gap-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" className="v-input" />
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Açıklama (isteğe bağlı)" rows={2} className="v-input resize-none" />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="v-input" />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="v-input">
              <option value="normal">Normal</option>
              <option value="önemli">Önemli</option>
              <option value="acil">Acil</option>
            </select>
          </div>
          <button onClick={saveReminder} className="v-btn v-btn-dark w-full">
            <IPlus size={17} /> Kaydet
          </button>
        </div>
      </section>

      {/* Filtre */}
      <div className="v-seg mb-4">
        {(["bekliyor", "tamamlandı", "tümü"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`v-seg-btn ${filter === f ? "active" : ""}`}
          >
            {f === "bekliyor" ? `Bekliyor (${pendingCount})` : f === "tamamlandı" ? "Tamamlandı" : "Tümü"}
          </button>
        ))}
      </div>

      {/* Liste */}
      <section className="grid gap-2.5">
        {filtered.map((item: any) => (
          <div key={item.id} className="v-card p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="v-num text-xs font-extrabold text-teal-deep">{item.date}</p>
                  {item.priority && item.priority !== "normal" && (
                    <span className={`v-chip !text-[10px] !px-2 !py-0.5 ${item.priority === "acil" ? "v-chip-rose" : "v-chip-amber"}`}>
                      {item.priority}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[15px]">{item.title}</h3>
                {item.description && <p className="text-sub text-sm font-medium mt-1">{item.description}</p>}
              </div>
              <span className={`v-chip shrink-0 ${item.status === "tamamlandı" ? "v-chip-mint" : "v-chip-amber"}`}>
                {item.status}
              </span>
            </div>

            {item.status !== "tamamlandı" && (
              <div className="flex gap-2">
                <button onClick={() => completeItem(item)} className="v-btn v-btn-mint flex-1 !py-2.5 !text-[13px]">
                  <ICheck size={15} /> Tamamlandı
                </button>
                <button onClick={() => deleteItem(item)} className="v-btn v-btn-rose !py-2.5 !px-4 !text-[13px]">
                  <ITrash size={15} />
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <EmptyState
            icon={<ICheckCircle size={24} />}
            title={filter === "bekliyor" ? "Bekleyen hatırlatma yok" : "Bu kategoride kayıt yok"}
          />
        )}
      </section>
    </main>
  );
}
