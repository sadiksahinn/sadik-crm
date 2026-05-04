export default function AsistanPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-black mb-2">AI Asistan</h1>
      <p className="text-slate-500 mb-5">WhatsApp ve yazılı komut sistemi burada olacak.</p>

      <div className="bg-white rounded-3xl p-4 shadow-sm mb-4">
        <p className="text-slate-500 text-sm mb-2">Örnek komut</p>
        <h2 className="font-black">
          “Suite Halı’dan bugün 20.000 TL aldım.”
        </h2>
      </div>

      <textarea
        placeholder="Asistana komut yaz..."
        className="w-full h-40 bg-white rounded-3xl p-4 outline-none shadow-sm"
      />

      <button className="w-full mt-3 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-400 text-white rounded-2xl p-4 font-bold">
        Komutu Çalıştır
      </button>
    </main>
  );
}
