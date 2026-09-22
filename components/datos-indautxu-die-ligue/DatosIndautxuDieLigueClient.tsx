'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Users,
  Trophy,
  Calendar as CalendarIcon,
  Shield,
  Search,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import {
  DieLigueDatosLigaResponse,
  DieLigueRivalInfo,
} from '@/lib/die-ligen/datos-liga';
import { DieLigueMatchDetailModal } from './DieLigueMatchDetailModal';

export type DieLigueMainTab = 'jugadores' | 'clasificacion' | 'calendario' | 'rivales';

interface TabItem {
  id: DieLigueMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

type SortField =
  | 'dorsal'
  | 'nombre'
  | 'demarcacion'
  | 'minutosJugados'
  | 'porcentajeMinutos'
  | 'partidosJugados'
  | 'titularidades'
  | 'convocatorias'
  | 'goles'
  | 'asistencias';

export function DatosIndautxuDieLigueClient() {
  const [activeTab, setActiveTab] = useState<DieLigueMainTab>('jugadores');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DieLigueDatosLigaResponse | null>(null);

  // Filtros y ordenación de Jugadores
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDemarcacion, setFilterDemarcacion] = useState<string>('TODAS');
  const [sortField, setSortField] = useState<SortField>('dorsal');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtros de Calendario
  const [calendarFilterEstado, setCalendarFilterEstado] = useState<'todos' | 'jugados' | 'pendientes'>('todos');
  const [calendarFilterSede, setCalendarFilterSede] = useState<'todos' | 'casa' | 'fuera'>('todos');

  // Estado para Rivales
  const [selectedRivalName, setSelectedRivalName] = useState<string | null>(null);
  const [rivalData, setRivalData] = useState<DieLigueRivalInfo | null>(null);
  const [rivalLoading, setRivalLoading] = useState(false);

  // Modal de Detalle de Partido Die Ligue
  const [modalMatchInfo, setModalMatchInfo] = useState<{
    isOpen: boolean;
    gameId?: string;
    jornada?: number;
    homeTeamName?: string;
    awayTeamName?: string;
  }>({ isOpen: false });

