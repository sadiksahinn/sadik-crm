import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .replace(/aldım/gi, "")
    .replace(/aldim/gi, "")
    .replace(/harcadım/gi, "")
    .replace(/harcadim/gi, "")
    .replace(/yaz/gi, "")
    .replace(/bugün/gi, "")
    .replace(/bugun/gi, "")
    .replace(/yarın/gi, "")
    .replace(/yarin/gi, "")
    .replace(/saat/gi, "")
    .replace(/\d{1,2}[:.]\d{2}/g, "")
    .replace(/hatırlat/gi, "")
    .replace(/hatirlat/gi, "")
    .replace(/müşteri/gi, "")
    .replace(/musteri/gi, "")
    .replace(/yeni/gi, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || "").trim();
    const lower = text.toLowerCase();

    if (!text) {
      return NextResponse.json({ ok: false, message: "Komut boş." });
    }

    if (lower.includes("gelir") || lower.includes("aldım") || lower.includes("aldim")) {
      const amount = extractAmount(text);
      const title = cleanTitle(text) || "Asistan gelir kaydı";

      const { data, error } = await supabase.from("income").insert({
        title,
        amount,
        income_date: detectDate(text),
        payment_method: "asistan",
        note: text,
      }).select().single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "gelir",
        message: `✨ Gelir kaydedildi`,
        record: { ...data, table: "income" },
      });
    }

    if (
  lower.includes("gider") ||
  lower.includes("harcadım") ||
  lower.includes("harcadim") ||
  lower.includes("verdim") ||
  lower.includes("ödeme") ||
  lower.includes("odeme") ||
  (extractAmount(text) > 0 && !lower.includes("ödedi") && !lower.includes("odedi"))
) {
      const amount = extractAmount(text);
      const title = cleanTitle(text) || "Asistan gider kaydı";

      const { data, error } = await supabase.from("expenses").insert({
        title,
        amount,
        category: "asistan",
        expense_date: detectDate(text),
        payment_method: "asistan",
        note: text,
      }).select().single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "gider",
        message: `✨ Gider kaydedildi`,
        record: { ...data, table: "expenses" },
      });
    }

    if (lower.includes("hatırlat") || lower.includes("hatirlat")) {
      const title = cleanTitle(text) || "Asistan hatırlatması";

      const { data, error } = await supabase.from("reminders").insert({
        title,
        description: text,
        reminder_date: detectDate(text),
        reminder_time: extractTime(text),
        priority: lower.includes("acil") ? "acil" : "normal",
        status: "bekliyor",
      }).select().single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "hatırlatma",
        message: `✨ Hatırlatma oluşturuldu`,
        record: { ...data, table: "reminders" },
      });
    }

    if (lower.includes("müşteri") || lower.includes("musteri")) {
      const title = cleanTitle(text) || "Yeni müşteri";

      const { data, error } = await supabase.from("customers").insert({
        name: title,
        brand_name: title,
        status: "potansiyel",
        source: "asistan",
        notes: text,
      }).select().single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "müşteri",
        message: `✨ Müşteri oluşturuldu`,
        record: { ...data, title: data.brand_name || data.name, table: "customers" },
      });
    }

    return NextResponse.json({
      ok: false,
      message:
        "Bu komutu henüz anlayamadım.\n\nÖrnek:\n“Bugün 20000 TL gelir yaz”\n“3500 TL reklam gideri yaz”\n“Yarın saat 14:00 çekim hatırlat”",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Hata: " + err.message },
      { status: 500 }
    );
  }
}
