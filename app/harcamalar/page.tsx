"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { EmptyState, money, PageHeader } from "@/components/ui";
import { ICard, IChevronRight, IEdit, IReceipt, ISparkle, ITrash } from "@/components/Icons";
import { connectionErrorMessage, withTimeout } from "@/utils/async";
import { dateKey } from "@/utils/date";
import FinanceSections from "@/components/FinanceSections";
import { isAccountMovement, isCardExpense } from "@/utils/finance";

const supabase = createClient();
const CHANNEL_LABELS: Record<string, string> = {
  temassiz: "Temassız", qr: "QR", fiziksel_kart: "Fiziksel kart", internet: "İnternet", bilinmiyor: "Bilinmiyor",
};

function noteValue(note: string, label: string) {
  const part = String(note || "").split(" · ").find((value) => value.startsWith(`${label}: `));
  return part ? part.slice(label.length + 2).trim() : "";
}

type ExpenseRow = {
  id: string; title: string; amount: number; expense_date: string;
  note?: string | null; category?: string | null; payment_method?: string | null;
};
type Expense = ReturnType<typeof enriched>;

function enriched(item: ExpenseRow) {
  const note = String(item.note || "");
  return {
    ...item,
    explanation: noteValue(note, "Açıklama"),
    merchant: noteValue(note, "İşyeri"),
    city: noteValue(note, "Şehir"),
    context: noteValue(note, "Bağlam") || "Kişisel",
    project: noteValue(note, "İş/Proje"),
    channel: noteValue(note, "Ödeme") || "bilinmiyor",
    status: noteValue(note, "Durum") || "kesinleşmiş",
    card: item.payment_method === "Enpara Sanal Kart" ? "sanal" : item.payment_method === "Enpara Kredi Kartı" ? "ana" : "diger",
  };
}

