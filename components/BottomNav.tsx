"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Ana", href: "/", icon: "🏠" },
    { name: "Asistan", href: "/asistan", icon: "🤖" },
    { name: "Görev", href: "/gorev", icon: "📋" },
    { name: "CRM", href: "/crm", icon: "👥" },
    { name: "Profil", href: "/profil", icon: "👤" },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div
                className={`p-2 rounded-2xl ${
                  active
                    ? "bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400 text-white shadow-md"
                    : "text-gray-400"
                }`}
              >
                <span className="text-2xl">{tab.icon}</span>
              </div>

              <span
                className={`text-sm font-medium ${
                  active ? "text-black" : "text-gray-400"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
