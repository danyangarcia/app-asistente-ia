export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-10 px-6 py-16 sm:px-8">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">App de pedidos para restaurantes</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Controla pedidos de voz en tiempo real.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Un espacio multi-tenant para que cada restaurante reciba pedidos por llamada, gestione su menú y vea métricas simples desde tablet o celular.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Dashboard por negocio</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Cada restaurante tiene su propio dashboard aislado. Verás pedidos nuevos, cambios de estado y datos clave.
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Webhook para pedidos</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Una ruta protegida recibe pedidos desde el asistente de voz y los guarda automáticamente para el negocio correcto.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
