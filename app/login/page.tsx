"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient();

type Mode =
  | "login"
  | "register"
  | "check-email"
  | "forgot-password"
  | "reset-sent"
  | "phone"
  | "phone-otp";

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;
const SOFT   = { type: "spring", stiffness: 300, damping: 24 } as const;

function turkishError(msg: string): string {
  if (msg.includes("Invalid login credentials"))    return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed"))          return "E-postanı henüz doğrulamadın. Gelen kutunu kontrol et.";
  if (msg.includes("User already registered"))      return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  if (msg.includes("Password should be at least"))  return "Şifre en az 6 karakter olmalı.";
  if (msg.includes("invalid format") || msg.includes("valid email") || msg.includes("is invalid"))
    return "Geçerli bir e-posta adresi gir.";
  if (msg.includes("Too many requests"))            return "Çok fazla deneme yaptın. Biraz bekle.";
  if (msg.includes("Phone") || msg.includes("phone")) return "Geçerli bir telefon numarası gir.";
  if (msg.includes("Token has expired") || msg.includes("invalid"))
    return "Kod hatalı veya süresi dolmuş. Tekrar dene.";
  if (msg.includes("provider") || msg.includes("OAuth"))
    return "Giriş sağlayıcısı hatası. Tekrar dene.";
  if (msg.includes("Signups not allowed"))          return "Şu an yeni kayıt kapalı.";
  if (msg.includes("SMS"))                          return "SMS gönderilemedi. Numarayı kontrol et.";
  return msg;
}

/* ── Ortak animasyon bileşenleri ── */
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

function ErrorBox({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PrimaryBtn({
  onClick, disabled, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.015 }}
    >
      {children}
    </motion.button>
  );
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full bg-slate-100 text-slate-700 rounded-2xl p-4 font-black"
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-xs text-slate-400">veya</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* Google logosu */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* Telefon ikonu */
function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
    </svg>
  );
}

/* Animasyonlu onay ikonu */
function AnimatedCheck() {
  return (
    <div className="relative flex items-center justify-center h-24">
      <motion.div className="absolute rounded-[30px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53]"
        initial={{ width: 80, height: 80, opacity: 0.7 }}
        animate={{ width: 104, height: 104, opacity: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }} />
      <motion.div className="absolute rounded-[28px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53]"
        initial={{ width: 80, height: 80, opacity: 0.4 }}
        animate={{ width: 96, height: 96, opacity: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut", delay: 0.4 }} />
      <motion.div
        className="relative z-10 h-20 w-20 rounded-[24px] bg-gradient-to-br from-[#61aebd] to-[#e5ab53] flex items-center justify-center shadow-[0_8px_32px_rgba(97,174,189,0.5)]"
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...SOFT, delay: 0.1 }}
      >
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <motion.path d="M8 20 L16 28 L32 12" fill="none" stroke="white" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.45, ease: "easeOut" }} />
        </svg>
      </motion.div>
    </div>
  );
}

