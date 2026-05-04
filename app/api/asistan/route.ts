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

function nextWeekday(dayIndex: number) {
  const d = new Date();
  const todayIndex = d.getDay();
  let diff = dayIndex - todayIndex;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function detectDate(text: string) {
  const t = text.toLowerCase();

  if (t.includes("yarın") || t.includes("yarin")) return tomorrow();
  if (t.includes("pazartesi")) return nextWeekday(1);
  if (t.includes("salı") || t.includes("sali")) return nextWeekday(2);
  if (t.includes("çarşamba") || t.includes("carsamba")) return nextWeekday(3);
  if (t.includes("perşembe") || t.includes("persembe")) return nextWeekday(4);
  if (t.includes("cuma")) return nextWeekday(5);
  if (t.includes("cumartesi")) return nextWeekday(6);
  if (t.includes("pazar")) return nextWeekday(0);

  return today();
}

function extractTime(text: string) {
  const match = text.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
}

function extractAmount(text: string) {
  const clean = text.toLowerCase().replace(/\./g, "").replace(/,/g, ".");
  const match = clean.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}


function detectCategory(text: string) {
  const t = text.toLowerCase();

  if (t.includes("market") || t.includes("migros") || t.includes("a101") || t.includes("bim")) return "Gıda";
  if (t.includes("yakıt") || t.includes("yakit") || t.includes("benzin") || t.includes("mazot") || t.includes("otopark")) return "Ulaşım";
  if (t.includes("reklam") || t.includes("meta") || t.includes("instagram") || t.includes("google ads")) return "Pazarlama";
  if (t.includes("yemek") || t.includes("kahve") || t.includes("restoran")) return "Yemek";
  if (t.includes("kamera") || t.includes("lens") || t.includes("ekipman") || t.includes("tripod")) return "Ekipman";
  if (t.includes("ofis") || t.includes("kira") || t.includes("elektrik") || t.includes("internet")) return "Ofis";
  if (t.includes("yazılım") || t.includes("yazilim") || t.includes("abonelik") || t.includes("vercel") || t.includes("supabase")) return "Yazılım";

  return "Diğer";
}


function cleanTitle(text: string) {
  return text
    .replace(/\d+/g, "")
    .replace(/tl/gi, "")
    .replace(/verdim/gi, "")
    .replace(/harcadım/gi, "")
    .replace(/harcadim/gi, "")
    .replace(/ödedi/gi, "")
    .replace(/odedi/gi, "")
    .replace(/gönderdi/gi, "")
    .replace(/gonderdi/gi, "")
    .replace(/geldi/gi, "")
    .replace(/bugün/gi, "")
    .replace(/bugun/gi, "")
    .replace(/yarın/gi, "")
    .replace(/yarin/gi, "")
    .replace(/pazartesi/gi, "")
    .replace(/salı/gi, "")
    .replace(/sali/gi, "")
    .replace(/çarşamba/gi, "")
    .replace(/carsamba/gi, "")
    .replace(/perşembe/gi, "")
    .replace(/persembe/gi, "")
    .replace(/cuma/gi, "")
    .replace(/cumartesi/gi, "")
    .replace(/pazar/gi, "")
    .replace(/\d{1,2}[:.]\d{2}/g, "")
    .replace(/hatırlat/gi, "")
    .replace(/hatirlat/gi, "")
    .replace(/saat/gi, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || "").trim();
    const lower = text.toLowerCase();

    if (!text) {
      return NextResponse.json({
        ok: false,
        message: "Komut boş.",
      });
    }

    // HATIRLATMA
    if (lower.includes("hatırlat") || lower.includes("hatirlat")) {
      const title = cleanTitle(text) || "Hatırlatma";
      const reminderDate = detectDate(text);
      const reminderTime = extractTime(text);

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          title,
          description: text,
          reminder_date: reminderDate,
          reminder_time: reminderTime || null,
          priority: lower.includes("acil") ? "acil" : "normal",
          status: "bekliyor",
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "hatırlatma",
        message: "✨ Hatırlatma oluşturuldu",
        record: {
          ...data,
          title,
          amount: undefined,
          table: "reminders",
        },
      });
    }

    const amount = extractAmount(text);

    if (!amount) {
      return NextResponse.json({
        ok: false,
        message:
          "Tutar veya hatırlatma bilgisi bulamadım. Örn: “Market 300 TL” veya “Yarın 14:00 çekim hatırlat”.",
      });
    }

    // GELİR
    if (
      lower.includes("ödedi") ||
      lower.includes("odedi") ||
      lower.includes("gönderdi") ||
      lower.includes("gonderdi") ||
      lower.includes("geldi") ||
      lower.includes("gelir")
    ) {
      const title = cleanTitle(text) || "Gelir";

      const { data, error } = await supabase
        .from("income")
        .insert({
          title,
          amount,
          income_date: today(),
          payment_method: "asistan",
          note: text,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "gelir",
        message: "✨ Gelir kaydedildi",
        record: { ...data, table: "income" },
      });
    }

    // DEFAULT GİDER
    const title = cleanTitle(text) || "Gider";

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        title,
        amount,
        expense_date: today(),
        category: detectCategory(text),
        payment_method: "asistan",
        note: text,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      type: "gider",
      message: "✨ Gider kaydedildi",
      record: { ...data, table: "expenses" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Hata: " + err.message },
      { status: 500 }
    );
  }
}
