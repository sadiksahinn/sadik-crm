"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const customer = {
      name: String(form.get("name") || ""),
      brand_name: String(form.get("brand_name") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      instagram: String(form.get("instagram") || ""),
      sector: String(form.get("sector") || ""),
      status: String(form.get("status") || "potansiyel"),
      source: String(form.get("source") || ""),
      notes: String(form.get("notes") || ""),
    };

    const { error } = await supabase.from("customers").insert(customer);

    setLoading(false);

    if (error) {
      alert("Hata: " + error.message);
      return;
    }

    alert("Müşteri eklendi ✅");
    router.push("/musteriler");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Yeni Müşteri</h1>
          <p className="text-zinc-400 mt-2">CRM’e müşteri ekle</p>
        </div>

        <a href="/musteriler" className="bg-zinc-900 px-4 py-2 rounded-xl">
          Geri
        </a>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
        <input name="name" required placeholder="Müşteri adı" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="brand_name" placeholder="Marka adı" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="phone" placeholder="Telefon" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="email" placeholder="E-posta" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="instagram" placeholder="Instagram" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="sector" placeholder="Sektör" className="bg-zinc-900 p-4 rounded-xl outline-none" />
        <input name="source" placeholder="Nereden geldi? Instagram / Referans / Google" className="bg-zinc-900 p-4 rounded-xl outline-none" />

        <select name="status" className="bg-zinc-900 p-4 rounded-xl outline-none">
          <option value="potansiyel">Potansiyel</option>
          <option value="aktif müşteri">Aktif müşteri</option>
          <option value="teklif gönderildi">Teklif gönderildi</option>
          <option value="ödeme bekleniyor">Ödeme bekleniyor</option>
          <option value="pasif">Pasif</option>
          <option value="sorunlu müşteri">Sorunlu müşteri</option>
        </select>

        <textarea name="notes" placeholder="Notlar" rows={5} className="bg-zinc-900 p-4 rounded-xl outline-none" />

        <button disabled={loading} className="bg-white text-black p-4 rounded-xl font-bold">
          {loading ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
        </button>
      </form>
    </main>
  );
}
