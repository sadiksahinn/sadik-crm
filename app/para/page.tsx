import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ICard, IChevronRight, IChart, IHomeAlt, IReceipt, ITrendDown, IWallet } from "@/components/Icons";

const sections = [
  { href: "/harcamalar", title: "Harcamalar", text: "Kart ve hesap harcamalarını birlikte gör, açıkla ve filtrele.", Icon: ITrendDown, color: "bg-[#fdeef1] text-rose" },
  { href: "/hesap-hareketleri", title: "Hesap hareketleri", text: "Gelen para, giden transfer ve banka hareketlerini incele.", Icon: IWallet, color: "bg-[#eaf7fb] text-teal-deep" },
  { href: "/kartlar", title: "Kartlar", text: "Kart borcu, limit, ekstre ve ödeme tarihlerini takip et.", Icon: ICard, color: "bg-[#eef1fb] text-[#36528c]" },
  { href: "/sabit-giderler", title: "Faturalar ve ödemeler", text: "Elektrik, su ve düzenli ödemelerin durumunu gör.", Icon: IReceipt, color: "bg-[#fff4df] text-[#9a6517]" },
  { href: "/sabit-giderler?tur=kira", title: "Kiralar", text: "Aylık kira planını, geçmiş ödemeleri ve depozitoyu ayrı takip et.", Icon: IHomeAlt, color: "bg-[#eef7f4] text-[#16745e]" },
  { href: "/gelir-gider", title: "Gelir–gider özeti", text: "Ne kazandığını, ne harcadığını ve net durumunu gör.", Icon: IChart, color: "bg-[#eaf8f1] text-emerald-700" },
];

export default function ParaPage() {
  return (
    <main className="v-enter min-h-screen w-full overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Para" subtitle="Paranla ilgili her şey tek yerde" />
      <section className="v-hero p-5 mb-5">
        <div className="relative z-10">
          <p className="v-overline !text-white/50">Finans merkezi</p>
          <h2 className="mt-2 text-[23px] font-extrabold tracking-tight">Nereye bakacağını düşünme</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Harcamaların, hesapların, kartların ve faturaların ayrı; genel durumun birlikte.</p>
        </div>
      </section>
      <section className="grid gap-3">
        {sections.map(({ href, title, text, Icon, color }) => (
          <Link key={href} href={href} className="v-card v-press flex min-w-0 items-center gap-3.5 p-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}><Icon size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[15px] text-ink">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-sub">{text}</span>
            </span>
            <IChevronRight size={17} className="shrink-0 text-mute" />
          </Link>
        ))}
      </section>
    </main>
  );
}
