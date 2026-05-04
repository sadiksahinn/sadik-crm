import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default async function CustomersPage() {
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-black text-white p-5 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Müşteriler</h1>
          <p className="text-zinc-400 mt-2">
            CRM müşteri yönetimi
          </p>
        </div>

        <div className="flex gap-2">
          <a href="/musteriler/yeni" className="bg-white text-black px-4 py-2 rounded-xl font-bold">
            + Yeni
          </a>
          <a href="/" className="bg-zinc-900 px-4 py-2 rounded-xl">
            Dashboard
          </a>
        </div>
      </div>

      <div className="grid gap-4">
        {customers?.map((customer) => (
          <div
            key={customer.id}
            className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold">
                  {customer.brand_name || customer.name}
                </h2>

                <p className="text-zinc-400 mt-1">
                  {customer.phone || "Telefon yok"}
                </p>

                <p className="text-zinc-500 mt-2 text-sm">
                  {customer.notes || "Not bulunmuyor"}
                </p>
              </div>

              <div className="bg-zinc-800 px-3 py-1 rounded-full text-sm">
                {customer.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
