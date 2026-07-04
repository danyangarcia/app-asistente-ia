'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'

const pedidosEjemplo = [
  {
    id: '1',
    hora: '12:42',
    productos: [{ nombre: 'Taco de cabeza', cantidad: 3, nota: 'sin cebolla' }],
    tipo: 'Recoger',
    cliente: 'Lucía',
    telefono: '+52 637 ...',
    status: 'new'
  },
  {
    id: '2',
    hora: '12:38',
    productos: [
      { nombre: 'Quesadilla con lengua', cantidad: 2, nota: '' },
      { nombre: 'Agua de horchata', cantidad: 1, nota: '' }
    ],
    tipo: 'Domicilio',
    cliente: 'Carlos',
    telefono: '+52 637 ...',
    status: 'new'
  }
]

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: '#3b82f6' },
  in_progress: { label: 'En preparación', color: '#f59e0b' },
  ready: { label: 'Listo', color: '#10b981' },
  completed: { label: 'Completado', color: '#6b7280' }
}

const statusFlow: Record<string, string> = {
  new: 'in_progress',
  in_progress: 'ready',
  ready: 'completed'
}

export default function OrdersPage() {
  const [pedidos, setPedidos] = useState(pedidosEjemplo)

  const avanzar = (id: string) => {
    setPedidos(prev => prev.map(p =>
      p.id === id && statusFlow[p.status]
        ? { ...p, status: statusFlow[p.status] }
        : p
    ))
  }

  return (
    <div>
      <h2 style={{
        fontSize: '0.75rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: '#555',
        marginBottom: '1.5rem'
      }}>
        Pedidos en tiempo real
      </h2>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {pedidos.map((pedido, i) => (
          <motion.div
            key={pedido.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.01 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
              display: 'grid',
              gridTemplateColumns: '80px 1fr auto auto',
              gap: '1rem',
              alignItems: 'center'
            }}
          >
            {/* Hora */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{pedido.hora}</p>
              <p style={{ fontSize: '0.7rem', color: '#555', margin: 0, letterSpacing: '0.1em' }}>AHORA</p>
            </div>

            {/* Productos */}
            <div>
              {pedido.productos.map((p, j) => (
                <p key={j} style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                  <span style={{ color: '#888' }}> ×{p.cantidad}</span>
                  {p.nota && <span style={{ color: '#555', fontSize: '0.8rem' }}> — {p.nota}</span>}
                </p>
              ))}
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#555' }}>
                {pedido.tipo} · {pedido.cliente} · {pedido.telefono}
              </p>
            </div>

            {/* Status */}
            <div style={{
              background: statusConfig[pedido.status].color + '22',
              border: `1px solid ${statusConfig[pedido.status].color}44`,
              borderRadius: '100px',
              padding: '0.4rem 1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: statusConfig[pedido.status].color,
              whiteSpace: 'nowrap'
            }}>
              {statusConfig[pedido.status].label}
            </div>

            {/* Botón avanzar */}
            {statusFlow[pedido.status] && (
              <motion.button
                whileHover={{ y: -2, boxShadow: '0 4px 15px rgba(255,255,255,0.1)' }}
                whileTap={{ y: 2, scale: 0.96 }}
                onClick={() => avanzar(pedido.id)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '100px',
                  padding: '0.4rem 1.2rem',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                → {statusConfig[statusFlow[pedido.status]].label}
              </motion.button>