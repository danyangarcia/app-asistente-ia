import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Pedidos en tiempo real</p>
          <h2 className="text-3xl font-semibold text-zinc-950">Lista de pedidos</h2>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Nuevo pedido cuando llegue aparecerá aquí.
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid grid-cols-5 gap-4 border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-600 sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr]">
          <span>Hora</span>
          <span>Productos</span>
          <span>Tipo</span>
          <span>Cliente</span>
          <span>Estado</span>
        </div>
        <div className="divide-y divide-zinc-200">
          <div className="grid grid-cols-5 items-center gap-4 px-4 py-5 text-sm sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr]">
            <div>
              <p className="font-medium text-zinc-900">12:42</p>
              <p className="text-zinc-500">Ahora</p>
            </div>
            <div>
              <p className="font-medium text-zinc-900">Taco de cabeza ×3</p>
              <p className="text-zinc-500">sin cebolla</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600">
              Recoger
            </div>
            <div>
              <p className="font-medium text-zinc-900">Lucía</p>
              <p className="text-zinc-500">+52 637 ...</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white" href="#">
                En preparación
              </Link>
              <Link className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700" href="#">
                Listo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
