'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'

const menuEjemplo = [
  { id: '1', categoria: 'Tacos', nombre: 'Taco de cabeza', precio: 43, disponible: true },
  { id: '2', categoria: 'Tacos', nombre: 'Taco de barbacoa', precio: 43, disponible: true },
  { id: '3', categoria: 'Tacos', nombre: 'Taco de lengua', precio: 50, disponible: true },
  { id: '4', categoria: 'Quesadillas', nombre: 'Quesadilla con carne', precio: 70, disponible: true },
  { id: '5', categoria: 'Quesadillas', nombre: 'Quesadilla con lengua', precio: 75, disponible: false },
  { id: '6', categoria: 'Promociones', nombre: 'Kilo de carne', precio: 600, disponible: true },
]

export default function SettingsPage() {
  const [menu, setMenu] = useState(menuEjemplo)

  const toggleDisponible = (id: string) => {
    setMenu(prev => prev.map(item =>
      item.id === id ? { ...item, disponible: !item.disponible } : item
    ))
  }

  const categorias = [...new Set(menu.map(i => i.categoria))]

  return (
    <div>
      {/* Reportes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '2.5rem'
      }}>
        {[
          { label: 'Llamadas este mes', valor: '24', icono: '📞' },
          { label: 'Pedidos tomados', valor: '56', icono: '📦' },
          { label: 'Total vendido', valor: '$4,120', icono: '💰' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>{stat.icono}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 4px' }}>{stat.valor}</p>
            <p style={{ fontSize: '0.75rem', color: '#555', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Editor de menú */}
      <h2 style={{
        fontSize: '0.75rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: '#555',
        marginBottom: '1.5rem'
      }}>
        Editor de menú
      </h2>

      {categorias.map((cat, ci) => (
        <div key={cat} style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#444',
            marginBottom: '0.75rem'
          }}>
            {cat}
          </p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {menu.filter(i => i.categoria === cat).map((item, ii) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (ci + ii) * 0.05 }}
                whileHover={{ scale: 1.01 }}
                style={{
                  background: item.disponible
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: item.disponible ? 1 : 0.4
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{item.nombre}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>${item.precio} pesos</p>
                </div>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleDisponible(item.id)}
                  style={{
                    background: item.disponible
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${item.disponible ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '100px',
                    padding: '0.35rem 1rem',
                    color: item.disponible ? '#10b981' : '#555',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    letterSpacing: '0.05em'
                  }}
                >
                  {item.disponible ? '✓ Disponible' : '✗ Desactivado'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
