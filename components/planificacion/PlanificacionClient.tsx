'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar as CalendarIcon, Plus, Printer, RefreshCw, 
  BookOpen, X, Clock, MapPin, 
  Play, CheckCircle2,
  Trash2, Share2, Info, Star, ArrowUp, ArrowDown
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { getDaysOfWeek, getDaysOfMonthGrid } from '@/lib/dateUtils';
import { PlanningTaskLibrary } from '@/types';
import { BibliotecaTareasModal } from './BibliotecaTareasModal';

// Mock material checklist interface
interface MockChecklist {
  balones?: number;
  conos?: number;
  chinos?: number;
  picas?: number;
  vallas?: number;
  estacas?: number;
  porterias_moviles?: number;
  escaleras_coordinacion?: number;
  petos?: string[];
  gps?: boolean;
  cronometro?: boolean;
  tablet?: boolean;
  altavoz?: boolean;
  agua?: boolean;
  botiquin?: boolean;
}

// Simulated types for Mockup
interface MockSession {
  id: string;
  fecha: string;
  tipo_sesion: 'Entrenamiento' | 'Partido' | 'Libre' | 'Recuperación' | 'Prepartido' | 'Viaje' | 'Postpartido';
  hora_inicio: string;
  hora_fin: string;
  duracion_total: number;
  campo_instalacion: string;
  objetivo_principal: string;
  carga: 'Baja' | 'Media' | 'Alta' | 'Muy alta' | 'Recuperación' | 'Activación';
  estado: 'Borrador' | 'Planificada' | 'Realizada' | 'Suspendida';
  rival?: string;
  objetivo_semanal?: string;
  hora_convocatoria?: string;
  ropa_convocatoria?: string;
  checklist_material?: MockChecklist;
  evaluacion_completada?: boolean;
  evaluacion_duracion_real?: number;
  evaluacion_observaciones?: string;
  rpe_medio?: number; // Rating of Perceived Exertion (1-10)
  valoracion_media_jugadores?: number;
}

interface MockTask {
  id: string;
  nombre_tarea: string;
  tipo_tarea: string;
  minutos: number;
  jugadores: number;
  espacio: string;
  objetivo: string;
  descripcion: string;
  observaciones?: string;
  responsable_staff: string;
}

interface MockPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number;
  demarcacion: string;
  estado: 'Disponible' | 'Lesionado' | 'Duda' | 'Sancionado';
}

const CONCEPTOS_TACTICOS = {
  'ATAQUE': ['Ataque Organizado', 'Ataque Rápido / Contraataque', 'Salida de Balón', 'Progresión en el Juego', 'Finalización'],
  'DEFENSA': ['Defensa Organizada', 'Presión tras Pérdida', 'Presión Alta', 'Defensa de Centros', 'Basculaciones'],
  'TRANSICIONES': ['Transición Ofensiva', 'Transición Defensiva', 'Reorganización Defensiva'],
  'ABP': ['Córner Ofensivo', 'Córner Defensivo', 'Falta Ofensiva', 'Falta Defensiva', 'Penaltis', 'Saques de Banda'],
  'CONDICIONAL': ['Fuerza', 'Resistencia', 'Velocidad', 'Recuperación'],
  'MENTAL': ['Cohesión Grupal', 'Charla Táctica', 'Concentración']
};

