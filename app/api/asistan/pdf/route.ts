import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { aiErrorResponse } from "@/utils/ai-error";
import { extractText } from "unpdf";
import { onlyNewDocumentItems } from "@/utils/document-dedupe";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type StatementItem = {
  title: string;
  amount: number;
  date: string;
  type: "gider";
  category: string;
  merchant: string;
  city: string | null;
  card_source: "ana_kart" | "sanal_kart";
  payment_channel: "internet" | "bilinmiyor";
  status: "kesinleşmiş";
  context_suggestion: string;
  needs_explanation: true;
};

function moneyValue(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function categoryFor(merchant: string) {
  const text = merchant.toLocaleUpperCase("tr-TR");
  if (/ECZANE|PHARM/.test(text)) return "Sağlık";
  if (/PETROL|AKARYAKIT|OPET|TOTAL GÖYNÜK/.test(text)) return "Akaryakıt";
  if (/MARKET|GROSS|A101|BIM |MİGROS|MIGROS|CARREFOUR|FULLGROS|FILE |GIDA|KURUYEM|BUFE/.test(text)) return "Market";
  if (/KEBAP|KOFTE|KÖFTE|DONDURMA|RESTORAN|MCDONALD|MC DONALD|PIZZ|PIDEM|KAVURMA|OCAKBASI|OCAKBAŞI|ÇORBA|CORBA|COFFEE|SBARRO|YEMEK|FIRIN|BAKLAVA|DÜRÜM|D.R.M|ET$/.test(text)) return "Yemek";
  if (/TURK TELEKOM|VODAFONE|SUPERONLINE|ENERJISA/.test(text)) return "Fatura";
  if (/CLOUDFLARE|OPENAI|PLAYSTATION|METUNIC/.test(text)) return "Abonelik";
  if (/OTEL|HOTEL|PANSİYON|PANSIYON/.test(text)) return "Konaklama";
  if (/KARGO|NAKLİYE|NAKLIYE|OTOYOL|KARAYOLLARI/.test(text)) return "Ulaşım";
  if (/WATSONS|GRATIS|DECATHLON|SPORTS MARKET|LCW|ADIDAS/.test(text)) return "Diğer";
  return "Diğer";
}

function cityFor(merchant: string) {
  const text = merchant.toLocaleUpperCase("tr-TR");
  if (text.includes("ANTALYA") || /\bANT\b/.test(text) || text.includes("LARA") || text.includes("KEMER") || text.includes("BEACH")) return "Antalya";
  if (text.includes("ANKARA") || text.includes("ANK ")) return "Ankara";
  if (text.includes("ISTANBUL") || text.includes("İSTANBUL")) return "İstanbul";
  if (text.includes("IZMIR") || text.includes("İZMİR")) return "İzmir";
  return null;
}

function parseEnparaStatement(text: string): StatementItem[] {
  if (!/Enpara Bank|Enpara\.com|Kredi Kartı (?:Ekstresi|Güncel Dönem Borcu)/i.test(text)) return [];

  const items: StatementItem[] = [];
  let cardSource: "ana_kart" | "sanal_kart" = "ana_kart";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\u0000/g, "Ö").replace(/\s+/g, " ").trim();
    if (/sanal (?:kredi )?kartınız(?:la| ile) yapılan/i.test(line)) {
      cardSource = "sanal_kart";
      continue;
    }

    const match = line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+(-?\s*[\d.]+,\d{2})\s*TL$/i);
    if (!match) continue;

    const [, day, month, year, rawMerchant, rawAmount] = match;
    const amount = moneyValue(rawAmount.replace(/\s/g, ""));
    const merchant = rawMerchant
      .replace(/\s*\([\d.,]+\s*(?:TL|USD|EUR)\)\s*/gi, " ")
      .replace(/\s+\d+\/\d+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (amount <= 0 || /(?:^|\s)(?:Ödeme|deme)\s*-\s*Enpara|Bir .nceki ekstre|Nakit avans faizi|KKDF|BSMV|Alışveriş faizi|Faizlerin/i.test(merchant)) continue;

    const city = cityFor(merchant);
    items.push({
      title: merchant.slice(0, 160),
      amount,
      date: `${year}-${month}-${day}`,
      type: "gider",
      category: categoryFor(merchant),
      merchant: merchant.slice(0, 160),
      city,
      card_source: cardSource,
      payment_channel: cardSource === "sanal_kart" ? "internet" : "bilinmiyor",
      status: "kesinleşmiş",
      context_suggestion: city === "Antalya" ? "Antalya tatili olabilir — açıklama bekleniyor" : "",
      needs_explanation: true,
    });
  }
  return items;
}

