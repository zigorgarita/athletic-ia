'use client';
import React from 'react';
import { CloudOff } from 'lucide-react';

/**
 * DieLigenTab — Fase 1 (solo visual)
 *
 * Muestra un estado vacío informativo. No conecta ninguna API,
 * no guarda datos, no introduce datos ficticios.
 * La integración real con Die Ligen se abordará en fases posteriores.
 */
export function DieLigenTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in duration-300">
      {/* Icono */}
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          <CloudOff className="h-8 w-8 text-slate-600" />
        </div>
        {/* Badge de estado */}
        <span className="absolute -top-2 -right-2 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
          Pendiente de conexión
        </span>
      </div>

      {/* Título */}
      <h3 className="text-base font-bold text-slate-200 mb-2">
        Sin partidos de Die Ligen
      </h3>

      {/* Descripción */}
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        Cuando haya partidos sincronizados aparecerán aquí para analizarlos,
        revisar sus conclusiones y aprobarlas.
      </p>
    </div>
  );
}
