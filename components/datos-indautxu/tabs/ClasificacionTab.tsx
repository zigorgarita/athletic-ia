'use client';

import React, { useState, useMemo } from 'react';
import { useOfficialStandings } from '@/hooks/useOfficialStandings';
import { Trophy, TrendingUp, AlertCircle, RefreshCw, Shield, ChevronDown } from 'lucide-react';
import { OfficialStanding } from '@/types';
import { isIndautxuStanding } from '@/lib/standings/officialStandings';

export function ClasificacionTab() {
  const {
    jornadasDisponibles,
    ultimaJornada,
    selectedJornada,
    setSelectedJornada,
    currentStandings,
    indautxuHistory,
    indautxuCurrentStanding,
    loading,
    error,
    refetch
  } = useOfficialStandings();

  // Estado para tooltip en el gráfico interactivo
  const [hoveredPoint, setHoveredPoint] = useState<{
    jornada: number;
    posicion: number;
    puntos: number;
    x: number;
    y: number;
  } | null>(null);

  // Cálculo de mejor y peor posición histórica a partir de los snapshots reales persistidos
  const { mejorPosicion, peorPosicion } = useMemo(() => {
    if (!indautxuHistory || indautxuHistory.length === 0) {
      return { mejorPosicion: null, peorPosicion: null };
    }
    const posiciones = indautxuHistory.map((h) => h.posicion);
    return {
      mejorPosicion: Math.min(...posiciones),
      peorPosicion: Math.max(...posiciones)
    };
  }, [indautxuHistory]);

  // Dimensiones y coordenadas para el gráfico SVG responsive
  const chartConfig = useMemo(() => {
    const width = 800;
    const height = 260;
    const padding = { top: 30, right: 40, bottom: 40, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Rango X: jornadas disponibles (o al menos 1 a 5 para visualización limpia)
    const maxJornada = Math.max(
      Math.max(...(jornadasDisponibles.length > 0 ? jornadasDisponibles : [1])),
      5
    );
    const minJornada = 1;

    // Rango Y: posiciones de 1 a 16 (invertido: 1 arriba, 16 abajo)
    const minY = 1;
    const maxY = 16;

    const getX = (j: number) => {
      if (maxJornada === minJornada) return padding.left + chartWidth / 2;
      return padding.left + ((j - minJornada) / (maxJornada - minJornada)) * chartWidth;
    };

    const getY = (pos: number) => {
      return padding.top + ((pos - minY) / (maxY - minY)) * chartHeight;
    };

    const points = indautxuHistory.map((h) => ({
      jornada: h.jornada,
      posicion: h.posicion,
      puntos: h.puntos,
      x: getX(h.jornada),
      y: getY(h.posicion)
    }));

    return { width, height, padding, chartWidth, chartHeight, maxJornada, getX, getY, points };
  }, [indautxuHistory, jornadasDisponibles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-sm text-slate-400">Cargando clasificación oficial RFEF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/60 rounded-2xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-200">Error al cargar clasificación</h3>
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
      {/* Barra Superior: Selector de Jornada y Fuente Oficial */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Clasificación Oficial — Grupo 2
            </h2>
            <p className="text-xs text-slate-400">
              División de Honor Juvenil • Temporada 2026/27
            </p>
          </div>
        </div>

        {/* Selector de Jornada */}
        <div className="flex items-center gap-2">
          <label htmlFor="jornada-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Jornada:
          </label>
          <div className="relative">
            <select
              id="jornada-select"
              value={selectedJornada}
              onChange={(e) => setSelectedJornada(Number(e.target.value))}
              className="appearance-none bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-1.5 pr-8 text-sm font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {jornadasDisponibles.map((j) => (
                <option key={j} value={j} className="bg-slate-900 text-white">
                  Jornada {j} {j === ultimaJornada ? '(Última oficial)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700/60 hidden sm:inline-block">
            Autoridad RFEF
          </span>
        </div>
      </div>

      {/* Resumen Compacto del SD Indautxu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gradient-to-br from-red-950/40 via-slate-900/60 to-slate-900/60 border border-red-500/30 rounded-2xl p-4 shadow-lg shadow-red-500/5">
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block">
            Posición Actual
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl md:text-3xl font-extrabold text-white font-mono">
              {indautxuCurrentStanding ? `${indautxuCurrentStanding.posicion}.º` : '-'}
            </p>
            <span className="text-xs text-slate-400 font-sans">de 16</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">SD Indautxu en J{selectedJornada}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Puntos Totales
          </span>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2 font-mono">
            {indautxuCurrentStanding ? indautxuCurrentStanding.puntos : 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {indautxuCurrentStanding?.pj ?? 0} partido disputado
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Mejor Posición
          </span>
          <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-2 font-mono">
            {mejorPosicion ? `${mejorPosicion}.º` : '-'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Snapshot histórico más alto</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Peor Posición
          </span>
          <p className="text-2xl md:text-3xl font-bold text-rose-400 mt-2 font-mono">
            {peorPosicion ? `${peorPosicion}.º` : '-'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Snapshot histórico más bajo</p>
        </div>
      </div>

      {/* Tabla de Clasificación Oficial */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400">
                <th className="py-3 px-3 w-14 text-center">POS</th>
                <th className="py-3 px-4 min-w-[220px]">EQUIPO</th>
                <th className="py-3 px-3 text-center">PJ</th>
                <th className="py-3 px-3 text-center">G</th>
                <th className="py-3 px-3 text-center">E</th>
                <th className="py-3 px-3 text-center">P</th>
                <th className="py-3 px-3 text-center">GF</th>
                <th className="py-3 px-3 text-center">GC</th>
                <th className="py-3 px-3 text-center">DG</th>
                <th className="py-3 px-4 text-center font-bold text-white bg-slate-800/40">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {currentStandings.map((row: OfficialStanding) => {
                const isIndautxu = isIndautxuStanding(row);
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isIndautxu
                        ? 'bg-red-950/40 border-l-4 border-l-red-500 font-semibold text-white'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    {/* Posición */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                          row.posicion === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : row.posicion <= 4
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : row.posicion >= 13
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        {row.posicion}
                      </span>
                    </td>

                    {/* Club */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0">
                          {row.club?.escudo_url ? (
                            <img
                              src={row.club.escudo_url}
                              alt={row.club.nombre}
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>
                        <span
                          className={`truncate ${
                            isIndautxu ? 'text-red-300 font-bold text-base' : 'text-slate-200'
                          }`}
                        >
                          {row.club?.nombre || 'Club'}
                        </span>
                        {isIndautxu && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold uppercase tracking-wider ml-1">
                            Nuestro Club
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PJ, G, E, P */}
                    <td className="py-3 px-3 text-center font-mono text-slate-300">{row.pj}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300">{row.g}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{row.e}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{row.p}</td>

                    {/* GF, GC, DG */}
                    <td className="py-3 px-3 text-center font-mono text-slate-300">{row.gf}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{row.gc}</td>
                    <td
                      className={`py-3 px-3 text-center font-mono font-medium ${
                        row.dg > 0
                          ? 'text-emerald-400'
                          : row.dg < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.dg > 0 ? `+${row.dg}` : row.dg}
                    </td>

                    {/* Puntos */}
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-base text-white bg-slate-800/30">
                      {row.puntos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda de Posiciones */}
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Líder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Zona Alta (2.º - 4.º)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Zona de Descenso (13.º - 16.º)</span>
            </div>
          </div>
          <span className="italic">* Clasificación federativa oficial consolidada RFEF.</span>
        </div>
      </div>

      {/* Gráfico Histórico de Posición del SD Indautxu */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Trayectoria del SD Indautxu
              </h3>
              <p className="text-xs text-slate-400">
                Evolución de la posición jornada a jornada (Eje vertical: 1.º en la parte superior)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-700/60">
            {indautxuHistory.length} {indautxuHistory.length === 1 ? 'jornada registrada' : 'jornadas registradas'}
          </span>
        </div>

        {/* Contenedor del Gráfico SVG */}
        <div className="relative w-full overflow-hidden bg-slate-950/80 border border-slate-800/80 rounded-xl p-2">
          <svg
            viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
            className="w-full h-auto max-h-[300px]"
          >
            <defs>
              {/* Gradiente para área bajo la curva */}
              <linearGradient id="indautxuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Líneas Guía Horizontales (Posiciones 1, 4, 8, 12, 16) */}
            {[1, 4, 8, 12, 16].map((pos) => {
              const y = chartConfig.getY(pos);
              return (
                <g key={pos}>
                  <line
                    x1={chartConfig.padding.left}
                    y1={y}
                    x2={chartConfig.width - chartConfig.padding.right}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray={pos === 1 || pos === 16 ? '0' : '4 4'}
                    strokeWidth={pos === 1 || pos === 16 ? '1' : '0.8'}
                  />
                  <text
                    x={chartConfig.padding.left - 10}
                    y={y + 4}
                    fill={pos === 1 ? '#fbbf24' : pos >= 13 ? '#f43f5e' : '#94a3b8'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {pos}.º
                  </text>
                </g>
              );
            })}

            {/* Líneas Guía Verticales (Jornadas 1..N) */}
            {Array.from({ length: chartConfig.maxJornada }, (_, i) => i + 1).map((j) => {
              const x = chartConfig.getX(j);
              return (
                <g key={j}>
                  <line
                    x1={x}
                    y1={chartConfig.padding.top}
                    x2={x}
                    y2={chartConfig.height - chartConfig.padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                  <text
                    x={x}
                    y={chartConfig.height - chartConfig.padding.bottom + 18}
                    fill="#64748b"
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    J{j}
                  </text>
                </g>
              );
            })}

            {/* Línea de Trayectoria y Área */}
            {chartConfig.points.length > 1 && (
              <>
                {/* Área rellena */}
                <path
                  d={`
                    M ${chartConfig.points[0].x} ${chartConfig.height - chartConfig.padding.bottom}
                    ${chartConfig.points.map((p) => `L ${p.x} ${p.y}`).join(' ')}
                    L ${chartConfig.points[chartConfig.points.length - 1].x} ${
                    chartConfig.height - chartConfig.padding.bottom
                  }
                    Z
                  `}
                  fill="url(#indautxuGradient)"
                />
                {/* Línea continua */}
                <path
                  d={`M ${chartConfig.points.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Puntos de cada Jornada */}
            {chartConfig.points.map((pt) => {
              const isHovered = hoveredPoint?.jornada === pt.jornada;
              return (
                <g
                  key={pt.jornada}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      jornada: pt.jornada,
                      posicion: pt.posicion,
                      puntos: pt.puntos,
                      x: pt.x,
                      y: pt.y
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Halo exterior pulsante */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? '9' : '6'}
                    fill="#ef4444"
                    fillOpacity={isHovered ? '0.4' : '0.2'}
                  />
                  {/* Nodo central */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? '5.5' : '4'}
                    fill="#ffffff"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />
                  {/* Etiqueta visible permanente si es jornada única (J1) */}
                  {chartConfig.points.length === 1 && (
                    <text
                      x={pt.x}
                      y={pt.y - 14}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      J1 • {pt.posicion}.º ({pt.puntos} pts)
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip Interactivo Flotante */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 text-white px-3 py-1.5 rounded-xl shadow-2xl text-xs font-semibold transform -translate-x-1/2 -translate-y-full mb-3"
              style={{
                left: `${(hoveredPoint.x / chartConfig.width) * 100}%`,
                top: `${(hoveredPoint.y / chartConfig.height) * 100}%`
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>
                  Jornada {hoveredPoint.jornada} • {hoveredPoint.posicion}.º • {hoveredPoint.puntos} pts
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
