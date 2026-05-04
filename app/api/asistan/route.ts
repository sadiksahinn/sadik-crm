import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function extractAmount(text: string) {
  const clean = text.toLowerCase().replace(/\./g, "").replace(/,/g, ".");
  const match = clean.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
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
    .replace(/geldi/gi, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || "").trim();
    const lower = text.toLowerCase();

    const amount = extractAmount(text);

    if (!amount) {
      return NextResponse.json({
        ok: false,
        message: "Tutar bulunamadı. Örn: 300 TL yaz.",
      });
    }

    // GELİR
    if (
      lower.includes("ödedi") ||
      lower.includes("odedi") ||
      lower.includes("gönderdi") ||
      lower.includes("gonderdi") ||
      lower.includes("geldi")
    ) {
      const title = cleanTitle(text) || "Gelir";

      const { data, error } = await supabase
        .from("income")
        .insert({
          title,
          amount,
          income_date: today(),
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

    // DEFAULT → GİDER
    const title = cleanTitle(text) || "Gider";

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        title,
        amount,
        expense_date: today(),
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
