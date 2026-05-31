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

export async function POST(req: Request) {
  try {
    initVapid();
    const body = await req.json();
    const { access_token, title, body: msgBody, url, urgent } = body;

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

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);

    const [{ data: payments }, { data: followups }, { data: contents }] = await Promise.all([
      supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
      supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
      supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today),
    ]);

    const paymentTotal = (payments || []).reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
    const totalItems = (payments?.length || 0) + (followups?.length || 0) + (contents?.length || 0);

    if (totalItems === 0) return NextResponse.json({ ok: true, message: "Bugün bildirim yok." });

    const parts = [];
    if (payments?.length) parts.push(`💰 ${payments.length} tahsilat (${money(paymentTotal)})`);
    if (contents?.length) parts.push(`📲 ${contents.length} içerik`);
    if (followups?.length) parts.push(`✅ ${followups.length} görev`);

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", user.id);
    if (!subs?.length) return NextResponse.json({ ok: true, message: "Cihaz yok." });

    const payload = JSON.stringify({
      title: `Bugün ${totalItems} bekleyen var`,
      body: parts.join(" · "),
      url: "/bildirimler",
      urgent: (payments?.length || 0) > 0,
    });

    await Promise.allSettled(subs.map((s) => webpush.sendNotification(s.subscription, payload)));

    return NextResponse.json({ ok: true, sent: subs.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
