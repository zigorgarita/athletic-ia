'use client';

import React from 'react';
import { Shield, MapPin, Clock, Home, Navigation, Calendar } from 'lucide-react';

interface MatchBadgeProps {
  jornada?: number;
  rival: string;
  esLocal: boolean;
  fecha: string; // Fecha en formato YYYY-MM-DD
  hora?: string | null;
  campo?: string | null;
  matchId?: string;
}

export function MatchBadge({ jornada, rival, esLocal, fecha, hora, campo, matchId }: MatchBadgeProps) {
  const displayHora = hora && hora.trim() !== '' ? hora : 'Hora por confirmar';

  // Formateo legible de fecha (ej. "06/09/2026")
  const formatDateLegible = (rawDate: string) => {
    if (!rawDate) return '';
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return rawDate;
  };

  const formattedFecha = formatDateLegible(fecha);

  if (esLocal) {
    return (
      <div 
        data-match-id={matchId}
        className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3 transition-all hover:border-indigo-500/50 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Home className="w-3 h-3" />
            PARTIDO LOCAL {jornada ? `· J${jornada}` : ''}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-indigo-300/80 font-medium">
            {formattedFecha && (
              <span className="inline-flex items-center gap-1 bg-indigo-900/30 px-1.5 py-0.5 rounded">
                <Calendar className="w-3 h-3" />
                {formattedFecha}
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-indigo-900/30 px-1.5 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              {displayHora}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-sm font-bold text-white tracking-wide truncate">
            {rival}
          </span>
        </div>

        {campo && (
          <div className="flex items-center gap-1 text-xs text-indigo-300/60 mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{campo}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      data-match-id={matchId}
      className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 transition-all hover:border-emerald-500/50 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Navigation className="w-3 h-3" />
          PARTIDO VISITANTE {jornada ? `· J${jornada}` : ''}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium">
          {formattedFecha && (
            <span className="inline-flex items-center gap-1 bg-emerald-900/30 px-1.5 py-0.5 rounded">
              <Calendar className="w-3 h-3" />
              {formattedFecha}
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-emerald-900/30 px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {displayHora}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-bold text-white tracking-wide truncate">
          {rival}
        </span>
      </div>

      {campo && (
        <div className="flex items-center gap-1 text-xs text-emerald-300/60 mt-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{campo}</span>
        </div>
      )}
    </div>
  );
}
