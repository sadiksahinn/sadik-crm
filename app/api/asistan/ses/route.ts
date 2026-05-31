import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio") as File;
    const token = form.get("access_token") as string;

    if (!audio) {
      return NextResponse.json({ ok: false, message: "Ses dosyası bulunamadı." });
    }

    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "tr",
      prompt: "Türkçe iş, finans, müşteri, tahsilat, gelir, gider konularında konuşma.",
    });

    const text = transcription.text?.trim();

    if (!text) {
      return NextResponse.json({ ok: false, message: "Ses anlaşılamadı. Tekrar dene." });
    }

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Ses işleme hatası: " + err.message },
      { status: 500 }
    );
  }
}
