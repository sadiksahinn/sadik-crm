"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { name: "Ana Sayfa",  href: "/",           icon: "home" },
  { name: "Müşteriler", href: "/musteriler",  icon: "group" },
  { name: "Raporlar",   href: "/raporlar",    icon: "insert_chart" },
  { name: "Tahsilatlar",href: "/tahsilatlar", icon: "payments" },
  { name: "Asistan",    href: "/asistan",     icon: "smart_toy" },
];

const HIDDEN = ["/login", "/onboarding", "/auth"];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN.some(p => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <>
      {/* Material Symbols font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .msym { font-family:'Material Symbols Outlined'; font-size:24px; font-style:normal; font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; line-height:1; }
        .msym-fill { font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24; }
      `}</style>

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: "#f8f9fa", borderTop: "1px solid #bdc8cc",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingTop: "8px", fontFamily: "'Hanken Grotesk',sans-serif",
      }}>
        {TABS.map(({ name, href, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={name} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "56px", textDecoration: "none" }}>
              <span className={`msym ${active ? "msym-fill" : ""}`} style={{ color: active ? "#006879" : "#3e484b" }}>
                {icon}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: active ? 700 : 500,
                color: active ? "#006879" : "#3e484b",
                letterSpacing: "0.02em",
              }}>
                {name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
