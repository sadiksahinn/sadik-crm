"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient();

type Mode = "login" | "register" | "check-email";

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;
const SOFT   = { type: "spring", stiffness: 300, damping: 24 } as const;

function turkishError(msg: string): string {
  if (msg.includes("Invalid login credentials"))  return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed"))         return "E-postanı henüz doğrulamadın. Gelen kutunu kontrol et.";
  if (msg.includes("User already registered"))     return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  if (msg.includes("Password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (msg.includes("invalid format") || msg.includes("valid email") || msg.includes("is invalid"))
    return "Geçerli bir e-posta adresi gir.";
  if (msg.includes("Too many requests"))           return "Çok fazla deneme yaptın. Biraz bekle.";
  return msg;
}

/* Sıralı giriş animasyonu — her alan için delay */
function Field({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  );
}

/* Animasyonlu onay işareti */
function AnimatedCheck() {
  return (
    <div className="relative flex items-center justify-center h-24">
      {/* Pulsing glow halkası */}
      <motion.div
        className="absolute rounded-[30px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53]"
        initial={{ width: 80, height: 80, opacity: 0.7 }}
        animate={{ width: 100, height: 100, opacity: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
      />
      {/* İkinci halka — offset */}
      <motion.div
        className="absolute rounded-[28px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53]"
        initial={{ width: 80, height: 80, opacity: 0.4 }}
        animate={{ width: 96, height: 96, opacity: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
      />
      {/* Kart */}
      <motion.div
        className="relative z-10 h-20 w-20 rounded-[24px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53] flex items-center justify-center shadow-[0_8px_32px_rgba(97,174,189,0.5)]"
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...SOFT, delay: 0.1 }}
      >
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <motion.path
            d="M8 20 L16 28 L32 12"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.45, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode]           = useState<Mode>("login");
  const [direction, setDirection] = useState(1);
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error"))
      setError("E-posta doğrulama başarısız. Tekrar kayıt olmayı dene.");
  }, []);

  function goTo(next: Mode, dir = 1) {
    setDirection(dir);
    setError("");
    setMode(next);
  }

  async function handleLogin() {
    if (!email || !password) { setError("E-posta ve şifre gir."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    window.location.href = "/";
  }

  async function handleRegister() {
    if (!fullName.trim())            { setError("Ad soyad gir."); return; }
    if (!email)                      { setError("E-posta adresi gir."); return; }
    if (!password || password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    setError(""); setLoading(true);
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
    goTo("check-email", 1);
  }

  /* Mod geçiş animasyonu */
  const enterX  = direction > 0 ?  56 : -56;
  const exitX   = direction > 0 ? -56 :  56;

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-6 py-10 flex flex-col justify-center overflow-hidden">

      {/* Logo */}
      <motion.div
        className="relative h-20 w-full mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SOFT}
      >
        <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain" priority />
      </motion.div>

      {/* Kart alanı */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ── GİRİŞ ── */}
          {mode === "login" && (
            <motion.div
              key="login"
              initial={{ x: enterX, opacity: 0, scale: 0.97 }}
              animate={{ x: 0, opacity: 1, scale: 1, transition: SPRING }}
              exit={{ x: exitX, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]"
            >
              <Field delay={0}>
                <h1 className="text-4xl font-black text-slate-950">Hoş geldin 👋</h1>
                <p className="text-slate-500 mt-1 mb-6">Hesabına giriş yap.</p>
              </Field>

              <div className="grid gap-3">
                <Field delay={0.06}>
                  <input type="email" placeholder="E-posta" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>
                <Field delay={0.11}>
                  <input type="password" placeholder="Şifre" value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field delay={0.16}>
                  <motion.button onClick={handleLogin} disabled={loading}
                    className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
                    whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.015 }}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </motion.button>
                </Field>

                <Field delay={0.2}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400">veya</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                </Field>

                <Field delay={0.24}>
                  <motion.button onClick={() => goTo("register", 1)}
                    className="w-full bg-slate-100 text-slate-700 rounded-2xl p-4 font-black"
                    whileTap={{ scale: 0.97 }}>
                    İlk Kez Kayıt Ol
                  </motion.button>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ── KAYIT OL ── */}
          {mode === "register" && (
            <motion.div
              key="register"
              initial={{ x: enterX, opacity: 0, scale: 0.97 }}
              animate={{ x: 0, opacity: 1, scale: 1, transition: SPRING }}
              exit={{ x: exitX, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]"
            >
              <Field delay={0}>
                <h1 className="text-4xl font-black text-slate-950">Hesap oluştur</h1>
                <p className="text-slate-500 mt-1 mb-6">Valkea Assistant'a kayıt ol.</p>
              </Field>

              <div className="grid gap-3">
                <Field delay={0.06}>
                  <input type="text" placeholder="Ad Soyad" value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(""); }}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>
                <Field delay={0.11}>
                  <input type="email" placeholder="E-posta" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>
                <Field delay={0.16}>
                  <input type="password" placeholder="Şifre (en az 6 karakter)" value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field delay={0.2}>
                  <motion.button onClick={handleRegister} disabled={loading}
                    className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
                    whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.015 }}>
                    {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                  </motion.button>
                </Field>

                <Field delay={0.24}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400">veya</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                </Field>

                <Field delay={0.28}>
                  <motion.button onClick={() => goTo("login", -1)}
                    className="w-full bg-slate-100 text-slate-700 rounded-2xl p-4 font-black"
                    whileTap={{ scale: 0.97 }}>
                    Zaten hesabım var — Giriş Yap
                  </motion.button>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ── E-POSTA KONTROL ET ── */}
          {mode === "check-email" && (
            <motion.div
              key="check-email"
              initial={{ x: enterX, opacity: 0, scale: 0.97 }}
              animate={{ x: 0, opacity: 1, scale: 1, transition: SPRING }}
              exit={{ x: exitX, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              className="bg-white rounded-[36px] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.10)] text-center"
            >
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                <AnimatedCheck />
              </motion.div>

              <motion.h1
                className="text-2xl font-black text-slate-950 mb-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SOFT, delay: 0.5 }}
              >
                E-postanı kontrol et
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}
              >
                <p className="text-slate-500 mb-1">
                  <span className="font-black text-slate-700">{email}</span> adresine
                </p>
                <p className="text-slate-500 mb-5">
                  bir doğrulama bağlantısı gönderdik.
                </p>
                <p className="text-xs text-slate-400 mb-7">
                  Mail gelmedi mi? Spam klasörünü kontrol et ya da birkaç dakika bekle.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.66 }}
              >
                <motion.button
                  onClick={() => goTo("login", -1)}
                  className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black"
                  whileTap={{ scale: 0.97 }}
                >
                  Giriş Ekranına Dön
                </motion.button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
