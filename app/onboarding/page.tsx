"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function OnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");
    }

    load();
  }, []);

  async function save() {
    if (!fullName.trim()) {
      alert("Ad soyad gir.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-10 flex items-center">
      <section className="bg-white rounded-[34px] p-6 shadow-sm w-full">
        <p className="text-purple-600 font-black text-sm mb-2">VALKEA ASSISTANT</p>
        <h1 className="text-4xl font-black mb-2">Seni tanıyalım 👋</h1>
        <p className="text-slate-500 mb-6">
          Karşılama, profil ve kayıtlar sana özel görünsün.
        </p>

        <div className="grid gap-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ad Soyad"
            className="bg-slate-100 rounded-2xl p-4 outline-none text-lg"
          />

          <input
            value={email}
            disabled
            className="bg-slate-50 text-slate-400 rounded-2xl p-4 outline-none"
          />

          <button
            onClick={save}
            className="bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400 text-white rounded-2xl p-4 font-black"
          >
            Profilimi Tamamla
          </button>
        </div>
      </section>
    </main>
  );
}
