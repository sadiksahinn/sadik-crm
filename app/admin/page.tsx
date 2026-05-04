"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  async function loadAdmin() {
    const { data: userData } = await supabase.auth.getUser();

    const { data: userData } = await supabase.auth.getUser();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAllowed(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: customerData } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: incomeData } = await supabase
      .from("income")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    setProfiles(profileData || []);
    setCustomers(customerData || []);
    setIncomes(incomeData || []);
    setExpenses(expenseData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  async function changeRole(id: string, role: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAdmin();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fc] grid place-items-center">
        <p className="text-slate-500 font-bold">Admin panel açılıyor...</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#f7f8fc] grid place-items-center px-5">
        <div className="bg-white rounded-[28px] p-6 shadow-sm text-center">
          <h1 className="text-3xl font-black mb-2">Yetkisiz Erişim</h1>
          <p className="text-slate-500 mb-5">Bu alan sadece superadmin içindir.</p>
          <Link href="/" className="bg-slate-950 text-white rounded-2xl px-5 py-3 font-bold">
            Ana Sayfaya Dön
          </Link>
        </div>
      </main>
    );
  }

  const totalIncome = incomes.reduce((t, i) => t + Number(i.amount), 0);
  const totalExpense = expenses.reduce((t, i) => t + Number(i.amount), 0);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">Super Admin</h1>
          <p className="text-slate-500 text-sm">Kullanıcı ve sistem yönetimi</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-[22px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Kullanıcı</p>
          <h2 className="text-2xl font-black">{profiles.length}</h2>
        </div>

        <div className="bg-white rounded-[22px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Müşteri</p>
          <h2 className="text-2xl font-black">{customers.length}</h2>
        </div>

        <div className="bg-white rounded-[22px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Toplam Gelir</p>
          <h2 className="text-xl font-black text-emerald-600">{money(totalIncome)}</h2>
        </div>

        <div className="bg-white rounded-[22px] p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Toplam Gider</p>
          <h2 className="text-xl font-black text-red-500">{money(totalExpense)}</h2>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">
          KULLANICILAR
        </h2>

        <div className="grid gap-3">
          {profiles.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-black">{user.email}</h3>
              <p className="text-slate-500 text-sm mb-3">Rol: {user.role}</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => changeRole(user.id, "user")}
                  className="bg-slate-100 rounded-xl p-3 font-bold"
                >
                  User Yap
                </button>

                <button
                  onClick={() => changeRole(user.id, "superadmin")}
                  className="bg-slate-950 text-white rounded-xl p-3 font-bold"
                >
                  Superadmin Yap
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">
          SON MÜŞTERİLER
        </h2>

        <div className="grid gap-3">
          {customers.slice(0, 8).map((customer) => (
            <div key={customer.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-black">{customer.brand_name || customer.name}</h3>
              <p className="text-slate-500 text-sm">{customer.phone || "Telefon yok"}</p>
              <p className="text-slate-400 text-xs mt-1">{customer.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">
          SON FİNANS KAYITLARI
        </h2>

        <div className="grid gap-3">
          {[
            ...incomes.map((i) => ({ ...i, type: "gelir" })),
            ...expenses.map((e) => ({ ...e, type: "gider" })),
          ]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
            .map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between">
                <div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="text-slate-500 text-sm">{item.type}</p>
                </div>

                <p className={item.type === "gelir" ? "font-black text-emerald-600" : "font-black text-red-500"}>
                  {item.type === "gelir" ? "+" : "-"}{money(Number(item.amount))}
                </p>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