export async function POST(req: Request) {
  try {
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, message: "PDF dosyası yüklenmedi." }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("image") as File;
    const token = String(form.get("access_token") || "");
    if (!file || (file.type !== "application/pdf" && !file.name.toLocaleLowerCase("tr-TR").endsWith(".pdf"))) {
      return NextResponse.json({ ok: false, message: "Geçerli bir PDF ekstresi bulunamadı." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "PDF en fazla 10 MB olabilir." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    const [{ data: existingExpenses, error: expenseError }, { data: existingIncomes, error: incomeError }] = await Promise.all([
      supabase.from("expenses").select("title,amount,expense_date,note").eq("user_id", userData.user.id),
      supabase.from("income").select("title,amount,income_date,note").eq("user_id", userData.user.id),
    ]);
    if (expenseError || incomeError) return NextResponse.json({ ok: false, message: "Mevcut hareketlerin okunamadı. Tekrar kayıt oluşturmamak için analizi durdurdum; bağlantını kontrol edip yeniden dene." }, { status: 503 });
    const existingRecords = [...(existingExpenses || []), ...(existingIncomes || [])];

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text: extracted } = await extractText(bytes, { mergePages: true });
    const extractedText = Array.isArray(extracted) ? extracted.join("\n") : extracted;
    const deterministicItems = parseEnparaStatement(extractedText);
    if (deterministicItems.length > 0) {
      const deduped = onlyNewDocumentItems(deterministicItems, existingRecords);
      return NextResponse.json({
        ok: true,
        summary: deduped.items.length
          ? `Enpara ekstresinde ${deduped.items.length} yeni harcama bulundu. ${deduped.skipped ? `${deduped.skipped} mevcut hareket tekrar gösterilmedi. ` : ""}Kart ödemeleri, faiz ve ekstre vergileri dahil edilmedi.`
          : `Ekstredeki ${deduped.skipped} hareketin tamamı daha önce kaydedilmiş görünüyor; tekrar eklenmedi.`,
        document_type: "kredi_karti",
        sensitive_data_warning: false,
        items: deduped.items,
        skipped_existing: deduped.skipped,
      });
    }

    const base64 = Buffer.from(bytes).toString("base64");
    const instructions = `Türkçe çalışan dikkatli bir finans asistanısın. PDF kredi kartı ekstresindeki gerçek harcamaları eksiksiz çıkar.
Kredi kartı borç ödemelerini, hesaplar arası transferleri, iade/iptalleri, faiz ve vergi satırlarını harcama listesine alma. Aynı işlemi iki kez ekleme.
Ana kart ile sanal kart bölümlerini ayır. Provizyondaki işlemleri belirt. Şehir yalnızca belgede açıkça yazıyorsa ekle.
Ekstrede temassız simgesi varsa payment_channel=temassiz, QR simgesi/açıklaması varsa qr, sanal kart veya internet işlemi açıksa internet yap. Kanıt yoksa bilinmiyor yaz; tahmin etme.
Aynı şehirde art arda otel, restoran, ulaşım ve turistik işyerleri varsa context_suggestion alanına "[Sehir] seyahati" öner; kesin bilgi gibi sunma.
Her işlem için kullanıcının amacı bilinmiyorsa needs_explanation=true yap.
Tam kart numarası, CVV/CVC, şifre veya tek kullanımlık kod varsa sensitive_data_warning=true yap ve bu değerleri hiçbir çıktı alanına yazma.

Yalnızca şu JSON biçiminde cevap ver:
{"summary":"kısa özet","document_type":"kredi_karti","sensitive_data_warning":false,"items":[{"title":"kısa Türkçe başlık","amount":0,"date":"YYYY-MM-DD","type":"gider","category":"Market|Ulaşım|Yemek|Fatura|Sağlık|Eğlence|Konaklama|Akaryakıt|Kira|Abonelik|Diğer","merchant":"ekstredeki işyeri","city":null,"card_source":"ana_kart|sanal_kart|bilinmiyor","payment_channel":"temassiz|qr|fiziksel_kart|internet|bilinmiyor","status":"kesinleşmiş|provizyon","context_suggestion":"","needs_explanation":true}]}`;

    const response = await openai.responses.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      instructions,
      input: [{
        role: "user",
        content: [
          { type: "input_file", filename: file.name, file_data: `data:application/pdf;base64,${base64}`, detail: "high" },
          { type: "input_text", text: "Bu ekstredeki tüm hareketleri sayfa sırasıyla incele ve JSON olarak çıkar." },
        ],
      }],
      text: { format: { type: "json_object" } },
      max_output_tokens: 12000,
      store: false,
    });

    const data = JSON.parse(response.output_text || "{}");
    const parsedItems = Array.isArray(data.items) ? data.items.filter((item: { amount?: number }) => Number(item.amount || 0) > 0) : [];
    const deduped = onlyNewDocumentItems(parsedItems, existingRecords);
    return NextResponse.json({
      ok: true,
      summary: deduped.items.length
        ? `${data.summary || "Ekstre analiz edildi."}${deduped.skipped ? ` ${deduped.skipped} mevcut hareket tekrar gösterilmedi.` : ""}`
        : `Belgedeki ${deduped.skipped} hareketin tamamı daha önce kaydedilmiş görünüyor; tekrar eklenmedi.`,
      document_type: "kredi_karti",
      sensitive_data_warning: data.sensitive_data_warning === true,
      items: deduped.items,
      skipped_existing: deduped.skipped,
    });
  } catch (error) {
    console.error("PDF statement analysis failed", error);
    return aiErrorResponse(error, "PDF şu anda analiz edilemedi. Lütfen tekrar dene.");
  }
}
