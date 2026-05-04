"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/asistan")
  ) {
    return null;
  }

  const tabs = [
    { name: "Ana", href: "/", icon: "⌂" },
    { name: "Finans", href: "/gelir-gider", icon: "₺" },
    { name: "Görev", href: "/hatirlatmalar", icon: "□" },
    { name: "CRM", href: "/musteriler", icon: "◌" },
    { name: "Profil", href: "/profil", icon: "○" },
  ];

  return (
    <nav className="fixed bottom-4 left-5 right-5 z-[9999] rounded-[32px] border border-white/70 bg-white/65 backdrop-blur-2xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link key={tab.name} href={tab.href} className="flex flex-col items-center justify-center gap-1 py-1">
              <div className={`h-10 w-10 rounded-2xl grid place-items-center text-[24px] ${
                active
                  ? "bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white shadow-lg"
                  : "bg-white/45 text-slate-500"
              }`}>
                {tab.icon}
              </div>
              <span className={`text-[11px] font-black ${active ? "text-slate-950" : "text-slate-400"}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
