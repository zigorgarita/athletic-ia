'use client';

import React, { useState, useMemo } from 'react';
import { useIndautxuLeagueCalendar } from '@/hooks/useIndautxuLeagueCalendar';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  UserCheck,
  FileText,
  AlertCircle,
  RefreshCw,
  Home,
  PlaneTakeoff,
  Layers
} from 'lucide-react';

type FilterEstado = 'todos' | 'jugados' | 'pendientes';
type FilterSede = 'todos' | 'casa' | 'fuera';

export function CalendarioTab() {
  const {
    calendar,
    jornadasDisputadas,
    jornadasPendientes,
    lastPlayedMatch,
    nextMatch,
    loading,
    error,
    refetch
  } = useIndautxuLeagueCalendar();

  const [filterEstado, setFilterEstado] = useState<FilterEstado>('todos');
  const [filterSede, setFilterSede] = useState<FilterSede>('todos');

  // Filtrado de partidos
  const filteredMatches = useMemo(() => {
    return calendar.filter((match) => {
      // Filtro de estado
      if (filterEstado === 'jugados' && !match.jugado) return false;
      if (filterEstado === 'pendientes' && match.jugado) return false;

      // Filtro de sede
      if (filterSede === 'casa' && !match.es_local) return false;
      if (filterSede === 'fuera' && match.es_local) return false;

      return true;
    });
  }, [calendar, filterEstado, filterSede]);

  // Formato de fecha legible
  const formatFecha = (fechaStr: string | null) => {
    if (!fechaStr) return 'Fecha por determinar';
    try {
      const parts = fechaStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-sm tracking-wide">
          Cargando calendario oficial de Liga (30 jornadas)...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-950/30 border border-red-900/50 p-6 flex items-start gap-4 text-red-200">
        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <h3 className="font-semibold text-lg text-red-300">Error al sincronizar el calendario</h3>
          <p className="text-sm text-red-300/80">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Tarjetas de Resumen del Calendario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jornadas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Jornadas Totales</div>
            <div className="text-2xl font-bold font-mono text-white">30</div>
            <div className="text-[11px] text-slate-500">Temporada 2026/27</div>
          </div>
        </div>

        {/* Progreso: Jugados vs Pendientes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Progreso de Liga</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">{jornadasDisputadas}</span>
              <span className="text-xs text-slate-400">jugadas</span>
              <span className="text-slate-600">/</span>
              <span className="text-base font-bold font-mono text-slate-300">{jornadasPendientes}</span>
              <span className="text-xs text-slate-400">pend.</span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(jornadasDisputadas / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Último Resultado Oficial */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              lastPlayedMatch?.signoResultado === 'V'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : lastPlayedMatch?.signoResultado === 'E'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span className="text-lg font-mono font-black">{lastPlayedMatch?.signoResultado || '-'}</span>
          </div>
          <div className="truncate">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Último Partido</div>
            {lastPlayedMatch ? (
              <>
                <div className="text-sm font-bold text-white truncate">
                  J{lastPlayedMatch.jornada} · {lastPlayedMatch.rivalNombre}
                </div>
                <div className="text-xs font-mono font-bold text-slate-300">
                  {lastPlayedMatch.resultadoTexto} ({lastPlayedMatch.es_local ? 'C' : 'F'})
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">Ningún partido jugado aún</div>
            )}
          </div>
        </div>

        {/* Próximo Partido */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-purple-400" />
          </div>
          <div className="truncate">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Próximo Compromiso</div>
            {nextMatch ? (
              <>
                <div className="text-sm font-bold text-purple-300 truncate">
                  J{nextMatch.jornada} · {nextMatch.rivalNombre}
                </div>
                <div className="text-xs text-slate-400">
                  {nextMatch.es_local ? 'Local (Iparralde)' : 'Visitante'}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">Temporada completada</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filtros y Barra de Estado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        {/* Filtros de Estado */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Estado:
          </span>
          <button
            onClick={() => setFilterEstado('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === 'todos'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Todas ({calendar.length})
          </button>
          <button
            onClick={() => setFilterEstado('jugados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === 'jugados'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Jugadas ({jornadasDisputadas})
          </button>
          <button
            onClick={() => setFilterEstado('pendientes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === 'pendientes'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Pendientes ({jornadasPendientes})
          </button>
        </div>

        {/* Filtros de Sede */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Sede:</span>
          <button
            onClick={() => setFilterSede('todos')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filterSede === 'todos'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterSede('casa')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              filterSede === 'casa'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3 h-3 text-red-400" /> Casa
          </button>
          <button
            onClick={() => setFilterSede('fuera')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              filterSede === 'fuera'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlaneTakeoff className="w-3 h-3 text-blue-400" /> Fuera
          </button>
        </div>
      </div>

      {/* 3. Lista de Jornadas (Cards estructuradas) */}
      <div className="space-y-3">
        {filteredMatches.map((m) => {
          // Determinamos equipos local y visitante para visualización limpia
          const localTeam = m.es_local
            ? {
                nombre: 'SD Indautxu',
                escudo: '/escudo.jpg',
                isIndautxu: true,
                goles: m.jugado ? m.golesIndautxu : null
              }
            : {
                nombre: m.rivalNombre,
                escudo: m.rivalEscudoUrl,
                isIndautxu: false,
                goles: m.jugado ? m.golesRival : null
              };

          const visitorTeam = m.es_local
            ? {
                nombre: m.rivalNombre,
                escudo: m.rivalEscudoUrl,
                isIndautxu: false,
                goles: m.jugado ? m.golesRival : null
              }
            : {
                nombre: 'SD Indautxu',
                escudo: '/escudo.jpg',
                isIndautxu: true,
                goles: m.jugado ? m.golesIndautxu : null
              };

          return (
            <div
              key={m.id || `jornada-${m.jornada}`}
              className={`rounded-xl border transition-all p-4 ${
                m.jugado
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                  : 'bg-slate-950/50 border-slate-900/80 hover:border-slate-800/80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Cabecera Jornada + Fecha/Hora */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">JOR</span>
                    <span className="text-xl font-black text-white">{m.jornada}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium capitalize">
                        {formatFecha(m.fecha)}
                      </span>
                      {m.hora && (
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          {m.hora.substring(0, 5)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {/* Badge Sede */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                          m.es_local
                            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        }`}
                      >
                        {m.es_local ? 'Local' : 'Visitante'}
                      </span>

                      {/* Badge Estado */}
                      {m.jugado ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Oficial
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700/50">
                          Programado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enfrentamiento deportivo (Local vs Visitante) */}
                <div className="flex-1 flex items-center justify-center gap-4 py-2 px-2 sm:px-6">
                  {/* Equipo Local */}
                  <div className="flex items-center justify-end gap-3 flex-1 text-right">
                    <span
                      className={`text-sm md:text-base truncate ${
                        localTeam.isIndautxu
                          ? 'font-extrabold text-red-300'
                          : 'font-medium text-slate-200'
                      }`}
                    >
                      {localTeam.nombre}
                    </span>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {localTeam.escudo ? (
                        <img
                          src={localTeam.escudo}
                          alt={localTeam.nombre}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>

                  {/* Marcador central / VS */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-3">
                    {m.jugado ? (
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 font-mono font-black text-lg md:text-xl text-white tracking-widest">
                          {localTeam.goles} - {visitorTeam.goles}
                        </div>
                        {/* Signo del Indautxu */}
                        {m.signoResultado && (
                          <div
                            className={`w-7 h-7 rounded-md font-mono font-extrabold text-xs flex items-center justify-center border shadow-sm ${
                              m.signoResultado === 'V'
                                ? 'bg-emerald-600/90 text-white border-emerald-500'
                                : m.signoResultado === 'E'
                                ? 'bg-amber-600/90 text-white border-amber-500'
                                : 'bg-rose-700/90 text-white border-rose-600'
                            }`}
                            title={`Resultado: ${
                              m.signoResultado === 'V'
                                ? 'Victoria'
                                : m.signoResultado === 'E'
                                ? 'Empate'
                                : 'Derrota'
                            }`}
                          >
                            {m.signoResultado}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 font-mono text-sm font-semibold tracking-wider">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className="flex items-center justify-start gap-3 flex-1 text-left">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {visitorTeam.escudo ? (
                        <img
                          src={visitorTeam.escudo}
                          alt={visitorTeam.nombre}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <span
                      className={`text-sm md:text-base truncate ${
                        visitorTeam.isIndautxu
                          ? 'font-extrabold text-red-300'
                          : 'font-medium text-slate-200'
                      }`}
                    >
                      {visitorTeam.nombre}
                    </span>
                  </div>
                </div>

                {/* Información secundaria oficial enriquecida (discreta) */}
                <div className="flex md:flex-col items-start md:items-end justify-between md:justify-center text-xs text-slate-500 gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                  {m.campo ? (
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={m.campo}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{m.campo}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600">Campo por confirmar</span>
                  )}

                  {m.arbitro && (
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={`Árbitro: ${m.arbitro}`}>
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{m.arbitro}</span>
                    </div>
                  )}

                  {m.officialCodActa && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Acta #{m.officialCodActa}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800">
            <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No se encontraron jornadas con los filtros seleccionados.</p>
            <button
              onClick={() => {
                setFilterEstado('todos');
                setFilterSede('todos');
              }}
              className="mt-3 text-xs text-red-400 hover:text-red-300 underline underline-offset-4"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* 4. Pie informativo */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-slate-400">Calendario Oficial:</span> 30 jornadas de Liga Nacional Juvenil División de Honor (Grupo 2).
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Resultados oficiales sincronizados con RFEF
        </div>
      </div>
    </div>
  );
}
