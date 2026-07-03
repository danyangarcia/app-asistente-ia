# App de Pedidos para Restaurantes

Proyecto base de una app multi-tenant para restaurantes construida con Next.js App Router, Tailwind CSS y Supabase.

## Estructura inicial

- `/src/app/page.tsx`: landing page inicial.
- `/src/app/admin/page.tsx`: panel de super administrador.
- `/src/app/dashboard/[slug]/orders/page.tsx`: listado de pedidos.
- `/src/app/dashboard/[slug]/settings/page.tsx`: editor de menú y reportes.
- `/src/app/api/webhook/vapi/route.ts`: webhook para recibir pedidos desde el asistente de voz.
- `supabase-schema.sql`: esquema de tablas y políticas RLS para Supabase.

## Requisitos de entorno

Crea un archivo `.env.local` con estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
VAPI_WEBHOOK_SECRET=your-secret-value
```

## Supabase

1. Crea el proyecto en Supabase.
2. Copia el contenido de `supabase-schema.sql` en SQL Editor y ejecútalo.
3. Configura autenticación con email y contraseña.
4. Asegúrate de incluir `business_id` en los JWT claims para RLS.

## Webhook VAPI

La ruta del webhook es:

```
POST /api/webhook/vapi
```

Headers:

- `x-webhook-secret`: debe coincidir con `VAPI_WEBHOOK_SECRET`

Payload esperado:

```json
{
  "business_phone": "+526371234567",
  "customer_phone": "+526379998888",
  "order_type": "pickup",
  "items": [{ "name": "Taco de cabeza", "quantity": 3, "customizations": "tortilla de harina" }],
  "total_amount": 159,
  "call_id": "abc123"
}
```

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Siguientes pasos

- Implementar autenticación con Supabase Auth.
- Agregar edición real de menú y pedidos desde UI.
- Habilitar tiempo real con Supabase Realtime.
- Mejorar el panel admin con métricas reales.
