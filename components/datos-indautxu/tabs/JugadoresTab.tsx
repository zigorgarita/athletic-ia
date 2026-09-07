'use client';

import React, { useState, useMemo } from 'react';
import { useOfficialIndautxuStats } from '@/hooks/useOfficialIndautxuStats';
import { Search, AlertCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { OfficialPlayerLeagueStats } from '@/lib/stats/officialIndautxuStats';

type SortField =
  | 'dorsal'
  | 'nombre'
  | 'demarcacion'
  | 'minutos'
  | 'porcentajeMinutos'
  | 'partidosJugados'
  | 'titularidades'
  | 'convocatorias'
  | 'goles';

export function JugadoresTab() {
  const {
    teamSummary,
    playersStatsList,
    partidosDisputados,
    minutosPosiblesEquipo,
    loading,
    error,
    refetch
  } = useOfficialIndautxuStats();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDemarcacion, setFilterDemarcacion] = useState<string>('TODAS');
  const [sortField, setSortField] = useState<SortField>('dorsal');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'dorsal' || field === 'nombre');
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    return playersStatsList
      .filter((p) => {
        const matchesSearch =
          p.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dorsal.toString().includes(searchTerm);
        const matchesDemarcacion =
          filterDemarcacion === 'TODAS' || p.demarcacion === filterDemarcacion;
        return matchesSearch && matchesDemarcacion;
      })
      .sort((a, b) => {
        if (sortField === 'nombre') {
          const valA = a.apellidos || a.nombre;
          const valB = b.apellidos || b.nombre;
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (sortField === 'demarcacion') {
          const valA = a.demarcacion || '';
          const valB = b.demarcacion || '';
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        let numA = Number(a[sortField] ?? 0);
        let numB = Number(b[sortField] ?? 0);

        if (sortField === 'goles') {
          numA = a.isPortero ? -(a.golesEncajados ?? 999) : a.goles;
          numB = b.isPortero ? -(b.golesEncajados ?? 999) : b.goles;
        }

        return sortAsc ? numA - numB : numB - numA;
      });
  }, [playersStatsList, searchTerm, filterDemarcacion, sortField, sortAsc]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-sm text-slate-400">Cargando estadísticas oficiales de jugadores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/60 rounded-2xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-200">Error al cargar datos oficiales</h3>
          <p className="text-sm text-red-300/80 mt-1">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen de Equipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Partidos Liga
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium border border-red-500/20">
              Oficial
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2 font-mono">
            {partidosDisputados}
          </p>
          <p className="text-xs text-slate-500 mt-1">Disputados por el equipo</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Minutos Posibles
          </span>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2 font-mono">
            {minutosPosiblesEquipo}&apos;
          </p>
          <p className="text-xs text-slate-500 mt-1">{partidosDisputados} × 90 minutos</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Goles Favor
          </span>
          <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-2 font-mono">
            {teamSummary.golesFavor}
          </p>
          <p className="text-xs text-slate-500 mt-1">Acreditados en actas RFEF</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Goles Contra
          </span>
          <p className="text-2xl md:text-3xl font-bold text-rose-400 mt-2 font-mono">
            {teamSummary.golesContra}
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
            className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['TODAS', 'Portero', 'Defensa', 'Centrocampista', 'Delantero'].map((dem) => (
            <button
              key={dem}
              onClick={() => setFilterDemarcacion(dem)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filterDemarcacion === dem
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {dem}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Oficial de Estadísticas */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[1020px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 select-none">
                <th
                  onClick={() => handleSort('dorsal')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200 w-14 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    DOR <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    JUGADOR <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('demarcacion')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200"
                >
                  POS
                </th>
                <th
                  onClick={() => handleSort('minutos')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  MIN JUG
                </th>
                <th className="py-3 px-3 text-right text-slate-500">MIN POS</th>
                <th
                  onClick={() => handleSort('porcentajeMinutos')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200"
                >
                  % MIN
                </th>
                <th
                  onClick={() => handleSort('partidosJugados')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200"
                >
                  PJ
                </th>
                <th
                  onClick={() => handleSort('titularidades')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200"
                >
                  TIT
                </th>
                <th
                  onClick={() => handleSort('convocatorias')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200"
                >
                  CONV
                </th>
                <th className="py-3 px-3 text-center">SUPL</th>
                <th className="py-3 px-3 text-center">ENTRÓ</th>
                <th
                  onClick={() => handleSort('goles')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200"
                >
                  GOL / ENC
                </th>
                <th className="py-3 px-3 text-center">AMAR</th>
                <th className="py-3 px-3 text-center">ROJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    No se encontraron jugadores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((player: OfficialPlayerLeagueStats) => {
                  const hasPlayed = player.partidosJugados > 0;
                  return (
                    <tr
                      key={player.playerId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !hasPlayed ? 'opacity-60 hover:opacity-100' : ''
                      }`}
                    >
                      {/* Dorsal */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                        {player.dorsal > 0 ? player.dorsal : '-'}
                      </td>

                      {/* Jugador */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-white truncate">
                            {player.nombreCompleto}
                          </span>
                        </div>
                      </td>

                      {/* Demarcación */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                            player.isPortero
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : player.demarcacion === 'Defensa'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : player.demarcacion === 'Centrocampista'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          }`}
                        >
                          {player.demarcacion}
                        </span>
                      </td>

                      {/* Minutos jugados */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                        {player.minutos}&apos;
                      </td>

                      {/* Minutos posibles */}
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {player.minutosPosibles}&apos;
                      </td>

                      {/* % Minutos */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-semibold ${
                              player.porcentajeMinutos >= 75
                                ? 'text-emerald-400'
                                : player.porcentajeMinutos >= 40
                                ? 'text-amber-400'
                                : player.porcentajeMinutos > 0
                                ? 'text-slate-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {player.porcentajeMinutos.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* PJ */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`font-bold ${
                            player.partidosJugados > 0 ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {player.partidosJugados}
                        </span>
                      </td>

                      {/* Titular */}
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {player.titularidades}
                      </td>

                      {/* Convocado */}
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {player.convocatorias}
                      </td>

                      {/* Suplente */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {player.suplencias}
                      </td>

                      {/* Entró desde banquillo */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {player.entradasBanquillo}
                      </td>

                      {/* Goles / Goles Encajados */}
                      <td className="py-3 px-3 text-center font-mono">
                        {player.isPortero ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              (player.golesEncajados ?? 0) > 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'text-slate-600'
                            }`}
                            title="Goles encajados (Portero)"
                          >
                            {player.golesEncajados !== null ? `${player.golesEncajados} GE` : '-'}
                          </span>
                        ) : (
                          <span
                            className={`font-bold ${
                              player.goles > 0 ? 'text-emerald-400 font-extrabold' : 'text-slate-600'
                            }`}
                          >
                            {player.goles}
                          </span>
                        )}
                      </td>

                      {/* Amarillas */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block w-4 h-5 rounded-sm text-xs font-bold leading-5 ${
                            player.tarjetasAmarillas > 0
                              ? 'bg-amber-400 text-black shadow-sm'
                              : 'text-slate-700'
                          }`}
                        >
                          {player.tarjetasAmarillas > 0 ? player.tarjetasAmarillas : '0'}
                        </span>
                      </td>

                      {/* Rojas */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block w-4 h-5 rounded-sm text-xs font-bold leading-5 ${
                            player.rojasDirectas > 0 || player.doblesAmarillas > 0
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-700'
                          }`}
                        >
                          {player.rojasDirectas + player.doblesAmarillas > 0
                            ? player.rojasDirectas + player.doblesAmarillas
                            : '0'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla explicativo */}
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>Mostrando {filteredAndSortedPlayers.length} de 27 futbolistas oficiales</span>
          <span className="italic">
            * Estadísticas canónicas de Liga consolidadas exclusivamente desde actas RFEF.
          </span>
        </div>
      </div>
    </div>
  );
}
