export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Super administrador</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Panel de administración</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Aquí podrás gestionar negocios, ver métricas y activar o desactivar accesos.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-100 p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Negocios</h2>
          <p className="mt-2 text-sm text-zinc-600">Lista los restaurantes disponibles y ve su estado activo.</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-zinc-100 p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Métricas rápidas</h2>
          <p className="mt-2 text-sm text-zinc-600">Número de pedidos, llamadas y ventas totales por negocio.</p>
        </div>
      </div>
    </div>
  );
}
