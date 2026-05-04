export default function HatirlatmalarPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-black mb-2">Hatırlatmalar</h1>
      <p className="text-slate-500 mb-5">Çekim, ödeme ve teslim planların.</p>

      <div className="grid gap-3">
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-purple-600 font-bold">Bugün</p>
          <h2 className="text-xl font-black mt-1">Ödeme takibi</h2>
          <p className="text-slate-500 text-sm">Bekleyen müşterileri kontrol et.</p>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <p className="text-blue-600 font-bold">Yarın</p>
          <h2 className="text-xl font-black mt-1">İçerik planı</h2>
          <p className="text-slate-500 text-sm">Haftalık reels planını oluştur.</p>
        </div>
      </div>
    </main>
  );
}
