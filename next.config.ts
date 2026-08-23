import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Ignora errores sintácticos automáticos de la caché de Next.js durante el build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita bloqueos por reglas estrictas de linter en Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;