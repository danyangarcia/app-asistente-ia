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

  // ESTADOS PARA EL MODAL DE SETTINGS, "Cuenta Activa" Y TEMA VISUAL
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [cuentaActiva, setCuentaActiva] = useState<boolean>(true)
  const [updatingCuenta, setUpdatingCuenta] = useState(false)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')

  const supabase = createClient()

  // PERSISTENCIA DEL TEMA EN LOCALSTORAGE
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
    if (savedTheme) {
      setThemeMode(savedTheme)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(nextTheme)
    localStorage.setItem('dashboard_theme', nextTheme)
  }

  // VARIABLES DINÁMICAS DE COLOR SEGÚN TEMA
  const isDark = themeMode === 'dark'
  const bgColor = isDark ? '#080808' : '#F4F4F5'
  const textColor = isDark ? '#FFFFFF' : '#09090B'
  const subTextColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.45)'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const modalBg = isDark ? '#121216' : '#FFFFFF'
  const modalBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'

  useEffect(() => {
    async function fetchLayoutData() {
      if (!slug) return
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('enlace del panel', slug)
        .single()

      if (data) {
        setBusiness(data)
        if (typeof data['Cuenta Activa'] === 'boolean') {
          setCuentaActiva(data['Cuenta Activa'])
        }
      } else {
        console.error('Error al cargar negocio en layout:', error)
      }
    }
    fetchLayoutData()
  }, [slug, supabase])

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 2800)
    return () => clearTimeout(timer)
  }, [])

  const toggleCuentaActiva = async () => {
    if (!slug) return
    const nuevoEstado = !cuentaActiva
    
    setCuentaActiva(nuevoEstado)
    setUpdatingCuenta(true)

    const { error } = await supabase
      .from('businesses')
      .update({ 'Cuenta Activa': nuevoEstado })
      .eq('enlace del panel', slug)

    if (error) {
      console.error('Error al actualizar Cuenta Activa:', error)
      setCuentaActiva(!nuevoEstado)
    }

    setUpdatingCuenta(false)
  }

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

  const config = useMemo(() => {
    return { 
      leftLabel: 'Catálogo / Oferta', 
      leftPath: `/dashboard/${slug}/catalog`,
      panelName: 'Tablero Operativo', 
      mainPath: `/dashboard/${slug}/board`
    }
  }, [slug])

  const rightPath = `/dashboard/${slug}/metrics`

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
        background: bgColor,
        color: textColor,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      <LoadingScreen businessName={businessName} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse 700px 500px at ${lightX}% ${lightY}%, ${isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.018)'} 0%, transparent 70%)`,
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
            style={{ position: 'fixed', inset: 0, background: bgColor, zIndex: 98 }}
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
              background: isLeftActive ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)') : cardBg,
              border: `1px solid ${hovering === 'leftBtn' || isLeftActive ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : cardBorder}`,
              borderRadius: '100px', padding: '0.9rem 2.5rem', color: textColor, fontSize: '0.78rem',
              fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              boxShadow: hovering === 'leftBtn' ? '0 0 25px rgba(0,0,0,0.06), 0 15px 35px rgba(0,0,0,0.1)' : '0 8px 25px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <motion.div
              animate={{ opacity: hovering === 'leftBtn' ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}, transparent)` }}
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
                letterSpacing: '0.15em', margin: 0, lineHeight: 1, color: textColor,
                textShadow: isDark 
                  ? `0 1px 0 rgba(255,255,255,0.25), 0 2px 0 rgba(180,180,180,0.15), 0 4px 0 rgba(120,120,120,0.1), 0 8px 0 rgba(80,80,80,0.08), 0 16px 40px rgba(0,0,0,0.9)` 
                  : `0 1px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)`
              }}>
                {businessName}
              </h1>
              <p style={{
                fontSize: '0.65rem', letterSpacing: '0.4em', color: subTextColor,
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
              background: isRightActive ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)') : cardBg,
              border: `1px solid ${hovering === 'rightBtn' || isRightActive ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : cardBorder}`,
              borderRadius: '100px', padding: '0.9rem 2.5rem', color: textColor, fontSize: '0.78rem',
              fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              boxShadow: hovering === 'rightBtn' ? '0 0 25px rgba(0,0,0,0.06), 0 15px 35px rgba(0,0,0,0.1)' : '0 8px 25px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <motion.div
              animate={{ opacity: hovering === 'rightBtn' ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}, transparent)` }}
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

      {/* BOTÓN FLOTANTE CONFIGURACIÓN */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 99 }}>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: isDark ? 'rgba(20, 20, 25, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}`,
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColor,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
          title="Configuración del Negocio"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </motion.button>
      </div>

      {/* MODAL DE CONFIGURACIÓN */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: modalBg,
                border: `1px solid ${modalBorder}`,
                borderRadius: '16px',
                padding: '1.8rem',
                width: '100%',
                maxWidth: '420px',
                position: 'relative',
                boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.8)' : '0 20px 40px rgba(0,0,0,0.15)',
                color: textColor
              }}
            >
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  position: 'absolute', top: '1.2rem', right: '1.2rem',
                  background: 'transparent', border: 'none', color: subTextColor,
                  fontSize: '1.2rem', cursor: 'pointer'
                }}
              >
                ✕
              </button>

              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.2rem', fontWeight: 700 }}>
                ⚙️ Ajustes del Negocio
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.75rem', color: subTextColor }}>
                Administra la disponibilidad y la apariencia visual del panel.
              </p>

              {/* OPCIÓN 1: ESTADO DE LA CUENTA */}
              <div style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Estado de la Cuenta</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: subTextColor }}>
                    {cuentaActiva ? 'Atendiendo pedidos' : 'Cerrado temporalmente'}
                  </p>
                </div>

                <button
                  onClick={toggleCuentaActiva}
                  disabled={updatingCuenta}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: cuentaActiva ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(244,63,94,0.4)',
                    background: cuentaActiva ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: cuentaActiva ? '#34d399' : '#fb7185',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {updatingCuenta ? 'Guardando...' : cuentaActiva ? '● Abierto' : '○ Cerrado'}
                </button>
              </div>

              {/* OPCIÓN 2: ASPECTO VISUAL (TEMAS MONOCROMÁTICOS) */}
              <div style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Aspecto Visual</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: subTextColor }}>
                    Modo {isDark ? 'Oscuro (Negro)' : 'Claro (Blanco)'}
                  </p>
                </div>

                <button
                  onClick={toggleTheme}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    color: textColor,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isDark ? '🌙 Oscuro' : '☀️ Claro'}
                </button>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  marginTop: '1.5rem',
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: textColor,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}