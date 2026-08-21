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
    const { business_slug, cliente_telefono, motivo } = toolCall.function.arguments;

    // Cambia el estado de la orden activa a 'cancelado'
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        estado: 'cancelado',
        notas_cancelacion: motivo || 'Cancelado por el cliente en llamada',
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
          result: "La orden ha sido cancelada exitosamente."
        }
      ]
    });
  } catch (error: any) {
    console.error("Error al cancelar la orden:", error);
    return NextResponse.json(
      { error: "No se pudo cancelar la orden" },
      { status: 500 }
    );
  }
}