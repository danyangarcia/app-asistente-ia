import type { Metadata } from 'next'
import './globals.css'
import Cursor from '@/components/Cursor'

export const metadata: Metadata = {
  title: 'Sistema de Pedidos',
  description: 'Sistema premium de pedidos con IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Cursor />
        {children}
      </body>
    </html>
  )
}