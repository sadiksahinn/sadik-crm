import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { aiErrorResponse } from "@/utils/ai-error";
import { onlyNewDocumentItems } from "@/utils/document-dedupe";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, message: "Görüntü dosyası yüklenmedi." }, { status: 400 });
    }
    const form = await req.formData();
    const image = form.get("image") as File;
    const token = form.get("access_token") as string;
    const context = String(form.get("context") || "").trim();

    if (!image || !["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(image.type)) {
      return NextResponse.json({ ok: false, message: "Geçerli bir JPG, PNG, WEBP veya HEIC görüntüsü yükle." }, { status: 400 });
    }
    if (image.size > 12 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "Görüntü en fazla 12 MB olabilir." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = image.type || "image/jpeg";

    const userText = context
      ? `Kullanıcı notu: "${context}"\n\nBu belgeden tüm finansal hareketleri çıkar.`
      : "Bu belgeden tüm finansal hareketleri çıkar.";

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Sen Valkea, Türkçe çalışan bir finans asistanısın.
Kullanıcının gönderdiği görüntüden (fiş, fatura, banka ekstresi, kredi kartı dökümü, makbuz vb.) gerçek finansal hareketleri çıkar.

JSON formatı:
{
  "summary": "Belgeden tek cümlelik Türkçe özet",
  "document_type": "fiş|fatura|kredi_karti|banka_ekstresi|makbuz|diger",
  "sensitive_data_warning": false,
  "items": [
    {
      "title": "Harcama veya gelir adı (kısa, net, Türkçe)",
      "amount": 0,
      "date": "YYYY-MM-DD veya null",
      "type": "gider veya gelir",
      "category": "Market|Ulaşım|Yemek|Fatura|Sağlık|Eğlence|Konaklama|Akaryakıt|Kira|Abonelik|Diğer",
      "merchant": "Ekstredeki işyeri adı",
      "city": "Belgede açıkça yazıyorsa şehir, yoksa null",
      "card_source": "ana_kart|sanal_kart|bilinmiyor",
      "payment_channel": "temassiz|qr|fiziksel_kart|internet|bilinmiyor",
      "status": "kesinleşmiş|provizyon",
      "context_suggestion": "Tatil, iş, ev, sağlık gibi yalnızca güçlü kanıt varsa kısa öneri; yoksa boş",
      "needs_explanation": true
    }
  ]
}

KESİN KURALLAR:
1. Hesaplar arası transfer = ATLA. "Giden Transfer", "Gelen Transfer", "EFT", "Kendi hesabımdan", "Havale" içeren ve karşısında benzer tutar olan işlemler gerçek gelir/gider değildir — items listesine EKLEME.
2. Kredi kartı ödemesi (borç ödeme) = ATLA. Kendi kredi kartına yaptığın ödeme gider değildir.
3. İade/iptaller = ATLA.
4. Gerçek gider: marketten alışveriş, akaryakıt, restoran, fatura, abonelik, ilaç, kira gibi mal/hizmet karşılığı yapılan ödemeler.
5. Gerçek gelir: maaş, müşteri ödemesi, kira geliri, transfer olmayan banka kredisi.
6. Tutarlar TL cinsinden sayı (nokta ondalık, TL işareti yok). Dövizliyse belgede yazan TL tutarını al.
7. Şüpheli / çok büyük tutarları (>20.000 TL) yalnızca açıkça mağaza/hizmet adı varsa ekle.
8. TARİH KURALI (ÇOK ÖNEMLİ): Belgede tarih varsa MUTLAKA YYYY-MM-DD formatına çevir. Örnekler: "31/05/2026" → "2026-05-31", "28.05.2026" → "2026-05-28", "27 May 2026" → "2026-05-27". Tarih hiç yoksa null yaz. Asla bugünün tarihini uydurma.
9. TEKRARLAYAN İŞLEM: Aynı tarihte aynı tutar + benzer isim (ör. "ANTHROPIC" ve "CLAUDE.AI" ikisi de aynı abonelik) varsa sadece BİRİNİ ekle, ikincisini atla.
10. Yalnızca görüntüde net görülenleri ekle, uydurma.
11. Ekstrede "sanal kredi kartınızla yapılan işlemler" başlığından sonraki hareketleri card_source=sanal_kart yap; diğerlerini ana_kart yap.
12. Provizyondaki işlemleri status=provizyon yap. Kesinleşmiş ekstre hareketlerini status=kesinleşmiş yap.
13. Aynı şehirde art arda otel, restoran, ulaşım ve turistik işyerleri varsa context_suggestion alanına "[Sehir] seyahati" yazabilirsin; kesin bilgi gibi sunma.
14. Kullanıcının neden yaptığı bilinmeyen her harcamada needs_explanation=true yaz.
15. Belgede temassız simgesi varsa payment_channel=temassiz, QR simgesi/açıklaması varsa qr, sanal kart veya internet işlemi açıksa internet yap. Kanıt yoksa bilinmiyor yaz; tahmin etme.
16. Tam kart numarası, CVV/CVC, internet bankacılığı şifresi veya tek kullanımlık kod görünüyorsa sensitive_data_warning=true yap. Bu hassas değerleri summary, title, merchant veya başka hiçbir çıktı alanına ASLA yazma.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}`, detail: "high" },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    const parsedItems = (data.items || []).filter((i: any) => i.amount > 0);
    const [{ data: expenses, error: expenseError }, { data: incomes, error: incomeError }] = await Promise.all([
      supabase.from("expenses").select("title,amount,expense_date,note").eq("user_id", user.id),
      supabase.from("income").select("title,amount,income_date,note").eq("user_id", user.id),
    ]);
    if (expenseError || incomeError) {
      return NextResponse.json({ ok: false, message: "Mevcut hareketlerin okunamadı. Aynı işlemi tekrar eklememek için analizi durdurdum; bağlantını kontrol edip yeniden dene." }, { status: 503 });
    }
    const deduped = onlyNewDocumentItems(parsedItems, [...(expenses || []), ...(incomes || [])]);

    return NextResponse.json({
      ok: true,
      summary: deduped.items.length
        ? `${data.summary || "Belge analiz edildi."}${deduped.skipped ? ` ${deduped.skipped} mevcut hareket tekrar gösterilmedi.` : ""}`
        : `Belgedeki hareketlerin tamamı daha önce kaydedilmiş görünüyor. ${deduped.skipped} tekrar kayıt atlandı.`,
      document_type: data.document_type || "diger",
      sensitive_data_warning: data.sensitive_data_warning === true,
      items: deduped.items,
      skipped_existing: deduped.skipped,
    });
  } catch (error) {
    console.error("Image analysis failed", error);
    return aiErrorResponse(error, "Görüntü şu anda analiz edilemedi. Lütfen tekrar dene.");
  }
}
