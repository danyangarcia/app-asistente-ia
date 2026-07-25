'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Pedido = {
  id: string;
  status: 'new' | 'in_progress' | 'ready' | 'completed';
  total: number;
  items: string[];
};

export default function OrdersPage() {
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
    <div className="p-6 max-w-7xl mx-auto text-zinc-100">
      <h1 className="text-2xl font-bold mb-6 tracking-wide">Gestión de Pedidos</h1>
      
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-semibold shadow-lg z-50 flex items-center gap-2"
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
                    className="bg-zinc-100 text-zinc-950 hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {estadosUI[pedido.status].btn}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}