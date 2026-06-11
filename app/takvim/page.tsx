"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PageHeader, money } from "@/components/ui";
import { IChevronLeft, IChevronRight, IDownload, ILira, IPlayCircle, ICheck, IPlus } from "@/components/Icons";

const supabase = createClient();

type CalItem = { type: "icerik" | "tahsilat" | "takip"; title: string; date: string; status: string; amount?: number; id: string };

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

export default function TakvimPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [items, setItems] = useState<CalItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [token, setToken] = useState("");

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { window.location.href = "/login"; return; }
    const uid = userData.user.id;
    const { data: sessionData } = await supabase.auth.getSession();
    setToken(sessionData.session?.access_token || "");

    const start = `${year}-${pad2(month + 1)}-01`;
    const end = `${year}-${pad2(month + 1)}-${pad2(getDaysInMonth(year, month))}`;

    const [{ data: contents }, { data: payments }, { data: followups }] = await Promise.all([
      supabase.from("content_calendar").select("*").eq("user_id", uid).gte("publish_date", start).lte("publish_date", end),
      supabase.from("payment_tracking").select("*").eq("user_id", uid).gte("due_date", start).lte("due_date", end),
      supabase.from("followups").select("*").eq("user_id", uid).gte("followup_date", start).lte("followup_date", end),
    ]);

    setItems([
      ...(contents || []).map((x: any): CalItem => ({ type: "icerik", title: x.content_title, date: x.publish_date, status: x.status, id: x.id })),
      ...(payments || []).map((x: any): CalItem => ({ type: "tahsilat", title: x.title, date: x.due_date, status: x.status, amount: Number(x.amount || 0), id: x.id })),
      ...(followups || []).map((x: any): CalItem => ({ type: "takip", title: x.title, date: x.followup_date, status: x.status, id: x.id })),
    ]);
  }

  useEffect(() => { load(); }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = new Date().toISOString().slice(0, 10);

  const itemsByDate: Record<string, CalItem[]> = {};
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] || []) : [];
  const monthLabel = new Date(year, month, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  function dotColor(type: CalItem["type"]) {
    if (type === "tahsilat") return "#059669";
    if (type === "icerik") return "#2da3c7";
    return "#e8a33d";
  }

  function typeChip(type: CalItem["type"]) {
    if (type === "tahsilat") return <span className="v-chip v-chip-mint"><ILira size={12} /> Tahsilat</span>;
    if (type === "icerik") return <span className="v-chip v-chip-teal"><IPlayCircle size={12} /> İçerik</span>;
    return <span className="v-chip v-chip-amber"><ICheck size={12} /> Takip</span>;
  }

  function googleCalLink(title: string, date: string) {
    const start = date.replace(/-/g, "") + "T090000";
    const end = date.replace(/-/g, "") + "T100000";
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`;
  }

  return (
    <main className="v-enter min-h-screen px-4 pt-5 pb-36 max-w-[520px] mx-auto">
      <PageHeader
        overline="Valkea Takvim"
        title="Takvim"
        subtitle="İş, ödeme ve içerik planı"
        actions={token ? (
          <a
            href={`/api/takvim/export?token=${token}`}
            download="valkea-takvim.ics"
            className="v-press h-11 w-11 rounded-2xl bg-white border border-line shadow-sm grid place-items-center text-teal-deep"
            title="Takvimi indir (.ics)"
          >
            <IDownload size={18} />
          </a>
        ) : undefined}
      />

      {/* Ay navigasyonu + grid */}
      <section className="v-card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="v-press h-10 w-10 bg-canvas rounded-2xl grid place-items-center text-ink">
            <IChevronLeft size={17} />
          </button>
          <p className="font-extrabold tracking-tight capitalize">{monthLabel}</p>
          <button onClick={nextMonth} className="v-press h-10 w-10 bg-canvas rounded-2xl grid place-items-center text-ink">
            <IChevronRight size={17} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => <p key={d} className="text-center text-[10px] font-extrabold text-mute">{d}</p>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
            const dayItems = itemsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const types = [...new Set(dayItems.map((x) => x.type))];

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-1.5 rounded-2xl transition-all ${
                  isSelected ? "bg-ink text-white shadow-md" :
                  isToday ? "bg-[rgba(45,163,199,0.12)]" : "hover:bg-canvas"
                }`}
              >
                <span className={`text-sm font-extrabold v-num ${isToday && !isSelected ? "text-teal-deep" : ""}`}>{day}</span>
                {types.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {types.map((t) => (
                      <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "#fff" : dotColor(t) }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 pt-3 border-t border-line text-xs font-semibold text-sub">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#059669" }} /> Tahsilat</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#2da3c7" }} /> İçerik</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#e8a33d" }} /> Takip</span>
        </div>
      </section>

      {/* Seçili gün */}
      {selectedDate && (
        <section className="mb-4">
          <p className="v-overline mb-2">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {selectedItems.length === 0 && (
            <div className="v-card p-4 text-mute text-sm font-medium">Bu gün için kayıt yok.</div>
          )}
          <div className="grid gap-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="v-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="mb-1.5">{typeChip(item.type)}</div>
                    <p className="font-bold text-sm truncate">{item.title}</p>
                    {item.amount && item.amount > 0 ? <p className="v-num text-mint font-extrabold text-sm mt-0.5">{money(item.amount)}</p> : null}
                  </div>
                  <span className={`v-chip shrink-0 ${
                    item.status === "tamamlandı" || item.status === "ödendi" ? "v-chip-mint" : "v-chip-amber"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <a
                  href={googleCalLink(item.title, selectedDate!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-deep font-extrabold"
                >
                  <IPlus size={13} /> Google Takvim'e Ekle
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ay özeti */}
      <section className="v-card p-4">
        <p className="font-extrabold tracking-tight mb-3">Bu Ay Özet</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="py-2 rounded-2xl bg-[rgba(45,163,199,0.1)]">
            <p className="v-num text-[22px] font-extrabold text-teal-deep">{items.filter(i => i.type === "icerik").length}</p>
            <p className="text-xs text-mute font-semibold">İçerik</p>
          </div>
          <div className="py-2 rounded-2xl bg-[#e8f7f1]">
            <p className="v-num text-[22px] font-extrabold text-mint">{items.filter(i => i.type === "tahsilat").length}</p>
            <p className="text-xs text-mute font-semibold">Tahsilat</p>
          </div>
          <div className="py-2 rounded-2xl bg-[rgba(232,163,61,0.12)]">
            <p className="v-num text-[22px] font-extrabold text-[#a16a14]">{items.filter(i => i.type === "takip").length}</p>
            <p className="text-xs text-mute font-semibold">Takip</p>
          </div>
        </div>
      </section>
    </main>
  );
}
