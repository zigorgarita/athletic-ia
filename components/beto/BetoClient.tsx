'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  UploadCloud,
  Calendar,
  Users,
  Activity,
  Gauge,
  Flame,
  ArrowUpDown,
  ExternalLink,
  Trash2,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  UserCheck,
  UserPlus,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { BetoSession, BetoPlayerSession, BetoImport, Player } from '@/types';
import { BetoImportModal } from './BetoImportModal';
import { BetoRawMetricsModal } from './BetoRawMetricsModal';
import { useEditMode } from '@/context/EditModeContext';
import { getActiveSeason, getAvailableSeasons } from '@/lib/season';

export function BetoClient() {
  const { isEditMode } = useEditMode();
  const [season, setSeason] = useState(getActiveSeason());
  const [sessions, setSessions] = useState<BetoSession[]>([]);
  const [recentImports, setRecentImports] = useState<BetoImport[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<BetoSession | null>(null);
  const [playerSessions, setPlayerSessions] = useState<BetoPlayerSession[]>([]);
  const [playersRoster, setPlayersRoster] = useState<Player[]>([]);

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortField, setSortField] = useState<keyof BetoPlayerSession>('distancia_metros');
  const [sortAsc, setSortAsc] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawMetricsPlayer, setRawMetricsPlayer] = useState<BetoPlayerSession | null>(null);
  const [mappingPlayerId, setMappingPlayerId] = useState<string | null>(null);

  // 1. Cargar lista de sesiones e importaciones
  const loadSessions = async (targetSessionId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/beto/sessions?season=${season}`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        setRecentImports(data.recent_imports || []);

        const toSelect = targetSessionId || selectedSessionId || (data.sessions.length > 0 ? data.sessions[0].id : null);
        if (toSelect) {
          setSelectedSessionId(toSelect);
          await loadSessionDetail(toSelect);
        } else {
          setActiveSession(null);
          setPlayerSessions([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar sesiones BETO:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Cargar detalle de una sesión específica
  const loadSessionDetail = async (sessionId: string) => {
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/beto/sessions?id=${sessionId}`);
      const data = await res.json();
      if (data.session) {
        setActiveSession(data.session);
        setPlayerSessions(data.player_sessions || []);
      }
    } catch (err) {
      console.error('Error al cargar detalle de sesión:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  // 3. Cargar plantilla de jugadores para mapeos
  const loadRoster = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayersRoster(data.players || []);
      }
    } catch (err) {
      console.warn('No se pudo cargar la plantilla completa:', err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadRoster();
  }, [season]);

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    loadSessionDetail(id);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar esta sesión y todas sus métricas?')) return;

    try {
      const res = await fetch(`/api/beto/sessions?id=${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        loadSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Vincular jugador manualmente en 1 clic
  const handleMapPlayer = async (betoPlayerSessionId: string, oliverPlayerId: string | null, targetDbPlayerId: string) => {
    if (!targetDbPlayerId) return;
    try {
      const res = await fetch('/api/beto/players/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: targetDbPlayerId,
          oliver_player_id: oliverPlayerId,
          beto_player_session_id: betoPlayerSessionId,
        }),
      });

      if (res.ok) {
        if (selectedSessionId) {
          loadSessionDetail(selectedSessionId);
        }
        loadRoster();
      }
    } catch (err) {
      console.error('Error al vincular jugador:', err);
    }
  };

  // Ordenación y filtrado de jugadores
  const filteredPlayers = useMemo(() => {
    return playerSessions
      .filter((p) => {
        if (!searchFilter) return true;
        const term = searchFilter.toLowerCase();
        const nameMatch = p.source_player_name.toLowerCase().includes(term);
        const linkedNameMatch = p.players
          ? `${p.players.nombre} ${p.players.apellidos}`.toLowerCase().includes(term)
          : false;
        const dorsalMatch = String(p.dorsal || '').includes(term);
        return nameMatch || linkedNameMatch || dorsalMatch;
      })
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;

        if (typeof valA === 'string') valA = (valA as string).toLowerCase();
        if (typeof valB === 'string') valB = (valB as string).toLowerCase();

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [playerSessions, searchFilter, sortField, sortAsc]);

  const handleSort = (field: keyof BetoPlayerSession) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Métricas agregadas de la sesión activa
  const sessionStats = useMemo(() => {
    if (playerSessions.length === 0) return null;

    const totalDist = playerSessions.reduce((acc, p) => acc + (p.distancia_metros || 0), 0);
    const avgDist = totalDist / playerSessions.length;
    const maxSpeed = Math.max(...playerSessions.map((p) => p.velocidad_maxima || 0), 0);
    const totalSprints = playerSessions.reduce((acc, p) => acc + (p.sprints_count || 0), 0);
    const totalAccels = playerSessions.reduce((acc, p) => acc + (p.aceleraciones_count || 0), 0);
    const avgIntensity =
      playerSessions.filter((p) => p.metros_minuto).length > 0
        ? playerSessions.reduce((acc, p) => acc + (p.metros_minuto || 0), 0) /
          playerSessions.filter((p) => p.metros_minuto).length
        : 0;

    return {
      totalDistKm: (totalDist / 1000).toFixed(2),
      avgDistMeters: Math.round(avgDist),
      maxSpeed: maxSpeed.toFixed(1),
      totalSprints,
      totalAccels,
      avgIntensity: avgIntensity.toFixed(1),
      mappedCount: playerSessions.filter((p) => p.player_id).length,
    };
  }, [playerSessions]);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 text-white shadow-lg shadow-red-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">BETO</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-[#CC0E21] border border-red-500/20">
                  OLIVER GPS v1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingesta, análisis físico y archivo en Google Drive de sesiones GPS exportadas desde OLIVER.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => loadSessions()}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#CC0E21] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar sesión OLIVER</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Sesiones / Carrusel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            Sesiones Registradas ({sessions.length})
          </h2>
          <span className="text-xs text-slate-500">Temporada: {season}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No hay sesiones de OLIVER importadas todavía</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Haz clic en <strong>"Importar sesión OLIVER"</strong> para cargar tu primer archivo Excel o CSV de rendimiento físico.
            </p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              Importar ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessions.map((sess) => {
              const isSelected = sess.id === selectedSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-red-500/60 shadow-lg shadow-red-500/5 ring-1 ring-red-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            sess.session_type === 'PARTIDO'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {sess.session_type}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{sess.session_date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{sess.session_name}</h4>
                    </div>

                    {isEditMode && (
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-all"
                        title="Eliminar sesión"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sess.total_players} Jugadores</span>
                    </div>

                    {sess.beto_imports?.drive_file_url && (
                      <a
                        href={sess.beto_imports.drive_file_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-slate-500 hover:text-blue-400 transition-colors"
                        title="Ver original en Google Drive"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Detalle de la Sesión Activa */}
      {activeSession && (
        <div className="space-y-6">
          {/* Header de Sesión & Tarjetas KPI */}
          <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-black text-white">{activeSession.session_name}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    {activeSession.session_date}
                  </span>
                  {activeSession.oliver_session_id && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                      ID OLIVER: {activeSession.oliver_session_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Tipo: <strong className="text-slate-200">{activeSession.session_type}</strong> • Duración:{' '}
                  <strong className="text-slate-200">
                    {activeSession.duration_minutes ? `${activeSession.duration_minutes} min` : 'No especificada'}
                  </strong>
                </p>
              </div>

              {activeSession.beto_imports?.drive_file_url && (
                <a
                  href={activeSession.beto_imports.drive_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shrink-0"
                >
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span>Archivo Original en Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>

            {/* KPI Cards */}
            {sessionStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Jugadores</span>
                  </div>
                  <p className="text-lg font-black text-white">
                    {playerSessions.length}{' '}
                    <span className="text-[10px] text-emerald-400 font-normal">
                      ({sessionStats.mappedCount} vinc.)
                    </span>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Activity className="w-3.5 h-3.5 text-red-400" />
                    <span>Distancia Total</span>
                  </div>
                  <p className="text-lg font-black text-white">{sessionStats.totalDistKm} km</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>Media Distancia</span>
                  </div>
                  <p className="text-lg font-black text-white">{sessionStats.avgDistMeters} m</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Metros / Min</span>
                  </div>
                  <p className="text-lg font-black text-white">{sessionStats.avgIntensity} m/min</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Vel. Máx Sesión</span>
                  </div>
                  <p className="text-lg font-black text-white">{sessionStats.maxSpeed} km/h</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sprints / Acel</span>
                  </div>
                  <p className="text-lg font-black text-white">
                    {sessionStats.totalSprints} / {sessionStats.totalAccels}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Jugadores y Métricas */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Rendimiento Físico por Jugador</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {filteredPlayers.length}
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por jugador o dorsal..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            {sessionLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Cargando métricas de la sesión...</div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-x-auto bg-slate-900/60 shadow-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Jugador</th>
                      <th className="py-3 px-4">Estado Plantilla</th>
                      <th
                        onClick={() => handleSort('minutos')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Minutos</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('distancia_metros')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Distancia</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('metros_minuto')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>m / min</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('velocidad_maxima')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Vel. Máx</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('distancia_sprint')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Dist. Sprint</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('sprints_count')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Sprints</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('aceleraciones_count')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Acel / Decel</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('impactos_count')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Impactos / Golpes</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Detalle Raw</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500">
                          No se encontraron jugadores que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p) => {
                        const dbPlayer = p.players;
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                            {/* Jugador */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {dbPlayer?.foto_url ? (
                                  <img
                                    src={dbPlayer.foto_url}
                                    alt={p.source_player_name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                    {p.dorsal || p.source_player_name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-white flex items-center gap-1.5">
                                    {p.dorsal ? <span className="text-red-400 font-mono">#{p.dorsal}</span> : null}
                                    {p.source_player_name}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {dbPlayer ? `${dbPlayer.demarcacion || ''}` : p.posicion || 'Posición N/A'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Estado Vinculación */}
                            <td className="py-3 px-4">
                              {dbPlayer ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <UserCheck className="w-3 h-3" />
                                  <span>Vinculado</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    onChange={(e) => handleMapPlayer(p.id, p.oliver_player_id, e.target.value)}
                                    defaultValue=""
                                    className="px-2 py-1 bg-slate-950 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 focus:outline-none focus:border-amber-400"
                                  >
                                    <option value="" disabled>
                                      + Vincular a jugador...
                                    </option>
                                    {playersRoster.map((rp) => (
                                      <option key={rp.id} value={rp.id}>
                                        #{rp.dorsal} {rp.nombre} {rp.apellidos}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>

                            {/* Minutos */}
                            <td className="py-3 px-4 font-mono font-medium text-slate-200">
                              {p.minutos ? `${p.minutos} min` : '-'}
                            </td>

                            {/* Distancia Total */}
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              {p.distancia_metros ? `${p.distancia_metros.toLocaleString()} m` : '-'}
                            </td>

                            {/* Metros / Minuto */}
                            <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                              {p.metros_minuto ? `${p.metros_minuto} m/min` : '-'}
                            </td>

                            {/* Vel. Máx */}
                            <td className="py-3 px-4 font-mono font-semibold text-amber-300">
                              {p.velocidad_maxima ? `${p.velocidad_maxima} km/h` : '-'}
                            </td>

                            {/* Dist. Sprint */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {p.distancia_sprint ? `${p.distancia_sprint} m` : '-'}
                            </td>

                            {/* Sprints Count */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {p.sprints_count !== null && p.sprints_count !== undefined ? p.sprints_count : '-'}
                            </td>

                            {/* Accel / Decel */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {(p.aceleraciones_count ?? '-') + ' / ' + (p.deceleraciones_count ?? '-')}
                            </td>

                            {/* Impactos / Golpes */}
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {(p.impactos_count ?? '-') + ' / ' + (p.golpes_balon ?? '-')}
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setRawMetricsPlayer(p)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors"
                              >
                                <Database className="w-3 h-3 text-red-400" />
                                <span>Ver Raw</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Modales */}
      <BetoImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(newSessionId) => {
          setIsImportModalOpen(false);
          loadSessions(newSessionId);
        }}
        season={season}
      />

      <BetoRawMetricsModal
        isOpen={!!rawMetricsPlayer}
        onClose={() => setRawMetricsPlayer(null)}
        playerSession={rawMetricsPlayer}
      />
    </div>
  );
}
