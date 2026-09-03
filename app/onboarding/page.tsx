"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { connectionErrorMessage, withTimeout } from "@/utils/async";
import { getValidSession } from "@/utils/auth-client";

const supabase = createClient();

const PROFESSIONS = [
  "Kişisel kullanım",
  "İş sahibi / girişimci",
  "Çalışan",
  "Öğrenci",
  "Serbest çalışan",
  "Sosyal Medya Yöneticisi",
  "İçerik Üreticisi",
  "Danışman",
  "Diğer",
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [profession, setProfession] = useState("");
  const [customProfession, setCustomProfession] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const session = await getValidSession(supabase);
        const user = session?.user;
        if (!user) { window.location.href = "/login"; return; }
        setUserId(user.id);
        setEmail(user.email || "");
        const { data: profile, error: profileError } = await withTimeout(supabase
          .from("profiles").select("full_name").eq("id", user.id).maybeSingle());
        if (profileError) throw profileError;
        if (profile?.full_name) setFullName(profile.full_name);
      } catch (loadError) {
        setError(connectionErrorMessage(loadError));
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    const finalProfession = profession === "Diğer" ? customProfession.trim() : profession;

    if (!fullName.trim()) { setError("Ad soyad gir."); return; }
    if (!finalProfession) { setError("Kullanım şeklini seç."); return; }
    setError("");
    setLoading(true);

    if (!userId) { setError("Oturum bilgisi yüklenemedi. Tekrar giriş yap."); setLoading(false); return; }
    try {
      const { error: err } = await withTimeout(supabase.from("profiles").upsert({
          id: userId,
          full_name: fullName.trim(),
          company_name: companyName.trim() || null,
          profession: finalProfession,
          onboarding_completed: true,
        }, { onConflict: "id" }));
      if (err) throw err;
      window.location.href = "/";
    } catch (saveError) {
      setError(connectionErrorMessage(saveError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#f3f5fa] px-5 py-6 sm:py-10 flex items-start sm:items-center">
      <section className="bg-white rounded-[34px] p-6 shadow-sm w-full max-w-[520px] mx-auto">
        <div className="relative h-16 w-40 mb-6">
          <Image src="/valkea-logo.png" alt="Valkea" fill sizes="200px" className="object-contain object-left" priority />
        </div>

        <div className="flex gap-1.5 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[#2da3c7]" : "bg-slate-100"
              }`}
            />
          ))}
        </div>

        {initialLoading && <div className="grid gap-3"><div className="skeleton h-14"/><div className="skeleton h-14"/><div className="skeleton h-14"/></div>}

        {!initialLoading && step === 1 && (
          <>
            <p className="text-[#2da3c7] font-extrabold text-xs mb-2 tracking-wide">ADIM 1 / 2</p>
            <h1 className="text-3xl font-extrabold mb-1">Seni tanıyalım 👋</h1>
            <p className="text-slate-500 mb-6">Asistanın sana adıyla seslensin ve kayıtlarını sana özel hazırlasın.</p>

            <div className="grid gap-3">
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                placeholder="Ad Soyad"
                className="v-input text-lg"
              />
              <input
                value={email}
                disabled
                className="bg-slate-50 text-slate-400 rounded-2xl p-4 outline-none"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  if (!fullName.trim()) { setError("Ad soyad gir."); return; }
                  setError("");
                  setStep(2);
                }}
                className="v-btn v-btn-dark"
              >
                Devam →
              </button>
            </div>
          </>
        )}

        {!initialLoading && step === 2 && (
          <>
            <p className="text-[#2da3c7] font-extrabold text-xs mb-2 tracking-wide">ADIM 2 / 2</p>
            <h1 className="text-3xl font-extrabold mb-1">Nasıl kullanacaksın? ✨</h1>
            <p className="text-slate-500 mb-6">Sana uygun ana ekranı ve önerileri hazırlayalım. Bunu daha sonra değiştirebilirsin.</p>

            <div className="grid gap-3">
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Şirket / marka adı (varsa)"
                className="v-input"
              />

              <div className="grid grid-cols-2 gap-2">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setProfession(p); setError(""); }}
                    className={`rounded-2xl p-3 text-sm font-extrabold text-left transition-all ${
                      profession === p
                        ? "bg-[#2da3c7] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {profession === "Diğer" && (
                <input
                  value={customProfession}
                  onChange={(e) => setCustomProfession(e.target.value)}
                  placeholder="Mesleğini yaz..."
                  className="v-input"
                />
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={save}
                disabled={loading}
                className="v-btn v-btn-dark disabled:opacity-50"
              >
                  {loading ? "Asistanın hazırlanıyor..." : "Asistanımı Hazırla ✓"}
              </button>

              <button
                onClick={() => { setStep(1); setError(""); }}
                className="text-slate-400 text-sm font-extrabold text-center"
              >
                ← Geri
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
