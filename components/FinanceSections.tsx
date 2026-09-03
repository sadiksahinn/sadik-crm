"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICard, IReceipt, ITrendDown, IWallet } from "@/components/Icons";

const SECTIONS = [
  { href: "/harcamalar", label: "Harcamalar", Icon: ITrendDown },
  { href: "/kartlar", label: "Kartlar", Icon: ICard },
  { href: "/hesap-hareketleri", label: "Hesaplar", Icon: IWallet },
  { href: "/sabit-giderler", label: "Faturalar", Icon: IReceipt },
];

export default function FinanceSections() {
  const pathname = usePathname();
  return (
    <nav className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Finans bölümleri">
      {SECTIONS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`v-press min-w-0 rounded-2xl px-1.5 py-2.5 text-center ${active ? "bg-ink text-white shadow-lg" : "v-card text-sub"}`}>
            <Icon size={17} className={`mx-auto mb-1 ${active ? "text-[#5fc4e4]" : "text-teal-deep"}`} />
            <span className="block text-[9px] font-extrabold leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
