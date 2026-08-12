'use client';

import React, { useState, useMemo } from 'react';
import { Player, GPSSession, GPSData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { 
  TrendingUp, Activity, Zap, Gauge, 
  Layers, Info, BarChart2 
} from 'lucide-react';

interface MatchInfo {
  id: string;
  fecha: string;
  rival: string;
  tipo_partido?: string;
  jornada?: number | null;
}

interface GPSPlayerProgressComparisonProps {
  matches: MatchInfo[];
  sessions: GPSSession[];
  gpsDataList: (GPSData & { player?: Player })[];
  players: Player[];
}

type ProgressMetricKey = 'm_min' | 'distancia_total' | 'hsr' | 'sprint_distance' | 'num_sprints' | 'velocidad_maxima';

export function GPSPlayerProgressComparison({
  matches,
  sessions,
  gpsDataList,
  players
}: GPSPlayerProgressComparisonProps) {
  // 1. Available players with at least 1 GPS record across all sessions
  const playersWithGps = useMemo(() => {
    const playerMap = new Map<string, Player>();

    gpsDataList.forEach(data => {
      const p = data.player || players.find(pl => pl.id === data.player_id);
      if (p && !playerMap.has(p.id)) {
        playerMap.set(p.id, p);
      }
    });

    return Array.from(playerMap.values()).sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99));
  }, [gpsDataList, players]);

  // Selected Player State (defaults to first available)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => {
    return playersWithGps[0]?.id || '';
  });

  const selectedPlayer = useMemo(() => {
    return playersWithGps.find(p => p.id === selectedPlayerId) || playersWithGps[0] || null;
  }, [playersWithGps, selectedPlayerId]);

  // Player's GPS records across all sessions ordered by date
  const playerHistory = useMemo(() => {
    if (!selectedPlayer) return [];

    return gpsDataList
      .filter(d => d.player_id === selectedPlayer.id)
      .map(data => {
        const session = sessions.find(s => s.id === data.session_id);
        const match = session ? matches.find(m => m.id === session.match_id) : null;
        const mMin = (data.minutos && data.minutos > 0 && data.distancia_total)
          ? (data.distancia_total / data.minutos)
          : null;

        return {
          data,
          session,
          match,
          m_min: mMin,
          fecha: session?.fecha || match?.fecha || 'Desconocida',
          label: match ? `vs ${match.rival}` : (session?.descripcion || 'Partido')
        };
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [selectedPlayer, gpsDataList, sessions, matches]);

  // Active Metric for Progress Chart
  const [activeChartMetric, setActiveChartMetric] = useState<ProgressMetricKey>('m_min');

interface PlayerStatsSummary {
  matchCount: number;
  maxMmin: number | null;
  avgMmin: number | null;
  maxDist: number | null;
  maxSpeed: number | null;
  totalDist: number;
  totalMin: number;
}

  // Aggregated Summary Stats for Selected Player
  const playerStatsSummary = useMemo<PlayerStatsSummary | null>(() => {
    if (playerHistory.length === 0) return null;

    let maxMmin: number | null = null;
    let maxDist: number | null = null;
    let maxSpeed: number | null = null;
    let totalDist = 0;
    let totalMin = 0;

    playerHistory.forEach(item => {
      if (item.m_min !== null && (maxMmin === null || item.m_min > maxMmin)) maxMmin = item.m_min;
      if (item.data.distancia_total !== null && (maxDist === null || item.data.distancia_total > maxDist)) maxDist = item.data.distancia_total;
      if (item.data.velocidad_maxima !== null && (maxSpeed === null || item.data.velocidad_maxima > maxSpeed)) maxSpeed = item.data.velocidad_maxima;
      if (item.data.distancia_total) totalDist += item.data.distancia_total;
      if (item.data.minutos) totalMin += item.data.minutos;
    });

    const avgMmin = totalMin > 0 ? totalDist / totalMin : null;

    return {
      matchCount: playerHistory.length,
      maxMmin,
      avgMmin,
      maxDist,
      maxSpeed,
      totalDist,
      totalMin
    };
  }, [playerHistory]);

  // Max value in history for current metric for SVG Scaling
  const metricMaxVal = useMemo(() => {
    let max: number | null = null;
    playerHistory.forEach(h => {
      const val = activeChartMetric === 'm_min' ? h.m_min : (h.data[activeChartMetric] as number | null);
      if (val !== null && (max === null || val > max)) max = val;
    });
    return max || 1;
  }, [playerHistory, activeChartMetric]);

  const playerOptions = useMemo(() => {
    return playersWithGps.map(p => ({
      value: p.id,
      label: `${p.dorsal ? `#${p.dorsal} ` : ''}${p.nombre} (${p.demarcacion || 'Campo'})`
    }));
  }, [playersWithGps]);

  const progressMetricOptions = useMemo(() => {
    return [
      { value: 'm_min', label: 'm / min (Ritmo de juego)' },
      { value: 'distancia_total', label: 'Distancia Total (m)' },
      { value: 'hsr', label: 'Alta Intensidad HSR (m)' },
      { value: 'sprint_distance', label: 'Sprint Máx Intensidad (m)' },
      { value: 'num_sprints', label: 'Nº de Sprints' },
      { value: 'velocidad_maxima', label: 'Velocidad Máxima (km/h)' }
    ];
  }, []);

  if (!selectedPlayer) {
    return (
      <Card className="bg-slate-900/40 border-slate-800 p-8 text-center">
        <Info className="h-12 w-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">No hay datos GPS disponibles para evolución individual</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
          Carga una sesión GPS en la pestaña de Partido para habilitar el historial por jugador.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. SELECCIÓN DE JUGADOR */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={selectedPlayer.foto_url}
              name={selectedPlayer.nombre}
              size="lg"
              className="h-14 w-14 border-2 border-red-500/50 shadow-md shadow-red-950"
            />
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Modo B: Evolución del Jugador Partido a Partido
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {selectedPlayer.nombre}
                {selectedPlayer.dorsal ? <span className="text-sm font-semibold text-slate-400">#{selectedPlayer.dorsal}</span> : null}
              </h2>
              <p className="text-xs text-slate-400">
                Posición: <span className="text-slate-300 font-semibold">{selectedPlayer.demarcacion || 'Campo'}</span> — {playerHistory.length} partido(s) registrado(s) con GPS.
              </p>
            </div>
          </div>

          {/* Selector de Jugador */}
          <div className="w-full md:w-72">
            <label className="text-xs text-slate-400 font-medium mb-1 block">Seleccionar Jugador:</label>
            <Select
              label=""
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              options={playerOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* AVISO INFORMATIVO DE PRIMER PARTIDO */}
      {playerHistory.length === 1 && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200">
            <span className="font-bold text-blue-300">Modo B 100% Preparado:</span> Actualmente existe 1 partido grabado con GPS en la base de datos (<span className="font-semibold text-white">{playerHistory[0].label}</span>). La curva de evolución temporal se irá generando automáticamente partido a partido a medida que se importen nuevas sesiones durante la temporada.
          </div>
        </div>
      )}

      {/* 2. RESUMEN ESTADÍSTICO DEL JUGADOR */}
      {playerStatsSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-900/60 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Ritmo Promedio</span>
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-1">
              {playerStatsSummary.avgMmin ? `${playerStatsSummary.avgMmin.toFixed(1)} m/m` : 'Sin dato'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">m/min global acumulado</div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Máximo Ritmo (m/min)</span>
              <Gauge className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1">
              {playerStatsSummary.maxMmin ? `${playerStatsSummary.maxMmin.toFixed(1)} m/m` : 'Sin dato'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mejor registro en 1 partido</div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Máxima Distancia</span>
              <Activity className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono mt-1">
              {playerStatsSummary.maxDist ? `${playerStatsSummary.maxDist.toLocaleString('es-ES')} m` : 'Sin dato'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mayor volumen en 1 partido</div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Velocidad Máxima</span>
              <BarChart2 className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono mt-1">
              {playerStatsSummary.maxSpeed ? `${playerStatsSummary.maxSpeed.toFixed(1)} km/h` : 'Sin dato'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pico máximo registrado</div>
          </Card>
        </div>
      )}

      {/* 3. GRÁFICO SVG DE EVOLUCIÓN TEMPORAL */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Evolución Física Partido a Partido
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualización de la tendencia física del jugador a lo largo de la temporada.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Select
              label=""
              value={activeChartMetric}
              onChange={(e) => setActiveChartMetric(e.target.value as ProgressMetricKey)}
              options={progressMetricOptions}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {playerHistory.map((item) => {
              const val = activeChartMetric === 'm_min' ? item.m_min : (item.data[activeChartMetric] as number | null);
              const widthPct = (val !== null && metricMaxVal > 0)
                ? Math.min(100, Math.max(10, (val / metricMaxVal) * 100))
                : 0;

              return (
                <div key={item.data.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[11px]">{item.fecha}</span>
                      <span className="text-slate-200 font-bold">{item.label}</span>
                      <span className="text-slate-400 text-[11px]">({item.data.minutos ? `${item.data.minutos} min` : 'Sin dato'})</span>
                    </div>

                    <span className="font-mono text-blue-400 font-bold">
                      {val !== null 
                        ? (activeChartMetric === 'm_min' || activeChartMetric === 'velocidad_maxima' ? `${val.toFixed(1)}` : `${val}`)
                        : 'Sin dato'}
                    </span>
                  </div>

                  <div className="h-5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    {val !== null ? (
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-500"
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

      {/* 4. TABLA CRONOLÓGICA DE DETALLE */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-400" />
            Historial Cronológico Completo de Partidos
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-3">Fecha</th>
                <th className="p-3">Partido</th>
                <th className="p-3 text-center">Minutos</th>
                <th className="p-3 text-center text-blue-400">m / min</th>
                <th className="p-3 text-center">Dist. Total</th>
                <th className="p-3 text-center">HSR (m)</th>
                <th className="p-3 text-center">Sprint (m)</th>
                <th className="p-3 text-center">Nº Sprints</th>
                <th className="p-3 text-center">Vel. Máx</th>
                <th className="p-3 text-center">Acc / Dec</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {playerHistory.map(item => (
                <tr key={item.data.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono text-slate-400">{item.fecha}</td>
                  <td className="p-3 font-bold text-slate-200">{item.label}</td>
                  <td className="p-3 text-center font-mono">{item.data.minutos ? `${item.data.minutos} min` : <Badge variant="default" className="text-[10px] text-slate-500 border-slate-800">Sin dato</Badge>}</td>
                  <td className="p-3 text-center font-mono font-bold text-blue-400 bg-blue-950/20">
                    {item.m_min !== null ? `${item.m_min.toFixed(1)} m/m` : <span className="text-slate-600 font-normal">Sin dato</span>}
                  </td>
                  <td className="p-3 text-center font-mono">{item.data.distancia_total ? `${item.data.distancia_total.toLocaleString('es-ES')} m` : 'Sin dato'}</td>
                  <td className="p-3 text-center font-mono">{item.data.hsr ? `${item.data.hsr} m` : 'Sin dato'}</td>
                  <td className="p-3 text-center font-mono">{item.data.sprint_distance ? `${item.data.sprint_distance} m` : 'Sin dato'}</td>
                  <td className="p-3 text-center font-mono">{item.data.num_sprints !== null ? item.data.num_sprints : 'Sin dato'}</td>
                  <td className="p-3 text-center font-mono">{item.data.velocidad_maxima ? `${item.data.velocidad_maxima.toFixed(1)} km/h` : 'Sin dato'}</td>
                  <td className="p-3 text-center font-mono text-slate-400">
                    {item.data.aceleraciones !== null ? `${item.data.aceleraciones} / ${item.data.deceleraciones ?? '-'}` : 'Sin dato'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
