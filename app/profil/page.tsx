export default function ProfilPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-black mb-2">Profil</h1>
      <p className="text-slate-500 mb-5">Valkea Assistant kullanıcı ayarları.</p>

      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-fuchsia-500 to-orange-400 text-white grid place-items-center text-2xl font-black mb-4">
          S
        </div>
        <h2 className="text-2xl font-black">Sadık Şahin</h2>
        <p className="text-slate-500">Valkea Assistant</p>
      </div>
    </main>
  );
}
