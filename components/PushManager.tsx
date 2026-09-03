"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { dateKey } from "@/utils/date";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC) return;

    async function setup(requestPermission = false) {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const reg = await navigator.serviceWorker.register("/sw.js");

        // Bildirim izni yalnızca kullanıcının açıkça bastığı bir düğmeyle istenir.
        if (Notification.permission === "denied") return;
        if (Notification.permission === "default") {
          if (!requestPermission) return;
          const perm = await Notification.requestPermission();
          if (perm !== "granted") return;
        }

        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            access_token: sessionData.session.access_token,
          }),
        });

        // Günlük brief push — günde bir kez
        const lastBriefKey = "valkea_last_push_brief";
        const today = dateKey();
        const lastBrief = localStorage.getItem(lastBriefKey);
        if (lastBrief !== today) {
          await fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: sessionData.session.access_token, mode: "brief" }),
          });
          localStorage.setItem(lastBriefKey, today);
        }

        window.dispatchEvent(new CustomEvent("valkea:push-status", { detail: "granted" }));
      } catch {
        // Sessizce geç — push isteğe bağlı
      }
    }

    const enable = () => setup(true);
    window.addEventListener("valkea:enable-push", enable);
    setup(false);
    return () => window.removeEventListener("valkea:enable-push", enable);
  }, []);

  return null;
}
