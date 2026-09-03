import type { Session, SupabaseClient } from "@supabase/supabase-js";

export async function getValidSession(client: SupabaseClient): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  let session = data.session;
  if (!session) return null;

  const expiresSoon = !session.expires_at || session.expires_at * 1000 < Date.now() + 90_000;
  if (expiresSoon) {
    session = (await client.auth.refreshSession()).data.session;
    if (!session) return null;
  }

  return session;
}

export async function fetchWithSession(
  client: SupabaseClient,
  url: string,
  buildRequest: (accessToken: string) => RequestInit,
  timeoutMs = 45_000,
) {
  async function request(forceRefresh = false) {
    const session = forceRefresh
      ? (await client.auth.refreshSession()).data.session
      : await getValidSession(client);
    if (!session) throw new Error("Oturumun süresi doldu. Lütfen yeniden giriş yap.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...buildRequest(session.access_token), signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  let response = await request();
  if (response.status === 401) response = await request(true);
  return response;
}