  const fetchGlobalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const res = await fetch('/api/die-ligen/datos-liga', {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Error al obtener datos');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const loadRivalDetails = async (rivalName: string) => {
    setSelectedRivalName(rivalName);
    setRivalLoading(true);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const res = await fetch(`/api/die-ligen/datos-liga?rival=${encodeURIComponent(rivalName)}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRivalData(json.data);
      }
    } catch (err: unknown) {
      console.error('Error cargando rival:', err);
    } finally {
      setRivalLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'dorsal' || field === 'nombre');
    }
  };

  const sortedIndautxuPlayers = useMemo(() => {
    if (!data?.indautxuPlayers) return [];
    return data.indautxuPlayers
      .filter((p) => {
        const matchesSearch =
          p.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dorsal.toString().includes(searchTerm);
        const matchesDem = filterDemarcacion === 'TODAS' || p.demarcacion === filterDemarcacion;
        return matchesSearch && matchesDem;
      })
      .sort((a, b) => {
        if (sortField === 'nombre') {
          return sortAsc ? a.nombreCompleto.localeCompare(b.nombreCompleto) : b.nombreCompleto.localeCompare(a.nombreCompleto);
        }
        if (sortField === 'demarcacion') {
          return sortAsc ? a.demarcacion.localeCompare(b.demarcacion) : b.demarcacion.localeCompare(a.demarcacion);
        }
        let numA = Number(a[sortField] ?? 0);
        let numB = Number(b[sortField] ?? 0);
        if (sortField === 'goles') {
          numA = a.isPortero ? -(a.golesEncajados ?? 999) : a.goles;
          numB = b.isPortero ? -(b.golesEncajados ?? 999) : b.goles;
        }
        return sortAsc ? numA - numB : numB - numA;
      });
  }, [data?.indautxuPlayers, searchTerm, filterDemarcacion, sortField, sortAsc]);

  const filteredCalendar = useMemo(() => {
    if (!data?.calendar) return [];
    return data.calendar.filter((m) => {
      if (calendarFilterEstado === 'jugados' && m.status !== 'FINISHED') return false;
      if (calendarFilterEstado === 'pendientes' && m.status === 'FINISHED') return false;
      if (calendarFilterSede === 'casa' && !m.esLocal) return false;
      if (calendarFilterSede === 'fuera' && m.esLocal) return false;
      return true;
    });
  }, [data?.calendar, calendarFilterEstado, calendarFilterSede]);

  const TABS: TabItem[] = [
    {
      id: 'jugadores',
      label: 'JUGADORES',
      icon: Users,
      badge: data?.indautxuPlayers ? String(data.indautxuPlayers.length) : 'Plantilla',
      description: 'Estadísticas acumuladas y minutaje calculados desde Die Ligue',
    },
    {
      id: 'clasificacion',
      label: 'CLASIFICACIÓN',
      icon: Trophy,
      badge: 'Die Ligue',
      description: 'Clasificación matemática calculada a partir de los marcadores del grupo',
    },
    {
      id: 'calendario',
      label: 'CALENDARIO',
      icon: CalendarIcon,
      badge: '30',
      description: 'Jornadas de Liga, marcadores y estado en la plataforma',
    },
    {
      id: 'rivales',
      label: 'RIVALES',
      icon: Shield,
      badge: data?.rivals ? String(data.rivals.length) : '15',
      description: 'Plantillas acumuladas y calendario de rivales en Die Ligue',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 text-slate-100">
      {/* 1. Cabecera Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500/40 shadow-lg shadow-blue-950/40 flex items-center justify-center shrink-0">
              <img src="/escudo.jpg" alt="SD Indautxu" className="w-full h-full object-contain p-1.5" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold tracking-widest text-blue-400 uppercase px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  División de Honor Juvenil • Grupo 2
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  Temporada 2026/27
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2">
                DATOS INDAUTXU · DIE LIGUE
              </h1>

              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Panel integral de rendimiento de Liga: estadísticas acumuladas de plantilla, clasificación
                calculada, calendario de 30 jornadas y seguimiento de rivales alimentado exclusivamente por Die Ligue.
              </p>
            </div>
          </div>

          {/* Badge de Verificación */}
          <div className="hidden lg:flex flex-col items-end justify-center shrink-0 pl-6 border-l border-slate-800/80 text-right">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fuente Die Ligue</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Telemetría y Videoanálisis
            </div>
          </div>
        </div>

        {/* 2. Barra de Navegación por Subpestañas */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60 font-extrabold'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchGlobalData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shrink-0 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Actualizar Die Ligue</span>
          </button>
        </div>
      </div>

      {/* Estados de Carga / Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-slate-900/40 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Cargando datos de Liga desde Die Ligue...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-red-950/30 border border-red-800/60 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-red-200">Error al conectar con Die Ligue</h3>
            <p className="text-sm text-red-300/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 3. Subpestaña: JUGADORES */}
      {!loading && !error && activeTab === 'jugadores' && data && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen de Equipo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Partidos Liga
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                  Die Ligue
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2 font-mono">
                {data.summary.partidosDisputados}
              </p>
              <p className="text-xs text-slate-500 mt-1">Disputados con acta cerrada</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Minutos Posibles
              </span>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2 font-mono">
                {data.summary.minutosPosibles}&apos;
              </p>
              <p className="text-xs text-slate-500 mt-1">{data.summary.partidosDisputados} × 90 minutos</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Goles Favor
              </span>
              <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-2 font-mono">
                {data.summary.golesFavor}
              </p>
              <p className="text-xs text-slate-500 mt-1">Registrados en Die Ligue</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Goles Contra
              </span>
              <p className="text-2xl md:text-3xl font-bold text-rose-400 mt-2 font-mono">
                {data.summary.golesContra}
              </p>
              <p className="text-xs text-slate-500 mt-1">Encajados en competición</p>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/60 p-3 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por jugador o dorsal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {['TODAS', 'Portero', 'Defensa', 'Centrocampista', 'Delantero'].map((dem) => (
                <button
                  key={dem}
                  onClick={() => setFilterDemarcacion(dem)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    filterDemarcacion === dem
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {dem}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Estadísticas de Jugadores */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[1080px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 select-none">
                    <th onClick={() => handleSort('dorsal')} className="py-3 px-3 cursor-pointer hover:text-slate-200 w-14 text-center">
                      <div className="flex items-center justify-center gap-1">DOR <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th onClick={() => handleSort('nombre')} className="py-3 px-4 cursor-pointer hover:text-slate-200 min-w-[200px]">
                      <div className="flex items-center gap-1">JUGADOR <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th onClick={() => handleSort('demarcacion')} className="py-3 px-3 cursor-pointer hover:text-slate-200">POS</th>
                    <th onClick={() => handleSort('minutosJugados')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-200">MIN JUG</th>
                    <th className="py-3 px-3 text-right text-slate-500">MIN POS</th>
                    <th onClick={() => handleSort('porcentajeMinutos')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-200">% MIN</th>
                    <th onClick={() => handleSort('partidosJugados')} className="py-3 px-3 text-center cursor-pointer hover:text-slate-200">PJ</th>
                    <th onClick={() => handleSort('titularidades')} className="py-3 px-3 text-center cursor-pointer hover:text-slate-200">TIT</th>
                    <th onClick={() => handleSort('convocatorias')} className="py-3 px-3 text-center cursor-pointer hover:text-slate-200">CONV</th>
                    <th className="py-3 px-3 text-center">SUPL</th>
                    <th className="py-3 px-3 text-center">ENTRÓ</th>
                    <th onClick={() => handleSort('goles')} className="py-3 px-3 text-center cursor-pointer hover:text-slate-200">GOL / ENC</th>
                    <th onClick={() => handleSort('asistencias')} className="py-3 px-3 text-center cursor-pointer hover:text-slate-200 text-blue-400">ASIST</th>
                    <th className="py-3 px-3 text-center">AMAR</th>
                    <th className="py-3 px-3 text-center">ROJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                  {sortedIndautxuPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-500">No se encontraron jugadores que coincidan con la búsqueda.</td>
                    </tr>
                  ) : (
                    sortedIndautxuPlayers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">{p.dorsal}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                              {p.nombre.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{p.nombreCompleto}</span>
                              {p.posicionTacticas.length > 0 && (
                                <span className="text-[10px] text-blue-400 font-mono">
                                  {p.posicionTacticas.join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.demarcacion === 'Portero'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : p.demarcacion === 'Defensa'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : p.demarcacion === 'Centrocampista'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {p.demarcacion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{p.minutosJugados}&apos;</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">{p.minutosPosibles}&apos;</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-slate-300">{p.porcentajeMinutos}%</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.porcentajeMinutos}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300 font-semibold">{p.partidosJugados}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">{p.titularidades}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">{p.convocatorias}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{p.suplencias}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{p.entradasBanquillo}</td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {p.isPortero ? (
                            <span className="text-amber-400 font-semibold" title={`Encajados: ${p.golesEncajados ?? 0}`}>
                              🧤 {p.golesEncajados ?? 0}
                            </span>
                          ) : p.goles > 0 ? (
                            <span className="text-emerald-400 font-black">⚽ {p.goles}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {p.asistencias > 0 ? (
                            <span className="text-blue-400 font-bold">🅰️ {p.asistencias}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {p.tarjetasAmarillas > 0 ? (
                            <span className="text-amber-400 font-bold">🟨 {p.tarjetasAmarillas}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {p.tarjetasRojas > 0 || p.doblesAmarillas > 0 ? (
                            <span className="text-rose-400 font-bold">🟥 {p.tarjetasRojas + p.doblesAmarillas}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Subpestaña: CLASIFICACIÓN */}
      {!loading && !error && activeTab === 'clasificacion' && data && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Clasificación calculada · Die Ligue</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculada matemáticamente a partir de los marcadores de partidos finalizados del grupo.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-semibold">
              {data.standingsCompletitud}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 select-none">
                    <th className="py-3 px-3 w-12 text-center">POS</th>
                    <th className="py-3 px-4 min-w-[220px]">EQUIPO</th>
                    <th className="py-3 px-3 text-center">PJ</th>
                    <th className="py-3 px-3 text-center">G</th>
                    <th className="py-3 px-3 text-center">E</th>
                    <th className="py-3 px-3 text-center">P</th>
                    <th className="py-3 px-3 text-center">GF</th>
                    <th className="py-3 px-3 text-center">GC</th>
                    <th className="py-3 px-3 text-center">DG</th>
                    <th className="py-3 px-3 text-center font-bold text-white">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                  {data.standings.map((row) => (
                    <tr
                      key={row.nombre}
                      className={`transition-colors ${
                        row.esIndautxu
                          ? 'bg-red-950/20 border-l-4 border-red-500 font-bold'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-300">
                        {row.posicion}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {row.logoUrl ? (
                            <img src={row.logoUrl} alt={row.nombre} className="w-6 h-6 object-contain shrink-0" />
                          ) : (
                            <Shield className="w-5 h-5 text-slate-600 shrink-0" />
                          )}
                          <span className={`truncate ${row.esIndautxu ? 'text-red-300 font-extrabold' : 'text-slate-200'}`}>
                            {row.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">{row.partidosJugados}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{row.ganados}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{row.empatados}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{row.perdidos}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400">{row.golesFavor}</td>
                      <td className="py-3 px-3 text-center font-mono text-rose-400">{row.golesContra}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300 font-semibold">
                        {row.diferenciaGoles > 0 ? `+${row.diferenciaGoles}` : row.diferenciaGoles}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-white">
                        {row.puntos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Subpestaña: CALENDARIO (30 JORNADAS) */}
      {!loading && !error && activeTab === 'calendario' && data && (
        <div className="space-y-6">
          {/* Filtros de Calendario */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase">Estado:</span>
              {(['todos', 'jugados', 'pendientes'] as const).map((est) => (
                <button
                  key={est}
                  onClick={() => setCalendarFilterEstado(est)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all uppercase ${
                    calendarFilterEstado === est ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase">Sede:</span>
              {(['todos', 'casa', 'fuera'] as const).map((sede) => (
                <button
                  key={sede}
                  onClick={() => setCalendarFilterSede(sede)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all uppercase ${
                    calendarFilterSede === sede ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sede}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de 30 Jornadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCalendar.map((match) => (
              <div
                key={match.jornada}
                className={`p-4 rounded-2xl border transition-all ${
                  match.status === 'FINISHED'
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : match.status === 'NOT_PUBLISHED'
                    ? 'bg-slate-950/40 border-slate-900 opacity-70'
                    : 'bg-slate-900/50 border-amber-900/30'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      JORNADA {match.jornada}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {match.esLocal ? 'Local (Iparralde)' : 'Visitante'}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    match.status === 'FINISHED'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : match.status === 'NOT_PUBLISHED'
                      ? 'bg-slate-900 text-slate-500 border border-slate-800'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                  }`}>
                    {match.statusLabel}
                  </span>
                </div>

                {/* Rival y Resultado */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {match.rivalLogo ? (
                      <img src={match.rivalLogo} alt={match.rival} className="w-9 h-9 object-contain shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{match.rival}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {match.fecha && (
                          <span>{new Date(match.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {match.hora && <span>• {match.hora}</span>}
                        {match.campo && <span className="truncate max-w-[120px]">• {match.campo}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {match.status === 'FINISHED' ? (
                      <div className="text-base font-mono font-black text-white px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                        {match.scoreHome} - {match.scoreAway}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">- vs -</span>
                    )}
                  </div>
                </div>

                {/* Botón Ver Detalle Die Ligue */}
                {match.disponible && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex justify-end">
                    <button
                      onClick={() =>
                        setModalMatchInfo({
                          isOpen: true,
                          gameId: match.gameId,
                          jornada: match.jornada,
                          homeTeamName: match.esLocal ? 'Indautxu' : match.rival,
                          awayTeamName: match.esLocal ? match.rival : 'Indautxu',
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>Ver detalle Die Ligue</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Subpestaña: RIVALES */}
      {!loading && !error && activeTab === 'rivales' && data && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
              Seleccionar Club Rival (Grupo 2 DHJ)
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.rivals.map((r) => (
                <button
                  key={r.nombre}
                  onClick={() => loadRivalDetails(r.nombre)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedRivalName === r.nombre
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {r.logoUrl && <img src={r.logoUrl} alt={r.nombre} className="w-4 h-4 object-contain" />}
                  <span>{r.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {rivalLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-slate-300">Descargando plantilla y partidos del rival...</p>
            </div>
          )}

          {!rivalLoading && rivalData && (
            <div className="space-y-6">
              {/* Encabezado del Rival */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {rivalData.logoUrl ? (
                    <img src={rivalData.logoUrl} alt={rivalData.nombre} className="w-12 h-12 object-contain" />
                  ) : (
                    <Shield className="w-10 h-10 text-slate-600" />
                  )}
                  <div>
                    <h2 className="text-lg font-extrabold text-white">{rivalData.nombre}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {rivalData.partidosFinished} partidos completados en Die Ligue • {rivalData.players.length} jugadores en plantilla
                    </p>
                  </div>
                </div>
              </div>

              {/* Plantilla con Participación Acumulada */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Participación Acumulada de Jugadores</h3>
                  <span className="text-xs text-slate-500 font-mono">Calculado desde Die Ligue</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-semibold select-none">
                        <th className="py-2.5 px-3 w-12 text-center">DOR</th>
                        <th className="py-2.5 px-4">JUGADOR</th>
                        <th className="py-2.5 px-3 text-right">MIN JUG</th>
                        <th className="py-2.5 px-3 text-right">% MIN</th>
                        <th className="py-2.5 px-3 text-center">PJ</th>
                        <th className="py-2.5 px-3 text-center">TIT</th>
                        <th className="py-2.5 px-3 text-center">CONV</th>
                        <th className="py-2.5 px-3 text-center">GOL</th>
                        <th className="py-2.5 px-3 text-center">AMAR</th>
                        <th className="py-2.5 px-3 text-center">ROJ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {rivalData.players.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-300">{p.dorsal}</td>
                          <td className="py-2 px-4 font-bold text-white">{p.nombre}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">{p.minutosJugados}&apos;</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{p.porcentajeMinutos}%</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">{p.partidosJugados}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{p.titularidades}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{p.convocatorias}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-400">{p.goles > 0 ? `⚽ ${p.goles}` : '-'}</td>
                          <td className="py-2 px-3 text-center font-mono text-amber-400">{p.tarjetasAmarillas > 0 ? `🟨 ${p.tarjetasAmarillas}` : '-'}</td>
                          <td className="py-2 px-3 text-center font-mono text-rose-400">{p.tarjetasRojas > 0 ? `🟥 ${p.tarjetasRojas}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calendario del Rival */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Partidos · Die Ligue ({rivalData.matches.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rivalData.matches.map((m) => (
                    <div key={m.jornada} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-400">J{m.jornada}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{m.esLocal ? 'Local' : 'Visitante'}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${m.status === 'FINISHED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                            {m.statusLabel}
                          </span>
                        </div>
                        <p className="font-bold text-white mt-1">vs {m.rival}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {m.status === 'FINISHED' && (
                          <span className="font-mono font-black text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                            {m.scoreHome} - {m.scoreAway}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            setModalMatchInfo({
                              isOpen: true,
                              gameId: m.gameId,
                              jornada: m.jornada,
                              homeTeamName: m.esLocal ? rivalData.nombre : m.rival,
                              awayTeamName: m.esLocal ? m.rival : rivalData.nombre,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-bold flex items-center gap-1"
                        >
                          <span>Ver detalle</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle de Partido Die Ligue */}
      <DieLigueMatchDetailModal
        isOpen={modalMatchInfo.isOpen}
        onClose={() => setModalMatchInfo((prev) => ({ ...prev, isOpen: false }))}
        gameId={modalMatchInfo.gameId}
        jornada={modalMatchInfo.jornada}
        homeTeamName={modalMatchInfo.homeTeamName}
        awayTeamName={modalMatchInfo.awayTeamName}
      />
    </div>
  );
}
