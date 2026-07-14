'use client';

import React, { useState } from 'react';

import { useMatches } from '@/hooks/useMatches';
import { Match, MatchPlayerStats } from '@/types';
import { MatchForm } from '@/components/liga/MatchForm';
import { ConvocatoriaModal } from '@/components/liga/ConvocatoriaModal';
import { MatchCard } from './MatchCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trophy, Plus } from 'lucide-react';
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
        <>
          {/* Vista moderna basada en tarjetas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isEditMode={isEditMode}
                onEdit={handleOpenEditMatch}
                onDelete={handleDeleteMatch}
                onManageConvo={handleOpenConvo}
              />
            ))}
          </div>

        </>
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
