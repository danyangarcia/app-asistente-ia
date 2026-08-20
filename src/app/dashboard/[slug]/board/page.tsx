'use client'

import React, { useState, useEffect } from 'react'
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

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!slug) return

    async function fetchOrders() {
      setLoading(true)
      
      // Calcular fecha límite de hace 24 horas
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_slug', slug)
        .gte('created_at', hace24Horas) // Solo cargar pedidos de las últimas 24 horas
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

            // Solo agregar si fue creado dentro de las últimas 24 horas
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

  // INTERVALO PARA PURGAR PEDIDOS MÁS ANTIGUOS DE 24 HORAS CADA MINUTO
  useEffect(() => {
    const interval = setInterval(() => {
      const hace24Horas = Date.now() - 24 * 60 * 60 * 1000
      setOrders((prevOrders) =>
        prevOrders.filter((order) => {
          const createdAt = order.created_at ? new Date(order.created_at).getTime() : Date.now()
          return createdAt >= hace24Horas
        })
      )
    }, 60000) // Revisa cada 60 segundos

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
      case 'domicilio': return { label: '🏠 A Domicilio', bg: '#1e3a8a', color: '#93c5fd' }
      case 'comer_aqui': return { label: '🍽️ Para Comer Ahí', bg: '#065f46', color: '#6ee7b7' }
      case 'reserva': return { label: '📅 Reserva', bg: '#78350f', color: '#fde68a' }
      default: return { label: '🛍️ Para Llevar', bg: '#374151', color: '#d1d5db' }
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

    if (rawPrice > 0) {
      return rawPrice * cantidad
    }

    if (totalOrder > 0) {
      if (totalItems === 1) {
        return totalOrder
      }
      return (totalOrder / totalItems) * cantidad
    }

    return 0
  }

  return (
    <div style={{ color: '#fff', maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #1f2937', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>Pedidos y Solicitudes en Vivo</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
          Panel simplificado de la actividad de tu negocio ({slug}). Muestra pedidos de las últimas 24 horas.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Cargando datos...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {orders.map((order) => {
              const badge = getTipoBadge(order.tipo)
              const isCancelled = order.estado === 'cancelled'
              const isCompleted = order.estado === 'completed'

              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    background: '#111827',
                    border: '1px solid ' + (isCancelled ? '#7f1d1d' : isCompleted ? '#1f2937' : '#374151'),
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    opacity: isCompleted || isCancelled ? 0.7 : 1
                  }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{order.cliente_nombre || 'Cliente General'}</h3>
                        <span style={{ background: badge.bg, color: badge.color, padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {badge.label}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Registrado a las: <strong>{order.hora || 'Recién'}</strong> | Canal: <span style={{ textTransform: 'capitalize', color: '#10b981', fontWeight: 'bold' }}>{getCanalTexto(order.origen)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#34d399' }}>${order.total || 0}</span>
                    </div>
                  </div>

                  <div style={{ background: '#1f2937', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((prod: any, idx: number) => {
                        const subtotalItem = getItemPrice(prod, order.total || 0, order.items.length)
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb', padding: '0.15rem 0' }}>
                            <span>{prod.cantidad || 1}x {prod.taco || prod.nombre || 'Producto'} ({prod.tortilla || 'maíz'})</span>
                            <span style={{ color: subtotalItem > 0 ? '#34d399' : '#9ca3af', fontWeight: subtotalItem > 0 ? 'bold' : 'normal' }}>
                              ${subtotalItem}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin productos especificados</div>
                    )}
                  </div>

                  {isCancelled && order.motivo_cancelacion && (
                    <div style={{ background: '#7f1d1d33', border: '1px solid #7f1d1d', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1rem' }}>
                      ❌ <strong>Cancelado:</strong> {order.motivo_cancelacion}
                    </div>
                  )}

                  {cancellingId === order.id && (
                    <div style={{ background: '#1f2937', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #ef4444' }}>
                      <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#f87171' }}>¿Por qué se cancela este pedido?</p>
                      <input type="text" placeholder="Ej. No hay producto, cliente colgó..." value={razon} onChange={(e) => setRazon(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: '0.3rem', marginBottom: '0.5rem', fontSize: '0.85rem' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setCancellingId(null)} style={{ background: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', padding: '0.3rem 0.7rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}>Volver</button>
                        <button onClick={() => handleCancelSubmit(order)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar Cancelación</button>
                      </div>
                    </div>
                  )}

                  {!isCancelled && cancellingId !== order.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        style={{ background: '#374151', color: '#e5e7eb', border: '1px solid #4b5563', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}>
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
                          <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 'bold' }}>✔ Pedido Completado</span>
                        )}

                        <button onClick={() => { setCancellingId(order.id); setRazon(''); }}
                          style={{ background: 'transparent', border: '1px solid #dc2626', color: '#f87171', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
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
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#4b5563' }}>
              No hay pedidos registrados en las últimas 24 horas.
            </div>
          )}
        </div>
      )}

      {/* PORTAL CON Z-INDEX ABSOLUTO MAXIMO Y CENTRADO COMPLETO */}
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
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw', 
                height: '100vh', 
                backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                backdropFilter: 'blur(16px)', 
                WebkitBackdropFilter: 'blur(16px)', 
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
                  background: '#111827', 
                  border: '1px solid #374151', 
                  borderRadius: '1rem', 
                  width: '100%', 
                  maxWidth: '560px', 
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  padding: '1.5rem', 
                  color: '#fff', 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
                  margin: 'auto'
                }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>Información Completa del Pedido</h3>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                  
                  <div style={{ background: '#1f2937', padding: '0.85rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Cliente</span>
                      <strong>{selectedOrder.cliente_nombre || 'Cliente General'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Teléfono</span>
                      <strong>{selectedOrder.cliente_telefono || 'No especificado'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Tipo de Entrega</span>
                      <strong style={{ textTransform: 'capitalize', color: '#60a5fa' }}>{selectedOrder.tipo || 'Para Llevar'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Hora de Registro</span>
                      <strong>{selectedOrder.hora || 'Recién'}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#1f2937', padding: '0.85rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>📍 DIRECCIÓN DE ENVÍO</span>
                    <span style={{ fontSize: '0.9rem', color: '#e5e7eb', fontWeight: '500' }}>
                      {selectedOrder.direccion || 'No aplica / Recoge en sucursal'}
                    </span>
                  </div>

                  <div style={{ background: '#1f2937', padding: '0.85rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Referencias del Domicilio</span>
                      <span style={{ color: '#d1d5db' }}>{selectedOrder.referencia_domicilio || selectedOrder.notas || 'Sin referencias'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Método de Pago</span>
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>{selectedOrder.metodo_pago || 'Efectivo'}</span>
                    </div>
                  </div>

                  {selectedOrder.notas && (
                    <div style={{ background: '#1f2937', padding: '0.85rem', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>📝 NOTAS Y OBSERVACIONES DE LA IA</span>
                      <span style={{ color: '#d1d5db' }}>{selectedOrder.notas}</span>
                    </div>
                  )}

                  <div style={{ background: '#1f2937', padding: '0.85rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>DESGLOSE DE PRODUCTOS</span>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((prod: any, idx: number) => {
                        const subtotalItem = getItemPrice(prod, selectedOrder.total || 0, selectedOrder.items.length)
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #374151' }}>
                            <span>{prod.cantidad || 1}x {prod.taco || prod.nombre || 'Producto'} ({prod.tortilla || 'maíz'})</span>
                            <span style={{ fontWeight: 'bold', color: subtotalItem > 0 ? '#34d399' : '#fff' }}>${subtotalItem}</span>
                          </div>
                        )
                      })
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin items detallados</span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      <span>Total General:</span>
                      <span style={{ color: '#34d399' }}>${selectedOrder.total || 0}</span>
                    </div>
                  </div>

                </div>

                <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 'bold' }}>
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