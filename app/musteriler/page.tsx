"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui";
import { IUsers, IPlus, IChevronRight } from "@/components/Icons";

const supabase = createClient();

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
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea CRM" title="Müşteriler" subtitle="Ekle, düzenle ve takip et" back="/is" />

      {/* Yeni müşteri */}
      <section className="v-card p-4 mb-5">
        <h2 className="font-extrabold tracking-tight mb-3">Yeni Müşteri</h2>
        <div className="grid gap-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Müşteri adı" className="v-input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marka adı" className="v-input" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="v-input" />
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı)" rows={2} className="v-input resize-none" />
          <button onClick={addCustomer} className="v-btn v-btn-dark w-full">
            <IPlus size={17} /> Müşteri Ekle
          </button>
        </div>
      </section>

      {/* Liste */}
      <h2 className="v-overline mb-3">Müşteriler ({customers.length})</h2>
      <div className="v-stagger grid gap-2.5">
        {customers.map((c) => (
          <Link key={c.id} href={`/musteriler/${c.id}`} className="v-card v-press p-4 block">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[rgba(45,163,199,0.12)] text-teal-deep grid place-items-center font-extrabold text-sm shrink-0">
                {(c.brand_name || c.name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[15px] truncate">{c.brand_name || c.name}</h3>
                <p className="text-mute text-xs font-medium">{c.phone || "Telefon yok"}</p>
                {c.notes && <p className="text-mute text-xs font-medium mt-1 line-clamp-1">{c.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="v-chip v-chip-teal">aktif</span>
                <span className="text-mute"><IChevronRight size={15} /></span>
              </div>
            </div>
          </Link>
        ))}

        {customers.length === 0 && (
          <EmptyState icon={<IUsers size={24} />} title="Henüz müşteri yok" hint="İlk müşterini yukarıdan ekle." />
        )}
      </div>
    </main>
  );
}
