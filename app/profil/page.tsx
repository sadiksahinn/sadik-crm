"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ProfilPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .single();

      setAvatar(profile?.avatar_url || "");
      setFullName(profile?.full_name || "Kullanıcı");
    }

    load();
  }, []);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const reader = new FileReader();

    reader.onload = async () => {
      const result = String(reader.result);
      setAvatar(result);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: result })
        .eq("id", userId);

      if (error) alert(error.message);
    };

    reader.readAsDataURL(file);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Profil</h1>
          <p className="text-slate-500 text-sm">Valkea Assistant ayarları</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[32px] p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-[#61aebd] to-[#e5ab53] grid place-items-center text-white text-3xl font-black">
            {avatar ? (
              <img src={avatar} alt="Profil" className="h-full w-full object-cover" />
            ) : (
              "S"
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black">{fullName}</h2>
            <p className="text-slate-500">{email}</p>
          </div>
        </div>

        <label className="block bg-slate-100 rounded-2xl p-4 font-bold text-center mb-3">
          Profil Fotoğrafı Seç
          <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        </label>

        <Link href="/admin" className="block w-full bg-slate-950 text-white rounded-2xl p-4 font-black text-center mb-3">
          Admin Panel
        </Link>

        <button onClick={logout} className="w-full bg-red-50 text-red-600 rounded-2xl p-4 font-black">
          Çıkış Yap
        </button>
      </section>
    </main>
  );
}