export default function HarcamalarPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [card, setCard] = useState("tumu");
  const [channel, setChannel] = useState("tumu");
  const [category, setCategory] = useState("tumu");
  const [context, setContext] = useState("tumu");
  const [period, setPeriod] = useState("ay");
  const [explanation, setExplanation] = useState("tumu");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteLock = useRef(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  async function deleteExpense(item: Expense) {
    if (deleteLock.current) return;
    if (!window.confirm(`${item.merchant || item.title}\n${money(Number(item.amount))} · ${item.expense_date}\n\nBu harcamayı kalıcı olarak silmek istiyor musun? Harcama toplamından çıkarılacak. Bu işlem geri alınamaz.`)) return;
    deleteLock.current = true;
    setDeletingId(item.id);
    setDeleteMessage("");
    try {
      const { data: { user }, error: authError } = await withTimeout(supabase.auth.getUser());
      if (authError || !user) throw new Error("Oturum doğrulanamadı. Yeniden giriş yapıp tekrar dene.");
      const { data, error } = await withTimeout(supabase.from("expenses")
        .delete().eq("id", item.id).eq("user_id", user.id).select("id"));
      if (error) throw new Error("Harcama silinemedi. Bağlantını ve hesabının silme yetkisini kontrol edip tekrar dene.");
      if (!data?.some((row) => row.id === item.id)) throw new Error("Silme doğrulanamadı. Kayıt bulunamadı veya silme yetkisi yok; listeyi yenileyip tekrar dene.");
      setItems((current) => current.filter((row) => row.id !== item.id));
      setEditing((current) => current?.id === item.id ? null : current);
      setDeleteMessage("Harcama silindi. Listedeki toplam güncellendi.");
    } catch (error) {
      const message = error instanceof Error && error.message !== "SERVICE_TIMEOUT"
        ? error.message : "Silme sonucu alınamadı. Tekrar denemeden önce listeyi yenileyerek kontrol et.";
      window.alert(message);
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
    }
  }

  async function load() {
    setLoading(true); setLoadError("");
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser());
      if (!user) { window.location.href = "/login"; return; }
      const { data, error } = await withTimeout(
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      );
      if (error) throw error;
      setItems((data || []).map(enriched));
    } catch (error) {
      setLoadError(connectionErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestedStatus = new URLSearchParams(window.location.search).get("durum");
      setExplanation(requestedStatus === "bekleyen" || requestedStatus === "aciklanan" ? requestedStatus : "tumu");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!editing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editing]);

  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.merchant} ${item.city} ${item.explanation} ${item.category} ${item.context} ${item.project}`.toLocaleLowerCase("tr-TR");
    if (query && !haystack.includes(query.toLocaleLowerCase("tr-TR"))) return false;
    if (card !== "tumu" && item.card !== card) return false;
    if (channel !== "tumu" && item.channel !== channel) return false;
    if (category !== "tumu" && String(item.category || "").toLocaleLowerCase("tr-TR") !== category.toLocaleLowerCase("tr-TR")) return false;
    if (context !== "tumu" && String(item.context || "").toLocaleLowerCase("tr-TR") !== context.toLocaleLowerCase("tr-TR")) return false;
    if (explanation === "bekleyen" && item.explanation) return false;
    if (explanation === "aciklanan" && !item.explanation) return false;
    const itemDate = String(item.expense_date || "").slice(0, 10);
    const now = new Date();
    const todayKey = dateKey(now);
    const monthKey = todayKey.slice(0, 7);
    const weekKey = dateKey(new Date(now.getTime() - 6 * 86_400_000));
    if (period === "bugun" && itemDate !== todayKey) return false;
    if (period === "hafta" && itemDate < weekKey) return false;
    if (period === "ay" && !itemDate.startsWith(monthKey)) return false;
    return true;
  }), [items, query, card, channel, category, context, explanation, period]);

  const total = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cardTotal = filtered.filter(isCardExpense).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const accountTotal = filtered.filter(isAccountMovement).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const waiting = filtered.filter((item) => !item.explanation && ["ana", "sanal"].includes(item.card)).length;
  const activeFilterCount = [period !== "ay", card !== "tumu", channel !== "tumu", category !== "tumu", context !== "tumu", explanation !== "tumu"].filter(Boolean).length;
  const explanationSuggestions = useMemo(() => {
    const query = String(editing?.explanation || "").trim().toLocaleLowerCase("tr-TR");
    const merchant = String(editing?.merchant || editing?.title || "").trim().toLocaleLowerCase("tr-TR");
    const source = query
      ? items
      : items.filter((item) => item.id !== editing?.id && String(item.merchant || item.title || "").trim().toLocaleLowerCase("tr-TR") === merchant);
    const unique = Array.from(new Set(source.map((item) => String(item.explanation || "").trim()).filter(Boolean)));
    if (!query) return unique.slice(0, 5);
    return unique
      .filter((value) => value.toLocaleLowerCase("tr-TR").startsWith(query) && value.toLocaleLowerCase("tr-TR") !== query)
      .slice(0, 5);
  }, [items, editing?.id, editing?.explanation, editing?.merchant, editing?.title]);
  const explanationQueue = useMemo(() => items.filter((item) => !item.explanation), [items]);
  const editingWasPending = !!editing && !items.find((item) => item.id === editing.id)?.explanation;

  async function saveEdit() {
    if (!editing) return;
    const cleanExplanation = String(editing.explanation || "").trim();
    if (!cleanExplanation) {
      alert("Harcamayı tamamlamak için açıklama yazmalısın.");
      return;
    }
    const paymentMethod = editing.card === "sanal" ? "Enpara Sanal Kart" : editing.card === "ana" ? "Enpara Kredi Kartı" : editing.payment_method;
    const note = [
      `Açıklama: ${cleanExplanation}`,
      editing.merchant ? `İşyeri: ${editing.merchant}` : "",
      editing.city ? `Şehir: ${editing.city}` : "",
      `Bağlam: ${editing.context || "Kişisel"}`,
      editing.project ? `İş/Proje: ${editing.project}` : "",
      `Ödeme: ${editing.channel || "bilinmiyor"}`,
      `Durum: ${editing.status || "kesinleşmiş"}`,
    ].filter(Boolean).join(" · ");
    const { error } = await supabase.from("expenses").update({
      category: editing.category || "Diğer", payment_method: paymentMethod, note,
    }).eq("id", editing.id);
    if (error) { alert("Güncelleme yapılamadı: " + error.message); return; }
    const savedItem = enriched({ ...editing, category: editing.category || "Diğer", payment_method: paymentMethod, note });
    const nextItem = editingWasPending ? explanationQueue.find((item) => item.id !== editing.id) || null : null;
    setItems((current) => current.map((item) => item.id === editing.id ? savedItem : item));
    setEditing(nextItem);
    setShowEditDetails(false);
  }

  return (
    <>
    <main className="v-enter min-h-screen w-full min-w-0 overflow-x-hidden px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader overline="Valkea Finans" title="Harcamalar" subtitle="Ekstreler, kartlar ve açıklamalar" />
      <FinanceSections />
      {deleteMessage && <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{deleteMessage}</p>}

      {loadError && <section className="v-card p-4 mb-4 border border-rose/20"><p className="text-sm font-bold text-rose">{loadError}</p><button onClick={load} className="v-btn v-btn-soft w-full mt-3 !py-2.5">Tekrar dene</button></section>}

      <section className="v-hero p-5 mb-4">
        <div className="relative z-10">
          <p className="v-overline !text-white/50">Filtrelenen harcama</p>
          <p className="v-num mt-1 text-[34px] font-extrabold">{money(total)}</p>
          <p className="mt-2 text-xs font-medium text-white/60">{filtered.length} hareket · {waiting} açıklama bekliyor</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 px-3 py-2"><p className="text-[9px] font-extrabold uppercase tracking-wider text-white/45">Kartlardan</p><p className="v-num mt-0.5 text-xs font-extrabold">{money(cardTotal)}</p></div>
            <div className="rounded-2xl bg-white/10 px-3 py-2"><p className="text-[9px] font-extrabold uppercase tracking-wider text-white/45">Hesaptan</p><p className="v-num mt-0.5 text-xs font-extrabold">{money(accountTotal)}</p></div>
          </div>
          <Link href="/asistan" className="v-btn mt-4 w-full bg-white text-ink !py-3">
            <ISparkle size={16} /> Ekstre veya fiş yükle <IChevronRight size={15} />
          </Link>
        </div>
      </section>

      <section className="v-card p-4 mb-4 grid gap-2.5">
        <div className="flex gap-2.5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İşyeri veya açıklama ara" className="v-input min-w-0 flex-1" />
          <button type="button" onClick={() => setShowFilters(value => !value)} className={`v-btn shrink-0 !px-3.5 ${showFilters || activeFilterCount ? "v-btn-dark" : "v-btn-soft"}`}>Filtre{activeFilterCount ? ` (${activeFilterCount})` : ""}</button>
        </div>
        {showFilters && <>
        <div className="grid grid-cols-2 gap-2.5">
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="v-input">
            <option value="bugun">Bugün</option><option value="hafta">Son 7 gün</option><option value="ay">Bu ay</option><option value="tumu">Tüm zamanlar</option>
          </select>
          <select value={card} onChange={(event) => setCard(event.target.value)} className="v-input">
            <option value="tumu">Tüm kartlar</option><option value="ana">Enpara kartım</option><option value="sanal">Sanal kartım</option><option value="diger">Diğer</option>
          </select>
        </div>
        <select value={context} onChange={(event) => setContext(event.target.value)} className="v-input" aria-label="Harcama bağlamı filtresi">
          <option value="tumu">Tüm bağlamlar</option>
          {["Kişisel","Ev","İş","Tatil","Sağlık","Aile","Eğitim"].map(value => <option key={value}>{value}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2.5">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="v-input" aria-label="Kategori filtresi">
            <option value="tumu">Tüm kategoriler</option>
            {["Market","Ulaşım","Yemek","Fatura","Sağlık","Eğlence","Konaklama","Akaryakıt","Kira","Abonelik","Diğer"].map(value => <option key={value}>{value}</option>)}
          </select>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} className="v-input">
            <option value="tumu">Tüm yöntemler</option><option value="temassiz">Temassız</option><option value="qr">QR</option><option value="fiziksel_kart">Fiziksel kart</option><option value="internet">İnternet</option><option value="bilinmiyor">Bilinmiyor</option>
          </select>
        </div>
        <div className="v-seg">
          {[['tumu','Tümü'],['bekleyen','Açıklama bekleyen'],['aciklanan','Açıklanan']].map(([value,label]) => (
            <button key={value} onClick={() => setExplanation(value)} className={`v-seg-btn ${explanation === value ? "active" : ""}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => { setPeriod("ay"); setCard("tumu"); setCategory("tumu"); setContext("tumu"); setChannel("tumu"); setExplanation("tumu"); }} className="v-btn v-btn-soft w-full !py-2.5 !text-xs">Filtreleri temizle</button>
        </>}
      </section>

      <section className="grid gap-2.5">
        {loading && [1,2,3].map((value) => <div key={value} className="skeleton h-28" />)}
        {!loading && filtered.length === 0 && <EmptyState icon={<IReceipt size={24} />} title="Bu filtrede harcama yok" hint="Ekstre yükleyebilir veya filtreleri değiştirebilirsin." />}
        {filtered.map((item) => (
          <article key={item.id} className="v-card min-w-0 overflow-hidden p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#fdeef1] text-rose grid place-items-center shrink-0"><ICard size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 break-words font-extrabold text-sm leading-snug line-clamp-2">{item.merchant || item.title}</h2>
                  <p className="v-num font-extrabold text-rose text-sm shrink-0">-{money(Number(item.amount))}</p>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-mute">{item.expense_date} · {item.category || "Diğer"}{item.city ? ` · ${item.city}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="v-chip v-chip-teal !text-[9px]">{item.card === "sanal" ? "Sanal kart" : item.card === "ana" ? "Enpara kart" : item.payment_method || "Diğer"}</span>
                  <span className="v-chip v-chip-mute !text-[9px]">{CHANNEL_LABELS[item.channel] || "Bilinmiyor"}</span>
                </div>
                <p className={`mt-2 text-xs font-semibold ${item.explanation ? "text-sub" : "text-[#a16a14]"}`}>
                  {item.explanation || "Bu harcama ne içindi?"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 gap-2">
              <button disabled={!!deletingId} onClick={() => { setEditing(item); setShowEditDetails(false); }} className="v-btn v-btn-soft flex-1 min-w-0 !whitespace-normal !px-3 !py-2.5 !text-center !text-[12px] disabled:opacity-50"><IEdit className="shrink-0" size={14} /> <span className="min-w-0">Açıkla veya düzenle</span></button>
              <button type="button" disabled={!!deletingId} onClick={() => void deleteExpense(item)} aria-label={`${item.merchant || item.title} harcamasını sil`} className="v-btn shrink-0 !w-auto !px-3 !py-2.5 !text-xs bg-[#fdeef1] text-rose disabled:opacity-50"><ITrash size={15} /> {deletingId === item.id ? "Siliniyor…" : "Sil"}</button>
            </div>
          </article>
        ))}
      </section>

    </main>

      {editing && createPortal(
        <section role="dialog" aria-modal="true" aria-labelledby="expense-dialog-title" className="fixed inset-0 z-[99999] bg-ink/45 backdrop-blur-sm flex items-end justify-center" onClick={() => setEditing(null)}>
          <div className="v-sheet-enter bg-white rounded-t-[28px] p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] w-full max-w-[520px] max-h-[88dvh] overflow-y-auto shadow-[0_-20px_60px_rgba(11,16,32,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <h2 id="expense-dialog-title" className="text-xl font-extrabold">Harcamanı açıkla</h2>
            <p className="mt-1 mb-4 text-sm text-mute">{editing.merchant || editing.title} · {money(Number(editing.amount))}</p>
            {editingWasPending && explanationQueue.length > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-[rgba(232,163,61,0.12)] px-3.5 py-2.5 text-[#8a5a10]">
                <span className="text-xs font-extrabold">Açıklama kuyruğu</span>
                <span className="v-chip v-chip-amber">{explanationQueue.length} kaldı</span>
              </div>
            )}
            <div className="grid gap-3">
              <label className="block">
                <span className="v-field-label">Açıklama</span>
                <textarea rows={3} value={editing.explanation || ""} onChange={(event) => setEditing({...editing, explanation:event.target.value})} placeholder="Açıklama yazılması zorunlu" autoComplete="off" aria-required="true" className="v-input resize-none" />
                {explanationSuggestions.length > 0 && (
                  <div className="mt-2 rounded-2xl border border-line bg-white p-1.5 shadow-[0_12px_30px_rgba(11,16,32,0.10)]" role="listbox" aria-label="Önceki açıklamalardan öneriler">
                    <p className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-mute">{String(editing.explanation || "").trim() ? "Önceki açıklamalar" : "Bu işyerinde daha önce"}</p>
                    {explanationSuggestions.map((suggestion) => (
                      <button key={suggestion} type="button" role="option" aria-selected={editing.explanation === suggestion} onClick={() => setEditing({...editing, explanation:suggestion})} className="w-full rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-ink hover:bg-soft active:bg-soft">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </label>
              <button type="button" onClick={() => setShowEditDetails(value => !value)} className="v-btn v-btn-soft w-full !py-2.5 !text-xs">{showEditDetails ? "Detayları gizle" : "Kategori, şehir, kart ve ödeme şekli"}</button>
              {showEditDetails && <div className="v-filter-fields">
                <label className="block">
                  <span className="v-field-label">Kategori</span>
                  <select value={editing.category || "Diğer"} onChange={(event) => setEditing({...editing, category:event.target.value})} className="v-input">
                    {["Market","Ulaşım","Yemek","Fatura","Sağlık","Eğlence","Konaklama","Akaryakıt","Kira","Abonelik","Diğer"].map(value => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="v-field-label">Şehir</span>
                  <input value={editing.city || ""} onChange={(event) => setEditing({...editing, city:event.target.value})} placeholder="Örn. Ankara" className="v-input" />
                </label>
                <label className="block">
                  <span className="v-field-label">Harcama bağlamı</span>
                  <select value={editing.context || "Kişisel"} onChange={(event) => setEditing({...editing, context:event.target.value})} className="v-input">
                    {["Kişisel","Ev","İş","Tatil","Sağlık","Aile","Eğitim"].map(value => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="v-field-label">İş / proje (isteğe bağlı)</span>
                  <input value={editing.project || ""} onChange={(event) => setEditing({...editing, project:event.target.value})} placeholder="Örn. Antalya tatili, müşteri çekimi" className="v-input" />
                </label>
                <label className="block">
                  <span className="v-field-label">Kullanılan kart</span>
                  <select value={editing.card} onChange={(event) => setEditing({...editing, card:event.target.value})} className="v-input"><option value="ana">Enpara ana kart</option><option value="sanal">Enpara sanal kart</option><option value="diger">Diğer kart / nakit</option></select>
                </label>
                <label className="block">
                  <span className="v-field-label">Ödeme şekli</span>
                  <select value={editing.channel} onChange={(event) => setEditing({...editing, channel:event.target.value})} className="v-input"><option value="temassiz">Temassız</option><option value="qr">QR</option><option value="fiziksel_kart">Fiziksel kart</option><option value="internet">İnternet</option><option value="bilinmiyor">Bilinmiyor</option></select>
                </label>
              </div>}
              {!String(editing.explanation || "").trim() && <p className="text-xs font-bold text-[#a16a14]">Kaydetmek için bu harcamanın ne olduğunu yaz.</p>}
              <div className="grid grid-cols-2 gap-2.5"><button disabled={!!deletingId || !String(editing.explanation || "").trim()} onClick={saveEdit} className="v-btn v-btn-dark disabled:opacity-40 disabled:cursor-not-allowed">{explanationQueue.length > 1 && editingWasPending ? "Kaydet, sıradaki" : "Kaydet"}</button><button onClick={() => setEditing(null)} className="v-btn v-btn-soft">Kapat</button></div>
              <button type="button" disabled={!!deletingId} onClick={() => void deleteExpense(editing)} className="v-btn w-full bg-[#fdeef1] text-rose disabled:opacity-50"><ITrash size={16} /> {deletingId ? "Siliniyor…" : "Bu harcamayı sil"}</button>
            </div>
          </div>
        </section>,
        document.body
      )}
    </>
  );
}
