import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Encabezados CORS para asegurar que Vapi y los navegadores no bloqueen la conexión
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Manejo de peticiones OPTIONS (Preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Handler GET para pruebas de salud en navegador
export async function GET() {
  return NextResponse.json(
    { status: "ok", mensaje: "Endpoint crear_orden activo." },
    { status: 200, headers: corsHeaders }
  );
}

// Handler POST principal para Vapi
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    let toolCallId = null;
    let args: any = {};

    // Extraer argumentos enviado por Vapi
    if (body.message?.toolCalls && body.message.toolCalls.length > 0) {
      toolCallId = body.message.toolCalls[0].id;
      args = body.message.toolCalls[0].function?.arguments || {};
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch (e) {}
      }
    } else if (body.business_slug) {
      args = body;
    }

    const {
      business_slug,
      cliente_nombre,
      cliente_telefono,
      tipo,
      direccion,
      hora,
      items,
      total,
      confirmado
    } = args;

    if (!business_slug) {
      return NextResponse.json(
        { error: "Falta el parámetro business_slug" },
        { status: 200, headers: corsHeaders }
      );
    }

    // 1. Validar confirmación explícita
    if (confirmado === false || confirmado === "no") {
      const respNo = { exito: false, mensaje: "Pedido no confirmado por el cliente. No se guardó nada." };
      return NextResponse.json(
        toolCallId ? { results: [{ toolCallId, result: respNo }] } : respNo,
        { status: 200, headers: corsHeaders }
      );
    }

    // 2. Filtro Anti-Duplicados (Revisa peticiones de los últimos 2 minutos)
    const haceDosMinutos = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: ordenesRecientes } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("business_slug", business_slug)
      .eq("cliente_telefono", cliente_telefono || "")
      .gte("created_at", haceDosMinutos);

    if (ordenesRecientes && ordenesRecientes.length > 0) {
      const respDup = { exito: true, mensaje: "El pedido ya fue registrado previamente. Se ignoró la llamada duplicada." };
      return NextResponse.json(
        toolCallId ? { results: [{ toolCallId, result: respDup }] } : respDup,
        { status: 200, headers: corsHeaders }
      );
    }

    // 3. Inserción en la tabla public.orders
    const { error: insertError } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          business_slug: business_slug,
          cliente_nombre: cliente_nombre || "Cliente en llamada",
          cliente_telefono: cliente_telefono || "No especificado",
          tipo: tipo || "para llevar",
          direccion: direccion || null,
          hora: hora || null,
          items: items || [],
          total: total || 0,
          estado: "pendiente",
          origen: "Vapi Call"
        }
      ]);

    if (insertError) {
      console.error("Error Supabase:", insertError);
      return NextResponse.json(
        toolCallId ? { results: [{ toolCallId, result: { exito: false, mensaje: "Error al guardar en base de datos." } }] } : { exito: false },
        { status: 200, headers: corsHeaders }
      );
    }

    const respOk = { exito: true, mensaje: "¡Pedido registrado con éxito en la base de datos!" };
    return NextResponse.json(
      toolCallId ? { results: [{ toolCallId, result: respOk }] } : respOk,
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    console.error("Error general:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 200, headers: corsHeaders }
    );
  }
}