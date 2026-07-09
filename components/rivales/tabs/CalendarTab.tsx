'use client';
import React from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubMatches } from '@/hooks/useClubMatches';
import { Calendar as CalendarIcon, Clock, MapPin, Trophy } from 'lucide-react';

interface CalendarTabProps {
  season: ClubSeason | null;
}

export function CalendarTab({ season }: CalendarTabProps) {
  const { matches, loading } = useClubMatches(season?.id);

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  // Ordenar cronológicamente (los más antiguos primero o los futuros primero, según fecha)
  const sortedMatches = [...matches].sort((a, b) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1000px] mx-auto pb-10">
      
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex items-center gap-3 ml-2">
          <CalendarIcon className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-200">Calendario de Partidos</h3>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : sortedMatches.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Calendario vacío</h3>
          <p className="text-slate-500 text-sm mt-2">Los partidos se añaden desde la pestaña &quot;Historial&quot;.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800/60 ml-4 sm:ml-8 space-y-8 py-4">
          {sortedMatches.map((match) => {
            const dateObj = match.fecha ? new Date(match.fecha) : null;
            const isPast = dateObj ? dateObj.getTime() < Date.now() : false;
            
            return (
              <div key={match.id} className="relative pl-6 sm:pl-8 group">
                {/* Timeline dot */}
                <div className={`absolute -left-[9px] top-4 h-4 w-4 rounded-full border-4 border-slate-950 ${isPast ? 'bg-slate-500' : 'bg-[#CC0E21] shadow-[0_0_10px_rgba(204,14,33,0.5)]'}`} />
                
                <div className={`bg-slate-900/40 border ${isPast ? 'border-slate-800/60 opacity-80' : 'border-[#CC0E21]/30'} p-5 rounded-2xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between group-hover:border-slate-600 transition-colors`}>
                  
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-slate-800/50 pr-4">
                      <span className={`text-xl font-black ${isPast ? 'text-slate-400' : 'text-white'}`}>{dateObj ? dateObj.getDate() : '--'}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{dateObj ? dateObj.toLocaleString('es-ES', { month: 'short' }) : '---'}</span>
                    </div>

                    <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                           <Trophy className="h-3 w-3" /> {match.competicion || 'Competición'}
                         </span>
                         {match.jornada && (
                           <span className="text-xs text-slate-500 font-bold">{match.jornada}</span>
                         )}
                       </div>
                       
                       <h4 className="text-base sm:text-lg font-bold text-slate-200">
                         {match.local_visitante === 'Local' ? 'Indautxu' : 'Rival'} <span className="text-slate-500 mx-2">vs</span> {match.local_visitante === 'Local' ? 'Rival' : 'Indautxu'}
                       </h4>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 text-xs text-slate-400 mt-2 sm:mt-0 sm:text-right border-t border-slate-800/50 sm:border-0 pt-3 sm:pt-0">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {match.hora || 'Sin hora'}
                    </div>
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate max-w-[120px]">{match.campo || 'Por definir'}</span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
