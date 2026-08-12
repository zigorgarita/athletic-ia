'use client';

import React, { useState, useMemo } from 'react';
import { Player, GPSSession, GPSData, Demarcacion } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Users, Activity, Zap, CheckSquare, Layers, BarChart3, AlertCircle 
} from 'lucide-react';

interface MatchInfo {
  id: string;
  fecha: string;
  rival: string;
  tipo_partido?: string;
  jornada?: number | null;
}

interface GPSMatchPlayerComparisonProps {
  matches: MatchInfo[];
  sessions: GPSSession[];
  gpsDataList: (GPSData & { player?: Player })[];
  players: Player[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
}

interface MetricDefinition {
  key: keyof GPSData | 'm_min';
  label: string;
  unit: string;
  description: string;
  category: 'intensidad' | 'distancia' | 'velocidad' | 'esfuerzo';
  format?: (val: number | null | undefined) => string;
}

const METRICS: MetricDefinition[] = [
  { 
    key: 'm_min', 
    label: 'm / min (Ritmo)', 
    unit: 'm/min', 
    description: 'Metros por minuto jugados. Protagonista para comparar intensidades entre jugadores con distinto tiempo.',
    category: 'intensidad',
    format: (v) => v !== null && v !== undefined ? `${v.toFixed(1)} m/min` : 'Sin dato'
  },
  { 
    key: 'minutos', 
    label: 'Minutos Jugados', 
    unit: 'min', 
    description: 'Tiempo total en el campo',
    category: 'esfuerzo',
    format: (v) => v !== null && v !== undefined ? `${v} min` : 'Sin dato'
  },
  { 
    key: 'distancia_total', 
    label: 'Distancia Total', 
    unit: 'm', 
    description: 'Metros totales recorridos',
    category: 'distancia',
    format: (v) => v !== null && v !== undefined ? `${v.toLocaleString('es-ES')} m` : 'Sin dato'
  },
  { 
    key: 'hsr', 
    label: 'Alta Intensidad (HSR)', 
    unit: 'm', 
    description: 'Metros a velocidad de alta intensidad (>= 21 km/h)',
    category: 'intensidad',
    format: (v) => v !== null && v !== undefined ? `${v.toLocaleString('es-ES')} m` : 'Sin dato'
  },
  { 
    key: 'sprint_distance', 
    label: 'Sprint / Máx Intensidad', 
    unit: 'm', 
    description: 'Metros recorridos a velocidad de sprint (>= 24 km/h)',
    category: 'intensidad',
    format: (v) => v !== null && v !== undefined ? `${v.toLocaleString('es-ES')} m` : 'Sin dato'
  },
  { 
    key: 'num_sprints', 
    label: 'Nº de Sprints', 
    unit: 'sprints', 
    description: 'Cantidad de aceleraciones a velocidad de sprint',
    category: 'intensidad',
    format: (v) => v !== null && v !== undefined ? `${v}` : 'Sin dato'
  },
  { 
    key: 'velocidad_maxima', 
    label: 'Velocidad Máxima', 
    unit: 'km/h', 
    description: 'Pico máximo de velocidad alcanzado',
    category: 'velocidad',
    format: (v) => v !== null && v !== undefined ? `${v.toFixed(1)} km/h` : 'Sin dato'
  },
  { 
    key: 'aceleraciones', 
    label: 'Aceleraciones Intensas', 
    unit: 'acc', 
    description: 'Total de aceleraciones significativas',
    category: 'esfuerzo',
    format: (v) => v !== null && v !== undefined ? `${v}` : 'Sin dato'
  },
  { 
    key: 'aceleraciones_max', 
    label: 'Aceleraciones Máximas', 
    unit: 'acc máx', 
    description: 'Aceleraciones explosivas de máxima intensidad',
    category: 'esfuerzo',
    format: (v) => v !== null && v !== undefined ? `${v}` : 'Sin dato'
  },
  { 
    key: 'deceleraciones', 
    label: 'Deceleraciones Intensas', 
    unit: 'dec', 
    description: 'Total de frenadas/deceleraciones bruscas',
    category: 'esfuerzo',
    format: (v) => v !== null && v !== undefined ? `${v}` : 'Sin dato'
  },
  { 
    key: 'deceleraciones_max', 
    label: 'Deceleraciones Máximas', 
    unit: 'dec máx', 
    description: 'Frenadas explosivas de máxima exigencia física',
    category: 'esfuerzo',
    format: (v) => v !== null && v !== undefined ? `${v}` : 'Sin dato'
  }
];

export function GPSMatchPlayerComparison({
  matches,
  sessions,
  gpsDataList,
  players,
  selectedMatchId,
  onMatchChange
}: GPSMatchPlayerComparisonProps) {
  // Active session for selected match
  const activeSession = useMemo(() => {
    if (!selectedMatchId) return sessions[0] || null;
    return sessions.find(s => s.match_id === selectedMatchId) || null;
  }, [sessions, selectedMatchId]);

  // GPS Data rows for current session
  const currentGpsRows = useMemo(() => {
    if (!activeSession) return [];
    return gpsDataList.filter(d => d.session_id === activeSession.id);
  }, [gpsDataList, activeSession]);

  // Map of available players with GPS in current session
  const availablePlayersInSession = useMemo(() => {
    return currentGpsRows.map(row => {
      const p = row.player || players.find(pl => pl.id === row.player_id);
      return {
        row,
        player: p || { id: row.player_id || row.id, nombre: row.gps_id || 'Jugador', dorsal: 0, demarcacion: 'Centrocampista' as Demarcacion, foto_url: undefined }
      };
    });
  }, [currentGpsRows, players]);

  // Selected player IDs state (defaults to first 4 or all available)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    return availablePlayersInSession
      .slice(0, 4)
      .map(item => item.player.id)
      .filter((id): id is string => typeof id === 'string' && Boolean(id));
  });

  // Selected metric for SVG Chart Comparison
  const [activeChartMetric, setActiveChartMetric] = useState<MetricDefinition['key']>('m_min');

  // Toggle single player selection
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  // Quick select helpers
  const selectAll = () => {
    const allIds = availablePlayersInSession
      .map(item => item.player.id)
      .filter((id): id is string => typeof id === 'string' && Boolean(id));
    setSelectedPlayerIds(allIds);
  };

  const selectStarters = () => {
    const starters = availablePlayersInSession
      .filter(item => (item.row.minutos || 0) >= 45)
      .map(item => item.player.id)
      .filter((id): id is string => typeof id === 'string' && Boolean(id));
    if (starters.length > 0) setSelectedPlayerIds(starters);
  };

  // Rows of selected players with calculated m_min
  const selectedRowsWithMetrics = useMemo(() => {
    return selectedPlayerIds.map(pId => {
      const item = availablePlayersInSession.find(p => p.player.id === pId);
      if (!item) return null;
      const r = item.row;
      const mMin = (r.minutos && r.minutos > 0 && r.distancia_total !== null && r.distancia_total !== undefined)
        ? (r.distancia_total / r.minutos)
        : null;

      return {
        player: item.player,
        data: r,
        m_min: mMin
      };
    }).filter(Boolean) as { player: Player; data: GPSData; m_min: number | null }[];
  }, [selectedPlayerIds, availablePlayersInSession]);

  // Calculate Maximum value across ALL selected players for each metric
  const metricMaxMap = useMemo(() => {
    const maxes: Record<string, number | null> = {};

    METRICS.forEach(m => {
      let maxVal: number | null = null;
      selectedRowsWithMetrics.forEach(row => {
        let val: number | null = null;
        if (m.key === 'm_min') {
          val = row.m_min;
        } else {
          const raw = row.data[m.key as keyof GPSData];
          val = typeof raw === 'number' ? raw : null;
        }
        if (val !== null && !isNaN(val)) {
          if (maxVal === null || val > maxVal) {
            maxVal = val;
          }
        }
      });
      maxes[m.key] = maxVal;
    });

    return maxes;
  }, [selectedRowsWithMetrics]);

  // Get metric value for a specific row
  const getMetricVal = (row: { player: Player; data: GPSData; m_min: number | null }, key: MetricDefinition['key']): number | null => {
    if (key === 'm_min') return row.m_min;
    const raw = row.data[key as keyof GPSData];
    return typeof raw === 'number' ? raw : null;
  };

  const matchOptions = useMemo(() => {
    return matches.map(m => ({
      value: m.id,
      label: `${m.fecha} — vs ${m.rival} (${m.tipo_partido || 'Partido'})`
    }));
  }, [matches]);

  const metricOptions = useMemo(() => {
    return METRICS.map(m => ({
      value: m.key,
      label: `${m.label} (${m.unit})`
    }));
  }, []);

  if (!activeSession || availablePlayersInSession.length === 0) {
    return (
      <Card className="bg-slate-900/40 border-slate-800 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">No hay datos GPS registrados para este partido</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-4">
          Selecciona otro partido que contenga una sesión GPS cargada para habilitar la herramienta de comparación.
        </p>
        <div className="max-w-xs mx-auto">
          <Select
            label=""
            value={selectedMatchId}
            onChange={(e) => onMatchChange(e.target.value)}
            options={matchOptions}
          />
        </div>
      </Card>
    );
  }

  const selectedChartMetricDef = METRICS.find(m => m.key === activeChartMetric) || METRICS[0];

  return (
    <div className="space-y-6">
      {/* 1. SELECCIÓN DE PARTIDO Y FILTROS RÁPIDOS */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-red-400 font-bold flex items-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-[#CC0E21]" />
                Modo A: Comparación de Jugadores en 1 Partido
              </span>
              <h2 className="text-lg font-bold text-slate-100">
                Selecciona los Jugadores a Comparar
              </h2>
            </div>

            {/* Selector de Partido */}
            <div className="w-full md:w-72">
              <label className="text-xs text-slate-400 font-medium mb-1 block">Partido Seleccionado:</label>
              <Select
                label=""
                value={selectedMatchId}
                onChange={(e) => onMatchChange(e.target.value)}
                options={matchOptions}
              />
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={selectAll}
                className="text-xs px-3 py-1.5 border border-slate-700 hover:bg-slate-800"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1 text-green-400" />
                Todos ({availablePlayersInSession.length})
              </Button>
              <Button
                variant="ghost"
                onClick={selectStarters}
                className="text-xs px-3 py-1.5 border border-slate-700 hover:bg-slate-800"
              >
                <Activity className="h-3.5 w-3.5 mr-1 text-blue-400" />
                Titulares (&gt;= 45 min)
              </Button>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Seleccionados: <span className="text-red-400 font-bold">{selectedPlayerIds.length}</span> / {availablePlayersInSession.length} jugadores con GPS
            </div>
          </div>

          {/* CHIPS DE JUGADORES DISPONIBLES */}
          <div className="flex flex-wrap gap-2 pt-2 max-h-48 overflow-y-auto pr-1">
            {availablePlayersInSession.map(({ row, player }) => {
              const isSelected = Boolean(player.id && selectedPlayerIds.includes(player.id));
              const mMin = (row.minutos && row.minutos > 0 && row.distancia_total)
                ? (row.distancia_total / row.minutos).toFixed(1)
                : null;

              return (
                <button
                  key={player.id || row.id}
                  onClick={() => player.id && togglePlayerSelection(player.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'bg-[#CC0E21]/15 border-[#CC0E21] text-slate-100 shadow-sm shadow-red-950'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Avatar
                    src={player.foto_url}
                    name={player.nombre}
                    size="sm"
                    className="h-5 w-5 border border-slate-700"
                  />
                  <span className="font-semibold">{player.nombre}</span>
                  {player.dorsal ? <span className="text-slate-500 text-[10px]">#{player.dorsal}</span> : null}

                  {row.minutos ? (
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {row.minutos}&apos; {mMin ? `(${mMin} m/m)` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">Sin dato</span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. GRÁFICO COMPARATIVO VISUAL DINÁMICO (SVG) */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              Comparativa Visual por Métrica
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Representación de la métrica física seleccionada entre los jugadores elegidos.
            </p>
          </div>

          {/* Selector de Métrica para Gráfico */}
          <div className="w-full sm:w-64">
            <Select
              label=""
              value={activeChartMetric}
              onChange={(e) => setActiveChartMetric(e.target.value as MetricDefinition['key'])}
              options={metricOptions}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* SVG HORIZONTAL BARS CHART */}
          <div className="space-y-3">
            {selectedRowsWithMetrics.map(({ player, data, m_min }) => {
              const val = getMetricVal({ player, data, m_min }, activeChartMetric);
              const maxVal = metricMaxMap[activeChartMetric];
              const isMax = val !== null && maxVal !== null && val >= maxVal && maxVal > 0;

              // Calculate width percentage relative to max
              const widthPct = (val !== null && maxVal !== null && maxVal > 0)
                ? Math.min(100, Math.max(8, (val / maxVal) * 100))
                : 0;

              return (
                <div key={player.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <Avatar src={player.foto_url} name={player.nombre} size="sm" className="h-6 w-6" />
                      <span className="text-slate-200">{player.nombre}</span>
                      <span className="text-slate-500 text-[11px]">({data.minutos ? `${data.minutos} min` : 'Sin dato'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isMax && (
                        <Badge variant="default" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5 py-0">
                          Valor Máximo
                        </Badge>
                      )}
                      <span className={`font-mono ${isMax ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                        {selectedChartMetricDef.format ? selectedChartMetricDef.format(val) : (val !== null ? `${val} ${selectedChartMetricDef.unit}` : 'Sin dato')}
                      </span>
                    </div>
                  </div>

                  {/* SVG Custom Bar Component */}
                  <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
                    {val !== null ? (
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMax 
                            ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-sm shadow-amber-900/50' 
                            : activeChartMetric === 'm_min'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                            : 'bg-gradient-to-r from-red-600 to-rose-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-600 italic">
                        Sin medición GPS
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. TABLA COMPARATIVA MATRICIAL COMPLETA */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <CardTitle className="text-base font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
              Tabla Matricial Completa por Métrica
            </span>
            <span className="text-xs font-normal text-slate-400">
              * El distintivo <span className="text-amber-400 font-semibold">Máximo</span> destaca el mayor registro del partido.
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-3 min-w-[200px] sticky left-0 bg-slate-950 z-10 border-r border-slate-800">
                  Métrica Física
                </th>
                <th className="p-3 min-w-[110px] text-center bg-slate-950/80 border-r border-slate-800 text-amber-400">
                  Máximo Partido
                </th>
                {selectedRowsWithMetrics.map(({ player, data }) => (
                  <th key={player.id} className="p-3 min-w-[130px] text-center border-r border-slate-800/60">
                    <div className="flex flex-col items-center">
                      <Avatar src={player.foto_url} name={player.nombre} size="sm" className="h-7 w-7 mb-1" />
                      <span className="text-slate-200 font-bold truncate max-w-[110px]">{player.nombre}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {data.minutos ? `${data.minutos} min` : 'Sin dato'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {METRICS.map(m => {
                const maxVal = metricMaxMap[m.key];

                return (
                  <tr 
                    key={m.key}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      m.key === 'm_min' 
                        ? 'bg-blue-950/20 font-bold border-l-4 border-l-blue-500' 
                        : m.key === 'minutos'
                        ? 'bg-slate-950/40'
                        : ''
                    }`}
                  >
                    {/* Nombre Métrica */}
                    <td className="p-3 sticky left-0 bg-slate-900 border-r border-slate-800 text-slate-200">
                      <div className="font-bold flex items-center gap-1.5">
                        {m.key === 'm_min' && <Zap className="h-3.5 w-3.5 text-blue-400" />}
                        {m.key === 'minutos' && <Activity className="h-3.5 w-3.5 text-slate-400" />}
                        {m.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{m.description}</div>
                    </td>

                    {/* Valor Máximo del Partido */}
                    <td className="p-3 text-center bg-slate-950/50 border-r border-slate-800 text-amber-400 font-mono font-bold">
                      {maxVal !== null ? (
                        m.format ? m.format(maxVal) : `${maxVal} ${m.unit}`
                      ) : (
                        <span className="text-slate-600 font-normal italic">Sin dato</span>
                      )}
                    </td>

                    {/* Columnas por Jugador */}
                    {selectedRowsWithMetrics.map(row => {
                      const val = getMetricVal(row, m.key);
                      const isMax = val !== null && maxVal !== null && val >= maxVal && maxVal > 0;

                      return (
                        <td 
                          key={row.player.id} 
                          className={`p-3 text-center border-r border-slate-800/40 font-mono ${
                            isMax ? 'bg-amber-500/10 text-amber-300 font-bold' : ''
                          }`}
                        >
                          {val !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <span>{m.format ? m.format(val) : `${val} ${m.unit}`}</span>
                              {isMax && <span className="text-[10px] text-amber-400 font-sans">★</span>}
                            </div>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-slate-950 text-slate-500 border-slate-800 font-normal font-sans">
                              Sin dato
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
