'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, TrendingUp, Trophy, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { useCreateEvaluation } from '@/hooks/useCreateEvaluation';
import { DetailedEvaluation } from '@/types';
import { EvaluationCard } from '@/components/evaluations/EvaluationCard';
import { RankingTable } from '@/components/evaluations/RankingTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

const EvaluationChart = dynamic(
  () => import('@/components/evaluations/EvaluationChart').then((mod) => mod.EvaluationChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-2xl" />,
  }
);

const EvaluationForm = dynamic(
  () => import('@/components/evaluations/EvaluationForm').then((mod) => mod.EvaluationForm),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-2xl" />,
  }
);

export function EvaluacionesClient() {
  const { players, loading: loadingPlayers } = usePlayers();
  const { createEvaluation, loading: creating, error: createError } = useCreateEvaluation();

  const [activeTab, setActiveTab] = useState<'ranking' | 'detail'>('ranking');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [allEvaluations, setAllEvaluations] = useState<DetailedEvaluation[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAllEvaluations = async () => {
    setLoadingEvals(true);
    try {
      const { data, error } = await supabase
        .from('detailed_evaluations')
        .select('*')
        .order('fecha_evaluacion', { ascending: false });
      if (error) throw error;
      setAllEvaluations(data || []);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    } finally {
      setLoadingEvals(false);
    }
  };

  useEffect(() => {
    fetchAllEvaluations();
  }, []);

  const handleSelectPlayerFromRanking = (id: string) => {
    setSelectedPlayerId(id);
    setActiveTab('detail');
  };

  const handleCreateEvaluation = async (data: Omit<DetailedEvaluation, 'id' | 'created_at'>) => {
    setActionError(null);
    const created = await createEvaluation(data);
    if (created) {
      setIsModalOpen(false);
      fetchAllEvaluations();
    } else {
      setActionError(createError || 'Error al guardar la evaluación.');
    }
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
  const selectedPlayerEvals = allEvaluations.filter((e) => e.player_id === selectedPlayerId);

  const getOverallMedia = (evals: DetailedEvaluation[]) => {
    if (evals.length === 0) return 0;
    const total = evals.reduce((sum, e) => {
      const sumMetrics = 
        e.velocidad + e.aceleracion + e.fuerza + e.resistencia + e.juego_aereo +
        e.marcaje + e.entrada_defensiva + e.posicionamiento_defensivo + e.trabajo_defensivo +
        e.pase_corto + e.pase_largo + e.control_orientado + e.regate + e.centros +
        e.finalizacion + e.disparo_lejano + e.trabajo_ofensivo + e.vision_juego +
        e.inteligencia_tactica + e.liderazgo;
      return sum + (sumMetrics / 20);
    }, 0);
    return total / evals.length;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-green-500" />
            Evaluaciones
          </h1>
          <p className="text-slate-400 text-sm">
            Historial de rendimiento deportivo y ranking de rendimiento.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Nueva Evaluación
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'ranking'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Ranking de Rendimiento
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'detail'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Historial por Jugador
        </button>
      </div>

      {/* Contenido Dinámico */}
      {loadingPlayers || loadingEvals ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full animate-pulse" />
          <Skeleton className="h-44 w-full animate-pulse" />
        </div>
      ) : players.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <Users className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-200">No hay jugadores registrados</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Debes registrar al menos un jugador en la sección de Plantilla para poder agregar evaluaciones.
            </p>
          </div>
        </div>
      ) : activeTab === 'ranking' ? (
        <RankingTable
          players={players}
          evaluations={allEvaluations}
          onSelectPlayer={handleSelectPlayerFromRanking}
        />
      ) : (
        /* Detalle por Jugador */
        <div className="space-y-6">
          <div className="w-full sm:max-w-xs">
            <Select
              label="Seleccionar Jugador"
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              options={players.map((p) => ({
                value: p.id,
                label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})`,
              }))}
            />
          </div>

          {selectedPlayer ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resumen e Historial */}
              <div className="lg:col-span-1 space-y-6">
                {/* Perfil Mini */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center text-center">
                  <Avatar src={selectedPlayer.foto_url} name={selectedPlayer.nombre} size="xl" className="mb-4" />
                  <h3 className="text-lg font-bold text-slate-100 mb-1">{selectedPlayer.nombre} {selectedPlayer.apellidos}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={selectedPlayer.demarcacion}>{selectedPlayer.demarcacion}</Badge>
                    <span className="text-xs text-slate-500 font-bold">#{selectedPlayer.dorsal}</span>
                  </div>

                  <div className="w-full pt-4 border-t border-slate-800/60 mt-2 flex flex-col items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Media Global</span>
                    <span className="text-3xl font-extrabold text-green-400 mt-1">
                      {selectedPlayerEvals.length > 0
                        ? getOverallMedia(selectedPlayerEvals).toFixed(1)
                        : '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">
                      Basado en {selectedPlayerEvals.length} evaluaciones
                    </span>
                  </div>
                </div>
              </div>

              {/* Gráfico y Cards del Historial */}
              <div className="lg:col-span-2 space-y-6">
                <EvaluationChart evaluations={selectedPlayerEvals} />

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Historial de Fichas
                  </h3>
                  {selectedPlayerEvals.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                      Este jugador no tiene evaluaciones registradas todavía.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPlayerEvals.map((evaluation) => (
                        <EvaluationCard key={evaluation.id} evaluation={evaluation} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
              Selecciona un jugador arriba para cargar su historial de rendimiento deportivo.
            </div>
          )}
        </div>
      )}

      {/* Modal de Nueva Evaluación */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Ficha de Evaluación"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs">
              {actionError}
            </div>
          )}
          <EvaluationForm
            players={players}
            preselectedPlayerId={selectedPlayerId}
            onSubmit={handleCreateEvaluation}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={creating}
          />
        </div>
      </Modal>
    </div>
  );
}
