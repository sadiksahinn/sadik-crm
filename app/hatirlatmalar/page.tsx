"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  status: string | null;
  priority: string | null;
};

export default function HatirlatmalarPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function loadReminders() {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .order("reminder_date", { ascending: true });

    setReminders(data || []);
  }

  useEffect(() => {
    loadReminders();
  }, []);

  async function addReminder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("reminders").insert({
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      reminder_date: String(form.get("date") || today),
      reminder_time: String(form.get("time") || ""),
      priority: String(form.get("priority") || "normal"),
      status: "bekliyor",
    });

    setLoading(false);

    if (error) {
      alert("Hatırlatma hatası: " + error.message);
      return;
    }

    e.currentTarget.reset();
    loadReminders();
  }

  async function completeReminder(id: string) {
    await supabase
      .from("reminders")
      .update({ status: "tamamlandı" })
      .eq("id", id);

    loadReminders();
  }

  async function deleteReminder(id: string) {
    const ok = confirm("Bu hatırlatmayı silmek istiyor musun?");
    if (!ok) return;

    await supabase.from("reminders").delete().eq("id", id);
    loadReminders();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Hatırlatmalar</h1>
          <p className="text-slate-500 text-sm">Çekim, ödeme ve teslim planı</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[26px] p-4 shadow-sm mb-5">
        <h2 className="text-xl font-black mb-3">Yeni Hatırlatma</h2>

        <form onSubmit={addReminder} className="grid gap-3">
          <input
            name="title"
            required
            placeholder="Başlık: Suite Halı ödeme iste"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <textarea
            name="description"
            placeholder="Açıklama / detay"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              name="date"
              type="date"
              defaultValue={today}
              className="bg-slate-100 rounded-2xl p-4 outline-none"
            />

            <input
              name="time"
              type="time"
              className="bg-slate-100 rounded-2xl p-4 outline-none"
            />
          </div>

          <select
            name="priority"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          >
            <option value="normal">Normal</option>
            <option value="önemli">Önemli</option>
            <option value="acil">Acil</option>
          </select>

          <button
            disabled={loading}
            className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black"
          >
            {loading ? "Kaydediliyor..." : "Hatırlatmayı Kaydet"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">
          PLANLANANLAR
        </h2>

        <div className="grid gap-3">
          {reminders.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border ${
                item.status === "tamamlandı"
                  ? "border-emerald-100 opacity-60"
                  : "border-white"
              }`}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#61aebd]">
                    {item.reminder_date} {item.reminder_time || ""}
                  </p>
                  <h3 className="font-black text-lg mt-1">{item.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {item.description || "Açıklama yok"}
                  </p>
                </div>

                <span className="h-fit bg-slate-100 rounded-full px-3 py-1 text-xs font-bold">
                  {item.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => completeReminder(item.id)}
                  className="bg-slate-950 text-white rounded-2xl p-3 font-bold"
                >
                  Tamamlandı
                </button>

                <button
                  onClick={() => deleteReminder(item.id)}
                  className="bg-red-50 text-red-600 rounded-2xl p-3 font-bold"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}

          {reminders.length === 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm text-slate-500">
              Henüz hatırlatma yok.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
