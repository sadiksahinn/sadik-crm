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
  { name: "Ana",     href: "/",              Icon: IconHome   },
  { name: "İş",      href: "/is",            Icon: IconCRM    },
  { name: "Finans",  href: "/gelir-gider",   Icon: IconFinans },
  { name: "Asistan", href: "/asistan",       Icon: IconProfil },
  { name: "Profil",  href: "/profil",        Icon: IconProfil },
];

const HIDDEN_PATHS = ["/login", "/onboarding", "/auth"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav className="fixed bottom-4 left-5 right-5 z-[9999] rounded-[30px] border border-white/70 bg-white/80 backdrop-blur-2xl shadow-[0_18px_55px_rgba(15,23,42,0.16)] px-2 py-2">
      <div className="grid grid-cols-5 gap-1">
        {TABS.map(({ name, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={name}
              href={href}
              className="flex flex-col items-center justify-center gap-1 py-1"
            >
              <div className={`h-10 w-10 rounded-2xl grid place-items-center transition-all ${
                active
                  ? "bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-slate-950 shadow-md"
                  : "text-slate-400"
              }`}>
                <Icon active={active} />
              </div>
              <span className={`text-[11px] font-black tracking-tight ${
                active ? "text-slate-950" : "text-slate-400"
              }`}>
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
