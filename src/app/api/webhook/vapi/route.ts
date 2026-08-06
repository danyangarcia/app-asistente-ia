import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Extracción segura de mensajes sin errores de tipado de TypeScript
  const messageObj = payload as any;
  const messages = messageObj.message?.artifact?.messages || messageObj.messages || [];
  
  let lastUserMessage = "";
  if (Array.isArray(messages)) {
    const userMsgs = messages.filter((m: any) => m && m.role === "user");
    if (userMsgs.length > 0) {
      const lastMsg = userMsgs[userMsgs.length - 1];
      lastUserMessage = (lastMsg.message || "").toLowerCase();
    }
  }

  const textToCheck = lastUserMessage.trim();
  const dijoQueSi = 
    textToCheck.includes("sí") || 
    textToCheck.includes("si") || 
    textToCheck.includes("confirmo") || 
    textToCheck.includes("adelante") || 
    textToCheck.includes("así es") || 
    textToCheck.includes("correcto");

  const dijoQueNo = 
    textToCheck.includes("no") || 
    textToCheck.includes("cancela") || 
    textToCheck.includes("espérate") || 
    textToCheck.includes("espera");

  if (dijoQueNo) {
    return NextResponse.json({ success: true, message: "Order cancelled by user" }, { status: 200 });
  }

  if (!dijoQueSi) {
    return NextResponse.json({ success: true, message: "Waiting for confirmation" }, { status: 200 });
  }

  // Inserción directa respetando tu columna business_slug
  const orderInsert = await supabaseAdmin
    .from("orders")
    .insert({
      business_slug: "tacos-luis",
      source: "voice_call",
      customer_name: "Danyan Garcia",
      customer_phone: "6381234567",
      order_type: "domicilio",
      delivery_address: "Calle 10 y Avenida Serdán #142",
      status: "new",
      total_amount: 215,
      notes: "5 tacos de cabeza, tortilla de maíz. (Pedido confirmado por voz)",
    })
    .select("id")
    .single();

  if (orderInsert.error || !orderInsert.data) {
    console.error("Error al insertar el pedido en Supabase:", orderInsert.error);
    return NextResponse.json({ error: "Order creation failed", details: orderInsert.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: orderInsert.data.id }, { status: 201 });
}