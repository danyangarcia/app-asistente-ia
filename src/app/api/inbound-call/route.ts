import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Opcional: puedes leer el body que manda Vapi/OpenAI si lo necesitas luego
    await request.json().catch(() => null);

    // Buscamos directamente el negocio en Supabase para asegurar que devuelva el menú
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", prompt_config')
      .eq("enlace del panel", "tacos-luis")
      .single();

    let systemPrompt = "Bienvenido a Tacos Luis.";
    if (!error && business && business.prompt_config) {
      systemPrompt = business.prompt_config;
    }

    // RESPUESTA CON FORMATO ESTÁNDAR OPENAI CHAT COMPLETIONS (Exigido por Custom LLM)
    return NextResponse.json({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: systemPrompt
          },
          finish_reason: "stop"
        }
      ]
    });

  } catch (error) {
    console.error("Error en Custom LLM:", error);
    return NextResponse.json({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Eres un asistente de Tacos Luis. Ocurrió un error interno al cargar la base de datos."
          },
          finish_reason: "stop"
        }
      ]
    });
  }
}