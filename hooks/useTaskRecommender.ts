'use client';

import { useState, useMemo } from 'react';
import { useLibraryAnalytics, TaskMetricRow } from './useLibraryAnalytics';
import { CANONICAL_TO_FAMILY_MAP, TACTICAL_FAMILIES } from '@/lib/planificacion/tacticalDictionary';
import { PlanningTaskLibrary } from '@/types';

export type DuracionFilterOption = 'todos' | 'corta' | 'media' | 'larga';
export type JugadoresFilterOption = 'todos' | 'pocos' | 'medio' | 'muchos';

export interface RecommendedTask {
  id: string;
  nombre: string;
  tipo_tarea: string;
  conceptos: string[];
  duracionTexto: string;
  minutosDefecto: number | null;
  jugadoresTexto: string;
  jugadoresDefecto: number | null;
  espacioDefecto: string | null;
  diasSinEstimulo: number | null;
  ultimaSesion: string | null;
  usosTotales: number;
  usosHistoricos: number;
  usosReutilizacion: number;
  origenPresencia: 'ninguno' | 'historico' | 'reutilizacion' | 'ambos';
  rawTask: PlanningTaskLibrary;
  score: number;
  explanation: string;
  matchesOptionalFilters: boolean;
}

export type RecommenderStatus =
  | 'idle'
  | 'success'
  | 'official_concept_without_tasks'
  | 'no_results_with_filters'
  | 'invalid_concept';

export interface UseTaskRecommenderOptions {
  /** Métricas analíticas ya cargadas (opcional, para evitar re-fetch) */
  existingTaskMetrics?: TaskMetricRow[];
  /** Tareas ya cargadas (opcional) */
  existingTasks?: PlanningTaskLibrary[];
}

