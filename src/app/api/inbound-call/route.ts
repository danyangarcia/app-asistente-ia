import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json().catch(() => ({}));
    const messages = body.messages || [];
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

    // Consultamos el registro real de Tacos Luis trayendo el prompt_config de Supabase
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", prompt_config')
      .eq("enlace del panel", "tacos-luis")
      .single();

    let systemPrompt = "Hola, bienvenido a Tacos Luis.";
    if (!error && business && business.prompt_config) {
      systemPrompt = business.prompt_config;
    }

    // Usamos el contenido real del prompt_config de Supabase como la respuesta de la IA
    let aiResponseText = systemPrompt;

    return NextResponse.json({
      id: "chatcmpl-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "personalizada",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: aiResponseText
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
            content: "Ocurrió un error al cargar la configuración de Tacos Luis."
          },
          finish_reason: "stop"
        }
      ]
    });
  }
}