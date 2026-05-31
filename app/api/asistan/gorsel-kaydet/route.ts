import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, access_token } = body;

    // Kullanıcı JWT'sini Authorization header olarak geç — RLS politikasını karşılar
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${access_token}` } } }
    );

    const { data: userData } = await supabase.auth.getUser(access_token);
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: false, message: "Kaydedilecek işlem bulunamadı." });
    }

    const giderler = items.filter((i: any) => i.type === "gider");
    const gelirler = items.filter((i: any) => i.type === "gelir");

    const savedExpenses: any[] = [];
    const savedIncomes: any[] = [];

    if (giderler.length > 0) {
      const { data, error } = await supabase
        .from("expenses")
        .insert(
          giderler.map((e: any) => ({
            user_id: user.id,
            title: e.title,
            amount: Number(e.amount),
            expense_date: e.date || today(),
            category: e.category || "Genel",
            payment_method: "Görüntü analizi",
            note: "Asistan görüntü analizi ile eklendi.",
          }))
        )
        .select();
      if (error) throw error;
      savedExpenses.push(...(data || []));
    }

    if (gelirler.length > 0) {
      const { data, error } = await supabase
        .from("income")
        .insert(
          gelirler.map((i: any) => ({
            user_id: user.id,
            title: i.title,
            amount: Number(i.amount),
            income_date: i.date || today(),
            payment_method: "Görüntü analizi",
            note: "Asistan görüntü analizi ile eklendi.",
          }))
        )
        .select();
      if (error) throw error;
      savedIncomes.push(...(data || []));
    }

    const total = [...savedExpenses, ...savedIncomes].reduce(
      (t, r) => t + Number(r.amount || 0),
      0
    );

    const fmt = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(total);

    return NextResponse.json({
      ok: true,
      message:
        `✅ ${items.length} işlem kaydedildi.\n\n` +
        `💚 ${gelirler.length} gelir · ❤️ ${giderler.length} gider\n` +
        `Toplam: ${fmt}`,
      saved_count: items.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Kayıt hatası: " + err.message },
      { status: 500 }
    );
  }
}