export function useTaskRecommender(options?: UseTaskRecommenderOptions) {
  // Consumir el hook de analítica de biblioteca si no se pasan métricas externas
  const analytics = useLibraryAnalytics();

  // Estados de filtro del recomendador V1
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedDuracion, setSelectedDuracion] = useState<DuracionFilterOption>('todos');
  const [selectedJugadores, setSelectedJugadores] = useState<JugadoresFilterOption>('todos');
  const [filtroEstricto, setFiltroEstricto] = useState<boolean>(true);

  // Fuente de datos de tareas aprobadas
  const allTaskMetrics = useMemo(() => {
    return options?.existingTaskMetrics || analytics.taskMetrics;
  }, [options?.existingTaskMetrics, analytics.taskMetrics]);

  // Lista dinámica de tipos de tarea existentes entre las aprobadas
  const availableTipos = useMemo(() => {
    const tipos = new Set<string>();
    allTaskMetrics.forEach(t => {
      if (t.tipo_tarea && t.tipo_tarea.trim()) {
        tipos.add(t.tipo_tarea.trim());
      }
    });
    return Array.from(tipos).sort();
  }, [allTaskMetrics]);

  // Catálogo completo de conceptos oficiales canónicos (63)
  const officialConcepts = useMemo(() => {
    return Object.keys(CANONICAL_TO_FAMILY_MAP).sort((a, b) => a.localeCompare(b));
  }, []);

  // Lógica principal de recomendación determinista
  const recommendationResult = useMemo(() => {
    const trimmedConcept = selectedConcept.trim();

    if (!trimmedConcept) {
      return {
        status: 'idle' as RecommenderStatus,
        message: 'Selecciona o escribe qué concepto táctico deseas entrenar.',
        tasks: [] as RecommendedTask[],
        totalCandidates: 0,
        conceptFamily: null
      };
    }

    const familyId = CANONICAL_TO_FAMILY_MAP[trimmedConcept];
    const isOfficialConcept = Boolean(familyId);

    if (!isOfficialConcept) {
      return {
        status: 'invalid_concept' as RecommenderStatus,
        message: `El concepto "${trimmedConcept}" no forma parte del catálogo oficial de 63 conceptos del Diccionario V2.`,
        tasks: [] as RecommendedTask[],
        totalCandidates: 0,
        conceptFamily: null
      };
    }

    // 1. Filtrar tareas candidatas aprobadas que tengan relación canónica directa y exacta
    const candidateRows = allTaskMetrics.filter(row => {
      // Regla obligatoria: solo aprobadas y con coincidencia exacta con el concepto
      return row.conceptos.includes(trimmedConcept);
    });

    if (candidateRows.length === 0) {
      return {
        status: 'official_concept_without_tasks' as RecommenderStatus,
        message: 'Este concepto forma parte del catálogo oficial, pero todavía no tiene tareas aprobadas en la Biblioteca.',
        tasks: [] as RecommendedTask[],
        totalCandidates: 0,
        conceptFamily: familyId
      };
    }

    // Evaluar ajuste a filtros opcionales para cada tarea candidata
    const evaluatedCandidates = candidateRows.map(row => {
      const raw = row.rawTask || ({} as PlanningTaskLibrary);

      // Tipo de tarea
      const matchesTipo =
        selectedTipo === 'todos' ||
        row.tipo_tarea.toLowerCase() === selectedTipo.toLowerCase();

      // Duración
      let matchesDuracion = true;
      if (selectedDuracion !== 'todos') {
        const min = raw.minutos_defecto ?? (row.minutos > 0 ? row.minutos : null);
        if (selectedDuracion === 'corta') {
          matchesDuracion = min !== null && min <= 12;
        } else if (selectedDuracion === 'media') {
          matchesDuracion = min !== null && min > 12 && min <= 20;
        } else if (selectedDuracion === 'larga') {
          matchesDuracion = min !== null && min > 20;
        }
      }

      // Jugadores
      let matchesJugadores = true;
      if (selectedJugadores !== 'todos') {
        const jug = raw.jugadores_defecto ?? null;
        if (selectedJugadores === 'pocos') {
          matchesJugadores = jug !== null && jug <= 12;
        } else if (selectedJugadores === 'medio') {
          matchesJugadores = jug !== null && jug > 12 && jug <= 18;
        } else if (selectedJugadores === 'muchos') {
          matchesJugadores = jug !== null && jug > 18;
        }
      }

      const activeOptionalFiltersCount =
        (selectedTipo !== 'todos' ? 1 : 0) +
        (selectedDuracion !== 'todos' ? 1 : 0) +
        (selectedJugadores !== 'todos' ? 1 : 0);

      const matchedOptionalFiltersCount =
        (selectedTipo !== 'todos' && matchesTipo ? 1 : 0) +
        (selectedDuracion !== 'todos' && matchesDuracion ? 1 : 0) +
        (selectedJugadores !== 'todos' && matchesJugadores ? 1 : 0);

      const matchesAllOptional = matchesTipo && matchesDuracion && matchesJugadores;

      // Cálculo de score determinista explicable
      // Base conceptual: 1000 pts
      // Filtros opcionales: +200 pts por cada filtro opcional cumplido
      // Días sin estímulo: hasta +100 pts por rotación/frescura (más días = mayor rotación)
      // Penalización por exceso de uso: -5 pts por cada uso reciente en temporada
      const diasNorm = row.diasSinEstimulo === null ? 120 : Math.min(row.diasSinEstimulo, 120);
      const score =
        1000 +
        matchedOptionalFiltersCount * 200 +
        diasNorm -
        row.usosTotales * 5;

      // Textos formateados
      const duracionTexto =
        raw.duracion_texto_pdf ||
        (raw.minutos_defecto ? `${raw.minutos_defecto} min` : (row.minutos > 0 ? `${row.minutos} min` : 'No especificada'));

      const jugadoresTexto =
        raw.jugadores_texto_pdf ||
        (raw.jugadores_defecto ? `${raw.jugadores_defecto} jug` : 'No especificado');

      // Explicación metodológica neutral (DOCUMENTADA ≠ EJECUTADA_CONFIRMADA)
      let explanation = `Coincidencia exacta con ${trimmedConcept}`;
      if (row.origenPresencia === 'historico') {
        explanation += row.diasSinEstimulo !== null
          ? ` · ${row.diasSinEstimulo} días sin registro documentado`
          : ' · Sin registro previo en ficha';
        explanation += ` · ${row.usosHistoricos} ${row.usosHistoricos === 1 ? 'registro documentado' : 'registros documentados'}`;
      } else if (row.origenPresencia === 'reutilizacion') {
        explanation += row.diasSinEstimulo !== null
          ? ` · ${row.diasSinEstimulo} días desde última reutilización registrada`
          : ' · Sin reutilización previa';
        explanation += ` · ${row.usosReutilizacion} ${row.usosReutilizacion === 1 ? 'reutilización en calendario' : 'reutilizaciones en calendario'}`;
      } else if (row.origenPresencia === 'ambos') {
        explanation += row.diasSinEstimulo !== null
          ? ` · ${row.diasSinEstimulo} días desde última reutilización registrada`
          : '';
        explanation += ` · ${row.usosHistoricos} doc. + ${row.usosReutilizacion} reut.`;
      } else {
        explanation += ' · Sin registros en temporada';
      }

      if (activeOptionalFiltersCount > 0) {
        explanation += ` · Ajuste a filtros: ${matchedOptionalFiltersCount}/${activeOptionalFiltersCount}`;
      }

      const recommendedItem: RecommendedTask = {
        id: row.id,
        nombre: row.nombre,
        tipo_tarea: row.tipo_tarea,
        conceptos: row.conceptos,
        duracionTexto,
        minutosDefecto: raw.minutos_defecto ?? null,
        jugadoresTexto,
        jugadoresDefecto: raw.jugadores_defecto ?? null,
        espacioDefecto: raw.espacio_defecto ?? null,
        diasSinEstimulo: row.diasSinEstimulo,
        ultimaSesion: row.ultimaSesion,
        usosTotales: row.usosTotales,
        usosHistoricos: row.usosHistoricos,
        usosReutilizacion: row.usosReutilizacion,
        origenPresencia: row.origenPresencia,
        rawTask: raw,
        score,
        explanation,
        matchesOptionalFilters: matchesAllOptional
      };

      return {
        item: recommendedItem,
        matchesAllOptional,
        matchedOptionalFiltersCount,
        diasEffective: row.diasSinEstimulo === null ? 9999 : row.diasSinEstimulo,
        usosTotales: row.usosTotales
      };
    });

    // Si el usuario tiene activo el filtro estricto y hay filtros opcionales activos
    const hasActiveOptionalFilters =
      selectedTipo !== 'todos' ||
      selectedDuracion !== 'todos' ||
      selectedJugadores !== 'todos';

    let pool = evaluatedCandidates;
    let noResultsDueToOptionalFilters = false;

    if (filtroEstricto && hasActiveOptionalFilters) {
      const strictlyFiltered = evaluatedCandidates.filter(c => c.matchesAllOptional);
      if (strictlyFiltered.length > 0) {
        pool = strictlyFiltered;
      } else {
        noResultsDueToOptionalFilters = true;
      }
    }

    if (noResultsDueToOptionalFilters) {
      return {
        status: 'no_results_with_filters' as RecommenderStatus,
        message: `Existen ${candidateRows.length} tareas aprobadas para "${trimmedConcept}", pero ninguna coincide simultáneamente con los filtros opcionales seleccionados.`,
        tasks: [] as RecommendedTask[],
        totalCandidates: candidateRows.length,
        conceptFamily: familyId
      };
    }

    // Ordenación determinista:
    // 1. Mayor ajuste a filtros opcionales (matchedOptionalFiltersCount desc)
    // 2. Mayor número de días sin estímulo (diasEffective desc)
    // 3. Menor frecuencia de uso reciente (usosTotales asc)
    // 4. Nombre alfabético asc (desempate estable)
    pool.sort((a, b) => {
      if (b.matchedOptionalFiltersCount !== a.matchedOptionalFiltersCount) {
        return b.matchedOptionalFiltersCount - a.matchedOptionalFiltersCount;
      }
      if (b.diasEffective !== a.diasEffective) {
        return b.diasEffective - a.diasEffective;
      }
      if (a.usosTotales !== b.usosTotales) {
        return a.usosTotales - b.usosTotales;
      }
      return a.item.nombre.localeCompare(b.item.nombre);
    });

    // Retornar Top 3 por defecto
    const top3 = pool.slice(0, 3).map(p => p.item);

    return {
      status: 'success' as RecommenderStatus,
      message: `Mostrando las ${top3.length} mejores recomendaciones aprobadas para "${trimmedConcept}".`,
      tasks: top3,
      totalCandidates: candidateRows.length,
      conceptFamily: familyId
    };
  }, [
    allTaskMetrics,
    selectedConcept,
    selectedTipo,
    selectedDuracion,
    selectedJugadores,
    filtroEstricto
  ]);

  const resetFilters = () => {
    setSelectedConcept('');
    setSelectedTipo('todos');
    setSelectedDuracion('todos');
    setSelectedJugadores('todos');
    setFiltroEstricto(true);
  };

  return {
    loading: analytics.loading,
    errorMsg: analytics.errorMsg,
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
    status: recommendationResult.status,
    message: recommendationResult.message,
    recommendedTasks: recommendationResult.tasks,
    totalCandidates: recommendationResult.totalCandidates,
    conceptFamily: recommendationResult.conceptFamily
  };
}
