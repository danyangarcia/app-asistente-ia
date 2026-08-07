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

    // Consultamos el menú y prompt directamente en Supabase para Tacos Luis
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", prompt_config')
      .eq("enlace del panel", "tacos-luis")
      .single();

    let systemPrompt = "Eres Gaby, la asistente virtual de Tacos Luis.";
    if (!error && business && business.prompt_config) {
      systemPrompt = business.prompt_config;
    }

    // Insertamos el prompt de Supabase al principio del historial que manda Vapi
    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // Llamada opcional a un proveedor externo (como OpenAI/Anthropic) o respondemos directo
    // Como Vapi Custom LLM espera que el servidor actúe como el modelo, 
    // le devolvemos una respuesta simulada o conectada al LLM real.
    // Si quieres que responda directo con el texto del prompt en el primer saludo:
    
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
            content: "Hola, gracias por llamar a Tacos Luis. ¿En qué te puedo ayudar el día de hoy?"
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
            content: "Ocurrió un error al procesar tu solicitud."
          },
          finish_reason: "stop"
        }
      ]
    });
  }
}