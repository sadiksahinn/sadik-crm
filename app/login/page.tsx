"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

const supabase = createClient();

type Mode = "login" | "register" | "check-email";

function turkishError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed"))
    return "E-postanı henüz doğrulamadın. Gelen kutunu kontrol et.";
  if (msg.includes("User already registered"))
    return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  if (msg.includes("Password should be at least"))
    return "Şifre en az 6 karakter olmalı.";
  if (msg.includes("invalid format") || msg.includes("valid email"))
    return "Geçerli bir e-posta adresi gir.";
  if (msg.includes("Too many requests"))
    return "Çok fazla deneme yaptın. Biraz bekle.";
  if (msg.includes("auth"))
    return "E-posta doğrulama başarısız. Tekrar dene.";
  return msg;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError("E-posta doğrulama başarısız. Tekrar kayıt olmayı dene.");
    }
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError("E-posta ve şifre gir."); return; }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    window.location.href = "/";
  }

  async function handleRegister() {
    if (!fullName.trim()) { setError("Ad soyad gir."); return; }
    if (!email) { setError("E-posta adresi gir."); return; }
    if (!password || password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    setMode("check-email");
  }

  if (mode === "check-email") {
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-6 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-[36px] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.12)] text-center">
          <div className="relative h-20 w-full mb-6">
            <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain" priority />
          </div>

          <div className="h-20 w-20 rounded-full bg-[#61aebd]/10 grid place-items-center text-4xl mx-auto mb-5">
            📬
          </div>

          <h1 className="text-2xl font-black text-slate-950 mb-2">E-postanı kontrol et</h1>
          <p className="text-slate-500 mb-1">
            <span className="font-black text-slate-700">{email}</span> adresine
          </p>
          <p className="text-slate-500 mb-6">
            bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.
          </p>

          <p className="text-xs text-slate-400 mb-6">
            Mail gelmedi mi? Spam klasörünü kontrol et ya da birkaç dakika bekle.
          </p>

          <button
            onClick={() => { setMode("login"); setPassword(""); setError(""); }}
            className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black"
          >
            Giriş Ekranına Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-6 py-10 flex flex-col justify-center">
      <div className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
        <div className="relative h-24 w-full mb-6">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain" priority />
        </div>

        {mode === "login" ? (
          <>
            <h1 className="text-4xl font-black text-slate-950">Hoş geldin 👋</h1>
            <p className="text-slate-500 mt-1 mb-6">Hesabına giriş yap.</p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black text-slate-950">Hesap oluştur</h1>
            <p className="text-slate-500 mt-1 mb-6">Valkea Assistant'a kayıt ol.</p>
          </>
        )}

        <div className="grid gap-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Ad Soyad"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(""); }}
              className="bg-slate-100 rounded-2xl p-4 outline-none"
            />
          )}

          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          <input
            type="password"
            placeholder={mode === "register" ? "Şifre (en az 6 karakter)" : "Şifre"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
            className="bg-slate-100 rounded-2xl p-4 outline-none"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
            >
              {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
            </button>
          )}

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">veya</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {mode === "login" ? (
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="bg-slate-100 text-slate-700 rounded-2xl p-4 font-black"
            >
              İlk Kez Kayıt Ol
            </button>
          ) : (
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="bg-slate-100 text-slate-700 rounded-2xl p-4 font-black"
            >
              Zaten hesabım var — Giriş Yap
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
