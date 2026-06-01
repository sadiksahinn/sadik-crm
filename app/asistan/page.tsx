"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabase = createClient();

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  image?: string; // base64 önizleme
  record?: any;
  proposal?: any;
};

const QUICK_ACTIONS = [
  "Bugün ne yapıyoruz?",
  "Tahsilat durumu?",
  "Günlük özet",
  "Nasıl gidiyor?",
  "Tasarruf önerisi",
];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function recordStyle(type: string) {
  if (type === "gelir") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (type === "gider") return "bg-red-50 border-red-200 text-red-900";
  if (type === "iş") return "bg-[#1E3A5F]/10 border-[#1E3A5F]/20 text-slate-950";
  if (type === "hatırlatma") return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-slate-50 border-slate-200 text-slate-950";
}

export default function AsistanPage() {
  const STORAGE_KEY = "valkea_chat_history";

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    async function loadIntro() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { window.location.href = "/login"; return; }

      // Geçmiş varsa sadece auth kontrolü yap, intro mesajı tekrar ekleme
      const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
      if (saved && JSON.parse(saved).length > 0) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const firstName = (profile?.full_name || "Kullanıcı").trim().split(" ")[0];
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

      const [
        { data: payments },
        { data: contents },
        { data: followups },
        { data: todayIncome },
        { data: weekPayments },
      ] = await Promise.all([
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", today),
        supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today),
        supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today),
        supabase.from("income").select("amount").eq("user_id", user.id).eq("income_date", today),
        supabase.from("payment_tracking").select("amount,due_date,title").eq("user_id", user.id).eq("status", "bekliyor")
          .gt("due_date", today)
          .lte("due_date", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
          .order("due_date", { ascending: true }).limit(3),
      ]);

      const paymentTotal = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const todayTotal = (todayIncome || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      const urgentLines: string[] = [];
      if ((payments || []).length > 0) urgentLines.push(`💰 ${payments!.length} gecikmiş tahsilat — ${money(paymentTotal)}`);
      if ((contents || []).length > 0) urgentLines.push(`📲 ${contents!.length} yayınlanmayı bekleyen içerik`);
      if ((followups || []).length > 0) urgentLines.push(`✅ ${followups!.length} bekleyen görev`);

      const weekLines = (weekPayments || []).map((p: any) => `  · ${p.title} — ${money(Number(p.amount))} (${p.due_date})`);

      let intro = `${greeting} ${firstName} 👋\n\n`;

      if (urgentLines.length > 0) {
        intro += `Bugün acil:\n${urgentLines.join("\n")}`;
      } else {
        intro += `Bugün için acil bir şey yok.`;
      }

      if (todayTotal > 0) intro += `\n\n🎉 Bugün ${money(todayTotal)} gelir aldın.`;

      if (weekLines.length > 0) {
        intro += `\n\nBu hafta yaklaşan tahsilatlar:\n${weekLines.join("\n")}`;
      }

      intro += `\n\nNe yapmak istiyorsun? Fotoğraf çek, sesli söyle veya yaz.`;

      setMessages([{ role: "assistant", text: intro }]);
    }
    loadIntro();
  }, []);

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? command).trim();
    if (!text || loading) return;

    setShowQuick(false);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setCommand("");
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: text, access_token: sessionData.session?.access_token }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.message || "İşlem tamamlandı.", record: data.record, proposal: data.proposal },
    ]);
    setLoading(false);
  }

  async function approveProposal(proposal: any) {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch("/api/asistan/onay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, access_token: sessionData.session?.access_token }),
    });

    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.message || "Kaydedildi.", record: data.record },
    ]);
    setLoading(false);
  }

  async function handleImageUpload(file: File) {
    if (!file || loading) return;

    setShowQuick(false);

    // Önizleme için base64'e çevir
    const previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setMessages((prev) => [...prev, { role: "user", text: "", image: previewUrl }]);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    // 1. Analiz
    const form = new FormData();
    form.append("image", file);
    form.append("access_token", sessionData.session?.access_token || "");

    const analysisRes = await fetch("/api/asistan/gorsel", { method: "POST", body: form });
    const analysis = await analysisRes.json();

    if (!analysis.ok || !analysis.items?.length) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: analysis.message || "Belgeden finansal hareket çıkarılamadı." },
      ]);
      setLoading(false);
      return;
    }

    // 2. Otomatik kaydet
    const saveRes = await fetch("/api/asistan/gorsel-kaydet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: analysis.items, access_token: sessionData.session?.access_token }),
    });
    const save = await saveRes.json();

    const giderler = analysis.items.filter((i: any) => i.type === "gider");
    const gelirler = analysis.items.filter((i: any) => i.type === "gelir");
    const total = analysis.items.reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

    const summary = save.ok
      ? `🧾 Belge kaydedildi · ${analysis.items.length} kalem\n` +
        (giderler.length ? `❤️ ${giderler.length} gider` : "") +
        (giderler.length && gelirler.length ? " · " : "") +
        (gelirler.length ? `💚 ${gelirler.length} gelir` : "") +
        `\nToplam: ${money(total)}`
      : save.message || "Kayıt sırasında hata oluştu.";

    setMessages((prev) => [...prev, { role: "assistant", text: summary }]);
    setLoading(false);
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return;

        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();

        const form = new FormData();
        form.append("audio", blob, "kayit.webm");
        form.append("access_token", sessionData.session?.access_token || "");

        const res = await fetch("/api/asistan/ses", { method: "POST", body: form });
        const data = await res.json();
        setLoading(false);

        if (data.ok && data.text) {
          // Transkripti direkt asistana gönder
          sendMessage(data.text);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.message || "Ses anlaşılamadı." },
          ]);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Mikrofon erişimi sağlanamadı. Tarayıcı iznini kontrol et." },
      ]);
    }
  }

  const C = { primary:"#006879", dark:"#2e3132", bg:"#f8f9fa", card:"#ffffff", border:"#bdc8cc", textMain:"#191c1d", textSub:"#3e484b", error:"#ba1a1a" };

  return (
    <main style={{minHeight:"100vh",background:C.bg,fontFamily:"'Manrope',sans-serif",display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:50,background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
          <div>
            <p style={{fontWeight:700,fontSize:15,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>Valkea Finansal Asistan</p>
            <p style={{fontSize:11,color:C.textSub}}>Son hat yapay zeka ile finans yönetimi</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {messages.length > 1 && (
            <button onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); setShowQuick(true); }} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>
              🗑 Temizle
            </button>
          )}
        </div>
      </header>

      {/* Hızlı aksiyonlar */}
      {showQuick && messages.length > 0 && (
        <div style={{display:"flex",gap:8,overflowX:"auto",padding:"12px 16px 8px",scrollbarWidth:"none"}}>
          {QUICK_ACTIONS.map((action) => (
            <button key={action} onClick={() => sendMessage(action)} style={{whiteSpace:"nowrap",padding:"8px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:C.card,color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Hanken Grotesk',sans-serif",flexShrink:0}}>
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Mesajlar */}
      <div style={{flex:1,padding:"12px 16px",paddingBottom:100,display:"flex",flexDirection:"column",gap:12}}>
        {messages.map((msg, index) => (
          <div key={index} style={{maxWidth:"88%",alignSelf:msg.role==="user"?"flex-end":"flex-start"}}>
            <div style={{
              borderRadius:16,padding:"12px 14px",
              background:msg.role==="user"?C.primary:C.card,
              color:msg.role==="user"?"#fff":C.textMain,
              border:msg.role==="user"?"none":`1px solid ${C.border}`,
              boxShadow:msg.role==="user"?"none":"0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {msg.image && <img src={msg.image} alt="" style={{borderRadius:10,maxHeight:200,width:"100%",objectFit:"cover",marginBottom:8}} />}
              {msg.text && <p style={{whiteSpace:"pre-line",fontSize:14,lineHeight:1.6,margin:0,fontFamily:"'Hanken Grotesk',sans-serif"}}>{msg.text}</p>}

              {msg.proposal && (
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <button onClick={() => approveProposal(msg.proposal)} disabled={loading} style={{flex:1,padding:"10px 0",borderRadius:10,background:C.primary,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",border:"none",fontFamily:"'Hanken Grotesk',sans-serif"}}>✅ Evet, kaydet</button>
                  <button onClick={() => setMessages(prev=>[...prev,{role:"assistant",text:"Tamam, kaydedmedim."}])} disabled={loading} style={{flex:1,padding:"10px 0",borderRadius:10,background:"#f3f4f5",color:C.textMain,fontWeight:600,fontSize:13,cursor:"pointer",border:`1px solid ${C.border}`,fontFamily:"'Hanken Grotesk',sans-serif"}}>❌ Hayır</button>
                </div>
              )}

              {msg.record && (
                <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:msg.record.type==="gelir"?"#f0fdf4":msg.record.type==="gider"?"#fef2f2":"#f8f9fa"}}>
                  <p style={{fontSize:10,fontWeight:700,color:C.textSub,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"'Hanken Grotesk',sans-serif"}}>{msg.record.type||"KAYIT"}</p>
                  <p style={{fontWeight:700,fontSize:14,margin:0,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif"}}>{msg.record.title}</p>
                  {typeof msg.record.amount==="number" && <p style={{fontSize:22,fontWeight:700,margin:"4px 0 0",color:msg.record.type==="gelir"?"#10b981":C.error,fontFamily:"'Manrope',sans-serif"}}>{money(msg.record.amount)}</p>}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{alignSelf:"flex-start",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{display:"inline-flex",gap:4}}>
              {[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:C.primary,animationDelay:`${d}ms`,display:"inline-block",width:7,height:7,borderRadius:"50%"}} />)}
            </span>
            <span style={{fontSize:13,color:C.textSub,fontFamily:"'Hanken Grotesk',sans-serif"}}>{recording?"Dinliyor...":"Düşünüyor..."}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hidden image input */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)handleImageUpload(f);e.target.value="";}} />

      {/* Input bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,padding:"10px 16px",paddingBottom:"max(16px,env(safe-area-inset-bottom))",zIndex:9999,display:"flex",gap:10,alignItems:"center"}}>
          {/* Kamera */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || recording}
            style={{width:44,height:44,borderRadius:12,border:`1px solid ${C.border}`,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,opacity:loading||recording?0.4:1}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{width:20,height:20,color:C.textSub}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Metin */}
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
            placeholder={recording?"Dinliyor...":"Bir soru sorun..."}
            disabled={recording}
            style={{flex:1,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:14,outline:"none",background:C.bg,color:C.textMain,fontFamily:"'Hanken Grotesk',sans-serif",opacity:recording?0.5:1}}
          />

          {/* Mikrofon */}
          <button
            onClick={toggleRecording}
            disabled={loading && !recording}
            style={{width:44,height:44,borderRadius:12,border:recording?"none":`1px solid ${C.border}`,background:recording?"#ef4444":C.bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,opacity:loading&&!recording?0.4:1}}
            className={recording?"animate-pulse":""}
            title={recording ? "Kaydı durdur" : "Sesli komut"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Gönder */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !command.trim() || recording}
            style={{width:44,height:44,borderRadius:12,background:C.primary,color:"#fff",fontWeight:700,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"none",flexShrink:0,opacity:loading||!command.trim()||recording?0.4:1}}
          >
            →
          </button>
      </div>
    </main>
  );
}
