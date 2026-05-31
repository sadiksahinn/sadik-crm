import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image") as File;
    const token = form.get("access_token") as string;
    const context = String(form.get("context") || "").trim();

    if (!image) {
      return NextResponse.json({ ok: false, message: "Görüntü bulunamadı." });
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
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Sen Valkea, Türkçe çalışan bir finans asistanısın.
Kullanıcının gönderdiği görüntüden (fiş, fatura, banka ekstresi, kredi kartı dökümü, makbuz vb.) tüm finansal hareketleri çıkar.

JSON formatı:
{
  "summary": "Belgeden tek cümlelik Türkçe özet",
  "document_type": "fiş|fatura|kredi_karti|banka_ekstresi|makbuz|diger",
  "items": [
    {
      "title": "Harcama veya gelir adı (kısa, net)",
      "amount": 0,
      "date": "YYYY-MM-DD veya null",
      "type": "gider veya gelir",
      "category": "Market|Ulaşım|Yemek|Fatura|Sağlık|Eğlence|Kira|Diğer"
    }
  ]
}

Kurallar:
- Tutarlar TL cinsinden sayı (virgül değil nokta)
- Tarih yoksa null yaz
- Fiş/fatura/market = gider, gelir makbuzu/yatan para = gelir
- Kredi kartı ekstresindeki her harcamayı ayrı item olarak yaz
- Yalnızca görüntüde net görülen hareketleri ekle, uydurma`,
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
    const items = (data.items || []).filter((i: any) => i.amount > 0);

    return NextResponse.json({
      ok: true,
      summary: data.summary || "Belge analiz edildi.",
      document_type: data.document_type || "diger",
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Görüntü analizi hatası: " + err.message },
      { status: 500 }
    );
  }
}
