'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function Cursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [clicking, setClicking] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    const down = () => setClicking(true)
    const up = () => setClicking(false)

    const checkHover = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      setHovering(
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.style.cursor === 'pointer' ||
        !!el.closest('button') ||
        !!el.closest('a')
      )
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mousemove', checkHover)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousemove', checkHover)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  return (
    <>
      <motion.div
        animate={{ x: pos.x - 4, y: pos.y - 4, scale: clicking ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 800, damping: 30 }}
        style={{
          position: 'fixed',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#fff',
          zIndex: 99999,
          pointerEvents: 'none',
          mixBlendMode: 'difference'
        }}
      />
      <motion.div
        animate={{
          x: pos.x - 20,
          y: pos.y - 20,
          scale: hovering ? 1.8 : clicking ? 0.8 : 1,
          opacity: hovering ? 0.6 : 0.3
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{
          position: 'fixed',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.6)',
          zIndex: 99998,
          pointerEvents: 'none',
          mixBlendMode: 'difference'
        }}
      />
    </>
  )
}