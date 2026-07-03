import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const navItems = [
  { href: "orders", label: "Pedidos" },
  { href: "settings", label: "Menú y datos" },
];

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const resolvedParams = await params;

  if (!resolvedParams.slug) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Negocio</p>
            <h1 className="text-2xl font-semibold">{resolvedParams.slug.replace(/-/g, " ")}</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`/dashboard/${resolvedParams.slug}/${item.href}`}
                className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium transition hover:bg-zinc-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
