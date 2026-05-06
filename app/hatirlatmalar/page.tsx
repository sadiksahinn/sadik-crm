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

export default function HatirlatmalarPage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(today());
  const [priority, setPriority] = useState("normal");

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .order("followup_date", { ascending: true });

    setItems(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveReminder() {
    if (!title.trim()) {
      alert("Başlık gir.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("followups").insert({
      user_id: user.id,
      title,
      description: detail,
      followup_date: date,
      status: "bekliyor",
      priority,
    });

    if (error) {
      alert("Hatırlatma hatası: " + error.message);
      return;
    }

    setTitle("");
    setDetail("");
    setDate(today());
    setPriority("normal");
    load();
  }

  async function completeItem(item: any) {
    await supabase
      .from("followups")
      .update({ status: "tamamlandı" })
      .eq("id", item.id);

    load();
  }

  async function deleteItem(item: any) {
    if (!confirm("Bu hatırlatma silinsin mi?")) return;

    await supabase.from("followups").delete().eq("id", item.id);
    load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA TASKS</p>
          <h1 className="text-3xl font-black">Hatırlatmalar</h1>
          <p className="text-slate-500">Çekim, ödeme ve teslim planı</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-2xl font-black mb-4">Yeni Hatırlatma</h2>

        <div className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık: Suite Halı ödeme iste"
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Açıklama / detay"
            className="bg-slate-100 rounded-2xl p-4 outline-none min-h-[90px]"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          >
            <option value="normal">Normal</option>
            <option value="önemli">Önemli</option>
            <option value="acil">Acil</option>
          </select>

          <button
            onClick={saveReminder}
            className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black"
          >
            Hatırlatmayı Kaydet
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-black tracking-wide text-slate-700 mb-3">
          PLANLANANLAR
        </h2>

        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-[24px] p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#61aebd]">
                    {item.followup_date} · {item.priority || "normal"}
                  </p>
                  <h3 className="font-black">{item.title}</h3>
                  {item.description && (
                    <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                  )}
                  <p className={item.status === "tamamlandı" ? "text-emerald-600 font-black mt-2" : "text-red-500 font-black mt-2"}>
                    {item.status}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                {item.status !== "tamamlandı" ? (
                  <button
                    onClick={() => completeItem(item)}
                    className="bg-emerald-50 text-emerald-600 rounded-xl p-3 font-black"
                  >
                    Tamamlandı
                  </button>
                ) : (
                  <div className="bg-slate-100 rounded-xl p-3 font-black text-center">
                    Tamam
                  </div>
                )}

                <button
                  onClick={() => deleteItem(item)}
                  className="bg-red-50 text-red-600 rounded-xl p-3 font-black"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="bg-white rounded-[24px] p-5 shadow-sm text-slate-500">
              Henüz hatırlatma yok.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
