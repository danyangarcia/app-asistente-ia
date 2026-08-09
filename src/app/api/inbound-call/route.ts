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
    { status: "ok", mensaje: "Endpoint inbound-call activo." },
    { status: 200, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Intentar obtener el business_slug desde los parámetros URL (?business_slug=tacos-luis)
    const { searchParams } = new URL(request.url);
    let businessSlug = searchParams.get("business_slug");

    // 2. Si no viene en la URL, intentar extraerlo del body que envía Vapi
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body vacío o no parseable
    }

    if (!businessSlug) {
      businessSlug = 
        body.message?.call?.assistant?.metadata?.business_slug || 
        body.business_slug || 
        "tacos-luis"; // Fallback por defecto
    }

    // 3. Consultar la tabla businesses en Supabase
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      console.error("Error al buscar negocio en DB:", error);
      return NextResponse.json({
        assistant: {
          firstMessage: "Disculpa, no pudimos verificar la información del establecimiento.",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    const nombreNegocio = business["Nombre del negocio"] || "nuestro establecimiento";

    // 4. Validar si la cuenta está activa
    if (business["Cuenta Activa"] === false) {
      return NextResponse.json({
        assistant: {
          firstMessage: `Lo sentimos, el servicio para ${nombreNegocio} se encuentra inactivo. ¡Hasta pronto!`,
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 5. Validar Horario de Atención
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    }); // Retorna HH:mm:ss

    const horaApertura = business.hora_apertura;
    const horaCierre = business.hora_cierre;

    if (horaApertura && horaCierre) {
      if (horaActual < horaApertura || horaActual > horaCierre) {
        const aperturaFormat = horaApertura.substring(0, 5);
        const cierreFormat = horaCierre.substring(0, 5);

        return NextResponse.json({
          assistant: {
            firstMessage: `Gracias por llamar a ${nombreNegocio}. En este momento nos encontramos fuera de horario. Nuestro horario de servicio es de ${aperturaFormat} a ${cierreFormat}. ¡Gracias por comunicarse!`,
            endCallAfterSpokenEnabled: true
          }
        }, { status: 200, headers: corsHeaders });
      }
    }

    // 6. Negocio abierto
    return NextResponse.json({
      assistant: {
        firstMessage: `¡Hola, buenas! Gracias por llamar a ${nombreNegocio}, ¿en qué le puedo ayudar hoy?`
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Error general en inbound-call:", err);
    return NextResponse.json({ error: err.message }, { status: 200, headers: corsHeaders });
  }
}