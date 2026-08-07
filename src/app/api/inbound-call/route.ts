import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscamos directamente el negocio en Supabase para asegurar que devuelva el menú
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select('"Nombre del negocio", prompt_config')
      .eq("enlace del panel", "tacos-luis")
      .single();

    if (error || !business) {
      return NextResponse.json({
        assistant: {
          model: {
            messages: [
              {
                role: "system",
                content: "Eres un asistente de Tacos Luis. Ocurrió un error al cargar la base de datos."
              }
            ]
          }
        }
      });
    }

    // Devolvemos el prompt configurado en Supabase directamente a Vapi
    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              role: "system",
              content: business.prompt_config || "Bienvenido a Tacos Luis."
            }
          ]
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              role: "system",
              content: "Error interno en el servidor al procesar la llamada."
            }
          ]
        }
      }
    });
  }
}