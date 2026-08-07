import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const messageObj = payload as any;
    const eventType = messageObj.message?.type;

    // CASO 1: Vapi pide la configuración inicial al arrancar la llamada (Assistant Request)
    // Aquí es donde le inyectamos el menú y el prompt de Supabase para que Gaby hable con bases reales.
    if (eventType === "assistant-request" || !eventType) {
      const { data: business, error } = await supabaseAdmin
        .from("businesses")
        .select('"Nombre del negocio", prompt_config')
        .eq("enlace del panel", "tacos-luis")
        .single();

      const promptContent = (!error && business?.prompt_config) 
        ? business.prompt_config 
        : "Eres Gaby, la asistente de Tacos Luis. Saluda al cliente.";

      return NextResponse.json({
        assistant: {
          model: {
            messages: [
              {
                role: "system",
                content: promptContent
              }
            ]
          }
        }
      });
    }

    // CASO 2: Eventos de la llamada en curso o finalizada (para procesar confirmaciones de pedidos)
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

    // Insertamos el pedido si el usuario confirmó
    const orderInsert = await supabaseAdmin
      .from("orders")
      .insert({
        business_slug: "tacos-luis",
        cliente_nombre: "Danyan Garcia",
        cliente_telefono: "6381234567",
        tipo: "domicilio",
        direccion: "Calle 10 y Avenida Serdán #142",
        hora: new Date().toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' }),
        items: [
          { cantidad: 5, taco: "cabeza", tortilla: "maíz" }
        ],
        total: 215,
        estado: "new",
        origen: "voice_call"
      })
      .select("id")
      .single();

    if (orderInsert.error || !orderInsert.data) {
      console.error("Error al insertar el pedido en Supabase:", orderInsert.error);
      return NextResponse.json({ error: "Order creation failed", details: orderInsert.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, order_id: orderInsert.data.id }, { status: 201 });

  } catch (error) {
    console.error("Error general en el webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}