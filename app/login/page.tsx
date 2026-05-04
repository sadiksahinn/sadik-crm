"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    if (!email || !password) {
      alert("E-posta ve şifre gir.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function register() {
    if (!email || !password) {
      alert("E-posta ve şifre gir.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Hesap oluşturuldu. Mailine gelen onay bağlantısına tıkla, sonra giriş yap.");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-6 py-10 flex flex-col justify-center">
      <div className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
        <div className="relative h-24 w-full mb-8">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain" priority />
        </div>

        <h1 className="text-4xl font-black text-slate-950">Hoş geldin 👋</h1>
        <p className="text-slate-500 mt-2 mb-6">Valkea Assistant hesabına giriş yap.</p>

        <div className="grid gap-3">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <button
            onClick={login}
            className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black"
          >
            Giriş Yap
          </button>

          <button
            onClick={register}
            className="bg-slate-950 text-white rounded-2xl p-4 font-black"
          >
            İlk Kez Hesap Oluştur
          </button>
        </div>
      </div>
    </main>
  );
}
