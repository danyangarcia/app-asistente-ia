import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const payload = await request.json().catch(() => null);
    const eventType = payload?.message?.type || payload?.type;

    console.log("Evento recibido de Vapi:", eventType);

    // Si es cualquier evento de comunicación o inicio, le inyectamos el menú de Tacos Luis
    // O si Vapi pide configuración inicial del asistente
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select("prompt_config")
      .eq("enlace del panel", "tacos-luis")
      .single();

    if (error || !business || !business.prompt_config) {
      console.error("Error al buscar en Supabase:", error);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Si Vapi está esperando una respuesta de configuración de asistente (Assistant Request)
    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              role: "system",
              content: business.prompt_config
            }
          ]
        }
      },
      success: true
    });

  } catch (error) {
    console.error("Error crítico en el webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}