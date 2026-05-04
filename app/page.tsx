import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10);

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { data: incomes } = await supabase
    .from("income")
    .select("amount")
    .eq("income_date", today);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("expense_date", today);

  const { count: pendingTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .neq("status", "tamamlandı");

  const todayIncome =
    incomes?.reduce((total, item) => total + Number(item.amount), 0) || 0;

  const todayExpense =
    expenses?.reduce((total, item) => total + Number(item.amount), 0) || 0;

  const cards = [
    { title: "Müşteri", value: customerCount || 0, icon: "👥" },
    { title: "Gelir", value: money(todayIncome), icon: "💰" },
    { title: "Gider", value: money(todayExpense), icon: "📉" },
    { title: "Bekleyen", value: pendingTasks || 0, icon: "⏳" },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white px-5 pt-6 pb-28">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-950 to-black p-6 shadow-2xl mb-5">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

        <p className="text-sm text-zinc-400">Bugünkü kontrol merkezi</p>
        <h1 className="text-4xl font-black mt-2 tracking-tight">
          Sadık CRM 🚀
        </h1>
        <p className="text-zinc-400 mt-2 leading-relaxed">
          Müşteri, ödeme, görev ve asistan sistemin tek panelde.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/musteriler"
            className="rounded-2xl bg-white text-black p-4 font-bold active:scale-95 transition"
          >
            + Müşteri
          </Link>

          <Link
            href="/asistan"
            className="rounded-2xl bg-zinc-800/80 border border-white/10 p-4 font-bold active:scale-95 transition"
          >
            AI Asistan
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-[28px] bg-zinc-900/90 border border-white/10 p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400 text-sm">{card.title}</p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{card.value}</h2>
          </div>
        ))}
      </section>

      <section className="mb-5">
        <h2 className="text-xl font-black mb-3">Hızlı İşlemler</h2>

        <div className="grid gap-3">
          <Link
            href="/musteriler"
            className="group rounded-[28px] bg-zinc-900 border border-white/10 p-5 flex items-center justify-between active:scale-[0.98] transition"
          >
            <div>
              <h3 className="text-xl font-black">Müşteri Yönetimi</h3>
              <p className="text-zinc-400 mt-1">Ekle, düzenle, sil ve takip et</p>
            </div>
            <span className="h-11 w-11 rounded-full bg-white text-black grid place-items-center text-xl">
              →
            </span>
          </Link>

          <Link
            href="/gelir-gider"
            className="rounded-[28px] bg-zinc-900 border border-white/10 p-5 flex items-center justify-between active:scale-[0.98] transition"
          >
            <div>
              <h3 className="text-xl font-black">Gelir - Gider</h3>
              <p className="text-zinc-400 mt-1">Günlük kasa ve finans takibi</p>
            </div>
            <span className="h-11 w-11 rounded-full bg-zinc-800 grid place-items-center text-xl">
              →
            </span>
          </Link>

          <Link
            href="/hatirlatmalar"
            className="rounded-[28px] bg-zinc-900 border border-white/10 p-5 flex items-center justify-between active:scale-[0.98] transition"
          >
            <div>
              <h3 className="text-xl font-black">Hatırlatmalar</h3>
              <p className="text-zinc-400 mt-1">Çekim, ödeme ve teslim planı</p>
            </div>
            <span className="h-11 w-11 rounded-full bg-zinc-800 grid place-items-center text-xl">
              →
            </span>
          </Link>
        </div>
      </section>

      <nav className="fixed bottom-4 left-4 right-4 rounded-[28px] border border-white/10 bg-zinc-950/90 backdrop-blur-xl p-3 grid grid-cols-4 gap-2 shadow-2xl">
        <Link href="/" className="text-center rounded-2xl bg-white text-black py-3 text-xs font-bold">
          Ana
        </Link>
        <Link href="/musteriler" className="text-center rounded-2xl bg-zinc-900 py-3 text-xs font-bold">
          Müşteri
        </Link>
        <Link href="/gelir-gider" className="text-center rounded-2xl bg-zinc-900 py-3 text-xs font-bold">
          Finans
        </Link>
        <Link href="/asistan" className="text-center rounded-2xl bg-zinc-900 py-3 text-xs font-bold">
          AI
        </Link>
      </nav>
    </main>
  );
}
