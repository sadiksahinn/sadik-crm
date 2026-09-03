"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IHome, IWallet, ISparkle, IPlus, IUsers } from "./Icons";

const TABS = [
  { name: "Ana", href: "/", Icon: IHome },
  { name: "Para", href: "/para", Icon: IWallet },
  { name: "Ekle", href: "/ekle", Icon: IPlus },
  { name: "Asistan", href: "/asistan", Icon: ISparkle },
  { name: "Daha", href: "/daha-fazla", Icon: IUsers },
];

const HIDDEN_PATHS = ["/login", "/onboarding", "/auth", "/fatura"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[420px] rounded-[26px] border border-white/10 bg-[#0c1322]/95 backdrop-blur-md shadow-[0_20px_60px_rgba(11,16,32,0.45)] px-2 py-2"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ name, href, Icon }) => {
          const active = pathname === href
            || (name === "Para" && ["/para", "/harcamalar", "/kartlar", "/hesap-hareketleri", "/krediler", "/sabit-giderler", "/gelir-gider", "/raporlar"].some((path) => pathname === path || pathname.startsWith(path + "/")))
            || (name === "Daha" && ["/daha-fazla", "/is", "/musteriler", "/tahsilatlar", "/takvim", "/crm", "/profil", "/bildirimler", "/hatirlatmalar"].some((path) => pathname === path || pathname.startsWith(path + "/")));
          return (
            <Link
              key={name}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 ${name === "Ekle" ? "-mt-1" : ""}`}
            >
              {active && (
                <span className="absolute inset-x-1.5 inset-y-0 rounded-2xl bg-white/10 border border-white/10" />
              )}
              <span className={`relative z-10 transition-all ${name === "Ekle" ? "h-8 w-8 rounded-xl grid place-items-center bg-gradient-to-br from-[#2da3c7] to-[#e8a33d] text-white shadow-[0_5px_16px_rgba(45,163,199,.28)]" : active ? "text-[#5fc4e4]" : "text-white/55"}`}>
                <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
              </span>
              <span
                className={`relative z-10 text-[10px] font-bold tracking-tight transition-colors ${
                  active ? "text-white" : "text-white/55"
                }`}
              >
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
