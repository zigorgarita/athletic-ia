'use client';

import React from 'react';
import { TacticalSystem } from '@/types';

interface FormationSelectorProps {
  label: string;
  systems: TacticalSystem[];
  selectedFormation: string;
  onSelect: (formationName: string) => void;
}

export function FormationSelector({
  label,
  systems,
  selectedFormation,
  onSelect,
}: FormationSelectorProps) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <label className="block text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {systems.map((system) => {
          const isActive = selectedFormation === system.nombre;
          return (
            <button
              key={system.id}
              onClick={() => onSelect(system.nombre)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                isActive
                  ? 'bg-[#CC0E21]/10 border-[#CC0E21]/30 text-[#CC0E21] shadow-md shadow-red-500/5'
                  : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
              }`}
            >
              {system.nombre}
            </button>
          );
        })}
        {systems.length === 0 && (
          <span className="text-xs text-slate-500 italic">Cargando formaciones...</span>
        )}
      </div>
    </div>
  );
}
