"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  if (
    pathname === "/asistan" ||
    pathname.startsWith("/asistan/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  const tabs = [
    { name: "Ana", href: "/", icon: "⌂" },
    { name: "Finans", href: "/gelir-gider", icon: "₺" },
    { name: "Takvim", href: "/takvim", icon: "◔" },
    { name: "CRM", href: "/musteriler", icon: "◌" },
    { name: "Profil", href: "/profil", icon: "○" },
  ];

  return (
    <nav className="fixed bottom-4 left-5 right-5 z-[9999] rounded-[30px] border border-white/70 bg-white/70 backdrop-blur-2xl shadow-[0_18px_55px_rgba(15,23,42,0.16)] px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.name} href={tab.href} className="flex flex-col items-center justify-center gap-1 py-1">
              <div className={`h-10 w-10 rounded-2xl grid place-items-center text-[23px] ${
                active
                  ? "bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-slate-950 shadow-lg"
                  : "bg-white/50 text-slate-500"
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
