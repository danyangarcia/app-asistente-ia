import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Atrapa el nombre del negocio directamente de la URL
  const { searchParams } = new URL(request.url);
  const businessSlug = searchParams.get("business_slug");

  // Si alguien entra sin decir de qué negocio es, marcamos error
  if (!businessSlug) {
    return NextResponse.json({ error: "Falta especificar el business_slug" }, { status: 400 });
  }

  // Busca los productos SOLO de ese negocio en específico
  const { data: items, error } = await supabaseAdmin
    .from("catalog_items")
    .select("nombre, categoria, precio")
    .eq("business_slug", businessSlug)
    .eq("disponible", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    message: `Menú de ${businessSlug}`,
    items: items 
  }, { status: 200 });
}