"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ICamera, ICheck, ILogout, IShield, ICheckCircle, IBell } from "@/components/Icons";
import { connectionErrorMessage, withTimeout } from "@/utils/async";
import { clearProfilePreview, readProfilePreview, writeProfilePreview } from "@/utils/profile-cache";

const supabase = createClient();

export default function ProfilPage() {
  const [userId, setUserId]       = useState("");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("user");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pushStatus, setPushStatus] = useState<"unsupported" | "default" | "granted" | "denied">("default");

  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle]       = useState("");
  const [iban, setIban]               = useState("");
  const [bankName, setBankName]       = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setLoading(true);
      setLoadError("");
      const { data: { session } } = await withTimeout(supabase.auth.getSession());
      const user = session?.user;
      if (!user) { window.location.href = "/login"; return; }

      setUserId(user.id);
      setEmail(user.email || "");
      const fallbackName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Kullanıcı").trim();
      const cached = readProfilePreview(user.id);
      setFullName(cached?.fullName || fallbackName);
      setAvatarUrl(cached?.avatarUrl || "");
      setCompanyName(cached?.companyName || "");
      setJobTitle(cached?.profession || "");

      const { data: p, error } = await withTimeout(supabase.from("profiles")
        .select("full_name,phone,company_name,profession,iban,bank_name,avatar_url,role")
        .eq("id", user.id).maybeSingle());
      if (error) {
        setLoadError("Profil bilgileri alınamadı. Bağlantını kontrol edip tekrar dene.");
        setLoading(false);
        return;
      }

      if (!p) {
        const { data: created, error: createError } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fallbackName,
        }, { onConflict: "id" }).select("*").single();
        if (createError || !created) {
          setLoadError("Profil kaydı oluşturulamadı. Lütfen tekrar dene.");
          setLoading(false);
          return;
        }
        setFullName(created.full_name || fallbackName);
        setRole(created.role || "user");
        writeProfilePreview(user.id, {
          fullName: created.full_name || fallbackName,
          avatarUrl: "",
          companyName: "",
          profession: "",
        });
        setLoading(false);
        return;
      }

      // Base64 avatar varsa temizle, storage URL kullan
      setAvatarUrl(p.avatar_url?.startsWith("data:") ? "" : (p.avatar_url || ""));
      setFullName(p.full_name || "");
      setPhone(p.phone || "");
      setCompanyName(p.company_name || "");
      setJobTitle(p.profession || "");
      setIban(p.iban || "");
      setBankName(p.bank_name || "");
      setRole(p.role || "user");
      writeProfilePreview(user.id, {
        fullName: p.full_name || fallbackName,
        avatarUrl: p.avatar_url?.startsWith("data:") ? "" : (p.avatar_url || ""),
        companyName: p.company_name || "",
        profession: p.profession || "",
      });
    } catch (error) {
      setLoadError(connectionErrorMessage(error));
    } finally {
      setLoading(false);
    }
    }

  useEffect(() => {
    load();
    const readPushStatus = () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) setPushStatus("unsupported");
      else setPushStatus(Notification.permission);
    };
    const onStatus = () => readPushStatus();
    readPushStatus();
    window.addEventListener("valkea:push-status", onStatus);
    return () => window.removeEventListener("valkea:push-status", onStatus);
  }, []);

  function enablePush() {
    window.dispatchEvent(new Event("valkea:enable-push"));
  }

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
    writeProfilePreview(userId, { fullName, avatarUrl: url, companyName, profession: jobTitle });
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      phone,
      company_name: companyName,
      profession: jobTitle,
      iban,
      bank_name: bankName,
    }, { onConflict: "id" });

    setSaving(false);
    if (error) { alert("Hata: " + error.message); return; }
    writeProfilePreview(userId, { fullName, avatarUrl, companyName, profession: jobTitle });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    clearProfilePreview(userId);
    window.location.href = "/login";
  }

  const initials = (fullName || email || "K")[0].toUpperCase();

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Hesap" title="Profil" subtitle="Hesap ve fatura bilgilerin" />

      {loadError && (
        <section className="v-card p-4 mb-4 border border-rose/20">
          <p className="text-sm font-bold text-rose">{loadError}</p>
          <button onClick={load} className="v-btn v-btn-soft w-full mt-3 !py-2.5">Tekrar dene</button>
        </section>
      )}

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
            <p className="font-extrabold text-lg truncate">{fullName || (loading ? "Bilgiler yükleniyor..." : "İsim girilmedi")}</p>
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
          <input disabled={loading} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={loading ? "Bilgiler yükleniyor..." : "Ad Soyad"} className="v-input" />
          <input disabled={loading} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Şirket / Marka adı" className="v-input disabled:opacity-70" />
          <div className="grid grid-cols-2 gap-2.5">
            <input disabled={loading} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Görev / Ünvan" className="v-input disabled:opacity-70" />
            <input disabled={loading} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="v-input disabled:opacity-70" />
          </div>
        </div>
      </section>

      {/* Fatura bilgileri */}
      <section className="v-card p-4 mb-4">
        <p className="font-extrabold tracking-tight mb-0.5">Fatura & Ödeme Bilgileri</p>
        <p className="text-xs text-mute font-medium mb-3">Fatura oluşturulurken otomatik kullanılır</p>
        <div className="grid gap-2.5">
          <input disabled={loading} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Banka adı" className="v-input disabled:opacity-70" />
          <input disabled={loading} value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN (TR...)" className="v-input font-mono disabled:opacity-70" />
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

      <section className="v-card p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-sky/10 text-sky grid place-items-center"><IBell size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight">Akıllı bildirimler</p>
            <p className="text-xs text-mute font-medium mt-1 leading-relaxed">
              Yaklaşan fatura, kart ve kredi ödemelerini; geciken tahsilatları ve önemli görevleri zamanında hatırlatır.
            </p>
          </div>
        </div>
        {pushStatus === "granted" ? (
          <div className="v-chip v-chip-mint mt-3 w-full justify-center"><ICheckCircle size={14} /> Bildirimler açık</div>
        ) : pushStatus === "denied" ? (
          <p className="mt-3 rounded-2xl bg-amber/10 p-3 text-xs font-bold text-amber-800">Bildirimler tarayıcı ayarından kapatılmış. Telefon ayarlarından Valkea için bildirim iznini açabilirsin.</p>
        ) : pushStatus === "unsupported" ? (
          <p className="mt-3 text-xs font-bold text-mute">Bu tarayıcı bildirimleri desteklemiyor.</p>
        ) : (
          <button type="button" onClick={enablePush} className="v-btn v-btn-dark w-full mt-3"><IBell size={17} /> Akıllı bildirimleri aç</button>
        )}
      </section>

      {/* Kaydet */}
      <button onClick={save} disabled={saving || loading || !userId} className="v-btn v-btn-dark w-full mb-3">
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
