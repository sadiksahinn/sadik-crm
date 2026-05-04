"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Ana", href: "/", icon: "🏠" },
    { name: "Asistan", href: "/asistan", icon: "🤖" },
    { name: "Görev", href: "/hatirlatmalar", icon: "📋" },
    { name: "CRM", href: "/musteriler", icon: "👥" },
    { name: "Profil", href: "/profil", icon: "👤" },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-[9999] rounded-[28px] bg-white/95 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.22)] px-2 py-3">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div
                className={`h-12 w-12 rounded-2xl grid place-items-center text-3xl ${
                  active
                    ? "bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white shadow-lg"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.icon}
              </div>

              <span
                className={`text-[12px] font-black ${
                  active ? "text-slate-950" : "text-slate-400"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
