import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Vapi manda la info por POST, pero podemos leer el slug de la URL que le configuremos
    const { searchParams } = new URL(request.url);
    const businessSlug = searchParams.get("business_slug");

    if (!businessSlug) {
      return NextResponse.json({ error: "Falta el business_slug" }, { status: 400 });
    }

    // 1. Buscar el negocio y sus horarios en Supabase
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select("nombre, hora_apertura, hora_cierre")
      .eq("slug", businessSlug)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // 2. Obtener la hora actual exacta en Sonora (Caborca)
    // Esto te da un formato de 24 hrs tipo "14:30"
    const horaActualSonora = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Hermosillo", // Zona horaria de Sonora (sin horario de verano)
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    // 3. Validar si está abierto o cerrado
    const estaAbierto = horaActualSonora >= business.hora_apertura && horaActualSonora <= business.hora_cierre;

    // 4. Armar el prompt dependiendo del estado
    let promptDinamico = "";

    if (estaAbierto) {
      // AQUÍ VA EL PROMPT LARGO DE TOMAR PEDIDOS 
      promptDinamico = `Eres Gaby, una chica norteña de Caborca, Sonora, que trabaja en ${business.nombre}.
      Atiendes llamadas de forma natural, amable y rápida... 
      (Aquí pegas el resto de tu prompt normal de ventas, asegurándote de usar la URL de tu API de menú)`;
    } else {
      // AQUÍ VA EL PROMPT DE CERRADO
      promptDinamico = `Eres Gaby, trabajas en ${business.nombre}. 
      Actualmente el negocio ESTÁ CERRADO. Nuestro horario de atención es de ${business.hora_apertura} a ${business.hora_cierre}.
      Regla estricta:
      - Saluda amablemente.
      - Informa al cliente que en este momento el negocio está cerrado.
      - NO tomes ningún pedido bajo ninguna circunstancia.
      - Despídete cordialmente de forma rápida y natural.`;
    }

    // 5. Responderle a Vapi con el asistente actualizado
    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              role: "system",
              content: promptDinamico
            }
          ]
        }
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Error procesando la llamada" }, { status: 500 });
  }
}