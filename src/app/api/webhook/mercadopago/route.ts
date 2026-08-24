import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usamos el Service Role para interactuar con la BD de forma segura desde el backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Solo procesamos eventos de pago creado o actualizado
    if (type !== 'payment') {
      return NextResponse.json({ message: 'Evento no procesado' }, { status: 200 })
    }

    const paymentId = data.id

    // 1. Validar estado real del pago con Mercado Pago (Cero confianza al frontend)
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    })
    
    const paymentData = await mpResponse.json()

    // Si el pago no está aprobado, no hacemos nada
    if (paymentData.status !== 'approved') {
      return NextResponse.json({ message: 'Pago pendiente o rechazado' }, { status: 200 })
    }

    // 2. Extraer metadatos (Aquí enviaremos el ID del negocio y el tipo de pago desde el checkout)
    // Ejemplo de external_reference: "RECARGA_EMERGENCIA|40b75b05-bd37-4054-ab28-f4dbbcd2"
    const externalRef = paymentData.external_reference || ''
    const [paymentType, businessId] = externalRef.split('|')

    if (!businessId) {
      return NextResponse.json({ error: 'Falta ID del negocio' }, { status: 400 })
    }

    // 3. Procesar Paquete de Emergencia (100 min)
    if (paymentType === 'RECARGA_EMERGENCIA') {
      
      // Registrar el ingreso de minutos en el historial auditable
      const { error: ledgerError } = await supabaseAdmin
        .from('usage_ledger')
        .insert({
          business_id: businessId,
          transaction_type: 'EMERGENCY_TOP_UP',
          minutes_amount: 100,
          description: 'Paquete de emergencia 100 min por $450 MXN'
        })

      if (ledgerError) throw ledgerError

      // Reactivar la cuenta inmediatamente para que Vapi vuelva a funcionar
      // NOTA: Verifica que tu columna se llame exactamente 'Cuenta Activa' o 'cuenta_activa'
      const { error: updateError } = await supabaseAdmin
        .from('businesses')
        .update({ 'Cuenta Activa': true }) 
        .eq('id', businessId)

      if (updateError) throw updateError
    }

    // 4. (Aquí iría después la lógica para pago de MENSUALIDAD y Rollover)
    
    return NextResponse.json({ success: true, message: 'Pago procesado y cuenta reactivada' })

  } catch (error: any) {
    console.error('Error procesando webhook de MP:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}