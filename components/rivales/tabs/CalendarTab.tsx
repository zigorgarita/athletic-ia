'use client';
import React from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubMatches, ClubMatch } from '@/hooks/useClubMatches';
import { Calendar as CalendarIcon } from 'lucide-react';
import { MatchCard } from '@/components/liga/MatchCard';
import { Match } from '@/types';

interface CalendarTabProps {
  season: ClubSeason | null;
}

export function CalendarTab({ season }: CalendarTabProps) {
  const { matches, loading } = useClubMatches(season?.id);

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  // Ordenar cronológicamente (los futuros primero, o antiguos según convenga. En calendario solemos querer ver el orden temporal)
  const sortedMatches = [...matches].sort((a, b) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });

  const mapToMatch = (m: ClubMatch): Match & { campo?: string; hora?: string } => ({
    id: m.our_match_id || m.id,
    jornada: parseInt(m.jornada || '0') || 0,
    rival: m.rival_en_ese_partido || 'Desconocido',
    fecha: m.fecha || new Date().toISOString(),
    es_local: m.local_visitante === 'Local',
    goles_favor: m.goles_favor,
    goles_contra: m.goles_contra,
    jugado: m.fecha ? new Date(m.fecha).getTime() < Date.now() : false,
    created_at: m.created_at || new Date().toISOString(),
    tipo_partido: m.competicion === 'Amistoso' ? 'AMISTOSO' : 'LIGA',
    campo: m.campo || undefined,
    hora: m.hora || undefined,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mx-auto pb-10">
      
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex items-center gap-3 ml-2">
          <CalendarIcon className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-200">Calendario de Partidos</h3>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-[330px] bg-slate-800/50 animate-pulse rounded-3xl" />)}
        </div>
      ) : sortedMatches.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Calendario vacío</h3>
          <p className="text-slate-500 text-sm mt-2">Los partidos se añaden desde la pestaña &quot;Historial&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={mapToMatch(match)}
              disableNavigation={!match.our_match_id}
            />
          ))}
        </div>
      )}

    </div>
  );
}
