"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

export default function ProfilPage() {
  const [userId, setUserId]       = useState("");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("user");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle]       = useState("");
  const [iban, setIban]               = useState("");
  const [bankName, setBankName]       = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) return;

      // Base64 avatar varsa temizle, storage URL kullan
      setAvatarUrl(p.avatar_url?.startsWith("data:") ? "" : (p.avatar_url || ""));
      setFullName(p.full_name || "");
      setPhone(p.phone || "");
      setCompanyName(p.company_name || "");
      setJobTitle(p.job_title || "");
      setIban(p.iban || "");
      setBankName(p.bank_name || "");
      setRole(p.role || "user");
    }
    load();
  }, []);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { alert("Fotoğraf yüklenemedi: " + upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`; // cache bust

    await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setAvatarUrl(url);
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
      company_name: companyName,
      job_title: jobTitle,
      iban,
      bank_name: bankName,
    }).eq("id", userId);

    setSaving(false);
    if (error) { alert("Hata: " + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials = (fullName || email || "K")[0].toUpperCase();

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#3fa7c9] text-xs font-black tracking-wide">VALKEA ACCOUNT</p>
          <h1 className="text-3xl font-black">Profil</h1>
        </div>
        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
      </header>

      {/* Avatar */}
      <section className="bg-white rounded-[28px] p-5 shadow-sm mb-4 flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()} className="relative flex-shrink-0">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-[#3fa7c9] to-[#e0a23c] grid place-items-center text-slate-950 text-3xl font-black">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="absolute bottom-0 right-0 h-6 w-6 bg-white rounded-full shadow flex items-center justify-center text-sm">
            {uploading ? "⏳" : "📷"}
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />

        <div className="min-w-0">
          <p className="font-black text-lg truncate">{fullName || "İsim girilmedi"}</p>
          <p className="text-slate-500 text-sm truncate">{email}</p>
          <span className="text-xs font-black px-2 py-1 rounded-full bg-[#3fa7c9]/10 text-[#3fa7c9] mt-1 inline-block">
            {role === "superadmin" ? "Superadmin" : "Kullanıcı"}
          </span>
        </div>
      </section>

      {/* Kişisel bilgiler */}
      <section className="bg-white rounded-[28px] p-5 shadow-sm mb-4">
        <p className="font-black mb-3">Kişisel Bilgiler</p>
        <div className="grid gap-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Şirket / Marka adı" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Görev / Ünvan" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
        </div>
      </section>

      {/* Fatura bilgileri */}
      <section className="bg-white rounded-[28px] p-5 shadow-sm mb-4">
        <p className="font-black mb-1">Fatura & Ödeme Bilgileri</p>
        <p className="text-xs text-slate-400 mb-3">Fatura oluşturulurken otomatik kullanılır</p>
        <div className="grid gap-3">
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Banka adı" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm" />
          <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN (TR...)" className="bg-slate-100 rounded-2xl px-4 py-3 outline-none text-sm font-mono" />
        </div>
      </section>

      {/* E-posta bilgisi */}
      <section className="bg-white rounded-[28px] p-4 shadow-sm mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">E-posta</p>
          <p className="font-black text-sm">{email}</p>
        </div>
        <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600">Doğrulandı</span>
      </section>

      {/* Kaydet */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-gradient-to-r from-[#3fa7c9] to-[#e0a23c] text-white rounded-2xl py-4 font-black mb-3 disabled:opacity-60"
      >
        {saving ? "Kaydediliyor..." : saved ? "✅ Kaydedildi" : "Kaydet"}
      </button>

      {role === "superadmin" && (
        <Link href="/admin" className="block w-full bg-white text-slate-700 rounded-2xl py-4 font-black text-center shadow-sm mb-3">
          Admin Panel
        </Link>
      )}

      <button onClick={logout} className="w-full bg-red-50 text-red-500 rounded-2xl py-4 font-black">
        Çıkış Yap
      </button>
    </main>
  );
}
