import { NextResponse } from "next/server";

export function aiErrorResponse(error: unknown, fallback: string) {
  const value = error as { status?: number; code?: string; message?: string };
  const message = String(value?.message || "");
  if (value?.status === 401 || value?.code === "invalid_api_key" || /api key/i.test(message)) {
    return NextResponse.json({
      ok: false,
      code: "AI_CONFIGURATION",
      message: "Yapay zekâ bağlantısı şu anda kullanılamıyor. Sistem yöneticisinin bağlantı anahtarını yenilemesi gerekiyor.",
    }, { status: 503 });
  }
  if (value?.status === 429) {
    return NextResponse.json({ ok: false, code: "AI_BUSY", message: "Yapay zekâ şu anda yoğun. Biraz sonra tekrar dene." }, { status: 429 });
  }
  return NextResponse.json({ ok: false, message: fallback }, { status: 500 });
}
