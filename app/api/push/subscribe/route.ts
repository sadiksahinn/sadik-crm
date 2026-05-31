import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, access_token } = body;

    const { data: userData } = await supabase.auth.getUser(access_token);
    const user = userData.user;
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const endpoint = subscription?.endpoint;
    if (!endpoint) return NextResponse.json({ ok: false, message: "Geçersiz subscription." });

    await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: user.id, endpoint, subscription },
        { onConflict: "user_id,endpoint" }
      );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
