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

  const { data: pendingPayments } = await supabase
    .from("payments")
    .select("amount")
    .neq("payment_status", "ödendi");

  const todayIncome =
    incomes?.reduce((total, item) => total + Number(item.amount), 0) || 0;

  const todayExpense =
    expenses?.reduce((total, item) => total + Number(item.amount), 0) || 0;

  const pendingPaymentTotal =
    pendingPayments?.reduce((total, item) => total + Number(item.amount), 0) || 0;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold">Sadık CRM 🚀</h1>
        <p className="text-zinc-400 mt-2">
          Kişisel asistan, müşteri takip ve gelir-gider sistemi
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
        <div className="bg-zinc-900 p-5 rounded-2xl">
          <p className="text-zinc-400 text-sm">Toplam Müşteri</p>
          <h2 className="text-3xl font-bold mt-2">{customerCount || 0}</h2>
        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl">
          <p className="text-zinc-400 text-sm">Bugünkü Gelir</p>
          <h2 className="text-3xl font-bold mt-2">{money(todayIncome)}</h2>
        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl">
          <p className="text-zinc-400 text-sm">Bugünkü Gider</p>
          <h2 className="text-3xl font-bold mt-2">{money(todayExpense)}</h2>
        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl">
          <p className="text-zinc-400 text-sm">Bekleyen İş</p>
          <h2 className="text-3xl font-bold mt-2">{pendingTasks || 0}</h2>
        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl col-span-2 md:col-span-1">
          <p className="text-zinc-400 text-sm">Bekleyen Ödeme</p>
          <h2 className="text-3xl font-bold mt-2">{money(pendingPaymentTotal)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="bg-zinc-900 text-left p-6 rounded-2xl active:scale-95 transition">
          <h2 className="text-xl font-semibold">Müşteriler</h2>
          <p className="text-zinc-400 mt-2">CRM Yönetimi</p>
        </button>

        <button className="bg-zinc-900 text-left p-6 rounded-2xl active:scale-95 transition">
          <h2 className="text-xl font-semibold">Gelir-Gider</h2>
          <p className="text-zinc-400 mt-2">Finans Takibi</p>
        </button>

        <button className="bg-zinc-900 text-left p-6 rounded-2xl active:scale-95 transition">
          <h2 className="text-xl font-semibold">Hatırlatmalar</h2>
          <p className="text-zinc-400 mt-2">Ajanda Sistemi</p>
        </button>

        <button className="bg-zinc-900 text-left p-6 rounded-2xl active:scale-95 transition">
          <h2 className="text-xl font-semibold">AI Asistan</h2>
          <p className="text-zinc-400 mt-2">WhatsApp komut sistemi</p>
        </button>
      </div>
    </main>
  );
}
