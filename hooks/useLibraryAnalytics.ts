import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PlanningTaskLibrary, PlanningTaskLibraryConcept } from '@/types';
import {
  TACTICAL_FAMILIES,
  getFamilyForConcept
} from '@/lib/planificacion/tacticalDictionary';

/** Fecha de referencia en que comenzó el registro operativo de tareas en el planificador */
export const FECHA_INICIO_TRAZABILIDAD_OPERATIVA = '2026-10-07';

export type PeriodoAnalisis = 'semana' | '15d' | '30d' | 'temporada';
export type AnalyticsSource = 'total' | 'historico' | 'reutilizacion';
export type OrigenPresencia = 'historico' | 'reutilizacion' | 'ambos' | 'ninguno';

export interface TaskEvent {
  id: string;
  library_task_id: string;
  fecha: string;
  source: 'historical' | 'reuse';
  minutosValidados: number; // Suma solo si EXACTO_PDF o planning_tasks
  minutosRaw: number | null;
  metodo_minutos?: string | null;
  session_id?: string;
  nombre_tarea?: string;
}

export interface ConceptMetricRow {
  concepto: string;
  familiaId: string;
  familiaLabel: string;
  badgeColor: string;
  categoriaDb: string;
  diasDistintos: number;
  tareasUsadas: number;
  usosTotales: number;
  minutos: number;
  ultimaVez: string | null;
  diasSinEstimulo: number | null;
  tareasAprobadasDisponibles: number;
  origenPresencia: OrigenPresencia;
  diagnostico:
    | 'Sin tareas en Biblioteca'
    | 'Biblioteca escasa'
    | 'Tenemos tareas, no lo entrenamos'
    | 'Trabajado recientemente'
    | 'Documentado en histórico'
    | 'Histórico y reutilizado';
}

export interface TaskMetricRow {
  id: string;
  nombre: string;
  tipo_tarea: string;
  conceptos: string[];
  usosTotales: number;
  usosHistoricos: number;
  usosReutilizacion: number;
  origenPresencia: OrigenPresencia;
  diasDistintos: number;
  minutos: number;
  minutosDetalle: string;
  ultimaSesion: string | null;
  diasSinEstimulo: number | null;
  alternativasAprobadas: Array<{
    id: string;
    nombre: string;
    usos: number;
  }>;
}

export interface LibraryAnalyticsKPIs {
  fuenteActiva: AnalyticsSource;
  tareasAprobadasUtilizadas: number;
  totalTareasAprobadas: number;
  porcentajeExplotacion: number;
  minutosAcumulados: number;
  minutosExactosHistoricos: number;
  minutosReutilizacion: number;
  diasDistintosEntrenamiento: number;
  diasHistoricos: number;
  diasReutilizacion: number;
  conceptosTrabajados: number;
  totalConceptosOficiales: number;
  conceptosConTareasAprobadas: number;
  conceptosSinTareasAprobadas: number;
}

