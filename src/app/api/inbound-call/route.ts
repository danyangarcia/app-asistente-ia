import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { status: "ok", mensaje: "Endpoint activo para verificación de horarios." },
    { status: 200, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    let businessSlug = searchParams.get("business_slug");
    let toolCallId: string | null = null;

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    // Detección si viene de Tool Call
    if (body.message?.toolCalls && body.message.toolCalls.length > 0) {
      toolCallId = body.message.toolCalls[0].id;
      let args = body.message.toolCalls[0].function?.arguments;
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch (e) {}
      }
      if (args && args.business_slug) {
        businessSlug = args.business_slug;
      }
    }

    // Si no viene en la URL ni en la Tool, se extrae del metadata o se usa el slug por defecto
    if (!businessSlug) {
      businessSlug =
        body.message?.call?.assistant?.metadata?.business_slug ||
        body.message?.call?.customer?.metadata?.business_slug ||
        body.business_slug ||
        "tacos-luis"; // Slug de respaldo si entra llamada directa
    }

    // Consultar Supabase
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      console.error("Error al obtener negocio de Supabase:", error);
      return responder(toolCallId, {
        estado_operativo: "error",
        mensaje_para_cliente: "Disculpa, no pudimos localizar la información del establecimiento."
      });
    }

    const nombreNegocio = business["Nombre del negocio"] || "el negocio";

    // 1. Validar cuenta activa
    if (business["Cuenta Activa"] === false) {
      return responder(toolCallId, {
        estado_operativo: "inactivo",
        mensaje_para_cliente: `Lo sentimos, el servicio para ${nombreNegocio} está temporalmente inactivo.`
      });
    }

    // 2. Validar horario
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    });

    const horaApertura = business.hora_apertura;
    const horaCierre = business.hora_cierre;

    if (horaApertura && horaCierre) {
      if (horaActual < horaApertura || horaActual > horaCierre) {
        const aperturaFormat = horaApertura.substring(0, 5);
        const cierreFormat = horaCierre.substring(0, 5);

        return responder(toolCallId, {
          estado_operativo: "cerrado",
          mensaje_para_cliente: `Gracias por llamar a ${nombreNegocio}. En este momento nos encontramos cerrados. Nuestro horario es de ${aperturaFormat} a ${cierreFormat}. ¡Gracias por comunicarte!`
        });
      }
    }

    // 3. Negocio Abierto
    return responder(toolCallId, {
      estado_operativo: "abierto",
      mensaje_para_cliente: `¡Hola, buenas! Gracias por llamar a ${nombreNegocio}, ¿en qué le puedo ayudar hoy?`
    });

  } catch (err: any) {
    console.error("Error en servidor:", err);
    return NextResponse.json({ error: err.message }, { status: 200, headers: corsHeaders });
  }
}

function responder(toolCallId: string | null, payload: { estado_operativo: string; mensaje_para_cliente: string }) {
  if (toolCallId) {
    return NextResponse.json({
      results: [{ toolCallId, result: payload }]
    }, { status: 200, headers: corsHeaders });
  }

  // Respuesta al webhook de Vapi para llamadas entrantes
  return NextResponse.json({
    assistant: {
      firstMessageMode: "assistant-speaks-first",
      firstMessage: payload.mensaje_para_cliente,
      ...(payload.estado_operativo !== "abierto" && { endCallAfterSpokenEnabled: true })
    }
  }, { status: 200, headers: corsHeaders });
}