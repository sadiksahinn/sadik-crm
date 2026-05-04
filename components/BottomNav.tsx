"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, string> = {
  Ana: "⌂",
  Asistan: "✧",
  Görev: "□",
  CRM: "◌",
  Profil: "○",
};

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Ana", href: "/" },
    { name: "Asistan", href: "/asistan" },
    { name: "Görev", href: "/hatirlatmalar" },
    { name: "CRM", href: "/musteriler" },
    { name: "Profil", href: "/profil" },
  ];

  return (
    <nav className="fixed bottom-4 left-5 right-5 z-[9999] rounded-[32px] border border-white/70 bg-white/65 backdrop-blur-2xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] px-2 py-2">
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
                className={`h-10 w-10 rounded-2xl grid place-items-center text-[24px] leading-none transition ${
                  active
                    ? "bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_12px_30px_rgba(168,85,247,0.35)]"
                    : "bg-white/45 text-slate-500"
                }`}
              >
                {icons[tab.name]}
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
