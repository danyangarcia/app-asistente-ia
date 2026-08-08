import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    let businessSlug = null;
    let toolCallId = null;

    // Extraer el business_slug de la estructura de Vapi Tools de forma infalible
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

    if (!businessSlug && body.business_slug) {
      businessSlug = body.business_slug;
    }

    if (!businessSlug) {
      return NextResponse.json({ error: "Falta el identificador del negocio (business_slug)." }, { status: 200 });
    }

    // Consultamos la tabla 'businesses' con los nombres exactos de tus columnas
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierra')
      .eq("enlace del panel", businessSlug)
      .single();

    if (error || !business) {
      return NextResponse.json({
        results: toolCallId ? [{
          toolCallId,
          result: { estatus: "error", mensaje: "No se encontró el negocio en la base de datos." }
        }] : { error: "Negocio no encontrado" }
      }, { status: 200 });
    }

    // 1. Validar si la cuenta está activa
    if (business["Cuenta Activa"] === false) {
      const responsePayload = {
        estado_operativo: "inactivo",
        mensaje_para_cliente: "Lo sentimos, este servicio se encuentra temporalmente inactivo."
      };
      return NextResponse.json(toolCallId ? { results: [{ toolCallId, result: responsePayload }] } : responsePayload, { status: 200 });
    }

    // 2. Validar el horario en vivo según la Zona Horaria del negocio
    const timeZone = business["Zona Horaria"] || "America/Mexico_City";
    const nowInTz = new Date().toLocaleTimeString("en-GB", {
      timeZone: timeZone,
      hour12: false
    }); // Formato "HH:mm:ss"

    const horaActual = nowInTz;
    const horaApertura = business.hora_apertura; // Ej: "07:00:00"
    const horaCierra = business.hora_cierra;     // Ej: "15:00:00"

    if (horaApertura && horaCierra) {
      if (horaActual < horaApertura || horaActual > horaCierra) {
        const responsePayload = {
          estado_operativo: "cerrado",
          horario_apertura: horaApertura,
          horario_cierre: horaCierra,
          mensaje_para_cliente: `En este momento nos encontramos fuera de horario de servicio. Nuestro horario es de ${horaApertura} a ${horaCierra}. Agradecemos tu llamada, ¡hasta pronto!`
        };
        return NextResponse.json(toolCallId ? { results: [{ toolCallId, result: responsePayload }] } : responsePayload, { status: 200 });
      }
    }

    // 3. Si todo está bien, el negocio está abierto y activo
    const responsePayload = {
      estado_operativo: "abierto",
      nombre_negocio: business["Nombre del negocio"],
      mensaje_para_cliente: "El negocio está abierto y operando con normalidad."
    };

    return NextResponse.json(toolCallId ? {
      results: [
        {
          toolCallId: toolCallId,
          result: responsePayload
        }
      ]
    } : responsePayload, { status: 200 });

  } catch (err: any) {
    console.error("Error en verificar_estado:", err);
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}