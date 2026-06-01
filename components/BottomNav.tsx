"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M9 21V13h6v8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

function IconFinans({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M12 7v10M9.5 9.5h3.75a1.75 1.75 0 010 3.5h-2.5a1.75 1.75 0 000 3.5H15"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

function IconTakvim({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="2"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

function IconCRM({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M16 5.13a3 3 0 010 5.74M21 20c0-2.761-2.239-5-5-5"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

function IconProfil({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round">
      <circle cx="12" cy="8" r="4"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

const TABS = [
  { name: "Ana",       href: "/",           Icon: IconHome   },
  { name: "Finans",    href: "/gelir-gider", Icon: IconFinans },
  { name: "Takvim",    href: "/takvim",      Icon: IconTakvim },
  { name: "CRM",       href: "/musteriler",  Icon: IconCRM    },
  { name: "Asistan",   href: "/asistan",     Icon: IconProfil },
];

const HIDDEN_PATHS = ["/login", "/onboarding", "/auth"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-slate-100 px-2 pb-safe pt-2">
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {TABS.map(({ name, href, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={name}
              href={href}
              className="flex flex-col items-center justify-center gap-1 py-2"
            >
              <div className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                active ? "text-[#0B2545]" : "text-slate-400"
              }`}>
                <Icon active={active} />
              </div>
              <span className={`text-[10px] font-semibold tracking-tight ${
                active ? "text-[#0B2545]" : "text-slate-400"
              }`}>
                {name}
              </span>
              {active && <div className="w-1 h-1 rounded-full bg-[#0B2545]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
