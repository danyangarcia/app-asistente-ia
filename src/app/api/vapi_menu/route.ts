import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);
  let businessSlug = searchParams.get("business_slug");

  // Si viene por POST (argumento de la tool de Vapi), lo atrapamos del body
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const args = body.message?.toolCalls?.[0]?.function?.arguments || body.args || {};
      if (args.business_slug) {
        businessSlug = args.business_slug;
      }
    } catch (e) {
      // Ignora si no hay JSON
    }
  }

  if (!businessSlug) {
    return NextResponse.json({ error: "Falta especificar el business_slug" }, { status: 400 });
  }

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