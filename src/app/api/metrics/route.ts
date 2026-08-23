import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usar Service Role Key para saltar políticas RLS en lecturas de backend, o Anon Key de fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessSlug = searchParams.get('business_slug');

    if (!businessSlug) {
      return NextResponse.json({ error: 'business_slug es requerido' }, { status: 400 });
    }

    // 1. Buscar negocio (por slug o coincidencia en enlace)
    let { data: business } = await supabase
      .from('businesses')
      .select('id')
      .ilike('enlace del panel', `%${businessSlug}%`)
      .maybeSingle();

    // Fallback: intentar por ID si no encuentra por texto
    if (!business) {
      const { data: businessById } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessSlug)
        .maybeSingle();
      business = businessById;
    }

    if (!business) {
      return NextResponse.json({ availableMinutes: 0, includedMinutes: 0, consumedMinutes: 0, error: 'Negocio no encontrado' });
    }

    // 2. Buscar periodo activo
    const { data: period } = await supabase
      .from('billing_periods')
      .select('id, included_minutes')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!period) {
      return NextResponse.json({ availableMinutes: 0, consumedMinutes: 0, includedMinutes: 0 });
    }

    // 3. Sumar movimientos del ledger
    const { data: ledger } = await supabase
      .from('usage_ledger')
      .select('amount')
      .eq('billing_period_id', period.id);

    const availableMinutes = ledger?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const includedMinutes = period.included_minutes || 0;

    return NextResponse.json({
      availableMinutes,
      includedMinutes,
      consumedMinutes: Math.max(0, includedMinutes - availableMinutes)
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}