import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PlanningTaskLibrary, PlanningTaskLibraryConcept } from '@/types';
import {
  TACTICAL_FAMILIES,
  getFamilyForConcept
} from '@/lib/planificacion/tacticalDictionary';

export const FECHA_INICIO_TRAZABILIDAD = '2026-10-07';

export type PeriodoAnalisis = 'semana' | '15d' | '30d' | 'temporada';

export interface LinkedTaskUsage {
  id: string;
  library_task_id: string;
  minutos: number;
  fecha: string;
  session_id: string;
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
  diagnostico: 'Sin tareas en Biblioteca' | 'Biblioteca escasa' | 'Tenemos tareas, no lo entrenamos' | 'Trabajado recientemente';
}

export interface TaskMetricRow {
  id: string;
  nombre: string;
  tipo_tarea: string;
  conceptos: string[];
  usos: number;
  diasDistintos: number;
  minutos: number;
  ultimaSesion: string | null;
  diasSinEstimulo: number | null;
  alternativasAprobadas: Array<{
    id: string;
    nombre: string;
    usos: number;
  }>;
}

export interface LibraryAnalyticsKPIs {
  tareasAprobadasUtilizadas: number;
  totalTareasAprobadas: number;
  porcentajeExplotacion: number;
  minutosAcumulados: number;
  diasDistintosEntrenamiento: number;
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
  const [usages, setUsages] = useState<LinkedTaskUsage[]>([]);

  // Filter states
  const [periodo, setPeriodo] = useState<PeriodoAnalisis>('temporada');
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

        // 1. Fetch library tasks
        const { data: tasksData, error: tasksErr } = await supabase
          .from('planning_task_library')
          .select('id, nombre, tipo_tarea, minutos_defecto, jugadores_defecto, espacio_defecto, objetivo, descripcion, observaciones, creado_por, created_at, sesion_origen_id, numero_tarea_pdf, aprobada')
          .order('created_at', { ascending: true });

        if (tasksErr) throw tasksErr;

        // 2. Fetch library concepts (168 tuples)
        // Usamos la API route de servidor para garantizar acceso seguro evitando el bloqueo RLS de cliente anon
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

        // Fallback directo a supabase si la API route no estuviera disponible
        if (fetchedConcepts.length === 0) {
          const { data: directConceptsData } = await supabase
            .from('planning_task_library_concepts')
            .select('id, library_id, categoria, concepto, aprobado_por, aprobado_at, created_at');
          if (directConceptsData && directConceptsData.length > 0) {
            fetchedConcepts = directConceptsData as PlanningTaskLibraryConcept[];
          }
        }

        // 3. Fetch linked usages from planning_tasks joined with planning_sessions
        const { data: usagesData, error: usagesErr } = await supabase
          .from('planning_tasks')
          .select('id, library_task_id, minutos, planning_sessions!inner(id, fecha)')
          .not('library_task_id', 'is', null);

        if (usagesErr) throw usagesErr;

        if (!isMounted) return;

        setLibraryTasks((tasksData as unknown as PlanningTaskLibrary[]) || []);
        setLibraryConcepts(fetchedConcepts);

        // Flatten usages
        interface RawUsageItem {
          id: string;
          library_task_id: string;
          minutos: number | string | null;
          planning_sessions?: { id?: string; fecha?: string } | null;
        }

        const flattenedUsages: LinkedTaskUsage[] = ((usagesData as unknown as RawUsageItem[]) || [])
          .map((item) => ({
            id: item.id,
            library_task_id: item.library_task_id,
            minutos: Number(item.minutos) || 0,
            fecha: item.planning_sessions?.fecha || '',
            session_id: item.planning_sessions?.id || ''
          }))
          .filter((u: LinkedTaskUsage) => Boolean(u.library_task_id && u.fecha));

        setUsages(flattenedUsages);
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

  // Filtered usages in selected period and with session date >= FECHA_INICIO_TRAZABILIDAD and <= today
  const filteredUsages = useMemo(() => {
    const effectiveMinDate = cutoffDateStr < FECHA_INICIO_TRAZABILIDAD ? FECHA_INICIO_TRAZABILIDAD : cutoffDateStr;
    return usages.filter(u => u.fecha >= effectiveMinDate && u.fecha <= todayStr);
  }, [usages, cutoffDateStr, todayStr]);

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

  // Map of approved tasks per concept: concepto -> PlanningTaskLibrary[]
  const conceptApprovedTasksMap = useMemo(() => {
    const map = new Map<string, PlanningTaskLibrary[]>();
    const approvedTasks = libraryTasks.filter(t => t.aprobada === true);
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
  }, [libraryTasks, libraryConcepts]);

