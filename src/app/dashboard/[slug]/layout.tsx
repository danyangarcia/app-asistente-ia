'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from '@/components/LoadingScreen'
import { createClient } from '@/lib/supabaseClient'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const slug = pathname.split('/')[2]
  
  const [business, setBusiness] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const [hovering, setHovering] = useState<'leftBtn' | 'rightBtn' | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchLayoutData() {
      if (!slug) return
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('enlace del panel', slug)
        .single()

      if (data) setBusiness(data)
      else console.error('Error al cargar negocio en layout:', error)
    }
    fetchLayoutData()
  }, [slug, supabase])

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 2800)
    return () => clearTimeout(timer)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouse({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight
    })
  }

  const navigate = (path: string, dir: 'left' | 'right') => {
    if (pathname === path) return
    setLeaving(dir)
    setTimeout(() => {
      setLeaving(null)
      router.push(path)
    }, 500)
  }

  // === RUTAS UNIFICADAS Y MULTI-NEGOCIO ===
  const config = useMemo(() => {
    return { 
      leftLabel: 'Catálogo / Oferta', 
      leftPath: `/dashboard/${slug}/catalog`,
      panelName: 'Tablero Operativo', 
      mainPath: `/dashboard/${slug}/board`
    }
  }, [slug])

  const rightPath = `/dashboard/${slug}/metrics`

  // Redirección Automática si entra a la raíz del panel (ej. /dashboard/prueba)
  useEffect(() => {
    if (pathname === `/dashboard/${slug}` && loaded) {
      router.replace(config.mainPath)
    }
  }, [pathname, slug, router, config.mainPath, loaded])

  const businessName = business?.['Nombre del negocio'] || business?.name || slug?.replace(/-/g, ' ').toUpperCase() || 'NEGOCIO'
  const rotX = (mouse.y - 0.5) * 8
  const rotY = (mouse.x - 0.5) * -8
  const lightX = mouse.x * 100
  const lightY = mouse.y * 100

  const isLeftActive = pathname.includes('catalog')
  const isRightActive = pathname.includes('metrics')

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <LoadingScreen businessName={businessName} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse 700px 500px at ${lightX}% ${lightY}%, rgba(255,255,255,0.018) 0%, transparent 70%)`,
        pointerEvents: 'none', transition: 'background 0.08s linear'
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px', pointerEvents: 'none'
      }} />

      <AnimatePresence>
        {leaving && (
          <motion.div
            initial={{ x: leaving === 'left' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
            style={{ position: 'fixed', inset: 0, background: '#080808', zIndex: 98 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2.5rem 5rem',
        }}>

          {/* BOTÓN IZQUIERDO (CATÁLOGO) */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onHoverStart={() => setHovering('leftBtn')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -6, scale: 1.04 }}
            whileTap={{ y: 3, scale: 0.95 }}
            onClick={() => navigate(config.leftPath, 'left')}
            style={{
              background: isLeftActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hovering === 'leftBtn' || isLeftActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '100px', padding: '0.9rem 2.5rem', color: '#fff', fontSize: '0.78rem',
              fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              boxShadow: hovering === 'leftBtn' ? '0 0 25px rgba(255,255,255,0.06), 0 15px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 8px 25px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <motion.div
              animate={{ opacity: hovering === 'leftBtn' ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>{config.leftLabel}</span>
          </motion.button>

          {/* NOMBRE Y SUBTÍTULO (CENTRO) */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ perspective: '1200px', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate(config.mainPath, 'left')}
          >
            <motion.div
              animate={{ rotateX: rotX, rotateY: rotY }}
              transition={{ type: 'spring', stiffness: 70, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <h1 style={{
                fontSize: 'clamp(1.8rem, 4vw, 3.8rem)', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.15em', margin: 0, lineHeight: 1, color: '#ffffff',
                textShadow: `0 1px 0 rgba(255,255,255,0.25), 0 2px 0 rgba(180,180,180,0.15), 0 4px 0 rgba(120,120,120,0.1), 0 8px 0 rgba(80,80,80,0.08), 0 16px 40px rgba(0,0,0,0.9), 0 0 60px rgba(255,255,255,0.03)`
              }}>
                {businessName}
              </h1>
              <p style={{
                fontSize: '0.65rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', marginTop: '0.8rem', fontWeight: 600
              }}>
                {config.panelName}
              </p>
            </motion.div>
          </motion.div>

          {/* BOTÓN DERECHO (MÉTRICAS) */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onHoverStart={() => setHovering('rightBtn')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -6, scale: 1.04 }}
            whileTap={{ y: 3, scale: 0.95 }}
            onClick={() => navigate(rightPath, 'right')}
            style={{
              background: isRightActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hovering === 'rightBtn' || isRightActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '100px', padding: '0.9rem 2.5rem', color: '#fff', fontSize: '0.78rem',
              fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              boxShadow: hovering === 'rightBtn' ? '0 0 25px rgba(255,255,255,0.06), 0 15px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 8px 25px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <motion.div
              animate={{ opacity: hovering === 'rightBtn' ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Métricas</span>
          </motion.button>
        </div>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: leaving === 'left' ? -30 : 30, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ padding: '0 5rem 5rem' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  )
}