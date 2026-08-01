import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Validación de seguridad para que solo Vercel pueda ejecutar este endpoint
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 })
  }

  // Cliente de Supabase con permisos de administrador (Service Role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ejecutamos la función de limpieza que creamos en Supabase
  const { error } = await supabase.rpc('limpiar_pedidos_antiguos')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Historial antiguo depurado correctamente.' })
}