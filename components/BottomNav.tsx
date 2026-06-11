"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { IHome, IBriefcase, IWallet, ISparkle, IUser } from "./Icons";

const TABS = [
  { name: "Ana",     href: "/",            Icon: IHome     },
  { name: "İş",      href: "/is",          Icon: IBriefcase },
  { name: "Finans",  href: "/gelir-gider", Icon: IWallet   },
  { name: "Asistan", href: "/asistan",     Icon: ISparkle  },
  { name: "Profil",  href: "/profil",      Icon: IUser     },
];

const HIDDEN_PATHS = ["/asistan", "/login", "/onboarding", "/auth", "/fatura"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[420px] rounded-[26px] border border-white/10 bg-[#0c1322]/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(11,16,32,0.45)] px-2 py-2"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ name, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={name}
              href={href}
              className="relative flex flex-col items-center justify-center gap-1 py-1.5"
            >
              {active && (
                <motion.span
                  layoutId="vNavPill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-x-1.5 inset-y-0 rounded-2xl bg-white/10 border border-white/10"
                />
              )}
              <span
                className={`relative z-10 transition-colors ${
                  active ? "text-[#5fc4e4]" : "text-white/40"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
              </span>
              <span
                className={`relative z-10 text-[10px] font-bold tracking-tight transition-colors ${
                  active ? "text-white" : "text-white/40"
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
