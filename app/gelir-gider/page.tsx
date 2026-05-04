export default function GelirGiderPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-black mb-2">Gelir - Gider</h1>
      <p className="text-slate-500 mb-5">Günlük kasa, ödeme ve gider takibi.</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-slate-500">Bugünkü Gelir</p>
          <h2 className="text-3xl font-black">₺0</h2>
        </div>
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-slate-500">Bugünkü Gider</p>
          <h2 className="text-3xl font-black">₺0</h2>
        </div>
      </div>

      <button className="w-full bg-slate-950 text-white rounded-2xl p-4 font-bold mb-3">
        + Gelir Ekle
      </button>
      <button className="w-full bg-white rounded-2xl p-4 font-bold shadow-sm">
        + Gider Ekle
      </button>
    </main>
  );
}
