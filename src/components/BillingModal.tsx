"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';

interface BillingModalProps {
  onClose: () => void;
  slug: string;
}

export default function BillingModal({ onClose, slug }: BillingModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [usedMinutes, setUsedMinutes] = useState<number>(0);

  useEffect(() => {
    async function loadBillingData() {
      if (!slug) return;
      setLoading(true);

      try {
        // 1. Obtener datos del negocio
        const { data: bData, error: bError } = await supabase
          .from('businesses')
          .select('*')
          .eq('enlace del panel', slug)
          .single();

        if (bError || !bData) {
          console.error("Error al buscar el negocio:", bError);
          setLoading(false);
          return;
        }

        setBusiness(bData);

        // 2. Obtener la suscripción activa
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', bData.id)
          .maybeSingle();

        if (subData) {
          setSubscription(subData);

          // 3. Obtener el plan
          if (subData.plan_id) {
            const { data: planData } = await supabase
              .from('plans')
              .select('*')
              .eq('id', subData.plan_id)
              .single();
            if (planData) setPlan(planData);
          }
        }

        // 4. Historial de facturación
        const { data: periodsData } = await supabase
          .from('billing_periods')
          .select('*')
          .eq('business_id', bData.id)
          .order('created_at', { ascending: false });

        if (periodsData) setHistory(periodsData);

        // 5. Minutos consumidos
        const { data: callsData } = await supabase
          .from('vapi_calls_log')
          .select('duration_minutes')
          .eq('business_id', bData.id);

        if (callsData) {
          const totalMins = callsData.reduce((acc, call) => acc + (call.duration_minutes || 0), 0);
          setUsedMinutes(Math.round(totalMins));
        }

      } catch (err) {
        console.error("Error inesperado:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBillingData();
  }, [slug]);

  const totalAllowedMinutes = (plan?.included_minutes || 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#121212', border: '1px solid #2a2a2a', borderRadius: '16px',
          width: '100%', maxWidth: '600px', padding: '2rem', color: '#fff', maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
            Facturación — <span style={{ color: '#3b82f6' }}>{business?.["Nombre del negocio"] || slug}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>Cargando información de Supabase...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ background: '#1e1e1e', padding: '1.25rem', borderRadius: '12px', border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Plan Actual</span>
                <span style={{ 
                  background: subscription?.status === 'active' ? '#16a34a22' : '#dc262622',
                  color: subscription?.status === 'active' ? '#4ade80' : '#f87171',
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase'
                }}>
                  {subscription?.status || 'Sin plan'}
                </span>
              </div>
              
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                {plan?.name || 'PLAN NO ASIGNADO'} 
                <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'normal' }}>
                  {plan ? ` — $${plan.price_mxn} MXN/mes` : ''}
                </span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#aaa' }}>Minutos Consumidos</span>
                  <span><strong>{usedMinutes}</strong> / {totalAllowedMinutes} min</span>
                </div>
                <div style={{ background: '#333', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (usedMinutes / (totalAllowedMinutes || 1)) * 100)}%`, background: '#3b82f6', height: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#1e1e1e', padding: '1.25rem', borderRadius: '12px', border: '1px solid #333' }}>
              <span style={{ color: '#aaa', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Método de Pago Guardado</span>
              {subscription?.card_last_four ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💳 {subscription.card_brand?.toUpperCase() || 'Tarjeta'} terminada en <strong>**** {subscription.card_last_four}</strong></span>
                </div>
              ) : (
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>No hay tarjeta vinculada en Mercado Pago</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', color: '#aaa', marginBottom: '0.75rem' }}>Historial de Períodos</h3>
              {history.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.9rem' }}>Sin historial de períodos registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {history.map((period) => (
                    <div key={period.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #282828' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem' }}>{new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>Minutos incluidos: {period.included_minutes}</div>
                      </div>
                      {period.invoice_url && <a href={period.invoice_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem' }}>Factura</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onClose} style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '1rem' }}>
              Cerrar Ventana
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}