"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

const supabase = createClient();

const PROFESSIONS = [
  "Sosyal Medya Yöneticisi",
  "İçerik Üreticisi",
  "Dijital Pazarlama Uzmanı",
  "Grafik Tasarımcı",
  "Video Editör",
  "Fotoğrafçı",
  "Serbest Danışman",
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);
      setEmail(user.email || "");
      // Trigger'dan gelen full_name varsa prefill et
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setFullName(profile.full_name);
    }
    load();
  }, []);

  async function save() {
    const finalProfession = profession === "Diğer" ? customProfession.trim() : profession;

    if (!fullName.trim()) { setError("Ad soyad gir."); return; }
    if (!finalProfession) { setError("Mesleğini seç."); return; }
    setError("");
    setLoading(true);

    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        profession: finalProfession,
        onboarding_completed: true,
      })
      .eq("id", userId);

    setLoading(false);
    if (err) { setError(err.message); return; }
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-10 flex items-center">
      <section className="bg-white rounded-[34px] p-6 shadow-sm w-full">
        <div className="relative h-16 w-40 mb-6">
          <Image src="/valkea-logo.png" alt="Valkea" fill className="object-contain object-left" priority />
        </div>

        <div className="flex gap-1.5 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[#61aebd]" : "bg-slate-100"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <p className="text-[#61aebd] font-black text-xs mb-2 tracking-wide">ADIM 1 / 2</p>
            <h1 className="text-3xl font-black mb-1">Seni tanıyalım 👋</h1>
            <p className="text-slate-500 mb-6">Karşılama ve kayıtlar sana özel görünsün.</p>

            <div className="grid gap-3">
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                placeholder="Ad Soyad"
                className="bg-slate-100 rounded-2xl p-4 outline-none text-lg"
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
                className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black"
              >
                Devam →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[#61aebd] font-black text-xs mb-2 tracking-wide">ADIM 2 / 2</p>
            <h1 className="text-3xl font-black mb-1">İşini anlat 💼</h1>
            <p className="text-slate-500 mb-6">Asistan sana özel tavsiyeler üretsin.</p>

            <div className="grid gap-3">
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Şirket / Marka adı (opsiyonel)"
                className="bg-slate-100 rounded-2xl p-4 outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setProfession(p); setError(""); }}
                    className={`rounded-2xl p-3 text-sm font-black text-left transition-all ${
                      profession === p
                        ? "bg-[#61aebd] text-white"
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
                  className="bg-slate-100 rounded-2xl p-4 outline-none"
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
                className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-slate-950 rounded-2xl p-4 font-black disabled:opacity-50"
              >
                {loading ? "Kaydediliyor..." : "Profilimi Tamamla ✓"}
              </button>

              <button
                onClick={() => { setStep(1); setError(""); }}
                className="text-slate-400 text-sm font-black text-center"
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
