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
    const action = body.action;
    const record = body.record;

    const { data: userData } = await supabase.auth.getUser(body.access_token);
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    if (!record?.title) {
      return NextResponse.json({ ok: false, message: "İş kaydı bulunamadı." });
    }

    if (action === "paid") {
      const { data, error } = await supabase
        .from("income")
        .insert({
          title: `${record.title} ödeme`,
          amount: Number(record.amount || 0),
          income_date: today(),
          payment_method: "asistan",
          note: "İş kaydı sonrası ödeme alındı.",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: `💚 Ödeme gelire kaydedildi.\n\n${record.title} · ${record.amount || 0} TL`,
        record: { ...data, type: "gelir", table: "income" },
      });
    }

    if (action === "later") {
      const paymentDay = record.payment_day || new Date().getDate();

      const { data, error } = await supabase
        .from("followups")
        .insert({
          title: `${record.title} ödeme takibi`,
          followup_date: nextPaymentDate(paymentDay),
          status: "bekliyor",
          priority: "önemli",
          message_suggestion:
            "Merhaba, bu ayki hizmet bedelimiz için ödeme günümüz geldi. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: `⏳ Ödeme takibe alındı.\n\n${record.title} için hatırlatma oluşturuldu.`,
        record: { ...data, type: "takip", table: "followups" },
      });
    }

    return NextResponse.json({ ok: false, message: "Geçersiz işlem." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Hata: " + err.message }, { status: 500 });
  }
}
