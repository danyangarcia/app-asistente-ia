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
    } catch (e) {
      // Petición sin cuerpo JSON estructurado
    }

    // 1. Detección si la petición viene como llamada a herramienta (Tool Call)
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

    // 2. Extracción de respaldo del identificador de la empresa
    if (!businessSlug) {
      businessSlug =
        body.message?.call?.assistant?.metadata?.business_slug ||
        body.business_slug ||
        "tacos-luis";
    }

    // 3. Consulta a la tabla businesses usando los nombres exactos de columnas
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      console.error("Error al obtener negocio de Supabase:", error);
      return responder(toolCallId, {
        estado_operativo: "error",
        mensaje_para_cliente: "Disculpa, no pudimos localizar la información del establecimiento en este momento."
      });
    }

    const nombreNegocio = business["Nombre del negocio"] || "el establecimiento";

    // 4. Validar si la cuenta está activa
    if (business["Cuenta Activa"] === false) {
      return responder(toolCallId, {
        estado_operativo: "inactivo",
        mensaje_para_cliente: `Lo sentimos, el servicio para ${nombreNegocio} se encuentra inactivo temporalmente. ¡Hasta pronto!`
      });
    }

    // 5. Validar horario en tiempo real según la zona horaria asignada
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    }); // Retorna formato HH:mm:ss

    const horaApertura = business.hora_apertura;
    const horaCierre = business.hora_cierre;

    if (horaApertura && horaCierre) {
      if (horaActual < horaApertura || horaActual > horaCierre) {
        const aperturaFormat = horaApertura.substring(0, 5);
        const cierreFormat = horaCierre.substring(0, 5);

        return responder(toolCallId, {
          estado_operativo: "cerrado",
          mensaje_para_cliente: `Gracias por llamar a ${nombreNegocio}. En este momento nos encontramos fuera de horario. Nuestro horario de atención es de ${aperturaFormat} a ${cierreFormat}. ¡Gracias por comunicarse!`
        });
      }
    }

    // 6. Negocio dentro de horario operativo
    return responder(toolCallId, {
      estado_operativo: "abierto",
      mensaje_para_cliente: `¡Hola, buenas! Gracias por llamar a ${nombreNegocio}, ¿en qué le puedo ayudar hoy?`
    });

  } catch (err: any) {
    console.error("Error general en servidor:", err);
    return NextResponse.json({ error: err.message }, { status: 200, headers: corsHeaders });
  }
}

// Función auxiliar para responder a Vapi según el tipo de solicitud
function responder(toolCallId: string | null, payload: { estado_operativo: string; mensaje_para_cliente: string }) {
  if (toolCallId) {
    return NextResponse.json({
      results: [{ toolCallId, result: payload }]
    }, { status: 200, headers: corsHeaders });
  }

  return NextResponse.json({
    assistant: {
      firstMessage: payload.mensaje_para_cliente,
      ...(payload.estado_operativo !== "abierto" && { endCallAfterSpokenEnabled: true })
    }
  }, { status: 200, headers: corsHeaders });
}