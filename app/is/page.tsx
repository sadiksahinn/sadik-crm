"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { PageHeader, EmptyState, money, today } from "@/components/ui";
import {
  IUsers, IAlert, ICheck, IMessage, IPlus, IPlayCircle, IBriefcase, IClock, ICheckCircle,
} from "@/components/Icons";
import { getValidSession } from "@/utils/auth-client";

const supabase = createClient();

export default function IsPage() {
  const [customers, setCustomers]   = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [tasks, setTasks]           = useState<any[]>([]);
  const [contents, setContents]     = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab]               = useState<"ozet"|"musteriler"|"tahsilat"|"gorev">("ozet");
  const [savingId, setSavingId]     = useState<string | null>(null);

  async function load() {
    const user = (await getValidSession(supabase))?.user;
    if (!user) { window.location.href="/login"; return; }

    const [{ data: cust },{ data: cols },{ data: fols },{ data: conts },{ data: acts }] = await Promise.all([
      supabase.from("customers").select("*,client_services(monthly_fee,status)").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("payment_tracking").select("*").eq("user_id",user.id).eq("status","bekliyor").order("due_date",{ascending:true}),
      supabase.from("followups").select("*").eq("user_id",user.id).eq("status","bekliyor").order("followup_date",{ascending:true}),
      supabase.from("content_calendar").select("*").eq("user_id",user.id).eq("status","planlandı").lte("publish_date", new Date(Date.now()+7*86400000).toISOString().slice(0,10)).order("publish_date",{ascending:true}),
      supabase.from("activity_logs").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
    ]);
    setCustomers(cust||[]); setCollections(cols||[]); setTasks(fols||[]); setContents(conts||[]); setActivities(acts||[]);
  }

  useEffect(() => { load(); }, []);

  async function markTaskDone(id: string) {
    await supabase.from("followups").update({status:"tamamlandı"}).eq("id",id);
    load();
  }

  async function markCollectionPaid(item: any) {
    if (savingId) return;
    const user = (await getValidSession(supabase))?.user;
    if (!user) return;
    setSavingId(item.id);
    let createdIncomeId: string | undefined;
    try {
      let incomeId = item.income_id as string | undefined;
      if (!item.income_created) {
        const note = `Tahsilat kaydı · payment:${item.id}`;
        const { data: existing, error: existingError } = await supabase.from("income").select("id")
          .eq("user_id", user.id).eq("note", note).limit(1);
        if (existingError) throw existingError;
        incomeId = existing?.[0]?.id;
        if (!incomeId) {
          const { data: created, error: createError } = await supabase.from("income").insert({
            user_id:user.id, title:item.title, amount:Number(item.amount||0), income_date:today(),
            payment_method:"İş Alanı", note,
          }).select("id").single();
          if (createError || !created) throw createError || new Error("Gelir kaydı oluşturulamadı.");
          incomeId = created.id;
          createdIncomeId = created.id;
        }
      }
      const { data: updated, error: updateError } = await supabase.from("payment_tracking")
        .update({status:"ödendi",paid_date:today(),income_created:true,income_id:incomeId||null})
        .eq("id",item.id).eq("user_id",user.id).select("id").maybeSingle();
      if (updateError || !updated) {
        if (createdIncomeId) await supabase.from("income").delete().eq("id",createdIncomeId).eq("user_id",user.id);
        throw updateError || new Error("Tahsilat durumu güncellenemedi.");
      }
      await load();
    } catch (error) {
      alert(error instanceof Error ? `Tahsilat tamamlanamadı: ${error.message}` : "Tahsilat tamamlanamadı.");
    } finally {
      setSavingId(null);
    }
  }

  const colTotal = collections.reduce((t,c)=>t+Number(c.amount||0),0);
  const overdueCollections = collections.filter(c=>c.due_date<today());
  const dueTasks = tasks.filter(task => task.followup_date <= today());
  const activeCustomers = customers.filter(c=>{
    const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
    return !!svc;
  });
  const monthlyRevenue = activeCustomers.reduce((t,c)=>{
    const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
    return t + Number(svc?.monthly_fee||0);
  },0);

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader
        overline="Valkea İş"
        title="İş Alanı"
        subtitle="Müşteriler, tahsilatlar, görevler"
        actions={
          <Link href="/musteriler" className="v-btn v-btn-dark !py-2.5 !px-3.5 !text-xs">
            <IPlus size={14} /> Müşteri
          </Link>
        }
      />

      {/* Özet hero */}
      <section className="v-hero p-5 mb-5">
        <div className="relative z-10">
          <p className="v-overline !text-white/50 mb-1">Aylık tekrarlı gelir</p>
          <p className="v-num text-[34px] font-extrabold leading-none text-emerald-300 mb-4">{money(monthlyRevenue)}</p>
          <div className="flex gap-5 flex-wrap">
            <div>
              <p className="v-overline !text-white/40">Aktif müşteri</p>
              <p className="v-num font-extrabold text-emerald-300 text-sm mt-0.5">{activeCustomers.length}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Toplam</p>
              <p className="v-num font-extrabold text-sky-300 text-sm mt-0.5">{customers.length}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Tahsilat</p>
              <p className="v-num font-extrabold text-amber-300 text-sm mt-0.5">{money(colTotal)}</p>
            </div>
            <div>
              <p className="v-overline !text-white/40">Görev</p>
              <p className="v-num font-extrabold text-violet-300 text-sm mt-0.5">{tasks.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="v-seg mb-4">
        {([["ozet","Özet"],["musteriler","Müşteriler"],["tahsilat","Tahsilat"],["gorev","Görevler"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`v-seg-btn ${tab===k ? "active" : ""}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ÖZET */}
      {tab==="ozet" && (
        <div className="grid gap-3">
          <section className="v-card p-4 border border-[rgba(45,163,199,0.22)]">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2da3c7] to-[#e8a33d] text-white grid place-items-center shrink-0"><IBriefcase size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="v-overline text-teal-deep">İş brifingi</p>
                <h2 className="mt-1 font-extrabold tracking-tight">
                  {overdueCollections.length + dueTasks.length > 0 ? `${overdueCollections.length + dueTasks.length} konu bugün dikkat istiyor` : "Bugünün işleri kontrol altında"}
                </h2>
                <p className="mt-1 text-xs font-medium leading-5 text-mute">
                  {overdueCollections.length > 0 ? `${overdueCollections.length} gecikmiş tahsilat` : "Gecikmiş tahsilat yok"} · {dueTasks.length > 0 ? `${dueTasks.length} görev bekliyor` : "Bugünkü görevler tamam"} · {contents.length} yaklaşan içerik
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/hatirlatmalar" className="v-btn v-btn-soft !py-2.5 !text-xs">Görevler</Link>
              <Link href="/tahsilatlar" className="v-btn v-btn-dark !py-2.5 !text-xs">Tahsilatlar</Link>
            </div>
          </section>

          {overdueCollections.length > 0 && (
            <button onClick={()=>setTab("tahsilat")} className="text-left rounded-[22px] p-4 text-white shadow-[0_12px_32px_rgba(225,29,72,0.28)] v-press"
              style={{ background: "linear-gradient(140deg, #e11d48, #be123c)" }}>
              <div className="flex items-center gap-2 mb-0.5">
                <IAlert size={16} />
                <p className="font-extrabold text-sm">Gecikmiş Tahsilat</p>
              </div>
              <p className="text-xs text-white/80 font-medium">{overdueCollections.length} müşterinin ödemesi gecikti — incele</p>
            </button>
          )}

          {dueTasks.length > 0 && (
            <div className="v-card p-4">
              <div className="flex items-center justify-between mb-2"><p className="v-overline">Bugünün görevleri</p><span className="v-chip v-chip-amber">{dueTasks.length}</span></div>
              {dueTasks.slice(0, 3).map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                  <button onClick={() => markTaskDone(task.id)} aria-label={`${task.title} görevini tamamla`} className="v-press h-8 w-8 rounded-xl border border-line bg-canvas text-teal-deep grid place-items-center shrink-0"><ICheck size={14} /></button>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">{task.title}</p><p className={`text-[11px] font-semibold ${task.followup_date < today() ? "text-rose" : "text-mute"}`}>{task.followup_date < today() ? "Gecikti" : "Bugün"}</p></div>
                </div>
              ))}
              {dueTasks.length > 3 && <Link href="/hatirlatmalar" className="mt-2 flex items-center justify-center text-xs font-extrabold text-teal-deep">Tüm görevleri gör</Link>}
            </div>
          )}

          {contents.length > 0 && (
            <div className="v-card p-4">
              <p className="v-overline mb-3">Bu hafta içerik ({contents.length})</p>
              {contents.slice(0,3).map((c:any)=>(
                <div key={c.id} className="flex justify-between items-center py-2.5 border-b border-line last:border-0">
                  <span className="flex items-center gap-2.5 text-[13px] font-bold min-w-0">
                    <span className="text-teal-deep shrink-0"><IPlayCircle size={16} /></span>
                    <span className="truncate">{c.content_title}</span>
                  </span>
                  <span className="text-[11px] text-mute font-semibold shrink-0 ml-2">{c.publish_date}</span>
                </div>
              ))}
            </div>
          )}

          {activities.length > 0 && (
            <div className="v-card p-4">
              <p className="v-overline mb-3">Son aktiviteler</p>
              {activities.slice(0,5).map((a:any)=>(
                <div key={a.id} className="flex gap-3 py-2.5 border-b border-line last:border-0">
                  <span className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                    a.action_type==="tamamlandı" ? "bg-[#e8f7f1] text-mint" : "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                  }`}>
                    {a.action_type==="iş" ? <IBriefcase size={15} /> : a.action_type==="tamamlandı" ? <ICheckCircle size={15} /> : <IClock size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{a.action_title}</p>
                    {a.action_detail && <p className="text-[11px] text-mute font-medium truncate">{a.action_detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {overdueCollections.length === 0 && contents.length === 0 && activities.length === 0 && (
            <EmptyState icon={<IBriefcase size={24} />} title="Her şey yolunda" hint="Bekleyen iş yok. Yeni müşteri ekleyerek başlayabilirsin." />
          )}
        </div>
      )}

      {/* MÜŞTERİLER */}
      {tab==="musteriler" && (
        <div className="grid gap-2.5">
          {customers.map(c=>{
            const svc = (c.client_services||[]).find((s:any)=>s.status==="devam ediyor");
            return (
              <Link key={c.id} href={`/musteriler/${c.id}`} className="v-card v-press p-4 block">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex gap-3 items-center min-w-0">
                    <div className={`h-11 w-11 rounded-2xl grid place-items-center font-extrabold text-sm shrink-0 ${
                      svc ? "bg-[rgba(45,163,199,0.12)] text-teal-deep" : "bg-canvas text-mute"
                    }`}>
                      {(c.brand_name||c.name||"?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{c.brand_name||c.name}</p>
                      <p className="text-xs text-mute font-medium">{c.phone||"—"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {svc && <p className="v-num font-extrabold text-[13px] text-teal-deep">{money(svc.monthly_fee)}/ay</p>}
                    <span className={`v-chip mt-1 ${svc ? "v-chip-teal" : "v-chip-mute"}`}>{svc?"aktif":"pasif"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {customers.length===0 && (
            <EmptyState
              icon={<IUsers size={24} />}
              title="Henüz müşteri yok"
              action={<Link href="/musteriler" className="v-btn v-btn-dark !py-2.5 !px-5 !text-[13px]"><IPlus size={15} /> Müşteri Ekle</Link>}
            />
          )}
        </div>
      )}

      {/* TAHSİLAT */}
      {tab==="tahsilat" && (
        <div className="grid gap-2.5">
          {collections.map(item=>{
            const isOvr = item.due_date < today();
            const init = item.title.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
            return (
              <div key={item.id} className="v-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-2xl grid place-items-center font-extrabold text-xs shrink-0 ${
                    isOvr ? "bg-[#fdeef1] text-rose" : "bg-[rgba(45,163,199,0.12)] text-teal-deep"
                  }`}>{init}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{item.title}</p>
                    <p className={`text-xs font-medium ${isOvr ? "text-rose" : "text-mute"}`}>{isOvr?"Gecikmiş":"Vade"}: {item.due_date}</p>
                  </div>
                  <p className={`v-num font-extrabold text-[15px] shrink-0 ${isOvr ? "text-rose" : "text-ink"}`}>{money(Number(item.amount))}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={savingId===item.id} onClick={()=>markCollectionPaid(item)} className="v-btn v-btn-mint flex-1 !py-2.5 !text-[13px] disabled:opacity-50">
                    <ICheck size={15} /> {savingId===item.id ? "İşleniyor..." : "Ödendi"}
                  </button>
                  <button onClick={()=>{
                    const msg=`Merhaba, ${item.title} için ${money(Number(item.amount))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.`;
                    navigator.clipboard.writeText(msg).catch(()=>{});
                    alert("WhatsApp mesajı kopyalandı");
                  }} className="v-btn v-btn-soft !py-2.5 !px-4 !text-[13px] !text-teal-deep">
                    <IMessage size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {collections.length===0 && (
            <EmptyState icon={<ICheckCircle size={24} />} title="Bekleyen tahsilat yok" />
          )}
        </div>
      )}

      {/* GÖREVLER */}
      {tab==="gorev" && (
        <div className="grid gap-2.5">
          {tasks.map(task=>{
            const isOvr = task.followup_date < today();
            return (
              <div key={task.id} className="v-card p-4">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{task.title}</p>
                    <p className={`text-xs font-medium mt-0.5 ${isOvr ? "text-rose" : "text-mute"}`}>{task.followup_date}{isOvr?" · gecikti":""}</p>
                    {task.message_suggestion && <p className="text-[11px] text-mute font-medium italic mt-1">"{task.message_suggestion}"</p>}
                  </div>
                  {task.priority && task.priority!=="normal" && (
                    <span className={`v-chip shrink-0 ${task.priority==="acil" ? "v-chip-rose" : "v-chip-amber"}`}>{task.priority}</span>
                  )}
                </div>
                <button onClick={()=>markTaskDone(task.id)} className="v-btn v-btn-mint w-full !py-2.5 !text-[13px]">
                  <ICheck size={15} /> Tamamlandı
                </button>
              </div>
            );
          })}
          {tasks.length===0 && (
            <EmptyState icon={<ICheckCircle size={24} />} title="Bekleyen görev yok" />
          )}
        </div>
      )}
    </main>
  );
}
