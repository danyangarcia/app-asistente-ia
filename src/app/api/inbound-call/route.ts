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

    if (!businessSlug) return NextResponse.json({ error: "Falta slug" }, { status: 400 });

    // 1. Buscamos TODO, incluyendo el prompt que guardaste en la DB
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select("nombre, hora_apertura, hora_cierre, prompt_config") 
      .eq("slug", businessSlug)
      .single();

    if (error || !business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

    // 2. Validar horario (mismo lógica)
    const horaActualSonora = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Hermosillo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const estaAbierto = horaActualSonora >= business.hora_apertura && horaActualSonora <= business.hora_cierre;

    // 3. Selección dinámica: Si está cerrado, mandamos un mensaje genérico, 
    // pero si está abierto, usamos el prompt que definiste en la base de datos para ese negocio
    const content = estaAbierto 
      ? business.prompt_config // <--- ¡AQUÍ ESTÁ LA MAGIA! Jala el prompt de la DB
      : `Eres un asistente de ${business.nombre}. El negocio está cerrado. Horario: ${business.hora_apertura} a ${business.hora_cierre}. Informa esto y despídete amablemente.`;

    return NextResponse.json({
      assistant: {
        model: {
          messages: [{ role: "system", content: content }]
        }
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}