'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMatches } from '@/hooks/useMatches';
import { Match, MatchPlayerStats } from '@/types';
import { MatchForm } from '@/components/liga/MatchForm';
import { ConvocatoriaModal } from '@/components/liga/ConvocatoriaModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Plus, Calendar, Edit, Trash2, ClipboardList } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';

interface MatchCenterClientProps {
  matchType: 'LIGA' | 'AMISTOSO';
}

export function MatchCenterClient({ matchType }: MatchCenterClientProps) {
  const { isEditMode } = useEditMode();
  const {
    matches,
    loading,
    error,
    createMatch,
    updateMatch,
    deleteMatch,
    fetchMatchPlayerStats,
    saveMatchPlayerStats,
    refetch,
  } = useMatches(matchType);

  // Match Modal states
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchActionError, setMatchActionError] = useState<string | null>(null);
  const [isMatchSubmitting, setIsMatchSubmitting] = useState(false);

  // Convo Modal states
  const [isConvoModalOpen, setIsConvoModalOpen] = useState(false);
  const [activeMatchForConvo, setActiveMatchForConvo] = useState<Match | null>(null);
  const [activeMatchStats, setActiveMatchStats] = useState<MatchPlayerStats[]>([]);

  const handleOpenAddMatch = () => {
    setSelectedMatch(null);
    setMatchActionError(null);
    setIsMatchModalOpen(true);
  };

  const handleOpenEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setMatchActionError(null);
    setIsMatchModalOpen(true);
  };

  const handleMatchSubmit = async (data: Omit<Match, 'id' | 'created_at'>) => {
    setMatchActionError(null);
    setIsMatchSubmitting(true);
    if (selectedMatch) {
      const updated = await updateMatch(selectedMatch.id, data);
      if (updated) {
        setIsMatchModalOpen(false);
        refetch();
      } else {
        setMatchActionError('Error al actualizar la jornada. Verifica el número de jornada.');
      }
    } else {
      const created = await createMatch(data);
      if (created) {
        setIsMatchModalOpen(false);
        refetch();
      } else {
        setMatchActionError('Error al registrar la jornada. El número de jornada ya podría estar en uso.');
      }
    }
    setIsMatchSubmitting(false);
  };

  const handleDeleteMatch = async (id: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar este partido de ${matchType.toLowerCase()}? Todos los datos asociados y estadísticas de jugadores se perderán.`)) {
      const success = await deleteMatch(id);
      if (success) {
        refetch();
      }
    }
  };

  const handleOpenConvo = async (match: Match) => {
    setActiveMatchForConvo(match);
    const stats = await fetchMatchPlayerStats(match.id);
    setActiveMatchStats(stats);
    setIsConvoModalOpen(true);
  };

  const handleSaveConvo = async (statsPayload: Omit<MatchPlayerStats, 'id' | 'created_at'>[]) => {
    if (!activeMatchForConvo) return false;
    const success = await saveMatchPlayerStats(activeMatchForConvo.id, statsPayload);
    if (success) {
      refetch();
    }
    return success;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-red-500" />
            {matchType === 'LIGA' ? 'Liga y Jornadas' : 'Partidos Amistosos'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Control de partidos, resultados, convocatorias y estadísticas.
          </p>
        </div>
        {isEditMode && (
          <Button onClick={handleOpenAddMatch} className="flex items-center gap-1.5 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Programar Partido
          </Button>
        )}
      </div>

      {/* Alerta de Error Principal */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Listado de Partidos */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl animate-pulse" />
          <Skeleton className="h-24 w-full rounded-2xl animate-pulse" />
        </div>
      ) : matches.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <Trophy className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-200">No hay jornadas programadas</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Aún no hay partidos registrados. Haz clic en el botón de arriba para registrar el primer partido.
            </p>
          </div>
          {isEditMode && (
            <Button onClick={handleOpenAddMatch} variant="secondary" className="mt-2">
              Programar Primer Partido
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => {
            const dateObj = new Date(match.fecha);
            const isWinner = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor > match.goles_contra;
            const isLoser = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor < match.goles_contra;

            return (
              <div
                key={match.id}
                className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden"
              >
                {/* Indicador de resultado lateral */}
                {match.jugado && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isWinner ? 'bg-green-500' :
                    isLoser ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                )}

                {/* Info de Jornada, Fecha y Local/Visitante */}
                <div className="flex items-center gap-4 pl-1.5">
                  <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none">Jor.</span>
                    <span className="text-lg font-black text-white leading-none mt-1">{match.jornada}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-slate-100">
                        {match.es_local ? 'SD Indautxu' : match.rival}
                      </span>
                      <span className="text-xs font-bold text-slate-500">vs</span>
                      <span className="text-sm font-bold text-slate-100">
                        {match.es_local ? match.rival : 'SD Indautxu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marcador Central */}
                <div className="flex items-center gap-4 justify-center md:justify-start">
                  {match.jugado ? (
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-1.5 rounded-lg text-lg font-black border ${
                        isWinner ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        isLoser ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {match.goles_favor} - {match.goles_contra}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                        {isWinner ? 'Ganado' : isLoser ? 'Perdido' : 'Empate'}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="default" className="bg-slate-950/80 border border-slate-800 text-[10px] py-1 px-3">
                      Programado
                    </Badge>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-800/40 md:border-transparent pt-3 md:pt-0">
                  <Link
                    href={`/liga/${match.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
                  >
                    <Trophy className="h-3.5 w-3.5 text-[#CC0E21]" />
                    Centro de Partido
                  </Link>
                  <Button
                    onClick={() => handleOpenConvo(match)}
                    variant="primary"
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Convocatoria y Stats
                  </Button>
                  {isEditMode && (
                    <>
                      <Button
                        onClick={() => handleOpenEditMatch(match)}
                        variant="ghost"
                        className="h-9 w-9 p-0 text-slate-400 hover:text-[#CC0E21] hover:bg-[#CC0E21]/10 rounded-lg"
                        title="Editar partido"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteMatch(match.id)}
                        variant="ghost"
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title="Eliminar partido"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Match Form */}
      <Modal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        title={selectedMatch ? 'Editar Datos de la Jornada' : 'Programar Nueva Jornada'}
      >
        <div className="space-y-4">
          {matchActionError && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs">
              {matchActionError}
            </div>
          )}
          <MatchForm
            match={selectedMatch}
            onSubmit={handleMatchSubmit}
            onCancel={() => setIsMatchModalOpen(false)}
            isSubmitting={isMatchSubmitting}
          />
        </div>
      </Modal>

      {/* Modal Convocatoria */}
      <Modal
        isOpen={isConvoModalOpen}
        onClose={() => setIsConvoModalOpen(false)}
        title="Gestión de Convocatoria"
      >
        {activeMatchForConvo && (
          <ConvocatoriaModal
            match={activeMatchForConvo}
            onClose={() => setIsConvoModalOpen(false)}
            onSave={handleSaveConvo}
            initialStats={activeMatchStats}
          />
        )}
      </Modal>
    </div>
  );
}
