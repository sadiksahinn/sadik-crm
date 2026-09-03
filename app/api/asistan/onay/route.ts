import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dateKey, nextMonthlyDate } from "@/utils/date";

function today() {
  return dateKey();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proposal = body.proposal;
    const accessToken = String(body.access_token || "");
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: userData } = await supabase.auth.getUser(accessToken);
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
    }

    if (!proposal?.type) {
      return NextResponse.json({ ok: false, message: "Onaylanacak bilgi bulunamadı." });
    }

    if (proposal.type === "income") {
      const title = String(proposal.title || proposal.customer_name || "Gelir").trim();
      const amount = Number(proposal.amount || 0);
      const incomeDate = String(proposal.income_date || today()).slice(0, 10);
      if (!title || !(amount > 0)) return NextResponse.json({ ok: false, message: "Gelir adı veya tutarı eksik." });

      const { data: existing } = await supabase.from("income").select("*")
        .eq("user_id", user.id).eq("income_date", incomeDate).eq("amount", amount).eq("title", title).limit(1);
      if (existing?.[0]) return NextResponse.json({ ok: true, type: "gelir", message: `Bu gelir zaten kayıtlı: ${title} · ${amount} TL`, record: { ...existing[0], type: "gelir", table: "income" } });

      const { data, error } = await supabase.from("income").insert({
        user_id: user.id, title, amount, income_date: incomeDate,
        payment_method: proposal.payment_method || "Asistan", note: proposal.note || "Asistan onayıyla kaydedildi.",
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, type: "gelir", message: `✅ Gelir kaydedildi.\n\n${title} · ${amount} TL`, record: { ...data, type: "gelir", table: "income" } });
    }

    if (proposal.type === "expense") {
      const title = String(proposal.title || proposal.customer_name || "Harcama").trim();
      const amount = Number(proposal.amount || 0);
      const expenseDate = String(proposal.expense_date || today()).slice(0, 10);
      if (!title || !(amount > 0)) return NextResponse.json({ ok: false, message: "Harcama adı veya tutarı eksik." });

      const { data: existing } = await supabase.from("expenses").select("*")
        .eq("user_id", user.id).eq("expense_date", expenseDate).eq("amount", amount).eq("title", title).limit(1);
      if (existing?.[0]) return NextResponse.json({ ok: true, type: "gider", message: `Bu harcama zaten kayıtlı: ${title} · ${amount} TL`, record: { ...existing[0], type: "gider", table: "expenses" } });

      const note = [
        `Açıklama: ${proposal.explanation || proposal.note || title}`,
        `Bağlam: ${proposal.context || "Kişisel"}`,
        `Ödeme: ${proposal.payment_method || "bilinmiyor"}`,
        "Durum: kesinleşmiş", "Kaynak: Valkea Asistan",
      ].join(" · ");
      const { data, error } = await supabase.from("expenses").insert({
        user_id: user.id, title, amount, expense_date: expenseDate,
        category: proposal.category || "Diğer", payment_method: proposal.payment_method || "Asistan", note,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, type: "gider", message: `✅ Harcama kaydedildi.\n\n${title} · ${amount} TL`, record: { ...data, type: "gider", table: "expenses" } });
    }

    if (!proposal.customer_name) {
      return NextResponse.json({ ok: false, message: "Müşteri bilgisi bulunamadı." });
    }

    if (proposal.type === "job") {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: proposal.customer_name,
          brand_name: proposal.customer_name,
          status: "aktif müşteri",
          source: "ai-asistan",
          notes: proposal.note || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { data: service, error: serviceError } = await supabase
        .from("client_services")
        .insert({
          customer_id: customer.id,
          service_name: "Yeni iş / hizmet",
          service_type: "genel hizmet",
          monthly_fee: Number(proposal.amount || 0),
          payment_day: proposal.payment_day || null,
          next_payment_date: proposal.payment_day ? nextMonthlyDate(proposal.payment_day) : null,
          start_date: today(),
          status: "devam ediyor",
          notes: proposal.note || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      await supabase.from("activity_logs").insert({
        customer_id: customer.id,
        service_id: service.id,
        action_title: "Yeni iş onaylandı",
        action_detail: proposal.note || "",
        action_type: "iş",
        user_id: user.id,
      });

      if (proposal.payment_day) {
        await supabase.from("followups").insert({
          customer_id: customer.id,
          service_id: service.id,
          title: `${proposal.customer_name} ödeme takibi`,
          followup_date: nextMonthlyDate(proposal.payment_day),
          status: "bekliyor",
          priority: "önemli",
          message_suggestion: "Merhaba, bu ayki hizmet bedelimiz için ödeme günümüz geldi. Müsait olduğunuzda ödemenizi rica ederim. Teşekkür ederim.",
          user_id: user.id,
        });
      }

      if (Number(proposal.amount || 0) > 0) {
        await supabase.from("payment_tracking").insert({
          user_id: user.id,
          customer_id: customer.id,
          service_id: service.id,
          title: `${proposal.customer_name} tahsilat`,
          amount: Number(proposal.amount || 0),
          due_date: proposal.payment_day ? nextMonthlyDate(proposal.payment_day) : today(),
          status: "bekliyor",
          note: proposal.note || "AI iş kaydı sonrası otomatik tahsilat oluşturuldu.",
        });
      }

      // Hafızaya kaydet
      const memoryValue = [
        `Müşteri: ${proposal.customer_name}`,
        proposal.amount ? `Aylık ücret: ${proposal.amount} TL` : null,
        proposal.payment_day ? `Ödeme günü: Her ayın ${proposal.payment_day}. günü` : null,
        `Kayıt tarihi: ${today()}`,
      ].filter(Boolean).join(", ");

      await supabase.from("assistant_memory").upsert(
        { user_id: user.id, key: `musteri_${customer.id}`, value: memoryValue, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );

      return NextResponse.json({
        ok: true,
        type: "iş",
        message: `✅ İş kaydı oluşturuldu.\n\n${proposal.customer_name}\n${proposal.amount ? `Bedel: ${proposal.amount} TL` : ""}`,
        record: {
          id: customer.id,
          type: "iş",
          title: proposal.customer_name,
          amount: Number(proposal.amount || 0),
          payment_day: proposal.payment_day || null,
          table: "customers",
          ask_payment: true
        }
      });
    }

    if (proposal.type === "service_plan") {
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .ilike("brand_name", `%${proposal.customer_name}%`)
        .limit(1);

      const customer = customers?.[0];

      if (!customer) {
        return NextResponse.json({
          ok: false,
          message: "Müşteri bulunamadı. Önce müşteriyi veya işi kaydetmeliyiz.",
        });
      }

      const planText = [
        proposal.reels ? `Ayda ${proposal.reels} reels` : null,
        proposal.story ? `Ayda ${proposal.story} story` : null,
        proposal.post ? `Ayda ${proposal.post} post` : null,
      ].filter(Boolean).join(" · ");

      await supabase.from("activity_logs").insert({
        customer_id: customer.id,
        action_title: "Hizmet planı onaylandı",
        action_detail: planText,
        action_type: "plan",
        user_id: user.id,
      });

      return NextResponse.json({
        ok: true,
        type: "plan",
        message: `✅ Plan onaylandı ve kaydedildi.\n\n${customer.brand_name || customer.name}\n${planText}`,
        record: {
          id: customer.id,
          type: "plan",
          title: customer.brand_name || customer.name,
          table: "activity_logs"
        }
      });
    }

    return NextResponse.json({ ok: false, message: "Bu öneri türü henüz desteklenmiyor." });
  } catch (error) {
    console.error("Assistant approval failed", error);
    return NextResponse.json({ ok: false, message: "Kayıt şu anda oluşturulamadı. Lütfen tekrar dene." }, { status: 500 });
  }
}
