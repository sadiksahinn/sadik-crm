import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IBell, IBriefcase, ICalendar, IChart, IChevronRight, IClock, IUser, IUsers } from "@/components/Icons";

const groups = [
  { title: "İş ve müşteriler", links: [
    { href: "/is", label: "İş alanı", Icon: IBriefcase },
    { href: "/musteriler", label: "Müşteriler", Icon: IUsers },
    { href: "/tahsilatlar", label: "Tahsilatlar", Icon: IChart },
    { href: "/takvim", label: "Takvim", Icon: ICalendar },
  ]},
  { title: "Takip ve hesap", links: [
    { href: "/bildirimler", label: "Bildirimler", Icon: IBell },
    { href: "/hatirlatmalar", label: "Hatırlatmalar", Icon: IClock },
    { href: "/raporlar", label: "Raporlar", Icon: IChart },
    { href: "/profil", label: "Profil ve ayarlar", Icon: IUser },
  ]},
];

export default function DahaFazlaPage() {
  return (
    <main className="v-enter min-h-screen w-full overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea" title="Daha Fazla" subtitle="İş, takip ve hesap ayarları" />
      {groups.map((group) => (
        <section key={group.title} className="mb-5">
          <h2 className="v-overline mb-2.5 px-1">{group.title}</h2>
          <div className="v-card overflow-hidden">
            {group.links.map(({ href, label, Icon }, index) => (
              <Link key={href} href={href} className={`v-press flex items-center gap-3 px-4 py-4 ${index ? "border-t border-line" : ""}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-soft text-teal-deep"><Icon size={18} /></span>
                <span className="min-w-0 flex-1 font-extrabold text-sm">{label}</span>
                <IChevronRight size={16} className="text-mute" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
