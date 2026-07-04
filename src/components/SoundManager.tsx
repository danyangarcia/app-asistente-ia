'use client'
import { useEffect } from 'react'

const createSound = (freq: number, duration: number, vol: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (e) {}
}

export const playHover = () => createSound(800, 0.05, 0.03)
export const playClick = () => createSound(600, 0.1, 0.05)
export const playSuccess = () => {
  createSound(523, 0.1, 0.05)
  setTimeout(() => createSound(659, 0.1, 0.05), 100)
  setTimeout(() => createSound(784, 0.15, 0.05), 200)
}
export const playNewOrder = () => {
  createSound(440, 0.1, 0.08)
  setTimeout(() => createSound(550, 0.1, 0.08), 150)
  setTimeout(() => createSound(660, 0.2, 0.08), 300)
}

export default function SoundManager() {
  return null
}
