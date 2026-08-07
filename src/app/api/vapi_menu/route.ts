import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Configura la conexión con tus llaves de Supabase
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // El slug del negocio que quieres consultar (puedes ajustarlo o dejarlo fijo)
  const businessSlug = "tacos-luis"; 

  // Consulta solo los productos activos de ese negocio
  const { data: items, error } = await supabaseAdmin
    .from("catalog_items")
    .select("nombre, categoria, precio")
    .eq("business_slug", businessSlug)
    .eq("disponible", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Esto es lo que la IA "leerá" para saber qué ofrecer
  return NextResponse.json({ 
    message: "Menu de Tacos Luis",
    items: items 
  }, { status: 200 });
}