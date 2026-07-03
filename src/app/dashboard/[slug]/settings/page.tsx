export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-100 p-6">
        <h2 className="text-2xl font-semibold text-zinc-950">Menú y datos</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Gestiona productos, precios y estado de disponibilidad desde aquí.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-zinc-950">Editor de menú</h3>
          <p className="mt-2 text-sm text-zinc-600">Agrega, edita y desactiva productos sin tocar código.</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="font-semibold text-zinc-900">Taco al pastor</p>
              <p className="text-sm text-zinc-600">$35 — Disponible</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="font-semibold text-zinc-900">Quesadilla</p>
              <p className="text-sm text-zinc-600">$45 — Desactivada</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-950">Historial de pedidos</h3>
            <p className="mt-2 text-sm text-zinc-600">Revisa pedidos anteriores y filtra por estado.</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-950">Reporte rápido</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-zinc-50 p-4 text-center">
                <p className="text-sm text-zinc-500">Llamadas</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">24</p>
              </div>
              <div className="rounded-3xl bg-zinc-50 p-4 text-center">
                <p className="text-sm text-zinc-500">Pedidos</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">56</p>
              </div>
              <div className="rounded-3xl bg-zinc-50 p-4 text-center">
                <p className="text-sm text-zinc-500">Total vendido</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">$4,120</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
