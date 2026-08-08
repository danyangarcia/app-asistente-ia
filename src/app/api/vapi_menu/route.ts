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

  // 2. Extraer el parámetro si es GET (Pruebas en navegador)
  if (request.method === "GET") {
    const { searchParams } = new URL(request.url);
    businessSlug = searchParams.get("business_slug");
  } 
  // 3. Extraer el parámetro de Vapi (POST) de forma INFALIBLE
  else if (request.method === "POST") {
    try {
      const body = await request.json();
      
      // Caso A: Viene directo en el body de Vapi
      if (body.business_slug) {
        businessSlug = body.business_slug;
      }
      
      // Caso B: Viene en el formato estándar de toolCalls (Vapi moderno)
      if (!businessSlug && body.message?.toolCalls && body.message.toolCalls.length > 0) {
        let args = body.message.toolCalls[0].function?.arguments;
        
        // ¡CRÍTICO! OpenAI manda los argumentos como String, hay que parsearlos
        if (typeof args === "string") {
          try { args = JSON.parse(args); } catch (e) {} 
        }
        if (args && args.business_slug) {
          businessSlug = args.business_slug;
        }
      }
      
      // Caso C: Viene en formatos antiguos (functionCall o args directos)
      if (!businessSlug) {
        let altArgs = body.message?.functionCall?.arguments || body.args;
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

  // 4. Validación Multiempresa Blindada
  // Si no hay slug, devolvemos STATUS 200 (para no crashear Vapi) pero con instrucciones para el Bot
  if (!businessSlug) {
    return NextResponse.json({ 
      error: "Falta el identificador del negocio.", 
      instruccion_para_ia: "No recibí el identificador del negocio. Por favor pregúntale al cliente de qué sucursal quiere el menú."
    }, { status: 200 }); 
  }

  // 5. Consulta a la base de datos de Supabase
  const { data: items, error } = await supabaseAdmin
    .from("catalog_items")
    .select("nombre, categoria, precio")
    .eq("business_slug", businessSlug)
    .eq("disponible", true);

  // Si falla la base de datos, también devolvemos 200 con el error para que la IA lo lea
  if (error) {
    return NextResponse.json({ 
      error: "Error al conectar con la base de datos.", 
      detalle: error.message 
    }, { status: 200 });
  }

  // 6. Éxito total: Retornamos los platillos
  return NextResponse.json({
    negocio_consultado: businessSlug,
    items: items || []
  }, { status: 200 });
}