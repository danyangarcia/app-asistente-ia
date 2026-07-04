'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const statusConfig: Record<string, { label: string; color: string; glow: string }> = {
  new: { label: 'Nuevo', color: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
  in_progress: { label: 'En preparacion', color: '#f59e0b', glow: 'rgba(245,158,11,0.2)' },
  ready: { label: 'Listo', color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
  completed: { label: 'Completado', color: '#374151', glow: 'rgba(55,65,81,0.1)' }
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
      { nombre: 'Coca Cola', cantidad: 2, nota: '', precio: 0 }
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
  const [flash, setFlash] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const avanzar = (id: string) => {
    setPedidos(prev => prev.map(p =>
      p.id === id && statusFlow[p.status]
        ? { ...p, status: statusFlow[p.status] }
        : p
    ))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setFlash(true)
      setNotification('Nuevo pedido — Juan Lopez')
      setTimeout(() => setFlash(false), 800)
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
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.15)',
              zIndex: 50,
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -50, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              zIndex: 100,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '100px',
              padding: '0.6rem 1.5rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 30px rgba(239,68,68,0.15)',
              color: '#fca5a5',
              whiteSpace: 'nowrap'
            }}
          >
            + {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <p style={{
            fontSize: '0.62rem',
            letterSpacing: '0.4em',
            color: 'rgba(255,255,255,0.18)',
            textTransform: 'uppercase',
            marginBottom: '0.3rem'
          }}>
            Modulo activo
          </p>
          <h2 style={{
            fontSize: '1rem',
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
          fontSize: '0.65rem',
          color: '#10b981',
          letterSpacing: '0.15em',
          fontWeight: 600
        }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}
          />
          EN VIVO
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <AnimatePresence>
          {pedidos.map((pedido, i) => {
            const nextStatus = statusFlow[pedido.status]
            const cfg = statusConfig[pedido.status]
            const nextCfg = nextStatus ? statusConfig[nextStatus] : null
            return (
              <motion.div
                key={pedido.id}
                initial={{ opacity: 0, y: -30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 28,
                  delay: pedido.id === '3' ? 0 : i * 0.06
                }}
                whileHover={{ y: -2, scale: 1.003 }}
                style={{
                  background: 'rgba(255,255,255,0.022)',
                  border: '1px solid ' + cfg.color + '28',
                  borderLeft: '2px solid ' + cfg.color,
                  borderRadius: '14px',
                  padding: '1.4rem 1.8rem',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 25px ' + cfg.glow + ', 0 15px 35px rgba(0,0,0,0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '25%',
                  right: '25%',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, ' + cfg.color + '55, transparent)'
                }} />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '65px 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'start'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                      {pedido.hora}
                    </p>
                    <p style={{ fontSize: '0.62rem', color: cfg.color, margin: '3px 0 0', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {pedido.tiempo}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>
                        {pedido.cliente}
                      </p>
                      <span style={{
                        background: cfg.color + '18',
                        border: '1px solid ' + cfg.color + '35',
                        borderRadius: '100px',
                        padding: '0.18rem 0.7rem',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: cfg.color,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '100px',
                        padding: '0.18rem 0.7rem',
                        fontSize: '0.62rem',
                        color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.08em'
                      }}>
                        {pedido.tipo}
                      </span>
                    </div>

                    {pedido.productos.map((p, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.28rem', fontSize: '0.83rem' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '5px',
                          padding: '0.08rem 0.35rem',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.4)',
                          minWidth: '24px',
                          textAlign: 'center'
                        }}>
                          x{p.cantidad}
                        </span>
                        <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                          {p.nombre}
                        </span>
                        {p.nota ? (
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem' }}>
                            — {p.nota}
                          </span>
                        ) : null}
                        {p.precio > 0 ? (
                          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
                            ${p.precio * p.cantidad}
                          </span>
                        ) : null}
                      </div>
                    ))}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '0.8rem',
                      paddingTop: '0.8rem',
                      borderTop: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', margin: 0 }}>
                        {pedido.telefono}
                      </p>
                      <p style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0 auto', color: '#fff' }}>
                        ${pedido.total}
                        <span style={{ fontSize: '0.62rem', fontWeight: 400, color: 'rgba(255,255,255,0.25)', marginLeft: '4px' }}>
                          MXN
                        </span>
                      </p>
                    </div>
                  </div>

                  <div style={{ paddingTop: '2px' }}>
                    {nextCfg ? (
                      <motion.button
                        whileHover={{ y: -3, boxShadow: '0 8px 20px ' + nextCfg.glow }}
                        whileTap={{ y: 2, scale: 0.94 }}
                        onClick={() => avanzar(pedido.id)}
                        style={{
                          background: nextCfg.color + '18',
                          border: '1px solid ' + nextCfg.color + '35',
                          borderRadius: '100px',
                          padding: '0.5rem 1.2rem',
                          color: nextCfg.color,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {nextCfg.label}
                      </motion.button>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>
                        Finalizado
                      </span>
                    )}
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