export default function RaporlarPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-black mb-2">Raporlar</h1>
      <p className="text-slate-500 mb-5">Gelir, gider, müşteri ve performans raporları.</p>

      <div className="grid gap-3">
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="text-xl font-black">Günlük Özet</h2>
          <p className="text-slate-500 text-sm">Bugünün iş ve finans raporu.</p>
        </div>
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="text-xl font-black">Aylık Performans</h2>
          <p className="text-slate-500 text-sm">Müşteri ve gelir durumu.</p>
        </div>
      </div>
    </main>
  );
}
