'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from '@/components/LoadingScreen'
import { createClient } from '@/lib/supabaseClient'

// Instanciación única del cliente fuera del ciclo de renders
const supabase = createClient()

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Extracción limpia del slug
  const slug = useMemo(() => pathname.split('/')[2] || '', [pathname])

  const [business, setBusiness] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const [hovering, setHovering] = useState<'leftBtn' | 'rightBtn' | null>(null)

  // Estados del modal y configuraciones visuales
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [cuentaActiva, setCuentaActiva] = useState<boolean>(true)
  const [updatingCuenta, setUpdatingCuenta] = useState(false)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light')

  // Persistencia de tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
    if (savedTheme) {
      setThemeMode(savedTheme)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('dashboard_theme', nextTheme)
      return nextTheme
    })
  }, [])

  // Propiedades derivadas del tema con contraste mejorado para el Modo Claro
  const isDark = themeMode === 'dark'
  const themeStyles = useMemo(() => ({
    bgColor: isDark ? '#080808' : '#eef2f6', // Fondo ligeramente más frío y satinado en light
    textColor: isDark ? '#FFFFFF' : '#0f172a', // Texto slate-900 súper nítido
    subTextColor: isDark ? 'rgba(255,255,255,0.45)' : '#64748b', // Slate-500 suave
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', 
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : '#cbd5e1', // Borde sutil pero visible
    buttonShadow: isDark 
      ? '0 8px 25px rgba(0,0,0,0.2)' 
      : '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04), inset 0 1px 0 #ffffff', // Sombras multinivel en light
    buttonHoverShadow: isDark 
      ? '0 12px 30px rgba(0,0,0,0.35)' 
      : '0 20px 30px -10px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.06), inset 0 1px 0 #ffffff',
    modalBg: isDark ? '#121216' : '#ffffff',
    modalBorder: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
    accentGlow: isDark 
      ? 'radial-gradient(ellipse 700px 500px at var(--light-x) var(--light-y), rgba(255,255,255,0.018) 0%, transparent 70%)'
      : 'radial-gradient(ellipse 800px 600px at var(--light-x) var(--light-y), rgba(99, 102, 241, 0.08) 0%, rgba(255,255,255,0) 75%)' // Destello indigo translúcido en light
  }), [isDark])

  // Carga de datos del negocio desde Supabase
  useEffect(() => {
    let isMounted = true

    async function fetchLayoutData() {
      if (!slug) return
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('enlace del panel', slug)
        .single()

      if (isMounted) {
        if (data) {
          setBusiness(data)
          if (typeof data['Cuenta Activa'] === 'boolean') {
            setCuentaActiva(data['Cuenta Activa'])
          }
        } else {
          console.error('Error al cargar negocio en layout:', error)
        }
      }
    }

    fetchLayoutData()

    return () => {
      isMounted = false
    }
  }, [slug])

  // Timer de carga inicial
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 2800)
    return () => clearTimeout(timer)
  }, [])

  // Manejador del mouse optimizado mediante animación continua
  useEffect(() => {
    let frameId: number

    const handleMouseMove = (e: MouseEvent) => {
      frameId = requestAnimationFrame(() => {
        setMouse({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(frameId)
    }
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

  const navigate = useCallback((path: string, dir: 'left' | 'right') => {
    if (pathname === path) return
    setLeaving(dir)
    setTimeout(() => {
      setLeaving(null)
      router.push(path)
    }, 500)
  }, [pathname, router])

  const config = useMemo(() => ({
    leftLabel: 'Catálogo / Oferta', 
    leftPath: `/dashboard/${slug}/catalog`,
    panelName: 'Tablero Operativo', 
    mainPath: `/dashboard/${slug}/board`
  }), [slug])

  const rightPath = useMemo(() => `/dashboard/${slug}/metrics`, [slug])

  // Redirección por defecto
  useEffect(() => {
    if (pathname === `/dashboard/${slug}` && loaded) {
      router.replace(config.mainPath)
    }
  }, [pathname, slug, router, config.mainPath, loaded])

  const businessName = useMemo(() => {
    return business?.['Nombre del negocio'] || business?.name || slug?.replace(/-/g, ' ').toUpperCase() || 'NEGOCIO'
  }, [business, slug])

  const rotX = (mouse.y - 0.5) * 8
  const rotY = (mouse.x - 0.5) * -8
  const lightX = mouse.x * 100
  const lightY = mouse.y * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: themeStyles.bgColor,
        color: themeStyles.textColor,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s ease'
      }}
    >
      <LoadingScreen businessName={businessName} />

      {/* Iluminación Radial Interactiva (Ajustada para Modo Claro con Resplandor Sutil) */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: isDark 
          ? `radial-gradient(ellipse 700px 500px at ${lightX}% ${lightY}%, rgba(255,255,255,0.018) 0%, transparent 70%)`
          : `radial-gradient(ellipse 750px 550px at ${lightX}% ${lightY}%, rgba(59, 130, 246, 0.06) 0%, rgba(255, 255, 255, 0) 70%)`,
        pointerEvents: 'none', transition: 'background 0.08s linear'
      }} />

      {/* Ruido de Fondo Orgánico */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='${isDark ? '0.02' : '0.035'}'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px', pointerEvents: 'none'
      }} />

      {/* Transición de Navegación */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            initial={{ x: leaving === 'left' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
            style={{ position: 'fixed', inset: 0, background: themeStyles.bgColor, zIndex: 98 }}
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

          {/* Botón Izquierdo (Catálogo) */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onHoverStart={() => setHovering('leftBtn')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -4, scale: 1.025 }}
            whileTap={{ y: 1, scale: 0.97 }}
            onClick={() => navigate(config.leftPath, 'left')}
            style={{
              background: themeStyles.cardBg,
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '100px', 
              padding: '0.9rem 2.5rem', 
              color: themeStyles.textColor, 
              fontSize: '0.78rem',
              fontWeight: 700, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              cursor: 'pointer',
              backdropFilter: 'blur(12px)', 
              position: 'relative', 
              overflow: 'hidden',
              boxShadow: hovering === 'leftBtn' ? themeStyles.buttonHoverShadow : themeStyles.buttonShadow,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Destello interno en hover (Solo Modo Claro) */}
            {!isDark && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hovering === 'leftBtn' ? 1 : 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(241, 245, 249, 0) 100%)',
                  pointerEvents: 'none'
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{config.leftLabel}</span>
          </motion.button>

          {/* Centro (Título y Nombre del Negocio) */}
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
                letterSpacing: '0.15em', margin: 0, lineHeight: 1, color: themeStyles.textColor,
                textShadow: isDark 
                  ? `0 1px 0 rgba(255,255,255,0.25), 0 2px 0 rgba(180,180,180,0.15), 0 4px 0 rgba(120,120,120,0.1)` 
                  : `0 2px 10px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` // Sombra esculpida nítida en light
              }}>
                {businessName}
              </h1>
              <p style={{
                fontSize: '0.75rem', 
                letterSpacing: '0.3em', 
                color: themeStyles.subTextColor,
                textTransform: 'uppercase', 
                marginTop: '0.8rem', 
                fontWeight: 700
              }}>
                {config.panelName}
              </p>
            </motion.div>
          </motion.div>

          {/* Botón Derecho (Métricas) */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onHoverStart={() => setHovering('rightBtn')}
            onHoverEnd={() => setHovering(null)}
            whileHover={{ y: -4, scale: 1.025 }}
            whileTap={{ y: 1, scale: 0.97 }}
            onClick={() => navigate(rightPath, 'right')}
            style={{
              background: themeStyles.cardBg,
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '100px', 
              padding: '0.9rem 2.5rem', 
              color: themeStyles.textColor, 
              fontSize: '0.78rem',
              fontWeight: 700, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              cursor: 'pointer',
              backdropFilter: 'blur(12px)', 
              position: 'relative', 
              overflow: 'hidden',
              boxShadow: hovering === 'rightBtn' ? themeStyles.buttonHoverShadow : themeStyles.buttonShadow,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {!isDark && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hovering === 'rightBtn' ? 1 : 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(241, 245, 249, 0) 100%)',
                  pointerEvents: 'none'
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>Métricas</span>
          </motion.button>
        </div>

        {/* Contenido Principal */}
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

      {/* Botón Flotante Configuración */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 99 }}>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: isDark ? 'rgba(20, 20, 25, 0.85)' : '#ffffff',
            border: `1px solid ${themeStyles.cardBorder}`,
            borderRadius: '50%',
            width: '52px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: themeStyles.textColor,
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
            transition: 'box-shadow 0.3s ease'
          }}
          title="Configuración del Negocio"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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

      {/* Modal de Configuración */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: themeStyles.modalBg,
                border: `1px solid ${themeStyles.modalBorder}`,
                borderRadius: '20px',
                padding: '2rem',
                width: '100%',
                maxWidth: '420px',
                position: 'relative',
                boxShadow: isDark 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.02)',
                color: themeStyles.textColor
              }}
            >
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  position: 'absolute', top: '1.2rem', right: '1.2rem',
                  background: 'transparent', border: 'none', color: themeStyles.subTextColor,
                  fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '6px'
                }}
              >
                ✕
              </button>

              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
                ⚙️ Ajustes del Negocio
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.78rem', color: themeStyles.subTextColor }}>
                Administra la disponibilidad y la apariencia visual del panel.
              </p>

              {/* Estado de la Cuenta */}
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                border: `1px solid ${themeStyles.cardBorder}`,
                borderRadius: '14px',
                padding: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Estado de la Cuenta</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                    {cuentaActiva ? 'Atendiendo pedidos' : 'Cerrado temporalmente'}
                  </p>
                </div>

                <button
                  onClick={toggleCuentaActiva}
                  disabled={updatingCuenta}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: cuentaActiva ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(244,63,94,0.4)',
                    background: cuentaActiva ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                    color: cuentaActiva ? '#059669' : '#e11d48',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {updatingCuenta ? 'Guardando...' : cuentaActiva ? '● Abierto' : '○ Cerrado'}
                </button>
              </div>

              {/* Aspecto Visual */}
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                border: `1px solid ${themeStyles.cardBorder}`,
                borderRadius: '14px',
                padding: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Aspecto Visual</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                    Modo {isDark ? 'Oscuro' : 'Claro (Mate)'}
                  </p>
                </div>

                <button
                  onClick={toggleTheme}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${themeStyles.cardBorder}`,
                    background: themeStyles.cardBg,
                    color: themeStyles.textColor,
                    boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
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
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#0f172a',
                  color: isDark ? themeStyles.textColor : '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  boxShadow: isDark ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.15)',
                  transition: 'transform 0.1s ease, background 0.2s ease'
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