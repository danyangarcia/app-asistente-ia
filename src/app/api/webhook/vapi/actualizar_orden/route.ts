import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const toolCall = body.message.toolCalls[0];
    const { business_slug, cliente_telefono, items, total } = toolCall.function.arguments;

    const { data, error } = await supabase
      .from('orders')
      .update({ 
        items, 
        total,
        updated_at: new Date().toISOString()
      })
      .eq('cliente_telefono', cliente_telefono)
      .eq('business_slug', business_slug)
      .eq('estado', 'pendiente');

    if (error) throw error;

    return NextResponse.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: "Orden actualizada con éxito."
        }
      ]
    });
  } catch (error: any) {
    console.error("Error al actualizar la orden:", error);
    return NextResponse.json(
      { error: "Error al actualizar la orden" },
      { status: 500 }
    );
  }
}