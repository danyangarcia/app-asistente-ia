import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { message } = payload;

    // 1. Filtrar solo reportes de fin de llamada
    if (!message || message.type !== 'end-of-call-report') {
      return NextResponse.json({ message: 'Evento ignorado' }, { status: 200 });
    }

    const { call, durationSeconds } = message;
    const vapiCallId = call?.id;

    // Obtener slug/ID desde metadata de la llamada O directamente de los query params de la URL
    const url = new URL(req.url);
    const urlSlug = url.searchParams.get('business_slug');

    const businessId = call?.metadata?.business_id;
    const businessSlug = call?.metadata?.business_slug || urlSlug;

    if (!vapiCallId) {
      return NextResponse.json({ error: 'Falta vapi_call_id' }, { status: 400 });
    }

    // 2. Identificar la empresa por ID o por Slug (ej. 'tacos-luis')
    let targetBusinessId = businessId;

    if (!targetBusinessId && businessSlug) {
      const { data: busData } = await supabase
        .from('businesses')
        .select('id')
        .eq('enlace del panel', businessSlug)
        .single();
      
      if (busData) targetBusinessId = busData.id;
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'No se identificó la empresa' }, { status: 400 });
    }

    const seconds = durationSeconds || 0;
    const minutes = Math.ceil(seconds / 60); // Redondeo hacia arriba al minuto más cercano

    // 3. Registrar llamada en vapi_calls_log (Evita duplicados por la llave vapi_call_id)
    const estimatedCost = (minutes * 0.09).toFixed(4);
    const { error: logError } = await supabase.from('vapi_calls_log').insert({
      business_id: targetBusinessId,
      vapi_call_id: vapiCallId,
      duration_seconds: seconds,
      duration_minutes: minutes,
      status: message.endedReason || 'ended',
      started_at: call?.startedAt,
      ended_at: call?.endedAt,
      cost_estimated: estimatedCost,
    });

    // Si la llamada ya se procesó previamente, respondemos 200 OK para no duplicar consumos
    if (logError && logError.code === '23505') {
      return NextResponse.json({ message: 'Llamada procesada previamente' }, { status: 200 });
    }

    if (logError) {
      console.error('Error al registrar vapi_calls_log:', logError);
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Si no consumió tiempo (0 seg), finalizamos
    if (minutes === 0) {
      return NextResponse.json({ success: true, minutesDeducted: 0 });
    }

    // 4. Buscar el periodo de facturación activo
    const { data: period } = await supabase
      .from('billing_periods')
      .select('*')
      .eq('business_id', targetBusinessId)
      .eq('is_active', true)
      .single();

    const billingPeriodId = period?.id || null;

    // 5. Calcular saldos acumulados en usage_ledger
    const { data: ledgerEntries } = await supabase
      .from('usage_ledger')
      .select('credit_type, amount')
      .eq('business_id', targetBusinessId);

    const balances = { BONUS: 0, ROLLOVER: 0, INCLUDED: 0 };
    (ledgerEntries || []).forEach(entry => {
      if (entry.credit_type in balances) {
        balances[entry.credit_type as keyof typeof balances] += Number(entry.amount);
      }
    });

    let remainingToDeduct = minutes;
    const ledgerInserts = [];

    // Prioridad 1: Gastar saldo BONUS
    if (remainingToDeduct > 0 && balances.BONUS > 0) {
      const deduct = Math.min(remainingToDeduct, balances.BONUS);
      ledgerInserts.push({
        business_id: targetBusinessId,
        billing_period_id: billingPeriodId,
        type: 'CALL_USAGE',
        credit_type: 'BONUS',
        amount: -deduct,
        description: `Llamada Vapi (${vapiCallId}) - Saldo Bonus`,
        reference_id: `${vapiCallId}_BONUS`
      });
      remainingToDeduct -= deduct;
    }

    // Prioridad 2: Gastar saldo ROLLOVER
    if (remainingToDeduct > 0 && balances.ROLLOVER > 0) {
      const deduct = Math.min(remainingToDeduct, balances.ROLLOVER);
      ledgerInserts.push({
        business_id: targetBusinessId,
        billing_period_id: billingPeriodId,
        type: 'CALL_USAGE',
        credit_type: 'ROLLOVER',
        amount: -deduct,
        description: `Llamada Vapi (${vapiCallId}) - Saldo Acumulado`,
        reference_id: `${vapiCallId}_ROLLOVER`
      });
      remainingToDeduct -= deduct;
    }

    // Prioridad 3: Gastar saldo INCLUDED del plan
    if (remainingToDeduct > 0 && balances.INCLUDED > 0) {
      const deduct = Math.min(remainingToDeduct, balances.INCLUDED);
      ledgerInserts.push({
        business_id: targetBusinessId,
        billing_period_id: billingPeriodId,
        type: 'CALL_USAGE',
        credit_type: 'INCLUDED',
        amount: -deduct,
        description: `Llamada Vapi (${vapiCallId}) - Minutos Plan`,
        reference_id: `${vapiCallId}_INCLUDED`
      });
      remainingToDeduct -= deduct;
    }

    // Prioridad 4: Registrar EXCEDENTE (Overage)
    if (remainingToDeduct > 0) {
      ledgerInserts.push({
        business_id: targetBusinessId,
        billing_period_id: billingPeriodId,
        type: 'CALL_USAGE',
        credit_type: 'OVERAGE',
        amount: -remainingToDeduct,
        description: `Llamada Vapi (${vapiCallId}) - Excedente`,
        reference_id: `${vapiCallId}_OVERAGE`
      });
    }

    // Insertar movimientos en el libro contable
    if (ledgerInserts.length > 0) {
      await supabase.from('usage_ledger').insert(ledgerInserts);
    }

    return NextResponse.json({ 
      success: true, 
      vapiCallId, 
      minutesDeducted: minutes 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}