  // Approved tasks only
  const approvedTasks = useMemo(() => {
    return libraryTasks.filter(t => t.aprobada === true);
  }, [libraryTasks]);

  // ── KPIs SUPERIORES ──
  const kpis: LibraryAnalyticsKPIs = useMemo(() => {
    const approvedTaskIds = new Set(approvedTasks.map(t => t.id));

    // Usages that correspond to approved tasks within the period
    const relevantUsages = filteredUsages.filter(u => approvedTaskIds.has(u.library_task_id));

    const usedTaskIds = new Set(relevantUsages.map(u => u.library_task_id));
    const distinctDates = new Set(relevantUsages.map(u => u.fecha));
    const totalMinutes = relevantUsages.reduce((sum, u) => sum + u.minutos, 0);

    // Distinct canonical concepts worked via used approved tasks
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
      tareasAprobadasUtilizadas: tareasUsadasCount,
      totalTareasAprobadas: totalAprobadas,
      porcentajeExplotacion: Number(explotacion.toFixed(1)),
      minutosAcumulados: totalMinutes,
      diasDistintosEntrenamiento: distinctDates.size,
      conceptosTrabajados: workedConcepts.size,
      totalConceptosOficiales,
      conceptosConTareasAprobadas,
      conceptosSinTareasAprobadas
    };
  }, [approvedTasks, filteredUsages, taskConceptsMap, conceptApprovedTasksMap]);

  // ── TABLA: POR CONCEPTO ──
  const conceptMetrics: ConceptMetricRow[] = useMemo(() => {
    // Universo completo de 63 conceptos canónicos oficiales del Diccionario V2
    const allCanonicalConcepts = TACTICAL_FAMILIES.flatMap(f => f.concepts);

    // Usage index per library task: taskId -> { usages: number, dates: Set<string>, minutes: number, maxDate: string }
    const taskUsageStats = new Map<string, { usages: number; dates: Set<string>; minutes: number; maxDate: string }>();
    for (const u of filteredUsages) {
      if (!taskUsageStats.has(u.library_task_id)) {
        taskUsageStats.set(u.library_task_id, { usages: 0, dates: new Set(), minutes: 0, maxDate: '' });
      }
      const st = taskUsageStats.get(u.library_task_id)!;
      st.usages += 1;
      st.dates.add(u.fecha);
      st.minutes += u.minutos;
      if (!st.maxDate || u.fecha > st.maxDate) {
        st.maxDate = u.fecha;
      }
    }

    // Historical max date per task (for diasSinEstimulo, respetando >= FECHA_INICIO_TRAZABILIDAD)
    const taskAllTimeMaxDate = new Map<string, string>();
    for (const u of usages) {
      if (u.fecha >= FECHA_INICIO_TRAZABILIDAD && u.fecha <= todayStr) {
        const prev = taskAllTimeMaxDate.get(u.library_task_id);
        if (!prev || u.fecha > prev) {
          taskAllTimeMaxDate.set(u.library_task_id, u.fecha);
        }
      }
    }

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
      let ultimaFechaConcepto: string | null = null;

      for (const t of tasksForConcept) {
        const st = taskUsageStats.get(t.id);
        if (st && st.usages > 0) {
          tareasUsadasCount += 1;
          usosTotales += st.usages;
          minutos += st.minutes;
          st.dates.forEach(d => fechasDistintas.add(d));
        }

        const histDate = taskAllTimeMaxDate.get(t.id);
        if (histDate) {
          if (!ultimaFechaConcepto || histDate > ultimaFechaConcepto) {
            ultimaFechaConcepto = histDate;
          }
        }
      }

      // Calculate days without stimulus
      let diasSinEstimulo: number | null = null;
      if (ultimaFechaConcepto) {
        const d1 = new Date(ultimaFechaConcepto);
        const d2 = new Date(todayStr);
        const diffMs = d2.getTime() - d1.getTime();
        diasSinEstimulo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Diagnóstico según reglas acordadas
      let diagnostico: ConceptMetricRow['diagnostico'];
      if (tareasAprobadasDisponibles === 0) {
        diagnostico = 'Sin tareas en Biblioteca';
      } else if (tareasAprobadasDisponibles === 1) {
        diagnostico = 'Biblioteca escasa';
      } else if (tareasAprobadasDisponibles > 1 && usosTotales === 0) {
        diagnostico = 'Tenemos tareas, no lo entrenamos';
      } else {
        diagnostico = 'Trabajado recientemente';
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
        diagnostico
      };
    });
  }, [conceptApprovedTasksMap, filteredUsages, usages, todayStr, libraryConcepts]);

  // ── TABLA: POR TAREA ──
  const taskMetrics: TaskMetricRow[] = useMemo(() => {
    // Stats in current period
    const taskPeriodStats = new Map<string, { usos: number; dates: Set<string>; minutes: number }>();
    for (const u of filteredUsages) {
      if (!taskPeriodStats.has(u.library_task_id)) {
        taskPeriodStats.set(u.library_task_id, { usos: 0, dates: new Set(), minutes: 0 });
      }
      const st = taskPeriodStats.get(u.library_task_id)!;
      st.usos += 1;
      st.dates.add(u.fecha);
      st.minutes += u.minutos;
    }

    // Historical max date (respetando >= FECHA_INICIO_TRAZABILIDAD)
    const taskAllTimeMax = new Map<string, string>();
    for (const u of usages) {
      if (u.fecha >= FECHA_INICIO_TRAZABILIDAD && u.fecha <= todayStr) {
        const prev = taskAllTimeMax.get(u.library_task_id);
        if (!prev || u.fecha > prev) {
          taskAllTimeMax.set(u.library_task_id, u.fecha);
        }
      }
    }

    // Pre-calculate usages for each task for alternatives comparison
    const allTaskUsagesMap = new Map<string, number>();
    approvedTasks.forEach(t => {
      const st = taskPeriodStats.get(t.id);
      allTaskUsagesMap.set(t.id, st?.usos || 0);
    });

    return approvedTasks.map(task => {
      const st = taskPeriodStats.get(task.id);
      const conceptos = taskConceptsMap.get(task.id) || [];
      const ultimaSesion = taskAllTimeMax.get(task.id) || null;

      let diasSinEstimulo: number | null = null;
      if (ultimaSesion) {
        const d1 = new Date(ultimaSesion);
        const d2 = new Date(todayStr);
        const diffMs = d2.getTime() - d1.getTime();
        diasSinEstimulo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const taskUsos = st?.usos || 0;

      // Find approved alternatives
      // If task has concepts: other approved tasks sharing at least 1 concept with <= uses
      // If task has NO concepts (e.g. 2026-09-03_T2): other approved tasks sharing tipo_tarea with <= uses
      const alternativasAprobadas: Array<{ id: string; nombre: string; usos: number }> = [];

      if (conceptos.length > 0) {
        const conceptSet = new Set(conceptos);
        approvedTasks.forEach(other => {
          if (other.id === task.id) return;
          const otherConcepts = taskConceptsMap.get(other.id) || [];
          const sharesConcept = otherConcepts.some(c => conceptSet.has(c));
          if (sharesConcept) {
            const otherUsos = allTaskUsagesMap.get(other.id) || 0;
            if (otherUsos <= taskUsos) {
              alternativasAprobadas.push({ id: other.id, nombre: other.nombre, usos: otherUsos });
            }
          }
        });
      } else {
        // Fallback for 2026-09-03_T2
        approvedTasks.forEach(other => {
          if (other.id === task.id) return;
          if (other.tipo_tarea === task.tipo_tarea) {
            const otherUsos = allTaskUsagesMap.get(other.id) || 0;
            if (otherUsos <= taskUsos) {
              alternativasAprobadas.push({ id: other.id, nombre: other.nombre, usos: otherUsos });
            }
          }
        });
      }

      // Sort alternatives by least used first
      alternativasAprobadas.sort((a, b) => a.usos - b.usos);

      return {
        id: task.id,
        nombre: task.nombre,
        tipo_tarea: task.tipo_tarea,
        conceptos,
        usos: taskUsos,
        diasDistintos: st?.dates.size || 0,
        minutos: st?.minutes || 0,
        ultimaSesion,
        diasSinEstimulo,
        alternativasAprobadas: alternativasAprobadas.slice(0, 3)
      };
    });
  }, [approvedTasks, filteredUsages, usages, taskConceptsMap, todayStr]);

  // Filtered views according to dropdowns & search
  const filteredConceptMetrics = useMemo(() => {
    return conceptMetrics.filter(row => {
      // Family filter
      if (selectedFamily !== 'todas' && row.familiaId !== selectedFamily) {
        return false;
      }
      // Concept filter
      if (selectedConcept !== 'todos' && row.concepto !== selectedConcept) {
        return false;
      }
      // Text search
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
      // Family filter (task must have at least one concept in this family)
      if (selectedFamily !== 'todas') {
        const hasFamilyConcept = row.conceptos.some(c => {
          const f = getFamilyForConcept(c);
          return f?.id === selectedFamily;
        });
        if (!hasFamilyConcept) return false;
      }
      // Concept filter
      if (selectedConcept !== 'todos' && !row.conceptos.includes(selectedConcept)) {
        return false;
      }
      // Text search
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
