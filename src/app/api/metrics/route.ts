import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParam = searchParams.get('business_slug');

    if (!rawParam) {
      return NextResponse.json({ error: 'business_slug es requerido' }, { status: 400 });
    }

    const cleanParam = decodeURIComponent(rawParam).trim();

    // 1. Buscar en la columna "enlace del panel" (entre comillas por los espacios)
    let { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('"enlace del panel"', cleanParam)
      .maybeSingle();

    // Fallback: si no lo halla por enlace, buscar por ID UUID
    if (!business) {
      const { data: businessById } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', cleanParam)
        .maybeSingle();

      business = businessById;
    }

    if (!business) {
      return NextResponse.json({
        metrics: {
          totalAvailableMinutes: 0,
          usedMinutes: 0,
          balances: { included: 0, rollover: 0, bonus: 0 }
        },
        recentCalls: [],
        error: 'Negocio no encontrado'
      });
    }

    const businessId = business.id;

    // 2. Obtener periodo de facturación activo del negocio
    const { data: period } = await supabase
      .from('billing_periods')
      .select('id, included_minutes, rollover_minutes, bonus_minutes')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle();

    // 3. Obtener llamadas de Vapi
    const { data: recentCalls } = await supabase
      .from('vapi_calls_log')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Calcular consumo y disponibilidad en el Ledger
    let usedMinutes = 0;
    let availableMinutes = 0;

    const included = Number(period?.included_minutes) || 0;
    const rollover = Number(period?.rollover_minutes) || 0;
    const bonus = Number(period?.bonus_minutes) || 0;

    if (period?.id) {
      const { data: ledger } = await supabase
        .from('usage_ledger')
        .select('amount, type')
        .eq('billing_period_id', period.id);

      if (ledger && ledger.length > 0) {
        const netLedger = ledger.reduce((acc, curr) => acc + Number(curr.amount), 0);

        usedMinutes = ledger
          .filter(u => Number(u.amount) < 0 || u.type === 'CALL_USAGE')
          .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);

        availableMinutes = Math.max(0, netLedger);
      } else {
        availableMinutes = included + rollover + bonus;
      }
    }

    return NextResponse.json({
      metrics: {
        totalAvailableMinutes: availableMinutes,
        usedMinutes: usedMinutes,
        balances: {
          included,
          rollover,
          bonus
        }
      },
      recentCalls: recentCalls || []
    });

  } catch (error: any) {
    console.error('Error en API /api/metrics:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}