"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(v || 0);
}

function today() { return new Date().toISOString().slice(0, 10); }

function invoiceNo(customerId: string) {
  const d = new Date();
  return `FAT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${customerId.slice(-4).toUpperCase()}`;
}

export default function FaturaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }

      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userData.user.id).single(),
        supabase.from("customers").select("*").eq("id", id).single(),
      ]);

      if (!c) { router.push("/musteriler"); return; }

      const { data: svc } = await supabase
        .from("client_services")
        .select("*")
        .eq("customer_id", id)
        .eq("status", "devam ediyor")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setProfile(p);
      setCustomer(c);
      setService(svc || null);
      setCustomAmount(svc ? String(svc.monthly_fee || "") : "");
      setCustomTitle(svc ? (svc.service_name || "Sosyal Medya Yönetimi") : "Hizmet Bedeli");
      setReady(true);
    }
    load();
  }, [id]);

  const amount = Number(customAmount) || 0;
  const kdv = Math.round(amount * 0.2);
  const toplam = amount + kdv;

  if (!ready) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex gap-1">
        <span className="w-3 h-3 bg-[#0B1437] rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-3 h-3 bg-[#0B1437] rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-3 h-3 bg-[#0B1437] rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </main>
  );

  return (
    <>
      {/* Kontrol paneli — yazdırılırken gizlenir */}
      <div className="print:hidden bg-[#f3f5fa] px-4 py-4 flex gap-3 items-center border-b border-[#e7eaf2]">
        <button onClick={() => router.back()} className="v-press h-10 px-4 bg-white border border-[#e7eaf2] rounded-2xl shadow-sm font-extrabold text-sm">← Geri</button>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Hizmet adı"
            className="v-input !py-2 !px-3 !text-sm !bg-white"
          />
          <input
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            type="number"
            placeholder="Tutar (KDV hariç)"
            className="v-input !py-2 !px-3 !text-sm !bg-white"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not (isteğe bağlı)"
            className="v-input !py-2 !px-3 !text-sm !bg-white col-span-2"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="v-press h-10 px-5 bg-[#0b1020] text-white rounded-2xl font-extrabold text-sm whitespace-nowrap shadow-[0_8px_24px_rgba(11,16,32,0.25)]"
        >
          Yazdır / PDF
        </button>
      </div>

      {/* Fatura içeriği */}
      <main className="min-h-screen bg-white p-8 max-w-2xl mx-auto">
        {/* Başlık */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900">FATURA</h1>
            <p className="text-slate-400 text-sm mt-1">{invoiceNo(id)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Düzenleme Tarihi</p>
            <p className="font-black text-slate-900">{today()}</p>
          </div>
        </div>

        {/* Taraflar */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-xs font-black text-[#1E3A5F] tracking-wide mb-2">FATURALAYAN</p>
            <p className="font-black text-lg">{profile?.full_name || "—"}</p>
            {profile?.company_name && <p className="text-slate-600">{profile.company_name}</p>}
            {profile?.email && <p className="text-slate-500 text-sm">{profile.email}</p>}
            {profile?.phone && <p className="text-slate-500 text-sm">{profile.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-black text-[#1E3A5F] tracking-wide mb-2">MÜŞTERİ</p>
            <p className="font-black text-lg">{customer?.brand_name || customer?.name}</p>
            {customer?.name && customer?.brand_name && customer.name !== customer.brand_name && (
              <p className="text-slate-600">{customer.name}</p>
            )}
            {customer?.phone && <p className="text-slate-500 text-sm">{customer.phone}</p>}
          </div>
        </div>

        {/* Hizmet tablosu */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 text-xs font-black text-slate-500 tracking-wide">HİZMET</th>
              <th className="text-right py-3 text-xs font-black text-slate-500 tracking-wide">TUTAR</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-4">
                <p className="font-black">{customTitle}</p>
                {service?.payment_day && (
                  <p className="text-slate-500 text-sm">Ödeme günü: Her ayın {service.payment_day}. günü</p>
                )}
                {note && <p className="text-slate-500 text-sm mt-1">{note}</p>}
              </td>
              <td className="text-right py-4 font-black">{money(amount)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 text-slate-500 text-sm">KDV (%20)</td>
              <td className="text-right py-3 text-slate-500 text-sm">{money(kdv)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="py-4 pl-4 font-black text-lg rounded-l-xl">TOPLAM</td>
              <td className="py-4 pr-4 text-right font-black text-2xl text-[#1E3A5F] rounded-r-xl">{money(toplam)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Ödeme bilgisi */}
        {(profile?.iban || profile?.bank_name) && (
          <div className="bg-slate-50 rounded-2xl p-4 mb-8">
            <p className="text-xs font-black text-slate-500 mb-2">ÖDEME BİLGİSİ</p>
            {profile.bank_name && <p className="text-sm"><span className="text-slate-500">Banka:</span> {profile.bank_name}</p>}
            {profile.iban && <p className="text-sm font-mono mt-1"><span className="text-slate-500">IBAN:</span> {profile.iban}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-6 text-center text-slate-400 text-xs">
          <p>Bu fatura {profile?.full_name || ""} tarafından düzenlenmiştir.</p>
          <p className="mt-1">Teşekkür ederiz.</p>
        </div>
      </main>

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}
