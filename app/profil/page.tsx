"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ICamera, ICheck, ILogout, IShield, ICheckCircle } from "@/components/Icons";

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
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Hesap" title="Profil" subtitle="Hesap ve fatura bilgilerin" />

      {/* Profil hero */}
      <section className="v-hero p-5 mb-4">
        <div className="relative z-10 flex items-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="v-press relative shrink-0">
            <div className="h-20 w-20 rounded-[26px] overflow-hidden bg-gradient-to-br from-teal to-amber grid place-items-center text-white text-3xl font-extrabold border-2 border-white/20">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                : initials}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-white rounded-full shadow grid place-items-center text-ink">
              {uploading ? <span className="h-3 w-3 rounded-full border-2 border-teal border-t-transparent animate-spin" /> : <ICamera size={13} />}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />

          <div className="min-w-0">
            <p className="font-extrabold text-lg truncate">{fullName || "İsim girilmedi"}</p>
            <p className="text-white/55 text-sm font-medium truncate">{email}</p>
            <span className="v-chip mt-1.5 bg-white/10 text-white/80 border border-white/10">
              {role === "superadmin" ? "Superadmin" : "Kullanıcı"}
            </span>
          </div>
        </div>
      </section>

      {/* Kişisel bilgiler */}
      <section className="v-card p-4 mb-4">
        <p className="font-extrabold tracking-tight mb-3">Kişisel Bilgiler</p>
        <div className="grid gap-2.5">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" className="v-input" />
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Şirket / Marka adı" className="v-input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Görev / Ünvan" className="v-input" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="v-input" />
          </div>
        </div>
      </section>

      {/* Fatura bilgileri */}
      <section className="v-card p-4 mb-4">
        <p className="font-extrabold tracking-tight mb-0.5">Fatura & Ödeme Bilgileri</p>
        <p className="text-xs text-mute font-medium mb-3">Fatura oluşturulurken otomatik kullanılır</p>
        <div className="grid gap-2.5">
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Banka adı" className="v-input" />
          <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN (TR...)" className="v-input font-mono" />
        </div>
      </section>

      {/* E-posta bilgisi */}
      <section className="v-card p-4 mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="v-overline mb-0.5">E-posta</p>
          <p className="font-bold text-sm truncate">{email}</p>
        </div>
        <span className="v-chip v-chip-mint shrink-0"><ICheckCircle size={13} /> Doğrulandı</span>
      </section>

      {/* Kaydet */}
      <button onClick={save} disabled={saving} className="v-btn v-btn-dark w-full mb-3">
        {saving ? "Kaydediliyor..." : saved ? <><ICheck size={17} /> Kaydedildi</> : "Kaydet"}
      </button>

      {role === "superadmin" && (
        <Link href="/admin" className="v-btn v-btn-white w-full mb-3">
          <IShield size={17} /> Admin Panel
        </Link>
      )}

      <button onClick={logout} className="v-btn v-btn-rose w-full">
        <ILogout size={17} /> Çıkış Yap
      </button>
    </main>
  );
}
