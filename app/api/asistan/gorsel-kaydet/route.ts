import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dateKey, isValidDateKey } from "@/utils/date";
import { onlyNewDocumentItems } from "@/utils/document-dedupe";
import { transactionTitle } from "@/utils/transaction-label";

function today() {
  return dateKey();
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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, message: "Kaydedilecek işlem bulunamadı." });
    }

    if (items.length > 150) {
      return NextResponse.json({ ok: false, message: "Tek seferde en fazla 150 işlem kaydedilebilir." }, { status: 400 });
    }

    const cleanItems = items
      .map((item: any) => ({
        title: transactionTitle(item?.title, item?.merchant),
        amount: Number(item?.amount || 0),
        date: isValidDateKey(item?.date) ? String(item.date) : today(),
        type: item?.type === "gelir" ? "gelir" : item?.type === "gider" ? "gider" : "",
        category: String(item?.category || "Diğer").trim().slice(0, 80),
        merchant: String(item?.merchant || item?.title || "").trim().slice(0, 160),
        city: String(item?.city || "").trim().slice(0, 80),
        card_source: ["ana_kart", "sanal_kart"].includes(item?.card_source) ? item.card_source : "bilinmiyor",
        payment_channel: ["temassiz", "qr", "fiziksel_kart", "internet"].includes(item?.payment_channel) ? item.payment_channel : "bilinmiyor",
        status: item?.status === "provizyon" ? "provizyon" : "kesinleşmiş",
        explanation: String(item?.explanation || "").trim().slice(0, 300),
        context: String(item?.context || "Kişisel").trim().slice(0, 80),
        project: String(item?.project || "").trim().slice(0, 160),
      }))
      .filter((item: any) => item.title && item.amount > 0 && item.amount <= 1_000_000_000 && Number.isFinite(item.amount) && item.type);

    if (cleanItems.length === 0) {
      return NextResponse.json({ ok: false, message: "Geçerli bir gelir veya gider bulunamadı." }, { status: 400 });
    }

    const giderler = cleanItems.filter((i: any) => i.type === "gider");
    const gelirler = cleanItems.filter((i: any) => i.type === "gelir");

    if (giderler.some((item: any) => !item.explanation)) {
      return NextResponse.json({ ok: false, message: "Giderler açıklama yazılmadan kaydedilemez." }, { status: 400 });
    }

    const savedExpenses: any[] = [];
    const savedIncomes: any[] = [];

    const [{ data: existingExpenses, error: expenseReadError }, { data: existingIncomes, error: incomeReadError }] = await Promise.all([
      supabase.from("expenses").select("title,amount,expense_date,note").eq("user_id", user.id),
      supabase.from("income").select("title,amount,income_date,note").eq("user_id", user.id),
    ]);
    if (expenseReadError) throw expenseReadError;
    if (incomeReadError) throw incomeReadError;
    const uniqueExpenses = onlyNewDocumentItems(giderler, existingExpenses || []).items;
    const uniqueIncomes = onlyNewDocumentItems(gelirler, existingIncomes || []).items;

    if (uniqueExpenses.length > 0) {
      const { data, error } = await supabase
        .from("expenses")
        .insert(
          uniqueExpenses.map((e: any) => ({
            user_id: user.id,
            title: e.title,
            amount: Number(e.amount),
            expense_date: e.date || today(),
            category: e.category || "Genel",
            payment_method: e.card_source === "sanal_kart" ? "Enpara Sanal Kart" : e.card_source === "ana_kart" ? "Enpara Kredi Kartı" : "Belge analizi",
            note: [
              e.explanation ? `Açıklama: ${e.explanation}` : "Açıklama bekleniyor",
              e.merchant ? `İşyeri: ${e.merchant}` : "",
              e.city ? `Şehir: ${e.city}` : "",
              `Bağlam: ${e.context || "Kişisel"}`,
              e.project ? `İş/Proje: ${e.project}` : "",
              `Ödeme: ${e.payment_channel}`,
              `Durum: ${e.status}`,
            ].filter(Boolean).join(" · "),
          }))
        )
        .select();
      if (error) throw error;
      savedExpenses.push(...(data || []));
    }

    if (uniqueIncomes.length > 0) {
      const { data, error } = await supabase
        .from("income")
        .insert(
          uniqueIncomes.map((i: any) => ({
            user_id: user.id,
            title: i.title,
            amount: Number(i.amount),
            income_date: i.date || today(),
            payment_method: i.card_source === "sanal_kart" ? "Enpara Sanal Kart" : i.card_source === "ana_kart" ? "Enpara Kredi Kartı" : "Belge analizi",
            note: [
              i.explanation ? `Açıklama: ${i.explanation}` : "Açıklama bekleniyor",
              i.merchant ? `Kaynak: ${i.merchant}` : "",
              i.city ? `Şehir: ${i.city}` : "",
              `Bağlam: ${i.context || "Kişisel"}`,
              i.project ? `İş/Proje: ${i.project}` : "",
              `Ödeme: ${i.payment_channel}`,
              `Durum: ${i.status}`,
            ].filter(Boolean).join(" · "),
          }))
        )
        .select();
      if (error) throw error;
      savedIncomes.push(...(data || []));
    }

    const savedCount = savedExpenses.length + savedIncomes.length;
    const skippedCount = cleanItems.length - savedCount;
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
        `✅ ${savedCount} işlem kaydedildi.\n\n` +
        `💚 ${savedIncomes.length} gelir · ❤️ ${savedExpenses.length} gider\n` +
        `Toplam: ${fmt}` +
        (skippedCount > 0 ? `\n${skippedCount} tekrar eden kayıt atlandı.` : ""),
      saved_count: savedCount,
      skipped_count: skippedCount,
    });
  } catch (error) {
    console.error("Document save failed", error);
    return NextResponse.json(
      { ok: false, message: "Belgedeki işlemler şu anda kaydedilemedi. Lütfen tekrar dene." },
      { status: 500 }
    );
  }
}
