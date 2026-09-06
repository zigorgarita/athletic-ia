'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { ClubSeason, Club } from '@/hooks/useClubs';
import { useClubMatches, ClubMatch } from '@/hooks/useClubMatches';
import { useOfficialMatches, OfficialMatch, OfficialPlayerStat } from '@/hooks/useOfficialMatches';
import { Calendar as CalendarIcon, Shield, Award, FileText, ChevronRight } from 'lucide-react';
import { MatchCard } from '@/components/liga/MatchCard';
import { Match } from '@/types';
import { useClubLogos } from '@/hooks/useClubLogos';
import { OfficialMatchModal } from '../modals/OfficialMatchModal';

interface CalendarTabProps {
  club: Club | null;
  season: ClubSeason | null;
}

export function CalendarTab({ club, season }: CalendarTabProps) {
  const { matches, loading: scoutingLoading } = useClubMatches(season?.id);
  const { matches: officialMatches, loadMatchDetail } = useOfficialMatches(club?.id);
  const { getLogo } = useClubLogos();

  // Estado para el modal de acta oficial RFEF
  const [selectedMatch, setSelectedMatch] = useState<OfficialMatch | null>(null);
  const [selectedStats, setSelectedStats] = useState<OfficialPlayerStat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenOfficialMatch = async (m: OfficialMatch) => {
    setSelectedMatch(m);
    setIsModalOpen(true);
    setLoadingDetail(true);
    const detail = await loadMatchDetail(m.id);
    if (detail) {
      setSelectedStats(detail.stats);
    }
    setLoadingDetail(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMatch(null);
    setSelectedStats([]);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  // Ordenar cronológicamente scouting existente
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
    campo: m.campo || (m.local_visitante === 'Visitante' ? club?.campo_nombre : undefined) || undefined,
    hora: m.hora || undefined,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('es-ES');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mx-auto pb-10">
      
      {/* ============================================================ */}
      {/* SECCIÓN: PARTIDOS OFICIALES · RFEF (CERTIFICADOS)             */}
      {/* ============================================================ */}
      {officialMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-950/20 p-4 rounded-3xl border border-blue-900/40">
            <div className="flex items-center gap-3 ml-2">
              <Award className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                  PARTIDOS OFICIALES · RFEF
                </h3>
                <p className="text-[11px] text-blue-300/80 font-medium">
                  Datos de actas oficiales federativas certificados
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-900/40 text-blue-300 rounded-full border border-blue-800/50">
              {officialMatches.length} {officialMatches.length === 1 ? 'partido oficial' : 'partidos oficiales'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officialMatches.map((om) => {
              const localName = om.local_club?.nombre || 'Local';
              const visitorName = om.visitor_club?.nombre || 'Visitante';
              const localLogo = om.local_club?.escudo_url;
              const visitorLogo = om.visitor_club?.escudo_url;

              return (
                <div 
                  key={om.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 shadow-lg group relative overflow-hidden"
                >
                  {/* Encabezado de la tarjeta oficial */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-300">
                        J{om.jornada} · {formatDate(om.fecha)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-400 border border-blue-800/60">
                        <Award className="h-3 w-3" />
                        RFEF
                      </span>
                    </div>

                    {/* Enfrentamiento y Marcador */}
                    <div className="py-5 flex items-center justify-between gap-3">
                      {/* Local */}
                      <div className="flex-1 flex flex-col items-center text-center">
                        {localLogo ? (
                          <Image 
                            src={localLogo} 
                            alt={localName}
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain mb-1.5" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-1.5">
                            <Shield className="h-5 w-5" />
                          </div>
                        )}
                        <span className="font-bold text-slate-200 text-xs truncate max-w-[110px]" title={localName}>
                          {localName}
                        </span>
                      </div>

                      {/* Marcador */}
                      <div className="px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center shrink-0 font-mono">
                        <div className="text-2xl font-black text-slate-100 tracking-tight">
                          {om.goles_local ?? 0} – {om.goles_visitante ?? 0}
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 mt-0.5">
                          Finalizado
                        </span>
                      </div>

                      {/* Visitante */}
                      <div className="flex-1 flex flex-col items-center text-center">
                        {visitorLogo ? (
                          <Image 
                            src={visitorLogo} 
                            alt={visitorName}
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain mb-1.5" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-1.5">
                            <Shield className="h-5 w-5" />
                          </div>
                        )}
                        <span className="font-bold text-slate-200 text-xs truncate max-w-[110px]" title={visitorName}>
                          {visitorName}
                        </span>
                      </div>
                    </div>

                    {/* Metadatos secundarios */}
                    {om.campo && (
                      <p className="text-[11px] text-slate-500 truncate text-center mb-3">
                        {om.campo}
                      </p>
                    )}
                  </div>

                  {/* Botón de acción: Ver acta oficial */}
                  <button
                    onClick={() => handleOpenOfficialMatch(om)}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-blue-900/30 text-slate-200 hover:text-blue-300 border border-slate-750 hover:border-blue-700/50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                    <span>Ver acta oficial</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECCIÓN: SCOUTING Y CALENDARIO INTERNO (EXISTENTE INTACTO)    */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
          <div className="flex items-center gap-3 ml-2">
            <CalendarIcon className="h-5 w-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-200">Calendario de Partidos (Scouting)</h3>
              <p className="text-[11px] text-slate-500">Partidos registrados en el seguimiento del rival</p>
            </div>
          </div>
        </div>

        {scoutingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-[330px] bg-slate-800/50 animate-pulse rounded-3xl" />)}
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800/50">
            <CalendarIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">Sin partidos de scouting</h3>
            <p className="text-slate-500 text-xs mt-1">Los partidos de análisis propio se gestionan desde la pestaña &quot;Historial&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={mapToMatch(match)}
                disableNavigation={!match.our_match_id}
                getLogo={getLogo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal del Acta Oficial RFEF */}
      <OfficialMatchModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        match={selectedMatch}
        stats={selectedStats}
        loading={loadingDetail}
      />

    </div>
  );
}

