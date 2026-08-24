"use client";

import { useEffect, useState } from "react";

interface Plan {
  name: string;
  price_mxn: number;
  included_minutes: number;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plans: Plan | Plan[];
}

interface BusinessData {
  id: string;
  name: string;
  subscriptions?: Subscription[];
}

export default function SubscriptionCard({ business }: { business: BusinessData }) {
  const activeSub = business?.subscriptions?.[0];
  const currentPlan = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans;

  const planName = currentPlan?.name || "Sin Plan Activo";
  const planPrice = currentPlan?.price_mxn ? `$${currentPlan.price_mxn} MXN` : "$0 MXN";
  const status = activeSub?.status || "inactivo";
  
  const renewalDate = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-white max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-zinc-300">Suscripción Actual</h3>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-white">{planName}</p>
        <p className="text-xl font-semibold text-emerald-400 mt-1">{planPrice} <span className="text-xs text-zinc-400 font-normal">/ mes</span></p>
      </div>

      <div className="pt-4 border-t border-zinc-800 text-sm text-zinc-400 space-y-2">
        <div className="flex justify-between">
          <span>Próxima renovación:</span>
          <span className="text-zinc-200 font-medium">{renewalDate}</span>
        </div>
      </div>
    </div>
  );
}