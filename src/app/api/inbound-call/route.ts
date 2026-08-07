import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const businessSlug = searchParams.get("business_slug");

    if (!businessSlug) {
      return NextResponse.json({ error: "Falta el business_slug" }, { status: 400 });
    }

    // 1. Buscamos usando los nombres exactos de tu tabla (respetando espacios y comillas)
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", hora_apertura, hora_cierre, prompt_config')
      .eq("enlace del panel", businessSlug) // Como tu slug está guardado en "enlace del panel"
      .single();

    if (error || !business) {
      console.error("Error buscando negocio:", error);
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // 2. Obtener la hora actual exacta en Sonora (Caborca)
    const horaActualSonora = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Hermosillo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    // 3. Validar si está abierto o cerrado
    const estaAbierto = horaActualSonora >= business.hora_apertura && horaActualSonora <= business.hora_cierre;

    // 4. Seleccionar prompt de Supabase o mensaje de cerrado
    const nombreNegocio = business["Nombre del negocio"];
    
    const content = estaAbierto 
      ? business.prompt_config 
      : `Eres un asistente de ${nombreNegocio}. El negocio está cerrado en este momento. Nuestro horario de atención es de ${business.hora_apertura} a ${business.hora_cierre}. Informa esto al cliente de forma amable y despídete sin tomar ningún pedido.`;

    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              role: "system",
              content: content
            }
          ]
        }
      }
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json({ error: "Error procesando la llamada" }, { status: 500 });
  }
}