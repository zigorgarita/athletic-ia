'use client';

import React from 'react';
import { TacticalSystem } from '@/types';
import { Layout, Info } from 'lucide-react';

interface SystemCardProps {
  system: TacticalSystem | null;
}

export function SystemCard({ system }: SystemCardProps) {
  if (!system || (!system.descripcion && !system.filosofia)) return null;

  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
        <Layout className="h-3.5 w-3.5 text-[#CC0E21]" />
        Definición del Sistema
      </h3>

      <div className="space-y-2.5 text-xs">
        {system.descripcion && (
          <div>
            <span className="font-bold text-slate-400 block mb-0.5">Esquema:</span>
            <p className="text-slate-200 leading-relaxed">{system.descripcion}</p>
          </div>
        )}

        {system.filosofia && (
          <div className="pt-1.5 border-t border-slate-850/60">
            <span className="font-bold text-[#CC0E21] block mb-0.5 flex items-center gap-1">
              <Info className="h-3 w-3" /> Filosofía Táctica:
            </span>
            <p className="text-slate-300 italic leading-relaxed">{system.filosofia}</p>
          </div>
        )}
      </div>
    </div>
  );
}
