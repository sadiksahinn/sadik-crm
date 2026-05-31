"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

type CalItem = { type: "icerik" | "tahsilat" | "takip"; title: string; date: string; status: string; amount?: number; id: string };

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}

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
    if (type === "tahsilat") return "bg-emerald-500";
    if (type === "icerik") return "bg-[#61aebd]";
    return "bg-amber-400";
  }

  function typeLabel(type: CalItem["type"]) {
    if (type === "tahsilat") return "💰 TAHSİLAT";
    if (type === "icerik") return "◉ İÇERİK";
    return "✅ TAKİP";
  }

  function googleCalLink(title: string, date: string) {
    const start = date.replace(/-/g, "") + "T090000";
    const end = date.replace(/-/g, "") + "T100000";
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`;
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[#61aebd] text-xs font-black tracking-wide">VALKEA CALENDAR</p>
          <h1 className="text-3xl font-black">Takvim</h1>
          <p className="text-slate-500">İş, ödeme ve içerik planı</p>
        </div>
        <div className="flex gap-2">
          {token && (
            <a
              href={`/api/takvim/export?token=${token}`}
              download="valkea-takvim.ics"
              className="bg-white rounded-2xl px-3 py-3 shadow-sm font-black text-sm text-[#61aebd]"
              title="Takvimi indir (.ics)"
            >
              📅
            </a>
          )}
          <Link href="/" className="bg-white rounded-2xl px-4 py-3 shadow-sm font-black">Ana</Link>
        </div>
      </header>

      {/* Ay navigasyonu + grid */}
      <section className="bg-white rounded-[28px] p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="h-10 w-10 bg-slate-100 rounded-2xl font-black flex items-center justify-center text-lg">‹</button>
          <p className="font-black capitalize">{monthLabel}</p>
          <button onClick={nextMonth} className="h-10 w-10 bg-slate-100 rounded-2xl font-black flex items-center justify-center text-lg">›</button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => <p key={d} className="text-center text-[10px] font-black text-slate-400">{d}</p>)}
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
                className={`relative flex flex-col items-center py-1.5 rounded-2xl transition-colors ${
                  isSelected ? "bg-[#61aebd] text-white" :
                  isToday ? "bg-[#61aebd]/10" : "hover:bg-slate-50"
                }`}
              >
                <span className={`text-sm font-black ${isToday && !isSelected ? "text-[#61aebd]" : ""}`}>{day}</span>
                {types.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {types.map((t) => (
                      <span key={t} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : dotColor(t)}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Tahsilat</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#61aebd] rounded-full" /> İçerik</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" /> Takip</span>
        </div>
      </section>

      {/* Seçili gün */}
      {selectedDate && (
        <section className="mb-4">
          <p className="text-xs font-black tracking-wide text-slate-500 mb-2">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          {selectedItems.length === 0 && (
            <div className="bg-white rounded-[20px] p-4 shadow-sm text-slate-400 text-sm">Bu gün için kayıt yok.</div>
          )}
          <div className="grid gap-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-[20px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-black text-[#61aebd] mb-0.5">{typeLabel(item.type)}</p>
                    <p className="font-black text-sm">{item.title}</p>
                    {item.amount && item.amount > 0 && <p className="text-emerald-600 font-black text-sm">{money(item.amount)}</p>}
                  </div>
                  <span className={`text-xs rounded-xl px-3 py-1.5 font-black ${
                    item.status === "tamamlandı" || item.status === "ödendi" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <a
                  href={googleCalLink(item.title, selectedDate!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#61aebd] font-black"
                >
                  + Google Takvim'e Ekle
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ay özeti */}
      <section className="bg-white rounded-[28px] p-4 shadow-sm">
        <p className="font-black mb-3">Bu Ay Özet</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-[#61aebd]">{items.filter(i => i.type === "icerik").length}</p>
            <p className="text-xs text-slate-400">İçerik</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{items.filter(i => i.type === "tahsilat").length}</p>
            <p className="text-xs text-slate-400">Tahsilat</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-500">{items.filter(i => i.type === "takip").length}</p>
            <p className="text-xs text-slate-400">Takip</p>
          </div>
        </div>
      </section>
    </main>
  );
}
