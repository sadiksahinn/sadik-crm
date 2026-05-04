import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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

    if (proposal.type === "job") {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: proposal.customer_name,
          brand_name: proposal.customer_name,
          status: "aktif müşteri",
          source: "ai-asistan",
          notes: proposal.note || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { data: service, error: serviceError } = await supabase
        .from("client_services")
        .insert({
          customer_id: customer.id,
          service_name: "Yeni iş / hizmet",
          service_type: "genel hizmet",
          monthly_fee: Number(proposal.amount || 0),
          payment_day: proposal.payment_day || null,
          next_payment_date: proposal.payment_day ? nextPaymentDate(proposal.payment_day) : null,
          start_date: today(),
          status: "devam ediyor",
          notes: proposal.note || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      await supabase.from("activity_logs").insert({
        customer_id: customer.id,
        service_id: service.id,
        action_title: "Yeni iş onaylandı",
        action_detail: proposal.note || "",
        action_type: "iş",
        user_id: user.id,
      });

      if (proposal.payment_day) {
        await supabase.from("followups").insert({
          customer_id: customer.id,
          service_id: service.id,
          title: `${proposal.customer_name} ödeme takibi`,
          followup_date: nextPaymentDate(proposal.payment_day),
          status: "bekliyor",
          priority: "önemli",
          message_suggestion: "Merhaba, bu ayki hizmet bedelimiz için ödeme günümüz geldi. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.",
          user_id: user.id,
        });
      }

      return NextResponse.json({
        ok: true,
        type: "iş",
        message: `✅ İş kaydı oluşturuldu.\n\n${proposal.customer_name}\n${proposal.amount ? `Bedel: ${proposal.amount} TL` : ""}`,
        record: {
          id: customer.id,
          type: "iş",
          title: proposal.customer_name,
          amount: Number(proposal.amount || 0),
          table: "customers"
        }
      });
    }

    if (proposal.type === "service_plan") {
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

      const planText = [
        proposal.reels ? `Ayda ${proposal.reels} reels` : null,
        proposal.story ? `Ayda ${proposal.story} story` : null,
        proposal.post ? `Ayda ${proposal.post} post` : null,
      ].filter(Boolean).join(" · ");

      await supabase.from("activity_logs").insert({
        customer_id: customer.id,
        action_title: "Hizmet planı onaylandı",
        action_detail: planText,
        action_type: "plan",
        user_id: user.id,
      });

      return NextResponse.json({
        ok: true,
        type: "plan",
        message: `✅ Plan onaylandı ve kaydedildi.\n\n${customer.brand_name || customer.name}\n${planText}`,
        record: {
          id: customer.id,
          type: "plan",
          title: customer.brand_name || customer.name,
          table: "activity_logs"
        }
      });
    }

    return NextResponse.json({ ok: false, message: "Bu öneri türü henüz desteklenmiyor." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Hata: " + err.message }, { status: 500 });
  }
}
