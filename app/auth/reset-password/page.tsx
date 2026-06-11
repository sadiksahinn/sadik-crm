"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient();
const SOFT = { type: "spring", stiffness: 300, damping: 24 } as const;

function AnimatedCheck() {
  return (
    <div className="relative flex items-center justify-center h-24">
      <motion.div className="absolute rounded-[30px] bg-gradient-to-br from-[#2da3c7] to-[#e8a33d]"
        initial={{ width: 80, height: 80, opacity: 0.7 }}
        animate={{ width: 104, height: 104, opacity: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }} />
      <motion.div
        className="relative z-10 h-20 w-20 rounded-[24px] bg-gradient-to-br from-[#2da3c7] to-[#e8a33d] flex items-center justify-center shadow-[0_8px_32px_rgba(97,174,189,0.5)]"
        initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ ...SOFT, delay: 0.1 }}>
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

export default function ResetPasswordPage() {
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [hasSession, setHasSession]   = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
      else setHasSession(true);
    });
  }, []);

  async function handleReset() {
    if (!password || password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    if (password !== confirm)             { setError("Şifreler eşleşmiyor."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }

  if (!hasSession) return null;

  return (
    <main className="min-h-screen bg-[#f3f5fa] px-6 py-10 flex flex-col justify-center overflow-hidden">
      <motion.div className="relative h-20 w-full mb-6"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={SOFT}>
        <Image src="/valkea-logo.png" alt="Valkea" fill sizes="200px" className="object-contain" priority />
      </motion.div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }} transition={SOFT}
            className="bg-white rounded-[36px] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

            <div className="h-14 w-14 rounded-2xl bg-[#2da3c7]/10 grid place-items-center text-3xl mb-4">🔒</div>
            <h1 className="text-3xl font-extrabold text-slate-950 mb-1">Yeni şifre</h1>
            <p className="text-slate-500 mb-6">Hesabın için yeni bir şifre belirle.</p>

            <div className="grid gap-3">
              <input type="password" placeholder="Yeni şifre (en az 6 karakter)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                className="v-input" />

              <input type="password" placeholder="Şifreyi tekrar gir"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                className="v-input" />

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button onClick={handleReset} disabled={loading}
                className="v-btn v-btn-dark disabled:opacity-50"
                whileTap={{ scale: 0.97 }}>
                {loading ? "Kaydediliyor..." : "Şifremi Güncelle"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="success"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={SOFT}
            className="bg-white rounded-[36px] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.10)] text-center">
            <div className="flex justify-center mb-5">
              <AnimatedCheck />
            </div>
            <motion.h1 className="text-2xl font-extrabold text-slate-950 mb-2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...SOFT, delay: 0.5 }}>
              Şifre güncellendi
            </motion.h1>
            <motion.p className="text-slate-500"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              Ana sayfaya yönlendiriliyorsun...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
