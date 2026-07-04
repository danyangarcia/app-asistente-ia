'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const menuInicial = [
  { id: '1', categoria: 'Tacos', nombre: 'Taco de cabeza', precio: 43, disponible: true },
  { id: '2', categoria: 'Tacos', nombre: 'Taco de barbacoa', precio: 43, disponible: true },
  { id: '3', categoria: 'Tacos', nombre: 'Taco de ojo', precio: 43, disponible: true },
  { id: '4', categoria: 'Tacos', nombre: 'Taco de seso', precio: 43, disponible: true },
  { id: '5', categoria: 'Tacos', nombre: 'Taco de cachete', precio: 43, disponible: true },
  { id: '6', categoria: 'Tacos', nombre: 'Taco de lengua', precio: 50, disponible: true },
  { id: '7', categoria: 'Tacos', nombre: 'Taco de frijol', precio: 30, disponible: true },
  { id: '8', categoria: 'Tacos', nombre: 'Taco de frijol con carne', precio: 50, disponible: true },
  { id: '9', categoria: 'Quesadillas', nombre: 'Quesadilla normal', precio: 55, disponible: true },
  { id: '10', categoria: 'Quesadillas', nombre: 'Quesadilla con frijol', precio: 55, disponible: true },
  { id: '11', categoria: 'Quesadillas', nombre: 'Quesadilla con carne', precio: 70, disponible: true },
  { id: '12', categoria: 'Quesadillas', nombre: 'Quesadilla con lengua', precio: 75, disponible: true },
  { id: '13', categoria: 'Jugos y ordenes', nombre: 'Jugo bichi', precio: 30, disponible: true },
  { id: '14', categoria: 'Jugos y ordenes', nombre: 'Jugo con carne', precio: 86, disponible: true },
  { id: '15', categoria: 'Jugos y ordenes', nombre: 'Jugo con lengua', precio: 100, disponible: true },
  { id: '16', categoria: 'Jugos y ordenes', nombre: 'Media orden', precio: 129, disponible: true },
  { id: '17', categoria: 'Jugos y ordenes', nombre: 'Orden completa', precio: 172, disponible: true },
  { id: '18', categoria: 'Jugos y ordenes', nombre: 'Media orden con lengua', precio: 150, disponible: true },
  { id: '19', categoria: 'Jugos y ordenes', nombre: 'Orden de lengua', precio: 200, disponible: true },
  { id: '20', categoria: 'Bebidas calientes', nombre: 'Cafe colado', precio: 27, disponible: true },
  { id: '21', categoria: 'Bebidas calientes', nombre: 'Champurrado', precio: 27, disponible: false },
  { id: '22', categoria: 'Promociones', nombre: 'Kilo de carne', precio: 600, disponible: true },
]

const stats = [
  { label: 'Llamadas este mes', valor: 24, icono: '📞', color: '#3b82f6' },
  { label: 'Pedidos tomados', valor: 56, icono: '📦', color: '#f59e0b' },
  { label: 'Total vendido', valor: 4120, icono: '💰', color: '#10b981', prefix: '$' },
]

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1200
    const step = 16
    const increment = value / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [value])

  return <>{prefix}{display.toLocaleString()}</>
}

