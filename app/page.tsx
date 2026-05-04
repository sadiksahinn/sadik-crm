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

  return (
    <main className="min-h-screen bg-[#050505] text-white px-5 py-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-6 mb-6 shadow-2xl">
        <p className="text-zinc-400 text-sm">Bugünkü iş merkezi</p>
        <h1 className="text-4xl font-black mt-2">Sadık CRM</h1>
        <p className="text-zinc-400 mt-2">
          Müşteri, ödeme, görev ve günlük takip paneli
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
          <p className="text-zinc-500 text-sm">Müşteri</p>
          <h2 className="text-3xl font-black mt-2">{customerCount || 0}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
          <p className="text-zinc-500 text-sm">Bekleyen İş</p>
          <h2 className="text-3xl font-black mt-2">{pendingTasks || 0}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
          <p className="text-zinc-500 text-sm">Bugünkü Gelir</p>
          <h2 className="text-2xl font-black mt-2">{money(todayIncome)}</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
          <p className="text-zinc-500 text-sm">Bugünkü Gider</p>
          <h2 className="text-2xl font-black mt-2">{money(todayExpense)}</h2>
        </div>
      </section>

      <section className="grid gap-3">
        <Link href="/musteriler" className="bg-white text-black p-5 rounded-3xl font-bold flex justify-between items-center active:scale-95 transition">
          <span>Müşteri Yönetimi</span>
          <span>→</span>
        </Link>

        <Link href="/gelir-gider" className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl font-bold flex justify-between items-center active:scale-95 transition">
          <span>Gelir - Gider</span>
          <span>→</span>
        </Link>

        <Link href="/hatirlatmalar" className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl font-bold flex justify-between items-center active:scale-95 transition">
          <span>Hatırlatmalar</span>
          <span>→</span>
        </Link>

        <Link href="/asistan" className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl font-bold flex justify-between items-center active:scale-95 transition">
          <span>AI Asistan</span>
          <span>→</span>
        </Link>
      </section>
    </main>
  );
}
