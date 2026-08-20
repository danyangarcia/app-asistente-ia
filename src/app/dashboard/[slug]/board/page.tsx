'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'

export interface Order {
  id: string
  business_slug: string
  cliente_nombre: string
  cliente_telefono?: string
  direccion?: string
  referencia_domicilio?: string
  metodo_pago?: string
  notas?: string
  tipo: string
  hora: string
  items: any[]
  total: number
  estado: 'new' | 'in_progress' | 'ready' | 'completed' | 'cancelled'
  origen: string
  motivo_cancelacion?: string
  created_at?: string
}

export default function BoardPage() {
  const pathname = usePathname()
  
  const segments = pathname.split('/').filter(Boolean)
  const slug = segments.length >= 2 ? segments[1] : 'tacos-luis'
  
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [razon, setRazon] = useState('')
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [mounted, setMounted] = useState(false)

  // Estado del tema dinámico
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light')

  // Detectar y escuchar cambios en localStorage
  useEffect(() => {
    setMounted(true)

    const checkTheme = () => {
      const savedTheme = (localStorage.getItem('dashboard_theme') as 'dark' | 'light') || 'light'
      setThemeMode(savedTheme)
    }

    checkTheme()

    // Escuchar cambios entre pestañas o desde el layout
    window.addEventListener('storage', checkTheme)
    
    // Polling ligero para reaccionar al cambio inmediato desde el modal
    const interval = setInterval(checkTheme, 500)

    return () => {
      window.removeEventListener('storage', checkTheme)
      clearInterval(interval)
    }
  }, [])

  const isDark = themeMode === 'dark'

  // Paleta de estilos adaptativa
  const styles = useMemo(() => ({
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#9ca3af' : '#475569',
    cardBg: isDark ? '#111827' : '#ffffff',
    cardBorder: isDark ? '#374151' : '#cbd5e1',
    cardBorderCompleted: isDark ? '#1f2937' : '#e2e8f0',
    innerBoxBg: isDark ? '#1f2937' : '#f1f5f9',
    innerBoxText: isDark ? '#e5e7eb' : '#1e293b',
    headerBorder: isDark ? '#1f2937' : '#cbd5e1',
    modalBg: isDark ? '#111827' : '#ffffff',
    modalBorder: isDark ? '#374151' : '#cbd5e1',
    modalOverlay: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 23, 42, 0.65)',
    cardShadow: isDark 
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' 
      : '0 4px 12px rgba(15, 23, 42, 0.08)',
    inputBg: isDark ? '#111827' : '#ffffff',
    inputBorder: isDark ? '#374151' : '#94a3b8',
    priceColor: isDark ? '#34d399' : '#059669'
  }), [isDark])

  useEffect(() => {
    if (!slug) return

    async function fetchOrders() {
      setLoading(true)
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_slug', slug)
        .gte('created_at', hace24Horas)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setOrders(data)
      }
      setLoading(false)
    }

    fetchOrders()

    const channel = supabase
      .channel(`orders_realtime_${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_slug=eq.${slug}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            const createdAt = newOrder.created_at ? new Date(newOrder.created_at).getTime() : Date.now()
            const hace24Horas = Date.now() - 24 * 60 * 60 * 1000

            if (createdAt >= hace24Horas) {
              setOrders((prev) => [newOrder, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
            )
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [slug, supabase])

  // Purgar pedidos antiguos
  useEffect(() => {
    const interval = setInterval(() => {
      const hace24Horas = Date.now() - 24 * 60 * 60 * 1000
      setOrders((prevOrders) =>
        prevOrders.filter((order) => {
          const createdAt = order.created_at ? new Date(order.created_at).getTime() : Date.now()
          return createdAt >= hace24Horas
        })
      )
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id: string, nuevoEstado: Order['estado'], extraData = {}) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado: nuevoEstado, ...extraData } : o))
    )

    const { error } = await supabase
      .from('orders')
      .update({ estado: nuevoEstado, ...extraData })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleCancelSubmit = async (order: Order) => {
    if (!razon.trim()) {
      alert('Escribe el motivo de la cancelación')
      return
    }

    await updateStatus(order.id, 'cancelled', { motivo_cancelacion: razon })

    if (order.origen === 'whatsapp') {
      const msg = encodeURIComponent(`Hola ${order.cliente_nombre}, tu pedido fue cancelado por el siguiente motivo: ${razon}. Una disculpa.`)
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }

    setCancellingId(null)
    setRazon('')
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'domicilio': return { label: '🏠 A Domicilio', bg: isDark ? '#1e3a8a' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af' }
      case 'comer_aqui': return { label: '🍽️ Para Comer Ahí', bg: isDark ? '#065f46' : '#d1fae5', color: isDark ? '#6ee7b7' : '#065f46' }
      case 'reserva': return { label: '📅 Reserva', bg: isDark ? '#78350f' : '#fef3c7', color: isDark ? '#fde68a' : '#92400e' }
      default: return { label: '🛍️ Para Llevar', bg: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#d1d5db' : '#334155' }
    }
  }

  const getCanalTexto = (origen: string) => {
    if (!origen) return 'Llamada IA'
    const o = origen.toLowerCase()
    if (o.includes('vapi')) return 'Llamada IA'
    return origen
  }

  const getItemPrice = (prod: any, totalOrder: number, totalItems: number) => {
    const rawPrice = prod.precio ?? prod.precio_unitario ?? prod.costo ?? prod.subtotal ?? 0
    const cantidad = prod.cantidad || 1

    if (rawPrice > 0) return rawPrice * cantidad
    if (totalOrder > 0) {
      if (totalItems === 1) return totalOrder
      return (totalOrder / totalItems) * cantidad
    }

    return 0
  }

  return (
    <div style={{ color: styles.textPrimary, maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem', transition: 'color 0.3s ease' }}>
      <header style={{ marginBottom: '2rem', borderBottom: `1px solid ${styles.headerBorder}`, paddingBottom: '1rem', transition: 'border-color 0.3s ease' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>Pedidos y Solicitudes en Vivo</h2>
        <p style={{ color: styles.textSecondary, fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
          Panel simplificado de la actividad de tu negocio ({slug}). Muestra pedidos de las últimas 24 horas.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: styles.textSecondary }}>Cargando datos...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {orders.map((order) => {
              const badge = getTipoBadge(order.tipo)
              const isCancelled = order.estado === 'cancelled'
              const isCompleted = order.estado === 'completed'

              return (
                <motion.div 
                  key={order.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  style={{
                    background: styles.cardBg,
                    border: '1px solid ' + (isCancelled ? '#ef4444' : isCompleted ? styles.cardBorderCompleted : styles.cardBorder),
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    boxShadow: styles.cardShadow,
                    opacity: isCompleted || isCancelled ? 0.75 : 1,
                    transition: 'all 0.3s ease'
                  }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: styles.textPrimary }}>{order.cliente_nombre || 'Cliente General'}</h3>
                        <span style={{ background: badge.bg, color: badge.color, padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {badge.label}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                        Registrado a las: <strong>{order.hora || 'Recién'}</strong> | Canal: <span style={{ textTransform: 'capitalize', color: isDark ? '#10b981' : '#059669', fontWeight: 'bold' }}>{getCanalTexto(order.origen)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: styles.priceColor }}>${order.total || 0}</span>
                    </div>
                  </div>

                  <div style={{ background: styles.innerBoxBg, padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem', transition: 'background 0.3s ease' }}>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((prod: any, idx: number) => {
                        const subtotalItem = getItemPrice(prod, order.total || 0, order.items.length)
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: styles.innerBoxText, padding: '0.15rem 0' }}>
                            <span>{prod.cantidad || 1}x {prod.taco || prod.nombre || 'Producto'} ({prod.tortilla || 'maíz'})</span>
                            <span style={{ color: subtotalItem > 0 ? styles.priceColor : styles.textSecondary, fontWeight: subtotalItem > 0 ? 'bold' : 'normal' }}>
                              ${subtotalItem}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div style={{ color: styles.textSecondary, fontStyle: 'italic' }}>Sin productos especificados</div>
                    )}
                  </div>

                  {isCancelled && order.motivo_cancelacion && (
                    <div style={{ background: isDark ? '#7f1d1d33' : '#fef2f2', border: '1px solid #fca5a5', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.85rem', color: isDark ? '#fca5a5' : '#991b1b', marginBottom: '1rem' }}>
                      ❌ <strong>Cancelado:</strong> {order.motivo_cancelacion}
                    </div>
                  )}

                  {cancellingId === order.id && (
                    <div style={{ background: styles.innerBoxBg, padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #ef4444' }}>
                      <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#ef4444' }}>¿Por qué se cancela este pedido?</p>
                      <input 
                        type="text" 
                        placeholder="Ej. No hay producto, cliente colgó..." 
                        value={razon} 
                        onChange={(e) => setRazon(e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          background: styles.inputBg, 
                          border: `1px solid ${styles.inputBorder}`, 
                          color: styles.textPrimary, 
                          borderRadius: '0.3rem', 
                          marginBottom: '0.5rem', 
                          fontSize: '0.85rem',
                          outline: 'none'
                        }} 
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setCancellingId(null)} style={{ background: 'transparent', border: `1px solid ${styles.cardBorder}`, color: styles.textSecondary, padding: '0.3rem 0.7rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}>Volver</button>
                        <button onClick={() => handleCancelSubmit(order)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar Cancelación</button>
                      </div>
                    </div>
                  )}

                  {!isCancelled && cancellingId !== order.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        style={{ background: isDark ? '#374151' : '#e2e8f0', color: styles.textPrimary, border: `1px solid ${styles.cardBorder}`, padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
                        🔍 Vista Completa
                      </button>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {!isCompleted && (
                          <button onClick={() => updateStatus(order.id, 'completed')}
                            style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✔ Completar
                          </button>
                        )}

                        {isCompleted && (
                          <span style={{ fontSize: '0.85rem', color: styles.priceColor, fontWeight: 'bold' }}>✔ Pedido Completado</span>
                        )}

                        <button onClick={() => { setCancellingId(order.id); setRazon(''); }}
                          style={{ background: 'transparent', border: '1px solid #dc2626', color: '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
                          Cancelar ✕
                        </button>
                      </div>
                    </div>
                  )}

                </motion.div>
              )
            })}
          </AnimatePresence>

          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: styles.textSecondary }}>
              No hay pedidos registrados en las últimas 24 horas.
            </div>
          )}
        </div>
      )}

      {/* PORTAL MODAL DETALLES */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedOrder && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              style={{ 
                position: 'fixed', 
                top: 0, left: 0, right: 0, bottom: 0,
                width: '100vw', height: '100vh', 
                backgroundColor: styles.modalOverlay, 
                backdropFilter: 'blur(12px)', 
                WebkitBackdropFilter: 'blur(12px)', 
                zIndex: 2147483647, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem',
                boxSizing: 'border-box'
              }}>
              
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  background: styles.modalBg, 
                  border: `1px solid ${styles.modalBorder}`, 
                  borderRadius: '1rem', 
                  width: '100%', 
                  maxWidth: '560px', 
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  padding: '1.5rem', 
                  color: styles.textPrimary, 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                  margin: 'auto'
                }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${styles.headerBorder}`, paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>Información Completa del Pedido</h3>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: styles.textSecondary, fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                  
                  <div style={{ background: styles.innerBoxBg, padding: '0.85rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Cliente</span>
                      <strong>{selectedOrder.cliente_nombre || 'Cliente General'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Teléfono</span>
                      <strong>{selectedOrder.cliente_telefono || 'No especificado'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Tipo de Entrega</span>
                      <strong style={{ textTransform: 'capitalize', color: isDark ? '#60a5fa' : '#2563eb' }}>{selectedOrder.tipo || 'Para Llevar'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Hora de Registro</span>
                      <strong>{selectedOrder.hora || 'Recién'}</strong>
                    </div>
                  </div>

                  <div style={{ background: styles.innerBoxBg, padding: '0.85rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>📍 DIRECCIÓN DE ENVÍO</span>
                    <span style={{ fontSize: '0.9rem', color: styles.innerBoxText, fontWeight: '500' }}>
                      {selectedOrder.direccion || 'No aplica / Recoge en sucursal'}
                    </span>
                  </div>

                  <div style={{ background: styles.innerBoxBg, padding: '0.85rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Referencias del Domicilio</span>
                      <span style={{ color: styles.innerBoxText }}>{selectedOrder.referencia_domicilio || selectedOrder.notas || 'Sin referencias'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block' }}>Método de Pago</span>
                      <span style={{ color: styles.priceColor, fontWeight: 'bold' }}>{selectedOrder.metodo_pago || 'Efectivo'}</span>
                    </div>
                  </div>

                  {selectedOrder.notas && (
                    <div style={{ background: styles.innerBoxBg, padding: '0.85rem', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>📝 NOTAS Y OBSERVACIONES DE LA IA</span>
                      <span style={{ color: styles.innerBoxText }}>{selectedOrder.notas}</span>
                    </div>
                  )}

                  <div style={{ background: styles.innerBoxBg, padding: '0.85rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: styles.textSecondary, display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>DESGLOSE DE PRODUCTOS</span>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((prod: any, idx: number) => {
                        const subtotalItem = getItemPrice(prod, selectedOrder.total || 0, selectedOrder.items.length)
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: `1px solid ${styles.cardBorder}` }}>
                            <span>{prod.cantidad || 1}x {prod.taco || prod.nombre || 'Producto'} ({prod.tortilla || 'maíz'})</span>
                            <span style={{ fontWeight: 'bold', color: subtotalItem > 0 ? styles.priceColor : styles.textPrimary }}>${subtotalItem}</span>
                          </div>
                        )
                      })
                    ) : (
                      <span style={{ color: styles.textSecondary, fontStyle: 'italic' }}>Sin items detallados</span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      <span>Total General:</span>
                      <span style={{ color: styles.priceColor }}>${selectedOrder.total || 0}</span>
                    </div>
                  </div>

                </div>

                <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: isDark ? '#374151' : '#cbd5e1', color: styles.textPrimary, border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    Cerrar
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}