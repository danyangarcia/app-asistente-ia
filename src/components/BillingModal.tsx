"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';

const supabase = createClient();

interface BillingModalProps {
  slug: string;
  onClose: () => void;
}

interface PlanOption {
  id: string;
  name: string;
  price: string;
  minutes: string;
  badge?: string;
}

interface HistoryItem {
  id: string;
  period: string;
  minutes: string;
  amount: string;
  status: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  { id: 'normal', name: 'NORMAL', price: '$499 MXN/mes', minutes: '500 min incluidos' },
  { id: 'pro', name: 'PRO', price: '$999 MXN/mes', minutes: '1,200 min incluidos', badge: 'RECOMENDADO' },
  { id: 'premium', name: 'PREMIUM', price: '$1,899 MXN/mes', minutes: '3,000 min incluidos' },
];

export default function BillingModal({ slug, onClose }: BillingModalProps) {
  // Detección de Tema
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);

  // Vistas: 'main' | 'change_plan' | 'cancel_confirm' | 'add_card'
  const [currentView, setCurrentView] = useState<'main' | 'change_plan' | 'cancel_confirm' | 'add_card'>('main');

  // Estados de datos
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentPlan, setCurrentPlan] = useState({
    name: 'CARGANDO...',
    price: '$0 MXN/mes',
    consumedMin: 0,
    totalMin: 1,
    status: 'ACTIVE'
  });

  const [card, setCard] = useState<{ last4: string; brand: string } | null>({
    last4: '4242',
    brand: 'Visa'
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Formulario Tarjeta
  const [cardForm, setCardForm] = useState({ number: '', exp: '', cvv: '', name: '' });
  const [cardError, setCardError] = useState('');

  // Estilos visuales acordes al modal de Ajustes
  const theme = {
    modalBg: isDark ? '#121216' : '#ffffff',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(241, 245, 249, 0.8)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(203, 213, 225, 0.8)',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.45)' : '#64748b',
    btnBg: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
    btnHover: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'
  };

  // Cargar datos de facturación desde Supabase
  const fetchBillingData = useCallback(async () => {
    if (!slug) return;
    setFetching(true);
    try {
      // 1. Obtener datos del negocio
      const { data: business, error: busError } = await supabase
        .from('businesses')
        .select('id, plan_actual, precio_plan, "Cuenta Activa"')
        .eq('enlace del panel', slug)
        .single();

      if (busError || !business) throw busError;

      // 2. Obtener la suscripción e información del plan
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_id, plans(name, price, included_minutes)')
        .eq('business_id', business.id)
        .maybeSingle();

      // 3. Obtener periodos de facturación históricos
      const { data: periods } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      const activePeriod = periods?.[0];
      const planInfo = sub?.plans as any;

      setCurrentPlan({
        name: business.plan_actual || planInfo?.name || 'DEMO',
        price: business.precio_plan || planInfo?.price || '$0 MXN/mes',
        consumedMin: activePeriod?.consumed_minutes || 0,
        totalMin: Number(planInfo?.included_minutes) || 200,
        status: business['Cuenta Activa'] ? 'ACTIVE' : 'INACTIVE'
      });

      if (periods && periods.length > 0) {
        setHistory(
          periods.map((p: any) => ({
            id: p.id,
            period: p.start_date && p.end_date 
              ? `${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}`
              : 'Período Actual',
            minutes: `${p.included_minutes || 0} min`,
            amount: p.amount || '$0.00 MXN',
            status: p.status || 'Pagado'
          }))
        );
      }
    } catch (err) {
      console.error('Error al cargar datos de facturación:', err);
    } finally {
      setFetching(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Formateadores para la tarjeta
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardForm(prev => ({ ...prev, number: formatted }));
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardForm(prev => ({ ...prev, exp: raw }));
  };

  // Guardar cambio de plan
  const handleSelectPlan = async (plan: PlanOption) => {
    setLoading(true);

    try {
      if (slug) {
        const { data: businessData, error: busError } = await supabase
          .from('businesses')
          .select('id')
          .eq('enlace del panel', slug)
          .single();

        if (busError || !businessData) throw busError;

        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('id, included_minutes')
          .ilike('name', plan.name)
          .single();

        if (planError || !planData) throw planError;

        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ plan_id: planData.id })
          .eq('business_id', businessData.id);

        if (subError) throw subError;

        await supabase
          .from('businesses')
          .update({ 
            plan_actual: plan.name, 
            precio_plan: plan.price,
            'Cuenta Activa': true
          })
          .eq('id', businessData.id);

        await fetchBillingData();
      }
    } catch (err) {
      console.error('Error al actualizar plan en Supabase:', err);
    } finally {
      setLoading(false);
      setCurrentView('main');
    }
  };

  // Cancelar plan / Desactivar negocio
  const handleCancelBilling = async () => {
    setLoading(true);
    if (slug) {
      await supabase
        .from('businesses')
        .update({ 'Cuenta Activa': false, plan_actual: 'CANCELADO' })
        .eq('enlace del panel', slug);

      await fetchBillingData();
    }
    setLoading(false);
    setCurrentView('main');
  };

  // Guardar nueva tarjeta
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardForm.number.replace(/\s/g, '');
    if (cleanNum.length < 16 || cardForm.cvv.length < 3) {
      setCardError('Tarjeta inválida o rechazada por el banco.');
      return;
    }
    setCardError('');
    setCard({
      last4: cleanNum.slice(-4),
      brand: cleanNum.startsWith('4') ? 'Visa' : 'Mastercard'
    });
    setCardForm({ number: '', exp: '', cvv: '', name: '' });
    setCurrentView('main');
  };

  // Simular descarga de PDF de factura
  const handleDownloadPDF = (period: string) => {
    const content = `FACTURA DE SERVICIO\nNegocio: ${slug}\nPeriodo: ${period}\nEstado: PAGADO\nRFC: XAXX010101000`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_${period.replace(/\//g, '-')}.pdf`;
    a.click();
  };

  const minPercentage = Math.min(
    100,
    Math.round((currentPlan.consumedMin / (currentPlan.totalMin || 1)) * 100)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        style={{
          background: theme.modalBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          maxWidth: '850px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          color: theme.textPrimary,
          fontFamily: "'Inter', system-ui, sans-serif"
        }}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.2rem', right: '1.2rem',
            background: 'transparent', border: 'none', color: theme.textSecondary,
            fontSize: '1.2rem', cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Encabezado */}
        <div style={{ marginBottom: '1.8rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Facturación — <span style={{ color: '#10b981' }}>{slug?.toUpperCase()}</span>
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: theme.textSecondary }}>
            Gestiona tu suscripción, método de pago e historial de facturación fiscal.
          </p>
        </div>

        {/* VISTA PRINCIPAL */}
        {currentView === 'main' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
            
            {/* COLUMNA IZQUIERDA: PLAN + TARJETA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* SECCIÓN 1: PLAN ACTUAL */}
              <div style={{
                background: theme.cardBg, border: `1px solid ${theme.border}`,
                borderRadius: '14px', padding: '1.2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Plan Actual
                  </span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '100px',
                    background: currentPlan.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: currentPlan.status === 'ACTIVE' ? '#10b981' : '#f43f5e',
                    border: `1px solid ${currentPlan.status === 'ACTIVE' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`
                  }}>
                    {fetching ? '...' : currentPlan.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{currentPlan.name}</span>
                  <span style={{ fontSize: '0.85rem', color: theme.textSecondary, fontWeight: 600 }}>{currentPlan.price}</span>
                </div>

                {/* Barra de Minutos */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: theme.textSecondary, marginBottom: '0.4rem', fontWeight: 600 }}>
                    <span>Minutos Consumidos</span>
                    <span>{currentPlan.consumedMin} / {currentPlan.totalMin} min</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${minPercentage}%`,
                      height: '100%', background: '#3b82f6', borderRadius: '10px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Botones Cambiar / Cancelar */}
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => setCurrentView('change_plan')}
                    style={{
                      flex: 1, padding: '0.55rem', borderRadius: '100px', border: `1px solid ${theme.border}`,
                      background: theme.btnBg, color: theme.textPrimary, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Cambiar Plan
                  </button>
                  <button
                    onClick={() => setCurrentView('cancel_confirm')}
                    style={{
                      padding: '0.55rem 0.9rem', borderRadius: '100px', border: '1px solid rgba(244,63,94,0.3)',
                      background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* SECCIÓN 2: MÉTODO DE PAGO */}
              <div style={{
                background: theme.cardBg, border: `1px solid ${theme.border}`,
                borderRadius: '14px', padding: '1.2rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Método de Pago Guardado
                </span>

                <div style={{ margin: '0.8rem 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {card ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <div style={{
                        padding: '0.3rem 0.6rem', borderRadius: '6px', background: isDark ? '#1e293b' : '#e2e8f0',
                        fontSize: '0.75rem', fontWeight: 800
                      }}>
                        {card.brand}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                        •••• •••• •••• {card.last4}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                      No hay tarjeta vinculada.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  {card ? (
                    <button
                      onClick={() => setCard(null)}
                      style={{
                        width: '100%', padding: '0.55rem', borderRadius: '100px', border: '1px solid rgba(244,63,94,0.3)',
                        background: 'rgba(244,63,94,0.08)', color: '#f43f5e', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Eliminar Tarjeta
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentView('add_card')}
                      style={{
                        width: '100%', padding: '0.55rem', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.4)',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      + Añadir Tarjeta
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA: HISTORIAL DE PERÍODOS & FACTURAS */}
            <div style={{
              background: theme.cardBg, border: `1px solid ${theme.border}`,
              borderRadius: '14px', padding: '1.2rem', display: 'flex', flexDirection: 'column'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
                Historial de Períodos
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto', maxHeight: '250px' }}>
                {fetching ? (
                  <p style={{ fontSize: '0.78rem', color: theme.textSecondary }}>Cargando historial...</p>
                ) : history.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: theme.textSecondary, fontStyle: 'italic' }}>Sin historial registrado.</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', border: `1px solid ${theme.border}`,
                      borderRadius: '10px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>{item.period}</p>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: theme.textSecondary }}>
                          {item.minutes} incluidos — <span style={{ fontWeight: 700, color: theme.textPrimary }}>{item.amount}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleDownloadPDF(item.period)}
                        style={{
                          padding: '0.4rem 0.7rem', borderRadius: '8px', border: `1px solid ${theme.border}`,
                          background: theme.btnBg, color: theme.textPrimary, fontSize: '0.68rem', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                        title="Descargar PDF para Facturación"
                      >
                        📄 PDF
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* VISTA 2: SELECCIONAR PLAN */}
        {currentView === 'change_plan' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Selecciona un nuevo Plan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {PLAN_OPTIONS.map((p) => (
                <div key={p.id} style={{
                  background: theme.cardBg, border: `1px solid ${p.badge ? '#10b981' : theme.border}`,
                  borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative'
                }}>
                  {p.badge && (
                    <span style={{
                      position: 'absolute', top: '-10px', right: '10px', background: '#10b981', color: '#fff',
                      fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '100px'
                    }}>
                      {p.badge}
                    </span>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{p.name}</h4>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{p.price}</p>
                    <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.72rem', color: theme.textSecondary }}>{p.minutes}</p>
                  </div>
                  <button
                    onClick={() => handleSelectPlan(p)}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '0.55rem', borderRadius: '100px', border: 'none',
                      background: p.badge ? '#10b981' : theme.btnBg, color: p.badge ? '#fff' : theme.textPrimary,
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Guardando...' : 'Elegir Plan'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setCurrentView('main')} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: '0.8rem', cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>
        )}

        {/* VISTA 3: CANCELAR */}
        {currentView === 'cancel_confirm' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>¿Deseas cambiar de plan o eliminarlo?</h3>
            <p style={{ fontSize: '0.8rem', color: theme.textSecondary, maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              Al eliminar la suscripción, la cuenta del negocio pasará a inactiva y se detendrá el servicio automático.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentView('change_plan')}
                style={{
                  padding: '0.7rem 1.5rem', borderRadius: '100px', border: `1px solid ${theme.border}`,
                  background: theme.btnBg, color: theme.textPrimary, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cambiar de Plan
              </button>
              <button
                onClick={handleCancelBilling}
                disabled={loading}
                style={{
                  padding: '0.7rem 1.5rem', borderRadius: '100px', border: 'none',
                  background: '#f43f5e', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Eliminando...' : 'Eliminar Suscripción'}
              </button>
            </div>
          </div>
        )}

        {/* VISTA 4: AÑADIR TARJETA */}
        {currentView === 'add_card' && (
          <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Añadir Nueva Tarjeta</h3>
            
            <input
              type="text"
              placeholder="Nombre del Titular"
              required
              value={cardForm.name}
              onChange={e => setCardForm({ ...cardForm, name: e.target.value })}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`,
                background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', color: theme.textPrimary, outline: 'none'
              }}
            />

            <input
              type="text"
              placeholder="Número de Tarjeta (16 dígitos)"
              maxLength={19}
              required
              value={cardForm.number}
              onChange={handleCardNumberChange}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`,
                background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', color: theme.textPrimary, outline: 'none'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <input
                type="text"
                placeholder="MM/AA"
                maxLength={5}
                required
                value={cardForm.exp}
                onChange={handleExpChange}
                style={{
                  padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`,
                  background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', color: theme.textPrimary, outline: 'none'
                }}
              />
              <input
                type="password"
                placeholder="CVV"
                maxLength={4}
                required
                value={cardForm.cvv}
                onChange={e => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                style={{
                  padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`,
                  background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', color: theme.textPrimary, outline: 'none'
                }}
              />
            </div>

            {cardError && <p style={{ color: '#f43f5e', fontSize: '0.75rem', margin: 0 }}>{cardError}</p>}

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCurrentView('main')}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '100px', border: `1px solid ${theme.border}`,
                  background: theme.btnBg, color: theme.textPrimary, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '100px', border: 'none',
                  background: '#10b981', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Guardar Tarjeta
              </button>
            </div>
          </form>
        )}

        {/* Botón inferior único de cerrar */}
        {currentView === 'main' && (
          <button
            onClick={onClose}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: '100px',
              border: `1px solid ${theme.border}`,
              background: theme.btnBg,
              color: theme.textPrimary,
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer'
            }}
          >
            Cerrar Ventana
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}