"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ProfilPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("user");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sentCode, setSentCode] = useState("");
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");
      setEmailVerified(!!user.email_confirmed_at);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setAvatar(profile?.avatar_url || "");
      setFullName(profile?.full_name || "");
      setPhone(profile?.phone || "");
      setCompanyName(profile?.company_name || "");
      setJobTitle(profile?.job_title || "");
      setBio(profile?.bio || "");
      setRole(profile?.role || "user");
      setPhoneVerified(!!profile?.phone_verified);
    }

    load();
  }, []);

  async function saveProfile() {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        company_name: companyName,
        job_title: jobTitle,
        bio,
        email_verified: emailVerified,
      })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profil güncellendi.");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const reader = new FileReader();

    reader.onload = async () => {
      const result = String(reader.result);
      setAvatar(result);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: result })
        .eq("id", userId);

      if (error) alert(error.message);
    };

    reader.readAsDataURL(file);
  }

  function sendPhoneCode() {
    if (!phone.trim()) {
      alert("Önce telefon numarası gir.");
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);

    alert(`Test doğrulama kodu: ${code}`);
  }

  async function verifyPhone() {
    if (!sentCode || codeInput !== sentCode) {
      alert("Kod hatalı.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        phone,
        phone_verified: true,
      })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    setPhoneVerified(true);
    alert("Telefon doğrulandı.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA ACCOUNT</p>
          <h1 className="text-4xl font-black">Profil</h1>
          <p className="text-slate-500">Hesap, doğrulama ve kişisel bilgiler</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">
          Ana
        </Link>
      </header>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-[#61aebd] to-[#e5ab53] grid place-items-center text-slate-950 text-3xl font-black">
            {avatar ? <img src={avatar} alt="Profil" className="h-full w-full object-cover" /> : (fullName || email || "K")[0]}
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-black truncate">{fullName || "Profilini tamamla"}</h2>
            <p className="text-slate-500 text-sm truncate">{email}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs font-black px-2 py-1 rounded-full bg-[#61aebd]/10 text-[#61aebd]">
                {role === "superadmin" ? "Superadmin" : "Kullanıcı"}
              </span>
              {emailVerified && (
                <span className="text-xs font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  E-posta doğrulandı
                </span>
              )}
            </div>
          </div>
        </div>

        <label className="block bg-slate-100 rounded-2xl p-4 font-black text-center">
          Profil Fotoğrafı Seç
          <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        </label>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-2xl font-black mb-4">Kişisel Bilgiler</h2>

        <div className="grid gap-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Şirket / marka adı" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Görev / ünvan" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kısa profil açıklaması" className="bg-slate-100 rounded-2xl p-4 outline-none min-h-[90px]" />

          <button onClick={saveProfile} className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black">
            Bilgileri Kaydet
          </button>
        </div>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-2xl font-black mb-4">Doğrulama</h2>

        <div className="grid gap-3">
          <div className="bg-slate-100 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-500 mb-1">E-posta</p>
            <p className="font-black">{email}</p>
            <p className={`text-sm font-black mt-2 ${emailVerified ? "text-emerald-600" : "text-red-500"}`}>
              {emailVerified ? "✓ Doğrulandı" : "Doğrulanmadı"}
            </p>
          </div>

          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon numarası" className="bg-slate-100 rounded-2xl p-4 outline-none" />

          <div className="grid grid-cols-2 gap-2">
            <button onClick={sendPhoneCode} className="bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black">
              Kod Gönder
            </button>

            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Kod" className="bg-slate-100 rounded-2xl p-4 outline-none" />
          </div>

          <button onClick={verifyPhone} className="bg-emerald-50 text-emerald-600 rounded-2xl p-4 font-black">
            {phoneVerified ? "✓ Telefon Doğrulandı" : "Telefonu Doğrula"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-[30px] p-5 shadow-sm mb-5">
        <h2 className="text-2xl font-black mb-4">Yönetim</h2>

        <div className="grid gap-3">
          {role === "superadmin" && (
            <Link href="/admin" className="block w-full bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black text-center">
              Admin Panel
            </Link>
          )}

          <button onClick={logout} className="w-full bg-red-50 text-red-600 rounded-2xl p-4 font-black">
            Çıkış Yap
          </button>
        </div>
      </section>
    </main>
  );
}
