import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { dateKey, monthInfo } from "@/utils/date";
import { profitLossExpenses } from "@/utils/finance";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function today() {
  return dateKey();
}

function monthStart() {
  return monthInfo().start;
}

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || body.command || "").trim();
    const accessToken = String(body.access_token || "");
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: userData } = await supabase.auth.getUser(accessToken);
    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Oturum bulunamadı." },
        { status: 401 }
      );
    }

    const todayDate = today();
    const startMonth = monthStart();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name, profession, role")
      .eq("id", user.id)
      .single();

    const { data: incomes } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", user.id)
      .gte("income_date", startMonth)
      .order("income_date", { ascending: false });

    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", startMonth)
      .order("expense_date", { ascending: false });

    const { data: payments } = await supabase
      .from("payment_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .order("due_date", { ascending: true });

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: followups } = await supabase
      .from("followups")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "bekliyor")
      .order("followup_date", { ascending: true })
      .limit(20);

    const { data: contents } = await supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", user.id)
      .order("publish_date", { ascending: true })
      .limit(20);

    const totalIncome = (incomes || []).reduce(
      (t: number, i: any) => t + Number(i.amount || 0),
      0
    );

    const bookedExpenses = profitLossExpenses(expenses);
    const pendingExpenses: any[] = [];
    const totalExpense = bookedExpenses.reduce(
      (t: number, i: any) => t + Number(i.amount || 0),
      0
    );

    const totalPayment = (payments || []).reduce(
      (t: number, i: any) => t + Number(i.amount || 0),
      0
    );

    const expenseByCategory = bookedExpenses.reduce((acc: any, item: any) => {
      const key = item.category || "Genel";
      acc[key] = (acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    const context = {
      user: {
        name: profile?.full_name || "Kullanıcı",
        company: profile?.company_name || "",
        profession: profile?.profession || "",
      },
      date: {
        today: todayDate,
        month_start: startMonth,
      },
      finance: {
        monthly_income: money(totalIncome),
        monthly_expense: money(totalExpense),
        monthly_net: money(totalIncome - totalExpense),
        pending_collection: money(totalPayment),
        expense_by_category: expenseByCategory,
      },
      counts: {
        customers: customers?.length || 0,
        pending_followups: followups?.length || 0,
        calendar_items: contents?.length || 0,
        pending_collections: payments?.length || 0,
      },
      recent_income: (incomes || []).slice(0, 8),
      recent_expenses: bookedExpenses.slice(0, 8),
      pending_card_expenses: pendingExpenses.slice(0, 8),
      pending_collections: (payments || []).slice(0, 8),
      upcoming_tasks: (followups || []).slice(0, 8),
      calendar: (contents || []).slice(0, 8),
      customers: (customers || []).slice(0, 8),
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: `
Sen Valkea Assistant adlı Türkçe kişisel iş, finans, takvim ve CRM asistanısın.

Görevin:
- Kullanıcının gelir/gider durumunu analiz etmek
- Bekleyen tahsilatları yorumlamak
- Günlük iş planı çıkarmak
- Tasarruf ve geliştirme önerisi vermek
- Müşteri/takvim/tahsilat verilerine göre net ve kısa cevap üretmek

Kurallar:
- Cevap Türkçe olsun.
- Gereksiz uzun yazma.
- Sayıları net söyle.
- Risk varsa açık söyle.
- Bilmediğin şeyi uydurma.
- Kayıt oluşturma gerekiyorsa kullanıcıdan onay iste.
          `,
        },
        {
          role: "user",
          content: `
Kullanıcının mevcut veri özeti:
${JSON.stringify(context, null, 2)}

Kullanıcı sorusu:
${question || "Bugünkü durumu analiz et."}
          `,
        },
      ],
    });

    const message =
      response.choices[0]?.message?.content ||
      "Analiz üretilemedi.";

    return NextResponse.json({
      ok: true,
      type: "core_ai",
      message,
      context_summary: {
        monthly_income: money(totalIncome),
        monthly_expense: money(totalExpense),
        monthly_net: money(totalIncome - totalExpense),
        pending_collection: money(totalPayment),
      },
    });
  } catch (error) {
    console.error("Core AI request failed", error);
    return NextResponse.json(
      { ok: false, message: "Finans analizi şu anda oluşturulamadı. Lütfen tekrar dene." },
      { status: 500 }
    );
  }
}
