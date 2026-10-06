'use client';

import React, { useState, useMemo } from 'react';
import { Player, GPSSession, GPSData, TrafficLightColor, TrafficLightMetricKey, PlayerTrafficLightRow } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  buildMatchTrafficLightRows 
} from '@/lib/gps/traffic-light';
import { 
  TrafficCone, Info, HelpCircle, Shield 
} from 'lucide-react';

interface MatchInfo {
  id: string;
  fecha: string;
  rival: string;
  tipo_partido?: string;
  jornada?: number | null;
}

interface GPSPerformanceTrafficLightProps {
  matches: MatchInfo[];
  sessions: GPSSession[];
  gpsDataList: (GPSData & { player?: Player })[];
  players: Player[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
}

const ALL_METRIC_KEYS: TrafficLightMetricKey[] = [
  'm_min',
  'hsr_min',
  'sprint_min',
  'sprints_90',
  'velocidad_maxima',
  'acc_min',
  'dec_min',
];

export function GPSPerformanceTrafficLight({
  matches,
  sessions,
  gpsDataList,
  players,
  selectedMatchId,
  onMatchChange,
}: GPSPerformanceTrafficLightProps) {
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<PlayerTrafficLightRow | null>(null);

  // Sesión GPS del partido seleccionado
  const currentSession = useMemo(() => {
    if (!selectedMatchId) return sessions[0] || null;
    return sessions.find(s => s.match_id === selectedMatchId || s.id === selectedMatchId) || null;
  }, [sessions, selectedMatchId]);

  // Datos GPS de la jornada seleccionada
  const currentMatchGpsData = useMemo(() => {
    if (!currentSession) return [];
    return gpsDataList.filter(d => d.session_id === currentSession.id);
  }, [gpsDataList, currentSession]);

  // Mapa de sesión -> fecha cronológica para filtrar el histórico
  const sessionDateMap = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach(s => {
      const match = matches.find(m => m.id === s.match_id);
      const fecha = s.fecha || match?.fecha || '';
      if (s.id && fecha) {
        map.set(s.id, fecha);
      }
    });
    return map;
  }, [sessions, matches]);

  // Fecha del partido/sesión evaluado
  const currentMatchDate = useMemo(() => {
    if (!currentSession) return null;
    const match = matches.find(m => m.id === currentSession.match_id);
    return currentSession.fecha || match?.fecha || null;
  }, [currentSession, matches]);

  // Filtrar exclusivamente los registros GPS de partidos disputados cronológicamente ANTES del partido evaluado
  // Reglas:
  // - Excluir siempre el propio partido evaluado (session_id === currentSession.id)
  // - Excluir partidos de fecha igual o posterior (sessionDate >= currentMatchDate)
  const priorHistoricalGpsData = useMemo(() => {
    if (!currentSession || !currentMatchDate) return [];

    return gpsDataList.filter(d => {
      // 1. Excluir siempre el propio partido evaluado
      if (d.session_id === currentSession.id) return false;

      // 2. Obtener fecha de la sesión del registro histórico
      const sessionDate = sessionDateMap.get(d.session_id);
      if (!sessionDate) return false;

      // 3. Excluir partidos posteriores o de la misma fecha
      return sessionDate < currentMatchDate;
    });
  }, [currentSession, currentMatchDate, gpsDataList, sessionDateMap]);

  // Calcular filas procesadas con el motor de semáforos pasando únicamente el histórico previo
  const processedRows = useMemo(() => {
    return buildMatchTrafficLightRows(currentMatchGpsData, priorHistoricalGpsData, players, currentSession?.id);
  }, [currentMatchGpsData, priorHistoricalGpsData, players, currentSession]);

  // Opciones del selector de partido
  const matchOptions = useMemo(() => {
    const list = matches.map(m => {
      const hasGps = sessions.some(s => s.match_id === m.id);
      return {
        value: m.id,
        label: `${m.jornada ? `J${m.jornada} - ` : ''}vs ${m.rival} (${m.fecha})${hasGps ? ' [GPS]' : ''}`,
      };
    });

    sessions.forEach(s => {
      if (!s.match_id) {
        list.push({
          value: s.id,
          label: `Sesión sin partido: ${s.descripcion || s.fecha} [GPS]`,
        });
      }
    });

    return list;
  }, [matches, sessions]);

  // Color helper visual para badges y celdas
  const getTrafficColorBadge = (color: TrafficLightColor, text?: string) => {
    switch (color) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            {text || 'Óptimo'}
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            {text || 'Moderado'}
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            {text || 'Desviación'}
          </span>
        );
      case 'gray':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            {text || 'Muestra corta'}
          </span>
        );
    }
  };

  const getMetricCellClass = (color: TrafficLightColor) => {
    switch (color) {
      case 'green':
        return 'bg-green-950/20 text-green-300 font-bold hover:bg-green-950/30';
      case 'yellow':
        return 'bg-amber-950/20 text-amber-300 font-bold hover:bg-amber-950/30';
      case 'red':
        return 'bg-red-950/25 text-red-300 font-bold hover:bg-red-950/40';
      case 'gray':
      default:
        return 'text-slate-400 hover:bg-slate-800/40';
    }
  };

  const formatMetricDisplay = (key: TrafficLightMetricKey, value: number | null): string => {
    if (value === null || isNaN(value)) return '—';
    if (key === 'm_min' || key === 'velocidad_maxima' || key === 'hsr_min' || key === 'sprint_min' || key === 'acc_min' || key === 'dec_min' || key === 'sprints_90') {
      return value.toFixed(1);
    }
    return Math.round(value).toString();
  };

  // Formato visual de desviación respecto a la media personal: ratio% - 100
  // Ej: 135% -> +35% | 93% -> -7% | 100% -> 0%
  const formatDeviationPct = (ratio: number | null): string => {
    if (ratio === null || isNaN(ratio)) return '—';
    const deviation = Math.round(ratio * 100) - 100;
    if (deviation > 0) return `+${deviation}%`;
    if (deviation === 0) return '0%';
    return `${deviation}%`; // includes negative sign
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA Y SELECTOR DE PARTIDO */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <TrafficCone className="h-4 w-4 text-emerald-400" />
                Modo C: Semáforo de Rendimiento por Jornada
              </span>
              <button
                type="button"
                onClick={() => setIsCriteriaModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 transition-colors"
              >
                <HelpCircle className="h-3 w-3 text-emerald-400" />
                Criterios del semáforo
              </button>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Jugador vs Sí Mismo
            </h2>
            {/* Frase corta obligatoria */}
            <p className="text-xs text-emerald-300/90 font-medium">
              Semáforo personal: cada jugador se compara con su propio histórico válido.
            </p>
          </div>

          <div className="w-full md:w-80">
            <label className="text-xs text-slate-400 font-medium mb-1 block">Seleccionar Jornada / Partido:</label>
            <Select
              label=""
              value={selectedMatchId}
              onChange={(e) => onMatchChange(e.target.value)}
              options={matchOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. TABLA SEMAFÓRICA PRINCIPAL */}
      {processedRows.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-8 text-center">
          <Info className="h-10 w-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-200">No hay datos GPS importados para este partido</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
            Selecciona otra jornada o importa una sesión GPS desde la pestaña de Partido para visualizar el semáforo.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>{processedRows.length} jugadores evaluados</span>
            </CardTitle>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400"></span> ≥ Rango habitual</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400"></span> Desv. moderada</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400"></span> Desv. clara</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500"></span> Muestra corta (&lt;45m / &lt;3p)</span>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold select-none">
                  <th className="p-3 min-w-[180px]">Jugador</th>
                  <th className="p-3 text-center min-w-[65px]">Min</th>
                  <th className="p-3 text-center border-l border-slate-800/60 bg-slate-900/40 text-emerald-400">
                    m/min
                    <span className="block text-[9px] text-slate-500 font-normal">Core</span>
                  </th>
                  <th className="p-3 text-center bg-slate-900/40 text-emerald-400">
                    HSR/min
                    <span className="block text-[9px] text-slate-500 font-normal">Core</span>
                  </th>
                  <th className="p-3 text-center bg-slate-900/40 text-emerald-400">
                    Sprint/min
                    <span className="block text-[9px] text-slate-500 font-normal">Core</span>
                  </th>
                  <th className="p-3 text-center border-l border-slate-800/60">
                    Sprints/90
                    <span className="block text-[9px] text-slate-500 font-normal">Sec.</span>
                  </th>
                  <th className="p-3 text-center">
                    Vel. Máx
                    <span className="block text-[9px] text-slate-500 font-normal">km/h</span>
                  </th>
                  <th className="p-3 text-center">
                    Acc/min
                    <span className="block text-[9px] text-slate-500 font-normal">Sec.</span>
                  </th>
                  <th className="p-3 text-center">
                    Dec/min
                    <span className="block text-[9px] text-slate-500 font-normal">Sec.</span>
                  </th>
                  <th className="p-3 text-center border-l border-slate-800/60 min-w-[130px]">Estado Global</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {processedRows.map((row) => (
                  <tr 
                    key={row.playerId || Math.random().toString()} 
                    onClick={() => setSelectedPlayerDetail(row)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    {/* Jugador */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={row.player?.foto_url}
                          name={row.player?.nombre || 'Jugador'}
                          size="sm"
                          className="h-8 w-8 border border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 truncate">
                              {row.player?.nombre || 'Sin asignar'}
                            </span>
                            {row.player?.dorsal ? (
                              <span className="text-[10px] text-slate-400 font-mono">#{row.player.dorsal}</span>
                            ) : null}
                            {row.esTitular !== undefined && (
                              <Badge variant="default" className={`text-[9px] px-1 py-0 ${row.esTitular ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-slate-800 text-slate-400'}`}>
                                {row.esTitular ? 'Titular' : 'Suplente'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {row.player?.demarcacion || 'Campo'} · {row.validMatchesCount} p. ref (≥45m)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Minutos */}
                    <td className="p-3 text-center font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${row.isValidMatchParticipation ? 'text-slate-200 font-bold' : 'text-slate-500 italic'}`}>
                        {row.minutos}&apos;
                      </span>
                    </td>

                    {/* 7 Métricas con Semáforo y tooltip */}
                    {ALL_METRIC_KEYS.map((key, idx) => {
                      const res = row.metrics[key];
                      const isFirstCore = idx === 0;
                      const isFirstSecondary = idx === 3;
                      const devPct = formatDeviationPct(res.ratio);

                      return (
                        <td
                          key={key}
                          className={`p-2.5 text-center font-mono transition-colors ${getMetricCellClass(res.color)} ${
                            isFirstCore ? 'border-l border-slate-800/60' : ''
                          } ${isFirstSecondary ? 'border-l border-slate-800/60' : ''}`}
                          title={
                            res.historicalAvg !== null
                              ? `Valor: ${formatMetricDisplay(key, res.value)} ${res.unit}\nMedia personal: ${formatMetricDisplay(key, res.historicalAvg)} ${res.unit}\nDesviación: ${devPct} de su media`
                              : `Valor: ${formatMetricDisplay(key, res.value)} ${res.unit}\nSin histórico suficiente (requiere ≥3 partidos de ≥45m)`
                          }
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs">
                              {formatMetricDisplay(key, res.value)}
                            </span>
                            {res.ratio !== null && (
                              <span className="text-[9px] opacity-75 font-normal">
                                {devPct}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Estado Global */}
                    <td className="p-3 text-center border-l border-slate-800/60">
                      <div className="flex flex-col items-center justify-center gap-1" title={row.globalReason}>
                        {getTrafficColorBadge(
                          row.globalStatus,
                          row.globalStatus === 'green' ? '🟢 Óptimo' :
                          row.globalStatus === 'yellow' ? '🟡 Moderado' :
                          row.globalStatus === 'red' ? '🔴 Desviación' : '⚪ Muestra corta'
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 3. MODAL DE CRITERIOS DEL SEMÁFORO (OBLIGATORIO) */}
      <Modal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        title="Criterios y Reglas del Semáforo de Rendimiento"
      >
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[75vh] overflow-y-auto pr-1">
          {/* Aclaración oficial obligatoria */}
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-emerald-300">
            <p className="font-bold flex items-center gap-1.5 text-xs text-emerald-200">
              <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
              Aclaración de Interpretación:
            </p>
            <p className="mt-1 text-[11px]">
              «El semáforo representa desviación respecto a la referencia física habitual del jugador. No determina por sí solo fatiga, rendimiento futbolístico ni valoración técnica.»
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-sm">1. Principio Fundamental</h4>
            <p className="text-slate-300">
              <strong className="text-white">Cada jugador se compara consigo mismo</strong>, nunca con sus compañeros de equipo ni con un promedio grupal. Su estado evalúa si rindió según su patrón físico habitual.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-sm">2. Referencia Personal Fiable</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>Solo computan para la referencia histórica partidos donde el jugador haya disputado <strong className="text-slate-200">≥45 minutos</strong> cronológicamente anteriores al evaluado (el propio partido y posteriores quedan excluidos).</li>
              <li>Se exige un mínimo de <strong className="text-slate-200">3 partidos previos válidos</strong> para considerar su perfil consolidado.</li>
              <li>Si el partido evaluado tiene <strong className="text-slate-200">&lt;45 minutos</strong>, o el jugador tiene menos de 3 partidos previos válidos, se muestran sus datos numéricos reales pero el semáforo y estado global se marcan en <strong className="text-slate-200">⚪ Gris (Muestra corta)</strong> para no inducir a falsos diagnósticos.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-sm">3. Tabla Oficial de Umbrales</h4>
            <p className="text-[11px] text-slate-400">
              Ratio calculado como: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">ratio = valor partido / media personal histórica</code>. En la tabla se muestra la <strong className="text-slate-200">desviación porcentual</strong> (<code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">ratio % − 100</code>): un <span className="text-emerald-400 font-bold">+30%</span> indica que el jugador rindió un 30% por encima de su media, y <span className="text-red-400 font-bold">−15%</span> indica un 15% por debajo.
            </p>
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2">Métrica</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2 text-center text-green-400">🟢 Verde</th>
                    <th className="p-2 text-center text-amber-400">🟡 Amarillo</th>
                    <th className="p-2 text-center text-red-400">🔴 Rojo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="p-2 font-bold text-slate-100">m/min</td>
                    <td className="p-2 text-emerald-400 font-semibold">Core</td>
                    <td className="p-2 text-center">≥ 90%</td>
                    <td className="p-2 text-center">80–89%</td>
                    <td className="p-2 text-center">&lt; 80%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">HSR/min</td>
                    <td className="p-2 text-emerald-400 font-semibold">Core</td>
                    <td className="p-2 text-center">≥ 85%</td>
                    <td className="p-2 text-center">70–84%</td>
                    <td className="p-2 text-center">&lt; 70%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">Sprint/min</td>
                    <td className="p-2 text-emerald-400 font-semibold">Core</td>
                    <td className="p-2 text-center">≥ 80%</td>
                    <td className="p-2 text-center">60–79%</td>
                    <td className="p-2 text-center">&lt; 60%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">Sprints/90</td>
                    <td className="p-2 text-slate-400">Secundaria</td>
                    <td className="p-2 text-center">≥ 80%</td>
                    <td className="p-2 text-center">60–79%</td>
                    <td className="p-2 text-center">&lt; 60%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">Vel. Máx</td>
                    <td className="p-2 text-slate-400">Secundaria</td>
                    <td className="p-2 text-center">≥ 95%</td>
                    <td className="p-2 text-center">90–94%</td>
                    <td className="p-2 text-center">&lt; 90%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">Acc/min</td>
                    <td className="p-2 text-slate-400">Secundaria</td>
                    <td className="p-2 text-center">≥ 85%</td>
                    <td className="p-2 text-center">70–84%</td>
                    <td className="p-2 text-center">&lt; 70%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-100">Dec/min</td>
                    <td className="p-2 text-slate-400">Secundaria</td>
                    <td className="p-2 text-center">≥ 85%</td>
                    <td className="p-2 text-center">70–84%</td>
                    <td className="p-2 text-center">&lt; 70%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-sm">4. Árbol de Decisión del Estado Global</h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
              <div>
                <span className="font-bold text-slate-400">⚪ GRIS:</span> Si el partido evaluado es &lt;45 min o la referencia histórica es &lt;3 partidos válidos.
              </div>
              <div>
                <span className="font-bold text-red-400">🔴 ROJO:</span> Si hay ≥2 métricas Core en rojo, o 1 métrica Core en rojo + ≥2 métricas secundarias en rojo, o HSR/min &lt;55% de su media histórica.
              </div>
              <div>
                <span className="font-bold text-amber-400">🟡 AMARILLO:</span> Si no es rojo y: 1 métrica Core en rojo, o ≥2 métricas Core en amarillo, o ≥3 métricas totales desviadas entre amarillo y rojo.
              </div>
              <div>
                <span className="font-bold text-green-400">🟢 VERDE:</span> Si no se cumple ninguna condición de alerta anterior.
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" onClick={() => setIsCriteriaModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. MODAL DETALLE DE JUGADOR AL HACER CLIC EN FILA */}
      {selectedPlayerDetail && (
        <Modal
          isOpen={!!selectedPlayerDetail}
          onClose={() => setSelectedPlayerDetail(null)}
          title={`Detalle GPS: ${selectedPlayerDetail.player?.nombre || 'Jugador'}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedPlayerDetail.player?.foto_url}
                  name={selectedPlayerDetail.player?.nombre || 'Jugador'}
                  size="md"
                  className="h-10 w-10 border border-slate-700"
                />
                <div>
                  <div className="font-bold text-slate-100 text-sm">
                    {selectedPlayerDetail.player?.nombre} {selectedPlayerDetail.player?.dorsal ? `#${selectedPlayerDetail.player.dorsal}` : ''}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedPlayerDetail.player?.demarcacion || 'Campo'} · {selectedPlayerDetail.minutos} minutos jugados en este partido
                  </div>
                </div>
              </div>

              <div>
                {getTrafficColorBadge(
                  selectedPlayerDetail.globalStatus,
                  selectedPlayerDetail.globalStatus === 'green' ? '🟢 Óptimo' :
                  selectedPlayerDetail.globalStatus === 'yellow' ? '🟡 Moderado' :
                  selectedPlayerDetail.globalStatus === 'red' ? '🔴 Desviación' : '⚪ Muestra corta'
                )}
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
              <strong className="text-slate-100">Motivo del Estado:</strong> {selectedPlayerDetail.globalReason}
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-200">Comparativa con su Media Histórica Personal:</h5>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2">Métrica</th>
                      <th className="p-2 text-center">Valor Jornada</th>
                      <th className="p-2 text-center">Media Personal (≥45m)</th>
                      <th className="p-2 text-center">Desviación s/ Media</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {ALL_METRIC_KEYS.map((key) => {
                      const res = selectedPlayerDetail.metrics[key];
                      const devPct = formatDeviationPct(res.ratio);
                      return (
                        <tr key={key} className="hover:bg-slate-800/30">
                          <td className="p-2 font-medium flex items-center gap-1.5">
                            {res.label}
                            {res.isCore && (
                              <span className="text-[9px] px-1 py-0 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                                Core
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-100">
                            {formatMetricDisplay(key, res.value)} {res.unit}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-400">
                            {res.historicalAvg !== null ? `${formatMetricDisplay(key, res.historicalAvg)} ${res.unit}` : '—'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold">
                            {devPct}
                          </td>
                          <td className="p-2 text-center">
                            {getTrafficColorBadge(res.color)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedPlayerDetail(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
