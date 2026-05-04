"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function MusterilerPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setCustomers(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCustomer() {
    if (!name.trim()) {
      alert("Müşteri adı gir.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("customers").insert({
      user_id: userData.user?.id,
      name,
      brand_name: brand || name,
      phone,
      notes: note,
      status: "aktif müşteri",
      source: "manuel",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setBrand("");
    setPhone("");
    setNote("");
    load();
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-4xl font-black">Müşteriler</h1>
          <p className="text-slate-500">Ekle, düzenle ve takip et</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-2xl font-black mb-4">Yeni Müşteri</h2>

        <div className="grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Müşteri adı" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marka adı" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not" className="bg-slate-100 rounded-2xl p-4 outline-none" />

          <button onClick={addCustomer} className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black">
            Müşteri Ekle
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-black tracking-wide text-slate-700 mb-3">AKTİF MÜŞTERİLER</h2>

        <div className="grid gap-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/musteriler/${c.id}`} className="bg-white rounded-[26px] p-4 shadow-sm block">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black">{c.brand_name || c.name}</h3>
                  <p className="text-slate-500 mt-1">{c.phone || "Telefon yok"}</p>
                  {c.notes && <p className="text-slate-500 text-sm mt-3 line-clamp-2">{c.notes}</p>}
                </div>

                <span className="bg-[#61aebd]/10 text-[#61aebd] rounded-full px-3 py-2 text-xs font-black">
                  aktif
                </span>
              </div>
            </Link>
          ))}

          {customers.length === 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-slate-500">
              Henüz müşteri yok.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
