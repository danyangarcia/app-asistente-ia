import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const payload = await request.json().catch(() => null);
  if (!payload) {
    console.error("Payload inválido o vacío");
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  console.log("Payload recibido de Vapi:", JSON.stringify(payload, null, 2));

  // Buscamos el primer negocio disponible en la tabla businesses
  const businessResult = await supabaseAdmin
    .from("businesses")
    .select("id")
    .limit(1)
    .single();

  if (businessResult.error || !businessResult.data) {
    console.error("No se encontró ningún negocio en Supabase:", businessResult.error);
    return NextResponse.json({ error: "No business found in database" }, { status: 404 });
  }

  const businessId = businessResult.data.id;

  // Intentamos registrar el pedido de forma segura con datos predeterminados si Vapi no los manda
  const orderInsert = await supabaseAdmin
    .from("orders")
    .insert({
      business_id: businessId,
      source: "voice_call",
      customer_name: "Cliente Llamada Vapi",
      customer_phone: "6380000000",
      order_type: "domicilio",
      delivery_address: "Dirección de prueba Vapi",
      status: "new",
      total_amount: 150,
      notes: "Pedido automático por llamada de prueba",
    })
    .select("id")
    .single();

  if (orderInsert.error || !orderInsert.data) {
    console.error("Error al insertar el pedido en Supabase:", orderInsert.error);
    return NextResponse.json({ error: "Order creation failed", details: orderInsert.error }, { status: 500 });
  }

  console.log("¡Pedido guardado con éxito! ID:", orderInsert.data.id);
  return NextResponse.json({ success: true, order_id: orderInsert.data.id }, { status: 201 });
}