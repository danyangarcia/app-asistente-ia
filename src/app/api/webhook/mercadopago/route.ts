import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServerAdmin'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id')

    if (paymentId) {
      // 1. Consultar detalles del pago a MercadoPago
      const resMP = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      })
      const paymentData = await resMP.json()

      if (paymentData.status === 'approved') {
        const slug = paymentData.external_reference
        const lastFour = paymentData.card?.last_four_digits || '4242'
        const cardBrand = paymentData.payment_method_id?.toUpperCase() || 'VISA'

        // 2. Buscar el ID del negocio por el slug
        const { data: business } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('enlace_del_panel', slug)
          .single()

        if (business) {
          const proximaFecha = new Date()
          proximaFecha.setMonth(proximaFecha.getMonth() + 1)

          // 3. Actualizar suscripción
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'Activa',
              current_period_end: proximaFecha.toISOString(),
              card_last_four: lastFour,
              card_brand: cardBrand
            })
            .eq('business_id', business.id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error en webhook de MercadoPago:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}