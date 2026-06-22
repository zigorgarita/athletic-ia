'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, FileText, Download, Upload, 
  Trash2, Save, Clock, Activity, Check, X, AlertTriangle, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  Player, Match, PlanningSession, 
  PlanningConcept, PlanningTask, PlanningDocument, PlanningSessionPlayer 
} from '@/types';

// Concept options structure
const CONCEPT_OPTIONS = {
  ATAQUE: [
    'Salida de balón', 'Juego interior', 'Juego exterior', 
    'Ataque posicional', 'Centros', 'Finalización', 
    'Contraataque', 'Tercer hombre', 'Cambios de orientación'
  ],
  DEFENSA: [
    'Presión alta', 'Bloque medio', 'Bloque bajo', 
    'Basculaciones', 'Vigilancias', 'Defensa de centros', 
    'Defensa de área', 'Defensa de espacio interior', 'Saltos de presión'
  ],
  TRANSICIONES: [
    'Tras pérdida', 'Tras recuperación', 'Repliegue', 
    'Contraataque', 'Vigilancias ofensivas'
  ],
  ABP: [
    'Córner ofensivo', 'Córner defensivo', 'Falta lateral ofensiva', 
    'Falta lateral defensiva', 'Falta frontal ofensiva', 'Falta frontal defensiva', 
    'Saque de banda ofensivo', 'Saque de banda defensivo', 'Saque inicial', 
    'Rechaces', 'Vigilancias'
  ],
  CONDICIONAL: [
    'Fuerza', 'Resistencia', 'Velocidad', 'Aceleración', 
    'Prevención de lesiones', 'Recuperación', 'Coordinación', 'Movilidad'
  ],
  'MENTAL / GRUPO': [
    'Competitividad', 'Comunicación', 'Concentración', 
    'Liderazgo', 'Cohesión', 'Gestión emocional'
  ]
};

const SESION_TIPOS = [
  'Recuperación postpartido',
  'Adquisición',
  'Transformación',
  'Activación prepartido',
  'ABP específica',
  'Vídeo',
  'Gimnasio',
  'Partido',
  'Descanso'
];

const OBJETIVOS_PRINCIPALES = [
  'Organización ofensiva',
  'Organización defensiva',
  'Transición ofensiva',
  'Transición defensiva',
  'Presión alta',
  'Bloque medio',
  'Bloque bajo',
  'ABP ofensiva',
  'ABP defensiva',
  'Recuperación',
  'Activación prepartido',
  'Finalización',
  'Salida de balón',
  'Defensa de área',
  'Ataque organizado'
];

const CARGAS = ['Recuperación', 'Baja', 'Media', 'Alta', 'Muy alta'];

const TAREAS_TIPOS = [
  'Calentamiento', 'Rondo', 'Activación', 'Técnica', 
  'Posesión', 'Juego de posición', 'Rueda de pase', 
  'Finalización', 'Juego reducido', 'Partido condicionado', 
  'ABP', 'Vuelta a la calma'
];

const MESOCICLOS = [
  { nombre: 'Pretemporada', mes: 7 }, // Agosto
  { nombre: 'Septiembre', mes: 8 },
  { nombre: 'Octubre', mes: 9 },
  { nombre: 'Noviembre', mes: 10 },
  { nombre: 'Diciembre', mes: 11 },
  { nombre: 'Enero', mes: 0 },
  { nombre: 'Febrero', mes: 1 },
  { nombre: 'Marzo', mes: 2 },
  { nombre: 'Abril', mes: 3 },
  { nombre: 'Mayo', mes: 4 },
  { nombre: 'Fase final / Copa', mes: 5 }
];

