"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Ana", href: "/", icon: "⌂" },
    { name: "Asistan", href: "/asistan", icon: "✦" },
    { name: "Görev", href: "/hatirlatmalar", icon: "☑" },
    { name: "CRM", href: "/musteriler", icon: "◉" },
    { name: "Profil", href: "/profil", icon: "◎" },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-[9999] rounded-[30px] border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_20px_70px_rgba(15,23,42,0.22)] px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 py-1"
            >
              <div
                className={`h-11 w-11 rounded-2xl grid place-items-center text-[25px] transition ${
                  active
                    ? "bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_10px_28px_rgba(168,85,247,0.35)]"
                    : "bg-white/50 text-slate-500 shadow-inner"
                }`}
              >
                {tab.icon}
              </div>

              <span
                className={`text-[11px] font-black ${
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
