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
    { status: "ok", mensaje: "Endpoint inbound-call dinámico activo." },
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
    
    // Extrae el business_slug enviado por Vapi en los metadatos o en el cuerpo
    const businessSlug = 
      body.message?.call?.assistant?.metadata?.business_slug || 
      body.business_slug || 
      "tacos-luis";

    // Consulta dinámica a la tabla 'businesses'
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      console.error("Error al obtener negocio:", error);
      return NextResponse.json({
        assistant: {
          firstMessage: "Disculpa, no pudimos localizar la información del establecimiento en este momento.",
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    const nombreNegocio = business["Nombre del negocio"] || "nuestro establecimiento";

    // 1. Validar si la cuenta del negocio está activa
    if (business["Cuenta Activa"] === false) {
      return NextResponse.json({
        assistant: {
          firstMessage: `Lo sentimos, el servicio para ${nombreNegocio} se encuentra inactivo temporalmente. ¡Hasta luego!`,
          endCallAfterSpokenEnabled: true
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 2. Validar horario en vivo según la Zona Horaria asignada a cada empresa
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    }); // Formato "HH:mm:ss"

    const horaApertura = business.hora_apertura;
    const horaCierre = business.hora_cierre;

    if (horaApertura && horaCierre) {
      if (horaActual < horaApertura || horaActual > horaCierre) {
        // Formatear horas a HH:MM dinámicamente
        const aperturaFormateada = horaApertura.substring(0, 5);
        const cierreFormateado = horaCierre.substring(0, 5);

        return NextResponse.json({
          assistant: {
            firstMessage: `Gracias por llamar a ${nombreNegocio}. En este momento nos encontramos fuera de horario. Nuestro horario de atención es de ${aperturaFormateada} a ${cierreFormateado}. ¡Gracias por comunicarse!`,
            endCallAfterSpokenEnabled: true
          }
        }, { status: 200, headers: corsHeaders });
      }
    }

    // 3. Negocio abierto: permite que el asistente atienda normalmente
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