/* 6 haneli OTP kutuları */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array(6).fill("").map((_, i) => value[i] || "");

  function handleChange(idx: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    onChange(next.join(""));
    if (char && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ""; onChange(next.join(""));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`h-14 w-12 rounded-2xl text-center text-2xl font-black outline-none border-2 transition-all ${
            d ? "border-[#61aebd] bg-[#61aebd]/8 text-slate-950" : "border-slate-200 bg-slate-100 text-slate-400"
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.08 + i * 0.05 }}
        />
      ))}
    </div>
  );
}

/* ── Ana bileşen ── */
export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>("login");
  const [direction, setDir]     = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) setError("E-posta doğrulama başarısız. Tekrar kayıt olmayı dene.");
  }, []);

  function goTo(next: Mode, dir = 1) {
    setDir(dir); setError(""); setMode(next);
  }

  const eX = direction > 0 ?  56 : -56;
  const xX = direction > 0 ? -56 :  56;
  const slideIn  = { x: eX, opacity: 0, scale: 0.97 };
  const slideOut = { x: xX, opacity: 0, scale: 0.97, transition: { duration: 0.18 } };
  const slideCenter = { x: 0, opacity: 1, scale: 1, transition: SPRING };

  /* ── İşlemler ── */
  async function handleLogin() {
    if (!email || !password) { setError("E-posta ve şifre gir."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    window.location.href = "/";
  }

  async function handleRegister() {
    if (!fullName.trim())             { setError("Ad soyad gir."); return; }
    if (!email)                       { setError("E-posta adresi gir."); return; }
    if (!password || password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    goTo("check-email", 1);
  }

  async function handleGoogle() {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) setError(turkishError(err.message));
  }

  async function handleForgotPassword() {
    if (!email) { setError("E-posta adresini gir."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    goTo("reset-sent", 1);
  }

  async function handleSendOtp() {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setError("Geçerli bir telefon numarası gir."); return;
    }
    const formatted = phone.startsWith("+") ? phone : `+90${phone.replace(/^0/, "")}`;
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    goTo("phone-otp", 1);
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) { setError("6 haneli kodu gir."); return; }
    const formatted = phone.startsWith("+") ? phone : `+90${phone.replace(/^0/, "")}`;
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: formatted, token: otp, type: "sms",
    });
    setLoading(false);
    if (err) { setError(turkishError(err.message)); return; }
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-6 py-10 flex flex-col justify-center overflow-x-hidden overflow-y-auto">

      <motion.div className="relative h-20 w-full mb-6"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={SOFT}>
        <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain" priority />
      </motion.div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════ GİRİŞ */}
          {mode === "login" && (
            <motion.div key="login" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

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
                  <div className="relative">
                    <input type="password" placeholder="Şifre" value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="bg-slate-100 rounded-2xl p-4 outline-none w-full pr-36" />
                    <button
                      onClick={() => goTo("forgot-password", 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#61aebd] font-black whitespace-nowrap"
                    >
                      Şifremi unuttum
                    </button>
                  </div>
                </Field>

                <ErrorBox msg={error} />

                <Field delay={0.16}>
                  <PrimaryBtn onClick={handleLogin} disabled={loading}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </PrimaryBtn>
                </Field>

                <Field delay={0.2}><Divider /></Field>

                {/* Google */}
                <Field delay={0.23}>
                  <motion.button onClick={handleGoogle}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 font-black flex items-center justify-center gap-3 text-slate-700 hover:border-slate-200 transition-colors"
                    whileTap={{ scale: 0.97 }}>
                    <GoogleIcon />
                    Google ile Giriş Yap
                  </motion.button>
                </Field>

                {/* Telefon */}
                <Field delay={0.27}>
                  <motion.button onClick={() => goTo("phone", 1)}
                    className="w-full bg-slate-100 rounded-2xl p-4 font-black flex items-center justify-center gap-3 text-slate-700"
                    whileTap={{ scale: 0.97 }}>
                    <PhoneIcon />
                    Telefon ile Giriş Yap
                  </motion.button>
                </Field>

                <Field delay={0.31}><Divider /></Field>

                <Field delay={0.34}>
                  <SecondaryBtn onClick={() => goTo("register", 1)}>
                    İlk Kez Kayıt Ol
                  </SecondaryBtn>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════ KAYIT OL */}
          {mode === "register" && (
            <motion.div key="register" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

              <Field delay={0}>
                <h1 className="text-4xl font-black text-slate-950">Hesap oluştur</h1>
                <p className="text-slate-500 mt-1 mb-6">Valkea Assistant'a kayıt ol.</p>
              </Field>

              <div className="grid gap-3">
                {[
                  { type: "text",     ph: "Ad Soyad",                 val: fullName, set: setFullName, d: 0.06 },
                  { type: "email",    ph: "E-posta",                  val: email,    set: setEmail,    d: 0.11 },
                  { type: "password", ph: "Şifre (en az 6 karakter)", val: password, set: setPassword, d: 0.16 },
                ].map(({ type, ph, val, set, d }) => (
                  <Field key={ph} delay={d}>
                    <input type={type} placeholder={ph} value={val}
                      onChange={(e) => { set(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                  </Field>
                ))}

                <ErrorBox msg={error} />

                <Field delay={0.2}>
                  <PrimaryBtn onClick={handleRegister} disabled={loading}>
                    {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                  </PrimaryBtn>
                </Field>

                <Field delay={0.24}><Divider /></Field>

                <Field delay={0.27}>
                  <motion.button onClick={handleGoogle}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 font-black flex items-center justify-center gap-3 text-slate-700"
                    whileTap={{ scale: 0.97 }}>
                    <GoogleIcon />
                    Google ile Kayıt Ol
                  </motion.button>
                </Field>

                <Field delay={0.31}><Divider /></Field>

                <Field delay={0.34}>
                  <SecondaryBtn onClick={() => goTo("login", -1)}>
                    Zaten hesabım var — Giriş Yap
                  </SecondaryBtn>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════ ŞİFREMİ UNUTTUM */}
          {mode === "forgot-password" && (
            <motion.div key="forgot" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

              <Field delay={0}>
                <div className="h-14 w-14 rounded-2xl bg-[#61aebd]/10 grid place-items-center text-3xl mb-4">🔑</div>
                <h1 className="text-3xl font-black text-slate-950">Şifremi unuttum</h1>
                <p className="text-slate-500 mt-1 mb-6">
                  E-postanı gir, şifre sıfırlama bağlantısı gönderelim.
                </p>
              </Field>

              <div className="grid gap-3">
                <Field delay={0.08}>
                  <input type="email" placeholder="E-posta" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                    className="bg-slate-100 rounded-2xl p-4 outline-none w-full" />
                </Field>

                <ErrorBox msg={error} />

                <Field delay={0.14}>
                  <PrimaryBtn onClick={handleForgotPassword} disabled={loading}>
                    {loading ? "Gönderiliyor..." : "Sıfırlama Maili Gönder"}
                  </PrimaryBtn>
                </Field>

                <Field delay={0.18}>
                  <SecondaryBtn onClick={() => goTo("login", -1)}>
                    ← Giriş Ekranına Dön
                  </SecondaryBtn>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════ SIFIRLAMA GÖNDERİLDİ */}
          {mode === "reset-sent" && (
            <motion.div key="reset-sent" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.10)] text-center">

              <motion.div className="flex justify-center mb-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                <AnimatedCheck />
              </motion.div>

              <motion.h1 className="text-2xl font-black text-slate-950 mb-2"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...SOFT, delay: 0.5 }}>
                Mail gönderildi
              </motion.h1>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}>
                <p className="text-slate-500 mb-1">
                  <span className="font-black text-slate-700">{email}</span> adresine
                </p>
                <p className="text-slate-500 mb-5">şifre sıfırlama bağlantısı gönderdik.</p>
                <p className="text-xs text-slate-400 mb-7">
                  Mail gelmedi mi? Spam klasörünü kontrol et.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.66 }}>
                <PrimaryBtn onClick={() => goTo("login", -1)}>Giriş Ekranına Dön</PrimaryBtn>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════ KAYIT ONAY */}
          {mode === "check-email" && (
            <motion.div key="check-email" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.10)] text-center">

              <motion.div className="flex justify-center mb-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                <AnimatedCheck />
              </motion.div>

              <motion.h1 className="text-2xl font-black text-slate-950 mb-2"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...SOFT, delay: 0.5 }}>
                E-postanı kontrol et
              </motion.h1>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}>
                <p className="text-slate-500 mb-1">
                  <span className="font-black text-slate-700">{email}</span> adresine
                </p>
                <p className="text-slate-500 mb-5">bir doğrulama bağlantısı gönderdik.</p>
                <p className="text-xs text-slate-400 mb-7">
                  Mail gelmedi mi? Spam klasörünü kontrol et ya da birkaç dakika bekle.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.66 }}>
                <PrimaryBtn onClick={() => goTo("login", -1)}>Giriş Ekranına Dön</PrimaryBtn>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════ TELEFON */}
          {mode === "phone" && (
            <motion.div key="phone" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

              <Field delay={0}>
                <div className="h-14 w-14 rounded-2xl bg-[#61aebd]/10 grid place-items-center text-2xl mb-4">
                  <PhoneIcon />
                </div>
                <h1 className="text-3xl font-black text-slate-950">Telefon ile giriş</h1>
                <p className="text-slate-500 mt-1 mb-6">
                  Numarana SMS kodu gönderelim.
                </p>
              </Field>

              <div className="grid gap-3">
                <Field delay={0.08}>
                  <div className="flex gap-2">
                    <div className="bg-slate-100 rounded-2xl px-4 flex items-center font-black text-slate-600 whitespace-nowrap">
                      🇹🇷 +90
                    </div>
                    <input type="tel" placeholder="5XX XXX XX XX" value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      className="bg-slate-100 rounded-2xl p-4 outline-none flex-1" />
                  </div>
                </Field>

                <ErrorBox msg={error} />

                <Field delay={0.14}>
                  <PrimaryBtn onClick={handleSendOtp} disabled={loading}>
                    {loading ? "Gönderiliyor..." : "Kod Gönder"}
                  </PrimaryBtn>
                </Field>

                <Field delay={0.18}>
                  <SecondaryBtn onClick={() => goTo("login", -1)}>
                    ← Giriş Ekranına Dön
                  </SecondaryBtn>
                </Field>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════ OTP DOĞRULAMA */}
          {mode === "phone-otp" && (
            <motion.div key="phone-otp" initial={slideIn} animate={slideCenter} exit={slideOut}
              className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

              <Field delay={0}>
                <h1 className="text-3xl font-black text-slate-950">Kodu gir</h1>
                <p className="text-slate-500 mt-1 mb-2">
                  <span className="font-black text-slate-700">+90 {phone}</span> numarasına
                </p>
                <p className="text-slate-500 mb-6">6 haneli doğrulama kodu gönderdik.</p>
              </Field>

              <div className="grid gap-4">
                <OtpInput value={otp} onChange={setOtp} />

                <ErrorBox msg={error} />

                <Field delay={0.4}>
                  <PrimaryBtn onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
                    {loading ? "Doğrulanıyor..." : "Doğrula"}
                  </PrimaryBtn>
                </Field>

                <Field delay={0.45}>
                  <div className="text-center">
                    <button onClick={() => { setOtp(""); handleSendOtp(); }}
                      className="text-[#61aebd] font-black text-sm">
                      Kodu tekrar gönder
                    </button>
                  </div>
                </Field>

                <Field delay={0.5}>
                  <SecondaryBtn onClick={() => goTo("phone", -1)}>← Geri</SecondaryBtn>
                </Field>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
