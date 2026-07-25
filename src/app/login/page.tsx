'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Cambiamos la ruta a la forma estándar de Next.js
import { createClient } from '@/lib/supabaseClient';

// --- TIPOS DE DATOS ---
type Pedido = {
  id: string;
  status: 'new' | 'in_progress' | 'ready' | 'completed';
  total: number;
  items: string[];
};

type MenuItem = {
  id: number;
  nombre: string;
  precio: number;
  disponible: boolean;
};

export default function DashboardPage() {
  const [vistaActiva, setVistaActiva] = useState<'orders' | 'settings'>('orders');
  const [negocioNombre, setNegocioNombre] = useState<string>('Cargando...');

  useEffect(() => {
    async function obtenerDatosDelNegocio() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('negocios')
            .select('nombre_negocio')
            .eq('user_id', user.id)
            .single();
            
          if (data && !error) {
            setNegocioNombre(data.nombre_negocio.toUpperCase());
          } else {
            setNegocioNombre('TACOS LUIS');
          }
        } else {
          setNegocioNombre('TACOS LUIS (MODO PRUEBA)');
        }
      } catch (error) {
        setNegocioNombre('TACOS LUIS (SIN CONEXIÓN)');
      }
    }
    
    obtenerDatosDelNegocio();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wider text-zinc-100">
            {negocioNombre}
          </h1>
          <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setVistaActiva('orders')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vistaActiva === 'orders' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setVistaActiva('settings')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vistaActiva === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Administración
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {vistaActiva === 'orders' ? (
            <VistaPedidos key="orders" />
          ) : (
            <VistaSettings key="settings" />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function VistaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([
    { id: '101', status: 'in_progress', total: 24.50, items: ['2x Tacos al Pastor', '1x Refresco'] },
    { id: '102', status: 'ready', total: 12.00, items: ['1x Burrito Asada'] }
  ]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPedidos(prev => [
        { id: '103', status: 'new', total: 35.00, items: ['3x Quesadillas', '2x Agua Fresca'] },
        ...prev
      ]);
      setToast('¡Nuevo pedido recibido!');
      setTimeout(() => setToast(null), 4000);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const avanzarEstado = (id: string, estadoActual: Pedido['status']) => {
    const flujo: Record<string, Pedido['status']> = { 
      'new': 'in_progress', 
      'in_progress': 'ready', 
      'ready': 'completed' 
    };
    const siguiente = flujo[estadoActual];
    if (siguiente) {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: siguiente } : p));
    }
  };

  const estadosUI: Record<Pedido['status'], { color: string, label: string, btn: string | null }> = {
    new: { color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', label: 'Nuevo', btn: 'Preparar' },
    in_progress: { color: 'border-amber-500/50 bg-amber-500/10 text-amber-400', label: 'En Progreso', btn: 'Listo' },
    ready: { color: 'border-blue-500/50 bg-blue-500/10 text-blue-400', label: 'Listo', btn: 'Entregar' },
    completed: { color: 'border-zinc-700 bg-zinc-900 text-zinc-500', label: 'Entregado', btn: null }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-semibold shadow-lg z-50 flex items-center gap-2"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {pedidos.filter(p => p.status !== 'completed').map((pedido) => (
            <motion.div
              key={pedido.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xl font-bold text-zinc-100">#{pedido.id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${estadosUI[pedido.status].color}`}>
                    {estadosUI[pedido.status].label}
                  </span>
                </div>
                <ul className="space-y-2 mb-6 text-zinc-300">
                  {pedido.items.map((item, i) => (
                    <li key={i} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-auto">
                <span className="text-lg font-bold text-zinc-100">${pedido.total.toFixed(2)}</span>
                {estadosUI[pedido.status].btn && (
                  <button
                    onClick={() => avanzarEstado(pedido.id, pedido.status)}
                    className="bg-zinc-100 text-zinc-950 hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {estadosUI[pedido.status].btn}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function VistaSettings() {
  const stats = [
    { label: 'Ventas Hoy', value: '$450.00' },
    { label: 'Pedidos Completados', value: '32' },
    { label: 'Ticket Promedio', value: '$14.06' }
  ];

  const [menu, setMenu] = useState<MenuItem[]>([
    { id: 1, nombre: 'Tacos al Pastor', precio: 12.00, disponible: true },
    { id: 2, nombre: 'Burrito Asada', precio: 15.50, disponible: true },
    { id: 3, nombre: 'Agua Fresca', precio: 4.00, disponible: false }
  ]);

  const toggleDisponible = (id: number) => {
    setMenu(prev => prev.map(item => item.id === id ? { ...item, disponible: !item.disponible } : item));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <section>
        <h2 className="text-xl font-semibold mb-4 text-zinc-100">Resumen del Día</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <p className="text-sm text-zinc-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-zinc-100">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-zinc-100">Gestión de Menú</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {menu.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-5 ${index !== menu.length - 1 ? 'border-b border-zinc-800' : ''}`}
            >
              <div>
                <h3 className="font-medium text-zinc-100">{item.nombre}</h3>
                <p className="text-zinc-400 text-sm">${item.precio.toFixed(2)}</p>
              </div>
              <button
                onClick={() => toggleDisponible(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  item.disponible 
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {item.disponible ? 'Disponible' : 'Agotado'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}