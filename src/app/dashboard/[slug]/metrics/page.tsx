'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const supabase = createClient()

export default function MetricsPage() {
  const pathname = usePathname()
  const router = useRouter()

  // Extrae el slug de manera más limpia ignorando slashes iniciales/finales
  const slug = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return segments[1] || '' // Ajustar índice según la estructura de rutas (/dashboard/[slug]/metrics)
  }, [pathname])

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'hoy' | 'semana' | 'mes'>('hoy')
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [vapiMetrics, setVapiMetrics] = useState<any>(null)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light')

  // Estado para los datos de facturación en Supabase
  const [billingData, setBillingData] = useState({
    includedMinutes: 0,
    rolloverMinutes: 0,
    bonusMinutes: 0,
    endDate: '' as string | null
  })

  // Listener para sync de tema visual
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
    if (savedTheme) setThemeMode(savedTheme)

    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('dashboard_theme') as 'dark' | 'light'
      if (currentTheme) setThemeMode(currentTheme)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

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

  // Obtención de datos de Supabase y API de Métricas
  useEffect(() => {
    if (!slug) return

    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)

      try {
        const [{ data: ordersData }, resMetrics] = await Promise.all([
          supabase.from('orders').select('*').eq('business_slug', slug),
          fetch(`/api/metrics?business_slug=${slug}`, { signal: controller.signal }),
        ])

        if (ordersData) setAllOrders(ordersData)

        if (resMetrics.ok) {
          const metricsData = await resMetrics.json()
          setVapiMetrics(metricsData)
          setBillingData({
            includedMinutes: Number(metricsData.metrics?.includedMinutes) || 0,
            rolloverMinutes: Number(metricsData.metrics?.rolloverMinutes) || 0,
            bonusMinutes: Number(metricsData.metrics?.bonusMinutes) || 0,
            endDate: metricsData.subscription?.currentPeriodEnd || null
          })
        }

        // Obtener período activo de facturación para minutos y fecha de renovación
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error al cargar datos:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [slug])

  // Cálculo de métricas locales evitando desfase de zona horaria
  const calcularDatosTab = useCallback((filtroTab: 'hoy' | 'semana' | 'mes', orders: any[]) => {
    const ahora = new Date()
    
    const esMismoDia = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()

    let currentPeriodOrders: any[] = []
    let previousPeriodOrders: any[] = []

    if (filtroTab === 'hoy') {
      const ayer = new Date(ahora)
      ayer.setDate(ayer.getDate() - 1)

      currentPeriodOrders = orders.filter(o => esMismoDia(new Date(o.created_at), ahora) && o.estado !== 'cancelled')
      previousPeriodOrders = orders.filter(o => esMismoDia(new Date(o.created_at), ayer) && o.estado !== 'cancelled')

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
      vapiCount,
      whatsappCount,
    }
  }, [])

  const metrics = useMemo(() => {
    return calcularDatosTab(tab, allOrders)
  }, [tab, allOrders, calcularDatosTab])

  // --- CÁLCULOS REALES DE MINUTOS Y RENOVACIÓN ---
  const usedMinutes = Number(vapiMetrics?.metrics?.usedMinutes) || 0
  const totalMinutesPlan = Number(vapiMetrics?.metrics?.totalMinutes) || 0
  const availableMinutes = Number(vapiMetrics?.metrics?.availableMinutes) || 0
  const percentageUsed = totalMinutesPlan > 0 ? Math.min(100, Math.max(0, (usedMinutes / totalMinutesPlan) * 100)) : 0

  // Formateador para la fecha de renovación
  const formatRenewalDate = (dateStr: string | null) => {
    if (!dateStr) return '---'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '---'
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div style={{ 
      color: themeStyles.textColor, 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '1rem 0',
      transition: 'color 0.3s ease'
    }}>
      
      {/* Encabezado */}
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

      {/* Selector de Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ color: themeStyles.subTextColor, fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>
          Resumen operativo y consumo de minutos IA
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
          {/* Tarjetas KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
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
                Minutos Disponibles IA
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: themeStyles.secondaryMetricColor, margin: '0.4rem 0' }}>
                {availableMinutes} min
              </div>
              <div style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                Consumidos: {usedMinutes} min este periodo
              </div>
            </motion.div>

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
                Solicitudes Atendidas
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: themeStyles.textColor, margin: '0.4rem 0' }}>
                {metrics.solicitudesCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, fontWeight: 500 }}>
                Ticket prom: ${metrics.ticketPromedio.toLocaleString()}
              </div>
            </motion.div>

          </div>

          {/* Paneles Informativos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
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
              
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: themeStyles.textColor, fontWeight: 600 }}>📞 Llamadas de Voz (Vapi)</span>
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
                Desglose de Saldos de Minutos
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.6rem 0', borderBottom: `1px solid ${themeStyles.cardBorder}` }}>
                  <span style={{ color: themeStyles.subTextColor, fontWeight: 500 }}>Minutos del Plan:</span>
                  <span style={{ color: themeStyles.textColor, fontWeight: 800 }}>{billingData.includedMinutes} min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.6rem 0', borderBottom: `1px solid ${themeStyles.cardBorder}` }}>
                  <span style={{ color: themeStyles.subTextColor, fontWeight: 500 }}>Minutos Acumulados (Rollover):</span>
                  <span style={{ color: themeStyles.textColor, fontWeight: 800 }}>{billingData.rolloverMinutes} min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.6rem 0' }}>
                  <span style={{ color: themeStyles.subTextColor, fontWeight: 500 }}>Saldo Bonus / Promocional:</span>
                  <span style={{ color: themeStyles.primaryMetricColor, fontWeight: 800 }}>{billingData.bonusMinutes} min</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Barra de Progreso y Renovación del Plan IA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            style={{ 
              background: themeStyles.cardBg, 
              border: `1px solid ${themeStyles.cardBorder}`, 
              borderRadius: '20px', 
              padding: '1.8rem',
              backdropFilter: 'blur(10px)',
              boxShadow: themeStyles.cardShadow
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.2rem 0', letterSpacing: '-0.01em' }}>
                  Consumo General del Plan IA
                </h3>
                <p style={{ fontSize: '0.8rem', color: themeStyles.subTextColor, margin: 0, fontWeight: 500 }}>
                  Próxima renovación de pago el <span style={{ color: themeStyles.textColor, fontWeight: 700 }}>{formatRenewalDate(billingData.endDate)}</span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.88rem', color: themeStyles.textColor, fontWeight: 700 }}>
                  {usedMinutes} min usados <span style={{ color: themeStyles.subTextColor, fontWeight: 500 }}>/ {totalMinutesPlan} min</span>
                </span>
              </div>
            </div>

            {/* Barra Visual (0% a 100%) */}
            <div style={{ width: '100%', background: themeStyles.progressBg, height: '12px', borderRadius: '999px', overflow: 'hidden', padding: '2px', border: `1px solid ${themeStyles.cardBorder}` }}>
              <div style={{ 
                width: `${percentageUsed}%`, 
                background: percentageUsed > 85 ? '#ef4444' : themeStyles.primaryMetricColor, 
                height: '100%',
                borderRadius: '999px',
                transition: 'width 0.6s ease'
              }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', fontSize: '0.75rem', color: themeStyles.subTextColor, fontWeight: 600 }}>
              <span>0%</span>
              <span style={{ color: themeStyles.textColor, fontWeight: 700 }}>
                {percentageUsed.toFixed(1)}% consumido
              </span>
              <span>100%</span>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
