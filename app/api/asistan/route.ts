import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { aiErrorResponse } from "@/utils/ai-error";
import { dateKey, monthInfo } from "@/utils/date";
import { profitLossExpenses } from "@/utils/finance";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function today() {
  return dateKey();
}

function monthStart() {
  return monthInfo().start;
}

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

async function analyzeMessage(message: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Sen Türkçe çalışan bir CRM operasyon asistanısın. Kullanıcı mesajını analiz et ve sadece JSON döndür.

JSON:
{
  "type": "job" | "income" | "expense" | "service_plan" | "reminder" | "daily_plan" | "collection_query" | "collection_paid" | "task_completed" | "daily_summary" | "analysis" | "customer_query" | "customer_create" | "whatsapp_template" | "chat" | "unknown",
  "customer_name": "",
  "brand_name": "",
  "phone": "",
  "sector": "",
  "title": "",
  "amount": 0,
  "payment_day": null,
  "reels": null,
  "story": null,
  "post": null,
  "reminder_date": null,
  "category": "",
  "explanation": "",
  "context": "",
  "payment_method": "",
  "note": "",
  "missing_questions": []
}

Kurallar:
- "iş aldım", "anlaştık", "hizmet vereceğim", "müşteri aldım" => job
- "ödeme aldım", "ödedi", "para geldi", "tahsil ettim", "[müşteri] [tutar] ödedi" => income
- "verdim", "harcadım", market, yakıt, yemek, fatura, kira, aidat vb. => expense
- expense için category alanını Market, Yemek, Ulaşım, Sağlık, Fatura, Kira, İş veya Diğer olarak belirle; explanation kullanıcının harcama amacını anlatsın; context Kişisel, İş veya Tatil olsun; payment_method mesajda açıkça varsa çıkar
- "ayda X reels Y story", "içerik planı" => service_plan
- "hatırlat", "yarın ara", "not al", "randevu koy", "takvime ekle" => reminder, reminder_date tahmin et
- "bugün ne yapıyoruz", "günlük plan", "ajanda" => daily_plan
- "kimden para alacağım", "tahsilat var mı", "bugün ödeme", "bekleyen tahsilat" => collection_query
- "tahsilat tamamlandı", "ödeme alındı", "parasını aldım", "[müşteri] ödedi" => collection_paid
- "tamamlandı", "bitti", "yapıldı", "paylaşıldı", "hallettim" => task_completed
- "günlük özet", "bugünün özeti", "bugün durum ne", "özet ver" => daily_summary
- "analiz", "durumum ne", "nasıl gidiyor", "kar", "kâr", "zarar", "tasarruf", "ne yapmalıyım", "öneri ver", "tavsiye", "ne kazandım", "ne harcadım", "rapor", "büyüme", "gelir analizi", "gider analizi" => analysis
- "yeni müşteri", "müşteri ekle", "müşteri kartı oluştur", "müşteri oluştur", "[isim] diye müşteri ekle", "[isim]'i müşteri yap" => customer_create; customer_name = kişi/firma adı, varsa brand_name (marka), phone (telefon), sector (sektör) çıkar
- "[müşteri] ne kadar ödedi", "[müşteri] ile durum ne", "[müşteri] hakkında", "müşteri bilgisi" => customer_query, customer_name'i çıkar
- "mesaj yaz", "whatsapp mesajı", "tahsilat mesajı", "hatırlatma mesajı yaz", "şablon" => whatsapp_template, customer_name'i çıkar
- "not al", "hatırla", "aklında tut", "şunu bil", "kaydet ki" => reminder, title = notun kendisi
- "selam", "merhaba", "naber", "nasılsın", "iyi günler", "günaydın", "iyi akşamlar", "teşekkür", "tamam" => chat
- emin değilsen => chat`,
      },
      { role: "user", content: message },
    ],
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.command || body.message || body.text || "").trim();
    const accessToken = String(body.access_token || "");
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı. Tekrar giriş yap." }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: userData } = await supabase.auth.getUser(accessToken);
    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Oturum bulunamadı. Tekrar giriş yap." },
        { status: 401 }
      );
    }

    if (!text) {
      return NextResponse.json({ ok: false, message: "Komut boş." });
    }

    // Hafızayı yükle
    const { data: memoryRows } = await supabase
      .from("assistant_memory")
      .select("key, value")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    const memory = (memoryRows || []).map((r: any) => `${r.key}: ${r.value}`).join("\n");

    const ai = await analyzeMessage(text);

    // ── CHAT ──────────────────────────────────────────────────────────────
    if (ai.type === "chat") {
      const reply = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Sen Valkea, Türkçe çalışan kişisel bir iş asistanısın. Kısa, samimi ve yardımsever cevap ver. İş, finans, tahsilat, müşteri, takvim ve planlama konularında yardım edebilirsin." +
              (memory ? `\n\nKullanıcı hafızası:\n${memory}` : ""),
          },
          { role: "user", content: text },
        ],
      });

      return NextResponse.json({
        ok: true,
        type: "chat",
        message:
          reply.choices[0]?.message?.content ||
          "Merhaba 👋 Nasıl yardımcı olabilirim?",
      });
    }

    // ── CUSTOMER CREATE (yeni müşteri kartı) ──────────────────────────────
    if (ai.type === "customer_create") {
      const name = String(ai.customer_name || ai.brand_name || ai.title || "").trim();
      if (!name) {
        return NextResponse.json({
          ok: true,
          type: "müşteri",
          message: "Tabii, müşterinin adını yazar mısın? Örn: \"Bella Cafe diye müşteri ekle\" veya \"Yeni müşteri: Ahmet Yılmaz, 0532...\"",
        });
      }

      // Aynı isimde müşteri var mı?
      const { data: existing } = await supabase
        .from("customers").select("id, name")
        .eq("user_id", user.id).ilike("name", name).limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({
          ok: true,
          type: "müşteri",
          message: `"${name}" zaten kayıtlı görünüyor. İstersen bilgilerini güncelleyebilir veya farklı bir isimle ekleyebilirsin.`,
        });
      }

      const { data: created, error } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name,
          brand_name: ai.brand_name?.trim() || null,
          phone: ai.phone?.trim() || null,
          sector: ai.sector?.trim() || null,
          status: "aktif",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ ok: false, message: "Müşteri eklenemedi: " + error.message });
      }

      const extra = [
        created?.brand_name ? `Marka: ${created.brand_name}` : "",
        created?.phone ? `Tel: ${created.phone}` : "",
        created?.sector ? `Sektör: ${created.sector}` : "",
      ].filter(Boolean).join(" · ");

      return NextResponse.json({
        ok: true,
        type: "müşteri",
        message: `✅ ${name} müşteri kartı oluşturuldu.${extra ? `\n${extra}` : ""}\n\nMüşteriler sayfasından detaylarını düzenleyebilirsin.`,
        record: { type: "iş", title: name },
      });
    }

    // ── COLLECTION QUERY ──────────────────────────────────────────────────
    if (ai.type === "collection_query") {
      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .lte("due_date", today())
        .order("due_date", { ascending: true });

      const total = (payments || []).reduce(
        (t: number, p: any) => t + Number(p.amount || 0),
        0
      );

      if (!payments || payments.length === 0) {
        return NextResponse.json({
          ok: true,
          type: "tahsilat",
          message:
            "Bugün için bekleyen tahsilat görünmüyor. İstersen yeni tahsilat kaydı oluşturabilirsin.",
        });
      }

      return NextResponse.json({
        ok: true,
        type: "tahsilat",
        message:
          `Bugün tahsil edilecek toplam: ${money(total)}\n\n` +
          (payments || [])
            .map(
              (p: any) =>
                `• ${p.title} — ${money(Number(p.amount || 0))} — Son gün: ${p.due_date}\n  Mesaj: Merhaba, ${p.title} için ${money(Number(p.amount || 0))} tutarındaki ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi rica ederim.`
            )
            .join("\n\n"),
      });
    }

    // ── COLLECTION PAID ───────────────────────────────────────────────────
    if (ai.type === "collection_paid") {
      const searchName = ai.customer_name || ai.title || "";

      const { data: payments } = await supabase
        .from("payment_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .order("due_date", { ascending: true });

      const normalizedSearch = String(searchName)
        .toLowerCase()
        .replace(/tahsilat|tamamlandı|odeme|ödeme/g, "")
        .trim();

      const matches = (payments || []).filter((p: any) =>
        !normalizedSearch ||
        String(p.title || "").toLowerCase().includes(normalizedSearch)
      );

      if (matches.length === 0) {
        return NextResponse.json({
          ok: false,
          message:
            "Bu müşteri için bekleyen tahsilat bulamadım. Tahsilat ekranından kontrol edebilirsin.",
        });
      }

      if (matches.length > 1 && normalizedSearch) {
        return NextResponse.json({
          ok: false,
          message:
            "Birden fazla benzer tahsilat buldum. Yanlış kayıt kapatmamak için tahsilat ekranından seçmeni istiyorum.\n\n" +
            matches
              .map(
                (p: any) =>
                  `• ${p.title} - ${money(Number(p.amount || 0))} - ${p.due_date}`
              )
              .join("\n"),
        });
      }

      const payment = matches[0];

      // Önce income_created kontrolü, sonra güncelle
      if (payment.income_created) {
        return NextResponse.json({
          ok: true,
          type: "gelir",
          message: `Bu tahsilat zaten gelire işlenmiş.\n\n${payment.title}`,
        });
      }

      await supabase
        .from("payment_tracking")
        .update({ status: "ödendi", paid_date: today(), income_created: true })
        .eq("id", payment.id);

      const { data: income, error: incomeError } = await supabase
        .from("income")
        .insert({
          user_id: user.id,
          title: payment.title,
          amount: Number(payment.amount || 0),
          income_date: today(),
          payment_method: "Asistan tahsilat",
          note: "Asistan komutuyla tahsilat ödendi olarak işaretlendi.",
        })
        .select()
        .single();

      if (incomeError) throw incomeError;

      await supabase
        .from("payment_tracking")
        .update({ income_id: income?.id })
        .eq("id", payment.id);

      return NextResponse.json({
        ok: true,
        type: "gelir",
        message: `✅ Tahsilat tamamlandı ve gelire işlendi.\n\n${payment.title} · ${money(Number(payment.amount || 0))}`,
        record: { ...income, type: "gelir", table: "income" },
      });
    }

    // ── TASK COMPLETED ────────────────────────────────────────────────────
    if (ai.type === "task_completed") {
      const searchName = ai.customer_name || ai.title || text;

      const { data: contents } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "planlandı")
        .ilike("content_title", `%${searchName}%`)
        .limit(1);

      const content = contents?.[0];

      if (content) {
        await supabase
          .from("content_calendar")
          .update({ status: "tamamlandı" })
          .eq("id", content.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          customer_id: content.customer_id,
          service_id: content.service_id || null,
          action_title: "İçerik tamamlandı",
          action_detail: `${content.content_title} tamamlandı.`,
          action_type: "tamamlandı",
        });

        return NextResponse.json({
          ok: true,
          type: "tamamlandı",
          message: `✅ İçerik tamamlandı olarak işaretlendi.\n\n${content.content_title}`,
        });
      }

      const { data: followups } = await supabase
        .from("followups")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "bekliyor")
        .ilike("title", `%${searchName}%`)
        .limit(1);

      const followup = followups?.[0];

      if (followup) {
        await supabase
          .from("followups")
          .update({ status: "tamamlandı" })
          .eq("id", followup.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          customer_id: followup.customer_id,
          service_id: followup.service_id || null,
          action_title: "Takip tamamlandı",
          action_detail: `${followup.title} tamamlandı.`,
          action_type: "tamamlandı",
        });

        return NextResponse.json({
          ok: true,
          type: "tamamlandı",
          message: `✅ Takip tamamlandı olarak işaretlendi.\n\n${followup.title}`,
        });
      }

      return NextResponse.json({
        ok: false,
        message:
          'Tamamlanacak kayıt bulamadım. Daha net yazabilir misin?\nÖrn: "Suite Halı reels tamamlandı"',
      });
    }

    // ── DAILY SUMMARY ─────────────────────────────────────────────────────
    if (ai.type === "daily_summary") {
      const todayDate = today();

      const [{ data: incomes }, { data: expenses }, { data: payments }, { data: contents }] =
        await Promise.all([
          supabase.from("income").select("*").eq("user_id", user.id).eq("income_date", todayDate),
          supabase.from("expenses").select("*").eq("user_id", user.id).eq("expense_date", todayDate),
          supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("due_date", todayDate),
          supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "tamamlandı").eq("publish_date", todayDate),
        ]);

      const incomeTotal = (incomes || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const expenseTotal = (expenses || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const paymentTotal = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      return NextResponse.json({
        ok: true,
        type: "özet",
        message:
          `📌 Günlük özet\n\n` +
          `💚 Bugünkü gelir: ${money(incomeTotal)}\n` +
          `❤️ Bugünkü gider: ${money(expenseTotal)}\n` +
          `💰 Bekleyen tahsilat: ${money(paymentTotal)} (${(payments || []).length} kayıt)\n` +
          `🎬 Tamamlanan içerik: ${(contents || []).length}\n\n` +
          `Net durum: ${money(incomeTotal - expenseTotal)}`,
      });
    }

    // ── DAILY PLAN ────────────────────────────────────────────────────────
    if (ai.type === "daily_plan") {
      const [{ data: followups }, { data: reminders }, { data: contents }] =
        await Promise.all([
          supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("followup_date", today()).order("followup_date", { ascending: true }),
          supabase.from("reminders").select("*").eq("user_id", user.id).eq("status", "bekliyor").lte("reminder_date", today()).order("reminder_date", { ascending: true }),
          supabase.from("content_calendar").select("*").eq("user_id", user.id).eq("status", "planlandı").lte("publish_date", today()).order("publish_date", { ascending: true }),
        ]);

      const items = [
        ...(followups || []).map((x: any) => `💸 ${x.title}`),
        ...(reminders || []).map((x: any) => `⏰ ${x.title}`),
        ...(contents || []).map((x: any) => `📲 ${x.content_title} paylaşımı kontrol et`),
      ];

      return NextResponse.json({
        ok: true,
        type: "program",
        message: items.length
          ? `Bugün bunları yapıyoruz 👇\n\n${items.join("\n")}\n\nBunları bitirdikçe bana "tamamlandı" diye yazabilirsin.`
          : "Bugün için bekleyen takip görünmüyor. İstersen yeni iş, ödeme veya paylaşım planı ekleyelim.",
      });
    }

    // ── REMINDER ──────────────────────────────────────────────────────────
    if (ai.type === "reminder") {
      const reminderDate = ai.reminder_date || today();
      const title = ai.title || ai.note || text;

      const { data, error } = await supabase
        .from("followups")
        .insert({
          user_id: user.id,
          title,
          followup_date: reminderDate,
          status: "bekliyor",
          priority: "normal",
        })
        .select()
        .single();

      if (error) throw error;

      // "Not al / hafızaya ekle" komutlarını assistant_memory'ye de kaydet
      if (/not al|hatırla|aklında tut|şunu bil|kaydet ki/i.test(text)) {
        await supabase.from("assistant_memory").upsert(
          { user_id: user.id, key: `not_${Date.now()}`, value: title, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key" }
        );
      }

      return NextResponse.json({
        ok: true,
        type: "hatırlatma",
        message: `⏰ Hatırlatma kaydedildi.\n\n${data.title}\nTarih: ${data.followup_date}`,
        record: { ...data, type: "hatırlatma" },
      });
    }

    // ── CUSTOMER QUERY ────────────────────────────────────────────────────
    if (ai.type === "customer_query") {
      const searchName = ai.customer_name || "";
      const startMonth = monthStart();

      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .or(`name.ilike.%${searchName}%,brand_name.ilike.%${searchName}%`)
        .limit(1);

      const customer = customers?.[0];
      if (!customer) {
        return NextResponse.json({ ok: false, message: `"${searchName}" adında bir müşteri bulamadım.` });
      }

      const [{ data: payments }, { data: followups }, { data: services }, { data: contents }] = await Promise.all([
        supabase.from("payment_tracking").select("*").eq("customer_id", customer.id).order("due_date", { ascending: false }),
        supabase.from("followups").select("*").eq("customer_id", customer.id).eq("status", "bekliyor"),
        supabase.from("client_services").select("*").eq("customer_id", customer.id),
        supabase.from("content_calendar").select("*").eq("customer_id", customer.id).eq("status", "planlandı").limit(5),
      ]);

      const totalPaid = (payments || []).filter((p: any) => p.status === "ödendi").reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
      const pending = (payments || []).filter((p: any) => p.status === "bekliyor");
      const pendingTotal = pending.reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
      const activeService = (services || []).find((s: any) => s.status === "devam ediyor") || (services || [])[0];

      return NextResponse.json({
        ok: true,
        type: "müşteri",
        message:
          `📋 ${customer.brand_name || customer.name}\n\n` +
          (activeService ? `💼 Hizmet: ${activeService.service_name || "Genel"} · ${money(activeService.monthly_fee)}/ay\n` : "") +
          `💚 Toplam alınan: ${money(totalPaid)}\n` +
          `💰 Bekleyen tahsilat: ${money(pendingTotal)} (${pending.length} kayıt)\n` +
          `✅ Bekleyen görev: ${(followups || []).length}\n` +
          `📲 Planlı içerik: ${(contents || []).length}`,
      });
    }

    // ── WHATSAPP TEMPLATE ─────────────────────────────────────────────────
    if (ai.type === "whatsapp_template") {
      const searchName = ai.customer_name || "";

      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .or(`name.ilike.%${searchName}%,brand_name.ilike.%${searchName}%`)
        .limit(1);

      const customer = customers?.[0];

      const { data: payments } = customer
        ? await supabase.from("payment_tracking").select("*").eq("customer_id", customer.id).eq("status", "bekliyor").order("due_date", { ascending: true })
        : { data: [] };

      const pending = (payments || [])[0];

      const name = customer?.brand_name || customer?.name || searchName || "Müşteri";
      const amount = pending ? money(Number(pending.amount)) : "";
      const date = pending?.due_date || today();

      const msg = amount
        ? `Merhaba, ${name} için ${amount} tutarındaki ödemenizin vadesi ${date} tarihine gelmiştir. Müsait olduğunuzda ödemenizi gerçekleştirmenizi rica ederim. İyi çalışmalar 🙏`
        : `Merhaba, aylık hizmet bedeliniz için ödeme günümüz gelmiştir. Müsait olduğunuzda ödemenizi gerçekleştirmenizi rica ederim. İyi çalışmalar 🙏`;

      return NextResponse.json({
        ok: true,
        type: "şablon",
        message: `📱 ${name} için WhatsApp mesajı:\n\n"${msg}"\n\nKopyalayıp gönderebilirsin.`,
      });
    }

    // ── JOB ───────────────────────────────────────────────────────────────
    if (ai.type === "job") {
      return NextResponse.json({
        ok: true,
        type: "öneri",
        message:
          `Şunu iş kaydı olarak algıladım 👇\n\n` +
          `Müşteri: ${ai.customer_name || "Belirsiz"}\n` +
          `${ai.amount ? `Bedel: ${money(Number(ai.amount))} /ay\n` : ""}` +
          `${ai.payment_day ? `Ödeme günü: Her ayın ${ai.payment_day}. günü\n` : ""}` +
          `\nOnaylarsan müşteri + hizmet + takip kaydı oluşturacağım.`,
        proposal: {
          type: "job",
          customer_name: ai.customer_name,
          amount: ai.amount || 0,
          payment_day: ai.payment_day || null,
          note: text,
          missing_questions: ai.missing_questions?.length
            ? ai.missing_questions
            : [
                "Ödeme peşin mi alındı?",
                "Ayda kaç reels/post/story yapılacak?",
                "İlk çekim tarihi ne zaman?",
              ],
        },
      });
    }

    // ── SERVICE PLAN ──────────────────────────────────────────────────────
    if (ai.type === "service_plan") {
      return NextResponse.json({
        ok: true,
        type: "öneri",
        message:
          `Şunu hizmet planı olarak algıladım 👇\n\n` +
          `Müşteri: ${ai.customer_name || "Belirsiz"}\n` +
          `${ai.reels ? `Reels: ${ai.reels}/ay\n` : ""}` +
          `${ai.story ? `Story: ${ai.story}/ay\n` : ""}` +
          `${ai.post ? `Post: ${ai.post}/ay\n` : ""}` +
          `\nOnaylarsan müşteri hizmet planına işleyeceğim.`,
        proposal: {
          type: "service_plan",
          customer_name: ai.customer_name,
          reels: ai.reels,
          story: ai.story,
          post: ai.post,
          note: text,
        },
      });
    }

    // ── INCOME ────────────────────────────────────────────────────────────
    if (ai.type === "income") {
      const amount = Number(ai.amount || 0);
      const title = String(ai.customer_name || ai.title || "Gelir").trim();
      if (!(amount > 0)) {
        return NextResponse.json({ ok: true, type: "gelir", message: "Geliri kaydetmeden önce tutarı da yazar mısın?" });
      }

      return NextResponse.json({
        ok: true,
        type: "öneri",
        message: `Şunu gelir olarak anladım 👇\n\n${title} · ${money(amount)}\n\nOnaylarsan kaydedeceğim.`,
        proposal: {
          type: "income", title, customer_name: title, amount,
          income_date: today(), payment_method: ai.payment_method || "Asistan",
          note: ai.explanation || ai.note || text,
        },
      });
    }

    // ── EXPENSE ───────────────────────────────────────────────────────────
    if (ai.type === "expense") {
      const amount = Number(ai.amount || 0);
      const title = String(ai.title || ai.customer_name || "Harcama").trim();
      if (!(amount > 0)) {
        return NextResponse.json({ ok: true, type: "gider", message: "Harcamayı kaydetmeden önce tutarı da yazar mısın?" });
      }

      return NextResponse.json({
        ok: true,
        type: "öneri",
        message: `Şunu harcama olarak anladım 👇\n\n${title} · ${money(amount)}\nKategori: ${ai.category || "Diğer"}\nBağlam: ${ai.context || "Kişisel"}\n\nOnaylarsan kaydedeceğim.`,
        proposal: {
          type: "expense", title, customer_name: title, amount,
          expense_date: today(), category: ai.category || "Diğer",
          context: ai.context || "Kişisel", payment_method: ai.payment_method || "Asistan",
          explanation: ai.explanation || ai.note || text, note: text,
        },
      });
    }

    // ── ANALYSIS ──────────────────────────────────────────────────────────
    if (ai.type === "analysis" || ai.type === "unknown") {
      const startMonth = monthStart();
      const todayDate = today();

      const [
        { data: profile },
        { data: incomes },
        { data: expenses },
        { data: payments },
        { data: customers },
        { data: followups },
        { data: contents },
        { data: cards },
        { data: loans },
        { data: fixedExp },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name, company_name, profession").eq("id", user.id).single(),
        supabase.from("income").select("*").eq("user_id", user.id).gte("income_date", startMonth).order("income_date", { ascending: false }),
        supabase.from("expenses").select("*").eq("user_id", user.id).gte("expense_date", startMonth).order("expense_date", { ascending: false }),
        supabase.from("payment_tracking").select("*").eq("user_id", user.id).eq("status", "bekliyor").order("due_date", { ascending: true }),
        supabase.from("customers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("followups").select("*").eq("user_id", user.id).eq("status", "bekliyor").order("followup_date", { ascending: true }).limit(20),
        supabase.from("content_calendar").select("*").eq("user_id", user.id).order("publish_date", { ascending: true }).limit(20),
        supabase.from("credit_cards").select("bank_name, card_name, current_balance, min_payment, payment_day, is_paid_this_month").eq("user_id", user.id),
        supabase.from("loans").select("bank_name, loan_type, remaining_amount, monthly_payment, payment_day, remaining_months").eq("user_id", user.id),
        supabase.from("fixed_expenses").select("title, amount, due_day, category, is_paid_this_month").eq("user_id", user.id),
      ]);

      const totalIncome = (incomes || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const bookedExpenses = profitLossExpenses(expenses);
      const pendingExpenses: any[] = [];
      const totalExpense = bookedExpenses.reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
      const totalPayment = (payments || []).reduce((t: number, i: any) => t + Number(i.amount || 0), 0);

      // Borç & aylık yükümlülükler
      const cardBalance = (cards || []).reduce((t: number, c: any) => t + Number(c.current_balance || 0), 0);
      const cardMinTotal = (cards || []).reduce((t: number, c: any) => t + Number(c.min_payment || 0), 0);
      const loanMonthly = (loans || []).reduce((t: number, l: any) => t + Number(l.monthly_payment || 0), 0);
      const loanRemaining = (loans || []).reduce((t: number, l: any) => t + Number(l.remaining_amount || 0), 0);
      const fixedMonthly = (fixedExp || []).reduce((t: number, f: any) => t + Number(f.amount || 0), 0);
      const fixedUnpaid = (fixedExp || []).filter((f: any) => !f.is_paid_this_month).reduce((t: number, f: any) => t + Number(f.amount || 0), 0);
      const monthlyObligations = cardMinTotal + loanMonthly + fixedMonthly;

      const context = {
        user: {
          name: profile?.full_name || "Kullanıcı",
          company: profile?.company_name || "",
          profession: profile?.profession || "",
        },
        date: { today: todayDate, month_start: startMonth },
        finance: {
          monthly_income: money(totalIncome),
          monthly_expense: money(totalExpense),
          monthly_net: money(totalIncome - totalExpense),
          pending_collection: money(totalPayment),
        },
        obligations: {
          // Bu ayki toplam yükümlülük: kart min. ödeme + kredi taksiti + sabit giderler
          monthly_total: money(monthlyObligations),
          credit_card_debt: money(cardBalance),
          credit_card_min_payment: money(cardMinTotal),
          loan_monthly_installment: money(loanMonthly),
          loan_remaining_debt: money(loanRemaining),
          fixed_expenses_monthly: money(fixedMonthly),
          fixed_expenses_unpaid_this_month: money(fixedUnpaid),
        },
        credit_cards: (cards || []).map((c: any) => ({
          bank: c.bank_name, name: c.card_name,
          debt: money(c.current_balance), min_payment: money(c.min_payment),
          payment_day: c.payment_day, paid_this_month: !!c.is_paid_this_month,
        })),
        loans: (loans || []).map((l: any) => ({
          bank: l.bank_name, type: l.loan_type,
          remaining: money(l.remaining_amount), monthly: money(l.monthly_payment),
          payment_day: l.payment_day, remaining_months: l.remaining_months,
        })),
        fixed_expenses: (fixedExp || []).map((f: any) => ({
          title: f.title, amount: money(f.amount), due_day: f.due_day,
          category: f.category, paid_this_month: !!f.is_paid_this_month,
        })),
        counts: {
          customers: customers?.length || 0,
          pending_followups: followups?.length || 0,
          calendar_items: contents?.length || 0,
          pending_collections: payments?.length || 0,
        },
        recent_income: (incomes || []).slice(0, 6),
        recent_expenses: bookedExpenses.slice(0, 6),
        pending_card_expenses: pendingExpenses.slice(0, 6),
        pending_collections: (payments || []).slice(0, 6),
        upcoming_tasks: (followups || []).slice(0, 6),
        customers: (customers || []).slice(0, 6),
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: `Sen Valkea, Türkçe çalışan kişisel bir iş ve finans asistanısın.
Görevin: kullanıcının gelir/gider durumunu analiz etmek, tahsilatları yorumlamak, günlük plan çıkarmak, tasarruf ve büyüme önerisi vermek.
Ayrıca kullanıcının BORÇLARINI ve AYLIK YÜKÜMLÜLÜKLERİNİ bilirsin: kredi kartı borçları (credit_cards), kredi taksitleri (loans) ve sabit giderler (fixed_expenses). "obligations" alanında bu ayki toplam ödeme yükü, kart minimumları, kredi taksitleri ve sabit giderler var.
"Bu ay ne kadar ödemem/borcum var?", "kredi kartı borcum ne?", "hangi faturayı ödedim?" gibi sorulara bu verilerle net cevap ver. Ödeme günü yaklaşanları (payment_day / due_day bugüne yakınsa) hatırlat.
Kurallar: Türkçe yaz. Kısa ve net ol. Rakamları açıkça söyle. Risk varsa belirt (örn. gelir < yükümlülük). Bilmediğini uydurma.` +
              (memory ? `\n\nKullanıcı hafızası (öğrenilen bilgiler):\n${memory}` : ""),
          },
          {
            role: "user",
            content: `Mevcut veri:\n${JSON.stringify(context, null, 2)}\n\nSoru: ${text}`,
          },
        ],
      });

      return NextResponse.json({
        ok: true,
        type: "analiz",
        message: response.choices[0]?.message?.content || "Analiz üretilemedi.",
      });
    }

    return NextResponse.json({
      ok: false,
      message:
        "Bunu nasıl kaydedeceğimi net anlayamadım. Şöyle yazabilirsin:\n\n" +
        "- Suite Halı ile aylık 20.000 TL iş aldım\n" +
        "- Market 300 TL\n" +
        "- Suite Halı 20.000 TL ödeme yaptı\n" +
        "- Bugün ne yapıyoruz?",
    });
  } catch (error) {
    console.error("Assistant command failed", error);
    return aiErrorResponse(error, "Asistan işlemi şu anda tamamlanamadı. Lütfen tekrar dene.");
  }
}
