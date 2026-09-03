import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IBriefcase, ICalendar, IChevronRight, IPlus, IReceipt, ISparkle, ITrendDown, ITrendUp } from "@/components/Icons";

const actions = [
  { href: "/asistan?eylem=belge", title: "Ekran görüntüsü veya PDF yükle", text: "Asistan hareketleri çıkarsın, sen kontrol edip kaydet.", Icon: ISparkle, primary: true },
  { href: "/gelir-gider?ekle=gider", title: "Harcama ekle", text: "Nakit veya listede olmayan bir gideri elle gir.", Icon: ITrendDown },
  { href: "/gelir-gider?ekle=gelir", title: "Gelir ekle", text: "Gelen para veya iş gelirini kaydet.", Icon: ITrendUp },
  { href: "/sabit-giderler?ekle=1", title: "Fatura ekle", text: "Yeni abonelik veya düzenli ödemeyi takibe al.", Icon: IReceipt },
  { href: "/hatirlatmalar?ekle=1", title: "Hatırlatma ekle", text: "Ödeme, görev veya takip tarihi oluştur.", Icon: ICalendar },
  { href: "/musteriler", title: "Müşteri veya iş ekle", text: "Yeni müşteri, proje ve tahsilat süreci başlat.", Icon: IBriefcase },
];

export default function EklePage() {
  return (
    <main className="v-enter min-h-screen w-full overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Hızlı işlem" title="Ne eklemek istiyorsun?" subtitle="En kısa yoldan kaydet" />
      <section className="grid gap-3">
        {actions.map(({ href, title, text, Icon, primary }) => (
          <Link key={href} href={href} className={`v-press flex min-w-0 items-center gap-3.5 rounded-[24px] p-4 ${primary ? "v-hero text-white" : "v-card"}`}>
            <span className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${primary ? "bg-white/10 text-[#68d5f3]" : "bg-soft text-teal-deep"}`}><Icon size={21} /></span>
            <span className="relative z-10 min-w-0 flex-1">
              <span className="block font-extrabold text-[15px]">{title}</span>
              <span className={`mt-1 block text-xs leading-5 ${primary ? "text-white/65" : "text-sub"}`}>{text}</span>
            </span>
            <IChevronRight size={17} className={`relative z-10 shrink-0 ${primary ? "text-white/50" : "text-mute"}`} />
          </Link>
        ))}
      </section>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-semibold text-mute"><IPlus size={14} /> Buradan ödeme yapılmaz; yalnızca kayıt ve takip oluşturulur.</p>
    </main>
  );
}