// Mock interface type definitions are kept for state typing
export function PlanificacionClient() {
  const { isEditMode, verifyWritePermission } = useEditMode();
  // Views and navigation
  const [viewMode, setViewMode] = useState<'semanal' | 'mensual'>('semanal');
  const [loading, setLoading] = useState(true);
  
  // Nombres de días abreviados en español y cálculo de semana
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    const d = new Date(); // Contexto de fecha actual
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // Data states connected to Supabase
  const [sessions, setSessions] = useState<MockSession[]>([]);
  const [allTasksMap, setAllTasksMap] = useState<Record<string, MockTask[]>>({});
  const [players, setPlayers] = useState<MockPlayer[]>([]);
  const [allConceptsMap, setAllConceptsMap] = useState<Record<string, { id: string; session_id: string; categoria: string; concepto: string }[]>>({});
  const [sessionConcepts, setSessionConcepts] = useState<{ id?: string; session_id: string; categoria: string; concepto: string }[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basicos' | 'tareas' | 'asistencia' | 'evaluacion'>('basicos');
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  // Form states
  const [sessionForm, setSessionForm] = useState<Partial<MockSession>>({});
  const [sessionTasks, setSessionTasks] = useState<MockTask[]>([]);
  const [summonedPlayerIds, setSummonedPlayerIds] = useState<string[]>([]);
  
  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch summoned players from Supabase
  const fetchSummonedPlayers = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('planning_session_players')
        .select('player_id, convocado')
        .eq('session_id', sessionId);
      if (error) throw error;
      const summoned = data?.filter(p => p.convocado).map(p => p.player_id) || [];
      setSummonedPlayerIds(summoned);
    } catch (err) {
      console.error('Error fetching summoned players:', err);
    }
  };

  // 2. Fetch all database planning data for the selected period
  const fetchWeekData = useCallback(async (mondayDate: Date, currentMode: 'semanal' | 'mensual') => {
    setLoading(true);
    try {
      const days = currentMode === 'semanal' 
        ? getDaysOfWeek(mondayDate) 
        : getDaysOfMonthGrid(mondayDate);
      const start = days[0];
      const end = days[days.length - 1];

      // Fetch sessions in range
      const { data: dbSessions, error: sErr } = await supabase
        .from('planning_sessions')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true });
      if (sErr) throw sErr;

      // Fetch tasks for these sessions
      const sessionIds = dbSessions?.map(s => s.id) || [];
      let dbTasks: {
        id: string;
        planning_session_id: string;
        nombre_tarea: string;
        tipo_tarea: string;
        minutos: number;
        jugadores?: number | null;
        espacio?: string | null;
        objetivo?: string | null;
        descripcion?: string | null;
        observaciones?: string | null;
        responsable_staff?: string | null;
      }[] = [];
      let dbConcepts: {
        id: string;
        session_id: string;
        categoria: string;
        concepto: string;
      }[] = [];

      if (sessionIds.length > 0) {
        const [tasksRes, conceptsRes] = await Promise.all([
          supabase
            .from('planning_tasks')
            .select('*')
            .in('planning_session_id', sessionIds)
            .order('orden', { ascending: true }),
          supabase
            .from('planning_concepts')
            .select('*')
            .in('session_id', sessionIds)
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (conceptsRes.error) throw conceptsRes.error;

        dbTasks = tasksRes.data || [];
        dbConcepts = conceptsRes.data || [];
      }

      // Group tasks by session_id
      const tasksMap: Record<string, MockTask[]> = {};
      dbTasks.forEach(task => {
        if (!tasksMap[task.planning_session_id]) {
          tasksMap[task.planning_session_id] = [];
        }
        tasksMap[task.planning_session_id].push({
          id: task.id,
          nombre_tarea: task.nombre_tarea,
          tipo_tarea: task.tipo_tarea,
          minutos: task.minutos,
          jugadores: task.jugadores || 0,
          espacio: task.espacio || '',
          objetivo: task.objetivo || '',
          descripcion: task.descripcion || '',
          observaciones: task.observaciones || '',
          responsable_staff: task.responsable_staff || 'Primer Entrenador'
        });
      });

      // Group concepts by session_id
      const conceptsMap: Record<string, { id: string; session_id: string; categoria: string; concepto: string }[]> = {};
      dbConcepts.forEach(c => {
        if (!conceptsMap[c.session_id]) {
          conceptsMap[c.session_id] = [];
        }
        conceptsMap[c.session_id].push(c);
      });

      // Construct a complete list of all grid days
      const fullPeriodSessions: MockSession[] = days.map(day => {
        const existing = dbSessions?.find(s => s.fecha === day);
        if (existing) {
          return {
            id: existing.id,
            fecha: existing.fecha,
            tipo_sesion: (existing.tipo_sesion || 'Entrenamiento') as MockSession['tipo_sesion'],
            hora_inicio: existing.hora_inicio || '',
            hora_fin: existing.hora_fin || '',
            duracion_total: existing.duracion_total || 0,
            campo_instalacion: existing.campo_instalacion || '',
            objetivo_principal: existing.objetivo_principal || '',
            carga: (existing.carga || 'Media') as MockSession['carga'],
            estado: (existing.estado || 'Planificada') as MockSession['estado'],
            rival: existing.rival || undefined,
            hora_convocatoria: existing.hora_convocatoria || '',
            ropa_convocatoria: existing.observaciones_convocatoria || '',
            checklist_material: existing.checklist_material || {},
            evaluacion_completada: existing.evaluacion_completada || false,
            evaluacion_duracion_real: existing.evaluacion_duracion_real || undefined,
            evaluacion_observaciones: existing.evaluacion_observaciones || '',
            valoracion_media_jugadores: existing.valoracion_media_jugadores || undefined
          };
        } else {
          return {
            id: `temp-${day}`,
            fecha: day,
            tipo_sesion: 'Libre',
            hora_inicio: '',
            hora_fin: '',
            duracion_total: 0,
            campo_instalacion: '',
            objetivo_principal: 'Descanso programado',
            carga: 'Recuperación',
            estado: 'Borrador'
          };
        }
      });

      setSessions(fullPeriodSessions);
      setAllTasksMap(tasksMap);
      setAllConceptsMap(conceptsMap);
    } catch (err) {
      console.error('Error fetching period data:', err);
      triggerToast('Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('dorsal', { ascending: true });
        if (error) throw error;
        setPlayers(data || []);
      } catch (err) {
        console.error('Error loading players:', err);
      }
    };
    fetchPlayers();
  }, []);

  // Fetch period sessions when currentMonday or viewMode changes
  useEffect(() => {
    fetchWeekData(currentMonday, viewMode);
  }, [currentMonday, viewMode, fetchWeekData]);

  // Period navigation
  const handlePrevPeriod = () => {
    setCurrentMonday(prev => {
      const nextM = new Date(prev);
      if (viewMode === 'semanal') {
        nextM.setDate(prev.getDate() - 7);
      } else {
        nextM.setMonth(prev.getMonth() - 1);
      }
      return nextM;
    });
  };

  const handleNextPeriod = () => {
    setCurrentMonday(prev => {
      const nextM = new Date(prev);
      if (viewMode === 'semanal') {
        nextM.setDate(prev.getDate() + 7);
      } else {
        nextM.setMonth(prev.getMonth() + 1);
      }
      return nextM;
    });
  };


  const getPdfUrl = () => {
    const obs = sessionForm.evaluacion_observaciones || '';
    if (obs.includes('PDF:')) {
      return obs.split('PDF:')[1].trim();
    }
    return '';
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `session-${selectedDate}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `planning-pdfs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('indautxu-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('indautxu-assets').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Associate to sessionForm
      const baseObs = sessionForm.evaluacion_observaciones?.replace(/PDF:[\s\S]*$/, '') || '';
      setSessionForm({
        ...sessionForm,
        evaluacion_observaciones: `${baseObs.trim()}\nPDF: ${publicUrl}`.trim()
      });
      triggerToast('¡Archivo PDF subido correctamente!');
    } catch (err) {
      console.error('Error uploading PDF:', err);
      triggerToast('Error al subir el archivo PDF a Supabase Storage.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSelectLibraryTask = (libraryTask: PlanningTaskLibrary) => {
    const newTask: MockTask = {
      id: 'temp-task-lib-' + Date.now(),
      nombre_tarea: libraryTask.nombre,
      tipo_tarea: libraryTask.tipo_tarea,
      minutos: libraryTask.minutos_defecto || 15,
      jugadores: libraryTask.jugadores_defecto || 20,
      espacio: libraryTask.espacio_defecto || '',
      objetivo: libraryTask.objetivo || '',
      descripcion: libraryTask.descripcion || '',
      responsable_staff: 'Primer Entrenador'
    };
    setSessionTasks([...sessionTasks, newTask]);
    setIsLibraryModalOpen(false);
    triggerToast('¡Tarea importada desde la biblioteca!');
  };

  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= sessionTasks.length) return;

    const updated = [...sessionTasks];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setSessionTasks(updated);
  };

  // Open sidebar/drawer on day click
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = sessions.find(s => s.fecha === dateStr);

    if (existing) {
      setSessionForm({ ...existing });
      setSessionTasks(allTasksMap[existing.id] || []);
      setSessionConcepts(allConceptsMap[existing.id] || []);
      if (!existing.id.startsWith('temp-')) {
        fetchSummonedPlayers(existing.id);
      } else {
        setSummonedPlayerIds(players.filter(p => p.estado === 'Disponible').map(p => p.id));
      }
    } else {
      setSessionForm({
        fecha: dateStr,
        tipo_sesion: 'Entrenamiento',
        hora_inicio: '18:30',
        hora_fin: '20:00',
        duracion_total: 90,
        campo_instalacion: 'Iparralde',
        objetivo_principal: 'Organización táctica',
        carga: 'Media',
        estado: 'Borrador',
        hora_convocatoria: '18:00',
        ropa_convocatoria: 'Polo oficial y chándal.'
      });
      setSessionTasks([]);
      setSessionConcepts([]);
      setSummonedPlayerIds([]);
    }
    setActiveTab('basicos');
    setIsPanelOpen(true);
  };

  // Handle save actions via RPC (Phase C)
  const handleSaveReal = async () => {
    try {
      verifyWritePermission();
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'No autorizado');
      return;
    }
    setLoading(true);
    try {
      const sessionPayload: {
        id?: string;
        fecha?: string;
        tipo_sesion?: string;
        hora_inicio?: string | null;
        hora_fin?: string | null;
        duracion_total?: number;
        campo_instalacion?: string | null;
        objetivo_principal?: string | null;
        carga?: string;
        estado?: string;
        hora_convocatoria?: string | null;
        observaciones_convocatoria?: string | null;
        checklist_material?: Record<string, unknown>;
        evaluacion_completada?: boolean;
        evaluacion_duracion_real?: number | null;
        evaluacion_observaciones?: string | null;
        rival?: string | null;
      } = {
        fecha: sessionForm.fecha,
        tipo_sesion: sessionForm.tipo_sesion,
        hora_inicio: sessionForm.hora_inicio || null,
        hora_fin: sessionForm.hora_fin || null,
        duracion_total: Number(sessionForm.duracion_total) || 0,
        campo_instalacion: sessionForm.campo_instalacion || null,
        objetivo_principal: sessionForm.objetivo_principal || null,
        carga: sessionForm.carga || 'Media',
        estado: sessionForm.estado || 'Planificada',
        hora_convocatoria: sessionForm.hora_convocatoria || null,
        observaciones_convocatoria: sessionForm.ropa_convocatoria || null,
        checklist_material: (sessionForm.checklist_material as Record<string, unknown>) || {},
        rival: sessionForm.rival || null
      };

      sessionPayload.evaluacion_completada = sessionForm.evaluacion_completada || false;
      sessionPayload.evaluacion_duracion_real = sessionForm.evaluacion_duracion_real ? Number(sessionForm.evaluacion_duracion_real) : null;
      sessionPayload.evaluacion_observaciones = sessionForm.evaluacion_observaciones || null;

      const isNew = !sessionForm.id || sessionForm.id.startsWith('temp-');
      if (!isNew) {
        sessionPayload.id = sessionForm.id;
      }

      const { data: sessionResult, error: sErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'planning_sessions',
        payload: sessionPayload,
        conflict_columns: ['id'],
        staff_passkey: 'indautxu2026'
      });
      if (sErr) throw sErr;

      const savedSession = sessionResult as { id: string };
      const sessionId = savedSession.id;

      // Clean up deleted tasks from this session
      if (!isNew) {
        const { data: existingTasks } = await supabase
          .from('planning_tasks')
          .select('id')
          .eq('planning_session_id', sessionId);
        
        if (existingTasks) {
          for (const extTask of existingTasks) {
            if (!sessionTasks.some(t => t.id === extTask.id)) {
              await supabase.rpc('exec_secure_delete', {
                target_table: 'planning_tasks',
                record_id: extTask.id,
                staff_passkey: 'indautxu2026'
              });
            }
          }
        }
      }

      // Upsert current tasks
      if (sessionTasks.length > 0) {
        const taskPayloads = sessionTasks.map((t, idx) => {
          const payload: {
            id?: string;
            planning_session_id: string;
            nombre_tarea: string;
            tipo_tarea: string;
            minutos: number;
            jugadores?: number | null;
            espacio?: string | null;
            objetivo?: string | null;
            descripcion?: string | null;
            observaciones?: string | null;
            orden: number;
          } = {
            planning_session_id: sessionId,
            nombre_tarea: t.nombre_tarea,
            tipo_tarea: t.tipo_tarea,
            minutos: Number(t.minutos) || 0,
            jugadores: t.jugadores || null,
            espacio: t.espacio || null,
            objetivo: t.objetivo || null,
            descripcion: t.descripcion || null,
            observaciones: t.observaciones || null,
            orden: idx
          };
          if (t.id && !t.id.startsWith('t') && !t.id.startsWith('temp-')) {
            payload.id = t.id;
          }
          return payload;
        });

        const { error: tErr } = await supabase.rpc('exec_secure_bulk_upsert', {
          target_table: 'planning_tasks',
          payloads: taskPayloads,
          conflict_columns: ['id'],
          staff_passkey: 'indautxu2026'
        });
        if (tErr) throw tErr;
      }

      // Save summoned players
      const playerPayloads = players.map(p => {
        const isSummoned = summonedPlayerIds.includes(p.id);
        return {
          session_id: sessionId,
          player_id: p.id,
          convocado: isSummoned,
          estado_sesion: p.estado
        };
      });

       const { error: pErr } = await supabase.rpc('exec_secure_bulk_upsert', {
        target_table: 'planning_session_players',
        payloads: playerPayloads,
        conflict_columns: ['session_id', 'player_id'],
        staff_passkey: 'indautxu2026'
      });
      if (pErr) throw pErr;

      // Overwrite/Clean up worked concepts
      if (!isNew) {
        const { data: existingConcepts } = await supabase
          .from('planning_concepts')
          .select('id, categoria, concepto')
          .eq('session_id', sessionId);
        
        if (existingConcepts && existingConcepts.length > 0) {
          for (const extConcept of existingConcepts) {
            if (!sessionConcepts.some(c => c.id === extConcept.id || (c.categoria === extConcept.categoria && c.concepto === extConcept.concepto))) {
              await supabase.rpc('exec_secure_delete', {
                target_table: 'planning_concepts',
                record_id: extConcept.id,
                staff_passkey: 'indautxu2026'
              });
            }
          }
        }
      }

      if (sessionConcepts.length > 0) {
        const conceptPayloads = sessionConcepts.map(c => ({
          session_id: sessionId,
          categoria: c.categoria,
          concepto: c.concepto
        }));

        const { error: cErr } = await supabase.rpc('exec_secure_bulk_upsert', {
          target_table: 'planning_concepts',
          payloads: conceptPayloads,
          conflict_columns: ['session_id', 'categoria', 'concepto'],
          staff_passkey: 'indautxu2026'
        });
        if (cErr) throw cErr;
      }

      triggerToast('¡Sesión guardada con éxito en Supabase!');
      setIsPanelOpen(false);
      fetchWeekData(currentMonday, viewMode);
    } catch (err) {
      console.error('Error saving session:', err);
      triggerToast(err instanceof Error ? err.message : 'Error al guardar la sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSimulated = () => {
    triggerToast('¡Sesión duplicada! Copiada al día siguiente.');
  };

  const handleCopyWhatsAppSimulated = () => {
    const text = `⚽ S.D. INDAUTXU DH - CONVOCATORIA ⚽\n📅 Fecha: ${sessionForm.fecha}\n⏰ Citación: ${sessionForm.hora_convocatoria || '18:00'}h\n📍 Lugar: ${sessionForm.campo_instalacion || 'Iparralde'}\n👕 Ropa: ${sessionForm.ropa_convocatoria || 'Polo del club'}`;
    navigator.clipboard.writeText(text);
    triggerToast('¡Convocatoria de WhatsApp copiada al portapapeles!');
  };

  // Helper to calculate Match Day tag dynamically
  const getMatchDayTag = (session: MockSession, allSessions: MockSession[]) => {
    if (session.tipo_sesion === 'Partido') return 'MATCH DAY';
    const matchSession = allSessions.find(s => s.tipo_sesion === 'Partido');
    if (!matchSession) return '';
    const matchDate = new Date(matchSession.fecha);
    const currentDate = new Date(session.fecha);
    const diffTime = currentDate.getTime() - matchDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'MATCH DAY';
    if (diffDays > 0) return `REC / MD+${diffDays}`;
    return `MD${diffDays}`;
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Entrenamiento':
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-350 border border-slate-800',
          icon: '⚽'
        };
      case 'Partido':
        return { 
          border: 'border-emerald-500 bg-emerald-950/15', 
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          icon: '🏆'
        };
      case 'Libre':
        return { 
          border: 'border-slate-900 opacity-50', 
          badge: 'bg-slate-950 text-slate-650',
          icon: '💤'
        };
      case 'Recuperación':
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-400 border border-slate-800',
          icon: '🔋'
        };
      case 'Prepartido':
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-400 border border-slate-850',
          icon: '⚡'
        };
      case 'Viaje':
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-450 border border-slate-850',
          icon: '🚌'
        };
      case 'Postpartido':
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-450 border border-slate-850',
          icon: '📝'
        };
      default:
        return { 
          border: 'border-slate-800', 
          badge: 'bg-slate-900 text-slate-400',
          icon: '📋'
        };
    }
  };

  // Weekly Dashboard calculations
  const totalVolume = sessions.reduce((acc, s) => acc + (s.duracion_total || 0), 0);
  const activeSessionsCount = sessions.filter(s => s.tipo_sesion !== 'Libre').length;
  
  // Squad breakdown
  const availableCount = players.filter(p => p.estado === 'Disponible').length;
  const injuredCount = players.filter(p => p.estado === 'Lesionado').length;
  const doubtCount = players.filter(p => p.estado === 'Duda').length;

  const matchSession = sessions.find(s => s.tipo_sesion === 'Partido');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-[#CC0E21] animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando Cuaderno...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-12 text-slate-100 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-950 border border-[#CC0E21] px-4 py-3 rounded-xl text-slate-200 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CABECERA SUPERIOR - CUADERNO DE ENTRENADOR V3 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Widget del Microciclo y Datos Físicos */}
        <div className="xl:col-span-4 p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col justify-between space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">PLANIFICACIÓN</span>
              <h1 className="text-xl font-black tracking-tight text-slate-100 mt-0.5">MICROCICLO 32</h1>
            </div>
            <div className="flex bg-slate-950 border border-slate-855 p-1 rounded-xl gap-1 items-center">
              <button 
                onClick={handlePrevPeriod}
                className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-200 font-bold transition-all text-xs"
                title={viewMode === 'semanal' ? "Semana anterior" : "Mes anterior"}
              >
                ◀
              </button>
              <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter uppercase px-1">
                {viewMode === 'semanal' 
                  ? `W: ${currentMonday.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`
                  : currentMonday.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                }
              </span>
              <button 
                onClick={handleNextPeriod}
                className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-200 font-bold transition-all text-xs"
                title={viewMode === 'semanal' ? "Semana siguiente" : "Mes siguiente"}
              >
                ▶
              </button>
              <span className="text-slate-800 text-xs">|</span>
              <button 
                onClick={() => setViewMode('semanal')}
                className={`text-[9px] px-2.5 py-1 font-bold rounded transition-all ${viewMode === 'semanal' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-350'}`}
              >
                Semanal
              </button>
              <button 
                onClick={() => setViewMode('mensual')}
                className={`text-[9px] px-2.5 py-1 font-bold rounded transition-all ${viewMode === 'mensual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-355'}`}
              >
                Mensual
              </button>
            </div>
          </div>

          {/* Estado de la plantilla */}
          <div className="border-t border-slate-850 pt-3">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">DISPONIBILIDAD PLANTILLA</span>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="flex items-center gap-1 bg-slate-950 border border-slate-850 px-2 py-1 rounded text-slate-300">
                🟢 <span className="text-white font-extrabold">{availableCount}</span> Disp.
              </span>
              <span className="flex items-center gap-1 bg-slate-950 border border-slate-850 px-2 py-1 rounded text-slate-400">
                🔴 <span className="text-white font-extrabold">{injuredCount}</span> Les.
              </span>
              <span className="flex items-center gap-1 bg-slate-950 border border-slate-850 px-2 py-1 rounded text-slate-400">
                🟡 <span className="text-white font-extrabold">{doubtCount}</span> Duda
              </span>
            </div>
          </div>
        </div>

        {/* Banner del Objetivo Semanal */}
        <div className="xl:col-span-4 p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black tracking-widest text-[#CC0E21] uppercase">OBJETIVO SEMANAL</span>
            <div className="mt-2 text-sm font-semibold text-slate-200 leading-relaxed">
              Presión tras pérdida en bloque alto y transiciones rápidas verticales buscando finalizaciones en menos de 8 segundos.
            </div>
          </div>
          <div className="text-[10px] text-slate-550 font-medium flex items-center gap-1 border-t border-slate-850 pt-3 mt-3">
            <Clock className="h-3.5 w-3.5 text-slate-655" />
            <span>Volumen planificado: {totalVolume} min | {activeSessionsCount} sesiones</span>
          </div>
        </div>

        {/* Widget Prominente: Partido de la Semana */}
        <div className="xl:col-span-4 p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase">
                PARTIDO DE LA SEMANA
              </span>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-white text-[10px] border border-slate-800">
                  SDI
                </div>
                <span className="text-[10px] font-bold text-slate-600">VS</span>
                <div className="h-7 w-7 rounded-full bg-slate-950 flex items-center justify-center font-bold text-white text-[10px] border border-slate-800 uppercase">
                  {matchSession?.rival ? matchSession.rival.substring(0, 2) : '??'}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-200">
                    {matchSession ? (matchSession.rival || 'Rival por definir') : 'Sin partido oficial'}
                  </h3>
                  <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">
                    {matchSession ? 'División de Honor' : 'Semana de Descanso'}
                  </p>
                </div>
              </div>
            </div>
            
            {matchSession && (
              <div className="text-right">
                <span className="text-[9px] font-black text-[#CC0E21] bg-[#CC0E21]/5 border border-[#CC0E21]/15 px-2 py-0.5 rounded uppercase">
                  FALTAN DÍAS
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-850 pt-2.5 mt-3 flex justify-between items-center text-[10px] font-semibold text-slate-400 z-10">
            <span>📅 {matchSession ? matchSession.fecha : '---'}</span>
            <span>⏰ {matchSession ? (matchSession.hora_inicio ? `${matchSession.hora_inicio}h` : '--:--') : '---'}</span>
            <span className="truncate max-w-[150px]">📍 {matchSession ? (matchSession.campo_instalacion || 'Por definir') : '---'}</span>
          </div>
        </div>
      </div>

      {/* VISTA PRINCIPAL: CALENDARIO SEMANAL */}
      {viewMode === 'semanal' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5">
            {sessions.map((session) => {
              const config = getTypeConfig(session.tipo_sesion);
              const date = new Date(session.fecha);
              const dayName = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][date.getDay()];
              const isToday = session.fecha === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
              const matchDayTag = getMatchDayTag(session, sessions);
              const tasks = allTasksMap[session.id] || [];

              return (
                <div
                  key={session.id}
                  onClick={() => handleDayClick(session.fecha)}
                  className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[380px] border relative ${
                    isToday 
                      ? 'border-[#CC0E21] bg-slate-900/60 ring-2 ring-[#CC0E21]/10' 
                      : `${config.border} bg-slate-950/20 hover:border-slate-700/80`
                  }`}
                >
                  {/* Tag Superior de Hoy */}
                  {isToday && (
                    <span className="absolute -top-2.5 left-4 text-[8px] font-black tracking-widest bg-[#CC0E21] text-white px-2 py-0.5 rounded shadow">
                      HOY
                    </span>
                  )}

                  <div className="space-y-4">
                    {/* Fila superior: Día y Nomenclatura deportiva */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-black text-slate-500">{dayName}</span>
                        <span className="text-sm font-black text-slate-200">{date.getDate()}</span>
                      </div>
                      <span className="text-[8px] font-black text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 uppercase">
                        {matchDayTag}
                      </span>
                    </div>

                    {/* Fila Tipo de Sesión con Icono */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black tracking-wider uppercase text-slate-400">
                        {config.icon} {session.tipo_sesion}
                      </span>
                      {session.duracion_total > 0 && (
                        <span className="text-[9px] font-mono text-slate-500 font-bold">
                          {session.duracion_total} min
                        </span>
                      )}
                    </div>

                    {/* Fila de Datos e Información del Día */}
                    {session.tipo_sesion !== 'Libre' ? (
                      <div className="space-y-3.5">
                        {/* Horario y campo */}
                        <div className="text-[9px] font-bold text-slate-500 flex flex-wrap items-center gap-1">
                          <span>⏰ {session.hora_inicio}</span>
                          {session.campo_instalacion && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[90px]">📍 {session.campo_instalacion.split(' ')[0]}</span>
                            </>
                          )}
                        </div>

                        {/* Objetivo principal */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black text-slate-650 uppercase tracking-wider block">OBJETIVO:</span>
                          <p className="text-xs font-bold text-slate-200 leading-relaxed">
                            {session.objetivo_principal}
                          </p>
                        </div>

                        {/* Contenidos / Tareas Rápidas */}
                        {tasks.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-slate-655 uppercase tracking-wider block">CONTENIDOS:</span>
                            <ul className="space-y-1 text-[10px] text-slate-400 font-medium">
                              {tasks.map(t => (
                                <li key={t.id} className="flex items-start gap-1">
                                  <span className="text-slate-600 shrink-0">•</span>
                                  <span className="truncate">{t.nombre_tarea}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-20 text-center text-[10px] text-slate-700 font-black italic uppercase tracking-widest">
                        Descanso
                      </div>
                    )}
                  </div>

                  {/* Fila inferior: Estado de Carga */}
                  {session.tipo_sesion !== 'Libre' && (
                    <div className="border-t border-slate-900/60 pt-2.5 mt-3 flex items-center justify-between">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${
                        session.estado === 'Realizada' ? 'bg-green-950/20 text-green-400 border border-green-900/10' : 'bg-amber-950/20 text-amber-400 border border-amber-900/10'
                      }`}>
                        {session.estado}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                        Carga: {session.carga}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA MENSUAL DEL CALENDARIO COMPLETO (TABLERO TÁCTICO V4) */
        <div className="space-y-6">
          {/* BARRA DE KPIs MENSUAL */}
          {(() => {
            const monthMinutes = sessions.reduce((acc, s) => acc + (s.duracion_total || 0), 0);
            const countTrainings = sessions.filter(s => s.tipo_sesion === 'Entrenamiento').length;
            const countMatches = sessions.filter(s => s.tipo_sesion === 'Partido').length;
            const countRecup = sessions.filter(s => s.tipo_sesion === 'Recuperación').length;
            const countRest = sessions.filter(s => s.tipo_sesion === 'Libre').length;
            const countTrips = sessions.filter(s => s.tipo_sesion === 'Viaje').length;

            return (
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/20 border border-slate-850/40 text-xs text-slate-400 font-semibold tracking-wide backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-100 font-black">📅 {currentMonday.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span>⏱️ <strong className="text-slate-200">{monthMinutes} min</strong> totales</span>
                  <span>⚽ <strong className="text-slate-200">{countTrainings}</strong> Entrenamientos</span>
                  <span>🏆 <strong className="text-slate-200">{countMatches}</strong> Partidos</span>
                  <span>🔋 <strong className="text-slate-200">{countRecup}</strong> Recuperaciones</span>
                  <span>💤 <strong className="text-slate-200">{countRest}</strong> Descansos</span>
                  <span>🚌 <strong className="text-slate-200">{countTrips}</strong> Viajes</span>
                </div>
              </div>
            );
          })()}

          {/* CABECERAS DE DÍAS */}
          <div className="grid grid-cols-7 gap-4 text-center pb-1">
            {['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].map(day => (
              <div key={day} className="text-[10px] font-black text-slate-500 tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* CUADRÍCULA DE CELDAS ESTILO APPLE */}
          <div className="grid grid-cols-7 gap-0 border-t border-l border-slate-800/40 rounded-xl overflow-hidden bg-slate-900/5">
            {sessions.map(session => {
              const date = new Date(session.fecha);
              const isCurrentMonth = date.getMonth() === currentMonday.getMonth();
              
              // Map charge colors to glows/bars
              const getChargeStyles = (charge: string) => {
                switch (charge) {
                  case 'Muy alta':
                    return { color: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.7)]' };
                  case 'Alta':
                    return { color: 'bg-orange-500', glow: 'shadow-[0_0_8px_rgba(249,115,22,0.7)]' };
                  case 'Media':
                    return { color: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.7)]' };
                  case 'Baja':
                    return { color: 'bg-sky-500', glow: 'shadow-[0_0_8px_rgba(14,165,233,0.7)]' };
                  case 'Recuperación':
                    return { color: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.7)]' };
                  default:
                    return { color: 'bg-slate-500', glow: 'shadow-[0_0_8px_rgba(148,163,184,0.4)]' };
                }
              };

              const chargeStyles = getChargeStyles(session.carga);
              const tooltipPos = (date.getDay() === 0 || date.getDay() === 6) 
                ? 'right-full top-0 mr-2' 
                : 'left-full top-0 ml-2';

              if (session.tipo_sesion === 'Partido') {
                return (
                  <div
                    key={session.id}
                    onClick={() => handleDayClick(session.fecha)}
                    className={`min-h-[145px] p-3 flex flex-col justify-between hover:bg-slate-900/10 transition-all cursor-pointer relative group/day select-none border-b border-r border-slate-800/40 ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-400">{date.getDate()}</span>
                    </div>

                    <div className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-2.5 py-2 rounded-lg text-[9px] tracking-wide shadow-[0_2px_8px_rgba(16,185,129,0.3)] block text-center space-y-1 transition-colors">
                      <div className="flex items-center justify-between text-[7px] opacity-90 border-b border-emerald-500/35 pb-1 font-mono">
                        <span>⏰ {session.hora_inicio || '12:00'}h</span>
                        <span className="font-black text-amber-300">MATCH DAY</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 py-0.5">
                        <span className="filter drop-shadow text-xs">🛡️</span>
                        <span className="truncate font-black max-w-[85px] uppercase">{session.rival || 'Rival por definir'}</span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-transparent" />

                    {/* Tooltip Táctico Flotante */}
                    <div className={`absolute ${tooltipPos} w-60 p-4 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl opacity-0 pointer-events-none group-hover/day:opacity-100 transition-opacity duration-200 z-30 space-y-2.5 backdrop-blur-md`}>
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">🏆 Partido Oficial</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-black bg-emerald-950 text-emerald-400">
                          {session.estado}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[10px] text-slate-400">
                        <p className="font-bold text-slate-100 leading-snug">🛡️ Rival: <span className="text-white">{session.rival || 'Rival por definir'}</span></p>
                        <p>📍 Campo: {session.campo_instalacion || 'Por definir'}</p>
                        <p>⏰ Hora Citación: {session.hora_convocatoria || '11:00'}h</p>
                        <p>👕 Ropa: {session.ropa_convocatoria || 'Oficial de juego'}</p>
                        <p>⚡ Carga: <span className="font-bold text-slate-200">{session.carga}</span></p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (session.tipo_sesion === 'Libre') {
                return (
                  <div
                    key={session.id}
                    onClick={() => handleDayClick(session.fecha)}
                    className={`min-h-[145px] p-3 flex flex-col justify-between hover:bg-slate-900/10 transition-all cursor-pointer relative group/day select-none border-b border-r border-slate-800/40 ${
                      !isCurrentMonth ? 'opacity-20' : ''
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-600">{date.getDate()}</span>
                    <div className="flex-1" />
                  </div>
                );
              }

              // Normal Session (Entrenamiento, Recuperación, Viaje, Prepartido, Postpartido)
              const sessionIcon = session.tipo_sesion === 'Entrenamiento' ? '⚽' : session.tipo_sesion === 'Recuperación' ? '🔋' : session.tipo_sesion === 'Viaje' ? '🚌' : '📋';
              const shortName = session.objetivo_principal || 'Sesión de trabajo';

              return (
                <div
                  key={session.id}
                  onClick={() => handleDayClick(session.fecha)}
                  className={`min-h-[145px] p-3 flex flex-col justify-between hover:bg-slate-900/10 transition-all cursor-pointer relative group/day select-none border-b border-r border-slate-800/40 ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400">{date.getDate()}</span>
                  </div>

                  {/* Píldora horizontal de evento */}
                  <div className={`w-full px-2.5 py-1.5 rounded-lg border text-[9px] font-bold flex items-center justify-between shadow-sm transition-all ${
                    session.carga === 'Muy alta' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                    session.carga === 'Alta' ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' :
                    session.carga === 'Media' ? 'bg-amber-400/10 text-amber-300 border-amber-400/20' :
                    session.carga === 'Baja' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' :
                    'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}>
                    <span className="truncate max-w-[80px] font-mono">{session.hora_inicio || '18:30'} {shortName}</span>
                    <span className="text-[10px]">{sessionIcon}</span>
                  </div>

                  {/* Contenidos globales trabajados cortos */}
                  {(() => {
                    const sessionConceptsList = allConceptsMap[session.id] || [];
                    if (sessionConceptsList.length > 0) {
                      return (
                        <div className="mt-1.5 space-y-0.5 max-h-[50px] overflow-hidden text-left">
                          {sessionConceptsList.slice(0, 3).map((c, cidx) => (
                            <div 
                              key={c.id || cidx} 
                              className="text-[7.5px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-350 truncate font-bold leading-tight"
                              title={`${c.categoria}: ${c.concepto}`}
                            >
                              • {c.concepto}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* LED de carga física */}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] text-slate-500 font-mono font-bold uppercase">{session.tipo_sesion}</span>
                    <div className={`h-1.5 w-6 rounded-full ${chargeStyles.color} ${chargeStyles.glow}`} />
                  </div>

                  {/* Tooltip Táctico Flotante */}
                  <div className={`absolute ${tooltipPos} w-60 p-4 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl opacity-0 pointer-events-none group-hover/day:opacity-100 transition-opacity duration-200 z-30 space-y-2.5 backdrop-blur-md`}>
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-[10px] font-black text-slate-350 uppercase tracking-wider">{session.tipo_sesion}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${
                        session.estado === 'Realizada' ? 'bg-green-950 text-green-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {session.estado}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-slate-400">
                      <p className="font-bold text-slate-100 leading-snug">🎯 Objetivo: <span className="text-white font-medium">{session.objetivo_principal || 'Sesión General'}</span></p>
                      <p>⏱️ Duración: {session.duracion_total} min</p>
                      <p>⚡ Carga de trabajo: <span className="font-bold text-slate-200">{session.carga}</span></p>
                      {session.campo_instalacion && <p>📍 Campo: {session.campo_instalacion}</p>}
                      {allConceptsMap[session.id] && allConceptsMap[session.id].length > 0 && (
                        <div className="pt-1.5 border-t border-slate-900 space-y-1 text-left">
                          <p className="text-[9.5px] font-bold text-slate-550 uppercase tracking-wider">Conceptos:</p>
                          <div className="flex flex-wrap gap-1">
                            {allConceptsMap[session.id].map((c, cidx) => (
                              <span key={c.id || cidx} className="text-[8px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 font-medium">
                                {c.concepto}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LEYENDA INFERIOR DE CARGAS */}
          <div className="flex justify-center items-center gap-6 pt-4 border-t border-slate-900/40 text-[9px] font-black text-slate-500 uppercase tracking-widest select-none">
            <span className="text-slate-600">CARGA FÍSICA:</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" /> Muy alta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]" /> Alta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" /> Media
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]" /> Baja / Viaje
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" /> Recuperación
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Descanso
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETALLE LATERAL SHEET (DRAWER OVERLAY) */}
      {/* ========================================================================= */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsPanelOpen(false)}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[580px] bg-slate-950 border-l border-slate-850 shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera lateral */}
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Sesión del día</span>
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#CC0E21]" />
              {selectedDate}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                onClick={handleSaveReal}
                className="px-3.5 py-1.5 rounded-xl bg-[#CC0E21] hover:bg-[#a80b1a] text-white text-xs font-bold shadow-md shadow-[#CC0E21]/15 transition-all"
              >
                Guardar Cambios
              </button>
            )}
            <button 
              onClick={() => setIsPanelOpen(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Ficha Lateral TABS */}
        <div className="flex border-b border-slate-850 bg-slate-900/20 px-3">
          {(['basicos', 'tareas', 'asistencia', 'evaluacion'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-extrabold uppercase border-b-2 tracking-wider transition-all ${
                activeTab === tab 
                  ? 'border-[#CC0E21] text-slate-100' 
                  : 'border-transparent text-slate-500 hover:text-slate-355'
              }`}
            >
              {tab === 'basicos' ? 'Datos Básicos' : tab === 'tareas' ? 'Ejercicios' : tab === 'asistencia' ? 'Asistencia' : 'Evaluación'}
            </button>
          ))}
        </div>

        {/* Cuerpo del drawer */}
        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
          {/* TAB 1: DATOS BÁSICOS */}
          {activeTab === 'basicos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tipo de Día</label>
                  <select
                    value={sessionForm.tipo_sesion || 'Entrenamiento'}
                    disabled={!isEditMode}
                    onChange={e => setSessionForm({...sessionForm, tipo_sesion: e.target.value as MockSession['tipo_sesion']})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                  >
                    <option value="Entrenamiento">Entrenamiento</option>
                    <option value="Partido">Partido</option>
                    <option value="Libre">Libre / Descanso</option>
                    <option value="Recuperación">Recuperación</option>
                    <option value="Prepartido">Prepartido / Activación</option>
                    <option value="Viaje">Viaje / Traslado</option>
                    <option value="Postpartido">Postpartido / Análisis</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Carga Teórica</label>
                  <select
                    value={sessionForm.carga || 'Media'}
                    disabled={!isEditMode}
                    onChange={e => setSessionForm({...sessionForm, carga: e.target.value as MockSession['carga']})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Muy alta">Muy alta</option>
                    <option value="Recuperación">Recuperación</option>
                    <option value="Activación">Activación prepartido</option>
                  </select>
                </div>
              </div>

              {sessionForm.tipo_sesion !== 'Libre' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Citación (Vestuario)</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          value={sessionForm.hora_convocatoria || '18:00'}
                          disabled={!isEditMode}
                          onChange={e => setSessionForm({...sessionForm, hora_convocatoria: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Inicio Sesión</label>
                      <div className="relative">
                        <Play className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          value={sessionForm.hora_inicio || '18:30'}
                          disabled={!isEditMode}
                          onChange={e => setSessionForm({...sessionForm, hora_inicio: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ubicación / Instalación</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Ej. Iparralde"
                        value={sessionForm.campo_instalacion || ''}
                        disabled={!isEditMode}
                        onChange={e => setSessionForm({...sessionForm, campo_instalacion: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {sessionForm.tipo_sesion === 'Partido' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rival</label>
                      <input
                        type="text"
                        placeholder="Ej. Nombre del Rival"
                        value={sessionForm.rival || ''}
                        disabled={!isEditMode}
                        onChange={e => setSessionForm({...sessionForm, rival: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo de la sesión</label>
                    <input
                      type="text"
                      placeholder="Ej. Organización ofensiva..."
                      value={sessionForm.objetivo_principal || ''}
                      disabled={!isEditMode}
                      onChange={e => setSessionForm({...sessionForm, objetivo_principal: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Estado de Convocatoria</label>
                    <select
                      value={sessionForm.estado || 'Planificada'}
                      disabled={!isEditMode}
                      onChange={e => setSessionForm({...sessionForm, estado: e.target.value as MockSession['estado']})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21] disabled:opacity-60"
                    >
                      <option value="Borrador">Borrador (Oculto)</option>
                      <option value="Planificada">Planificada / Publicada</option>
                      <option value="Realizada">Realizada / Concluida</option>
                      <option value="Suspendida">Suspendida</option>
                    </select>
                  </div>

                  {/* Contenidos y Conceptos Trabajados */}
                  <div className="pt-4 border-t border-slate-850 space-y-2.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Conceptos Trabajados (Estadísticas)</label>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-4">
                      {Object.entries(CONCEPTOS_TACTICOS).map(([categoria, conceptos]) => (
                        <div key={categoria} className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{categoria}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {conceptos.map(concepto => {
                              const isSelected = sessionConcepts.some(c => c.categoria === categoria && c.concepto === concepto);
                              return (
                                <button
                                  key={concepto}
                                  type="button"
                                  disabled={!isEditMode}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSessionConcepts(sessionConcepts.filter(c => !(c.categoria === categoria && c.concepto === concepto)));
                                    } else {
                                      setSessionConcepts([...sessionConcepts, { session_id: sessionForm.id || '', categoria, concepto }]);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    isSelected
                                      ? 'bg-[#CC0E21]/20 border-[#CC0E21]/45 text-[#CC0E21] font-black'
                                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                                  }`}
                                >
                                  {concepto}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {sessionForm.tipo_sesion === 'Libre' && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 text-center text-xs text-slate-400">
                  La jornada está marcada como libre. No hay tareas ni convocatoria asociada.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TAREAS (EJERCICIOS) */}
          {activeTab === 'tareas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lista de Tareas ({sessionTasks.length})</h4>
                <div className="flex gap-2">
                  <button
                    disabled={!isEditMode}
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-200 transition-colors disabled:opacity-50"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#CC0E21]" />
                    Importar Biblioteca
                  </button>
                  <button
                    disabled={!isEditMode}
                    onClick={() => {
                      const newTask: MockTask = {
                        id: 'temp-task-' + Date.now(),
                        nombre_tarea: 'Nuevo ejercicio táctico',
                        tipo_tarea: 'Táctica',
                        minutos: 15,
                        jugadores: 20,
                        espacio: 'Medio campo',
                        objetivo: 'Objetivo del ejercicio',
                        descripcion: 'Descripción del desarrollo del ejercicio.',
                        responsable_staff: 'Primer Entrenador'
                      };
                      setSessionTasks([...sessionTasks, newTask]);
                      triggerToast('¡Ejercicio añadido!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CC0E21]/15 hover:bg-[#CC0E21]/20 border border-[#CC0E21]/30 text-[11px] font-bold text-[#CC0E21] transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir Tarea
                  </button>
                </div>
              </div>

              {sessionTasks.length > 0 ? (
                <div className="space-y-3.5">
                  {sessionTasks.map((task, idx) => (
                    <div key={task.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-3 relative group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5 text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Paso {idx + 1} • {task.tipo_tarea}</span>
                          {!isEditMode && <h5 className="text-xs font-black text-slate-200">{task.nombre_tarea}</h5>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isEditMode && (
                            <>
                              <button
                                onClick={() => handleMoveTask(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                                title="Mover arriba"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleMoveTask(idx, 'down')}
                                disabled={idx === sessionTasks.length - 1}
                                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                                title="Mover abajo"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          {!isEditMode && (
                            <span className="text-[10px] font-bold text-[#CC0E21] bg-[#CC0E21]/10 px-2 py-0.5 rounded-lg border border-[#CC0E21]/20">
                              {task.minutos} min
                            </span>
                          )}
                          {isEditMode && (
                            <button 
                              onClick={() => {
                                setSessionTasks(sessionTasks.filter(t => t.id !== task.id));
                                triggerToast('Tarea eliminada.');
                              }}
                              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 transition-opacity"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditMode ? (
                        <div className="space-y-3 pt-1 border-t border-slate-800/40">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Nombre de Tarea</label>
                              <input
                                type="text"
                                value={task.nombre_tarea}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, nombre_tarea: e.target.value } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Tipo de Tarea</label>
                              <select
                                value={task.tipo_tarea}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, tipo_tarea: e.target.value } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              >
                                <option value="Calentamiento">Calentamiento</option>
                                <option value="Rondo">Rondo</option>
                                <option value="Posesión">Posesión</option>
                                <option value="Finalización">Finalización</option>
                                <option value="ABP">ABP</option>
                                <option value="Técnica">Técnica</option>
                                <option value="Táctica">Táctica</option>
                                <option value="Físico">Físico</option>
                                <option value="Partido condicionado">Partido condicionado</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Minutos</label>
                              <input
                                type="number"
                                value={task.minutos}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, minutos: Number(e.target.value) || 0 } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Jugadores</label>
                              <input
                                type="number"
                                value={task.jugadores}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, jugadores: Number(e.target.value) || 0 } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Espacio</label>
                              <input
                                type="text"
                                value={task.espacio}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, espacio: e.target.value } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Staff</label>
                              <input
                                type="text"
                                value={task.responsable_staff}
                                onChange={e => {
                                  setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, responsable_staff: e.target.value } : t));
                                }}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-left">Descripción / Desarrollo</label>
                            <textarea
                              value={task.descripcion}
                              onChange={e => {
                                setSessionTasks(sessionTasks.map(t => t.id === task.id ? { ...t, descripcion: e.target.value } : t));
                              }}
                              className="w-full min-h-[50px] bg-slate-950 border border-slate-850 focus:border-[#CC0E21]/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                            <div className="text-left">Espacio: <span className="text-slate-200 font-bold">{task.espacio}</span></div>
                            <div className="text-left">Jugadores: <span className="text-slate-200 font-bold">{task.jugadores}</span></div>
                            <div className="truncate text-left">Staff: <span className="text-slate-200 font-bold">{task.responsable_staff}</span></div>
                          </div>

                          <p className="text-[11px] text-slate-350 leading-relaxed font-medium text-left">
                            {task.descripcion}
                          </p>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => triggerToast(`"${task.nombre_tarea}" guardada en la biblioteca.`)}
                              className="flex items-center gap-1 text-[9px] px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold transition-all"
                            >
                              <BookOpen className="h-3 w-3" />
                              Guardar en Biblioteca
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-850 rounded-xl">
                  No hay tareas planificadas para hoy. Importa de la biblioteca o añade manual.
                </div>
              )}

              {/* Subida o asociación de PDF de la sesión */}
              <div className="pt-4 border-t border-slate-850 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider text-left">Documentación de Sesión (PDF)</h4>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 space-y-3">
                  {getPdfUrl() ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                      <button
                        type="button"
                        onClick={() => window.open(getPdfUrl(), '_blank')}
                        className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                      >
                        <span className="text-base">📄</span>
                        <span className="truncate max-w-[280px]">Abrir PDF de la Sesión</span>
                      </button>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const baseObs = sessionForm.evaluacion_observaciones?.replace(/PDF:[\s\S]*$/, '') || '';
                            setSessionForm({
                              ...sessionForm,
                              evaluacion_observaciones: baseObs.trim()
                            });
                            triggerToast('Documento PDF desasociado.');
                          }}
                          className="text-[9px] font-bold text-red-400 hover:text-red-300"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic text-left">
                      No hay ningún documento PDF subido a esta sesión.
                    </div>
                  )}

                  {isEditMode && (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1.5 text-left">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Subir desde ordenador</span>
                        <input
                          type="file"
                          accept=".pdf"
                          disabled={uploadingPdf}
                          onChange={handlePdfUpload}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-450 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-extrabold file:bg-[#CC0E21]/20 file:text-[#CC0E21] hover:file:bg-[#CC0E21]/30 file:cursor-pointer"
                        />
                        {uploadingPdf && (
                          <span className="text-[9px] text-amber-400 animate-pulse font-bold block text-left">Subiendo PDF de sesión a Supabase Storage...</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 pt-1 text-left">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">O pegar enlace manual</span>
                        <input
                          type="text"
                          placeholder="https://enlace.com/sesion.pdf"
                          value={getPdfUrl()}
                          onChange={e => {
                            const baseObs = sessionForm.evaluacion_observaciones?.replace(/PDF:[\s\S]*$/, '') || '';
                            setSessionForm({
                              ...sessionForm,
                              evaluacion_observaciones: `${baseObs.trim()}\nPDF: ${e.target.value}`.trim()
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 text-left">
                    <Info className="h-3.5 w-3.5 text-[#CC0E21]" />
                    <span>Asocia el PDF de la sesión de entrenamiento aquí para poder consultarlo en cualquier momento.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASISTENCIA Y CONVOCATORIA */}
          {activeTab === 'asistencia' && (
            <div className="space-y-4">
              {/* Botón directo de Asistencia rápida */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Pase de Lista Rápido</h5>
                    <p className="text-[9px] text-slate-550">Registrar ausencias, justificaciones y valoraciones.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (sessionForm.id && !sessionForm.id.startsWith('temp-')) {
                      window.location.href = `/asistencia?session_id=${sessionForm.id}`;
                    } else {
                      triggerToast('Guarde primero la sesión para registrar la asistencia.');
                    }
                  }}
                  className="text-[10px] px-3 py-1.5 bg-[#CC0E21] text-white font-extrabold rounded-lg hover:bg-[#a80b1a] transition-all"
                >
                  Registrar Asistencia
                </button>
              </div>

              {/* Convocatoria jugadores */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Convocados para el entrenamiento</h4>
                  <span className="text-[10px] text-slate-500 font-bold">Autodescartados lesionados</span>
                </div>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {players.map(player => {
                    const isSummoned = summonedPlayerIds.includes(player.id);
                    const isInjured = player.estado === 'Lesionado';
                    return (
                      <div 
                        key={player.id} 
                        onClick={() => {
                          if (isInjured) return;
                          if (isSummoned) {
                            setSummonedPlayerIds(summonedPlayerIds.filter(id => id !== player.id));
                          } else {
                            setSummonedPlayerIds([...summonedPlayerIds, player.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isInjured 
                            ? 'bg-red-950/10 border-red-950/20 text-red-500 opacity-60 cursor-not-allowed'
                            : isSummoned 
                              ? 'bg-slate-900 border-[#CC0E21]/30 text-slate-100'
                              : 'bg-transparent border-slate-900 text-slate-400 hover:border-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#CC0E21] min-w-[20px]">#{player.dorsal}</span>
                          <span className="font-bold">{player.nombre} {player.apellidos}</span>
                          <span className="text-[9px] text-slate-550">({player.demarcacion})</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                          isInjured ? 'bg-red-950 text-red-400' :
                          isSummoned ? 'bg-[#CC0E21]/20 text-[#CC0E21]' : 'bg-slate-850 text-slate-500'
                        }`}>
                          {isInjured ? 'Baja Médica' : isSummoned ? 'Convocado' : 'No convocado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EVALUACIÓN POST-ENTRENO */}
          {activeTab === 'evaluacion' && (
            <div className="space-y-4">
              {/* Valoración Media del Entrenamiento */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-850 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Valoración Media del Entrenamiento</span>
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                  <span className="text-3xl font-black text-slate-100">
                    {sessionForm.valoracion_media_jugadores || 'N/A'}
                  </span>
                  <span className="text-slate-500 text-sm">/ 5</span>
                </div>
                <p className="text-[10px] text-slate-500">Calculada automáticamente a partir del pase de lista y las valoraciones individuales de los jugadores asistentes.</p>
              </div>

              {/* RPE y Observaciones principales */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Fatiga Percibida (RPE Medio de la plantilla: 1-10)</label>
                <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sessionForm.rpe_medio || 6}
                    disabled={!isEditMode}
                    className="flex-1 accent-[#CC0E21] bg-slate-950 rounded-lg h-2 border border-slate-800 disabled:opacity-50"
                    onChange={e => setSessionForm({...sessionForm, rpe_medio: Number(e.target.value)})}
                  />
                  <span className="text-xs font-black text-[#CC0E21] bg-[#CC0E21]/15 px-2.5 py-1 rounded-xl border border-[#CC0E21]/20 shrink-0">
                    {sessionForm.rpe_medio || 6} / 10
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Conclusiones / Notas de la Evaluación</label>
                <textarea
                  value={sessionForm.evaluacion_observaciones || ''}
                  disabled={!isEditMode}
                  onChange={e => setSessionForm({...sessionForm, evaluacion_observaciones: e.target.value})}
                  placeholder="Detalla conclusiones de la sesión táctica..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] h-32 disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botonera de acciones (Footer lateral) */}
        <div className="p-4 border-t border-slate-850 bg-slate-900/60 sticky bottom-0 z-10 flex flex-wrap gap-2 print:hidden justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handleCopyWhatsAppSimulated}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-200"
              title="Copiar convocatoria para WhatsApp"
            >
              <Share2 className="h-4 w-4 text-[#CC0E21]" />
              Convocatoria
            </button>
            
            <button
              onClick={() => {
                triggerToast('Generando Ficha de Sesión PDF...');
                window.print();
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-200"
              title="Imprimir PDF de Ficha Táctica"
            >
              <Printer className="h-4 w-4 text-[#CC0E21]" />
              PDF Sesión
            </button>

            {isEditMode && (
              <button
                onClick={handleDuplicateSimulated}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-400 hover:text-slate-200"
                title="Duplicar esta sesión"
              >
                <RefreshCw className="h-4 w-4 text-[#CC0E21]" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsPanelOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
      {isLibraryModalOpen && (
        <BibliotecaTareasModal
          isOpen={isLibraryModalOpen}
          onClose={() => setIsLibraryModalOpen(false)}
          onSelectTask={handleSelectLibraryTask}
        />
      )}
    </div>
  );
}
