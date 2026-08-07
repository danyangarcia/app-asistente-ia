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

    // 1. Cuando la llamada inicia (usando el evento chat.created)
    if (eventType === "chat.created" || eventType === "assistant-request") {
      const { data: business, error } = await supabaseAdmin
        .from("businesses")
        .select("prompt_config")
        .eq("enlace del panel", "tacos-luis")
        .single();

      if (error || !business || !business.prompt_config) {
        return NextResponse.json({
          assistant: {
            model: {
              messages: [
                {
                  role: "system",
                  content: "Eres Gaby, la asistente de Tacos Luis. Ocurrió un error al cargar el menú."
                }
              ]
            }
          }
        });
      }

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
        }
      });
    }

    // 2. Cuando la llamada termina (usando el evento end-of-call-report)
    if (eventType === "end-of-call-report") {
      // Aquí se queda tu lógica para procesar y guardar el pedido en Supabase
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error en el webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}