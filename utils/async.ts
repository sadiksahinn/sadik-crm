export const SERVICE_TIMEOUT_MS = 12_000;

export async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs = SERVICE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SERVICE_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function connectionErrorMessage(error?: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/SERVICE_TIMEOUT|Failed to fetch|fetch failed|NetworkError|Load failed/i.test(message)) {
    return "Bilgi servisine ulaşılamıyor. Bağlantını kontrol edip tekrar dene.";
  }
  return "Bilgiler alınırken bir sorun oluştu. Lütfen tekrar dene.";
}
