'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, BookOpen, Clock, Users, Maximize, Target, Check, X,
  CheckCircle2, ArrowRight, Shuffle, FileText,
  AlertCircle, RotateCcw, Eye, Calendar,
  SlidersHorizontal, ChevronDown, Layers, HelpCircle,
  Edit3, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PlanningTaskLibrary } from '@/types';
import { Button } from '@/components/ui/Button';
import { getStaffPasskey } from '@/lib/passkey';
import { useEditMode } from '@/context/EditModeContext';
import {
  TACTICAL_FAMILIES,
  getFamilyById,
  getConceptsForFamily,
  resolveTaskTacticalProfile
} from '@/lib/planificacion/tacticalDictionary';

interface BibliotecaTareasViewProps {
  isEmbedded?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onSelectTask?: (task: PlanningTaskLibrary) => void;
}

const TIPOS_TAREA_PRESET = [
  'Posesión',
  'Táctica',
  'Juego Aéreo',
  'Finalización',
  'Partido condicionado',
  'Rondo',
  'Calentamiento',
  'ABP',
  'Técnica',
  'Físico',
  'Fuerza',
  'Velocidad',
  'Recuperación'
];

/**
 * Resuelve la URL pública y el nombre visible del PDF de origen de una tarea.
 * - Si fuente_pdf_url es http:// o https://, la usa directamente.
 * - Si contiene solo el nombre del archivo, obtiene la URL pública desde la sesión vinculada.
 * - Si pagina_pdf existe (> 0), añade el fragmento #page={pagina_pdf} para abrir directamente en esa página.
 * - Mantiene como texto visible el nombre original del PDF.
 * - Si no existe URL válida, devuelve url = null para mostrar como texto sin enlace (evita 404).
 */
function resolveTaskPdfSource(
  task: PlanningTaskLibrary | null,
  allTasks: PlanningTaskLibrary[]
): { url: string | null; displayName: string } {
  if (!task) return { url: null, displayName: '' };
  const rawUrl = task.fuente_pdf_url?.trim() || '';
  if (!rawUrl) return { url: null, displayName: '' };

  const withPageFragment = (url: string | null): string | null => {
    if (!url) return null;
    const pageNum = task.pagina_pdf ? Number(task.pagina_pdf) : null;
    if (pageNum && pageNum > 0 && !url.includes('#')) {
      return `${url}#page=${pageNum}`;
    }
    return url;
  };

  // 1. Si ya es una URL absoluta HTTP o HTTPS, usar directamente
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    const filename = rawUrl.split('/').pop()?.split('#')[0] || 'Documento PDF';
    return { url: withPageFragment(rawUrl), displayName: filename };
  }

  // 2. Si contiene solo el nombre del archivo (ej. "2026-08-03 - Original Aitor.pdf")
  const displayName = rawUrl;
  let resolvedUrl: string | null = null;

  // Buscar en joined planning_sessions del propio objeto
  const joinedSession = (task as unknown as {
    planning_sessions?: { evaluacion_observaciones?: string | null };
  })?.planning_sessions;

  let obs = joinedSession?.evaluacion_observaciones || null;

  // Fallback: si no viniera joined en este objeto, buscar en allTasks por sesion_origen_id
  if (!obs && task.sesion_origen_id) {
    const match = allTasks.find(
      t => t.sesion_origen_id === task.sesion_origen_id &&
        (t as unknown as { planning_sessions?: { evaluacion_observaciones?: string | null } })?.planning_sessions?.evaluacion_observaciones
    );
    if (match) {
      obs = (match as unknown as { planning_sessions?: { evaluacion_observaciones?: string | null } })?.planning_sessions?.evaluacion_observaciones || null;
    }
  }

  if (obs && obs.includes('PDF:')) {
    const match = obs.match(/PDF:\s*(\S+)/);
    if (match && match[1] && (match[1].startsWith('http://') || match[1].startsWith('https://'))) {
      resolvedUrl = match[1].trim();
    }
  }

  return {
    url: withPageFragment(resolvedUrl),
    displayName
  };
}

