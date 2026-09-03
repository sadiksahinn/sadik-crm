import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function initVapid() {
  if (process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
}

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}

function todayIstanbul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function sendBrief(accessToken: string) {
  const { data: userData } = await supabase.auth.getUser(accessToken);
  const user = userData.user;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const today = todayIstanbul();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthKey = today.slice(0, 7);
  const paidThisMonth = (item: any) => !!item.is_paid_this_month && String(item.last_paid_date || "").slice(0, 7) === monthKey;

  const [
    { data: payments }, { data: followups }, { data: contents }, { data: reminders },
    { data: expenses }, { data: fixed }, { data: cards }, { data: loans }, { data: loanPayments },
  ] = await Promise.all([
    supabase.from("payment_tracking").select("amount").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
    supabase.from("followups").select("id").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
    supabase.from("content_calendar").select("id").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today),
    supabase.from("reminders").select("id").eq("user_id", user.id).eq("status", "bekliyor").lte("reminder_date", today),
    supabase.from("expenses").select("note").eq("user_id", user.id).gte("expense_date", monthStart),
    supabase.from("fixed_expenses").select("is_paid_this_month,last_paid_date").eq("user_id", user.id),
    supabase.from("credit_cards").select("min_payment,is_paid_this_month,last_paid_date").eq("user_id", user.id),
    supabase.from("loans").select("id,monthly_payment").eq("user_id", user.id),
    supabase.from("expenses").select("note").eq("user_id", user.id).eq("payment_method", "Kredi Taksiti").gte("expense_date", monthStart),
  ]);

  const paymentTotal = (payments || []).reduce((total: number, item: any) => total + Number(item.amount || 0), 0);
  const pendingExpenses = (expenses || []).filter((item: any) => !String(item.note || "").includes("Açıklama:")).length;
  const obligations =
    (fixed || []).filter((item: any) => !paidThisMonth(item)).length +
    (cards || []).filter((item: any) => !paidThisMonth(item) && Number(item.min_payment || 0) > 0).length +
    (loans || []).filter((item: any) => Number(item.monthly_payment || 0) > 0 && !(loanPayments || []).some((payment: any) => String(payment.note || "").includes(`loan:${item.id}`))).length;
  const workItems = (followups?.length || 0) + (contents?.length || 0) + (reminders?.length || 0);
  const totalItems = (payments?.length || 0) + pendingExpenses + obligations + workItems;

  if (totalItems === 0) return NextResponse.json({ ok: true, message: "Bugün kontrol edilecek konu yok." });

  const parts: string[] = [];
  if (obligations) parts.push(`📅 ${obligations} ödeme`);
  if (payments?.length) parts.push(`💰 ${payments.length} tahsilat (${money(paymentTotal)})`);
  if (pendingExpenses) parts.push(`🧾 ${pendingExpenses} açıklama`);
  if (workItems) parts.push(`✅ ${workItems} görev`);

  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", user.id);
  if (!subs?.length) return NextResponse.json({ ok: true, message: "Kayıtlı cihaz yok." });

  const payload = JSON.stringify({
    title: `Bugün ${totalItems} konu seni bekliyor`,
    body: parts.join(" · "),
    url: "/bildirimler",
    urgent: (payments?.length || 0) > 0 || obligations > 0,
  });
  const results = await Promise.allSettled(subs.map((item) => webpush.sendNotification(item.subscription, payload)));
  return NextResponse.json({ ok: true, sent: results.filter((item) => item.status === "fulfilled").length });
}

export async function POST(req: Request) {
  try {
    initVapid();
    const body = await req.json();
    const { access_token, title, body: msgBody, url, urgent, mode } = body;

    if (mode === "brief") return sendBrief(access_token);

    const { data: userData } = await supabase.auth.getUser(access_token);
    const user = userData.user;
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: false, message: "Kayıtlı cihaz yok." });
    }

    const payload = JSON.stringify({ title: title || "Valkea", body: msgBody || "", url: url || "/", urgent: urgent || false });

    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription, payload))
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      // Geçersiz subscription'ları temizle
      await Promise.all(
        subs.map(async (s, i) => {
          if (results[i].status === "rejected") {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
        })
      );
    }

    return NextResponse.json({ ok: true, sent: subs.length - failed.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

// GET: gecikmiş tahsilat varsa push gönder (daily brief tetikleyici)
export async function GET(req: Request) {
  try {
    initVapid();
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });
    return sendBrief(token);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
