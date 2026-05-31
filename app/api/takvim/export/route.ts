import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function icsDate(dateStr: string) {
  return dateStr.replace(/-/g, "") + "T090000";
}

function escapeIcs(str: string) {
  return (str || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
}

function makeEvent(uid: string, summary: string, date: string, description: string) {
  const start = icsDate(date);
  const end = icsDate(date).replace("090000", "100000");
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
  ].join("\r\n");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new NextResponse("Unauthorized", { status: 401 });

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth() + 3, 0).toISOString().slice(0, 10);

    const [{ data: contents }, { data: payments }, { data: followups }] = await Promise.all([
      supabase.from("content_calendar").select("*").eq("user_id", user.id).gte("publish_date", start).lte("publish_date", end),
      supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").gte("due_date", start).lte("due_date", end),
      supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").gte("followup_date", start).lte("followup_date", end),
    ]);

    const events: string[] = [];

    (contents || []).forEach((x: any) => {
      events.push(makeEvent(`content-${x.id}@valkea`, `📲 ${x.content_title}`, x.publish_date, `İçerik yayını · ${x.status}`));
    });

    (payments || []).forEach((x: any) => {
      const amount = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(x.amount || 0));
      events.push(makeEvent(`payment-${x.id}@valkea`, `💰 ${x.title} ${amount}`, x.due_date, `Tahsilat · ${x.status}`));
    });

    (followups || []).forEach((x: any) => {
      events.push(makeEvent(`followup-${x.id}@valkea`, `✅ ${x.title}`, x.followup_date, x.description || ""));
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Valkea CRM//TR",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Valkea Takvim",
      "X-WR-TIMEZONE:Europe/Istanbul",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="valkea-takvim.ics"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
