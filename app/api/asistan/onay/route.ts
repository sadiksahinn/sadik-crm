import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proposal = body.proposal;

    const { data: userData } = await supabase.auth.getUser(body.access_token);
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    if (!proposal?.customer_name) {
      return NextResponse.json({ ok: false, message: "Onaylanacak bilgi bulunamadı." });
    }

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .ilike("brand_name", `%${proposal.customer_name}%`)
      .limit(1);

    const customer = customers?.[0];

    if (!customer) {
      return NextResponse.json({
        ok: false,
        message: "Müşteri bulunamadı. Önce müşteriyi veya işi kaydetmeliyiz.",
      });
    }

    const { data: services } = await supabase
      .from("client_services")
      .select("*")
      .eq("user_id", user.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const service = services?.[0];

    const planText = [
      proposal.reels ? `Ayda ${proposal.reels} reels` : null,
      proposal.story ? `Ayda ${proposal.story} story` : null,
      proposal.post ? `Ayda ${proposal.post} post` : null,
      proposal.shoot_date ? `İlk çekim: ${proposal.shoot_date}` : null,
      proposal.publish_date ? `İlk paylaşım: ${proposal.publish_date}` : null,
    ].filter(Boolean).join(" · ");

    if (service) {
      await supabase
        .from("client_services")
        .update({
          notes: `${service.notes || ""}\n${planText}`.trim(),
        })
        .eq("id", service.id);
    }

    await supabase.from("activity_logs").insert({
      customer_id: customer.id,
      service_id: service?.id || null,
      action_title: "Hizmet planı onaylandı",
      action_detail: planText,
      action_type: "plan",
      user_id: user.id,
    });

    if (proposal.publish_date) {
      await supabase.from("content_calendar").insert({
        customer_id: customer.id,
        service_id: service?.id || null,
        content_title: `${customer.brand_name || customer.name} ilk paylaşım`,
        content_type: "reels",
        publish_date: proposal.publish_date,
        status: "planlandı",
        notes: planText,
        user_id: user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Plan onaylandı ve kaydedildi.\n\n${customer.brand_name || customer.name}\n${planText}`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Hata: " + err.message }, { status: 500 });
  }
}
