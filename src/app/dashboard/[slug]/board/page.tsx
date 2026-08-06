'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'

export interface Order {
  id: string
  business_slug: string
  cliente_nombre: string
  tipo: string
  hora: string
  items: any[]
  total: number
  estado: 'new' | 'in_progress' | 'ready' | 'completed' | 'cancelled'
  origen: string
  motivo_cancelacion?: string
}

export default function BoardPage() {
  const pathname = usePathname()
  
  // Captura inteligente del slug independiente de las barras diagonales extras
  const segments = pathname.split('/').filter(Boolean)
  const slug = segments.length >= 2 ? segments[1] : 'tacos-luis'
  
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [razon, setRazon] = useState('')

  useEffect(() => {
    if (!slug) return

    async function fetchOrders() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_slug', slug)
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
            setOrders((prev) => [payload.new as Order, ...prev])
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
      default: return { label: '🛍️ Pedido', bg: '#374151', color: '#d1d5db' }
    }
  }

  return (
    <div style={{ color: '#fff', maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #1f2937', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>Pedidos y Solicitudes en Vivo</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
          Panel simplificado de la actividad de tu negocio ({slug}).
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
                        Registrado a las: <strong>{order.hora || 'Recién'}</strong> | Canal: <span style={{ textTransform: 'uppercase', color: '#60a5fa' }}>{order.origen || 'vapi'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#34d399' }}>${order.total || 0}</span>
                    </div>
                  </div>

                  <div style={{ background: '#1f2937', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((prod: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb', padding: '0.15rem 0' }}>
                          <span>{prod.cantidad || 1}x {prod.taco || prod.nombre || 'Producto'} ({prod.tortilla || 'maíz'})</span>
                          <span style={{ color: '#9ca3af' }}>${(prod.precio || 0) * (prod.cantidad || 1)}</span>
                        </div>
                      ))
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
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {order.estado === 'new' && (
                        <button onClick={() => updateStatus(order.id, 'in_progress')}
                          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                          ✔ Confirmar / Tomar
                        </button>
                      )}

                      {(order.estado === 'in_progress' || order.estado === 'ready') && (
                        <button onClick={() => updateStatus(order.id, 'completed')}
                          style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                          ✔ Completado
                        </button>
                      )}

                      {order.estado === 'completed' && (
                        <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 'bold' }}>✔ Pedido Completado</span>
                      )}

                      <button onClick={() => { setCancellingId(order.id); setRazon(''); }}
                        style={{ background: 'transparent', border: '1px solid #dc2626', color: '#f87171', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        Cancelar ✕
                      </button>
                    </div>
                  )}

                </motion.div>
              )
            })}
          </AnimatePresence>

          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#4b5563' }}>
              No hay pedidos registrados todavía.
            </div>
          )}
        </div>
      )}
    </div>
  )
}