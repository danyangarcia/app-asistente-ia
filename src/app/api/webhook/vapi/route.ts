import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const payload = await request.json();

  // FILTRO INTELIGENTE:
  // Si Vapi pregunta por el "assistant" (inicio de llamada), le damos el prompt.
  // Si Vapi manda un evento de "end-of-call-report", guardamos el pedido.

  // 1. ¿Es solicitud de configuración inicial?
  if (payload.type === "assistant-request") {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("prompt_config")
      .eq("enlace del panel", "tacos-luis")
      .single();

    return NextResponse.json({
      assistant: {
        model: {
          messages: [{ role: "system", content: business?.prompt_config || "Eres Gaby." }]
        }
      }
    });
  }

  // 2. ¿Es el reporte de fin de llamada? (Aquí guardamos el pedido)
  if (payload.message?.type === "end-of-call-report") {
    // Aquí va TU lógica original para guardar el pedido en Supabase
    // ... (tu código de .from("orders").insert(...) )
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}