'use client';

import React from 'react';
import { Match } from '@/types';
import { ArrowLeft, Calendar, Clock, MapPin, Shield } from 'lucide-react';

interface MatchHeaderProps {
  match: Match;
  onBack: () => void;
  getLogo?: (name: string) => string | null;
}

// Helper to get rival initials for the fallback logo
function getRivalInitials(rivalName: string): string {
  const parts = rivalName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
  return rivalName.substring(0, 2).toUpperCase();
}

export function MatchHeader({ match, onBack, getLogo }: MatchHeaderProps) {
  const [imageError, setImageError] = React.useState(false);

  const dateObj = new Date(match.fecha);
  const formattedDate = dateObj.toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const isWinner = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor > match.goles_contra;
  const isLoser = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor < match.goles_contra;

  // Single source of truth: escudo from DB (clubs table via getLogo prop)
  const rivalLogo = getLogo ? getLogo(match.rival) : null;
  const rivalInitials = getRivalInitials(match.rival);
  
  const matchWithFields = match as Match & { campo?: string; hora?: string };
  const fieldName = matchWithFields.campo || (match.es_local ? 'Iparralde (Local)' : 'Campo Rival (Visitante)');
  const matchTime = matchWithFields.hora || null;

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden select-none">
      
      {/* Background soft red glow */}
      <div className="absolute inset-0 bg-radial-gradient from-red-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Back button & Competition Badge */}
      <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
        <button
          onClick={onBack}
          className="flex items-center justify-center p-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-all"
          title="Volver a la lista"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        <span className="text-[10px] font-black tracking-widest text-[#CC0E21] bg-[#CC0E21]/10 border border-[#CC0E21]/20 px-3.5 py-1 rounded-full uppercase leading-none shadow-sm shadow-[#CC0E21]/5">
          {match.tipo_partido || 'LIGA'} {match.jornada ? `— JORNADA ${match.jornada}` : ''}
        </span>
      </div>

      {/* Teams faces & scoreboard */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 py-2 relative z-10">
        {/* Local Team */}
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left w-full justify-end">
          <span className="text-lg md:text-xl font-black text-slate-100 order-2 md:order-1 tracking-wide truncate max-w-[200px]">
            {match.es_local ? 'SD Indautxu' : match.rival}
          </span>
          <div className="h-16 w-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center p-3 shadow-md order-1 md:order-2 shrink-0">
            {match.es_local ? (
              <img src="/escudo.jpg" alt="SD Indautxu" className="object-contain max-h-full max-w-full" />
            ) : (
              rivalLogo && !imageError ? (
                <img src={rivalLogo} alt={match.rival} className="object-contain max-h-full max-w-full" onError={() => setImageError(true)} />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-[10px] font-black text-slate-350 border border-slate-700/50">
                  <Shield className="h-5 w-5 text-slate-500 mb-0.5 shrink-0" />
                  <span>{rivalInitials}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Score Board */}
        <div className="flex flex-col items-center justify-center py-2 px-6 bg-slate-950/40 border border-slate-850 rounded-2xl shrink-0 min-w-[140px]">
          {match.jugado ? (
            <>
              <span className="text-3xl font-black text-white tracking-widest leading-none">
                {match.es_local 
                  ? `${match.goles_favor} - ${match.goles_contra}`
                  : `${match.goles_contra} - ${match.goles_favor}`
                }
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-2.5 leading-none ${
                isWinner ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                isLoser ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {isWinner ? 'Ganado' : isLoser ? 'Perdido' : 'Empate'}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-black text-slate-500 tracking-widest leading-none py-1.5 uppercase">
                VS
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-2 bg-slate-900 border border-slate-800 text-slate-400 leading-none">
                Programado
              </span>
            </>
          )}
        </div>

        {/* Visitante Team */}
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-right w-full justify-start">
          <div className="h-16 w-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center p-3 shadow-md shrink-0">
            {!match.es_local ? (
              <img src="/escudo.jpg" alt="SD Indautxu" className="object-contain max-h-full max-w-full" />
            ) : (
              rivalLogo && !imageError ? (
                <img src={rivalLogo} alt={match.rival} className="object-contain max-h-full max-w-full" onError={() => setImageError(true)} />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-[10px] font-black text-slate-355 border border-slate-700/50">
                  <Shield className="h-5 w-5 text-slate-500 mb-0.5 shrink-0" />
                  <span>{rivalInitials}</span>
                </div>
              )
            )}
          </div>
          <span className="text-lg md:text-xl font-black text-slate-100 tracking-wide truncate max-w-[200px]">
            {!match.es_local ? 'SD Indautxu' : match.rival}
          </span>
        </div>
      </div>

      {/* Info details footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800/60 pt-5 mt-5 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0 justify-center sm:justify-start">
          <Calendar className="h-4 w-4 text-[#CC0E21] shrink-0" />
          <span className="capitalize truncate font-semibold">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2.5 min-w-0 justify-center">
          <Clock className="h-4 w-4 text-[#CC0E21] shrink-0" />
          <span className="truncate font-semibold">{matchTime ? `${matchTime} h` : 'Hora por definir'}</span>
        </div>
        <div className="flex items-center gap-2.5 min-w-0 justify-center sm:justify-end">
          <MapPin className="h-4 w-4 text-[#CC0E21] shrink-0" />
          <span className="truncate font-semibold" title={fieldName}>{fieldName}</span>
        </div>
      </div>

    </div>
  );
}
