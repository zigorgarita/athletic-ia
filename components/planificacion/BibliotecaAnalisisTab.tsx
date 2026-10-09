'use client';

import React, { useState, useMemo } from 'react';
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
  AnalyticsSource,
  OrigenPresencia,
  ConceptMetricRow
} from '@/hooks/useLibraryAnalytics';
import { TACTICAL_FAMILIES } from '@/lib/planificacion/tacticalDictionary';

interface BibliotecaAnalisisTabProps {
  onSelectTaskByName?: (taskName: string) => void;
}

export type SortConceptOption =
  | 'dias_desc'
  | 'dias_asc'
  | 'minutos_desc'
  | 'minutos_asc'
  | 'reciente_desc'
  | 'reciente_asc'
  | 'disp_desc'
  | 'disp_asc';

export type SortTaskOption =
  | 'usos_desc'
  | 'usos_asc'
  | 'dias_desc'
  | 'dias_asc'
  | 'minutos_desc'
  | 'minutos_asc'
  | 'reciente_desc'
  | 'reciente_asc';

export function BibliotecaAnalisisTab({}: BibliotecaAnalisisTabProps) {
  const {
    loading,
    errorMsg,
    periodo,
    setPeriodo,
    fuenteAnalisis,
    setFuenteAnalisis,
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
  const [conceptSort, setConceptSort] = useState<SortConceptOption>('dias_desc');
  const [taskSort, setTaskSort] = useState<SortTaskOption>('usos_desc');

  // Sorted concept metrics
  const sortedConceptMetrics = useMemo(() => {
    const list = [...conceptMetrics];
    list.sort((a, b) => {
      switch (conceptSort) {
        case 'dias_desc':
          return b.diasDistintos - a.diasDistintos || b.minutos - a.minutos || a.concepto.localeCompare(b.concepto);
        case 'dias_asc':
          return a.diasDistintos - b.diasDistintos || a.minutos - b.minutos || a.concepto.localeCompare(b.concepto);
        case 'minutos_desc':
          return b.minutos - a.minutos || b.diasDistintos - a.diasDistintos || a.concepto.localeCompare(b.concepto);
        case 'minutos_asc':
          return a.minutos - b.minutos || a.diasDistintos - b.diasDistintos || a.concepto.localeCompare(b.concepto);
        case 'reciente_desc': {
          if (a.ultimaVez && b.ultimaVez) return b.ultimaVez.localeCompare(a.ultimaVez);
          if (a.ultimaVez && !b.ultimaVez) return -1;
          if (!a.ultimaVez && b.ultimaVez) return 1;
          return a.concepto.localeCompare(b.concepto);
        }
        case 'reciente_asc': {
          if (a.ultimaVez && b.ultimaVez) return a.ultimaVez.localeCompare(b.ultimaVez);
          if (a.ultimaVez && !b.ultimaVez) return -1;
          if (!a.ultimaVez && b.ultimaVez) return 1;
          return a.concepto.localeCompare(b.concepto);
        }
        case 'disp_desc':
          return b.tareasAprobadasDisponibles - a.tareasAprobadasDisponibles || a.concepto.localeCompare(b.concepto);
        case 'disp_asc':
          return a.tareasAprobadasDisponibles - b.tareasAprobadasDisponibles || a.concepto.localeCompare(b.concepto);
        default:
          return 0;
      }
    });
    return list;
  }, [conceptMetrics, conceptSort]);

  // Sorted task metrics
  const sortedTaskMetrics = useMemo(() => {
    const list = [...taskMetrics];
    list.sort((a, b) => {
      switch (taskSort) {
        case 'usos_desc':
          return b.usosTotales - a.usosTotales || b.minutos - a.minutos || a.nombre.localeCompare(b.nombre);
        case 'usos_asc':
          return a.usosTotales - b.usosTotales || a.minutos - b.minutos || a.nombre.localeCompare(b.nombre);
        case 'dias_desc':
          return b.diasDistintos - a.diasDistintos || b.minutos - a.minutos || a.nombre.localeCompare(b.nombre);
        case 'dias_asc':
          return a.diasDistintos - b.diasDistintos || a.minutos - b.minutos || a.nombre.localeCompare(b.nombre);
        case 'minutos_desc':
          return b.minutos - a.minutos || b.usosTotales - a.usosTotales || a.nombre.localeCompare(b.nombre);
        case 'minutos_asc':
          return a.minutos - b.minutos || a.usosTotales - b.usosTotales || a.nombre.localeCompare(b.nombre);
        case 'reciente_desc': {
          if (a.ultimaSesion && b.ultimaSesion) return b.ultimaSesion.localeCompare(a.ultimaSesion);
          if (a.ultimaSesion && !b.ultimaSesion) return -1;
          if (!a.ultimaSesion && b.ultimaSesion) return 1;
          return a.nombre.localeCompare(b.nombre);
        }
        case 'reciente_asc': {
          if (a.ultimaSesion && b.ultimaSesion) return a.ultimaSesion.localeCompare(b.ultimaSesion);
          if (a.ultimaSesion && !b.ultimaSesion) return -1;
          if (!a.ultimaSesion && b.ultimaSesion) return 1;
          return a.nombre.localeCompare(b.nombre);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [taskMetrics, taskSort]);

  // Helper for formatting date (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper for diasSinEstimulo badge
  const renderStimulusBadge = (dias: number | null) => {
    if (dias === null) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
          Sin registro
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

  // Helper para mostrar origen de la presencia
  const renderOrigenBadge = (origen: OrigenPresencia) => {
    if (origen === 'ambos') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 shadow-sm"
          title="Documentado en fichas históricas y posteriormente reutilizado en calendario"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ambos
        </span>
      );
    }
    if (origen === 'historico') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-950/60 text-blue-300 border border-blue-700/60"
          title="Trabajo histórico documentado en fichas PDF de origen"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Histórico
        </span>
      );
    }
    if (origen === 'reutilizacion') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-950/60 text-purple-300 border border-purple-700/60"
          title="Reutilizado desde Biblioteca en sesiones del calendario"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          Reutilización
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-medium">
        —
      </span>
    );
  };

  // Helper for estado simplificado badge
  const renderEstadoBadge = (row: ConceptMetricRow) => {
    if (row.origenPresencia === 'ambos') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-950/50 text-emerald-300 border border-emerald-700/50">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Ambos
        </span>
      );
    }
    if (row.origenPresencia === 'reutilizacion') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-purple-950/50 text-purple-300 border border-purple-700/50">
          <TrendingUp className="w-3 h-3 text-purple-400" />
          Reutilizado
        </span>
      );
    }
    if (row.origenPresencia === 'historico') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-blue-950/50 text-blue-300 border border-blue-700/50">
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          Documentado
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
        <p className="text-sm font-bold text-slate-300">Cargando analítica integral de Biblioteca e Histórico...</p>
        <p className="text-xs text-slate-500 mt-1">Cotejando 16 sesiones documentadas homologadas, fichas PDF y registros en calendario.</p>
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
      {/* ── 1. BANNER DE TRAZABILIDAD INTEGRAL ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/60 border border-blue-500/25 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
              Trazabilidad Integral: Histórico Documentado y Reutilización de Biblioteca
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              El panel integra dos dominios verificados sin presuponer ejecuciones no comprobadas:{' '}
              <span className="font-semibold text-white">1) Trabajo Histórico Documentado</span> (16 sesiones documentadas homologadas, 51 tareas en origen con 83′ exactos auditados en fichas PDF de Aitor) y{' '}
              <span className="font-semibold text-white">2) Reutilización de Biblioteca</span> (trazabilidad operativa activa desde 07/10/2026 mediante <span className="font-mono text-blue-300">library_task_id</span>). Los conceptos tácticos se resuelven de forma unificada mediante las relaciones auditadas de la Biblioteca.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. KPIS SUPERIORES (5 TARJETAS CONTEXTUALES) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Tareas aprobadas */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.fuenteActiva === 'historico'
                ? 'Tareas documentadas'
                : kpis.fuenteActiva === 'reutilizacion'
                ? 'Tareas reutilizadas'
                : 'Tareas activas'}
            </span>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{kpis.tareasAprobadasUtilizadas}</span>
            <span className="text-xs font-bold text-slate-500">/ {kpis.totalTareasAprobadas}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {kpis.fuenteActiva === 'historico'
              ? '51 tareas en fichas PDF de origen'
              : kpis.fuenteActiva === 'reutilizacion'
              ? 'Reutilizadas desde 07/10 en calendario'
              : 'Documentadas en origen o reutilizadas'}
          </p>
        </div>

        {/* KPI 2: Porcentaje de explotación / cobertura */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.fuenteActiva === 'reutilizacion'
                ? '% Reutilización'
                : kpis.fuenteActiva === 'historico'
                ? '% Cobertura histórica'
                : '% Cobertura total'}
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{kpis.porcentajeExplotacion}%</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {kpis.fuenteActiva === 'reutilizacion'
              ? 'Del catálogo reutilizado desde 07/10'
              : kpis.fuenteActiva === 'historico'
              ? 'De la Biblioteca originada en pretemporada'
              : 'De la Biblioteca con registro activo'}
          </p>
        </div>

        {/* KPI 3: Minutos acumulados validados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.fuenteActiva === 'historico'
                ? 'Minutos documentados'
                : kpis.fuenteActiva === 'reutilizacion'
                ? 'Minutos planificados'
                : 'Minutos validados'}
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-300">{kpis.minutosAcumulados}</span>
            <span className="text-xs font-bold text-slate-500">min</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {kpis.fuenteActiva === 'historico'
              ? 'Suma exclusiva de 6 tareas EXACTO_PDF'
              : kpis.fuenteActiva === 'reutilizacion'
              ? 'Suma en sesiones de planificación'
              : `${kpis.minutosExactosHistoricos}′ (PDF exacto) + ${kpis.minutosReutilizacion}′ (reut.)`}
          </p>
        </div>

        {/* KPI 4: Días distintos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.fuenteActiva === 'historico'
                ? 'Sesiones documentadas'
                : kpis.fuenteActiva === 'reutilizacion'
                ? 'Sesiones reutilizadas'
                : 'Días con actividad'}
            </span>
            <Calendar className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-300">{kpis.diasDistintosEntrenamiento}</span>
            <span className="text-xs font-bold text-slate-500">días</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {kpis.fuenteActiva === 'historico'
              ? '16 sesiones documentadas homologadas'
              : kpis.fuenteActiva === 'reutilizacion'
              ? 'Sesiones con tareas de biblioteca'
              : `${kpis.diasHistoricos} documentadas + ${kpis.diasReutilizacion} reutilizadas`}
          </p>
        </div>

        {/* KPI 5: Conceptos trabajados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {kpis.fuenteActiva === 'historico'
                ? 'Conceptos documentados'
                : kpis.fuenteActiva === 'reutilizacion'
                ? 'Conceptos reutilizados'
                : 'Conceptos trabajados'}
            </span>
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

      {/* ── 3. BARRA DE FILTROS, FUENTE Y SELECTOR DE VISTA ── */}
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
                Por Concepto ({sortedConceptMetrics.length})
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
                Por Tarea ({sortedTaskMetrics.length})
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

          {/* Selectores de Fuente y Periodo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Fuente */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase px-2">Fuente:</span>
              {(['total', 'historico', 'reutilizacion'] as AnalyticsSource[]).map(f => {
                const labelMap: Record<AnalyticsSource, string> = {
                  total: 'Todo validado',
                  historico: 'Histórico documentado',
                  reutilizacion: 'Reutilización Biblioteca'
                };
                const isActive = fuenteAnalisis === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFuenteAnalisis(f)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      isActive
                        ? f === 'total'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : f === 'historico'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {labelMap[f]}
                  </button>
                );
              })}
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
        </div>

        {/* Filtros secundarios: Familia, Concepto, Orden y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/60">
          {/* Familia */}
          <div className="sm:col-span-3">
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

          {/* Concepto */}
          <div className="sm:col-span-3">
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

          {/* Ordenación */}
          <div className="sm:col-span-3">
            <select
              value={activeSubTab === 'conceptos' ? conceptSort : taskSort}
              onChange={e => {
                if (activeSubTab === 'conceptos') {
                  setConceptSort(e.target.value as SortConceptOption);
                } else {
                  setTaskSort(e.target.value as SortTaskOption);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              {activeSubTab === 'conceptos' ? (
                <>
                  <option value="dias_desc">Ordenar: Más días</option>
                  <option value="dias_asc">Ordenar: Menos días</option>
                  <option value="minutos_desc">Ordenar: Más minutos</option>
                  <option value="minutos_asc">Ordenar: Menos minutos</option>
                  <option value="reciente_desc">Ordenar: Más reciente</option>
                  <option value="reciente_asc">Ordenar: Menos reciente</option>
                  <option value="disp_desc">Ordenar: Más tareas disponibles</option>
                  <option value="disp_asc">Ordenar: Menos tareas disponibles</option>
                </>
              ) : (
                <>
                  <option value="usos_desc">Ordenar: Más usos</option>
                  <option value="usos_asc">Ordenar: Menos usos</option>
                  <option value="dias_desc">Ordenar: Más días</option>
                  <option value="dias_asc">Ordenar: Menos días</option>
                  <option value="minutos_desc">Ordenar: Más minutos</option>
                  <option value="minutos_asc">Ordenar: Menos minutos</option>
                  <option value="reciente_desc">Ordenar: Más reciente</option>
                  <option value="reciente_asc">Ordenar: Menos reciente</option>
                </>
              )}
            </select>
          </div>

          {/* Búsqueda rápida */}
          <div className="sm:col-span-3 relative">
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
                  <th className="py-3 px-4 text-center">Origen</th>
                  <th className="py-3 px-4 text-center">Días distintos</th>
                  <th className="py-3 px-4 text-center">Minutos</th>
                  <th className="py-3 px-4 text-center">Última vez</th>
                  <th className="py-3 px-4 text-center">Tareas disp.</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sortedConceptMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No se encontraron conceptos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  sortedConceptMetrics.map(row => (
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

                      {/* Origen */}
                      <td className="py-3 px-4 text-center">
                        {renderOrigenBadge(row.origenPresencia)}
                      </td>

                      {/* Días distintos */}
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {row.diasDistintos > 0 ? row.diasDistintos : '—'}
                      </td>

                      {/* Minutos */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-300">
                        {row.minutos > 0 ? `${row.minutos}′` : row.usosTotales > 0 ? 'Sin min' : '—'}
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
                  <th className="py-3 px-4 text-center">Origen</th>
                  <th className="py-3 px-4 text-center">Impactos / Usos</th>
                  <th className="py-3 px-4 text-center">Días distintos</th>
                  <th className="py-3 px-4 text-center">Minutos validados</th>
                  <th className="py-3 px-4 text-center">Última sesión</th>
                  <th className="py-3 px-4 text-center">Días sin estímulo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sortedTaskMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No se encontraron tareas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  sortedTaskMetrics.map(task => (
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

                      {/* Origen */}
                      <td className="py-3 px-4 text-center">
                        {renderOrigenBadge(task.origenPresencia)}
                      </td>

                      {/* Usos / Impactos */}
                      <td className="py-3 px-4 text-center">
                        {task.usosTotales > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {task.usosTotales}
                            </span>
                            {task.origenPresencia === 'ambos' && (
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {task.usosHistoricos} hist + {task.usosReutilizacion} reut
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold">0</span>
                        )}
                      </td>

                      {/* Días distintos */}
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {task.diasDistintos > 0 ? task.diasDistintos : '—'}
                      </td>

                      {/* Minutos validados */}
                      <td className="py-3 px-4 text-center">
                        {task.minutos > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-amber-300">
                              {task.minutos}′
                            </span>
                            {task.origenPresencia === 'ambos' && (
                              <div className="text-[9px] text-slate-400">
                                {task.minutosDetalle}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px]">
                            {task.minutosDetalle}
                          </span>
                        )}
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
