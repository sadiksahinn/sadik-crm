import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function extractAmount(text: string) {
  const clean = text.toLowerCase().replace(/\./g, "").replace(/,/g, ".");
  const match = clean.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function cleanJobName(text: string) {
  return text
    .replace(/\d+/g, "")
    .replace(/tl/gi, "")
    .replace(/ile/gi, "")
    .replace(/aylık/gi, "")
    .replace(/aylik/gi, "")
    .replace(/sosyal medya yönetimi/gi, "")
    .replace(/sosyal medya yonetimi/gi, "")
    .replace(/işi aldım/gi, "")
    .replace(/iş aldım/gi, "")
    .replace(/isi aldim/gi, "")
    .replace(/is aldim/gi, "")
    .replace(/iş aldık/gi, "")
    .replace(/is aldik/gi, "")
    .replace(/her ayın/gi, "")
    .replace(/her ayin/gi, "")
    .replace(/ödeme/gi, "")
    .trim();
}

function cleanTitle(text: string) {
  return text
    .replace(/\d+/g, "")
    .replace(/tl/gi, "")
    .replace(/verdim/gi, "")
    .replace(/harcadım/gi, "")
    .replace(/harcadim/gi, "")
    .replace(/ödedi/gi, "")
    .replace(/odedi/gi, "")
    .replace(/geldi/gi, "")
    .trim();
}

function detectCategory(text: string) {
  const t = text.toLowerCase();
  if (t.includes("market") || t.includes("migros") || t.includes("a101") || t.includes("bim")) return "Gıda";
  if (t.includes("yakıt") || t.includes("yakit") || t.includes("benzin") || t.includes("mazot")) return "Ulaşım";
  if (t.includes("reklam") || t.includes("meta") || t.includes("instagram")) return "Pazarlama";
  if (t.includes("yemek") || t.includes("kahve") || t.includes("restoran")) return "Yemek";
  if (t.includes("kamera") || t.includes("lens") || t.includes("ekipman")) return "Ekipman";
  return "Diğer";
}

function nextPaymentDate(day: number) {
  const d = new Date();
  const currentDay = d.getDate();
  d.setDate(day);
  if (currentDay >= day) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function detectPaymentDay(text: string) {
  const lower = text.toLowerCase();
  const match = lower.match(/her ay[ıi]n?\s*(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function isJobCommand(lower: string) {
  return (
    lower.includes("iş aldım") ||
    lower.includes("işi aldım") ||
    lower.includes("is aldim") ||
    lower.includes("isi aldim") ||
    lower.includes("iş aldık") ||
    lower.includes("işi aldık") ||
    lower.includes("is aldik") ||
    lower.includes("isi aldik") ||
    lower.includes("anlaşma yaptık") ||
    lower.includes("anlasma yaptik") ||
    lower.includes("hizmet vereceğiz") ||
    lower.includes("hizmet verecegiz") ||
    lower.includes("müşteri aldım") ||
    lower.includes("musteri aldim")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || "").trim();
    const lower = text.toLowerCase();

    const { data: userData } = await supabase.auth.getUser(body.access_token);
    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Oturum bulunamadı. Tekrar giriş yap." },
        { status: 401 }
      );
    }

    if (!text) {
      return NextResponse.json({ ok: false, message: "Komut boş." });
    }

    if (
      lower.includes("bugün ne") ||
      lower.includes("bugun ne") ||
      lower.includes("bugünkü program") ||
      lower.includes("bugunku program")
    ) {
      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("followup_date", today())
        .order("followup_date", { ascending: true });

      const items = (followups || []).map((x: any) => `• ${x.title}`);

      return NextResponse.json({
        ok: true,
        type: "program",
        message: items.length
          ? `Bugün bunları yapıyoruz 👇\n\n${items.join("\n")}`
          : "Bugün için kayıtlı takip görünmüyor.",
      });
    }

    // EN ÖNEMLİ KURAL: İş alma komutu önce yakalanır.
    if (isJobCommand(lower)) {
      const amount = extractAmount(text);
      const customerName = cleanJobName(text) || "Yeni müşteri";
      const paymentDay = detectPaymentDay(text);

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName,
          brand_name: customerName,
          status: "aktif müşteri",
          source: "asistan",
          notes: text,
          user_id: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { data: service, error: serviceError } = await supabase
        .from("client_services")
        .insert({
          customer_id: customer.id,
          service_name: lower.includes("sosyal medya")
            ? "Aylık sosyal medya yönetimi"
            : "Yeni iş / hizmet",
          service_type: lower.includes("sosyal medya")
            ? "sosyal medya yönetimi"
            : "genel hizmet",
          monthly_fee: amount || 0,
          payment_day: paymentDay,
          next_payment_date: paymentDay ? nextPaymentDate(paymentDay) : null,
          start_date: today(),
          status: "devam ediyor",
          notes: text,
          user_id: user.id,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      await supabase.from("activity_logs").insert({
        customer_id: customer.id,
        service_id: service.id,
        action_title: "Yeni iş alındı",
        action_detail: text,
        action_type: "iş",
        user_id: user.id,
      });

      if (paymentDay) {
        await supabase.from("followups").insert({
          customer_id: customer.id,
          service_id: service.id,
          title: `${customerName} ödeme takibi`,
          followup_date: nextPaymentDate(paymentDay),
          status: "bekliyor",
          priority: "önemli",
          message_suggestion:
            "Merhaba, bu ayki hizmet bedelimiz için ödeme günümüz geldi. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.",
          user_id: user.id,
        });
      }

      return NextResponse.json({
        ok: true,
        type: "iş",
        message:
          `✨ Yeni iş kaydı oluşturuldu\n\n` +
          `${customerName}\n` +
          `${amount ? `Bedel: ${amount} TL\n` : ""}` +
          `${paymentDay ? `Ödeme günü: Her ayın ${paymentDay}'i\n` : ""}` +
          `\nŞimdi şunları tamamlamamız lazım:\n` +
          `• Ayda kaç reels/post/story yapılacak?\n` +
          `• İlk çekim tarihi ne zaman?\n` +
          `• İlk paylaşım tarihi var mı?\n` +
          `• Kapak/alt yazı/hashtag hizmete dahil mi?`,
        record: { ...customer, title: customerName, table: "customers" },
      });
    }

    const amount = extractAmount(text);

    if (!amount) {
      return NextResponse.json({
        ok: false,
        message:
          "Anlamam için biraz daha detay lazım.\n\nÖrn:\n“Suite Halı ile aylık sosyal medya yönetimi işi aldım 20000 TL her ayın 4 ödeme”",
      });
    }

    if (
      lower.includes("ödedi") ||
      lower.includes("odedi") ||
      lower.includes("gönderdi") ||
      lower.includes("gonderdi") ||
      lower.includes("geldi") ||
      lower.includes("gelir")
    ) {
      const title = cleanTitle(text) || "Gelir";

      const { data, error } = await supabase
        .from("income")
        .insert({
          title,
          amount,
          income_date: today(),
          payment_method: "asistan",
          note: text,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "gelir",
        message: "✨ Gelir kaydedildi",
        record: { ...data, table: "income" },
      });
    }

    const title = cleanTitle(text) || "Gider";

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        title,
        amount,
        expense_date: today(),
        category: detectCategory(text),
        payment_method: "asistan",
        note: text,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      type: "gider",
      message: "✨ Gider kaydedildi",
      record: { ...data, table: "expenses" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Hata: " + err.message },
      { status: 500 }
    );
  }
}
