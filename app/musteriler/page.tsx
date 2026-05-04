"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Customer = {
  id: string;
  name: string;
  brand_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  sector: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  brand_name: "",
  phone: "",
  email: "",
  instagram: "",
  sector: "",
  status: "potansiyel",
  source: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setCustomers(data);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setShowForm(true);
    setForm({
      name: customer.name || "",
      brand_name: customer.brand_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      instagram: customer.instagram || "",
      sector: customer.sector || "",
      status: customer.status || "potansiyel",
      source: customer.source || "",
      notes: customer.notes || "",
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(form)
        .eq("id", editingId);

      if (error) alert("Düzenleme hatası: " + error.message);
    } else {
      const { error } = await supabase.from("customers").insert(form);

      if (error) alert("Ekleme hatası: " + error.message);
    }

    setLoading(false);
    resetForm();
    loadCustomers();
  }

  async function deleteCustomer(id: string) {
    const ok = confirm("Bu müşteriyi silmek istediğine emin misin?");
    if (!ok) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      alert("Silme hatası: " + error.message);
      return;
    }

    loadCustomers();
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 md:p-10">
      <div className="flex justify-between items-center mb-8 gap-3">
        <div>
          <h1 className="text-4xl font-bold">Müşteriler</h1>
          <p className="text-zinc-400 mt-2">Ekle, düzenle, sil ve takip et</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setForm(emptyForm);
            }}
            className="bg-white text-black px-4 py-2 rounded-xl font-bold"
          >
            + Müşteri
          </button>

          <a href="/" className="bg-zinc-900 px-4 py-2 rounded-xl">
            Dashboard
          </a>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={saveCustomer}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 mb-8 grid gap-3"
        >
          <h2 className="text-2xl font-bold">
            {editingId ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
          </h2>

          <input required placeholder="Müşteri adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="Marka adı" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="Sektör" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />
          <input placeholder="Kaynak: Instagram / Referans / Google" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none">
            <option value="potansiyel">Potansiyel</option>
            <option value="aktif müşteri">Aktif müşteri</option>
            <option value="teklif gönderildi">Teklif gönderildi</option>
            <option value="ödeme bekleniyor">Ödeme bekleniyor</option>
            <option value="pasif">Pasif</option>
            <option value="sorunlu müşteri">Sorunlu müşteri</option>
          </select>

          <textarea placeholder="Notlar" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-zinc-900 p-4 rounded-xl outline-none" />

          <div className="grid grid-cols-2 gap-3">
            <button disabled={loading} className="bg-white text-black p-4 rounded-xl font-bold">
              {loading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
            </button>

            <button type="button" onClick={resetForm} className="bg-zinc-800 p-4 rounded-xl font-bold">
              Vazgeç
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {customer.brand_name || customer.name}
                </h2>
                <p className="text-zinc-400 mt-1">{customer.phone || "Telefon yok"}</p>
                <p className="text-zinc-500 mt-2 text-sm">{customer.notes || "Not yok"}</p>
                <p className="text-zinc-600 mt-2 text-xs">{customer.sector || "Sektör yok"}</p>
              </div>

              <span className="bg-zinc-800 px-3 py-1 rounded-full text-sm h-fit">
                {customer.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => startEdit(customer)} className="bg-zinc-800 p-3 rounded-xl">
                Düzenle
              </button>

              <button onClick={() => deleteCustomer(customer.id)} className="bg-red-950 text-red-200 p-3 rounded-xl">
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
