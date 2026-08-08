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

    const body = await request.json();
    
    // Asignamos el slug por defecto o lo extraemos de los metadatos de Vapi
    const businessSlug = body.message?.call?.assistant?.metadata?.business_slug || "tacos-luis";

    // Consultamos la tabla 'businesses'
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierra')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      return NextResponse.json({
        assistant: {
          firstMessage: "Disculpa, no pudimos localizar la información del establecimiento en este momento.",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 1. Validar si la cuenta está activa
    if (business["Cuenta Activa"] === false) {
      return NextResponse.json({
        assistant: {
          firstMessage: "Lo sentimos, este servicio se encuentra temporalmente inactivo. ¡Hasta luego!",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 2. Validar el horario en vivo
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    });

    const horaApertura = business.hora_apertura;
    const horaCierra = business.hora_cierra;

    if (horaApertura && horaCierra) {
      if (horaActual < horaApertura || horaActual > horaCierra) {
        return NextResponse.json({
          assistant: {
            firstMessage: `En este momento nos encontramos fuera de horario de servicio. Nuestro horario es de ${horaApertura} a ${horaCierra}. ¡Gracias por llamar!`,
            endCallAfterSpokenEnabled: true
          }
        }, { status: 200, headers: corsHeaders });
      }
    }

    // 3. Si está abierto y activo, Vapi contesta de forma normal
    return NextResponse.json({
      assistant: {
        firstMessage: "¡Hola, buenas! Gracias por llamar a Tacos Luis, ¿en qué le puedo ayudar hoy?"
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Error en inbound-call:", err);
    return NextResponse.json({ error: err.message }, { status: 200, headers: corsHeaders });
  }
}