"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getValidSession } from "@/utils/auth-client";

const PUBLIC_PATHS = ["/login", "/kayit", "/sifremi-unuttum", "/auth"];

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState("");
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const ready = isPublic || authorizedPath === pathname;

  useEffect(() => {
    let active = true;
    if (isPublic) return;
    const client = createClient();
    getValidSession(client).then((session) => {
      if (!active) return;
      if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setAuthorizedPath(pathname);
    }).catch(() => {
      if (active) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => { active = false; };
  }, [isPublic, pathname, router]);

  if (!ready) return (
    <main className="min-h-screen grid place-items-center bg-canvas px-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-line border-t-teal animate-spin" />
        <p className="mt-4 text-sm font-bold text-mute">Bilgilerin güvenle hazırlanıyor…</p>
      </div>
    </main>
  );
  return children;
}
