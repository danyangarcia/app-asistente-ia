'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'

// Inicializa cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  // Estados generales
  const [business, setBusiness] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [billingPeriods, setBillingPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(true)

  // Estados de Modales
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  
  const [showVaultDataModal, setShowVaultDataModal] = useState(false)

  // Estilos de Tema dinámicos
  const themeStyles = {
    modalBg: isDark ? '#0f172a' : '#ffffff',
    modalBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9',
    textColor: isDark ? '#f8fafc' : '#0f172a',
    subTextColor: isDark ? '#94a3b8' : '#64748b'
  }

  // 1. Cargar datos relacionados desde Supabase usando 'enlace del panel'
  useEffect(() => {
    async function fetchBusinessData() {
      if (!slug) return
      try {
        // Buscar negocio por la columna real 'enlace del panel'
        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('enlace del panel', slug)
          .single()

        if (bizError) throw bizError
        if (bizData) {
          setBusiness(bizData)

          // Validar si la cuenta está activa (Columna 'Cuenta Activa')
          if (bizData['Cuenta Activa'] === false) {
            console.warn('Este negocio se encuentra inactivo.')
          }

          // Buscar suscripción asociada al business_id
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('business_id', bizData.id)
            .single()

          if (subData) {
            setSubscription(subData)

            // Buscar plan asociado
            if (subData.plan_id) {
              const { data: planData } = await supabase
                .from('plans')
                .select('*')
                .eq('id', subData.plan_id)
                .single()

              if (planData) setPlan(planData)
            }
          }

          // Buscar periodos de facturación / recibos
          const { data: billData } = await supabase
            .from('billing_periods')
            .select('*')
            .eq('business_id', bizData.id)

          if (billData) setBillingPeriods(billData)
        }
      } catch (err) {
        console.error('Error al cargar datos de Supabase:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessData()
  }, [slug])

  // 2. Lógica para verificar el PIN de seguridad ('pin_facturacion')
  const handleVerifyPin = async () => {
    if (!business) return

    const storedPin = business['pin_facturacion'] || '1234' // Respaldo por defecto si es NULL

    if (pinInput === storedPin) {
      setPinError('')
      setShowPinModal(false)
      setPinInput('')
      setShowVaultDataModal(true)
    } else {
      setPinError('PIN incorrecto. Inténtalo de nuevo.')
    }
  }

  // 3. Funciones de Facturación y Suscripción con las tablas reales
  const handleUpdateCard = async () => {
    const newDigits = prompt('Ingresa los últimos 4 dígitos de tu nueva tarjeta:')
    if (!newDigits || newDigits.length !== 4 || !subscription) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ card_last_four: newDigits })
        .eq('id', subscription.id)

      if (error) throw error

      setSubscription({ ...subscription, card_last_four: newDigits })
      alert('¡Tarjeta actualizada con éxito!')
    } catch (err) {
      console.error('Error al actualizar tarjeta:', err)
      alert('Hubo un error al actualizar la tarjeta.')
    }
  }

  const handleDeleteCard = async () => {
    if (!confirm('¿Estás seguro de eliminar la tarjeta registrada?') || !subscription) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ card_last_four: null })
        .eq('id', subscription.id)

      if (error) throw error

      setSubscription({ ...subscription, card_last_four: null })
      alert('Tarjeta eliminada correctamente.')
    } catch (err) {
      console.error('Error al eliminar tarjeta:', err)
    }
  }

  const handleChangePlan = async () => {
    const newPlanName = prompt('Escribe el nombre del nuevo plan (PRO, PREMIUM, NORMAL, DEMO):', plan?.name || '')
    if (!newPlanName) return

    try {
      // Buscar el plan en la tabla 'plans'
      const { data: targetPlan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .ilike('name', newPlanName)
        .single()

      if (planError || !targetPlan) {
        alert('No se encontró un plan con ese nombre.')
        return
      }

      // Actualizar la suscripción con el nuevo plan_id
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ plan_id: targetPlan.id })
        .eq('id', subscription.id)

      if (subError) throw subError

      setPlan(targetPlan)
      alert('¡Plan actualizado correctamente!')
    } catch (err) {
      console.error('Error al cambiar plan:', err)
      alert('No se pudo actualizar el plan.')
    }
  }

  const handleCancelBusiness = async () => {
    const confirmation = prompt('ADVERTENCIA: Esto cancelará tu suscripción y APAGARÁ el negocio inmediatamente. Escribe "CANCELAR" para confirmar:')
    if (confirmation !== 'CANCELAR') return

    try {
      // Apagar negocio cambiando 'Cuenta Activa' a false
      const { error: bizError } = await supabase
        .from('businesses')
        .update({ 'Cuenta Activa': false })
        .eq('id', business.id)

      if (bizError) throw bizError

      // Actualizar estado de la suscripción
      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription.id)
      }

      alert('El negocio ha sido desactivado y la suscripción cancelada.')
      setShowVaultDataModal(false)
      router.push('/')
    } catch (err) {
      console.error('Error al cancelar el negocio:', err)
      alert('Hubo un error al procesar la cancelación.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <p>Cargando panel de control...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#090d16' : '#f8fafc', color: themeStyles.textColor }}>
      
      {/* Barra superior */}
      <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${themeStyles.modalBorder}` }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Panel: {business?.['Nombre del negocio'] || slug}</h2>
        <button 
          onClick={() => setShowPinModal(true)}
          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
        >
          🔒 Configuración y Suscripción
        </button>
      </header>

      {/* Contenido principal */}
      <main style={{ padding: '2rem' }}>
        {children}
      </main>

      {/* Modal de PIN de Seguridad */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 110,
              background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              style={{
                background: themeStyles.modalBg,
                border: `1px solid ${themeStyles.modalBorder}`,
                borderRadius: '18px',
                padding: '2rem',
                width: '100%',
                maxWidth: '360px',
                textAlign: 'center',
                boxShadow: '0 25px 30px -10px rgba(0, 0, 0, 0.25)',
                color: themeStyles.textColor
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: 800 }}>PIN de Seguridad</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.75rem', color: themeStyles.subTextColor }}>
                Ingresa tu PIN de facturación para acceder.
              </p>

              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  if (val.length <= 4) {
                    setPinInput(val)
                    if (pinError) setPinError('')
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && pinInput.length === 4 && handleVerifyPin()}
                placeholder="••••"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '1.8rem',
                  letterSpacing: '0.5em',
                  padding: '0.6rem',
                  borderRadius: '10px',
                  border: `1px solid ${pinError ? '#f43f5e' : themeStyles.modalBorder}`,
                  background: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff',
                  color: themeStyles.textColor,
                  outline: 'none',
                  marginBottom: '0.8rem'
                }}
              />

              {pinError && (
                <p style={{ color: '#f43f5e', fontSize: '0.72rem', margin: '0 0 1rem 0', fontWeight: 600 }}>
                  {pinError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setShowPinModal(false)
                    setPinInput('')
                    setPinError('')
                  }}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                    color: themeStyles.textColor, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerifyPin}
                  disabled={pinInput.length !== 4}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                    background: pinInput.length === 4 ? '#10b981' : (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'),
                    color: pinInput.length === 4 ? '#ffffff' : themeStyles.subTextColor,
                    fontSize: '0.8rem', fontWeight: 700, cursor: pinInput.length === 4 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Desbloquear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Facturación y Suscripción */}
      <AnimatePresence>
        {showVaultDataModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.45)', 
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                background: themeStyles.modalBg,
                border: `1px solid ${themeStyles.modalBorder}`,
                borderRadius: '24px',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.45)',
                color: themeStyles.textColor
              }}
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowVaultDataModal(false)}
                style={{
                  position: 'absolute', top: '1.5rem', right: '1.5rem',
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0', 
                  border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                  color: themeStyles.textColor, fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  💳 Planes y Facturación
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: themeStyles.subTextColor }}>
                  Gestiona tu método de pago, consulta tu próximo día de cobro y descarga tus facturas.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* COLUMNA IZQUIERDA: Plan Activo y Tarjeta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Plan Activo */}
                  <div style={{
                    background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)' : '#ffffff',
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '16px', padding: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10b981' }}>
                          ● Suscripción {subscription?.status || 'Activa'}
                        </span>
                        <h3 style={{ margin: '0.3rem 0 0 0', fontSize: '1.3rem', fontWeight: 800 }}>
                          {plan?.name || 'Plan Estándar'}
                        </h3>
                      </div>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                        ${plan?.price_mxn || '0'}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: themeStyles.subTextColor }}> MXN/mes</span>
                      </span>
                    </div>

                    <hr style={{ border: 'none', borderTop: `1px solid ${themeStyles.modalBorder}`, margin: '1.2rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: themeStyles.subTextColor, textTransform: 'uppercase', fontWeight: 700 }}>
                          Próxima Fecha de Cobro
                        </p>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', fontWeight: 800 }}>
                          {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div style={{
                        background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                        color: '#059669', padding: '0.4rem 0.8rem', borderRadius: '10px',
                        fontSize: '0.75rem', fontWeight: 800
                      }}>
                        {plan?.included_minutes ? `${plan.included_minutes} mins` : 'Activo'}
                      </div>
                    </div>

                    <button
                      onClick={handleChangePlan}
                      style={{
                        marginTop: '1rem', width: '100%', padding: '0.6rem',
                        borderRadius: '10px', border: `1px solid ${themeStyles.modalBorder}`,
                        background: 'transparent', color: '#10b981',
                        fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      ⚡ Cambiar de Plan
                    </button>
                  </div>

                  {/* Método de Pago */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '16px', padding: '1.5rem'
                  }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: themeStyles.subTextColor, textTransform: 'uppercase', fontWeight: 800 }}>
                      Tarjeta Registrada
                    </p>

                    <div style={{
                      background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #0f172a 100%, #1e293b 100%)',
                      borderRadius: '12px', padding: '1.2rem', color: '#ffffff',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '110px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em' }}>{subscription?.card_brand || 'VISA / MC'}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Débito / Crédito</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', letterSpacing: '0.2em', fontWeight: 700 }}>
                        •••• •••• •••• {subscription?.card_last_four || '****'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={handleUpdateCard}
                        style={{
                          flex: 1, padding: '0.7rem',
                          borderRadius: '10px', border: `1px solid ${themeStyles.modalBorder}`,
                          background: 'transparent', color: themeStyles.textColor,
                          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Actualizar Tarjeta
                      </button>
                      <button
                        onClick={handleDeleteCard}
                        style={{
                          padding: '0.7rem 1rem',
                          borderRadius: '10px', border: '1px solid rgba(244,63,94,0.3)',
                          background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: Historial / Recibos y Zona de Peligro */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.2rem' }}>
                  
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '16px', padding: '1.5rem', flex: 1
                  }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: themeStyles.subTextColor, textTransform: 'uppercase', fontWeight: 800 }}>
                      Historial y Comprobantes Fiscales
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {billingPeriods.length > 0 ? (
                        billingPeriods.map((period) => (
                          <div key={period.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.8rem 1rem', borderRadius: '10px',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                            border: `1px solid ${themeStyles.cardBorder}`
                          }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>
                                {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                              </p>
                              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: themeStyles.subTextColor }}>
                                Minutos incluidos: {period.included_minutes}
                              </p>
                            </div>

                            {period.invoice_url ? (
                              <a
                                href={period.invoice_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.7rem', color: '#10b981', fontWeight: 800,
                                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                                  padding: '0.4rem 0.8rem', borderRadius: '6px', textDecoration: 'none'
                                }}
                              >
                                📄 Descargar
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: themeStyles.subTextColor }}>Sin factura</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: themeStyles.subTextColor }}>No hay periodos de facturación recientes.</p>
                      )}
                    </div>

                    {/* Zona de peligro / Apagar Negocio */}
                    <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '12px', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)' }}>
                      <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.75rem', fontWeight: 800, color: '#f43f5e' }}>Zona de Peligro</p>
                      <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.7rem', color: themeStyles.subTextColor }}>Cancelar tu suscripción desactivará tu cuenta de inmediato.</p>
                      <button
                        onClick={handleCancelBusiness}
                        style={{
                          width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
                          background: '#f43f5e', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                        }}
                      >
                        Cancelar Suscripción y Apagar Negocio
                      </button>
                    </div>

                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => setShowVaultDataModal(false)}
                      style={{
                        flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none',
                        background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                        color: themeStyles.textColor, fontSize: '0.8rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer'
                      }}
                    >
                      Cerrar Ventana
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}