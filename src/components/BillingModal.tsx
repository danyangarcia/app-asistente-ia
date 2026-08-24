"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Plan {
  id?: string;
  name: string;
  price_mxn: number;
}

interface Subscription {
  status: string;
  current_period_end: string;
  card_last_four?: string;
  card_brand?: string;
  plans: Plan | Plan[];
}

interface BillingPeriod {
  id: string;
  start_date: string;
  end_date: string;
  invoice_url?: string;
}

interface BusinessData {
  id: string;
  subscriptions?: Subscription[];
  billing_periods?: BillingPeriod[];
}

export default function ModalFacturacion({ onClose, slug = "tacos-luis" }: { onClose: () => void; slug?: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  
  const [datosPlan, setDatosPlan] = useState({
    nombre: "Cargando...",
    precio: "0",
    fechaRenovacion: "Calculando...",
    estado: "Inactiva"
  });
  
  const [historial, setHistorial] = useState<BillingPeriod[]>([]);
  const [tarjeta, setTarjeta] = useState<{ ultimos4: string | null; marca: string }>({ ultimos4: null, marca: "VISA / MC" });

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(`
            id,
            subscriptions (
              status,
              current_period_end,
              card_last_four,
              card_brand,
              plans (
                id,
                name,
                price_mxn
              )
            ),
            billing_periods (
              id,
              start_date,
              end_date,
              invoice_url
            )
          `)
          .eq('enlace del panel', slug)
          .single();

        if (error) throw error;

        const business = data as unknown as BusinessData;
        const activeSub = business?.subscriptions?.[0];
        const currentPlan = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans;

        if (currentPlan && activeSub) {
          setDatosPlan({
            nombre: currentPlan.name,
            precio: currentPlan.price_mxn.toString(),
            fechaRenovacion: new Date(activeSub.current_period_end).toLocaleDateString('es-MX', { 
              day: 'numeric', month: 'short', year: 'numeric' 
            }),
            estado: activeSub.status
          });

          setTarjeta({
            ultimos4: activeSub.card_last_four || null,
            marca: activeSub.card_brand || "Tarjeta de Crédito/Débito"
          });
        } else {
          setDatosPlan({ nombre: "Sin Plan", precio: "0", fechaRenovacion: "No configurada", estado: "Inactiva" });
        }

        if (business?.billing_periods) {
          setHistorial(business.billing_periods);
        }
      } catch (err) {
        console.error("Error cargando datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [slug]);

  const handleIniciarPago = async () => {
    setProcesandoPago(true);
    try {
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: `Plan ${datosPlan.nombre}`,
          price: datosPlan.precio !== "0" ? datosPlan.precio : 499
        })
      });

      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("No se pudo iniciar el proceso de pago.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al procesar el pago.");
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleCancelarPlan = () => {
    if (confirm("¿Estás seguro de que deseas cancelar tu suscripción?")) {
      alert("Para cancelar definitivamente, por favor ponte en contacto con soporte.");
    }
  };

  const handleEliminarTarjeta = () => {
    if (confirm("¿Deseas desvincular este método de pago?")) {
      setTarjeta({ ultimos4: null, marca: "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#151517] border border-zinc-800 rounded-2xl w-full max-w-4xl p-8 relative shadow-2xl flex flex-col md:flex-row gap-6">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 transition">
          ✕
        </button>

        <div className="flex-1 space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              💳 Planes y Facturación
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Gestiona tu método de pago y tu plan mensual.</p>
          </div>

          <div className="bg-[#1c1c1e] border border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Suscripción {datosPlan.estado}
                </p>
                <h3 className="text-2xl font-bold text-white">{loading ? "..." : datosPlan.nombre}</h3>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">${loading ? "0" : datosPlan.precio}<span className="text-xs text-zinc-400 font-normal">/mes</span></p>
              </div>
            </div>

            <div className="border-t border-zinc-800 my-4 pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 font-bold mb-1">PRÓXIMA FECHA DE COBRO</p>
                <p className="text-white text-sm font-medium">{loading ? "..." : datosPlan.fechaRenovacion}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold">
                Al día
              </span>
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
              <button 
                onClick={handleIniciarPago} 
                disabled={procesandoPago}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2 rounded-lg font-medium transition disabled:opacity-50"
              >
                {procesandoPago ? "Cargando..." : "Cambiar Plan"}
              </button>
              <button onClick={handleCancelarPlan} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm py-2 rounded-lg font-medium transition">
                Cancelar Plan
              </button>
            </div>
          </div>

          <div className="bg-[#1c1c1e] border border-zinc-800 rounded-xl p-5">
            <p className="text-xs text-zinc-500 font-bold mb-3 uppercase">Método de pago</p>
            
            {tarjeta.ultimos4 ? (
              <div className="bg-[#151517] border border-zinc-800 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-white text-sm">{tarjeta.marca}</p>
                  <p className="text-xs text-zinc-400">Crédito / Débito</p>
                </div>
                <p className="text-xl text-white tracking-widest font-mono mt-2">
                  •••• •••• •••• {tarjeta.ultimos4}
                </p>
                <div className="flex gap-3 mt-2">
                  <button onClick={handleIniciarPago} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-lg font-medium transition">
                    Actualizar Tarjeta
                  </button>
                  <button onClick={handleEliminarTarjeta} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs px-4 py-2 rounded-lg font-medium transition">
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleIniciarPago} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 border-dashed text-sm py-6 rounded-lg font-medium transition flex justify-center items-center gap-2">
                + Agregar Método de Pago
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#1c1c1e] border border-zinc-800 rounded-xl p-6 flex flex-col h-full">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4">Historial y Comprobantes</h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? (
              <p className="text-zinc-500 text-sm">Cargando historial...</p>
            ) : historial.length > 0 ? (
              historial.map((periodo) => (
                <div key={periodo.id} className="flex items-center justify-between bg-[#151517] border border-zinc-800 p-3 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {new Date(periodo.start_date).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-zinc-400 text-xs">Cobro procesado</p>
                  </div>
                  {periodo.invoice_url ? (
                    <a 
                      href={periodo.invoice_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-400 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded flex items-center gap-2 transition"
                    >
                      📄 Descargar
                    </a>
                  ) : (
                    <span className="text-zinc-500 text-xs">Sin PDF</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm text-center mt-10">No hay cobros registrados aún.</p>
            )}
          </div>
          
          <div className="pt-4 mt-4 border-t border-zinc-800">
            <button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition">
              CERRAR VENTANA
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}