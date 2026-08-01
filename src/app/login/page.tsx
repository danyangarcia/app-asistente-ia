'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    // 1. Autenticación normal con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.log("ERROR REAL DE SUPABASE AUTH:", authError)
      setErrorMessage('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // 2. Buscamos el negocio usando tu columna 'email' real
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('"enlace del panel"')
      .eq('email', email)

    if (businessError || !businessData || businessData.length === 0) {
      console.log("ERROR DE BUSQUEDA DE NEGOCIO:", businessError)
      setErrorMessage('No se encontró un negocio asociado a este usuario.')
      setLoading(false)
      return
    }

    // 3. Leemos tu columna exacta 'enlace del panel' y le quitamos espacios
    const currentBusiness = businessData[0] as any
    const rawSlug = currentBusiness['enlace del panel'] || ''
    const targetSlug = String(rawSlug).trim()

    if (!targetSlug) {
      setErrorMessage('El negocio no tiene un enlace de panel válido configurado.')
      setLoading(false)
      return
    }

    // 4. Redirección dinámica al dashboard con el texto de tu celda
    router.push(`/dashboard/${targetSlug}`)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '3rem',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', textAlign: 'center' }}>
          Acceso Plataforma
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '2rem', textAlign: 'center' }}>
          Inicia sesión en tu negocio
        </p>

        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              placeholder="tucuenta@negocio.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1rem',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '100px',
              padding: '1rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontSize: '0.8rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.2s ease, opacity 0.2s ease'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar al panel'}
          </button>
        </form>
      </div>
    </main>
  )
}