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
  "type": "job" | "income" | "expense" | "service_plan" | "reminder" | "daily_plan" | "collection_query" | "collection_paid" | "task_completed" | "daily_summary" | "unknown",
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
- "bugün kimden para alacağım", "tahsilat var mı", "kimden ödeme alacağım" => collection_query
- "tahsilat tamamlandı", "ödeme alındı", "parasını aldım" => collection_paid
- "tamamlandı", "bitti", "yapıldı", "paylaşıldı" => task_completed
- "günlük özet", "bugünün özeti", "rapor ver", "bugün durum ne" => daily_summary
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

    if (ai.type === "collection_paid") {
      const searchName = ai.customer_name || ai.title || "";

      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .ilike("title", `%${searchName}%`)
        .order("due_date", { ascending: true })
        .limit(1);

      const payment = payments?.[0];

      if (!payment) {
        return NextResponse.json({
          ok: false,
          message: "Bu müşteri için bekleyen tahsilat bulamadım. Tahsilat ekranından kontrol edebilirsin.",
        });
      }

      await supabase
        .from("payment_tracking")
        .update({
          status: "ödendi",
          paid_date: today(),
          income_created: true,
        })
        .eq("id", payment.id);

      if (payment.income_created) {
        return NextResponse.json({
          ok: true,
          type: "gelir",
          message: `✅ Bu tahsilat zaten gelire işlenmiş.\n\n${payment.title}`,
        });
      }

      const { data: income, error: incomeError } = await supabase
        .from("income")
        .insert({
          user_id: user.id,
          title: payment.title,
          amount: Number(payment.amount || 0),
          income_date: today(),
          payment_method: "Asistan tahsilat",
          note: "Asistan komutuyla tahsilat ödendi olarak işaretlendi.",
        })
        .select()
        .single();

      if (incomeError) throw incomeError;

      await supabase
        .from("payment_tracking")
        .update({ income_id: income?.id, income_created: true })
        .eq("id", payment.id);

      return NextResponse.json({
        ok: true,
        type: "gelir",
        message: `✅ Tahsilat tamamlandı ve gelire işlendi.\n\n${payment.title}`,
        record: { ...income, type: "gelir", table: "income" },
      });
    }

    if (ai.type === "task_completed") {
      const searchName = ai.customer_name || ai.title || text;

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "planlandı")
        .ilike("content_title", `%${searchName}%`)
        .limit(1);

      const content = contents?.[0];

      if (content) {
        await supabase
          .from("content_calendar")
          .update({ status: "tamamlandı" })
          .eq("id", content.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          customer_id: content.customer_id,
          service_id: content.service_id || null,
          action_title: "İçerik tamamlandı",
          action_detail: `${content.content_title} tamamlandı.`,
          action_type: "tamamlandı",
        });

        return NextResponse.json({
          ok: true,
          type: "tamamlandı",
          message: `✅ İçerik tamamlandı olarak işaretlendi.\n\n${content.content_title}`,
        });
      }

      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .ilike("title", `%${searchName}%`)
        .limit(1);

      const followup = followups?.[0];

      if (followup) {
        await supabase
          .from("followups")
          .update({ status: "tamamlandı" })
          .eq("id", followup.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          customer_id: followup.customer_id,
          service_id: followup.service_id || null,
          action_title: "Takip tamamlandı",
          action_detail: `${followup.title} tamamlandı.`,
          action_type: "tamamlandı",
        });

        return NextResponse.json({
          ok: true,
          type: "tamamlandı",
          message: `✅ Takip tamamlandı olarak işaretlendi.\n\n${followup.title}`,
        });
      }

      return NextResponse.json({
        ok: false,
        message: "Tamamlanacak kayıt bulamadım. Daha net yazabilir misin? Örn: “Suite Halı reels tamamlandı”.",
      });
    }

    if (ai.type === "daily_summary") {
      const todayDate = today();

      const { data: incomes } = await supabase
        .from("income")
        .select("*")
        .eq("user_id", user.id)
        .eq("income_date", todayDate);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("expense_date", todayDate);

      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("due_date", todayDate);

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "tamamlandı")
        .eq("publish_date", todayDate);

      const incomeTotal = (incomes || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const expenseTotal = (expenses || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const paymentTotal = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      const fmt = (n: number) =>
        new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(n);

      return NextResponse.json({
        ok: true,
        type: "özet",
        message:
          `📌 Günlük özet\n\n` +
          `💚 Bugünkü gelir: ${fmt(incomeTotal)}\n` +
          `❤️ Bugünkü gider: ${fmt(expenseTotal)}\n` +
          `💰 Bekleyen tahsilat: ${fmt(paymentTotal)}\n` +
          `🎬 Tamamlanan içerik: ${(contents || []).length}\n` +
          `🔔 Bekleyen ödeme sayısı: ${(payments || []).length}\n\n` +
          `Net durum: ${fmt(incomeTotal - expenseTotal)}`,
      });
    }

    if (ai.type === "collection_query") {
      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("due_date", today())
        .order("due_date", { ascending: true });

      const total = (payments || []).reduce((t: number, p: any) => t + Number(p.amount || 0), 0);

      if (!payments || payments.length === 0) {
        return NextResponse.json({
          ok: true,
          type: "tahsilat",
          message: "Bugün için bekleyen tahsilat görünmüyor. İstersen yeni tahsilat kaydı oluşturabilirsin.",
        });
      }

      return NextResponse.json({
        ok: true,
        type: "tahsilat",
        message:
          `Bugün tahsil edilecek toplam: ${new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          }).format(total)}\n\n` +
          payments.map((p: any) => {
            const amount = new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: "TRY",
              maximumFractionDigits: 0,
            }).format(Number(p.amount || 0));

            return `• ${p.title} — ${amount} — Son gün: ${p.due_date}\n  Mesaj: Merhaba, ${p.title} için ${amount} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
          }).join("\n\n"),
      });
    }

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
