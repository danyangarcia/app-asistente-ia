'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const messages = [
  'Conectando Base de Datos...',
  'Inicializando IA...',
  'Conectando APIs...',
  'Sincronizando información...',
  'Cargando recursos...',
  'Preparando interfaz...',
]

export default function LoadingScreen({ businessName }: { businessName: string }) {
  const [phase, setPhase] = useState<'loading' | 'opening' | 'done'>('loading')
  const [progress, setProgress] = useState(0)
  const [currentMsg, setCurrentMsg] = useState(0)
  const [doneMessages, setDoneMessages] = useState<number[]>([])

  useEffect(() => {
    let msg = 0
    let prog = 0

    const interval = setInterval(() => {
      prog += 100 / messages.length
      setProgress(Math.min(prog, 100))
      setDoneMessages(prev => [...prev, msg])
      msg++
      setCurrentMsg(msg)

      if (msg >= messages.length) {
        clearInterval(interval)
        setTimeout(() => setPhase('opening'), 600)
        setTimeout(() => setPhase('done'), 1800)
      }
    }, 400)

    return () => clearInterval(interval)
  }, [])

  if (phase === 'done') return null

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Mitad superior que se abre */}
        <AnimatePresence>
          {phase === 'opening' && (
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: '-100%' }}
              transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1] }}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '50%',
                background: '#000',
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          )}
        </AnimatePresence>

        {/* Mitad inferior que se abre */}
        <AnimatePresence>
          {phase === 'opening' && (
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: '100%' }}
              transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1] }}
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '50%',
                background: '#000',
                zIndex: 10,
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          )}
        </AnimatePresence>

        {/* Contenido central */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3rem',
            zIndex: 5,
            width: '100%',
            maxWidth: '500px',
            padding: '0 2rem'
          }}
        >
          {/* Nombre del negocio */}
          <motion.h1
            animate={{
              textShadow: [
                '0 0 20px rgba(255,255,255,0.1)',
                '0 0 40px rgba(255,255,255,0.3)',
                '0 0 20px rgba(255,255,255,0.1)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontSize: 'clamp(2rem, 8vw, 5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#fff',
              margin: 0,
              textAlign: 'center',
              textShadow: '0 2px 0 #333, 0 4px 0 #222, 0 8px 20px rgba(0,0,0,0.8)'
            }}
          >
            {businessName}
          </motion.h1>

          {/* Mensajes de carga */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: i <= currentMsg ? 1 : 0.2,
                  x: 0
                }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  color: doneMessages.includes(i) ? '#fff' : 'rgba(255,255,255,0.2)'
                }}
              >
                <motion.span
                  animate={doneMessages.includes(i) ? {
                    color: '#10b981',
                    scale: [1, 1.3, 1]
                  } : {}}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: '0.7rem', width: '16px', textAlign: 'center' }}
                >
                  {doneMessages.includes(i) ? '✓' : '○'}
                </motion.span>
                {msg}
              </motion.div>
            ))}
          </div>

          {/* Barra de progreso */}
          <div style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '100px',
            overflow: 'hidden'
          }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.3), #fff)',
                borderRadius: '100px',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)'
              }}
            />
          </div>

          {/* Porcentaje */}
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
              textTransform: 'uppercase'
            }}
          >
            {Math.round(progress)}%
          </motion.p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}