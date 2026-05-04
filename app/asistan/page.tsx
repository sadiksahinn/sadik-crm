"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function extractAmount(text: string) {
  const clean = text.toLowerCase().replace(/\./g, "").replace(/,/g, ".");
  const match = clean.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function extractTime(text: string) {
  const match = text.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
}

function detectDate(text: string) {
  const t = text.toLowerCase();
  if (t.includes("yarın") || t.includes("yarin")) return tomorrow();
  return today();
}

function cleanTitle(text: string) {
  return text
    .replace(/\d+/g, "")
    .replace(/tl/gi, "")
    .replace(/gelir/gi, "")
    .replace(/gider/gi, "")
    .replace(/yaz/gi, "")
    .replace(/bugün/gi, "")
    .replace(/bugun/gi, "")
    .replace(/yarın/gi, "")
    .replace(/yarin/gi, "")
    .replace(/saat/gi, "")
    .replace(/hatırlat/gi, "")
    .replace(/hatirlat/gi, "")
    .replace(/müşteri/gi, "")
    .replace(/musteri/gi, "")
    .replace(/yeni/gi, "")
    .trim();
}

export default function AsistanPage() {
  const [command, setCommand] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function runCommand() {
    const text = command.trim();
    const lower = text.toLowerCase();

    if (!text) {
      setResult("Önce bir komut yaz.");
      return;
    }

    setLoading(true);
    setResult("Komut işleniyor...");

    try {
      if (lower.includes("gelir") || lower.includes("aldım") || lower.includes("aldim")) {
        const amount = extractAmount(text);
        const title = cleanTitle(text) || "Asistan gelir kaydı";

        const { error } = await supabase.from("income").insert({
          title,
          amount,
          income_date: detectDate(text),
          payment_method: "asistan",
          note: text,
        });

        if (error) throw error;
        setResult(`Gelir kaydedildi ✅\n${title} - ${amount} TL`);
      } 
      else if (lower.includes("gider") || lower.includes("harcadım") || lower.includes("harcadim")) {
        const amount = extractAmount(text);
        const title = cleanTitle(text) || "Asistan gider kaydı";

        const { error } = await supabase.from("expenses").insert({
          title,
          amount,
          category: "asistan",
          expense_date: detectDate(text),
          payment_method: "asistan",
          note: text,
        });

        if (error) throw error;
        setResult(`Gider kaydedildi ✅\n${title} - ${amount} TL`);
      } 
      else if (lower.includes("hatırlat") || lower.includes("hatirlat")) {
        const title = cleanTitle(text) || "Asistan hatırlatması";

        const { error } = await supabase.from("reminders").insert({
          title,
          description: text,
          reminder_date: detectDate(text),
          reminder_time: extractTime(text),
          priority: lower.includes("acil") ? "acil" : "normal",
          status: "bekliyor",
        });

        if (error) throw error;
        setResult(`Hatırlatma oluşturuldu ✅\n${title}`);
      } 
      else if (lower.includes("müşteri") || lower.includes("musteri")) {
        const title = cleanTitle(text) || "Yeni müşteri";

        const { error } = await supabase.from("customers").insert({
          name: title,
          brand_name: title,
          status: "potansiyel",
          source: "asistan",
          notes: text,
        });

        if (error) throw error;
        setResult(`Müşteri oluşturuldu ✅\n${title}`);
      } 
      else {
        setResult(
          "Bu komutu henüz anlayamadım. Şöyle deneyebilirsin:\n\n“Bugün 20000 TL gelir yaz”\n“3500 TL reklam gideri yaz”\n“Yarın saat 14:00 çekim hatırlat”"
        );
      }

      setCommand("");
    } catch (err: any) {
      setResult("Hata oluştu: " + err.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black">AI Asistan</h1>
          <p className="text-slate-500 text-sm">Komut yaz, CRM’e işlesin.</p>
        </div>

        <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-bold">
          Ana
        </Link>
      </header>

      <section className="relative overflow-hidden bg-white rounded-[26px] p-4 shadow-sm mb-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400" />
        <p className="text-xs font-black text-purple-600 mb-2">VALKEA ASSISTANT</p>
        <h2 className="text-2xl font-black">Ne kaydedelim?</h2>
        <p className="text-slate-500 text-sm mt-1">
          Gelir, gider, müşteri ve hatırlatmaları tek komutla oluştur.
        </p>
      </section>

      <section className="bg-white rounded-[26px] p-4 shadow-sm mb-5">
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Örn: Suite Halı’dan bugün 20000 TL gelir yaz"
          className="w-full h-40 bg-slate-100 rounded-2xl p-4 outline-none resize-none"
        />

        <button
          onClick={runCommand}
          disabled={loading}
          className="w-full mt-3 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400 text-white rounded-2xl p-4 font-black"
        >
          {loading ? "İşleniyor..." : "Komutu Çalıştır"}
        </button>
      </section>

      {result && (
        <section className="bg-slate-950 text-white rounded-[26px] p-4 shadow-sm mb-5 whitespace-pre-line">
          {result}
        </section>
      )}

      <section>
        <h2 className="font-black text-slate-700 text-sm tracking-wide mb-3">
          ÖRNEK KOMUTLAR
        </h2>

        <div className="grid gap-3">
          {[
            "Bugün Suite Halı’dan 20000 TL gelir yaz",
            "3500 TL reklam gideri yaz",
            "Yarın saat 14:00 Kader Aesthetic çekim hatırlat",
            "Yeni müşteri Ahmet Yılmaz",
          ].map((item) => (
            <button
              key={item}
              onClick={() => setCommand(item)}
              className="bg-white rounded-2xl p-4 text-left shadow-sm font-bold"
            >
              {item}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