export function PlanificacionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Pretemporada');
  const [viewMode, setViewMode] = useState<'mensual' | 'semanal'>('mensual');
  const [currentYear, setCurrentYear] = useState(2026);
  
  // Database datasets
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [concepts, setConcepts] = useState<PlanningConcept[]>([]);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [sessionPlayers, setSessionPlayers] = useState<PlanningSessionPlayer[]>([]);
  const [documents, setDocuments] = useState<PlanningDocument[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  // Selected date / session states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Form states for the selected session
  const [sessionForm, setSessionForm] = useState<Partial<PlanningSession>>({
    fecha: '',
    hora_inicio: '18:30',
    hora_fin: '20:00',
    duracion_total: 90,
    campo_instalacion: 'Iparralde',
    tipo_sesion: 'Adquisición',
    objetivo_principal: 'Organización ofensiva',
    carga: 'Media',
    num_jugadores_previstos: 0,
    num_porteros_previstos: 0,
    jornada_id: '',
    objetivo_semanal: ''
  });

  const [selectedConcepts, setSelectedConcepts] = useState<{categoria: string, concepto: string}[]>([]);
  const [sessionTasks, setSessionTasks] = useState<Partial<PlanningTask>[]>([]);
  const [summonedPlayerIds, setSummonedPlayerIds] = useState<string[]>([]);
  const [sessionDocs, setSessionDocs] = useState<PlanningDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .order('dorsal', { ascending: true });
      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      // Fetch matches
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('jornada', { ascending: true });
      if (matchesErr) throw matchesErr;
      setMatches(matchesData || []);

      // Fetch planning sessions
      const { data: sessionsData, error: sessionsErr } = await supabase
        .from('planning_sessions')
        .select('*');
      // If table doesn't exist, we fallback to empty array (will show local UI state)
      if (sessionsErr && !sessionsErr.message.includes('relation')) throw sessionsErr;
      setSessions(sessionsData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from('planning_tasks')
        .select('*')
        .order('orden', { ascending: true });
      if (tasksErr && !tasksErr.message.includes('relation')) throw tasksErr;
      setTasks(tasksData || []);

      // Fetch concepts
      const { data: conceptsData, error: conceptsErr } = await supabase
        .from('planning_concepts')
        .select('*');
      if (conceptsErr && !conceptsErr.message.includes('relation')) throw conceptsErr;
      setConcepts(conceptsData || []);

      // Fetch summon roster
      const { data: rosterData, error: rosterErr } = await supabase
        .from('planning_session_players')
        .select('*');
      if (rosterErr && !rosterErr.message.includes('relation')) throw rosterErr;
      setSessionPlayers(rosterData || []);

      // Fetch documents
      const { data: docsData, error: docsErr } = await supabase
        .from('planning_documents')
        .select('*');
      if (docsErr && !docsErr.message.includes('relation')) throw docsErr;
      setDocuments(docsData || []);

    } catch (e) {
      console.error('Error fetching planning data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update current year when period selection changes to align with the 2026/2027 season
  useEffect(() => {
    const period = MESOCICLOS.find(m => m.nombre === selectedPeriod);
    if (period) {
      // 2026/27 season: Aug 2026 to May 2027.
      // Pretemporada (Aug 2026) to Dec 2026 -> 2026. Jan 2027 to May 2027 -> 2027.
      const monthIndex = period.mes;
      if (monthIndex >= 7) { // Aug, Sep, Oct, Nov, Dec
        setCurrentYear(2026);
      } else {
        setCurrentYear(2027);
      }
    }
  }, [selectedPeriod]);

  // Handle click on calendar day
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    
    // Find existing session
    const existingSession = sessions.find(s => s.fecha === dateStr);
    
    if (existingSession) {
      setSessionForm(existingSession);
      
      // Load selected concepts
      const sConcepts = concepts
        .filter(c => c.session_id === existingSession.id)
        .map(c => ({ categoria: c.categoria, concepto: c.concepto }));
      setSelectedConcepts(sConcepts);
      
      // Load tasks
      const sTasks = tasks.filter(t => t.planning_session_id === existingSession.id);
      setSessionTasks(sTasks);
      
      // Load summoned players
      const summoned = sessionPlayers
        .filter(sp => sp.session_id === existingSession.id && sp.convocado)
        .map(sp => sp.player_id);
      setSummonedPlayerIds(summoned);

      // Load documents
      const sDocs = documents.filter(d => d.planning_session_id === existingSession.id);
      setSessionDocs(sDocs);
    } else {
      // Initialize fresh session form
      setSessionForm({
        fecha: dateStr,
        hora_inicio: '18:30',
        hora_fin: '20:00',
        duracion_total: 90,
        campo_instalacion: 'Iparralde',
        tipo_sesion: 'Adquisición',
        objetivo_principal: 'Organización ofensiva',
        carga: 'Media',
        num_jugadores_previstos: players.filter(p => p.estado === 'Disponible').length,
        num_porteros_previstos: players.filter(p => p.estado === 'Disponible' && p.demarcacion === 'Portero').length,
        jornada_id: '',
        objetivo_semanal: ''
      });
      setSelectedConcepts([]);
      setSessionTasks([
        { nombre_tarea: 'Calentamiento Dinámico', tipo_tarea: 'Calentamiento', minutos: 15, orden: 0, jugadores: 20, espacio: 'Medio campo' },
        { nombre_tarea: 'Rondo de Posesión', tipo_tarea: 'Rondo', minutos: 15, orden: 1, jugadores: 20, espacio: '15x15m' }
      ]);
      setSummonedPlayerIds(players.filter(p => p.estado === 'Disponible').map(p => p.id));
      setSessionDocs([]);
    }
    setIsPanelOpen(true);
  };

  // Concept selection helper
  const handleToggleConcept = (categoria: string, concepto: string) => {
    const isSelected = selectedConcepts.some(c => c.categoria === categoria && c.concepto === concepto);
    if (isSelected) {
      setSelectedConcepts(selectedConcepts.filter(c => !(c.categoria === categoria && c.concepto === concepto)));
    } else {
      setSelectedConcepts([...selectedConcepts, { categoria, concepto }]);
    }
  };

  // Tasks helpers
  const handleAddTask = () => {
    setSessionTasks([
      ...sessionTasks,
      {
        nombre_tarea: '',
        tipo_tarea: 'Técnica',
        minutos: 15,
        orden: sessionTasks.length,
        jugadores: sessionForm.num_jugadores_previstos || 20,
        espacio: '',
        objetivo: '',
        descripcion: '',
        observaciones: ''
      }
    ]);
  };

  const handleUpdateTaskField = (index: number, field: keyof PlanningTask, value: string | number | null) => {
    const updated = [...sessionTasks];
    updated[index] = { ...updated[index], [field]: value } as Partial<PlanningTask>;
    setSessionTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setSessionTasks(sessionTasks.filter((_, i) => i !== index));
  };

  // Calculated task times vs total session duration
  const totalTasksTime = sessionTasks.reduce((acc, task) => acc + (Number(task.minutos) || 0), 0);

  // Player summon helpers
  const togglePlayerSummon = (playerId: string) => {
    if (summonedPlayerIds.includes(playerId)) {
      setSummonedPlayerIds(summonedPlayerIds.filter(id => id !== playerId));
    } else {
      setSummonedPlayerIds([...summonedPlayerIds, playerId]);
    }
  };

  // Document uploader helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sessionForm.id && !sessionForm.fecha) {
      alert('Guarda la sesión primero para poder adjuntar documentos.');
      return;
    }

    try {
      setUploadingDoc(true);

      // Create session first if it doesn't have an ID
      let sessionId = sessionForm.id;
      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('planning_sessions')
          .insert([sessionForm])
          .select()
          .single();
        if (sErr) throw sErr;
        sessionId = newSession.id;
        setSessionForm(newSession);
        // Refresh sessions dataset
        setSessions(prev => [...prev, newSession]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
      const filePath = `sessions/${fileName}`;

      // Upload file to storage
      const { error: uploadErr } = await supabase.storage
        .from('planning-documents')
        .upload(filePath, file);

      if (uploadErr) {
        throw new Error(`Error subiendo archivo: ${uploadErr.message}. Verifica que el bucket "planning-documents" esté creado.`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('planning-documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save document to table planning_documents
      const docPayload = {
        planning_session_id: sessionId,
        nombre_documento: file.name,
        tipo_documento: 'PDF de sesión',
        url_storage: publicUrl
      };

      const { data: insertedDoc, error: dbErr } = await supabase
        .from('planning_documents')
        .insert([docPayload])
        .select()
        .single();

      if (dbErr) throw dbErr;

      setSessionDocs(prev => [...prev, insertedDoc]);
      setDocuments(prev => [...prev, insertedDoc]);
      alert('Documento subido correctamente!');
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Error al subir el archivo.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string, urlStorage: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
    try {
      // Extract file path from public URL
      // E.g., https://.../storage/v1/object/public/planning-documents/sessions/file.pdf
      const pathParts = urlStorage.split('/planning-documents/');
      if (pathParts.length > 1) {
        const relativePath = pathParts[1];
        await supabase.storage.from('planning-documents').remove([relativePath]);
      }

      const { error: dbErr } = await supabase
        .from('planning_documents')
        .delete()
        .eq('id', docId);

      if (dbErr) throw dbErr;

      setSessionDocs(prev => prev.filter(d => d.id !== docId));
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e: unknown) {
      console.error(e);
      alert('Error al eliminar el documento de la base de datos.');
    }
  };

  // Save/Create Session complete handler
  const handleSaveSession = async () => {
    try {
      setSaving(true);
      const isNew = !sessionForm.id;
      
      let sessionId = sessionForm.id;

      // 1. Save main session
      if (isNew) {
        const { data: newSession, error: sErr } = await supabase
          .from('planning_sessions')
          .insert([sessionForm])
          .select()
          .single();
        if (sErr) throw sErr;
        sessionId = newSession.id;
        setSessionForm(newSession);
        setSessions(prev => [...prev, newSession]);
      } else {
        const { error: sErr } = await supabase
          .from('planning_sessions')
          .update(sessionForm)
          .eq('id', sessionId);
        if (sErr) throw sErr;
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...sessionForm } as PlanningSession : s));
      }

      // 2. Save concepts (Delete old, Insert new)
      const { error: cDeleteErr } = await supabase
        .from('planning_concepts')
        .delete()
        .eq('session_id', sessionId);
      if (cDeleteErr) throw cDeleteErr;

      if (selectedConcepts.length > 0) {
        const conceptPayloads = selectedConcepts.map(c => ({
          session_id: sessionId,
          categoria: c.categoria,
          concepto: c.concepto
        }));
        const { data: newConcepts, error: cInsertErr } = await supabase
          .from('planning_concepts')
          .insert(conceptPayloads)
          .select();
        if (cInsertErr) throw cInsertErr;
        
        // Refresh local concepts list
        setConcepts(prev => [
          ...prev.filter(c => c.session_id !== sessionId),
          ...(newConcepts || [])
        ]);
      } else {
        setConcepts(prev => prev.filter(c => c.session_id !== sessionId));
      }

      // 3. Save tasks (Delete old, Insert new with correct order)
      const { error: tDeleteErr } = await supabase
        .from('planning_tasks')
        .delete()
        .eq('planning_session_id', sessionId);
      if (tDeleteErr) throw tDeleteErr;

      if (sessionTasks.length > 0) {
        const taskPayloads = sessionTasks.map((t, idx) => ({
          planning_session_id: sessionId,
          nombre_tarea: t.nombre_tarea || `Tarea ${idx + 1}`,
          tipo_tarea: t.tipo_tarea || 'Técnica',
          minutos: Number(t.minutos) || 10,
          jugadores: t.jugadores ? Number(t.jugadores) : null,
          espacio: t.espacio || null,
          objetivo: t.objetivo || null,
          descripcion: t.descripcion || null,
          observaciones: t.observaciones || null,
          orden: idx
        }));
        const { data: newTasks, error: tInsertErr } = await supabase
          .from('planning_tasks')
          .insert(taskPayloads)
          .select();
        if (tInsertErr) throw tInsertErr;

        setTasks(prev => [
          ...prev.filter(t => t.planning_session_id !== sessionId),
          ...(newTasks || [])
        ]);
        setSessionTasks(newTasks || []);
      } else {
        setTasks(prev => prev.filter(t => t.planning_session_id !== sessionId));
      }

      // 4. Save Summoned Players (Delete old, Insert new)
      const { error: rDeleteErr } = await supabase
        .from('planning_session_players')
        .delete()
        .eq('session_id', sessionId);
      if (rDeleteErr) throw rDeleteErr;

      if (summonedPlayerIds.length > 0) {
        const playerPayloads = summonedPlayerIds.map(pId => ({
          session_id: sessionId,
          player_id: pId,
          convocado: true
        }));
        const { data: newPlayers, error: rInsertErr } = await supabase
          .from('planning_session_players')
          .insert(playerPayloads)
          .select();
        if (rInsertErr) throw rInsertErr;

        setSessionPlayers(prev => [
          ...prev.filter(sp => sp.session_id !== sessionId),
          ...(newPlayers || [])
        ]);
      } else {
        setSessionPlayers(prev => prev.filter(sp => sp.session_id !== sessionId));
      }

      alert('¡Sesión guardada con éxito en Supabase!');
      setIsPanelOpen(false);
    } catch (e: unknown) {
      console.error(e);
      alert(`Error al guardar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // Calendar calculations
  const getDaysInMonth = (year: number, monthIndex: number) => {
    // monthIndex is 0-indexed (0 = Jan, 7 = Aug)
    const date = new Date(year, monthIndex, 1);
    const days = [];
    while (date.getMonth() === monthIndex) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const periodObj = MESOCICLOS.find(m => m.nombre === selectedPeriod) || MESOCICLOS[0];
  const monthDays = getDaysInMonth(currentYear, periodObj.mes);
  
  // Renders correct padding for monthly calendar grid
  const firstDayOfWeek = (monthDays[0]?.getDay() + 6) % 7; // Monday 0, Sunday 6

  // Detect regular training days: Monday (1), Tuesday (2), Thursday (4), Friday (5)
  const isDefaultTrainingDay = (date: Date) => {
    const day = date.getDay();
    return [1, 2, 4, 5].includes(day);
  };

  // Detect match days: Saturday (6), Sunday (0)
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return [0, 6].includes(day);
  };

  // Format date helper: YYYY-MM-DD
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Export season planning (local helper mock)
  const handleExportPlan = () => {
    const headers = ['Fecha', 'Tipo', 'Objetivo Principal', 'Carga', 'Instalación', 'Tareas Count', 'Conceptos'];
    const rows = sessions.map(s => {
      const sTasks = tasks.filter(t => t.planning_session_id === s.id);
      const sConcepts = concepts.filter(c => c.session_id === s.id).map(c => c.concepto);
      return [
        s.fecha,
        s.tipo_sesion || '',
        s.objetivo_principal || '',
        s.carga || '',
        s.campo_instalacion || '',
        sTasks.length,
        sConcepts.join('; ')
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `planificacion_indautxu_${selectedPeriod.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none">
      {/* A) Cabecera superior */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-[#CC0E21]" />
            PLANIFICACIÓN
          </h1>
          <p className="text-slate-400 text-sm">
            Organización de temporada, microciclos, sesiones y conceptos de trabajo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => handleDayClick(formatDateString(new Date()))} 
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Crear Sesión
          </Button>

          <Button 
            variant={viewMode === 'mensual' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('mensual')} 
            className="text-xs px-3 py-2"
          >
            Vista mensual
          </Button>
          
          <Button 
            variant={viewMode === 'semanal' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('semanal')} 
            className="text-xs px-3 py-2"
          >
            Vista semanal
          </Button>

          <Button 
            variant="secondary" 
            onClick={handleExportPlan} 
            className="flex items-center gap-1 text-xs px-3 py-2"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* B) Selector de mesociclo / mes */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PERIODO DE TRABAJO:
            </span>
            <div className="flex items-center gap-1 bg-slate-955 rounded-xl border border-slate-800 p-1">
              {MESOCICLOS.map(m => (
                <button
                  key={m.nombre}
                  onClick={() => setSelectedPeriod(m.nombre)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedPeriod === m.nombre
                      ? 'bg-[#CC0E21] text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-slate-400 font-semibold bg-slate-900 border border-slate-800/60 px-3 py-2 rounded-xl">
            Año Planificación: <span className="text-white font-black">{currentYear}</span>
          </div>
        </div>
      </div>

      {/* C) Calendario / Vista Semanal */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Cargando planificación...</div>
      ) : viewMode === 'mensual' ? (
        /* VISTA MENSUAL */
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty padding days for calendar alignment */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[110px] rounded-xl bg-slate-900/10 border border-transparent" />
            ))}

            {/* Days in Month */}
            {monthDays.map(dateObj => {
              const dateStr = formatDateString(dateObj);
              const isDefaultTrain = isDefaultTrainingDay(dateObj);
              const isMatchDay = isWeekend(dateObj);
              const session = sessions.find(s => s.fecha === dateStr);
              
              // Load tags/concepts for badges
              const sConcepts = concepts.filter(c => c.session_id === session?.id);
              const sDocs = documents.filter(d => d.planning_session_id === session?.id);

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={`min-h-[110px] p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
                    session 
                      ? 'bg-slate-900/80 border-[#CC0E21]/40 shadow-lg shadow-[#CC0E21]/5' 
                      : isDefaultTrain 
                        ? 'bg-slate-900/30 border-blue-900/30' 
                        : isMatchDay 
                          ? 'bg-red-950/10 border-red-950/20'
                          : 'bg-slate-950/20 border-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${session ? 'text-[#CC0E21]' : 'text-slate-400'}`}>
                      {dateObj.getDate()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {isMatchDay ? 'Partido' : isDefaultTrain ? 'Entrenamiento' : 'Recup.'}
                    </span>
                  </div>

                  {session ? (
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[10px] font-black text-white truncate">
                        {session.tipo_sesion}
                      </div>
                      <div className="text-[9px] font-medium text-slate-400 truncate">
                        {session.objetivo_principal}
                      </div>
                      
                      {/* Chips indicators */}
                      <div className="flex flex-wrap gap-1">
                        {sConcepts.slice(0, 2).map((c, i) => (
                          <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-bold max-w-[50px] truncate">
                            {c.concepto}
                          </span>
                        ))}
                        {sDocs.length > 0 && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-blue-950 text-blue-300 font-black">
                            PDF
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col items-center justify-center">
                      <span className="text-[9px] text-slate-600 font-bold group-hover:text-slate-400">
                        + Añadir
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA SEMANAL */
        <div className="space-y-6">
          {/* We chunk the monthDays into weeks (Mon to Sun) */}
          {Array.from({ length: Math.ceil((monthDays.length + firstDayOfWeek) / 7) }).map((_, weekIdx) => {
            const startDayIdx = weekIdx * 7 - firstDayOfWeek;
            const weekDays = Array.from({ length: 7 }).map((_, dayOffset) => {
              const dayIdx = startDayIdx + dayOffset;
              return dayIdx >= 0 && dayIdx < monthDays.length ? monthDays[dayIdx] : null;
            }).filter(Boolean) as Date[];

            if (weekDays.length === 0) return null;

            // Calculate accumulated weekly training load
            const weekSessions = sessions.filter(s => weekDays.some(wd => s.fecha === formatDateString(wd)));
            
            return (
              <div key={weekIdx} className="border border-slate-800/80 bg-slate-900/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#CC0E21]" />
                    Semana {weekIdx + 1} ({weekDays[0] && formatDateString(weekDays[0])} al {weekDays[weekDays.length-1] && formatDateString(weekDays[weekDays.length-1])})
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <div>Sesiones: <span className="text-white">{weekSessions.length}</span></div>
                    <div>Carga Semanal: <span className="text-[#CC0E21]">
                      {weekSessions.some(s => s.carga === 'Muy alta') ? 'Muy Alta' : 
                       weekSessions.some(s => s.carga === 'Alta') ? 'Alta' : 'Media'}
                    </span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekDays.map(dateObj => {
                    const dateStr = formatDateString(dateObj);
                    const isDefaultTrain = isDefaultTrainingDay(dateObj);
                    const isMatchDay = isWeekend(dateObj);
                    const session = sessions.find(s => s.fecha === dateStr);
                    const sDocs = documents.filter(d => d.planning_session_id === session?.id);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayClick(dateStr)}
                        className={`p-3 rounded-xl border cursor-pointer hover:border-slate-700 transition-colors flex flex-col justify-between min-h-[140px] ${
                          session 
                            ? 'bg-slate-900/40 border-[#CC0E21]/20' 
                            : isDefaultTrain 
                              ? 'bg-slate-900/10 border-blue-900/10'
                              : isMatchDay 
                                ? 'bg-red-950/5 border-red-900/10'
                                : 'bg-transparent border-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold">
                              {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()]}
                            </span>
                            <span className="text-[10px] font-black text-slate-400">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          {session ? (
                            <div className="mt-2 space-y-1.5">
                              <span className="text-[10px] font-black text-white block leading-tight">
                                {session.tipo_sesion}
                              </span>
                              <span className="text-[9px] text-slate-400 block leading-tight">
                                {session.objetivo_principal}
                              </span>
                              {session.carga && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                  session.carga === 'Muy alta' || session.carga === 'Alta' 
                                    ? 'bg-red-950 text-red-400' 
                                    : 'bg-green-950 text-green-400'
                                }`}>
                                  {session.carga}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-600 mt-2 block">Libre</span>
                          )}
                        </div>

                        {sDocs.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-[9px] text-blue-400 font-black">
                            <FileText className="h-3 w-3" />
                            PDF cargado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* D) Panel de sesión del día seleccionado (Modal de Edición/Creación) */}
      <Modal
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={selectedDate ? `SESIÓN DE ENTRENAMIENTO - ${selectedDate}` : 'DETALLE DE LA SESIÓN'}
      >
        <div className="space-y-6 text-slate-100">
          
          {/* DATOS BÁSICOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              DATOS BÁSICOS
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Hora Inicio</label>
                <input
                  type="text"
                  placeholder="18:30"
                  value={sessionForm.hora_inicio || ''}
                  onChange={e => setSessionForm({...sessionForm, hora_inicio: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Hora Fin</label>
                <input
                  type="text"
                  placeholder="20:00"
                  value={sessionForm.hora_fin || ''}
                  onChange={e => setSessionForm({...sessionForm, hora_fin: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Duración Total (min)</label>
                <input
                  type="number"
                  value={sessionForm.duracion_total || 0}
                  onChange={e => setSessionForm({...sessionForm, duracion_total: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Campo / Instalación</label>
                <input
                  type="text"
                  placeholder="Iparralde"
                  value={sessionForm.campo_instalacion || ''}
                  onChange={e => setSessionForm({...sessionForm, campo_instalacion: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Tipo de Sesión</label>
                <select
                  value={sessionForm.tipo_sesion || ''}
                  onChange={e => setSessionForm({...sessionForm, tipo_sesion: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                >
                  {SESION_TIPOS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Carga de la Sesión</label>
                <select
                  value={sessionForm.carga || ''}
                  onChange={e => setSessionForm({...sessionForm, carga: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                >
                  {CARGAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Nº Jugadores previstos</label>
                <input
                  type="number"
                  value={sessionForm.num_jugadores_previstos || 0}
                  onChange={e => setSessionForm({...sessionForm, num_jugadores_previstos: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Nº Porteros previstos</label>
                <input
                  type="number"
                  value={sessionForm.num_porteros_previstos || 0}
                  onChange={e => setSessionForm({...sessionForm, num_porteros_previstos: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>
            </div>
          </div>

          {/* OBJETIVO PRINCIPAL */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              OBJETIVO PRINCIPAL
            </h3>
            <select
              value={sessionForm.objetivo_principal || ''}
              onChange={e => setSessionForm({...sessionForm, objetivo_principal: e.target.value})}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
            >
              {OBJETIVOS_PRINCIPALES.map(obj => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </div>

          {/* CONCEPTOS A TRABAJAR */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              CONCEPTOS A TRABAJAR
            </h3>
            
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(CONCEPT_OPTIONS).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{category}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(item => {
                      const isSelected = selectedConcepts.some(c => c.categoria === category && c.concepto === item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleConcept(category, item)}
                          className={`text-[9px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-[#CC0E21]/20 text-white border-[#CC0E21]'
                              : 'bg-slate-950/60 text-slate-400 border-slate-850 hover:border-slate-700'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TAREAS DE LA SESIÓN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <h3 className="text-sm font-black text-[#CC0E21] uppercase tracking-wider">
                TAREAS DEL ENTRENAMIENTO
              </h3>
              
              <button
                type="button"
                onClick={handleAddTask}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3 w-3" /> Añadir Tarea
              </button>
            </div>

            {/* Time Warning or Validation indicator */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400 font-medium">Suma de tareas:</span>
                <span className={`font-black ${totalTasksTime > (sessionForm.duracion_total || 0) ? 'text-red-500' : 'text-green-400'}`}>
                  {totalTasksTime} min
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-350 font-bold">{sessionForm.duracion_total || 0} min total</span>
              </div>

              {totalTasksTime > (sessionForm.duracion_total || 0) && (
                <div className="flex items-center gap-1 text-red-500 text-[10px] font-black">
                  <AlertTriangle className="h-3 w-3" /> Excede la duración
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {sessionTasks.map((task, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-850 bg-slate-950/40 space-y-2 relative group">
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(idx)}
                    className="absolute right-2 top-2 text-slate-650 hover:text-red-500"
                    title="Eliminar tarea"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Nombre de la tarea</label>
                      <input
                        type="text"
                        placeholder="Nombre de la tarea..."
                        value={task.nombre_tarea || ''}
                        onChange={e => handleUpdateTaskField(idx, 'nombre_tarea', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Minutos</label>
                      <input
                        type="number"
                        placeholder="15"
                        value={task.minutos || 0}
                        onChange={e => handleUpdateTaskField(idx, 'minutos', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Tipo Tarea</label>
                      <select
                        value={task.tipo_tarea || ''}
                        onChange={e => handleUpdateTaskField(idx, 'tipo_tarea', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      >
                        {TAREAS_TIPOS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Nº Jugadores</label>
                      <input
                        type="number"
                        placeholder="20"
                        value={task.jugadores || ''}
                        onChange={e => handleUpdateTaskField(idx, 'jugadores', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Espacio Juego</label>
                      <input
                        type="text"
                        placeholder="Medio campo"
                        value={task.espacio || ''}
                        onChange={e => handleUpdateTaskField(idx, 'espacio', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Objetivo / Descripción</label>
                    <textarea
                      placeholder="Escribe el objetivo y la descripción aquí..."
                      value={task.descripcion || ''}
                      onChange={e => handleUpdateTaskField(idx, 'descripcion', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21] h-12 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* JUGADORES DISPONIBLES */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              JUGADORES DISPONIBLES
            </h3>

            <div className="grid grid-cols-4 gap-1 pb-2 border-b border-slate-850 text-center">
              <div className="text-[10px] text-slate-500">
                Disponibles: <span className="text-green-400 font-bold">{players.filter(p => p.estado === 'Disponible').length}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Lesionados: <span className="text-red-400 font-bold">{players.filter(p => p.estado === 'Lesionado').length}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Duda: <span className="text-amber-400 font-bold">{players.filter(p => p.estado === 'Duda').length}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Convocados: <span className="text-blue-400 font-bold">{summonedPlayerIds.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {players.map(p => {
                const isSelected = summonedPlayerIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayerSummon(p.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#CC0E21]/15 border-[#CC0E21]/40 text-slate-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-450 hover:border-slate-800'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                      isSelected ? 'bg-[#CC0E21] border-[#CC0E21] text-white' : 'border-slate-800'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    
                    <div className="truncate">
                      <span className="text-[10px] font-black mr-1">#{p.dorsal}</span>
                      <span className="text-[10px] font-bold">{p.nombre}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DOCUMENTOS Y PDF */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              DOCUMENTOS Y PDF
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-slate-800 hover:border-blue-500 rounded-xl bg-slate-950/60 text-slate-400 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Upload className="h-4 w-4" />
                    {uploadingDoc ? 'Subiendo...' : 'Subir PDF de Sesión'}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingDoc}
                  />
                </label>
              </div>

              {sessionDocs.length > 0 ? (
                <div className="space-y-2">
                  {sessionDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850">
                      <div className="flex items-center gap-2 text-xs truncate">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-slate-300 font-bold truncate max-w-[200px]" title={doc.nombre_documento}>
                          {doc.nombre_documento}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={doc.url_storage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Abrir PDF"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id, doc.url_storage)}
                          className="p-1 rounded text-slate-650 hover:text-red-500"
                          title="Eliminar PDF"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 block">No hay documentos PDF subidos en esta sesión.</span>
              )}
            </div>
          </div>

          {/* RELACIÓN CON JORNADAS / PARTIDOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              VINCULAR A JORNADA
            </h3>

            <select
              value={sessionForm.jornada_id || ''}
              onChange={e => setSessionForm({...sessionForm, jornada_id: e.target.value || null})}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
            >
              <option value="">Ninguna jornada vinculada</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  Jornada {m.jornada} - vs {m.rival}
                </option>
              ))}
            </select>

            <div>
              <label className="text-[10px] text-slate-450 font-bold block mb-1">Objetivo Semanal de la Jornada</label>
              <input
                type="text"
                placeholder="Ej: Preparar presión alta rival"
                value={sessionForm.objetivo_semanal || ''}
                onChange={e => setSessionForm({...sessionForm, objetivo_semanal: e.target.value})}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
              />
            </div>
          </div>

          {/* PANEL FOOTER - SAVE / CANCEL */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsPanelOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveSession} loading={saving} className="text-xs flex items-center gap-1">
              <Save className="h-4 w-4" />
              Guardar Sesión
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
