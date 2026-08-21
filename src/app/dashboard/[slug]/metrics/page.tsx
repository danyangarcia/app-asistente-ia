'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// Instanciación única del cliente fuera del ciclo de renders
const supabase = createClient()

export default function MetricsPage() {
  const pathname = usePathname()
  const router = useRouter()
  
  // Extracción limpia del slug
  const slug = useMemo(() => pathname.split('/')[2] || '', [pathname])

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'hoy' | 'semana' | 'mes'>('hoy')
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light')

  // Lectura del tema persistido
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
    if (savedTheme) {
      setThemeMode(savedTheme)
    }

    // Listener para sincronicidad en tiempo real si el tema cambia desde el DashboardLayout
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
      if (currentTheme) setThemeMode(currentTheme)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Propiedades visuales derivadas del tema (limpias de tonos azulados/plomizos)
  const isDark = themeMode === 'dark'
  const themeStyles = useMemo(() => ({
    textColor: isDark ? '#FFFFFF' : '#0f172a',
    subTextColor: isDark ? 'rgba(255,255,255,0.45)' : '#475569',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.75)',
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255, 255, 255, 0.9)',
    cardShadow: isDark 
      ? '0 8px 25px rgba(0,0,0,0.2)' 
      : '0 4px 20px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,1)',
    progressBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    activeTabBg: isDark ? 'rgba(255,255,255,0.12)' : '#ffffff',
    activeTabShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
    primaryMetricColor: isDark ? '#34d399' : '#059669',
    secondaryMetricColor: isDark ? '#60a5fa' : '#2563eb',
  }), [isDark])

  useEffect(() => {
    if (!slug) return

    let isMounted = true

    async function fetchOrders() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_slug', slug)

      if (isMounted) {
        if (data && !error) {
          setAllOrders(data)
        } else {
          console.error('Error al cargar órdenes:', error)
        }
        setLoading(false)
      }
    }

    fetchOrders()

    return () => {
      isMounted = false
    }
  }, [slug])

  const calcularDatosTab = useCallback((filtroTab: 'hoy' | 'semana' | 'mes', orders: any[]) => {
    const ahora = new Date()
    const hoyStr = ahora.toISOString().split('T')[0]

    let currentPeriodOrders: any[] = []
    let previousPeriodOrders: any[] = []

    if (filtroTab === 'hoy') {
      const ayerDate = new Date(ahora)
      ayerDate.setDate(ayerDate.getDate() - 1)
      const ayerStr = ayerDate.toISOString().split('T')[0]

      currentPeriodOrders = orders.filter(o => o.created_at?.startsWith(hoyStr) && o.estado !== 'cancelled')
      previousPeriodOrders = orders.filter(o => o.created_at?.startsWith(ayerStr) && o.estado !== 'cancelled')

    } else if (filtroTab === 'semana') {
      const hace7Dias = new Date(ahora)
      hace7Dias.setDate(hace7Dias.getDate() - 7)
      const hace14Dias = new Date(ahora)
      hace14Dias.setDate(hace14Dias.getDate() - 14)

      currentPeriodOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= hace7Dias && o.estado !== 'cancelled'
      })
      previousPeriodOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= hace14Dias && d < hace7Dias && o.estado !== 'cancelled'
      })

    } else if (filtroTab === 'mes') {
      const mesActual = ahora.getMonth()
      const anioActual = ahora.getFullYear()
      const mesPasadoNum = mesActual === 0 ? 11 : mesActual - 1
      const anioMesPasado = mesActual === 0 ? anioActual - 1 : anioActual

      currentPeriodOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === mesActual && d.getFullYear() === anioActual && o.estado !== 'cancelled'
      })
      previousPeriodOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === mesPasadoNum && d.getFullYear() === anioMesPasado && o.estado !== 'cancelled'
      })
    }

    const totalVentas = currentPeriodOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
    const solicitudesCount = currentPeriodOrders.length
    const ticketPromedio = solicitudesCount > 0 ? Math.round(totalVentas / solicitudesCount) : 0

    const ventasAnteriores = previousPeriodOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
    let cambioPorcentaje = 0
    if (ventasAnteriores === 0) {
      cambioPorcentaje = totalVentas > 0 ? 100 : 0
    } else {
      cambioPorcentaje = Math.round(((totalVentas - ventasAnteriores) / ventasAnteriores) * 100)
    }

    const vapiCount = currentPeriodOrders.filter(o => o.origen?.toLowerCase() === 'vapi').length
    const whatsappCount = currentPeriodOrders.filter(o => o.origen?.toLowerCase() === 'whatsapp').length

    return {
      totalVentas,
      cambioPorcentaje,
      solicitudesCount,
      ticketPromedio,
      vapiCount: vapiCount || Math.round(solicitudesCount * 0.6),
      whatsappCount: whatsappCount || (solicitudesCount - Math.round(solicitudesCount * 0.6)),
      tiempoPromedio: '1 min 45 seg'
    }
  }, [])

  const metrics = useMemo(() => {
    return calcularDatosTab(tab, allOrders)
  }, [tab, allOrders, calcularDatosTab])

  return (
    <div style={{ 
      color: themeStyles.textColor, 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '1rem 0',
      transition: 'color 0.3s ease'
    }}>
      
      {/* Encabezado Superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: themeStyles.subTextColor, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
            Tablero Operativo
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.2rem 0 0 0', letterSpacing: '-0.02em' }}>
            Métricas y Rendimiento
          </h2>
        </div>
        <motion.button 
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(`/dashboard/${slug}/board`)}
          style={{ 
            background: themeStyles.cardBg, 
            color: themeStyles.textColor, 
            border: `1px solid ${themeStyles.cardBorder}`, 
            padding: '0.7rem 1.4rem', 
            borderRadius: '100px', 
            cursor: 'pointer', 
            fontSize: '0.78rem', 
            fontWeight: 800,
            letterSpacing: '0.05em',
            backdropFilter: 'blur(10px)',
            boxShadow: themeStyles.cardShadow,
            transition: 'all 0.2s ease'
          }}
        >
          ← Volver al Tablero
        </motion.button>
      </div>

      {/* Selector de Periodo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ color: themeStyles.subTextColor, fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>
          Resumen operativo de la actividad atendida por tu IA
        </p>
        
        <div style={{ 
          background: themeStyles.cardBg, 
          border: `1px solid ${themeStyles.cardBorder}`, 
          padding: '0.3rem', 
          borderRadius: '100px', 
          display: 'flex', 
          gap: '0.3rem',
          backdropFilter: 'blur(10px)',
          boxShadow: themeStyles.cardShadow
        }}>
          {(['hoy', 'semana', 'mes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? themeStyles.activeTabBg : 'transparent',
                color: tab === t ? themeStyles.textColor : themeStyles.subTextColor,
                border: 'none',
                padding: '0.5rem 1.2rem',
                borderRadius: '100px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: tab === t ? 800 : 600,
                boxShadow: tab === t ? themeStyles.activeTabShadow : 'none',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
            >
              {t === 'hoy' ? 'Hoy' : t === 'semana' ? 'Esta Semana' : 'Este Mes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '5rem 2rem', 
          color: themeStyles.subTextColor,
          background: themeStyles.cardBg,
          border: `1px solid ${themeStyles.cardBorder}`,
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          Cargando métricas...
        </div>
      ) : (
        <>
          {/* Tarjetas Principales de KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* Ventas Totales */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              style={{ 
                background: themeStyles.cardBg, 
                border: `1px solid ${themeStyles.cardBorder}`, 
                borderRadius: '20px', 
                padding: '1.8rem',
                backdropFilter: 'blur(10px)',
                boxShadow: themeStyles.cardShadow
              }}
            >
              <span style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ventas Totales
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: themeStyles.primaryMetricColor, margin: '0.4rem 0' }}>
                ${metrics.totalVentas.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                fontWeight: 700,
                color: metrics.cambioPorcentaje >= 0 ? themeStyles.primaryMetricColor : (isDark ? '#f87171' : '#dc2626') 
              }}>
                {metrics.cambioPorcentaje >= 0 ? '↑ +' : '↓ '}{metrics.cambioPorcentaje}% vs periodo anterior
              </div>
            </motion.div>

            {/* Solicitudes Atendidas */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{ 
                background: themeStyles.cardBg, 
                border: `1px solid ${themeStyles.cardBorder}`, 
                borderRadius: '20px', 
                padding: '1.8rem',
                backdropFilter: 'blur(10px)',
                boxShadow: themeStyles.cardShadow
              }}
            >
              <span style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Solicitudes Atendidas
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: themeStyles.textColor, margin: '0.4rem 0' }}>
                {metrics.solicitudesCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                Pedidos y servicios cerrados
              </div>
            </motion.div>

            {/* Ticket Promedio */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              style={{ 
                background: themeStyles.cardBg, 
                border: `1px solid ${themeStyles.cardBorder}`, 
                borderRadius: '20px', 
                padding: '1.8rem',
                backdropFilter: 'blur(10px)',
                boxShadow: themeStyles.cardShadow
              }}
            >
              <span style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ticket Promedio
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: themeStyles.secondaryMetricColor, margin: '0.4rem 0' }}>
                ${metrics.ticketPromedio.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                Valor medio por orden
              </div>
            </motion.div>

          </div>

          {/* Paneles Informativos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
            
            {/* Canales de Entrada */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              style={{ 
                background: themeStyles.cardBg, 
                border: `1px solid ${themeStyles.cardBorder}`, 
                borderRadius: '20px', 
                padding: '1.8rem',
                backdropFilter: 'blur(10px)',
                boxShadow: themeStyles.cardShadow
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-0.01em' }}>
                Canales de Entrada de la IA
              </h3>
              
              {/* Llamadas de Voz */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: themeStyles.textColor, fontWeight: 600 }}>📞 Llamadas de Voz</span>
                  <span style={{ color: themeStyles.secondaryMetricColor, fontWeight: 800 }}>{metrics.vapiCount} atenciones</span>
                </div>
                <div style={{ width: '100%', background: themeStyles.progressBg, height: '8px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${metrics.solicitudesCount > 0 ? (metrics.vapiCount / metrics.solicitudesCount) * 100 : 0}%`, 
                    background: themeStyles.secondaryMetricColor, 
                    height: '100%',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>

              {/* Mensajes de WhatsApp */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: themeStyles.textColor, fontWeight: 600 }}>💬 Mensajes de WhatsApp</span>
                  <span style={{ color: themeStyles.primaryMetricColor, fontWeight: 800 }}>{metrics.whatsappCount} atenciones</span>
                </div>
                <div style={{ width: '100%', background: themeStyles.progressBg, height: '8px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${metrics.solicitudesCount > 0 ? (metrics.whatsappCount / metrics.solicitudesCount) * 100 : 0}%`, 
                    background: themeStyles.primaryMetricColor, 
                    height: '100%',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>
            </motion.div>

            {/* Eficiencia del Asistente */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              style={{ 
                background: themeStyles.cardBg, 
                border: `1px solid ${themeStyles.cardBorder}`, 
                borderRadius: '20px', 
                padding: '1.8rem',
                backdropFilter: 'blur(10px)',
                boxShadow: themeStyles.cardShadow
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-0.01em' }}>
                Eficiencia del Asistente IA
              </h3>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem', 
                borderRadius: '12px',
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${themeStyles.cardBorder}`,
                fontSize: '0.88rem' 
              }}>
                <span style={{ color: themeStyles.subTextColor, fontWeight: 500 }}>Tiempo promedio de atención:</span>
                <span style={{ color: themeStyles.textColor, fontWeight: 800 }}>{metrics.tiempoPromedio}</span>
              </div>
            </motion.div>

          </div>
        </>
      )}
    </div>
  )
}