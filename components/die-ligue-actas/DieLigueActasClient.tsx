'use client';

import React, { useState, useEffect } from 'react';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Users,
  Shield,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import {
  DieLiguePlayerActa,
  DieLigueJornadaResponse,
} from '@/lib/die-ligen/actas';

export function DieLigueActasClient() {
  const [jornada, setJornada] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DieLigueJornadaResponse | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<Record<string, 'alineaciones' | 'eventos' | 'tactica'>>({});

  const fetchJornadaData = async (targetJornada: number) => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const res = await fetch(`/api/die-ligen/jornada?jornada=${targetJornada}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Respuesta inválida de la API');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al cargar jornada';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJornadaData(jornada);
  }, [jornada]);

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId((prev) => (prev === matchId ? null : matchId));
    if (!selectedSubTab[matchId]) {
      setSelectedSubTab((prev) => ({ ...prev, [matchId]: 'alineaciones' }));
    }
  };

  const setTabForMatch = (matchId: string, tab: 'alineaciones' | 'eventos' | 'tactica') => {
    setSelectedSubTab((prev) => ({ ...prev, [matchId]: tab }));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 text-slate-100">
      {/* 1. Cabecera Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500/40 shadow-lg shadow-blue-950/40 flex items-center justify-center shrink-0">
              <Film className="w-8 h-8 text-blue-400" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Visor Paralelo Oficial
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Solo Lectura
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1.5 flex items-center gap-2">
                <span>INDAUTXU · DIE LIGUE</span>
              </h1>

              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Reconstrucción deportiva de partidos mediante telemetría y videoanálisis de Die Ligue:
                alineaciones, minutaje exacto, cronología de eventos, formación táctica y clips de vídeo.
              </p>
            </div>
          </div>

          {/* Resumen de estado de la Jornada */}
          {data && (
            <div className="hidden lg:flex flex-col items-end justify-center shrink-0 pl-6 border-l border-slate-800/80 text-right">
              <div className="text-xs text-slate-400 font-medium">Estado Jornada {jornada}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                  {data.finalizadosCount} Completos
                </span>
                {data.pendientesCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-950/60 border border-amber-500/30 text-amber-400">
                    {data.pendientesCount} Pendientes
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selector de Jornada */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Jornada:</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((j) => (
              <button
                key={j}
                onClick={() => setJornada(j)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  jornada === j
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                J{j}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchJornadaData(jornada)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback de Carga y Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
          <p className="text-sm text-slate-300 font-medium">Consultando API externa de Die Ligue...</p>
          <span className="text-xs text-slate-500 mt-1">Obteniendo actas de los 8 partidos de la Jornada {jornada}</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/60 text-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-300">Error al consultar Die Ligue</h3>
              <p className="text-xs text-red-200/80 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Listado de 8 Partidos */}
      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
            <span>Mostrando {data.totalPartidos} encuentros de División de Honor Juvenil (Grupo 2)</span>
            <span>Fuente: Die Ligen Analysis Engine</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {data.matches.map((match) => {
              const isExpanded = expandedMatchId === match.id;
              const currentSubTab = selectedSubTab[match.id] || 'alineaciones';

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    match.isFinished
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80 shadow-md'
                      : 'bg-slate-900/50 border-amber-900/30'
                  }`}
                >
                  {/* Fila Principal de la Tarjeta */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Metadatos (Fecha, Hora, Campo) */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                      {match.fecha && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(match.fecha).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                      {match.hora && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {match.hora}
                        </span>
                      )}
                      {match.campo && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={match.campo}>
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{match.campo}</span>
                        </span>
                      )}
                    </div>

                    {/* Marcador y Equipos */}
                    <div className="flex items-center justify-center gap-4 flex-1">
                      {/* Local */}
                      <div className="flex items-center gap-2.5 flex-1 justify-end text-right">
                        <span className="text-sm md:text-base font-extrabold text-white truncate max-w-[180px]">
                          {match.homeTeam.name}
                        </span>
                        {match.homeTeam.logoUrl ? (
                          <img
                            src={match.homeTeam.logoUrl}
                            alt={match.homeTeam.name}
                            className="w-7 h-7 object-contain rounded-full bg-slate-950/60 p-0.5 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-600 shrink-0" />
                        )}
                      </div>

                      {/* Resultado / Estado */}
                      <div className="px-4 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center min-w-[90px]">
                        {match.isFinished ? (
                          <div>
                            <div className="text-base sm:text-lg font-black tracking-tight text-white">
                              {match.scoreHome} - {match.scoreAway}
                            </div>
                            {match.scoreHalftimeHome !== null && match.scoreHalftimeAway !== null && (
                              <div className="text-[10px] text-slate-500 font-mono -mt-0.5">
                                ({match.scoreHalftimeHome}-{match.scoreHalftimeAway})
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-amber-400">
                            {match.status}
                          </div>
                        )}
                      </div>

                      {/* Visitante */}
                      <div className="flex items-center gap-2.5 flex-1 justify-start text-left">
                        {match.awayTeam.logoUrl ? (
                          <img
                            src={match.awayTeam.logoUrl}
                            alt={match.awayTeam.name}
                            className="w-7 h-7 object-contain rounded-full bg-slate-950/60 p-0.5 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-600 shrink-0" />
                        )}
                        <span className="text-sm md:text-base font-extrabold text-white truncate max-w-[180px]">
                          {match.awayTeam.name}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Estado y Botón de Despliegue */}
                    <div className="flex items-center justify-end gap-3 shrink-0">
                      {match.isFinished ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> FINISHED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-950/50 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> PENDIENTE DIE LIGUE
                        </span>
                      )}

                      {match.isFinished ? (
                        <button
                          onClick={() => toggleExpand(match.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <span>{isExpanded ? 'Ocultar Acta' : 'Ver Acta'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-500 border border-slate-800 text-xs font-medium cursor-not-allowed"
                        >
                          En calibración
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Panel si NO está FINISHED */}
                  {!match.isFinished && (
                    <div className="px-5 py-3 bg-amber-950/10 border-t border-amber-900/20 text-xs text-amber-300/80 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Estado en Die Ligue: <strong>{match.status}</strong>. Este encuentro aún se encuentra en proceso
                        de sincronización o corte audiovisual por el equipo de analistas. No se computan alineaciones ni minutaje hasta su finalización.
                      </span>
                    </div>
                  )}

                  {/* Panel Desplegable con el Acta Deportiva Completa */}
                  {match.isFinished && isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-5 space-y-6">
                      {/* Sub-navegación del Acta */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTabForMatch(match.id, 'alineaciones')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currentSubTab === 'alineaciones'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" /> Alineaciones y Minutaje
                          </button>
                          <button
                            onClick={() => setTabForMatch(match.id, 'eventos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currentSubTab === 'eventos'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Cronología ({match.events.length})
                          </button>
                          <button
                            onClick={() => setTabForMatch(match.id, 'tactica')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              currentSubTab === 'tactica'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" /> Pizarra Táctica
                          </button>
                        </div>

                        {match.mainVideoUrl && (
                          <a
                            href={match.mainVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Vídeo Íntegro 1080p</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        )}
                      </div>

                      {/* 1. TAB ALINEACIONES Y MINUTAJE */}
                      {currentSubTab === 'alineaciones' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Columna Local */}
                          <TeamLineupTable
                            team={match.homeTeam}
                            isHome={true}
                          />

                          {/* Columna Visitante */}
                          <TeamLineupTable
                            team={match.awayTeam}
                            isHome={false}
                          />
                        </div>
                      )}

                      {/* 2. TAB CRONOLOGÍA DE EVENTOS */}
                      {currentSubTab === 'eventos' && (
                        <div className="space-y-2">
                          {match.events.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-6">No hay eventos registrados en este partido.</p>
                          ) : (
                            match.events.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-black text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/30">
                                    {ev.minutoTexto}
                                  </span>

                                  {ev.tipo === 'GOL' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">⚽</span>
                                      <div>
                                        <span className="font-bold text-white">
                                          {ev.esAutogol ? 'Autogol de ' : 'Gol de '}
                                          {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Desconocido'}
                                        </span>
                                        {ev.jugadorSecundario && !ev.esAutogol && (
                                          <span className="text-slate-400 block text-[11px]">
                                            🅰️ Asistencia: #{ev.jugadorSecundario.dorsal} {ev.jugadorSecundario.nombre}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {ev.tipo === 'TARJETA' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">
                                        {ev.tipoTarjeta === 'ROJA' ? '🟥' : '🟨'}
                                      </span>
                                      <div>
                                        <span className="font-bold text-white">
                                          Tarjeta {ev.tipoTarjeta?.toLowerCase()} para{' '}
                                          {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador'}
                                        </span>
                                        <span className="text-slate-400 block text-[11px]">{ev.equipoNombre}</span>
                                      </div>
                                    </div>
                                  )}

                                  {ev.tipo === 'SUSTITUCION' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">🔄</span>
                                      <div>
                                        <span className="text-emerald-400 font-bold">
                                          Entra: #{ev.jugadorPrincipal?.dorsal} {ev.jugadorPrincipal?.nombre}
                                        </span>
                                        <span className="text-red-400 block text-[11px]">
                                          Sale: #{ev.jugadorSecundario?.dorsal} {ev.jugadorSecundario?.nombre}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {ev.videoUrl && (
                                  <a
                                    href={ev.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span>Clip Jugada</span>
                                  </a>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* 3. TAB PIZARRA TÁCTICA */}
                      {currentSubTab === 'tactica' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                              {match.homeTeam.name}
                            </h4>
                            <p className="text-sm font-black text-blue-400">
                              Formación: {match.homeTeam.formation || 'No especificada'}
                            </p>
                            {match.homeTeam.coach && (
                              <p className="text-xs text-slate-400 mt-1">Entrenador: {match.homeTeam.coach}</p>
                            )}
                            <div className="mt-4 space-y-1">
                              {match.homeTeam.players.filter((p) => p.starting).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                                  <span className="text-slate-300">
                                    <strong className="text-white">#{p.shirtNumber}</strong> {p.playerName}
                                  </span>
                                  <span className="font-mono text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded text-[10px]">
                                    {p.positionKey || p.positionName || 'DEF'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                              {match.awayTeam.name}
                            </h4>
                            <p className="text-sm font-black text-blue-400">
                              Formación: {match.awayTeam.formation || 'No especificada'}
                            </p>
                            {match.awayTeam.coach && (
                              <p className="text-xs text-slate-400 mt-1">Entrenador: {match.awayTeam.coach}</p>
                            )}
                            <div className="mt-4 space-y-1">
                              {match.awayTeam.players.filter((p) => p.starting).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                                  <span className="text-slate-300">
                                    <strong className="text-white">#{p.shirtNumber}</strong> {p.playerName}
                                  </span>
                                  <span className="font-mono text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded text-[10px]">
                                    {p.positionKey || p.positionName || 'DEF'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamLineupTable({
  team,
  isHome,
}: {
  team: { name: string; coach?: string | null; formation?: string | null; players: DieLiguePlayerActa[] };
  isHome: boolean;
}) {
  const starters = team.players.filter((p) => p.starting);
  const subs = team.players.filter((p) => !p.starting);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{team.name}</span>
            <span className="text-[10px] text-slate-400 font-normal">({isHome ? 'Local' : 'Visitante'})</span>
          </h3>
          {team.coach && <span className="text-[11px] text-slate-400">DT: {team.coach}</span>}
        </div>
        {team.formation && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-blue-400 border border-slate-700">
            {team.formation}
          </span>
        )}
      </div>

      {/* Titulares (11) */}
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
          <span>Titulares ({starters.length})</span>
          <span>Minutos Jugados</span>
        </div>
        <div className="space-y-1">
          {starters.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </div>
      </div>

      {/* Suplentes */}
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
          <span>Suplentes ({subs.length})</span>
          <span>Minutos Jugados</span>
        </div>
        <div className="space-y-1">
          {subs.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: DieLiguePlayerActa }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60 text-xs hover:bg-slate-800/60 transition-all">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono font-bold text-slate-400 w-5 text-right shrink-0">
          {player.shirtNumber}
        </span>
        <span className="font-medium text-slate-200 truncate">{player.playerName}</span>

        {player.positionKey && (
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 py-0.2 rounded shrink-0">
            {player.positionKey}
          </span>
        )}

        {/* Indicadores de Eventos */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {player.goles > 0 && (
            <span className="text-emerald-400 font-bold text-[11px]" title={`${player.goles} goles`}>
              ⚽{player.goles > 1 ? player.goles : ''}
            </span>
          )}
          {player.asistencias > 0 && (
            <span className="text-blue-400 font-bold text-[11px]" title={`${player.asistencias} asistencias`}>
              🅰️{player.asistencias > 1 ? player.asistencias : ''}
            </span>
          )}
          {player.tarjetaAmarilla && <span title="Tarjeta Amarilla">🟨</span>}
          {player.tarjetaRoja && <span title="Tarjeta Roja">🟥</span>}
        </div>
      </div>

      {/* Minutaje y Sustituciones */}
      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
        {player.starting ? (
          player.minutoSalida !== null ? (
            <span className="text-slate-400 flex items-center gap-1">
              <span>{player.minutosJugados}&apos;</span>
              <span className="text-[10px] text-red-400" title={`Salió en el minuto ${player.minutoSalida}`}>
                (⬇{player.minutoSalida}&apos;)
              </span>
            </span>
          ) : (
            <span className="text-emerald-400 font-bold">90&apos;</span>
          )
        ) : player.minutoEntrada !== null ? (
          <span className="text-slate-300 flex items-center gap-1">
            <span>{player.minutosJugados}&apos;</span>
            <span className="text-[10px] text-emerald-400" title={`Entró en el minuto ${player.minutoEntrada}`}>
              (⬆{player.minutoEntrada}&apos;)
            </span>
          </span>
        ) : (
          <span className="text-slate-600 text-[11px]">No jugó</span>
        )}
      </div>
    </div>
  );
}
