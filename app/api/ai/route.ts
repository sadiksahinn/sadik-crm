import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Türkçe çalışan bir CRM asistanısın. Kullanıcı mesajını analiz et. Sadece geçerli JSON döndür.",
        },
        {
          role: "user",
          content: `
Mesaj: ${message}

JSON formatı:
{
  "type": "job" | "income" | "expense" | "service_plan" | "reminder" | "unknown",
  "customer_name": "",
  "title": "",
  "amount": 0,
  "payment_day": null,
  "reels": null,
  "story": null,
  "post": null,
  "note": ""
}

Kurallar:
- "iş aldım", "anlaştık", "hizmet vereceğim" => job
- "ödeme aldım", "ödedi", "para geldi" => income
- "verdim", "harcadım", "market", "yakıt" => expense
- "ayda 8 reels 12 story" => service_plan
- emin değilsen unknown
`,
        },
      ],
      temperature: 0.1,
    });

    const text = response.choices[0].message.content || "{}";

    return Response.json({
      ok: true,
      result: JSON.parse(text),
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, message: err.message },
      { status: 500 }
    );
  }
}
