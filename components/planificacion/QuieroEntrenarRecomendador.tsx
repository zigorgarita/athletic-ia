'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Target,
  Clock,
  Users,
  Calendar,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  useTaskRecommender,
  DuracionFilterOption,
  JugadoresFilterOption
} from '@/hooks/useTaskRecommender';
import { PlanningTaskLibrary } from '@/types';
import { getFamilyById } from '@/lib/planificacion/tacticalDictionary';

interface QuieroEntrenarRecomendadorProps {
  onSelectTask?: (task: PlanningTaskLibrary) => void;
  existingTasks?: PlanningTaskLibrary[];
}

export function QuieroEntrenarRecomendador({
  onSelectTask
}: QuieroEntrenarRecomendadorProps) {
  const {
    loading,
    errorMsg,
    officialConcepts,
    availableTipos,
    selectedConcept,
    setSelectedConcept,
    selectedTipo,
    setSelectedTipo,
    selectedDuracion,
    setSelectedDuracion,
    selectedJugadores,
    setSelectedJugadores,
    filtroEstricto,
    setFiltroEstricto,
    resetFilters,
    status,
    message,
    recommendedTasks,
    totalCandidates,
    conceptFamily
  } = useTaskRecommender();

  const [showOptionalFilters, setShowOptionalFilters] = useState<boolean>(false);

  const familyObj = conceptFamily ? getFamilyById(conceptFamily) : null;

  // Sugerencias rápidas habituales de conceptos
  const quickSuggestions = [
    'Presión Tras Pérdida (PTP)',
    'Transición Ofensiva',
    'Ataque Posicional',
    'Salida de Balón',
    'Acoso'
  ];

  const formatFecha = (isoStr: string | null) => {
    if (!isoStr) return 'No registrada';
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  const renderDiasSemaforo = (
    dias: number | null,
    origen: 'ninguno' | 'historico' | 'reutilizacion' | 'ambos'
  ) => {
    if (dias === null || origen === 'ninguno') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
          <Sparkles className="w-2.5 h-2.5 text-blue-400" />
          Sin registros previos
        </span>
      );
    }

    const isHistorico = origen === 'historico';
    const label = isHistorico
      ? `Hace ${dias}d (reg. documentado)`
      : `Hace ${dias}d (reutilización)`;

    if (dias >= 21) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          title={isHistorico ? `${dias} días desde último registro en ficha PDF` : `${dias} días desde última reutilización registrada`}
        >
          {label} · rotación
        </span>
      );
    }
    if (dias >= 7) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30"
          title={isHistorico ? `${dias} días desde último registro en ficha PDF` : `${dias} días desde última reutilización registrada`}
        >
          {label}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30"
        title={isHistorico ? `${dias} días desde último registro en ficha PDF` : `${dias} días desde última reutilización registrada`}
      >
        {label} · reciente
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 1. CABECERA Y CONTEXTO DEL RECOMENDADOR ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900/80 to-slate-900/60 border border-[#CC0E21]/25 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#CC0E21]/15 border border-[#CC0E21]/30 text-[#CC0E21] shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Quiero Entrenar…
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  Recomendador V1
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Indica el concepto táctico y el recomendador seleccionará las tareas oficiales aprobadas de la Biblioteca, priorizando la rotación metodológica según los registros documentados y sesiones de calendario (sin presuponer ejecuciones no comprobadas).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto text-xs">
            <button
              type="button"
              onClick={() => setShowOptionalFilters(!showOptionalFilters)}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                showOptionalFilters || selectedTipo !== 'todos' || selectedDuracion !== 'todos' || selectedJugadores !== 'todos'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros opcionales
              {(selectedTipo !== 'todos' || selectedDuracion !== 'todos' || selectedJugadores !== 'todos') && (
                <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              )}
            </button>

            {selectedConcept && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Reiniciar recomendador"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── SELECTOR PRINCIPAL: CONCEPTO CANÓNICO ── */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#CC0E21]" />
              Concepto Táctico Principal (Obligatorio)
            </label>
            <div className="relative">
              <select
                value={selectedConcept}
                onChange={e => setSelectedConcept(e.target.value)}
                className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-[#CC0E21] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer focus:outline-none"
              >
                <option value="">-- Selecciona qué concepto quieres trabajar --</option>
                {officialConcepts.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col justify-end">
            {familyObj && (
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Familia:</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${familyObj.badgeColor}`}>
                  {familyObj.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sugerencias rápidas cuando aún no se ha seleccionado nada */}
        {!selectedConcept && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Frecuentes:</span>
            {quickSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedConcept(s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-900 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── 2. FILTROS OPCIONALES EXPANDIBLES (TIPO, DURACIÓN, JUGADORES) ── */}
        {showOptionalFilters && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                Ajuste fino de la sesión
              </span>
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={filtroEstricto}
                  onChange={e => setFiltroEstricto(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-[#CC0E21] focus:ring-0 cursor-pointer"
                />
                Exigir coincidencia estricta en filtros opcionales
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tipo de tarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Tipo de tarea:
                </label>
                <select
                  value={selectedTipo}
                  onChange={e => setSelectedTipo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Cualquier tipo</option>
                  {availableTipos.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duración */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Duración aproximada:
                </label>
                <select
                  value={selectedDuracion}
                  onChange={e => setSelectedDuracion(e.target.value as DuracionFilterOption)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Cualquier duración</option>
                  <option value="corta">Corta (≤ 12 min)</option>
                  <option value="media">Media (13 a 20 min)</option>
                  <option value="larga">Larga (&gt; 20 min)</option>
                </select>
              </div>

              {/* Jugadores */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Número de futbolistas:
                </label>
                <select
                  value={selectedJugadores}
                  onChange={e => setSelectedJugadores(e.target.value as JugadoresFilterOption)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Cualquier grupo</option>
                  <option value="pocos">Grupo reducido (≤ 12 jug)</option>
                  <option value="medio">Grupo medio (13 a 18 jug)</option>
                  <option value="muchos">Plantilla amplia (&gt; 18 jug)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center justify-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-[#CC0E21] rounded-full animate-spin" />
          <span>Sincronizando tareas y métricas de Biblioteca...</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 text-xs font-bold text-red-300 bg-red-950/40 border border-red-800/40 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* ── 3. ESTADOS DE INFORMACIÓN / MENSAJES DE RESPUESTA ── */}
      {status === 'idle' && (
        <div className="p-8 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl text-slate-400 space-y-2">
          <Target className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <h4 className="text-sm font-black text-slate-300">
            ¿Qué objetivo táctico necesitas trabajar hoy?
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Elige un concepto en el selector superior para obtener las 3 tareas oficiales más idóneas según el tiempo transcurrido desde su último estímulo.
          </p>
        </div>
      )}

      {status === 'official_concept_without_tasks' && (
        <div className="p-6 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            Catálogo Oficial de Athletic IA
          </div>
          <p className="text-xs text-amber-300/90 leading-relaxed">
            Este concepto forma parte del catálogo oficial, pero todavía no tiene tareas aprobadas en la Biblioteca.
          </p>
          <p className="text-[11px] text-amber-400/70">
            El sistema nunca inventa ejercicios alternativos ni sustituye la ausencia de registros auditados.
          </p>
        </div>
      )}

      {status === 'no_results_with_filters' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-300 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            Sin coincidencias con los filtros opcionales
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {message}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedTipo('todos');
              setSelectedDuracion('todos');
              setSelectedJugadores('todos');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-black bg-[#CC0E21] text-white hover:bg-[#a50b1a] transition-all"
          >
            Quitar filtros opcionales y ver las {totalCandidates} tareas aprobadas
          </button>
        </div>
      )}

      {/* ── 4. PODIO DE LAS 3 TAREAS RECOMENDADAS ── */}
      {status === 'success' && recommendedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Top {recommendedTasks.length} Tareas Recomendadas
              <span className="text-slate-500 font-normal">
                (de {totalCandidates} tareas aprobadas para &quot;{selectedConcept}&quot;)
              </span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Determinista · Rotación por registros
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendedTasks.map((task, idx) => (
              <div
                key={task.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
              >
                {/* Parte superior: Posición en podio y tipo */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[#CC0E21] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                        {task.tipo_tarea}
                      </span>
                    </div>
                    {renderDiasSemaforo(task.diasSinEstimulo, task.origenPresencia)}
                  </div>

                  {/* Nombre oficial */}
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-200 transition-colors leading-snug line-clamp-2">
                      {task.nombre}
                    </h4>
                  </div>

                  {/* Conceptos asociados */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      Conceptos canónicos auditados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {task.conceptos.map(c => {
                        const isRequested = c === selectedConcept;
                        return (
                          <span
                            key={c}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isRequested
                                ? 'bg-[#CC0E21]/20 text-red-300 border border-[#CC0E21]/40'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Métricas clave: Duración y Jugadores */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate" title={task.duracionTexto}>
                        {task.duracionTexto}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate" title={task.jugadoresTexto}>
                        {task.jugadoresTexto}
                      </span>
                    </div>
                  </div>

                  {/* Última fecha documentada o reutilizada */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-500 truncate" title={task.origenPresencia === 'historico' ? 'Último registro documentado' : 'Última reutilización registrada'}>
                      <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                      {task.origenPresencia === 'historico'
                        ? 'Último reg. documentado:'
                        : task.origenPresencia === 'reutilizacion' || task.origenPresencia === 'ambos'
                        ? 'Última reutilización reg.:'
                        : 'Último registro:'}
                    </span>
                    <span className="font-mono text-slate-300 font-bold shrink-0">
                      {formatFecha(task.ultimaSesion)}
                    </span>
                  </div>

                  {/* Registros en temporada */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-slate-500">Registros en temporada:</span>
                    <div className="flex items-center gap-1">
                      {task.origenPresencia === 'ambos' ? (
                        <span className="font-bold text-slate-300">
                          {task.usosTotales} reg. <span className="text-[9px] text-slate-500 font-normal">({task.usosHistoricos} doc. · {task.usosReutilizacion} reut.)</span>
                        </span>
                      ) : task.origenPresencia === 'historico' ? (
                        <span className="font-bold text-slate-300">
                          {task.usosHistoricos} {task.usosHistoricos === 1 ? 'doc. PDF' : 'docs. PDF'}
                        </span>
                      ) : task.origenPresencia === 'reutilizacion' ? (
                        <span className="font-bold text-slate-300">
                          {task.usosReutilizacion} {task.usosReutilizacion === 1 ? 'reutilización' : 'reutilizaciones'}
                        </span>
                      ) : (
                        <span className="text-slate-500">Sin registros</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Ver ficha */}
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectTask && onSelectTask(task.rawTask)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-[#CC0E21] text-slate-200 hover:text-white border border-slate-800 hover:border-[#CC0E21] text-xs font-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
