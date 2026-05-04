import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextPaymentDate(day: number) {
  const d = new Date();
  const currentDay = d.getDate();
  d.setDate(day);
  if (currentDay >= day) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function analyzeMessage(message: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Sen Türkçe çalışan bir CRM operasyon asistanısın.
Kullanıcı mesajını analiz et ve sadece JSON döndür.

JSON:
{
  "type": "job" | "income" | "expense" | "service_plan" | "reminder" | "daily_plan" | "unknown",
  "customer_name": "",
  "title": "",
  "amount": 0,
  "payment_day": null,
  "reels": null,
  "story": null,
  "post": null,
  "note": "",
  "missing_questions": []
}

Kurallar:
- "iş aldım", "anlaştık", "hizmet vereceğim" => job
- "ödeme aldım", "ödedi", "para geldi", "tahsil ettim" => income
- "verdim", "harcadım", market, yakıt, yemek vb. => expense
- "ayda 8 reels 12 story olacak" => service_plan
- "bugün ne yapıyoruz" => daily_plan
- emin değilsen unknown
        `,
      },
      { role: "user", content: message },
    ],
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || "").trim();

    const { data: userData } = await supabase.auth.getUser(body.access_token);
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı. Tekrar giriş yap." }, { status: 401 });
    }

    if (!text) {
      return NextResponse.json({ ok: false, message: "Komut boş." });
    }

    const ai = await analyzeMessage(text);

    if (ai.type === "daily_plan") {
      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("followup_date", today())
        .order("followup_date", { ascending: true });

      const { data: reminders } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("reminder_date", today())
        .order("reminder_date", { ascending: true });

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "planlandı")
        .lte("publish_date", today())
        .order("publish_date", { ascending: true });

      const items = [
        ...(followups || []).map((x: any) => `💸 ${x.title}`),
        ...(reminders || []).map((x: any) => `⏰ ${x.title}`),
        ...(contents || []).map((x: any) => `📲 ${x.content_title} paylaşımı kontrol et`),
      ];

      return NextResponse.json({
        ok: true,
        type: "program",
        message: items.length
          ? `Bugün bunları yapıyoruz 👇\n\n${items.join("\n")}\n\nBunları bitirdikçe bana “tamamlandı” diye yazabilirsin.`
          : "Bugün için bekleyen takip görünmüyor. İstersen yeni iş, ödeme veya paylaşım planı ekleyelim.",
      });
    }

    if (ai.type === "job") {
      return NextResponse.json({
        ok: true,
        type: "öneri",
        message:
          `Şunu iş kaydı olarak algıladım 👇\n\n` +
          `Müşteri: ${ai.customer_name || "Belirsiz"}\n` +
          `${ai.amount ? `Bedel: ${ai.amount} TL\n` : ""}` +
          `${ai.payment_day ? `Ödeme günü: Her ayın ${ai.payment_day}'i\n` : ""}` +
          `\nOnaylarsan müşteri + hizmet + takip kaydı oluşturacağım.`,
        proposal: {
          type: "job",
          customer_name: ai.customer_name,
          amount: ai.amount || 0,
          payment_day: ai.payment_day || null,
          note: text,
          missing_questions: ai.missing_questions || [
            "Ödeme alındı mı?",
            "Ayda kaç reels/post/story yapılacak?",
            "İlk çekim tarihi ne zaman?",
            "İlk paylaşım tarihi var mı?"
          ],
        },
      });
    }

    if (ai.type === "service_plan") {
      return NextResponse.json({
        ok: true,
        type: "öneri",
        message:
          `Şunu hizmet planı olarak algıladım 👇\n\n` +
          `Müşteri: ${ai.customer_name || "Belirsiz"}\n` +
          `${ai.reels ? `Ayda ${ai.reels} reels\n` : ""}` +
          `${ai.story ? `Ayda ${ai.story} story\n` : ""}` +
          `${ai.post ? `Ayda ${ai.post} post\n` : ""}` +
          `\nOnaylarsan müşteri hizmet planına işleyeceğim.`,
        proposal: {
          type: "service_plan",
          customer_name: ai.customer_name,
          reels: ai.reels,
          story: ai.story,
          post: ai.post,
          note: text,
          missing_questions: ai.missing_questions || [
            "Ödeme alındı mı?",
            "Ayda kaç reels/post/story yapılacak?",
            "İlk çekim tarihi ne zaman?",
            "İlk paylaşım tarihi var mı?"
          ],
        },
      });
    }

    if (ai.type === "income") {
      const { data, error } = await supabase
        .from("income")
        .insert({
          title: ai.customer_name || ai.title || "Gelir",
          amount: Number(ai.amount || 0),
          income_date: today(),
          payment_method: "asistan-ai",
          note: text,
          user_id: user.id,
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

    if (ai.type === "expense") {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          title: ai.title || ai.customer_name || "Gider",
          amount: Number(ai.amount || 0),
          expense_date: today(),
          category: "AI",
          payment_method: "asistan-ai",
          note: text,
          user_id: user.id,
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
    }

    return NextResponse.json({
      ok: false,
      message:
        "Bunu nasıl kaydedeceğimi net anlayamadım. Şöyle yazabilirsin:\n\n“Suite Halı ile aylık 20000 TL iş aldım”\n“Market 300 TL”\n“Suite Halı 20000 TL ödeme yaptı”\n“Suite Halı için ayda 8 reels 12 story olacak”",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Hata: " + err.message }, { status: 500 });
  }
}