export function useLibraryAnalytics() {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Raw data from Supabase
  const [libraryTasks, setLibraryTasks] = useState<PlanningTaskLibrary[]>([]);
  const [libraryConcepts, setLibraryConcepts] = useState<PlanningTaskLibraryConcept[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<TaskEvent[]>([]);
  const [reuseEvents, setReuseEvents] = useState<TaskEvent[]>([]);

  // Filter states
  const [periodo, setPeriodo] = useState<PeriodoAnalisis>('temporada');
  const [fuenteAnalisis, setFuenteAnalisis] = useState<AnalyticsSource>('total');
  const [selectedFamily, setSelectedFamily] = useState<string>('todas');
  const [selectedConcept, setSelectedConcept] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch all necessary data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch library tasks (catálogo de tareas)
        const { data: tasksData, error: tasksErr } = await supabase
          .from('planning_task_library')
          .select('id, nombre, tipo_tarea, minutos_defecto, jugadores_defecto, espacio_defecto, objetivo, descripcion, observaciones, creado_por, created_at, sesion_origen_id, numero_tarea_pdf, aprobada')
          .order('created_at', { ascending: true });

        if (tasksErr) throw tasksErr;

        // 2. Fetch library concepts (168 tuplas canónicas auditadas)
        let fetchedConcepts: PlanningTaskLibraryConcept[] = [];
        try {
          const resp = await fetch('/api/planificacion/library-concepts');
          if (resp.ok) {
            const json = await resp.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
              fetchedConcepts = json.data;
            }
          }
        } catch (fetchErr) {
          console.warn('[useLibraryAnalytics] Fallback a supabase directo para conceptos:', fetchErr);
        }

        // Fallback directo a supabase si la API route no respondiese
        if (fetchedConcepts.length === 0) {
          const { data: directConceptsData } = await supabase
            .from('planning_task_library_concepts')
            .select('id, library_id, categoria, concepto, aprobado_por, aprobado_at, created_at');
          if (directConceptsData && directConceptsData.length > 0) {
            fetchedConcepts = directConceptsData as PlanningTaskLibraryConcept[];
          }
        }

        // 3. Fetch historical training view (51 filas homologadas en v_planning_training_history_current)
        const { data: histData, error: histErr } = await supabase
          .from('v_planning_training_history_current')
          .select('id, session_id, library_task_id, fecha, numero_tarea_pdf, estado_documental, minutos, metodo_minutos, metadata');

        if (histErr) {
          console.warn('[useLibraryAnalytics] Aviso al cargar v_planning_training_history_current:', histErr);
        }

        // 4. Fetch linked reuse tasks from planning_tasks joined with planning_sessions
        const { data: reuseData, error: reuseErr } = await supabase
          .from('planning_tasks')
          .select('id, library_task_id, minutos, nombre_tarea, planning_sessions!inner(id, fecha)')
          .not('library_task_id', 'is', null);

        if (reuseErr) throw reuseErr;

        if (!isMounted) return;

        setLibraryTasks((tasksData as unknown as PlanningTaskLibrary[]) || []);
        setLibraryConcepts(fetchedConcepts);

        // Mapeo de eventos históricos documentados
        interface RawHistItem {
          id: string;
          session_id?: string;
          library_task_id: string;
          fecha: string;
          numero_tarea_pdf?: number;
          estado_documental?: string;
          minutos?: number | string | null;
          metodo_minutos?: string | null;
          metadata?: { nombre_tarea?: string; duracion_texto?: string | null } | null;
        }

        const parsedHistoricalEvents: TaskEvent[] = ((histData as unknown as RawHistItem[]) || [])
          .map(h => {
            const esMinutoExacto = h.metodo_minutos === 'EXACTO_PDF' && h.minutos !== null && !isNaN(Number(h.minutos));
            return {
              id: h.id,
              library_task_id: h.library_task_id,
              fecha: h.fecha,
              source: 'historical' as const,
              minutosValidados: esMinutoExacto ? Number(h.minutos) : 0,
              minutosRaw: h.minutos !== null && h.minutos !== undefined ? Number(h.minutos) : null,
              metodo_minutos: h.metodo_minutos || null,
              session_id: h.session_id,
              nombre_tarea: h.metadata?.nombre_tarea
            };
          })
          .filter(ev => Boolean(ev.library_task_id && ev.fecha));

        // Mapeo de eventos de reutilización en calendario
        interface RawUsageItem {
          id: string;
          library_task_id: string;
          minutos: number | string | null;
          nombre_tarea?: string | null;
          planning_sessions?: { id?: string; fecha?: string } | null;
        }

        const parsedReuseEvents: TaskEvent[] = ((reuseData as unknown as RawUsageItem[]) || [])
          .map(item => ({
            id: item.id,
            library_task_id: item.library_task_id,
            fecha: item.planning_sessions?.fecha || '',
            source: 'reuse' as const,
            minutosValidados: Number(item.minutos) || 0,
            minutosRaw: Number(item.minutos) || 0,
            metodo_minutos: 'PLANIFICACION_SESION',
            session_id: item.planning_sessions?.id || '',
            nombre_tarea: item.nombre_tarea || undefined
          }))
          .filter(ev => Boolean(ev.library_task_id && ev.fecha && ev.fecha >= FECHA_INICIO_TRAZABILIDAD_OPERATIVA));

        setHistoricalEvents(parsedHistoricalEvents);
        setReuseEvents(parsedReuseEvents);
      } catch (err: unknown) {
        console.error('Error al cargar datos de analítica de biblioteca:', err);
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al cargar analítica de biblioteca');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Today reference (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  // Calculate cutoff date based on selected period
  const cutoffDateStr = useMemo(() => {
    const now = new Date();
    if (periodo === 'semana') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    }
    if (periodo === '15d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 15);
      return d.toISOString().slice(0, 10);
    }
    if (periodo === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    }
    // Temporada: desde el 01/07/2026 en adelante
    return '2026-07-01';
  }, [periodo]);

  // Unificación de todos los eventos
  const allEvents = useMemo(() => {
    return [...historicalEvents, ...reuseEvents];
  }, [historicalEvents, reuseEvents]);

  // Eventos filtrados por fuente activa y por periodo
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (fuenteAnalisis === 'historico' && ev.source !== 'historical') return false;
      if (fuenteAnalisis === 'reutilizacion' && ev.source !== 'reuse') return false;
      // Regla estricta: reuse solo es computable a partir de trazabilidad fiable (>= 2026-10-07)
      if (ev.source === 'reuse' && ev.fecha < FECHA_INICIO_TRAZABILIDAD_OPERATIVA) return false;
      return ev.fecha >= cutoffDateStr && ev.fecha <= todayStr;
    });
  }, [allEvents, fuenteAnalisis, cutoffDateStr, todayStr]);

  // Eventos acumulados hasta hoy según fuente activa (para semáforos y última sesión)
  const allTimeEventsForActiveSource = useMemo(() => {
    return allEvents.filter(ev => {
      if (fuenteAnalisis === 'historico' && ev.source !== 'historical') return false;
      if (fuenteAnalisis === 'reutilizacion' && ev.source !== 'reuse') return false;
      if (ev.source === 'reuse' && ev.fecha < FECHA_INICIO_TRAZABILIDAD_OPERATIVA) return false;
      return ev.fecha <= todayStr;
    });
  }, [allEvents, fuenteAnalisis, todayStr]);

  // Map of concepts per approved task: taskId -> string[]
  const taskConceptsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of libraryConcepts) {
      if (!map.has(c.library_id)) {
        map.set(c.library_id, []);
      }
      map.get(c.library_id)!.push(c.concepto.trim());
    }
    return map;
  }, [libraryConcepts]);

  // Approved tasks only
  const approvedTasks = useMemo(() => {
    return libraryTasks.filter(t => t.aprobada === true);
  }, [libraryTasks]);

  // Map of approved tasks per concept: concepto -> PlanningTaskLibrary[]
  const conceptApprovedTasksMap = useMemo(() => {
    const map = new Map<string, PlanningTaskLibrary[]>();
    const approvedMap = new Map(approvedTasks.map(t => [t.id, t]));

    for (const c of libraryConcepts) {
      const task = approvedMap.get(c.library_id);
      if (task) {
        const cleanName = c.concepto.trim();
        if (!map.has(cleanName)) {
          map.set(cleanName, []);
        }
        map.get(cleanName)!.push(task);
      }
    }
    return map;
  }, [approvedTasks, libraryConcepts]);

  // Index de eventos en el periodo por task id: taskId -> TaskEvent[]
  const taskPeriodEventsMap = useMemo(() => {
    const map = new Map<string, TaskEvent[]>();
    for (const ev of filteredEvents) {
      if (!map.has(ev.library_task_id)) {
        map.set(ev.library_task_id, []);
      }
      map.get(ev.library_task_id)!.push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Fecha máxima histórica de cada tarea (para semáforos)
  const taskAllTimeMaxDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of allTimeEventsForActiveSource) {
      const prev = map.get(ev.library_task_id);
      if (!prev || ev.fecha > prev) {
        map.set(ev.library_task_id, ev.fecha);
      }
    }
    return map;
  }, [allTimeEventsForActiveSource]);

  // ── KPIS SUPERIORES ──
  const kpis: LibraryAnalyticsKPIs = useMemo(() => {
    const approvedTaskIds = new Set(approvedTasks.map(t => t.id));
    const relevantEvents = filteredEvents.filter(e => approvedTaskIds.has(e.library_task_id));

    const usedTaskIds = new Set(relevantEvents.map(e => e.library_task_id));
    const distinctDates = new Set(relevantEvents.map(e => e.fecha));
    const totalMinutes = relevantEvents.reduce((sum, e) => sum + e.minutosValidados, 0);

    const histMinutes = relevantEvents
      .filter(e => e.source === 'historical')
      .reduce((sum, e) => sum + e.minutosValidados, 0);

    const reuseMinutes = relevantEvents
      .filter(e => e.source === 'reuse')
      .reduce((sum, e) => sum + e.minutosValidados, 0);

    const histDates = new Set(relevantEvents.filter(e => e.source === 'historical').map(e => e.fecha));
    const reuseDates = new Set(relevantEvents.filter(e => e.source === 'reuse').map(e => e.fecha));

    // Conceptos canónicos distintos estimulados
    const workedConcepts = new Set<string>();
    usedTaskIds.forEach(tId => {
      const concepts = taskConceptsMap.get(tId) || [];
      concepts.forEach(c => workedConcepts.add(c.trim()));
    });

    const totalAprobadas = approvedTasks.length || 51;
    const tareasUsadasCount = usedTaskIds.size;
    const explotacion = totalAprobadas > 0 ? (tareasUsadasCount / totalAprobadas) * 100 : 0;

    const allOfficialConcepts = TACTICAL_FAMILIES.flatMap(f => f.concepts);
    const totalConceptosOficiales = allOfficialConcepts.length; // 63
    const conceptosConTareasAprobadas = allOfficialConcepts.filter(c => (conceptApprovedTasksMap.get(c.trim())?.length || 0) > 0).length; // 61
    const conceptosSinTareasAprobadas = totalConceptosOficiales - conceptosConTareasAprobadas; // 2

    return {
      fuenteActiva: fuenteAnalisis,
      tareasAprobadasUtilizadas: tareasUsadasCount,
      totalTareasAprobadas: totalAprobadas,
      porcentajeExplotacion: Number(explotacion.toFixed(1)),
      minutosAcumulados: totalMinutes,
      minutosExactosHistoricos: histMinutes,
      minutosReutilizacion: reuseMinutes,
      diasDistintosEntrenamiento: distinctDates.size,
      diasHistoricos: histDates.size,
      diasReutilizacion: reuseDates.size,
      conceptosTrabajados: workedConcepts.size,
      totalConceptosOficiales,
      conceptosConTareasAprobadas,
      conceptosSinTareasAprobadas
    };
  }, [approvedTasks, filteredEvents, taskConceptsMap, conceptApprovedTasksMap, fuenteAnalisis]);

  // ── TABLA: POR CONCEPTO ──
  const conceptMetrics: ConceptMetricRow[] = useMemo(() => {
    const allCanonicalConcepts = TACTICAL_FAMILIES.flatMap(f => f.concepts);

    return allCanonicalConcepts.map(concepto => {
      const cleanConcepto = concepto.trim();
      const famObj = getFamilyForConcept(cleanConcepto);
      const familiaId = famObj?.id || 'ofensivo';
      const familiaLabel = famObj?.label || 'General';
      const badgeColor = famObj?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700';

      const sampleConcept = libraryConcepts.find(c => c.concepto.trim() === cleanConcepto);
      const categoriaDb = sampleConcept?.categoria || famObj?.category || 'GENERAL';

      const tasksForConcept = conceptApprovedTasksMap.get(cleanConcepto) || [];
      const tareasAprobadasDisponibles = tasksForConcept.length;

      let usosTotales = 0;
      let minutos = 0;
      const fechasDistintas = new Set<string>();
      let tareasUsadasCount = 0;
      let hasHistorical = false;
      let hasReuse = false;
      let ultimaFechaConcepto: string | null = null;

      for (const t of tasksForConcept) {
        const events = taskPeriodEventsMap.get(t.id) || [];
        if (events.length > 0) {
          tareasUsadasCount += 1;
          usosTotales += events.length;
          events.forEach(ev => {
            minutos += ev.minutosValidados;
            fechasDistintas.add(ev.fecha);
            if (ev.source === 'historical') hasHistorical = true;
            if (ev.source === 'reuse') hasReuse = true;
          });
        }

        const histDate = taskAllTimeMaxDate.get(t.id);
        if (histDate) {
          if (!ultimaFechaConcepto || histDate > ultimaFechaConcepto) {
            ultimaFechaConcepto = histDate;
          }
        }
      }

      let origenPresencia: OrigenPresencia = 'ninguno';
      if (hasHistorical && hasReuse) origenPresencia = 'ambos';
      else if (hasHistorical) origenPresencia = 'historico';
      else if (hasReuse) origenPresencia = 'reutilizacion';

      // Cálculo de días sin estímulo
      let diasSinEstimulo: number | null = null;
      if (ultimaFechaConcepto) {
        const d1 = new Date(ultimaFechaConcepto);
        const d2 = new Date(todayStr);
        const diffMs = d2.getTime() - d1.getTime();
        diasSinEstimulo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Diagnóstico contextualizado
      let diagnostico: ConceptMetricRow['diagnostico'];
      if (tareasAprobadasDisponibles === 0) {
        diagnostico = 'Sin tareas en Biblioteca';
      } else if (tareasAprobadasDisponibles === 1) {
        diagnostico = 'Biblioteca escasa';
      } else if (tareasAprobadasDisponibles > 1 && usosTotales === 0) {
        diagnostico = 'Tenemos tareas, no lo entrenamos';
      } else if (origenPresencia === 'ambos') {
        diagnostico = 'Histórico y reutilizado';
      } else if (origenPresencia === 'reutilizacion') {
        diagnostico = 'Trabajado recientemente';
      } else {
        diagnostico = 'Documentado en histórico';
      }

      return {
        concepto,
        familiaId,
        familiaLabel,
        badgeColor,
        categoriaDb,
        diasDistintos: fechasDistintas.size,
        tareasUsadas: tareasUsadasCount,
        usosTotales,
        minutos,
        ultimaVez: ultimaFechaConcepto,
        diasSinEstimulo,
        tareasAprobadasDisponibles,
        origenPresencia,
        diagnostico
      };
    });
  }, [conceptApprovedTasksMap, taskPeriodEventsMap, taskAllTimeMaxDate, todayStr, libraryConcepts]);

  // ── TABLA: POR TAREA ──
  const taskMetrics: TaskMetricRow[] = useMemo(() => {
    // Usos de cada tarea en el periodo para alternativas
    const allTaskUsagesMap = new Map<string, number>();
    approvedTasks.forEach(t => {
      const evs = taskPeriodEventsMap.get(t.id) || [];
      allTaskUsagesMap.set(t.id, evs.length);
    });

    return approvedTasks.map(task => {
      const events = taskPeriodEventsMap.get(task.id) || [];
      const conceptos = taskConceptsMap.get(task.id) || [];
      const ultimaSesion = taskAllTimeMaxDate.get(task.id) || null;

      let diasSinEstimulo: number | null = null;
      if (ultimaSesion) {
        const d1 = new Date(ultimaSesion);
        const d2 = new Date(todayStr);
        const diffMs = d2.getTime() - d1.getTime();
        diasSinEstimulo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const usosTotales = events.length;
      const usosHistoricos = events.filter(e => e.source === 'historical').length;
      const usosReutilizacion = events.filter(e => e.source === 'reuse').length;

      let origenPresencia: OrigenPresencia = 'ninguno';
      if (usosHistoricos > 0 && usosReutilizacion > 0) origenPresencia = 'ambos';
      else if (usosHistoricos > 0) origenPresencia = 'historico';
      else if (usosReutilizacion > 0) origenPresencia = 'reutilizacion';

      const taskDates = new Set(events.map(e => e.fecha));
      const totalMinutes = events.reduce((sum, e) => sum + e.minutosValidados, 0);
      const histMin = events.filter(e => e.source === 'historical').reduce((sum, e) => sum + e.minutosValidados, 0);
      const reuseMin = events.filter(e => e.source === 'reuse').reduce((sum, e) => sum + e.minutosValidados, 0);

      let minutosDetalle = '—';
      if (totalMinutes > 0) {
        if (usosHistoricos > 0 && usosReutilizacion > 0) {
          minutosDetalle = `${totalMinutes}′ (${histMin}′ hist + ${reuseMin}′ reut)`;
        } else if (usosHistoricos > 0) {
          minutosDetalle = `${histMin}′ (PDF exacto)`;
        } else {
          minutosDetalle = `${reuseMin}′ (reutilización)`;
        }
      } else if (usosTotales > 0) {
        const hasRango = events.some(e => e.metodo_minutos === 'RANGO_PDF');
        minutosDetalle = hasRango ? 'Rango en PDF' : 'Sin minutaje en ficha';
      }

      // Encontrar alternativas aprobadas
      const alternativasAprobadas: Array<{ id: string; nombre: string; usos: number }> = [];
      if (conceptos.length > 0) {
        const conceptSet = new Set(conceptos);
        approvedTasks.forEach(other => {
          if (other.id === task.id) return;
          const otherConcepts = taskConceptsMap.get(other.id) || [];
          const sharesConcept = otherConcepts.some(c => conceptSet.has(c));
          if (sharesConcept) {
            const otherUsos = allTaskUsagesMap.get(other.id) || 0;
            if (otherUsos <= usosTotales) {
              alternativasAprobadas.push({ id: other.id, nombre: other.nombre, usos: otherUsos });
            }
          }
        });
      } else {
        approvedTasks.forEach(other => {
          if (other.id === task.id) return;
          if (other.tipo_tarea === task.tipo_tarea) {
            const otherUsos = allTaskUsagesMap.get(other.id) || 0;
            if (otherUsos <= usosTotales) {
              alternativasAprobadas.push({ id: other.id, nombre: other.nombre, usos: otherUsos });
            }
          }
        });
      }

      alternativasAprobadas.sort((a, b) => a.usos - b.usos);

      return {
        id: task.id,
        nombre: task.nombre,
        tipo_tarea: task.tipo_tarea,
        conceptos,
        usosTotales,
        usosHistoricos,
        usosReutilizacion,
        origenPresencia,
        diasDistintos: taskDates.size,
        minutos: totalMinutes,
        minutosDetalle,
        ultimaSesion,
        diasSinEstimulo,
        alternativasAprobadas: alternativasAprobadas.slice(0, 3)
      };
    });
  }, [approvedTasks, taskPeriodEventsMap, taskConceptsMap, taskAllTimeMaxDate, todayStr]);

  // Filtrado final por desplegables y término de búsqueda
  const filteredConceptMetrics = useMemo(() => {
    return conceptMetrics.filter(row => {
      if (selectedFamily !== 'todas' && row.familiaId !== selectedFamily) {
        return false;
      }
      if (selectedConcept !== 'todos' && row.concepto !== selectedConcept) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchConcept = row.concepto.toLowerCase().includes(q);
        const matchFamily = row.familiaLabel.toLowerCase().includes(q);
        if (!matchConcept && !matchFamily) return false;
      }
      return true;
    });
  }, [conceptMetrics, selectedFamily, selectedConcept, searchTerm]);

  const filteredTaskMetrics = useMemo(() => {
    return taskMetrics.filter(row => {
      if (selectedFamily !== 'todas') {
        const hasFamilyConcept = row.conceptos.some(c => {
          const f = getFamilyForConcept(c);
          return f?.id === selectedFamily;
        });
        if (!hasFamilyConcept) return false;
      }
      if (selectedConcept !== 'todos' && !row.conceptos.includes(selectedConcept)) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = row.nombre.toLowerCase().includes(q);
        const matchType = row.tipo_tarea.toLowerCase().includes(q);
        const matchConcept = row.conceptos.some(c => c.toLowerCase().includes(q));
        if (!matchName && !matchType && !matchConcept) return false;
      }
      return true;
    });
  }, [taskMetrics, selectedFamily, selectedConcept, searchTerm]);

  return {
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
    conceptMetrics: filteredConceptMetrics,
    taskMetrics: filteredTaskMetrics,
    totalConceptsAvailable: conceptMetrics.length,
    totalTasksAvailable: taskMetrics.length
  };
}
