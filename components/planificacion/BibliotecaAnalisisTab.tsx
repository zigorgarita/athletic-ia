'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Target,
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Info,
  BookOpen
} from 'lucide-react';
import {
  useLibraryAnalytics,
  PeriodoAnalisis,
  ConceptMetricRow
} from '@/hooks/useLibraryAnalytics';
import { TACTICAL_FAMILIES } from '@/lib/planificacion/tacticalDictionary';

interface BibliotecaAnalisisTabProps {
  onSelectTaskByName?: (taskName: string) => void;
}

export function BibliotecaAnalisisTab({}: BibliotecaAnalisisTabProps) {
  const {
    loading,
    errorMsg,
    periodo,
    setPeriodo,
    selectedFamily,
    setSelectedFamily,
    selectedConcept,
    setSelectedConcept,
    searchTerm,
    setSearchTerm,
    kpis,
    conceptMetrics,
    taskMetrics
  } = useLibraryAnalytics();

  const [activeSubTab, setActiveSubTab] = useState<'conceptos' | 'tareas'>('conceptos');

  // Helper for formatting date (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper for diasSinEstimulo badge (Semáforo exacto: 0-13 verde, 14-20 amarillo, 21-29 naranja, >=30 rojo, null sin uso trazado)
  const renderStimulusBadge = (dias: number | null) => {
    if (dias === null) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
          Sin uso trazado
        </span>
      );
    }
    if (dias >= 0 && dias <= 13) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {dias} {dias === 1 ? 'día' : 'días'}
        </span>
      );
    }
    if (dias >= 14 && dias <= 20) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {dias} días
        </span>
      );
    }
    if (dias >= 21 && dias <= 29) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          {dias} días
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
        {dias} días
      </span>
    );
  };

  // Helper for estado simplificado badge
  // - Sin tareas → 0 tareas disponibles
  // - Pocas tareas → 1 tarea disponible
  // - Disponible → 2 o más tareas, pero sin uso trazado
  // - Trabajado → existe al menos un uso trazado desde 07/10/2026
  const renderEstadoBadge = (row: ConceptMetricRow) => {
    if (row.diasDistintos > 0 || row.usosTotales > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Trabajado
        </span>
      );
    }
    if (row.tareasAprobadasDisponibles === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-red-950/40 text-red-400 border border-red-800/40">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          Sin tareas
        </span>
      );
    }
    if (row.tareasAprobadasDisponibles === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-950/40 text-amber-300 border border-amber-800/40">
          <Info className="w-3 h-3 text-amber-400" />
          Pocas tareas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-slate-800/70 text-slate-300 border border-slate-700/70">
        <BookOpen className="w-3 h-3 text-slate-400" />
        Disponible
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800/80 my-4">
        <Activity className="h-8 w-8 text-[#CC0E21] animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-300">Cargando métricas de análisis de Biblioteca...</p>
        <p className="text-xs text-slate-500 mt-1">Calculando explotación, días de estímulo y relaciones taxonómicas.</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/40 rounded-2xl my-4 text-red-300 text-sm">
        <p className="font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Error al cargar analítica
        </p>
        <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* ── 1. BANNER DE TRAZABILIDAD ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/60 border border-blue-500/25 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
              Trazabilidad fiable de uso desde 07/10/2026
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Los datos anteriores pueden usarse como fecha de origen de las tareas, pero no como histórico fiable de uso. Los cálculos se basan exclusivamente en tareas vinculadas por identificador real (<span className="font-mono text-blue-300">library_task_id</span>).
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. KPIS SUPERIORES (5 TARJETAS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Tareas aprobadas utilizadas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tareas usadas</span>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{kpis.tareasAprobadasUtilizadas}</span>
            <span className="text-xs font-bold text-slate-500">/ {kpis.totalTareasAprobadas}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Aprobadas con al menos un uso</p>
        </div>

        {/* KPI 2: Porcentaje de explotación */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">% Explotación</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{kpis.porcentajeExplotacion}%</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">De la Biblioteca activa aprovechada</p>
        </div>

        {/* KPI 3: Minutos acumulados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Minutos trazados</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-300">{kpis.minutosAcumulados}</span>
            <span className="text-xs font-bold text-slate-500">min</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Suma en tareas vinculadas</p>
        </div>

        {/* KPI 4: Días distintos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Días con uso</span>
            <Calendar className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-300">{kpis.diasDistintosEntrenamiento}</span>
            <span className="text-xs font-bold text-slate-500">días</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Sesiones distintas con tareas</p>
        </div>

        {/* KPI 5: Conceptos trabajados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conceptos trabajados</span>
            <Target className="h-4 w-4 text-[#CC0E21]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{kpis.conceptosTrabajados}</span>
            <span className="text-xs font-bold text-slate-500">/ {kpis.totalConceptosOficiales}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-bold">{kpis.conceptosConTareasAprobadas}</span> con tareas · <span className="text-red-400 font-bold">{kpis.conceptosSinTareasAprobadas}</span> sin tareas
          </p>
        </div>
      </div>

      {/* ── 3. BARRA DE FILTROS Y SELECTOR DE VISTA ── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de sub-vista (Por concepto vs Por tarea) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('conceptos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'conceptos'
                    ? 'bg-[#CC0E21] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Por Concepto ({conceptMetrics.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('tareas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'tareas'
                    ? 'bg-[#CC0E21] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Por Tarea ({taskMetrics.length})
              </button>
            </div>

            {activeSubTab === 'conceptos' && (
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/70 px-3 py-1 rounded-xl border border-slate-800/80">
                <span className="font-bold text-slate-200">63 oficiales</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold">61 con tareas</span>
                <span className="text-slate-600">•</span>
                <span className="text-red-400 font-semibold">2 sin tareas</span>
              </div>
            )}
          </div>

          {/* Selector de Periodo */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] font-black text-slate-500 uppercase px-2">Periodo:</span>
            {(['semana', '15d', '30d', 'temporada'] as PeriodoAnalisis[]).map(p => {
              const labelMap: Record<PeriodoAnalisis, string> = {
                semana: 'Semana',
                '15d': '15 días',
                '30d': '30 días',
                temporada: 'Temporada'
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    periodo === p
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros secundarios: Familia, Concepto y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/60">
          {/* Familia */}
          <div className="sm:col-span-4">
            <select
              value={selectedFamily}
              onChange={e => {
                setSelectedFamily(e.target.value);
                setSelectedConcept('todos');
              }}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="todas">Todas las Familias Tácticas</option>
              {TACTICAL_FAMILIES.map(fam => (
                <option key={fam.id} value={fam.id}>
                  {fam.label}
                </option>
              ))}
            </select>
          </div>

          {/* Concepto (solo relevante para vista por concepto o filtrado) */}
          <div className="sm:col-span-4">
            <select
              value={selectedConcept}
              onChange={e => setSelectedConcept(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="todos">Todos los Conceptos Canónicos</option>
              {(selectedFamily === 'todas'
                ? TACTICAL_FAMILIES.flatMap(f => f.concepts)
                : TACTICAL_FAMILIES.find(f => f.id === selectedFamily)?.concepts || []
              ).map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda rápida */}
          <div className="sm:col-span-4 relative">
            <input
              type="text"
              placeholder={activeSubTab === 'conceptos' ? 'Buscar concepto o familia...' : 'Buscar tarea o concepto...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-[#CC0E21]"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── 4. TABLA "POR CONCEPTO" ── */}
      {activeSubTab === 'conceptos' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Familia</th>
                  <th className="py-3 px-4 text-center">Días distintos</th>
                  <th className="py-3 px-4 text-center">Minutos</th>
                  <th className="py-3 px-4 text-center">Última vez</th>
                  <th className="py-3 px-4 text-center">Tareas disponibles</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {conceptMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No se encontraron conceptos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  conceptMetrics.map(row => (
                    <tr
                      key={row.concepto}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Concepto */}
                      <td className="py-3 px-4 font-bold text-white">
                        {row.concepto}
                      </td>

                      {/* Familia */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${row.badgeColor}`}>
                          {row.familiaLabel}
                        </span>
                      </td>

                      {/* Días distintos */}
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {row.diasDistintos > 0 ? row.diasDistintos : '—'}
                      </td>

                      {/* Minutos */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-300">
                        {row.minutos > 0 ? `${row.minutos}′` : '—'}
                      </td>

                      {/* Última vez */}
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {formatDate(row.ultimaVez)}
                      </td>

                      {/* Tareas disponibles */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200">
                          {row.tareasAprobadasDisponibles}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        {renderEstadoBadge(row)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. TABLA "POR TAREA" ── */}
      {activeSubTab === 'tareas' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                  <th className="py-3 px-4">Nombre de la tarea</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-center">Usos</th>
                  <th className="py-3 px-4 text-center">Días distintos</th>
                  <th className="py-3 px-4 text-center">Minutos</th>
                  <th className="py-3 px-4 text-center">Última sesión</th>
                  <th className="py-3 px-4 text-center">Días sin estímulo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {taskMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No se encontraron tareas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  taskMetrics.map(task => (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Nombre */}
                      <td className="py-3 px-4">
                        <div className="font-black text-white">{task.nombre}</div>
                        {task.conceptos.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.conceptos.map(c => (
                              <span
                                key={c}
                                className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-950 text-slate-400 border border-slate-800"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-400 italic">
                            (Pendiente de contexto táctico)
                          </span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                          {task.tipo_tarea}
                        </span>
                      </td>

                      {/* Usos */}
                      <td className="py-3 px-4 text-center">
                        {task.usos > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {task.usos}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-bold">0</span>
                        )}
                      </td>

                      {/* Días distintos */}
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {task.diasDistintos > 0 ? task.diasDistintos : '—'}
                      </td>

                      {/* Minutos */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-300">
                        {task.minutos > 0 ? `${task.minutos}′` : '—'}
                      </td>

                      {/* Última sesión */}
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {formatDate(task.ultimaSesion)}
                      </td>

                      {/* Días sin estímulo */}
                      <td className="py-3 px-4 text-center">
                        {renderStimulusBadge(task.diasSinEstimulo)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
