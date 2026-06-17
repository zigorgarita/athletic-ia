import React, { useState, useEffect } from 'react';
import { Match, MatchPlayerStats } from '@/types';
import { usePlayers } from '@/hooks/usePlayers';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface ConvocatoriaModalProps {
  match: Match;
  onClose: () => void;
  onSave: (statsList: Omit<MatchPlayerStats, 'id' | 'created_at'>[]) => Promise<boolean>;
  initialStats: MatchPlayerStats[];
}

export function ConvocatoriaModal({ match, onClose, onSave, initialStats }: ConvocatoriaModalProps) {
  const { players, loading: loadingPlayers } = usePlayers();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Convocation state: map of playerId -> 'no_convocado' | 'titular' | 'suplente'
  const [convocation, setConvocation] = useState<Record<string, 'no_convocado' | 'titular' | 'suplente'>>({});
  
  // Player statistics map: playerId -> stats object
  const [playerStats, setPlayerStats] = useState<Record<string, Partial<MatchPlayerStats>>>({});

  // Expanded card state to input details
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Populate state with initial/existing stats from DB
    const initialConv: Record<string, 'no_convocado' | 'titular' | 'suplente'> = {};
    const initialStatsMap: Record<string, Partial<MatchPlayerStats>> = {};

    players.forEach((p) => {
      const matchStat = initialStats.find((s) => s.player_id === p.id);
      if (matchStat) {
        initialConv[p.id] = matchStat.titular ? 'titular' : 'suplente';
        initialStatsMap[p.id] = {
          minutos: matchStat.minutos,
          goles: matchStat.goles,
          asistencias: matchStat.asistencias,
          tarjeta_amarilla: matchStat.tarjeta_amarilla,
          tarjeta_roja: matchStat.tarjeta_roja,
          recuperaciones: matchStat.recuperaciones,
          intercepciones: matchStat.intercepciones,
          duelos_ganados: matchStat.duelos_ganados,
          pases_completados: matchStat.pases_completados,
          pases_totales: matchStat.pases_totales,
        };
      } else {
        initialConv[p.id] = 'no_convocado';
        initialStatsMap[p.id] = {
          minutos: 0,
          goles: 0,
          asistencias: 0,
          tarjeta_amarilla: false,
          tarjeta_roja: false,
          recuperaciones: 0,
          intercepciones: 0,
          duelos_ganados: 0,
          pases_completados: 0,
          pases_totales: 0,
        };
      }
    });

    setConvocation(initialConv);
    setPlayerStats(initialStatsMap);
  }, [players, initialStats]);

  const handleConvocationChange = (playerId: string, status: 'no_convocado' | 'titular' | 'suplente') => {
    setConvocation((prev) => ({ ...prev, [playerId]: status }));
    // Autofill default minutes
    if (status === 'titular') {
      updateStatField(playerId, 'minutos', 90);
    } else if (status === 'suplente') {
      updateStatField(playerId, 'minutos', 15);
    } else {
      updateStatField(playerId, 'minutos', 0);
    }
  };

  const updateStatField = (playerId: string, field: keyof MatchPlayerStats, value: string | number | boolean) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Filter only players who are Titular or Suplente
    const statsPayload: Omit<MatchPlayerStats, 'id' | 'created_at'>[] = [];

    Object.keys(convocation).forEach((pId) => {
      const status = convocation[pId];
      if (status !== 'no_convocado') {
        const stats = playerStats[pId] || {};
        statsPayload.push({
          match_id: match.id,
          player_id: pId,
          titular: status === 'titular',
          minutos: Number(stats.minutos || 0),
          goles: Number(stats.goles || 0),
          asistencias: Number(stats.asistencias || 0),
          tarjeta_amarilla: !!stats.tarjeta_amarilla,
          tarjeta_roja: !!stats.tarjeta_roja,
          recuperaciones: Number(stats.recuperaciones || 0),
          intercepciones: Number(stats.intercepciones || 0),
          duelos_ganados: Number(stats.duelos_ganados || 0),
          pases_completados: Number(stats.pases_completados || 0),
          pases_totales: Number(stats.pases_totales || 0),
        });
      }
    });

    const success = await onSave(statsPayload);
    setIsSaving(false);
    if (success) {
      onClose();
    } else {
      setSaveError('Error al guardar la convocatoria y estadísticas en Supabase.');
    }
  };

  if (loadingPlayers) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500 mx-auto" />
        <span className="text-slate-400 text-xs mt-2 block">Cargando plantilla...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 flex flex-col max-h-[80vh]">
      <div className="pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="h-4.5 w-4.5 text-green-500" />
          Convocatoria y Estadísticas - Jornada {match.jornada}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Rival: {match.rival} • Selecciona el rol de cada jugador e introduce las estadísticas del partido.
        </p>
      </div>

      {saveError && (
        <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl">
          {saveError}
        </div>
      )}

      {/* Lista de Jugadores */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {players.map((p) => {
          const status = convocation[p.id] || 'no_convocado';
          const stats = playerStats[p.id] || {};
          const isExpanded = expandedPlayerId === p.id;

          return (
            <div
              key={p.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                status === 'titular' ? 'border-green-500/30 bg-green-500/[0.02]' :
                status === 'suplente' ? 'border-blue-500/30 bg-blue-500/[0.02]' :
                'border-slate-800 bg-slate-900/10'
              }`}
            >
              {/* Fila Principal del Jugador */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                  <div>
                    <span className="font-bold text-slate-100 block text-xs">
                      {p.nombre} {p.apellidos}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={p.demarcacion} className="text-[9px] px-1.5 py-0">
                        {p.demarcacion}
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-bold">#{p.dorsal}</span>
                    </div>
                  </div>
                </div>

                {/* Selectores de Convocatoria */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleConvocationChange(p.id, 'no_convocado')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                      status === 'no_convocado'
                        ? 'bg-slate-800 text-slate-350 border-slate-700'
                        : 'bg-transparent text-slate-550 border-transparent hover:text-slate-400'
                    }`}
                  >
                    No Conv.
                  </button>
                  <button
                    onClick={() => handleConvocationChange(p.id, 'titular')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                      status === 'titular'
                        ? 'bg-green-500/20 text-green-400 border-green-500/25 shadow-lg shadow-green-500/5'
                        : 'bg-transparent text-slate-550 border-transparent hover:text-green-400'
                    }`}
                  >
                    Titular
                  </button>
                  <button
                    onClick={() => handleConvocationChange(p.id, 'suplente')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                      status === 'suplente'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/25 shadow-lg shadow-blue-500/5'
                        : 'bg-transparent text-slate-550 border-transparent hover:text-blue-400'
                    }`}
                  >
                    Suplente
                  </button>

                  {/* Botón Desplegable para Estadísticas (Solo si está convocado) */}
                  {status !== 'no_convocado' && (
                    <button
                      onClick={() => setExpandedPlayerId(isExpanded ? null : p.id)}
                      className="ml-2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Panel de Estadísticas Expandido */}
              {status !== 'no_convocado' && isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-800/40 pt-4 bg-slate-950/20 grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-fadeIn">
                  {/* Minutos */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Minutos Jugados</label>
                    <input
                      type="number"
                      value={stats.minutos ?? 0}
                      min="0"
                      max="120"
                      onChange={(e) => updateStatField(p.id, 'minutos', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Goles */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Goles</label>
                    <input
                      type="number"
                      value={stats.goles ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'goles', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Asistencias */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Asistencias</label>
                    <input
                      type="number"
                      value={stats.asistencias ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'asistencias', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Tarjetas */}
                  <div className="flex items-center gap-3 pt-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!stats.tarjeta_amarilla}
                        onChange={(e) => updateStatField(p.id, 'tarjeta_amarilla', e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                      Amarilla
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!stats.tarjeta_roja}
                        onChange={(e) => updateStatField(p.id, 'tarjeta_roja', e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-4 w-4"
                      />
                      Roja
                    </label>
                  </div>

                  {/* Recuperaciones */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Recuperaciones</label>
                    <input
                      type="number"
                      value={stats.recuperaciones ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'recuperaciones', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Intercepciones */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Intercepciones</label>
                    <input
                      type="number"
                      value={stats.intercepciones ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'intercepciones', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Pases Completados */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Pases Comp.</label>
                    <input
                      type="number"
                      value={stats.pases_completados ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'pases_completados', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Pases Totales */}
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Pases Totales</label>
                    <input
                      type="number"
                      value={stats.pases_totales ?? 0}
                      min="0"
                      onChange={(e) => updateStatField(p.id, 'pases_totales', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} loading={isSaving} className="px-6">
          Guardar Convocatoria
        </Button>
      </div>
    </div>
  );
}