export function BibliotecaTareasView({
  isEmbedded = false,
  isModal = false,
  onClose,
  onSelectTask
}: BibliotecaTareasViewProps) {
  const { currentUser } = useEditMode();

  // Tasks states
  const [tasks, setTasks] = useState<PlanningTaskLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Guided filters
  const [selectedFamily, setSelectedFamily] = useState<string>('todas');
  const [selectedConcept, setSelectedConcept] = useState<string>('todos');

  // Optional filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedPlayers, setSelectedPlayers] = useState<string>('todos');
  const [selectedSpace, setSelectedSpace] = useState<string>('todos');
  const [selectedDuration, setSelectedDuration] = useState<string>('todos');
  const [selectedDate, setSelectedDate] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'borradores' | 'aprobadas'>('todos');
  const [showOptionalFilters, setShowOptionalFilters] = useState(false);

  // Detail view state (Ficha)
  const [selectedTask, setSelectedTask] = useState<PlanningTaskLibrary | null>(null);

  // Editing state for Ficha
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    nombre: string;
    tipo_tarea: string;
    duracion_texto_pdf: string;
    minutos_defecto: number | null;
    jugadores_texto_pdf: string;
    jugadores_defecto: number | null;
    espacio_defecto: string;
    objetivo: string;
    organizacion: string;
    desarrollo: string;
    consignas_text: string;
    transicion_rec: string;
    transicion_perd: string;
  }>({
    nombre: '',
    tipo_tarea: '',
    duracion_texto_pdf: '',
    minutos_defecto: null,
    jugadores_texto_pdf: '',
    jugadores_defecto: null,
    espacio_defecto: '',
    objetivo: '',
    organizacion: '',
    desarrollo: '',
    consignas_text: '',
    transicion_rec: '',
    transicion_perd: ''
  });
  const [savingTask, setSavingTask] = useState(false);

  // Staff approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all tasks from planning_task_library with session date join
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('planning_task_library')
        .select('*, planning_sessions(fecha, evaluacion_observaciones)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);

      setSelectedTask(prev => (prev ? (data || []).find(t => t.id === prev.id) || null : null));
    } catch (err: unknown) {
      console.error('Error fetching library tasks:', err);
      setErrorMsg('No se pudieron cargar las tareas de la biblioteca.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Map each task to its tactical profile for fast filtering and display
  const tasksWithProfile = useMemo(() => {
    return tasks.map(t => {
      const fecha = (t as unknown as { planning_sessions?: { fecha: string } })?.planning_sessions?.fecha || null;
      const profile = resolveTaskTacticalProfile(t, fecha);
      return {
        task: t,
        fecha,
        profile
      };
    });
  }, [tasks]);

  // Dynamic task counts per family and per concept based on real tasks in library
  const { familyCounts, conceptCounts } = useMemo(() => {
    const famCounts: Record<string, number> = {};
    const conCounts: Record<string, number> = {};

    TACTICAL_FAMILIES.forEach(f => {
      famCounts[f.id] = 0;
      f.concepts.forEach(c => {
        conCounts[c] = 0;
      });
    });

    tasksWithProfile.forEach(({ profile }) => {
      // Unique families in this task
      const seenFamilies = new Set<string>();
      profile.familias.forEach(f => {
        if (!seenFamilies.has(f.id)) {
          seenFamilies.add(f.id);
          famCounts[f.id] = (famCounts[f.id] || 0) + 1;
        }
      });

      // Canonical concepts in this task
      profile.conceptos_canonicos.forEach(c => {
        conCounts[c] = (conCounts[c] || 0) + 1;
      });
    });

    return { familyCounts: famCounts, conceptCounts: conCounts };
  }, [tasksWithProfile]);

  // Concepts available for the chosen family
  const availableConcepts = useMemo(() => {
    if (selectedFamily === 'todas') {
      return TACTICAL_FAMILIES.flatMap(f => f.concepts);
    }
    return getConceptsForFamily(selectedFamily);
  }, [selectedFamily]);

  // When family changes, reset concept if not inside this family
  const handleFamilyChange = (famId: string) => {
    setSelectedFamily(famId);
    if (famId === 'todas') {
      setSelectedConcept('todos');
    } else {
      const famConcepts = getConceptsForFamily(famId);
      if (selectedConcept !== 'todos' && !famConcepts.includes(selectedConcept)) {
        setSelectedConcept('todos');
      }
    }
  };

  // Distinct values for optional filter selects
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const spaces = new Set<string>();
    const players = new Set<string>();
    const dates = new Set<string>();

    tasks.forEach(t => {
      if (t.tipo_tarea) types.add(t.tipo_tarea);
      if (t.espacio_defecto) spaces.add(t.espacio_defecto);
      if (t.jugadores_texto_pdf) players.add(t.jugadores_texto_pdf);
      else if (t.jugadores_defecto) players.add(`${t.jugadores_defecto} jug`);
      const fecha = (t as unknown as { planning_sessions?: { fecha: string } })?.planning_sessions?.fecha;
      if (fecha) dates.add(fecha);
    });

    return {
      types: Array.from(types).sort(),
      spaces: Array.from(spaces).sort(),
      players: Array.from(players).sort(),
      dates: Array.from(dates).sort()
    };
  }, [tasks]);

  // Apply all guided + optional filters
  const filteredTasks = useMemo(() => {
    return tasksWithProfile.filter(({ task, fecha, profile }) => {
      // 1. Desplegable 1: Familia
      if (selectedFamily !== 'todas') {
        const hasFamily = profile.familias.some(f => f.id === selectedFamily);
        if (!hasFamily) return false;
      }

      // 2. Desplegable 2: Concepto
      if (selectedConcept !== 'todos') {
        const hasConcept = profile.conceptos_canonicos.includes(selectedConcept);
        if (!hasConcept) return false;
      }

      // 3. Estado
      if (selectedStatus === 'borradores' && task.aprobada !== false) return false;
      if (selectedStatus === 'aprobadas' && task.aprobada !== true) return false;

      // 4. Tipo de tarea
      if (selectedType !== 'todos' && task.tipo_tarea !== selectedType) return false;

      // 5. Jugadores
      if (selectedPlayers !== 'todos') {
        const jugStr = task.jugadores_texto_pdf || (task.jugadores_defecto ? `${task.jugadores_defecto} jug` : '');
        if (jugStr !== selectedPlayers) return false;
      }

      // 6. Espacio
      if (selectedSpace !== 'todos' && task.espacio_defecto !== selectedSpace) return false;

      // 7. Duración
      if (selectedDuration !== 'todos') {
        const min = task.minutos_defecto;
        if (selectedDuration === 'corta' && (min === null || min > 10)) return false;
        if (selectedDuration === 'media' && (min === null || min <= 10 || min > 20)) return false;
        if (selectedDuration === 'larga' && (min === null || min <= 20)) return false;
      }

      // 8. Fecha / sesión
      if (selectedDate !== 'todos' && fecha !== selectedDate) return false;

      // 9. Búsqueda por texto libre
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inNombre = task.nombre.toLowerCase().includes(q);
        const inObj = task.objetivo ? task.objetivo.toLowerCase().includes(q) : false;
        const inDes = task.desarrollo ? task.desarrollo.toLowerCase().includes(q) : false;
        const inOrig = profile.conceptos_originales.some(c => c.toLowerCase().includes(q));
        const inCanon = profile.conceptos_canonicos.some(c => c.toLowerCase().includes(q));
        if (!inNombre && !inObj && !inDes && !inOrig && !inCanon) return false;
      }

      return true;
    });
  }, [
    tasksWithProfile,
    selectedFamily,
    selectedConcept,
    selectedStatus,
    selectedType,
    selectedPlayers,
    selectedSpace,
    selectedDuration,
    selectedDate,
    searchTerm
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedFamily('todas');
    setSelectedConcept('todos');
    setSearchTerm('');
    setSelectedType('todos');
    setSelectedPlayers('todos');
    setSelectedSpace('todos');
    setSelectedDuration('todos');
    setSelectedDate('todos');
    setSelectedStatus('todos');
  };

  const hasActiveFilters =
    selectedFamily !== 'todas' ||
    selectedConcept !== 'todos' ||
    searchTerm.trim() !== '' ||
    selectedType !== 'todos' ||
    selectedPlayers !== 'todos' ||
    selectedSpace !== 'todos' ||
    selectedDuration !== 'todos' ||
    selectedDate !== 'todos' ||
    selectedStatus !== 'todos';

  // Start editing a task
  const startEditing = (task: PlanningTaskLibrary) => {
    const rawConsignas = task.consignas as unknown;
    let consignasText = '';
    if (Array.isArray(rawConsignas)) {
      consignasText = (rawConsignas as unknown[])
        .map(c => String(c).trim())
        .filter(c => Boolean(c) && c !== 'No detectado')
        .join('\n');
    } else if (typeof rawConsignas === 'string' && rawConsignas.trim()) {
      consignasText = rawConsignas.trim();
    }

    setEditForm({
      nombre: task.nombre || '',
      tipo_tarea: task.tipo_tarea || 'Posesión',
      duracion_texto_pdf: task.duracion_texto_pdf || (task.minutos_defecto ? `${task.minutos_defecto} min` : ''),
      minutos_defecto: task.minutos_defecto,
      jugadores_texto_pdf: task.jugadores_texto_pdf || (task.jugadores_defecto ? `${task.jugadores_defecto} jug` : ''),
      jugadores_defecto: task.jugadores_defecto,
      espacio_defecto: task.espacio_defecto || '',
      objetivo: task.objetivo || '',
      organizacion: task.organizacion && task.organizacion !== 'No detectado' ? task.organizacion : '',
      desarrollo: task.desarrollo && task.desarrollo !== 'No detectado' ? task.desarrollo : '',
      consignas_text: consignasText,
      transicion_rec: task.transicion_rec || '',
      transicion_perd: task.transicion_perd || ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  // Save task changes (solo_guardar = true keeps draft; isApprove = true sets aprobada = true)
  const handleSaveTask = async (isApprove: boolean) => {
    if (!selectedTask) return;
    setSavingTask(true);
    setFeedbackMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const staffPasskey = getStaffPasskey();
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const staffName = currentUser?.name?.trim() ? currentUser.name.trim() : 'Cuerpo Técnico';

      // Parse consignas into array
      const parsedConsignas = editForm.consignas_text
        .split(/\r?\n/)
        .map(s => s.replace(/^[-•*–—\d+.)\s]+/, '').trim())
        .filter(Boolean);

      // Attempt to extract numeric minutes if provided
      let numMinutos = editForm.minutos_defecto;
      if (editForm.duracion_texto_pdf) {
        const m = editForm.duracion_texto_pdf.match(/(\d+)\s*(?:min|'|m)/i);
        if (m) numMinutos = parseInt(m[1], 10);
      }

      // Attempt to extract numeric players if provided
      let numJugadores = editForm.jugadores_defecto;
      if (editForm.jugadores_texto_pdf) {
        const m = editForm.jugadores_texto_pdf.match(/(\d+)\s*(?:jug|j)/i);
        if (m) numJugadores = parseInt(m[1], 10);
      }

      const bodyPayload = {
        id: selectedTask.id,
        nombre: editForm.nombre.trim(),
        tipo_tarea: editForm.tipo_tarea.trim(),
        duracion_texto_pdf: editForm.duracion_texto_pdf.trim() || null,
        minutos_defecto: numMinutos,
        jugadores_texto_pdf: editForm.jugadores_texto_pdf.trim() || null,
        jugadores_defecto: numJugadores,
        espacio_defecto: editForm.espacio_defecto.trim() || null,
        objetivo: editForm.objetivo.trim() || null,
        organizacion: editForm.organizacion.trim() || null,
        desarrollo: editForm.desarrollo.trim() || null,
        consignas: parsedConsignas.length > 0 ? parsedConsignas : null,
        transicion_rec: editForm.transicion_rec.trim() || null,
        transicion_perd: editForm.transicion_perd.trim() || null,
        solo_guardar: !isApprove,
        aprobar: isApprove,
        revisada_por: staffName
      };

      const response = await fetch('/api/planificacion/library', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(bodyPayload)
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok || !resJson?.ok) {
        throw new Error(resJson?.error || `Error ${response.status} al guardar la tarea`);
      }

      const updatedTask: PlanningTaskLibrary = resJson.task;

      setTasks(prev => prev.map(t => (t.id === selectedTask.id ? updatedTask : t)));
      setSelectedTask(updatedTask);
      setIsEditing(false);

      setFeedbackMsg({
        type: 'success',
        text: isApprove
          ? `✓ ¡Tarea "${updatedTask.nombre}" aprobada por ${staffName} e incorporada a la biblioteca activa!`
          : `✓ Tarea "${updatedTask.nombre}" guardada correctamente como Borrador Staff.`
      });
    } catch (err: unknown) {
      console.error(err);
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar la tarea.'
      });
    } finally {
      setSavingTask(false);
    }
  };

  // Handle staff approving a draft task directly
  const handleApproveDraft = async (task: PlanningTaskLibrary) => {
    if (!task) return;
    setApprovingId(task.id);
    setFeedbackMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const staffPasskey = getStaffPasskey();
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const staffName = currentUser?.name?.trim() ? currentUser.name.trim() : 'Cuerpo Técnico';

      const response = await fetch('/api/planificacion/library', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: task.id,
          aprobar: true,
          revisada_por: staffName
        })
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok || !resJson?.ok) {
        throw new Error(resJson?.error || `Error ${response.status} al aprobar la tarea`);
      }

      const approvedTask: PlanningTaskLibrary = resJson.task || {
        ...task,
        aprobada: true,
        revisada_por: staffName,
        revisada_at: new Date().toISOString()
      };

      setTasks(prev => prev.map(t => (t.id === task.id ? approvedTask : t)));
      if (selectedTask?.id === task.id) {
        setSelectedTask(approvedTask);
      }
      setFeedbackMsg({
        type: 'success',
        text: `✓ ¡Tarea "${task.nombre}" aprobada por ${staffName} e incorporada a la biblioteca activa!`
      });
    } catch (err: unknown) {
      console.error(err);
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al aprobar la tarea.'
      });
    } finally {
      setApprovingId(null);
    }
  };

  const activeFamilyObj = selectedFamily !== 'todas' ? getFamilyById(selectedFamily) : undefined;

  return (
    <div className={`flex flex-col h-full ${isEmbedded ? 'space-y-4' : ''}`}>
      {/* ── CABECERA Y RESUMEN ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#CC0E21]/15 border border-[#CC0E21]/30 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-[#CC0E21]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-slate-100 tracking-tight">
                  Biblioteca de Entrenamientos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  Diccionario v2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Búsqueda guiada taxonómica por familias, conceptos canónicos y filtros tácticos.
              </p>
            </div>
          </div>

          {/* Métricas discretas y botón cerrar modal si aplica */}
          <div className="flex items-center gap-2 text-xs">
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            )}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-bold">Total Tareas:</span>
              <span className="text-white font-black">{tasks.length}</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-amber-400 text-[11px] font-bold">Borradores Staff:</span>
              <span className="text-amber-300 font-black">
                {tasks.filter(t => t.aprobada === false).length}
              </span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-emerald-400 text-[11px] font-bold">Aprobadas:</span>
              <span className="text-emerald-300 font-black">
                {tasks.filter(t => t.aprobada === true).length}
              </span>
            </div>
          </div>
        </div>

        {/* ── BANNER FEEDBACK ── */}
        {feedbackMsg && (
          <div
            className={`mt-3 px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-red-950/40 text-red-300 border-red-800/40'
            }`}
          >
            <span className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              {feedbackMsg.text}
            </span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── MOTOR DE BÚSQUEDA GUIADA: FAMILIA → CONCEPTO ── */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Desplegable 1: Familia (Contador real de tareas por familia) */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-[#CC0E21]" />
                1. Familia Táctica
              </label>
              <div className="relative">
                <select
                  value={selectedFamily}
                  onChange={e => handleFamilyChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#CC0E21] rounded-xl px-3 py-2 text-xs font-bold text-slate-100 transition-all cursor-pointer focus:outline-none pr-8"
                >
                  <option value="todas">Todas las Familias ({tasksWithProfile.length})</option>
                  {TACTICAL_FAMILIES.map(fam => {
                    const count = familyCounts[fam.id] || 0;
                    return (
                      <option key={fam.id} value={fam.id}>
                        {fam.label} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Desplegable 2: Concepto Canónico (Contador real de tareas por concepto) */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3 w-3 text-sky-400" />
                2. Concepto Canónico
                {activeFamilyObj && (
                  <span className="text-[9px] text-slate-500 normal-case font-medium">
                    (de {activeFamilyObj.label})
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={selectedConcept}
                  onChange={e => setSelectedConcept(e.target.value)}
                  className="w-full appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#CC0E21] rounded-xl px-3 py-2 text-xs font-bold text-slate-100 transition-all cursor-pointer focus:outline-none pr-8"
                >
                  <option value="todos">
                    {selectedFamily === 'todas'
                      ? `Todos los conceptos (${tasksWithProfile.length})`
                      : `Todos los conceptos de ${activeFamilyObj?.label} (${familyCounts[selectedFamily] || 0})`}
                  </option>
                  {availableConcepts.map(c => {
                    const count = conceptCounts[c] || 0;
                    return (
                      <option key={c} value={c}>
                        {c} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Búsqueda por texto libre */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-3 w-3 text-amber-400" />
                Búsqueda Rápida
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por texto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#CC0E21] placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* ── BOTONES DE TOGGLE FILTROS OPCIONALES Y RESTABLECER ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOptionalFilters(!showOptionalFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                  showOptionalFilters || hasActiveFilters
                    ? 'bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros opcionales
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-750 text-slate-400">
                  {showOptionalFilters ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 text-[11px] font-bold transition-all"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restablecer
                </button>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-400">
              Mostrando <span className="text-white font-extrabold">{filteredTasks.length}</span> de{' '}
              <span className="text-slate-300 font-extrabold">{tasks.length}</span> ejercicios
            </div>
          </div>

          {/* ── PANEL DESPLEGABLE DE FILTROS OPCIONALES ── */}
          {showOptionalFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 pb-1 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Filtro: Estado */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Estado
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as 'todos' | 'borradores' | 'aprobadas')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="borradores">Borradores Staff</option>
                  <option value="aprobadas">Aprobadas</option>
                </select>
              </div>

              {/* Filtro: Tipo de Tarea */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Tipo de Tarea
                </label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Todos los tipos</option>
                  {filterOptions.types.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Jugadores */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Jugadores
                </label>
                <select
                  value={selectedPlayers}
                  onChange={e => setSelectedPlayers(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Cualquier formato</option>
                  {filterOptions.players.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Espacio */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Espacio
                </label>
                <select
                  value={selectedSpace}
                  onChange={e => setSelectedSpace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Todos los espacios</option>
                  {filterOptions.spaces.map(s => (
                    <option key={s} value={s}>
                      {s.length > 25 ? s.slice(0, 25) + '...' : s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro: Duración */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Duración
                </label>
                <select
                  value={selectedDuration}
                  onChange={e => setSelectedDuration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Cualquier duración</option>
                  <option value="corta">Corta (≤ 10 min)</option>
                  <option value="media">Media (11-20 min)</option>
                  <option value="larga">Larga (&gt; 20 min)</option>
                </select>
              </div>

              {/* Filtro: Fecha / Sesión */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Sesión Origen
                </label>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#CC0E21]"
                >
                  <option value="todos">Todas las sesiones</option>
                  {filterOptions.dates.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL: RESULTADOS + FICHA ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-[500px]">
        {/* ── LISTA DE TAREAS (COLUMNA IZQUIERDA / PRINCIPAL) ── */}
        <div
          className={`flex-1 overflow-y-auto space-y-2.5 pr-1 ${
            selectedTask ? 'lg:w-7/12' : 'w-full'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-[#CC0E21] animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider">Cargando biblioteca táctica...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-8 text-center text-red-400 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/60 rounded-2xl space-y-2">
              <BookOpen className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                No se encontraron ejercicios con los filtros seleccionados.
              </p>
              <p className="text-xs text-slate-600">
                Prueba a seleccionar &quot;Todas las familias&quot; o pulsa en Restablecer filtros.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-855 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map(({ task, fecha, profile }) => {
              const isSelected = selectedTask?.id === task.id;
              const isDraft = task.aprobada === false;

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsEditing(false);
                  }}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-850/90 border-[#CC0E21]/60 shadow-lg shadow-black/40 ring-1 ring-[#CC0E21]/40'
                      : 'bg-slate-900/40 hover:bg-slate-850/50 border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  {/* Info izquierda */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs md:text-sm font-black text-slate-100 group-hover:text-white truncate">
                        {task.nombre}
                      </h3>
                      {isDraft ? (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Borrador Staff
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Aprobada
                        </span>
                      )}
                    </div>

                    {/* Metadatos de la tarea: tipo, fecha, jugadores, duración */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        {task.tipo_tarea}
                      </span>
                      {fecha && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {fecha}
                          {task.numero_tarea_pdf && (
                            <span className="text-slate-500">· Tarea {task.numero_tarea_pdf}</span>
                          )}
                        </span>
                      )}
                      {(task.jugadores_texto_pdf || task.jugadores_defecto) && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Users className="h-3 w-3 text-slate-500" />
                          {task.jugadores_texto_pdf || `${task.jugadores_defecto} jug`}
                        </span>
                      )}
                      {(task.duracion_texto_pdf || task.minutos_defecto) && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {task.duracion_texto_pdf || `${task.minutos_defecto} min`}
                        </span>
                      )}
                    </div>

                    {/* Badges de Conceptos Canónicos de la tarea */}
                    {profile.conceptos_canonicos.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {profile.conceptos_canonicos.slice(0, 4).map(c => {
                          const fam = getFamilyById(
                            profile.familias.find(f => f.concepts.includes(c))?.id || ''
                          );
                          return (
                            <span
                              key={c}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                fam?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {c}
                            </span>
                          );
                        })}
                        {profile.conceptos_canonicos.length > 4 && (
                          <span className="text-[9px] font-bold text-slate-500 px-1.5">
                            +{profile.conceptos_canonicos.length - 4} más
                          </span>
                        )}
                        {profile.pendiente_contexto.length > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            title={`Términos pendientes de contexto: ${profile.pendiente_contexto.join(', ')}`}
                          >
                            ⚠️ {profile.pendiente_contexto.length} pendiente(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones de la tarjeta */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        setIsEditing(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver ficha</span>
                    </button>

                    {/* Botón de importación si está en modo selector */}
                    {onSelectTask && (
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectTask(task);
                        }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 font-black"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Importar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── FICHA DETALLADA (COLUMNA DERECHA) ── */}
        {selectedTask ? (
          <div className="lg:w-5/12 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 overflow-y-auto space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header de la ficha */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="space-y-1 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <select
                        value={editForm.tipo_tarea}
                        onChange={e => setEditForm({ ...editForm, tipo_tarea: e.target.value })}
                        className="bg-slate-950 border border-slate-700 text-[#CC0E21] font-bold text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#CC0E21]"
                      >
                        {TIPOS_TAREA_PRESET.map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[9px] uppercase font-black tracking-wider text-[#CC0E21] bg-[#CC0E21]/10 border border-[#CC0E21]/20 px-2 py-0.5 rounded-md">
                        {selectedTask.tipo_tarea}
                      </span>
                    )}

                    {selectedTask.aprobada === false ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Borrador Staff
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Aprobada
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.nombre}
                      onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-[#CC0E21] rounded-xl px-3 py-1.5 text-sm font-black text-white focus:outline-none mt-1"
                      placeholder="Nombre de la tarea..."
                    />
                  ) : (
                    <h3 className="text-base font-black text-white leading-tight mt-1">
                      {selectedTask.nombre}
                    </h3>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                    <span>Creado por: {selectedTask.creado_por || 'Cuerpo Técnico'}</span>
                    {selectedTask.revisada_por && (
                      <span>· Aprobado por: {selectedTask.revisada_por}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    setIsEditing(false);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                  title="Cerrar ficha"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Grid de métricas clave: Duración, Jugadores, Espacio */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <Clock className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">
                    DURACIÓN
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.duracion_texto_pdf}
                      onChange={e => setEditForm({ ...editForm, duracion_texto_pdf: e.target.value })}
                      placeholder="ej. 15 min"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-[#CC0E21] mt-0.5"
                    />
                  ) : (
                    <span className="text-xs font-black text-slate-200 block truncate mt-0.5">
                      {selectedTask.duracion_texto_pdf ||
                        (selectedTask.minutos_defecto
                          ? `${selectedTask.minutos_defecto} min`
                          : 'No detectado')}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <Users className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">
                    JUGADORES
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.jugadores_texto_pdf}
                      onChange={e => setEditForm({ ...editForm, jugadores_texto_pdf: e.target.value })}
                      placeholder="ej. 11v11"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-[#CC0E21] mt-0.5"
                    />
                  ) : (
                    <span className="text-xs font-black text-slate-200 block truncate mt-0.5">
                      {selectedTask.jugadores_texto_pdf ||
                        (selectedTask.jugadores_defecto
                          ? `${selectedTask.jugadores_defecto} jug`
                          : 'No detectado')}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <Maximize className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">
                    ESPACIO
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.espacio_defecto}
                      onChange={e => setEditForm({ ...editForm, espacio_defecto: e.target.value })}
                      placeholder="ej. Medio campo"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-[#CC0E21] mt-0.5"
                    />
                  ) : (
                    <span className="text-xs font-black text-slate-200 block truncate mt-0.5">
                      {selectedTask.espacio_defecto || 'No detectado'}
                    </span>
                  )}
                </div>
              </div>

              {/* ── BLOQUE TÁCTICO: CONCEPTOS CANÓNICOS & ORIGINALES ── */}
              {(() => {
                const fecha =
                  (selectedTask as unknown as { planning_sessions?: { fecha: string } })
                    ?.planning_sessions?.fecha || null;
                const profile = resolveTaskTacticalProfile(selectedTask, fecha);

                return (
                  <div className="space-y-2.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-[#CC0E21]" />
                        Análisis Táctico (Diccionario v2)
                      </span>
                      {isEditing && (
                        <span className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Conceptos protegidos (auditoría en curso)
                        </span>
                      )}
                    </span>

                    {/* Conceptos canónicos validados */}
                    {profile.conceptos_canonicos.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          Conceptos Canónicos:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.conceptos_canonicos.map(c => {
                            const fam = getFamilyById(
                              profile.familias.find(f => f.concepts.includes(c))?.id || ''
                            );
                            return (
                              <div
                                key={c}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  fam?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                <span>{c}</span>
                                {fam && (
                                  <span className="text-[8px] opacity-75 font-medium">
                                    ({fam.label})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Términos originales del PDF (Inmutables) */}
                    {profile.conceptos_originales.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-850">
                        <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5 text-slate-600" /> Términos Originales Detectados:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {profile.conceptos_originales.map((o, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                            >
                              &quot;{o}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Términos PENDIENTE DE CONTEXTO */}
                    {profile.pendiente_contexto.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-850">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          Pendiente de Contexto / Revisión:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {profile.pendiente_contexto.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Objetivo */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#CC0E21]" /> Objetivo
                </span>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editForm.objetivo}
                    onChange={e => setEditForm({ ...editForm, objetivo: e.target.value })}
                    placeholder="Describir el objetivo táctico/técnico principal..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-[#CC0E21] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                ) : (
                  selectedTask.objetivo && (
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.objetivo}
                    </div>
                  )
                )}
              </div>

              {/* Organización */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Organización</span>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={editForm.organizacion}
                    onChange={e => setEditForm({ ...editForm, organizacion: e.target.value })}
                    placeholder="Distribución de jugadores, postas, rotaciones..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-[#CC0E21] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                ) : (
                  selectedTask.organizacion && selectedTask.organizacion !== 'No detectado' && (
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                      {selectedTask.organizacion}
                    </div>
                  )
                )}
              </div>

              {/* Desarrollo */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-sky-400" /> Desarrollo
                </span>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editForm.desarrollo}
                    onChange={e => setEditForm({ ...editForm, desarrollo: e.target.value })}
                    placeholder="Explicación detallada de la secuencia de juego..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-[#CC0E21] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                ) : (
                  selectedTask.desarrollo && selectedTask.desarrollo !== 'No detectado' && (
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.desarrollo}
                    </div>
                  )
                )}
              </div>

              {/* Consignas */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Consignas Tácticas</span>
                {isEditing ? (
                  <div className="space-y-1">
                    <textarea
                      rows={4}
                      value={editForm.consignas_text}
                      onChange={e => setEditForm({ ...editForm, consignas_text: e.target.value })}
                      placeholder="Una consigna por línea..."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-[#CC0E21] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-500 block">
                      Tip: Escribe cada consigna en una línea separada.
                    </span>
                  </div>
                ) : (
                  (() => {
                    const rawConsignas = selectedTask.consignas as unknown;
                    const consignasList: string[] = Array.isArray(rawConsignas)
                      ? (rawConsignas as unknown[])
                          .map(c => String(c).trim())
                          .filter(c => Boolean(c) && c !== 'No detectado')
                      : typeof rawConsignas === 'string' && rawConsignas.trim()
                      ? rawConsignas
                          .split(/\r?\n/)
                          .map(s => s.replace(/^[-•*–—\d+.)\s]+/, '').trim())
                          .filter(s => Boolean(s) && s !== 'No detectado')
                      : [];

                    if (consignasList.length === 0) return null;

                    return (
                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1">
                        {consignasList.map((c, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <span className="text-[#CC0E21] font-black">•</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Transiciones (Recuperación / Pérdida) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400">Transiciones</span>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                        <ArrowRight className="h-2.5 w-2.5" /> Tras recuperación:
                      </span>
                      <textarea
                        rows={2}
                        value={editForm.transicion_rec}
                        onChange={e => setEditForm({ ...editForm, transicion_rec: e.target.value })}
                        placeholder="Comportamiento tras recuperar..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-red-400 font-bold block flex items-center gap-1">
                        <Shuffle className="h-2.5 w-2.5" /> Tras pérdida:
                      </span>
                      <textarea
                        rows={2}
                        value={editForm.transicion_perd}
                        onChange={e => setEditForm({ ...editForm, transicion_perd: e.target.value })}
                        placeholder="Comportamiento tras perder..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  (selectedTask.transicion_rec || selectedTask.transicion_perd) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTask.transicion_rec && (
                        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-emerald-900/30 space-y-0.5">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <ArrowRight className="h-2.5 w-2.5" /> Tras recuperación
                          </span>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {selectedTask.transicion_rec}
                          </p>
                        </div>
                      )}
                      {selectedTask.transicion_perd && (
                        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-red-900/30 space-y-0.5">
                          <span className="text-[9px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                            <Shuffle className="h-2.5 w-2.5" /> Tras pérdida
                          </span>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {selectedTask.transicion_perd}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Trazabilidad de origen PDF (SIEMPRE INMUTABLE) */}
              {(selectedTask.fuente_pdf_url ||
                selectedTask.numero_tarea_pdf ||
                selectedTask.pagina_pdf) && (
                <div className="space-y-1 pt-2 border-t border-slate-800/60">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5 text-slate-600" /> Trazabilidad del Documento (Solo lectura)
                  </span>
                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1 text-[10px]">
                    {(() => {
                      const pdfInfo = resolveTaskPdfSource(selectedTask, tasks);
                      if (!pdfInfo.displayName) return null;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold w-16 shrink-0">PDF:</span>
                          {pdfInfo.url ? (
                            <a
                              href={pdfInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 underline truncate hover:text-sky-300"
                              title={selectedTask.pagina_pdf ? `Abrir PDF original en la página ${selectedTask.pagina_pdf}` : 'Abrir documento PDF original en nueva pestaña'}
                            >
                              {pdfInfo.displayName}
                            </a>
                          ) : (
                            <span className="text-slate-300 truncate" title="Documento no disponible para descarga directa">
                              {pdfInfo.displayName}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {selectedTask.numero_tarea_pdf && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold w-16 shrink-0">Nº Tarea:</span>
                        <span className="text-slate-300">Tarea {selectedTask.numero_tarea_pdf}</span>
                      </div>
                    )}
                    {selectedTask.pagina_pdf && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold w-16 shrink-0">Página:</span>
                        <span className="text-slate-300">Pág. {selectedTask.pagina_pdf}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Acciones al pie de la ficha */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div>
                {isEditing ? (
                  <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1">
                    <Edit3 className="h-3 w-3" /> Modo Edición de Ficha
                  </span>
                ) : selectedTask.aprobada === false ? (
                  <span className="text-[10px] text-amber-300/80 font-semibold block">
                    Borrador Staff · Requiere aprobación explícita de staff
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-semibold block">
                    ✓ Ejercicio activo en biblioteca
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={cancelEditing}
                      disabled={savingTask}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => handleSaveTask(false)}
                      disabled={savingTask}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs"
                    >
                      {savingTask ? 'Guardando...' : 'Guardar Borrador'}
                    </Button>
                    <Button
                      onClick={() => handleSaveTask(true)}
                      disabled={savingTask}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      {savingTask ? (
                        <>
                          <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Guardar y Aprobar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Botón de Editar Ficha */}
                    <button
                      type="button"
                      onClick={() => startEditing(selectedTask)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-sky-400" />
                      <span>Editar Ficha</span>
                    </button>

                    {/* Botón de Aprobar directo si está en borrador */}
                    {selectedTask.aprobada === false && (
                      <Button
                        onClick={() => handleApproveDraft(selectedTask)}
                        disabled={approvingId === selectedTask.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        {approvingId === selectedTask.id ? (
                          <>
                            <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5" />
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Aprobar Tarea
                          </>
                        )}
                      </Button>
                    )}

                    {onSelectTask && (
                      <Button
                        onClick={() => onSelectTask(selectedTask)}
                        className="text-xs font-black"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Importar Ejercicio
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex lg:w-5/12 bg-slate-900/20 border border-slate-800/50 rounded-2xl p-8 flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-850 flex items-center justify-center text-slate-500">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-300">Ningún ejercicio seleccionado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                Pulsa en &quot;Ver ficha&quot; sobre cualquier ejercicio de la lista para inspeccionar sus objetivos, consignas, transiciones y conceptos taxonómicos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