export default function SettingsPage() {
  const [menu, setMenu] = useState(menuInicial)
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [seccion, setSeccion] = useState<'stats' | 'menu' | 'negocio' | 'ia' | 'apariencia'>('stats')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [precioEdit, setPrecioEdit] = useState('')
  const [saved, setSaved] = useState(false)

  const categorias = [...new Set(menu.map(i => i.categoria))]

  const toggleDisponible = (id: string) => {
    setMenu(prev => prev.map(item =>
      item.id === id ? { ...item, disponible: !item.disponible } : item
    ))
  }

  const guardarPrecio = (id: string) => {
    const nuevo = parseFloat(precioEdit)
    if (!isNaN(nuevo) && nuevo > 0) {
      setMenu(prev => prev.map(item =>
        item.id === id ? { ...item, precio: nuevo } : item
      ))
    }
    setEditando(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const menuFiltrado = menu.filter(item =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  const secciones = [
    { id: 'stats', label: 'Reportes' },
    { id: 'menu', label: 'Menu' },
    { id: 'negocio', label: 'Negocio' },
    { id: 'ia', label: 'Asistente IA' },
    { id: 'apariencia', label: 'Apariencia' },
  ]

  const bg = tema === 'dark' ? '#080808' : '#f5f5f5'
  const text = tema === 'dark' ? '#fff' : '#111'
  const card = tema === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const border = tema === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const muted = tema === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'

  return (
    <div style={{ color: text }}>

      {/* Toast guardado */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ y: -40, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -40, opacity: 0, x: '-50%' }}
            style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              zIndex: 100,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '100px',
              padding: '0.6rem 1.5rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#10b981',
              backdropFilter: 'blur(20px)',
              whiteSpace: 'nowrap'
            }}
          >
            ✓ Cambios guardados
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navegación de secciones */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2.5rem',
        flexWrap: 'wrap'
      }}>
        {secciones.map(s => (
          <motion.button
            key={s.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSeccion(s.id as any)}
            style={{
              background: seccion === s.id ? 'rgba(255,255,255,0.1)' : card,
              border: `1px solid ${seccion === s.id ? 'rgba(255,255,255,0.2)' : border}`,
              borderRadius: '100px',
              padding: '0.5rem 1.25rem',
              color: seccion === s.id ? text : muted,
              fontSize: '0.75rem',
              fontWeight: seccion === s.id ? 700 : 400,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* SECCIÓN: REPORTES */}
      {seccion === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.4em', color: muted, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Resumen del mes
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3, scale: 1.02 }}
                style={{
                  background: card,
                  border: `1px solid ${stat.color}22`,
                  borderTop: `2px solid ${stat.color}`,
                  borderRadius: '14px',
                  padding: '1.5rem',
                  backdropFilter: 'blur(20px)',
                  textAlign: 'center',
                  boxShadow: `0 0 20px ${stat.color}11`
                }}
              >
                <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>{stat.icono}</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px', color: stat.color }}>
                  <AnimatedNumber value={stat.valor} prefix={stat.prefix} />
                </p>
                <p style={{ fontSize: '0.7rem', color: muted, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Historial simplificado */}
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.4em', color: muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
            Ultimos pedidos
          </p>
          {[
            { hora: '12:42', cliente: 'Lucia Martinez', total: 159, status: 'Completado' },
            { hora: '12:38', cliente: 'Carlos Ruiz', total: 150, status: 'Completado' },
            { hora: '11:55', cliente: 'Maria Lopez', total: 86, status: 'Completado' },
            { hora: '11:30', cliente: 'Roberto Silva', total: 215, status: 'Completado' },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1.2rem',
                background: card,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: muted, width: '50px' }}>{p.hora}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1, paddingLeft: '1rem' }}>{p.cliente}</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>${p.total} MXN</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* SECCIÓN: MENU */}
      {seccion === 'menu' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Buscador */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              style={{
                width: '100%',
                background: card,
                border: `1px solid ${border}`,
                borderRadius: '100px',
                padding: '0.75rem 1.5rem',
                color: text,
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Stats rápidas del menú */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total productos', valor: menu.length },
              { label: 'Disponibles', valor: menu.filter(m => m.disponible).length, color: '#10b981' },
              { label: 'Desactivados', valor: menu.filter(m => !m.disponible).length, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '0.75rem 1.25rem',
                flex: 1,
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: s.color || text }}>{s.valor}</p>
                <p style={{ fontSize: '0.65rem', color: muted, margin: 0, letterSpacing: '0.1em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Categorías y productos */}
          {categorias.map((cat, ci) => {
            const productosCat = menuFiltrado.filter(i => i.categoria === cat)
            if (productosCat.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: '2rem' }}>
                <p style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: muted,
                  marginBottom: '0.75rem'
                }}>
                  {cat}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {productosCat.map((item, ii) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (ci + ii) * 0.03 }}
                      whileHover={{ scale: 1.005 }}
                      style={{
                        background: card,
                        border: `1px solid ${border}`,
                        borderLeft: `2px solid ${item.disponible ? '#10b981' : '#374151'}`,
                        borderRadius: '10px',
                        padding: '0.9rem 1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        opacity: item.disponible ? 1 : 0.5
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{item.nombre}</p>
                        {editando === item.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <input
                              autoFocus
                              value={precioEdit}
                              onChange={e => setPrecioEdit(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && guardarPrecio(item.id)}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.5rem',
                                color: text,
                                fontSize: '0.82rem',
                                width: '80px',
                                outline: 'none'
                              }}
                            />
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => guardarPrecio(item.id)}
                              style={{
                                background: 'rgba(16,185,129,0.15)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.6rem',
                                color: '#10b981',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              ✓
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditando(null)}
                              style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '6px',
                                padding: '0.2rem 0.6rem',
                                color: '#ef4444',
                                fontSize: '0.72rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </motion.button>
                          </div>
                        ) : (
                          <p
                            onClick={() => { setEditando(item.id); setPrecioEdit(String(item.precio)) }}
                            style={{
                              margin: '2px 0 0',
                              fontSize: '0.78rem',
                              color: muted,
                              cursor: 'pointer'
                            }}
                          >
                            ${item.precio} pesos — <span style={{ color: '#3b82f6', fontSize: '0.7rem' }}>editar</span>
                          </p>
                        )}
                      </div>

                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleDisponible(item.id)}
                        style={{
                          background: item.disponible ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${item.disponible ? 'rgba(16,185,129,0.3)' : border}`,
                          borderRadius: '100px',
                          padding: '0.35rem 1rem',
                          color: item.disponible ? '#10b981' : muted,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {item.disponible ? '✓ Disponible' : '✗ Desactivado'}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* SECCIÓN: NEGOCIO */}
      {seccion === 'negocio' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.4em', color: muted, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Informacion del negocio
          </p>
          {[
            { label: 'Nombre', valor: 'Tacos Luis' },
            { label: 'Direccion', valor: 'Av. L entre calles 5 y 7, Centro, Heroica Caborca, Sonora' },
            { label: 'Telefono', valor: '+52 637 372 XXXX' },
            { label: 'Horario', valor: '7:00 AM a 3:00 PM todos los dias' },
            { label: 'Tipo de negocio', valor: 'Taqueria' },
            { label: 'Ciudad', valor: 'Caborca, Sonora, Mexico' },
          ].map((campo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '1rem 1.5rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.72rem', color: muted, letterSpacing: '0.05em' }}>{campo.label}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{campo.valor}</p>
            </motion.div>
          ))}

          <div style={{
            marginTop: '1.5rem',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '10px',
            padding: '1rem 1.5rem',
            fontSize: '0.78rem',
            color: '#93c5fd'
          }}>
            Para editar la informacion del negocio contacta al administrador del sistema.
          </div>
        </motion.div>
      )}

      {/* SECCIÓN: ASISTENTE IA */}
      {seccion === 'ia' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.4em', color: muted, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Estado del asistente
          </p>

          {[
            { label: 'Estado', valor: 'Activo', color: '#10b981' },
            { label: 'Nombre del asistente', valor: 'Gaby' },
            { label: 'Idioma', valor: 'Espanol mexicano' },
            { label: 'Numero de telefono', valor: '+1 (628) 241-4001' },
            { label: 'Proveedor de voz', valor: 'ElevenLabs' },
            { label: 'Modelo IA', valor: 'Claude Haiku' },
            { label: 'Llamadas este mes', valor: '24' },
            { label: 'Minutos usados', valor: '48 min' },
            { label: 'Costo estimado', valor: '$4.80 USD' },
          ].map((campo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '1rem 1.5rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.72rem', color: muted }}>{campo.label}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: campo.color || text }}>
                {campo.label === 'Estado' && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: '6px', verticalAlign: 'middle' }}
                  />
                )}
                {campo.valor}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* SECCIÓN: APARIENCIA */}
      {seccion === 'apariencia' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.4em', color: muted, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Preferencias visuales
          </p>

          {/* Switch tema */}
          <div style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>Tema</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: muted }}>
                {tema === 'dark' ? 'Modo oscuro activo' : 'Modo claro activo'}
              </p>
            </div>
            <motion.div
              onClick={() => setTema(t => t === 'dark' ? 'light' : 'dark')}
              style={{
                width: 52,
                height: 28,
                borderRadius: '100px',
                background: tema === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                border: `1px solid ${tema === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px'
              }}
            >
              <motion.div
                animate={{ x: tema === 'light' ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              />
            </motion.div>
          </div>

          {/* Colores de acento */}
          <div style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            marginBottom: '0.75rem'
          }}>
            <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.88rem' }}>Color de acento</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#fff'].map(color => (
                <motion.div
                  key={color}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.1)',
                    boxShadow: `0 0 12px ${color}44`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
            padding: '1rem 1.5rem',
            fontSize: '0.78rem',
            color: '#fcd34d'
          }}>
            Mas opciones de personalizacion disponibles en el plan Pro.
          </div>
        </motion.div>
      )}
    </div>
  )
}