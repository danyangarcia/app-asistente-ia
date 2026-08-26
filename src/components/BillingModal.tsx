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
  priceNum: number;
  includedMinutesNum: number;
  isRecommended?: boolean;
}

interface HistoryItem {
  id: string;
  period: string;
  minutes: string;
  amount: string;
  status: string;
}

export default function BillingModal({ slug, onClose }: BillingModalProps) {
  // Detección de Tema
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);

  // Vistas: 'main' | 'change_plan' | 'confirm_plan' | 'cancel_confirm' | 'add_card'
  const [currentView, setCurrentView] = useState<'main' | 'change_plan' | 'confirm_plan' | 'cancel_confirm' | 'add_card'>('main');

  // Estados de datos
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentPlan, setCurrentPlan] = useState({
    name: '---',
    price: '---',
    consumedMin: 0,
    totalMin: 0,
    status: '---',
    nextChargeDate: null as string | null,
  });
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [selectedPlanForConfirm, setSelectedPlanForConfirm] = useState<PlanOption | null>(null);

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
      const [{ data: plans, error: plansError }, metricsResponse] = await Promise.all([
        supabase
          .from('plans')
          .select('id, name, price_mxn, included_minutes')
          .eq('is_active', true)
          .gt('price_mxn', 0)
          .order('price_mxn', { ascending: true }),
        fetch(`/api/metrics?business_slug=${encodeURIComponent(slug)}`),
      ]);

      if (plansError) throw plansError;
      if (!metricsResponse.ok) throw new Error('No se pudo obtener el resumen de facturación');

      const billing = await metricsResponse.json();

      // Filtrar planes comerciales activos (precio > 0 para excluir Demo/pruebas)
      const commercialPlans = (plans || []).filter(p => Number(p.price_mxn) > 0);
      const recommendedIndex = commercialPlans.length === 3 ? 1 : -1;

      setAvailablePlans(
        commercialPlans.map((plan, idx) => ({
          id: plan.id,
          name: plan.name,
          price: `$${Number(plan.price_mxn).toLocaleString('es-MX')} MXN/mes`,
          minutes: `${Number(plan.included_minutes).toLocaleString('es-MX')} min incluidos`,
          priceNum: Number(plan.price_mxn),
          includedMinutesNum: Number(plan.included_minutes),
          isRecommended: idx === recommendedIndex,
        }))
      );
      setCurrentPlan({
        name: billing.plan?.name || '---',
        price: billing.plan ? `$${Number(billing.plan.priceMxn).toLocaleString('es-MX')} MXN/mes` : '---',
        consumedMin: Number(billing.metrics?.usedMinutes) || 0,
        totalMin: Number(billing.metrics?.totalMinutes) || 0,
        status: billing.subscription?.status || '---',
        nextChargeDate: billing.subscription?.currentPeriodEnd || null,
      });
      setHistory([]);
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

  // Ejecutar cambio de plan en Supabase
  const executePlanChange = async (plan: PlanOption) => {
    if (!slug || !plan) return;
    setLoading(true);
    try {
      // 1. Obtener datos del negocio a partir del slug
      const { data: business, error: busError } = await supabase
        .from('businesses')
        .select('id')
        .eq('"enlace del panel"', slug)
        .maybeSingle();

      if (busError || !business) throw busError || new Error('Negocio no encontrado');

      // 2. Obtener datos completos del plan seleccionado directamente desde Supabase
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('id, name, price_mxn, included_minutes')
        .eq('id', plan.id)
        .single();

      if (planError || !planData) throw planError || new Error('Plan no encontrado');

      const businessId = business.id;
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // 3. Buscar suscripción existente
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      let subscriptionId = existingSub?.id;

      if (subscriptionId) {
        // Actualizar suscripción existente
        const { error: updateSubErr } = await supabase
          .from('subscriptions')
          .update({
            plan_id: planData.id,
            status: 'active',
          })
          .eq('id', subscriptionId);

        if (updateSubErr) throw updateSubErr;
      } else {
        // Crear suscripción si no existía
        const { data: newSub, error: insertSubErr } = await supabase
          .from('subscriptions')
          .insert({
            business_id: businessId,
            plan_id: planData.id,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: nextMonth.toISOString(),
          })
          .select('id')
          .single();

        if (insertSubErr) throw insertSubErr;
        subscriptionId = newSub.id;
      }

      // 4. Actualizar o crear billing_period activo
      const { data: existingPeriod } = await supabase
        .from('billing_periods')
        .select('id')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingPeriod) {
        const { error: updatePeriodErr } = await supabase
          .from('billing_periods')
          .update({
            included_minutes: Number(planData.included_minutes),
            subscription_id: subscriptionId,
          })
          .eq('id', existingPeriod.id);

        if (updatePeriodErr) throw updatePeriodErr;
      } else {
        const { error: insertPeriodErr } = await supabase
          .from('billing_periods')
          .insert({
            subscription_id: subscriptionId,
            business_id: businessId,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            included_minutes: Number(planData.included_minutes),
            rollover_minutes: 0,
            bonus_minutes: 0,
            is_active: true,
          });

        if (insertPeriodErr) throw insertPeriodErr;
      }

      // 5. Asegurar que la cuenta del negocio esté activa
      await supabase
        .from('businesses')
        .update({ 'Cuenta Activa': true })
        .eq('id', businessId);

      // 6. Recargar datos inmediatamente y volver a la vista principal
      await fetchBillingData();
      setSelectedPlanForConfirm(null);
      setCurrentView('main');
    } catch (err) {
      console.error('Error al cambiar plan:', err);
      alert('Hubo un error al actualizar el plan. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar suscripción (pendiente para siguiente etapa)
  const handleCancelBilling = async () => {
    // No habilitado en esta etapa
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
                <p style={{ margin: '-0.35rem 0 0.8rem', fontSize: '0.72rem', color: theme.textSecondary }}>
                  Próxima renovación: {currentPlan.nextChargeDate ? new Date(currentPlan.nextChargeDate).toLocaleDateString('es-MX') : '---'}
                </p>

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
            <div style={{ marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Selecciona un nuevo Plan</h3>
              <p style={{ fontSize: '0.78rem', color: theme.textSecondary, margin: '0.3rem 0 0 0' }}>
                Elige el plan comercial que mejor se adapte al volumen de tu negocio.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availablePlans.length || 3}, 1fr)`, gap: '0.8rem', marginBottom: '1.5rem' }}>
              {availablePlans.map((p) => {
                const isCurrent = currentPlan.name.trim().toLowerCase() === p.name.trim().toLowerCase();
                return (
                  <div key={p.id} style={{
                    background: theme.cardBg,
                    border: p.isRecommended ? '1.5px solid #10b981' : `1px solid ${theme.border}`,
                    borderRadius: '14px',
                    padding: '1.2rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: p.isRecommended ? '0 8px 20px -6px rgba(16, 185, 129, 0.25)' : 'none'
                  }}>
                    {p.isRecommended && (
                      <span style={{
                        position: 'absolute', top: '-10px', right: '12px',
                        background: '#10b981', color: '#ffffff',
                        fontSize: '0.62rem', fontWeight: 800,
                        padding: '0.2rem 0.6rem', borderRadius: '100px',
                        letterSpacing: '0.05em', textTransform: 'uppercase'
                      }}>
                        Recomendado
                      </span>
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{p.name}</h4>
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: p.isRecommended ? '#10b981' : theme.textPrimary }}>
                        {p.price}
                      </p>
                      <p style={{ margin: '0.3rem 0 1.2rem 0', fontSize: '0.75rem', color: theme.textSecondary, fontWeight: 600 }}>
                        {p.minutes}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (!isCurrent) {
                          setSelectedPlanForConfirm(p);
                          setCurrentView('confirm_plan');
                        }
                      }}
                      disabled={isCurrent || loading}
                      style={{
                        width: '100%', padding: '0.6rem', borderRadius: '100px',
                        border: isCurrent ? `1px solid ${theme.border}` : 'none',
                        background: isCurrent ? theme.btnBg : (p.isRecommended ? '#10b981' : '#3b82f6'),
                        color: isCurrent ? theme.textSecondary : '#ffffff',
                        fontSize: '0.75rem', fontWeight: 700,
                        cursor: isCurrent ? 'default' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isCurrent ? 'Plan Actual' : 'Seleccionar Plan'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentView('main')}
              style={{
                background: 'transparent', border: 'none', color: theme.textSecondary,
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}
            >
              ← Volver al resumen
            </button>
          </div>
        )}

        {/* VISTA 2.5: CONFIRMAR CAMBIO DE PLAN */}
        {currentView === 'confirm_plan' && selectedPlanForConfirm && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              ¿Confirmar cambio al plan {selectedPlanForConfirm.name}?
            </h3>
            <p style={{ fontSize: '0.82rem', color: theme.textSecondary, maxWidth: '420px', margin: '0 auto 1.2rem auto' }}>
              Tu negocio pasará a contar con <strong style={{ color: theme.textPrimary }}>{selectedPlanForConfirm.minutes}</strong> por un valor de <strong style={{ color: '#10b981' }}>{selectedPlanForConfirm.price}</strong>.
            </p>

            <div style={{
              background: theme.cardBg, border: `1px solid ${theme.border}`,
              borderRadius: '12px', padding: '1rem', maxWidth: '380px', margin: '0 auto 1.5rem auto', textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ color: theme.textSecondary }}>Plan actual:</span>
                <strong style={{ color: theme.textPrimary }}>{currentPlan.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: theme.textSecondary }}>Nuevo plan:</span>
                <strong style={{ color: '#10b981' }}>{selectedPlanForConfirm.name} ({selectedPlanForConfirm.price})</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentView('change_plan')}
                disabled={loading}
                style={{
                  padding: '0.7rem 1.5rem', borderRadius: '100px', border: `1px solid ${theme.border}`,
                  background: theme.btnBg, color: theme.textPrimary, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Volver
              </button>
              <button
                onClick={() => executePlanChange(selectedPlanForConfirm)}
                disabled={loading}
                style={{
                  padding: '0.7rem 1.8rem', borderRadius: '100px', border: 'none',
                  background: '#10b981', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Guardando cambio...' : 'Confirmar y Guardar'}
              </button>
            </div>
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
                disabled
                style={{
                  padding: '0.7rem 1.5rem', borderRadius: '100px', border: 'none',
                  background: '#f43f5e', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'not-allowed',
                  opacity: 0.7
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
