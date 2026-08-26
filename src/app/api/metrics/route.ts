import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const emptyMetrics = {
  includedMinutes: 0,
  rolloverMinutes: 0,
  bonusMinutes: 0,
  usedMinutes: 0,
  totalMinutes: 0,
  availableMinutes: 0,
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawParam = searchParams.get('business_slug')

    if (!rawParam) {
      return NextResponse.json({ error: 'business_slug es requerido' }, { status: 400 })
    }

    const businessSlug = decodeURIComponent(rawParam).trim()
    let { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('"enlace del panel"', businessSlug)
      .maybeSingle()

    if (!business) {
      const { data: businessById } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessSlug)
        .maybeSingle()
      business = businessById
    }

    if (!business) {
      return NextResponse.json({
        subscription: null,
        plan: null,
        period: null,
        metrics: emptyMetrics,
        error: 'Negocio no encontrado',
      })
    }

    const businessId = business.id
    const [{ data: subscription }, { data: period }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_start, current_period_end')
        .eq('business_id', businessId)
        .maybeSingle(),
      supabase
        .from('billing_periods')
        .select('id, included_minutes, rollover_minutes, bonus_minutes, start_date, end_date')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const { data: plan } = subscription?.plan_id
      ? await supabase
          .from('plans')
          .select('id, name, price_mxn, included_minutes')
          .eq('id', subscription.plan_id)
          .maybeSingle()
      : { data: null }

    const { data: ledger } = period?.id
      ? await supabase
          .from('usage_ledger')
          .select('amount')
          .eq('billing_period_id', period.id)
      : { data: [] }

    const includedMinutes = Number(period?.included_minutes) || 0
    const rolloverMinutes = Number(period?.rollover_minutes) || 0
    const bonusMinutes = Number(period?.bonus_minutes) || 0
    const usedMinutes = (ledger || [])
      .filter((entry) => Number(entry.amount) < 0)
      .reduce((total, entry) => total + Math.abs(Number(entry.amount)), 0)
    const totalMinutes = includedMinutes + rolloverMinutes + bonusMinutes

    return NextResponse.json({
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            priceMxn: Number(plan.price_mxn),
            includedMinutes: Number(plan.included_minutes),
          }
        : null,
      period: period
        ? {
            id: period.id,
            startDate: period.start_date,
            endDate: period.end_date,
          }
        : null,
      metrics: {
        includedMinutes,
        rolloverMinutes,
        bonusMinutes,
        usedMinutes,
        totalMinutes,
        availableMinutes: Math.max(0, totalMinutes - usedMinutes),
      },
    })
  } catch (error) {
    console.error('Error en API /api/metrics:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
