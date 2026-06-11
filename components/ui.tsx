"use client";

// Valkea ortak UI parçaları — sayfa başlığı, boş durum, sayaç animasyonu.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { IArrowLeft } from "./Icons";

export function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/* Sayfa başlığı — geri butonu + overline + başlık + sağ aksiyonlar */
export function PageHeader({
  overline,
  title,
  subtitle,
  back = "/",
  actions,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  back?: string | null;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 mb-6">
      {back && (
        <Link
          href={back}
          className="v-press h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center text-ink shrink-0"
          aria-label="Geri"
        >
          <IArrowLeft size={19} />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        {overline && <p className="v-overline mb-0.5">{overline}</p>}
        <h1 className="text-[26px] font-extrabold tracking-tight leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-sub text-[13px] font-medium mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

/* Boş durum kartı */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="v-card p-8 text-center">
      <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-canvas grid place-items-center text-mute">
        {icon}
      </div>
      <p className="font-bold text-sm text-ink">{title}</p>
      {hint && <p className="text-mute text-xs mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* Sayı 0'dan hedefe yumuşakça akar */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const dur = 700;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="v-num">{format(display)}</span>;
}

/* İnce ilerleme çubuğu */
export function Progress({ pct, color = "#059669" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[#e8ecf4] overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }}
      />
    </div>
  );
}
