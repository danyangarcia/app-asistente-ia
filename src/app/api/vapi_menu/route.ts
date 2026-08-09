import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  // 1. Inicializar Supabase
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let businessSlug: string | null = null;
  let rawBody: any = null;

  // 2. Extraer el parámetro si es GET (Pruebas en navegador)
  if (request.method === "GET") {
    const { searchParams } = new URL(request.url);
    businessSlug = searchParams.get("business_slug");
  } 
  // 3. Extraer el parámetro de Vapi (POST)
  else if (request.method === "POST") {
    try {
      rawBody = await request.json();
      
      // Caso A: Viene directo en el body
      if (rawBody.business_slug) {
        businessSlug = rawBody.business_slug;
      }
      
      // Caso B: Viene en el formato estándar de toolCalls (Vapi)
      if (!businessSlug && rawBody.message?.toolCalls && rawBody.message.toolCalls.length > 0) {
        let args = rawBody.message.toolCalls[0].function?.arguments;
        
        if (typeof args === "string") {
          try { args = JSON.parse(args); } catch (e) {} 
        }
        if (args && args.business_slug) {
          businessSlug = args.business_slug;
        }
      }
      
      // Caso C: Viene en formatos alternativos
      if (!businessSlug) {
        let altArgs = rawBody.message?.functionCall?.arguments || rawBody.args;
        if (typeof altArgs === "string") {
          try { altArgs = JSON.parse(altArgs); } catch (e) {}
        }
        if (altArgs && altArgs.business_slug) {
          businessSlug = altArgs.business_slug;
        }
      }
    } catch (error) {
      console.error("Error al procesar el body:", error);
    }
  }

  // 4. Validación Multiempresa
  if (!businessSlug) {
    return NextResponse.json({ 
      error: "Falta el identificador del negocio.", 
      instruccion_para_ia: "No recibí el identificador del negocio. Por favor pregúntale al cliente de qué sucursal quiere el menú."
    }, { status: 200 }); 
  }

  // 5. NUEVO: Verificar horario de atención antes de entregar el menú
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select('"Nombre del negocio", "Cuenta Activa", "Zona Horaria", hora_apertura, hora_cierre')
    .eq("enlace del panel", businessSlug)
    .single();

  const toolCallId = rawBody?.message?.toolCalls?.[0]?.id;

  if (business) {
    // Validar si la cuenta está inactiva
    if (business["Cuenta Activa"] === false) {
      const payload = {
        negocio_cerrado: true,
        mensaje: `Lo sentimos, el servicio para ${business["Nombre del negocio"]} se encuentra inactivo por el momento.`
      };
      return responder(toolCallId, businessSlug, payload);
    }

    // Validar horario según zona horaria
    const timeZone = business["Zona Horaria"] || "America/Hermosillo";
    const horaActual = new Date().toLocaleTimeString("en-GB", { timeZone, hour12: false });
    
    if (business.hora_apertura && business.hora_cierre) {
      if (horaActual < business.hora_apertura || horaActual > business.hora_cierre) {
        const aperturaFormat = business.hora_apertura.substring(0, 5);
        const cierreFormat = business.hora_cierre.substring(0, 5);

        const payload = {
          negocio_cerrado: true,
          mensaje: `Disculpa, en este momento nos encontramos cerrados en ${business["Nombre del negocio"]}. Nuestro horario de atención es de ${aperturaFormat} a ${cierreFormat}.`
        };
        return responder(toolCallId, businessSlug, payload);
      }
    }
  }

  // 6. Consulta de items a la base de datos de Supabase (Negocio Abierto)
  const { data: items, error } = await supabaseAdmin
    .from("catalog_items")
    .select("nombre, categoria, precio")
    .eq("business_slug", businessSlug)
    .eq("disponible", true);

  if (error) {
    return NextResponse.json({ 
      error: "Error al conectar con la base de datos.", 
      detalle: error.message 
    }, { status: 200 });
  }

  // 7. Éxito: Retornamos los platillos del catálogo
  const payloadExito = {
    negocio_cerrado: false,
    items: items || []
  };

  return responder(toolCallId, businessSlug, payloadExito);
}

// Función auxiliar para responder a Vapi o peticiones estándar
function responder(toolCallId: string | undefined, businessSlug: string, payload: any) {
  if (toolCallId) {
    return NextResponse.json({
      results: [
        {
          toolCallId: toolCallId,
          result: {
            negocio_consultado: businessSlug,
            ...payload
          }
        }
      ]
    }, { status: 200 });
  }

  return NextResponse.json({
    negocio_consultado: businessSlug,
    ...payload
  }, { status: 200 });
}