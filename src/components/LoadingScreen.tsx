'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function LoadingScreen({ businessName }: { businessName: string }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#0a0a0a'
        }}>
          {/* Mitad superior */}
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '50%',
              background: '#0a0a0a',
              zIndex: 2
            }}
          />

          {/* Mitad inferior */}
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: '50%',
              background: '#0a0a0a',
              zIndex: 2
            }}
          />

          {/* Nombre del negocio en 3D */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ zIndex: 3, textAlign: 'center' }}
          >
            <h1 style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#ffffff',
              textShadow: `
                0px 1px 0px #cccccc,
                0px 2px 0px #bbbbbb,
                0px 3px 0px #aaaaaa,
                0px 4px 0px #999999,
                0px 5px 0px #888888,
                0px 6px 1px rgba(0,0,0,0.1),
                0px 0px 5px rgba(0,0,0,0.1),
                0px 1px 3px rgba(0,0,0,0.3),
                0px 3px 5px rgba(0,0,0,0.2),
                0px 5px 10px rgba(0,0,0,0.25),
                0px 10px 10px rgba(0,0,0,0.2),
                0px 20px 20px rgba(0,0,0,0.15)
              `,
              margin: 0,
              lineHeight: 1
            }}>
              {businessName}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{
