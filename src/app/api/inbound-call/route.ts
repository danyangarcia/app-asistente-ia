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
    const businessSlug = body.message?.call?.assistant?.metadata?.business_slug || "tacos-luis";

    // Mapeo con el nombre exacto de las columnas de tu tabla businesses
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      console.error("Error al obtener negocio:", error);
      return NextResponse.json({
        assistant: {
          firstMessage: "Disculpa, no pudimos consultar la información del establecimiento.",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 1. Validar estado de la cuenta
    if (business["Cuenta Activa"] === false) {
      return NextResponse.json({
        assistant: {
          firstMessage: "Lo sentimos, este servicio se encuentra inactivo temporalmente. ¡Hasta pronto!",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 2. Validar Horarios
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    }); // Formato HH:mm:ss

    const horaApertura = business.hora_apertura; // "07:00:00"
    const horaCierre = business.hora_cierre;     // "15:00:00"

    if (horaApertura && horaCierre) {
      if (horaActual < horaApertura || horaActual > horaCierre) {
        return NextResponse.json({
          assistant: {
            firstMessage: `En este momento nos encontramos fuera de horario. Nuestro horario de servicio es de ${horaApertura.substring(0, 5)} a ${horaCierre.substring(0, 5)}. ¡Gracias por llamar!`,
            endCallAfterSpokenEnabled: true
          }
        }, { status: 200, headers: corsHeaders });
      }
    }

    // 3. Negocio abierto
    return NextResponse.json({
      assistant: {
        firstMessage: "¡Hola, buenas! Gracias por llamar a Tacos Luis, ¿en qué le puedo ayudar hoy?"
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Error general en inbound-call:", err);
    return NextResponse.json({ error: err.message }, { status: 200, headers: corsHeaders });
  }
}