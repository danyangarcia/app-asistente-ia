'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from '@/components/LoadingScreen'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const slug = pathname.split('/')[2]
  const businessName = slug?.replace(/-/g, ' ').toUpperCase() || 'NEGOCIO'
  const [loaded, setLoaded] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const [hovering, setHovering] = useState<'orders' | 'settings' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 2800)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    setMouse({ x, y })
  }

  const navigate = (path: string, dir: 'left' | 'right') => {
    setLeaving(dir)
    setTimeout(() => {
      setLeaving(null)
      router.push(path)
    }, 500)
  }

  const rotX = (mouse.y - 0.5) * 10
  const rotY = (mouse.x - 0.5) * -10
  const lightX = mouse.x * 100
  const lightY = mouse.y * 100

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh',
        background: '#040404',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <LoadingScreen businessName={businessName} />

      {/* Luz dinámica que sigue el mouse */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: `radial-gradient(ellipse 600px 600px at ${lightX}% ${lightY}%, rgba(255,255,255,0.025) 0%, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'background 0.05s linear'
      }} />

      {/* Grid de fondo sutil */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none'
      }} />

      {/* Transición de salida */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            initial={{ x: leaving === 'left' ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            style={{
              position: 'fixed', inset: 0,
              background: '#040404',
              zIndex: 98
            }}
          />
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2.5rem 5rem',
          position: 'relative'
        }}>

          {/* Botón Pedidos */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            onHoverStart={() => setHovering('orders')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -8, scale: 1.05 }}
            whileTap={{ y: 4, scale: 0.94 }}
            onClick={() => navigate(`/dashboard/${slug}/orders`, 'left')}
            style={{
              background: hovering === 'orders'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hovering === 'orders' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '100px',
              padding: '1rem 2.5rem',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: hovering === 'orders'
                ? '0 0 30px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Luz interior top */}
            <motion.div
              animate={{ opacity: hovering === 'orders' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                top: 0, left: '10%', right: '10%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                borderRadius: '100px'
              }}
            />
            {/* Glow detrás */}
            <motion.div
              animate={{ opacity: hovering === 'orders' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 50% -20%, rgba(255,255,255,0.12) 0%, transparent 70%)',
                borderRadius: '100px'
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Pedidos</span>
          </motion.button>

          {/* Nombre 3D */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ perspective: '1200px', textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotateX: rotX, rotateY: rotY }}
              transition={{ type: 'spring', stiffness: 80, damping: 25 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.h1
                animate={{
                  textShadow: [
                    `${rotY * 0.5}px ${-rotX * 0.5}px 0px rgba(255,255,255,0.15), 0 10px 30px rgba(0,0,0,0.8)`,
                    `${rotY * 0.5}px ${-rotX * 0.5}px 0px rgba(255,255,255,0.25), 0 10px 30px rgba(0,0,0,0.8)`,
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                  fontSize: 'clamp(1.8rem, 4vw, 4rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  margin: 0,
                  lineHeight: 1,
                  color: '#ffffff',
                  textShadow: `
                    0 1px 0 rgba(255,255,255,0.3),
                    0 2px 0 rgba(200,200,200,0.2),
                    0 4px 0 rgba(150,150,150,0.15),
                    0 8px 0 rgba(100,100,100,0.1),
                    0 16px 40px rgba(0,0,0,0.9)
                  `
                }}
              >
                {businessName}
              </motion.h1>
              <p style={{
                fontSize: '0.6rem',
                letterSpacing: '0.5em',
                color: 'rgba(255,255,255,0.15)',
                textTransform: 'uppercase',
                marginTop: '0.75rem',
                margin: '0.75rem 0 0'
              }}>
                Sistema de pedidos
              </p>
            </motion.div>
          </motion.div>

          {/* Botón Menú */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            onHoverStart={() => setHovering('settings')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -8, scale: 1.05 }}
            whileTap={{ y: 4, scale: 0.94 }}
            onClick={() => navigate(`/dashboard/${slug}/settings`, 'right')}
            style={{
              background: hovering === 'settings'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hovering === 'settings' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '100px',
              padding: '1rem 2.5rem',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: hovering === 'settings'
                ? '0 0 30px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <motion.div
              animate={{ opacity: hovering === 'settings' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                top: 0, left: '10%', right: '10%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                borderRadius: '100px'
              }}
            />
            <motion.div
              animate={{ opacity: hovering === 'settings' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 50% -20%, rgba(255,255,255,0.12) 0%, transparent 70%)',
                borderRadius: '100px'
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Menu y datos</span>
          </motion.button>
        </div>

        {/* Contenido */}
        <motion.div
          key={pathname}
          initial={{
            opacity: 0,
            x: pathname.includes('/orders') ? -40 : 40,
            filter: 'blur(8px)'
          }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ padding: '0 5rem 5rem' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  )
}