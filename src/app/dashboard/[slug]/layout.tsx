'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import LoadingScreen from '@/components/LoadingScreen'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const slug = pathname.split('/')[2]
  const businessName = slug?.replace(/-/g, ' ').toUpperCase() || 'NEGOCIO'
  const [clicking, setClicking] = useState<string | null>(null)

  const handleNav = (path: string, btn: string) => {
    setClicking(btn)
    setTimeout(() => {
      setClicking(null)
      router.push(path)
    }, 150)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <LoadingScreen businessName={businessName} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2rem 3rem',
        position: 'relative'
      }}>

        {/* Botón Pedidos - izquierda */}
        <motion.button
          animate={{
            y: clicking === 'orders' ? 4 : 0,
            scale: clicking === 'orders' ? 0.95 : 1
          }}
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ duration: 0.15 }}
          onClick={() => handleNav(`/dashboard/${slug}/orders`, 'orders')}
          style={{
            background: pathname.includes('/orders')
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '100px',
            padding: '0.75rem 2rem',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: pathname.includes('/orders')
              ? '0 0 20px rgba(255,255,255,0.1)'
              : 'none'
          }}
        >
          📦 Pedidos
        </motion.button>

        {/* Nombre del negocio - centro */}
        <h1 style={{
          fontSize: 'clamp(1.2rem, 3vw, 2.5rem)',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          textAlign: 'center',
          margin: 0,
          textShadow: `
            0px 1px 0px #555,
            0px 2px 0px #444,
            0px 3px 0px #333,
            0px 4px 0px #222,
            0px 5px 10px rgba(0,0,0,0.5),
            0px 10px 20px rgba(0,0,0,0.3)
          `
        }}>
          {businessName}
        </h1>

        {/* Botón Menú - derecha */}
        <motion.button
          animate={{
            y: clicking === 'settings' ? 4 : 0,
            scale: clicking === 'settings' ? 0.95 : 1
          }}
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ duration: 0.15 }}
          onClick={() => handleNav(`/dashboard/${slug}/settings`, 'settings')}
          style={{
            background: pathname.includes('/settings')
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '100px',
            padding: '0.75rem 2rem',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: pathname.includes('/settings')
              ? '0 0 20px rgba(255,255,255,0.1)'
              : 'none'
          }}
        >
          🍽️ Menú y datos
        </motion.button>
      </div>

      {/* Contenido con transición */}
      <motion.div
        key={pathname}
        initial={{
          x: pathname.includes('/orders') ? -60 : 60,
          opacity: 0
        }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ padding: '0 3rem 3rem' }}
      >
        {children}
      </motion.div>
    </div>
  )
}