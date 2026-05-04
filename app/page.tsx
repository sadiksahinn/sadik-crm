import Link from "next/link";
import Image from "next/image";
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
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-5">
        <div className="relative h-14 w-44">
          <Image
            src="/valkea-logo.png"
            alt="Valkea Assistant"
            fill
            priority
            className="object-contain object-left"
          />
        </div>

        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-full bg-white shadow-xl grid place-items-center">
            🔔
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 shadow-xl grid place-items-center text-white font-black">
            S
          </div>
        </div>
      </header>

      <section className="mb-5">
        <h1 className="text-2xl font-black tracking-tight">
          Günaydın, Sadık 👋
        </h1>
        <p className="text-slate-500 mt-2 text-base">
          Valkea Assistant hazır, gününü birlikte planlayalım.
        </p>
      </section>

      <section className="relative overflow-hidden rounded-[22px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] border border-white p-4 mb-5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400" />
        <div className="absolute -right-8 top-12 h-44 w-44 rounded-full bg-gradient-to-br from-blue-400/20 via-fuchsia-400/20 to-orange-400/20 blur-2xl" />

        <p className="text-sm font-bold text-purple-600">BUGÜN</p>
        <h2 className="text-2xl font-black mt-3">
          Bugün kontrol sende.
        </h2>
        <p className="text-slate-500 mt-1">
          Planla, yönet, büyüt.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div>
            <div className="h-10 w-10 rounded-2xl bg-blue-50 grid place-items-center text-xl">
              ✓
            </div>
            <div className="text-2xl font-black mt-2">{pendingTasks || 0}</div>
            <p className="text-sm text-slate-500">Görev</p>
          </div>

          <div>
            <div className="h-10 w-10 rounded-2xl bg-purple-50 grid place-items-center text-xl">
              👥
            </div>
            <div className="text-2xl font-black mt-2">{customerCount || 0}</div>
            <p className="text-sm text-slate-500">Müşteri</p>
          </div>

          <div>
            <div className="h-10 w-10 rounded-2xl bg-orange-50 grid place-items-center text-xl">
              💳
            </div>
            <div className="text-2xl font-black mt-2">{money(todayIncome)}</div>
            <p className="text-sm text-slate-500">Gelir</p>
          </div>
        </div>

        <Link
          href="/musteriler"
          className="inline-flex items-center gap-2 mt-4 bg-white border border-slate-200 rounded-full px-6 py-3 shadow-sm font-bold text-slate-700"
        >
          Detaylara git <span className="text-purple-600">→</span>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-2 mb-4">
        <Link href="/musteriler" className="bg-white rounded-[22px] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 grid place-items-center text-2xl mb-4">👥</div>
          <p className="text-slate-500">Müşteriler</p>
          <h3 className="text-2xl font-black">{customerCount || 0}</h3>
          <p className="text-sm text-slate-400">Aktif portföy</p>
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[22px] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="h-10 w-10 rounded-2xl bg-purple-50 grid place-items-center text-2xl mb-4">₺</div>
          <p className="text-slate-500">Gelir</p>
          <h3 className="text-2xl font-black">{money(todayIncome)}</h3>
          <p className="text-sm text-slate-400">Bugünkü gelir</p>
        </Link>

        <Link href="/gelir-gider" className="bg-white rounded-[22px] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="h-10 w-10 rounded-2xl bg-red-50 grid place-items-center text-2xl mb-4">↘</div>
          <p className="text-slate-500">Gider</p>
          <h3 className="text-2xl font-black">{money(todayExpense)}</h3>
          <p className="text-sm text-slate-400">Bugünkü gider</p>
        </Link>

        <Link href="/hatirlatmalar" className="bg-white rounded-[22px] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="h-10 w-10 rounded-2xl bg-orange-50 grid place-items-center text-2xl mb-4">📈</div>
          <p className="text-slate-500">Performans</p>
          <h3 className="text-2xl font-black">%78</h3>
          <p className="text-sm text-slate-400">Aylık durum</p>
        </Link>
      </section>

      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-700 tracking-wide">HIZLI KOMUTLAR</h2>
          <span className="text-slate-400">Tümü ›</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link href="/musteriler" className="min-w-[120px] bg-white rounded-2xl p-4 shadow-sm font-bold">
            <div className="text-2xl text-blue-500 mb-2">＋</div>
            Müşteri<br />Ekle
          </Link>
          <Link href="/asistan" className="min-w-[120px] bg-white rounded-2xl p-4 shadow-sm font-bold">
            <div className="text-2xl mb-2">💬</div>
            Mesaj<br />Gönder
          </Link>
          <Link href="/asistan" className="min-w-[120px] bg-white rounded-2xl p-4 shadow-sm font-bold">
            <div className="text-2xl mb-2">🎬</div>
            İçerik<br />Oluştur
          </Link>
          <Link href="/raporlar" className="min-w-[120px] bg-white rounded-2xl p-4 shadow-sm font-bold">
            <div className="text-2xl mb-2">📊</div>
            Rapor<br />Al
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-black text-slate-700 tracking-wide mb-4">BUGÜNÜN AKIŞI</h2>

        <div className="grid gap-4">
          <div className="flex gap-4 items-center">
            <div className="text-blue-500 font-bold w-14">10:00</div>
            <div className="flex-1 bg-white rounded-3xl p-4 shadow-sm">
              <h3 className="font-black">Müşteri Araması</h3>
              <p className="text-slate-500 text-sm">Görüşme ve takip</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-purple-500 font-bold w-14">13:00</div>
            <div className="flex-1 bg-white rounded-3xl p-4 shadow-sm">
              <h3 className="font-black">İçerik Çekimi</h3>
              <p className="text-slate-500 text-sm">Reels / sosyal medya planı</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-orange-500 font-bold w-14">16:00</div>
            <div className="flex-1 bg-white rounded-3xl p-4 shadow-sm">
              <h3 className="font-black">Ödeme Takibi</h3>
              <p className="text-slate-500 text-sm">Bekleyen ödemeleri kontrol et</p>
            </div>
          </div>
        </div>
      </section>

      <Link
        href="/asistan"
        className="fixed right-5 bottom-24 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 shadow-2xl grid place-items-center text-white text-2xl"
      >
        +
      </Link>

      <nav className="fixed bottom-4 left-3 right-3 rounded-[24px] bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.18)] p-3 grid grid-cols-5 gap-1">
        <Link href="/" className="text-center text-purple-600 font-bold text-xs">
          🏠<br />Ana Sayfa
        </Link>
        <Link href="/asistan" className="text-center text-slate-500 font-bold text-xs">
          🤖<br />Asistan
        </Link>
        <Link href="/hatirlatmalar" className="text-center text-slate-500 font-bold text-xs">
          📋<br />Görevler
        </Link>
        <Link href="/musteriler" className="text-center text-slate-500 font-bold text-xs">
          👥<br />CRM
        </Link>
        <Link href="/profil" className="text-center text-slate-500 font-bold text-xs">
          👤<br />Profil
        </Link>
      </nav>
    </main>
  );
}
