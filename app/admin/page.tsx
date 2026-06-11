"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
import Link from "next/link";
import { PageHeader } from "@/components/ui";


function money(value:number){
  return new Intl.NumberFormat("tr-TR", {
    style:"currency",
    currency:"TRY",
    maximumFractionDigits:0
  }).format(value || 0);
}

export default function AdminPage(){

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    users:0,
    income:0,
    expense:0,
    payments:0
  });

  async function load(){

    const { data:userData } = await supabase.auth.getUser();
    const user = userData.user;

    if(!user){
      window.location.href="/login";
      return;
    }

    const { data:profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if(profile?.role !== "superadmin"){
      window.location.href="/";
      return;
    }

    const { data:profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending:false });

    const { data:income } = await supabase
      .from("income")
      .select("*");

    const { data:expenses } = await supabase
      .from("expenses")
      .select("*");

    const { data:payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("status", "bekliyor");

    setUsers(profiles || []);

    setTotals({
      users:(profiles || []).length,
      income:(income || []).reduce((t:any,i:any)=>t+Number(i.amount||0),0),
      expense:(expenses || []).reduce((t:any,i:any)=>t+Number(i.amount||0),0),
      payments:(payments || []).reduce((t:any,i:any)=>t+Number(i.amount||0),0),
    });

    setLoading(false);
  }

  useEffect(()=>{
    load();
  },[]);

  if(loading){
    return (
      <main className="min-h-screen bg-[#f3f5fa] grid place-items-center">
        <p className="font-extrabold text-slate-500">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">

      <PageHeader overline="Valkea Control" title="Superadmin" subtitle="Sistem geneli özet" back="/profil" />

      <section className="grid grid-cols-2 gap-3 mb-5">

        <div className="v-card p-5">
          <p className="v-overline">Kullanıcı</p>
          <h2 className="v-num text-3xl font-extrabold mt-0.5">{totals.users}</h2>
        </div>

        <div className="v-card p-5">
          <p className="v-overline">Bekleyen Tahsilat</p>
          <h2 className="text-2xl font-extrabold text-[#e8a33d]">
            {money(totals.payments)}
          </h2>
        </div>

        <div className="v-card p-5">
          <p className="v-overline">Toplam Gelir</p>
          <h2 className="text-2xl font-extrabold text-emerald-600">
            {money(totals.income)}
          </h2>
        </div>

        <div className="v-card p-5">
          <p className="v-overline">Toplam Gider</p>
          <h2 className="text-2xl font-extrabold text-red-500">
            {money(totals.expense)}
          </h2>
        </div>

      </section>

      <section className="v-card p-5">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">
            Kullanıcılar
          </h2>

          <p className="text-sm text-slate-500">
            {users.length} kayıt
          </p>
        </div>

        <div className="grid gap-3">

          {users.map((user:any)=>(

            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="v-card v-press p-4 flex items-center justify-between"
            >

              <div>
                <p className="font-extrabold">
                  {user.full_name || "İsimsiz Kullanıcı"}
                </p>

                <p className="text-sm text-slate-500">
                  {user.email}
                </p>

                <div className="flex items-center gap-2 mt-2">

                  <span className={`text-xs px-2 py-1 rounded-full font-extrabold ${
                    user.role === "superadmin"
                    ? "bg-[#2da3c7]/10 text-[#2da3c7]"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {user.role || "user"}
                  </span>

                  {user.verified && (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-extrabold">
                      doğrulandı
                    </span>
                  )}

                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">
                  kayıt tarihi
                </p>

                <p className="text-sm font-extrabold">
                  {String(user.created_at || "").slice(0,10)}
                </p>
              </div>

            </Link>

          ))}

        </div>

      </section>

    </main>
  );
}
