"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
      <main className="min-h-screen bg-[#f7f8fc] grid place-items-center">
        <p className="font-black text-slate-500">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 pt-5 pb-28">

      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">
            VALKEA CONTROL
          </p>
          <h1 className="text-3xl font-black">
            Superadmin
          </h1>
        </div>

        <Link
          href="/"
          className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black"
        >
          Ana Sayfa
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-5">

        <div className="bg-white rounded-[28px] p-5 shadow-sm">
          <p className="text-slate-500 text-sm">Kullanıcı</p>
          <h2 className="text-3xl font-black">{totals.users}</h2>
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-sm">
          <p className="text-slate-500 text-sm">Bekleyen Tahsilat</p>
          <h2 className="text-2xl font-black text-[#e5ab53]">
            {money(totals.payments)}
          </h2>
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-sm">
          <p className="text-slate-500 text-sm">Toplam Gelir</p>
          <h2 className="text-2xl font-black text-emerald-600">
            {money(totals.income)}
          </h2>
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-sm">
          <p className="text-slate-500 text-sm">Toplam Gider</p>
          <h2 className="text-2xl font-black text-red-500">
            {money(totals.expense)}
          </h2>
        </div>

      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">
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
              className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between"
            >

              <div>
                <p className="font-black">
                  {user.full_name || "İsimsiz Kullanıcı"}
                </p>

                <p className="text-sm text-slate-500">
                  {user.email}
                </p>

                <div className="flex items-center gap-2 mt-2">

                  <span className={`text-xs px-2 py-1 rounded-full font-black ${
                    user.role === "superadmin"
                    ? "bg-[#61aebd]/10 text-[#61aebd]"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {user.role || "user"}
                  </span>

                  {user.verified && (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-black">
                      doğrulandı
                    </span>
                  )}

                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">
                  kayıt tarihi
                </p>

                <p className="text-sm font-black">
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
