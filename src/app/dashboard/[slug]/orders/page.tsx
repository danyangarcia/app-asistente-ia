'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { playClick, playSuccess, playNewOrder } from '@/components/SoundManager'

const statusConfig: Record<string, { label: string; color: string; glow: string }> = {
  new: { label: 'Nuevo', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  in_progress: { label: 'En preparacion', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  ready: { label: 'Listo', color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  completed: { label: 'Completado', color: '#6b7280', glow: 'rgba(107,114,128,0.2)' }
}

const statusFlow: Record<string, string> = {
  new: 'in_progress',
  in_progress: 'ready',
  ready: 'completed'
}

const pedidosIniciales = [
  {
    id: '1',
    hora: '12:42',
    tiempo: '3 min',
    productos: [
      { nombre: 'Taco de cabeza', cantidad: 3, nota: 'sin cebolla', precio: 43 },
      { nombre: 'Agua de horchata', cantidad: 1, nota: '', precio: 30 }
    ],
    tipo: 'Recoger',
    cliente: 'Lucia Martinez',
    telefono: '+52 637 123 4567',
    total: 159,
    status: 'new'
  },
  {
    id: '2',
    hora: '12:38',
    tiempo: '7 min',
    productos: [
      { nombre: 'Quesadilla con lengua', cantidad: 2, nota: '', precio: 75 },
      { nombre: 'Refresco Coca Cola', cantidad: 2, nota: '', precio: 0 }
    ],
    tipo: 'Domicilio',
    cliente: 'Carlos Ruiz',
    telefono: '+52 637 987 6543',
    total: 150,
    status: 'in_progress'
  }
]

export default function OrdersPage() {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const avanzar = (id: string) => {
    playClick()
    setPedidos(prev => prev.map(p => {
      if (p.id === id && statusFlow[p.status]) {
        const nextStatus = statusFlow[p.status]
        if (nextStatus === 'ready') playSuccess()
        return { ...p, status: nextStatus }
      }
      return p
    }))
  }

  // Simular pedido nuevo para demo
  useEffect(() => {
    const timer = setTimeout(() => {
      playNewOrder()
      setNewOrderFlash(true)
      setNotification('Nuevo pedido recibido — Juan Lopez')
      setTimeout(() => setNewOrderFlash(false), 1000)
      setTimeout(() => setNotification(null), 4000)
      setPedidos(prev => [{
        id: '3',
        hora: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        tiempo: 'Ahora',
        productos: [{ nombre: 'Kilo de carne', cantidad: 1, nota: 'tortillas de harina', precio: 600 }],
        tipo: 'Recoger',
        cliente: 'Juan Lopez',
        telefono: '+52 637 555 0000',
        total: 600,
        status: 'new'
      }, ...prev])
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ position: 'relative' }}>

      {/* Flash de nuevo pedido */}
      <AnimatePresence>
        {newOrderFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(59,130,246,0.05)',
              zIndex: 50,
              pointerEvents: 'none',
              border: '1px solid rgba(59,130,246,0.2)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Notificación flotante */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -60, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -60, opacity: 0, x: '-50%' }}
            style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              zIndex: 100,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: '100px',
              padding: '0.6rem 1.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 30px rgba(59,130,246,0.2)',
              color: '#93c5fd',
              whiteSpace: 'nowrap'
            }}
          >
            + {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header del módulo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.4em',
            color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            marginBottom: '0.25rem'
          }}>
            Modulo activo
          </p>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            margin: 0
          }}>
            Pedidos en tiempo real
          </h2>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.7rem',
          color: '#10b981',
          letterSpacing: '0.1em'
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981'
            }}
          />
          EN VIVO
        </div>
      </div>

      {/* Lista de pedidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {pedidos.map((pedido, i) => {
            const nextStatus = statusFlow[pedido.status]
            const cfg = statusConfig[pedido.status]
            return (
              <motion.div
                key={pedido.id}
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: pedido.id === '3' ? 0 : i * 0.08
                }}
                whileHover={{ scale: 1.005, y: -2 }}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: `1px solid ${cfg.color}33`,
                  borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: '16px',
                  padding: '1.5rem 2rem',
                  backdropFilter: 'blur(20px)',
                  boxShadow: `0 0 30px ${cfg.glow}, 0 20px 40px rgba(0,0,0,0.3)`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Glow top */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: '20%', right: '20%',
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${cfg.color}66, transparent)`
                }} />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'start'
                }}>
                  {/* Hora */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                      {pedido.hora}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: cfg.color, margin: '2px 0 0', letterSpacing: '0.1em', fontWeight: 600 }}>
                      {pedido.tiempo}
                    </p>
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{pedido.cliente}</p>
                      <span style={{
                        background: cfg.color + '22',
                        border: `1px solid ${cfg.color}44`,
                        borderRadius: '100px',
                        padding: '0.2rem 0.75rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: cfg.color,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '100px',
                        padding: '0.2rem 0.75rem',
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '0.1em'
                      }}>
                        {pedido.tipo}
                      </span>
                    </div>

                    {pedido.productos.map((p, j) => (
                      <div key={j} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.3rem',
                        fontSize: '0.85rem'
                      }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '6px',
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.5)'
                        }}>
                          x{p.cantidad}
                        </span>
                        <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                        {p.nota ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>— {p.nota}</span> : null}
                        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                          ${p.precio * p.cantidad}
                        </span>
                      </div>
                    ))}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                        {pedido.telefono}
                      </p>
                      <p style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0 auto', color: '#fff' }}>
                        ${pedido.total} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>MXN</span>
                      </p>
                    </div>
                  </div>

                  {/* Botón */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    {nextStatus ? (
                      <motion.button
                        whileHover={{ y: -3, boxShadow: `0 8px 20px ${cfg.glow}` }}
                        whileTap={{ y: 2, scale: 0.95 }}
                        onClick={() => avanzar(pedido.id)}
                        style={{
                          background: cfg.color + '22',
                          border: `1px solid ${cfg.color}55`,
                          borderRadius: '100px',
                          padding: '0.5rem 1.25rem',
                          color: cfg.color,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {statusConfig[nextStatus].label}
                      </motion.button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}