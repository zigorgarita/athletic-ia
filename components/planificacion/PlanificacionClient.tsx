'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Download, Upload, 
  Trash2, Save, Clock, Activity, Check, X, ExternalLink,
  Copy, Printer, Info, ShieldAlert, RefreshCw, BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  Player, Match, PlanningSession, 
  PlanningConcept, PlanningTask, PlanningDocument, PlanningSessionPlayer,
  PlanningTaskLibrary
} from '@/types';
import { BibliotecaTareasModal } from './BibliotecaTareasModal';

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

const CARGAS = ['Baja', 'Media', 'Alta', 'Recuperación', 'Activación prepartido'];
const ESTADOS_SESION = ['Borrador', 'Planificada', 'Realizada', 'Suspendida'];
const FILTROS_TIPO = ['Todos', 'Pretemporada', 'Liga', 'Copa', 'Amistoso'];
const STAFF_ROLES = [
  'Primer Entrenador',
  'Segundo Entrenador',
  'Preparador Físico',
  'Entrenador de Porteros',
  'Analista',
  'Coordinador',
  'Médico/Fisio',
  'Otro'
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

const TAREAS_TIPOS = [
  'Calentamiento', 'Rondo', 'Activación', 'Técnica', 
  'Posesión', 'Juego de posición', 'Rueda de pase', 
  'Finalización', 'Juego reducido', 'Partido condicionado', 
  'ABP', 'Vuelta a la calma'
];

const DEFAULT_CHECKLIST = {
  balones: 15,
  petos: [] as string[],
  conos: 0,
  chinos: 0,
  picas: 0,
  vallas: 0,
  estacas: 0,
  porterias_moviles: 0,
  escaleras_coordinacion: 0,
  gomas_elasticas: 0,
  cronometro: false,
  gps: false,
  tablet: false,
  altavoz: false,
  agua: true,
  botiquin: true,
  personalizados: [] as { name: string; quantity: number }[]
};

export function PlanificacionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Pretemporada');
  const [viewMode, setViewMode] = useState<'mensual' | 'semanal'>('mensual');
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  
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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

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
    objetivo_semanal: '',
    estado: 'Planificada',
    evaluacion_completada: false,
    evaluacion_duracion_real: null,
    evaluacion_observaciones: '',
    categoria_filtro: 'Liga',
    hora_convocatoria: '18:00',
    observaciones_convocatoria: '',
    checklist_material: { ...DEFAULT_CHECKLIST }
  });

  const [selectedConcepts, setSelectedConcepts] = useState<{categoria: string, concepto: string}[]>([]);
  const [sessionTasks, setSessionTasks] = useState<Partial<PlanningTask>[]>([]);
  const [summonedPlayerIds, setSummonedPlayerIds] = useState<string[]>([]);
  const [sessionDocs, setSessionDocs] = useState<PlanningDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Custom material helper state
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customMaterialQty, setCustomMaterialQty] = useState(1);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .order('dorsal', { ascending: true });
      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('jornada', { ascending: true });
      if (matchesErr) throw matchesErr;
      setMatches(matchesData || []);

      const { data: sessionsData, error: sessionsErr } = await supabase
        .from('planning_sessions')
        .select('*');
      if (sessionsErr && !sessionsErr.message.includes('relation')) throw sessionsErr;
      setSessions(sessionsData || []);

      const { data: tasksData, error: tasksErr } = await supabase
        .from('planning_tasks')
        .select('*')
        .order('orden', { ascending: true });
      if (tasksErr && !tasksErr.message.includes('relation')) throw tasksErr;
      setTasks(tasksData || []);

      const { data: conceptsData, error: conceptsErr } = await supabase
        .from('planning_concepts')
        .select('*');
      if (conceptsErr && !conceptsErr.message.includes('relation')) throw conceptsErr;
      setConcepts(conceptsData || []);

      const { data: rosterData, error: rosterErr } = await supabase
        .from('planning_session_players')
        .select('*');
      if (rosterErr && !rosterErr.message.includes('relation')) throw rosterErr;
      setSessionPlayers(rosterData || []);

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

  useEffect(() => {
    const period = MESOCICLOS.find(m => m.nombre === selectedPeriod);
    if (period) {
      const monthIndex = period.mes;
      if (monthIndex >= 7) { 
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
      setSessionForm({
        ...existingSession,
        checklist_material: existingSession.checklist_material || { ...DEFAULT_CHECKLIST }
      });
      
      const sConcepts = concepts
        .filter(c => c.session_id === existingSession.id)
        .map(c => ({ categoria: c.categoria, concepto: c.concepto }));
      setSelectedConcepts(sConcepts);
      
      const sTasks = tasks.filter(t => t.planning_session_id === existingSession.id);
      setSessionTasks(sTasks);
      
      const summoned = sessionPlayers
        .filter(sp => sp.session_id === existingSession.id && sp.convocado)
        .map(sp => sp.player_id);
      setSummonedPlayerIds(summoned);

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
        objetivo_semanal: '',
        estado: 'Planificada',
        evaluacion_completada: false,
        evaluacion_duracion_real: 90,
        evaluacion_observaciones: '',
        categoria_filtro: selectedPeriod === 'Pretemporada' ? 'Pretemporada' : 'Liga',
        hora_convocatoria: '18:00',
        observaciones_convocatoria: '',
        checklist_material: { ...DEFAULT_CHECKLIST }
      });
      setSelectedConcepts([]);
      setSessionTasks([
        { nombre_tarea: 'Calentamiento Dinámico', tipo_tarea: 'Calentamiento', minutos: 15, orden: 0, jugadores: 20, espacio: 'Medio campo', responsable_staff: 'Preparador Físico' },
        { nombre_tarea: 'Rondo de Posesión', tipo_tarea: 'Rondo', minutos: 15, orden: 1, jugadores: 20, espacio: '15x15m', responsable_staff: 'Segundo Entrenador' }
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
        observaciones: '',
        responsable_staff: 'Primer Entrenador'
      }
    ]);
  };

  const handleUpdateTaskField = (index: number, field: keyof PlanningTask, value: string | number | boolean | null | undefined) => {
    const updated = [...sessionTasks];
    updated[index] = { ...updated[index], [field]: value } as Partial<PlanningTask>;
    setSessionTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setSessionTasks(sessionTasks.filter((_, i) => i !== index));
  };

  // Save exercise to library
  const handleSaveToLibrary = async (task: Partial<PlanningTask>) => {
    if (!task.nombre_tarea || !task.descripcion) {
      alert('La tarea debe tener al menos un nombre y una descripción para guardarse en la biblioteca.');
      return;
    }
    try {
      const payload = {
        nombre: task.nombre_tarea,
        tipo_tarea: task.tipo_tarea || 'Rondo',
        minutos_defecto: Number(task.minutos) || 15,
        jugadores_defecto: task.jugadores ? Number(task.jugadores) : null,
        espacio_defecto: task.espacio || null,
        objetivo: task.objetivo || null,
        descripcion: task.descripcion,
        observaciones: task.observaciones || null,
        creado_por: task.responsable_staff || 'Cuerpo Técnico'
      };

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'planning_task_library',
        payload,
        conflict_columns: ['nombre'],
        staff_passkey: passkey
      });
      if (error) throw error;
      alert(`¡"${task.nombre_tarea}" se ha guardado/actualizado correctamente en la Biblioteca Táctica!`);
    } catch (err: unknown) {
      console.error(err);
      alert(`Error al guardar en la biblioteca: ${(err as Error).message}`);
    }
  };

  // Import task from library
  const handleImportFromLibrary = (libTask: PlanningTaskLibrary) => {
    setSessionTasks([
      ...sessionTasks,
      {
        nombre_tarea: libTask.nombre,
        tipo_tarea: libTask.tipo_tarea,
        minutos: libTask.minutos_defecto,
        jugadores: libTask.jugadores_defecto,
        espacio: libTask.espacio_defecto,
        objetivo: libTask.objetivo || '',
        descripcion: libTask.descripcion,
        observaciones: libTask.observaciones || '',
        responsable_staff: libTask.creado_por || 'Primer Entrenador',
        orden: sessionTasks.length
      }
    ]);
    setIsLibraryOpen(false);
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

  // Material helpers
  const updateChecklistInt = (key: string, value: number) => {
    const currentList = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    setSessionForm({
      ...sessionForm,
      checklist_material: {
        ...currentList,
        [key]: Math.max(0, value)
      }
    });
  };

  const updateChecklistBool = (key: string, value: boolean) => {
    const currentList = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    setSessionForm({
      ...sessionForm,
      checklist_material: {
        ...currentList,
        [key]: value
      }
    });
  };

  const handleTogglePetoColor = (color: string) => {
    const currentList = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    const currentPetos = currentList.petos || [];
    let updatedPetos = [];
    if (currentPetos.includes(color)) {
      updatedPetos = currentPetos.filter((c: string) => c !== color);
    } else {
      updatedPetos = [...currentPetos, color];
    }
    setSessionForm({
      ...sessionForm,
      checklist_material: {
        ...currentList,
        petos: updatedPetos
      }
    });
  };

  const handleAddCustomMaterial = () => {
    if (!customMaterialName.trim()) return;
    const currentList = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    const currentCustoms = currentList.personalizados || [];
    
    // Check if already exists
    const existsIdx = currentCustoms.findIndex((c: { name: string; quantity: number }) => c.name.toLowerCase() === customMaterialName.trim().toLowerCase());
    const updatedCustoms = [...currentCustoms];
    if (existsIdx > -1) {
      updatedCustoms[existsIdx].quantity += customMaterialQty;
    } else {
      updatedCustoms.push({ name: customMaterialName.trim(), quantity: customMaterialQty });
    }

    setSessionForm({
      ...sessionForm,
      checklist_material: {
        ...currentList,
        personalizados: updatedCustoms
      }
    });
    setCustomMaterialName('');
    setCustomMaterialQty(1);
  };

  const handleRemoveCustomMaterial = (name: string) => {
    const currentList = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    const currentCustoms = currentList.personalizados || [];
    const updatedCustoms = currentCustoms.filter((c: { name: string; quantity: number }) => c.name !== name);
    setSessionForm({
      ...sessionForm,
      checklist_material: {
        ...currentList,
        personalizados: updatedCustoms
      }
    });
  };

  // Duplicate session handler
  const handleDuplicateSession = async () => {
    const newDateStr = prompt('Introduce la nueva fecha para duplicar esta sesión (Formato: YYYY-MM-DD):', sessionForm.fecha);
    if (!newDateStr) return;

    // Check regex YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateStr)) {
      alert('Fecha incorrecta. Por favor, usa el formato YYYY-MM-DD.');
      return;
    }

    // Verify if already exists
    const duplicateConflict = sessions.find(s => s.fecha === newDateStr);
    if (duplicateConflict) {
      if (!confirm(`Ya existe una sesión programada para el día ${newDateStr}. ¿Deseas sobreescribirla?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      
      // 1. Save main session
      const duplicatedSessionPayload = {
        fecha: newDateStr,
        hora_inicio: sessionForm.hora_inicio,
        hora_fin: sessionForm.hora_fin,
        duracion_total: sessionForm.duracion_total,
        campo_instalacion: sessionForm.campo_instalacion,
        tipo_sesion: sessionForm.tipo_sesion,
        objetivo_principal: sessionForm.objetivo_principal,
        carga: sessionForm.carga,
        num_jugadores_previstos: sessionForm.num_jugadores_previstos,
        num_porteros_previstos: sessionForm.num_porteros_previstos,
        jornada_id: sessionForm.jornada_id || null,
        objetivo_semanal: sessionForm.objetivo_semanal,
        estado: 'Borrador', // Por defecto borrador la copia
        evaluacion_completada: false,
        evaluacion_duracion_real: null,
        evaluacion_observaciones: '',
        categoria_filtro: sessionForm.categoria_filtro,
        hora_convocatoria: sessionForm.hora_convocatoria,
        observaciones_convocatoria: sessionForm.observaciones_convocatoria,
        checklist_material: sessionForm.checklist_material
      };

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: newSession, error: sErr } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'planning_sessions',
          payload: duplicatedSessionPayload,
          conflict_columns: null,
          staff_passkey: passkey
        });
      if (sErr) throw sErr;

      const newSessionId = newSession.id;

      // 2. Clone concepts
      if (selectedConcepts.length > 0) {
        const conceptPayloads = selectedConcepts.map(c => ({
          session_id: newSessionId,
          categoria: c.categoria,
          concepto: c.concepto
        }));
        const { error: cErr } = await supabase.rpc('exec_secure_bulk_upsert', {
          target_table: 'planning_concepts',
          payloads: conceptPayloads,
          conflict_columns: null,
          staff_passkey: passkey
        });
        if (cErr) throw cErr;
      }

      // 3. Clone tasks
      if (sessionTasks.length > 0) {
        const taskPayloads = sessionTasks.map((t, idx) => ({
          planning_session_id: newSessionId,
          nombre_tarea: t.nombre_tarea || `Tarea ${idx + 1}`,
          tipo_tarea: t.tipo_tarea || 'Técnica',
          minutos: Number(t.minutos) || 10,
          jugadores: t.jugadores ? Number(t.jugadores) : null,
          espacio: t.espacio || null,
          objetivo: t.objetivo || null,
          descripcion: t.descripcion || null,
          observaciones: t.observaciones || null,
          orden: idx,
          responsable_staff: t.responsable_staff || 'Primer Entrenador',
          responsable_staff_otro: t.responsable_staff_otro || null
        }));
        const { error: tErr } = await supabase.rpc('exec_secure_bulk_upsert', {
          target_table: 'planning_tasks',
          payloads: taskPayloads,
          conflict_columns: null,
          staff_passkey: passkey
        });
        if (tErr) throw tErr;
      }

      // 4. Clone summoned list
      if (summonedPlayerIds.length > 0) {
        const playerPayloads = summonedPlayerIds.map(pId => ({
          session_id: newSessionId,
          player_id: pId,
          convocado: true
        }));
        const { error: rErr } = await supabase.rpc('exec_secure_bulk_upsert', {
          target_table: 'planning_session_players',
          payloads: playerPayloads,
          conflict_columns: null,
          staff_passkey: passkey
        });
        if (rErr) throw rErr;
      }

      alert(`Sesión duplicada con éxito para el día ${newDateStr}.`);
      setIsPanelOpen(false);
      fetchData(); // Refresh all calendar
    } catch (e: unknown) {
      console.error(e);
      alert(`Error al duplicar la sesión: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // Formato y copia a WhatsApp
  const handleCopyWhatsApp = () => {
    const listMaterial = sessionForm.checklist_material || { ...DEFAULT_CHECKLIST };
    
    // Build list of summoned
    const summonedPlayersList = players
      .filter(p => summonedPlayerIds.includes(p.id))
      .map(p => ` - #${p.dorsal} ${p.nombre} ${p.apellidos || ''}`)
      .join('\n');

    // Build list of injuries/bajas
    const bajasList = players
      .filter(p => p.estado !== 'Disponible')
      .map(p => ` - ${p.nombre} ${p.apellidos || ''} (${p.estado})`)
      .join('\n') || ' - Ninguna baja';

    // Build list of staff responsible
    const staffSet = new Set<string>();
    sessionTasks.forEach(t => {
      if (t.responsable_staff === 'Otro' && t.responsable_staff_otro) {
        staffSet.add(t.responsable_staff_otro);
      } else if (t.responsable_staff) {
        staffSet.add(t.responsable_staff);
      }
    });
    const staffList = Array.from(staffSet).map(s => ` - ${s}`).join('\n') || ' - Cuerpo Técnico';

    // Build list of materials
    const activeMaterials = [];
    if (listMaterial.balones > 0) activeMaterials.push(` - Balones: ${listMaterial.balones}`);
    if (listMaterial.petos && listMaterial.petos.length > 0) activeMaterials.push(` - Petos: ${listMaterial.petos.join(', ')}`);
    if (listMaterial.conos > 0) activeMaterials.push(` - Conos: ${listMaterial.conos}`);
    if (listMaterial.chinos > 0) activeMaterials.push(` - Chinos/Discos: ${listMaterial.chinos}`);
    if (listMaterial.picas > 0) activeMaterials.push(` - Picas: ${listMaterial.picas}`);
    if (listMaterial.vallas > 0) activeMaterials.push(` - Vallas: ${listMaterial.vallas}`);
    if (listMaterial.estacas > 0) activeMaterials.push(` - Estacas: ${listMaterial.estacas}`);
    if (listMaterial.porterias_moviles > 0) activeMaterials.push(` - Porterías móviles: ${listMaterial.porterias_moviles}`);
    if (listMaterial.escaleras_coordinacion > 0) activeMaterials.push(` - Escaleras coord: ${listMaterial.escaleras_coordinacion}`);
    if (listMaterial.gomas_elasticas > 0) activeMaterials.push(` - Gomas elásticas: ${listMaterial.gomas_elasticas}`);
    if (listMaterial.cronometro) activeMaterials.push(` - Cronómetro`);
    if (listMaterial.gps) activeMaterials.push(` - Dispositivos GPS`);
    if (listMaterial.tablet) activeMaterials.push(` - Tablet/Portátil analista`);
    if (listMaterial.altavoz) activeMaterials.push(` - Altavoz vestuario`);
    if (listMaterial.agua) activeMaterials.push(` - Botellas de agua`);
    if (listMaterial.botiquin) activeMaterials.push(` - Botiquín completo`);
    
    if (listMaterial.personalizados && listMaterial.personalizados.length > 0) {
      listMaterial.personalizados.forEach((m: { name: string; quantity: number }) => {
        activeMaterials.push(` - ${m.name}: ${m.quantity}`);
      });
    }
    const materialText = activeMaterials.join('\n') || ' - Sin material específico';

    const text = `ENTRENAMIENTO INDAUTXU DH

📅 Fecha: ${sessionForm.fecha}
🕒 Hora entrenamiento: ${sessionForm.hora_inicio || '18:30'} - ${sessionForm.hora_fin || '20:00'}
🚪 Hora convocatoria: ${sessionForm.hora_convocatoria || '18:00'}
📍 Instalación: ${sessionForm.campo_instalacion || 'Iparralde'}
🎯 Objetivo sesión: ${sessionForm.objetivo_principal || 'Organización táctica'}

JUGADORES CONVOCADOS
${summonedPlayersList || ' - Ningún jugador convocado'}

BAJAS
${bajasList}

STAFF
${staffList}

MATERIAL
${materialText}

OBSERVACIONES
${sessionForm.observaciones_convocatoria || 'Sin observaciones.'}`;

    navigator.clipboard.writeText(text)
      .then(() => alert('¡Mensaje oficial de convocatoria copiado al portapapeles! Listo para pegar en WhatsApp.'))
      .catch(err => console.error('Error al copiar al portapapeles: ', err));
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

      let sessionId = sessionForm.id;
      if (!sessionId) {
        const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
        const { data: newSession, error: sErr } = await supabase
          .rpc('exec_secure_upsert', {
            target_table: 'planning_sessions',
            payload: sessionForm,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (sErr) throw sErr;
        sessionId = newSession.id;
        setSessionForm(newSession);
        setSessions(prev => [...prev, newSession]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
      const filePath = `sessions/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('planning-documents')
        .upload(filePath, file);

      if (uploadErr) {
        throw new Error(`Error subiendo archivo: ${uploadErr.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('planning-documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const docPayload = {
        planning_session_id: sessionId,
        nombre_documento: file.name,
        tipo_documento: 'PDF de sesión',
        url_storage: publicUrl
      };

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: insertedDoc, error: dbErr } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'planning_documents',
          payload: docPayload,
          conflict_columns: null,
          staff_passkey: passkey
        });

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
      const pathParts = urlStorage.split('/planning-documents/');
      if (pathParts.length > 1) {
        const relativePath = pathParts[1];
        await supabase.storage.from('planning-documents').remove([relativePath]);
      }

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: dbErr } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'planning_documents',
          record_id: docId,
          staff_passkey: passkey
        });

      if (dbErr) throw dbErr;

      setSessionDocs(prev => prev.filter(d => d.id !== docId));
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error(e);
      alert('Error al eliminar el documento.');
    }
  };

  // Save/Create Session complete handler
  const handleSaveSession = async () => {
    try {
      setSaving(true);
      const isNew = !sessionForm.id;
      let sessionId = sessionForm.id;

      // 1. Save main session
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      if (isNew) {
        const { data: newSession, error: sErr } = await supabase
          .rpc('exec_secure_upsert', {
            target_table: 'planning_sessions',
            payload: sessionForm,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (sErr) throw sErr;
        sessionId = newSession.id;
        setSessionForm(newSession);
        setSessions(prev => [...prev, newSession]);
      } else {
        const { error: sErr } = await supabase
          .rpc('exec_secure_upsert', {
            target_table: 'planning_sessions',
            payload: { ...sessionForm, id: sessionId },
            conflict_columns: ['id'],
            staff_passkey: passkey
          });
        if (sErr) throw sErr;
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...sessionForm } as PlanningSession : s));
      }

      // 2. Save concepts
      const { error: cDeleteErr } = await supabase
        .rpc('exec_secure_delete_by_col', {
          target_table: 'planning_concepts',
          col_name: 'session_id',
          col_value: sessionId,
          staff_passkey: passkey
        });
      if (cDeleteErr) throw cDeleteErr;

      if (selectedConcepts.length > 0) {
        const conceptPayloads = selectedConcepts.map(c => ({
          session_id: sessionId,
          categoria: c.categoria,
          concepto: c.concepto
        }));
        const { error: cInsertErr } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'planning_concepts',
            payloads: conceptPayloads,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (cInsertErr) throw cInsertErr;

        const { data: newConcepts } = await supabase
          .from('planning_concepts')
          .select('*')
          .eq('session_id', sessionId);
        
        setConcepts(prev => [
          ...prev.filter(c => c.session_id !== sessionId),
          ...(newConcepts || [])
        ]);
      } else {
        setConcepts(prev => prev.filter(c => c.session_id !== sessionId));
      }

      // 3. Save tasks
      const { error: tDeleteErr } = await supabase
        .rpc('exec_secure_delete_by_col', {
          target_table: 'planning_tasks',
          col_name: 'planning_session_id',
          col_value: sessionId,
          staff_passkey: passkey
        });
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
          orden: idx,
          responsable_staff: t.responsable_staff || 'Primer Entrenador',
          responsable_staff_otro: t.responsable_staff_otro || null
        }));
        const { error: tInsertErr } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'planning_tasks',
            payloads: taskPayloads,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (tInsertErr) throw tInsertErr;

        const { data: newTasks } = await supabase
          .from('planning_tasks')
          .select('*')
          .eq('planning_session_id', sessionId);

        setTasks(prev => [
          ...prev.filter(t => t.planning_session_id !== sessionId),
          ...(newTasks || [])
        ]);
        setSessionTasks(newTasks || []);
      } else {
        setTasks(prev => prev.filter(t => t.planning_session_id !== sessionId));
      }

      // 4. Save Summoned Players
      const { error: rDeleteErr } = await supabase
        .rpc('exec_secure_delete_by_col', {
          target_table: 'planning_session_players',
          col_name: 'session_id',
          col_value: sessionId,
          staff_passkey: passkey
        });
      if (rDeleteErr) throw rDeleteErr;

      if (summonedPlayerIds.length > 0) {
        const playerPayloads = summonedPlayerIds.map(pId => ({
          session_id: sessionId,
          player_id: pId,
          convocado: true
        }));
        const { error: rInsertErr } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'planning_session_players',
            payloads: playerPayloads,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (rInsertErr) throw rInsertErr;

        const { data: newPlayers } = await supabase
          .from('planning_session_players')
          .select('*')
          .eq('session_id', sessionId);

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
  
  // Padding for monthly calendar grid
  const firstDayOfWeek = (monthDays[0]?.getDay() + 6) % 7; // Monday 0, Sunday 6

  // Detect regular training days
  const isDefaultTrainingDay = (date: Date) => {
    const day = date.getDay();
    return [1, 2, 4, 5].includes(day);
  };

  // Detect match days
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

  const handleExportPlan = () => {
    const headers = ['Fecha', 'Tipo', 'Objetivo Principal', 'Carga', 'Instalación', 'Tareas Count', 'Estado', 'Categoría'];
    const rows = sessions.map(s => {
      const sTasks = tasks.filter(t => t.planning_session_id === s.id);
      return [
        s.fecha,
        s.tipo_sesion || '',
        s.objetivo_principal || '',
        s.carga || '',
        s.campo_instalacion || '',
        sTasks.length,
        s.estado || 'Planificada',
        s.categoria_filtro || 'Liga'
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

  // Filter sessions by selected category
  const filteredSessions = sessions.filter(s => {
    if (selectedFilter === 'Todos') return true;
    return s.categoria_filtro === selectedFilter;
  });

  return (
    <div className="space-y-6 select-none print:bg-white print:text-black">
      {/* Cabecera superior */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-[#CC0E21]" />
            PLANIFICACIÓN V2
          </h1>
          <p className="text-slate-400 text-sm">
            Biblioteca táctica, control de lesionados, checklist de material y automatización de cuerpo técnico.
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
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros superiores */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Microciclo / Periodo:
          </span>
          <div className="flex items-center gap-1 bg-slate-950 rounded-xl border border-slate-850 p-1 flex-wrap">
            {MESOCICLOS.map(m => (
              <button
                key={m.nombre}
                onClick={() => setSelectedPeriod(m.nombre)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedPeriod === m.nombre
                    ? 'bg-[#CC0E21] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Filtro Tipo:
          </span>
          <div className="flex gap-1 bg-slate-950 border border-slate-850 p-1 rounded-xl">
            {FILTROS_TIPO.map(t => (
              <button
                key={t}
                onClick={() => setSelectedFilter(t)}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedFilter === t
                    ? 'bg-[#CC0E21]/20 border border-[#CC0E21]/60 text-white'
                    : 'text-slate-400 border border-transparent hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendario / Vista Semanal */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 print:hidden">Cargando planificación...</div>
      ) : viewMode === 'mensual' ? (
        /* VISTA MENSUAL */
        <div className="space-y-4 print:block">
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wider print:text-black">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[110px] rounded-xl bg-slate-900/10 border border-transparent print:hidden" />
            ))}

            {monthDays.map(dateObj => {
              const dateStr = formatDateString(dateObj);
              const isDefaultTrain = isDefaultTrainingDay(dateObj);
              const isMatchDay = isWeekend(dateObj);
              const session = filteredSessions.find(s => s.fecha === dateStr);
              
              const sConcepts = concepts.filter(c => c.session_id === session?.id);
              const sDocs = documents.filter(d => d.planning_session_id === session?.id);

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={`min-h-[110px] p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] print:bg-white print:border-black print:text-black print:scale-100 ${
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
                    <span className={`text-xs font-black ${session ? 'text-[#CC0E21] print:text-black' : 'text-slate-400 print:text-black'}`}>
                      {dateObj.getDate()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 print:text-black">
                      {isMatchDay ? 'Partido' : isDefaultTrain ? 'Entrenamiento' : 'Recup.'}
                    </span>
                  </div>

                  {session ? (
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[10px] font-black text-white truncate print:text-black">
                        {session.tipo_sesion}
                      </div>
                      <div className="text-[9px] font-medium text-slate-400 truncate print:text-black">
                        {session.objetivo_principal}
                      </div>
                      
                      {/* Estado y Carga badges */}
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[8px] px-1 py-0.5 rounded font-black ${
                          session.estado === 'Realizada' ? 'bg-green-950 text-green-400 print:border print:text-black' :
                          session.estado === 'Borrador' ? 'bg-slate-800 text-slate-400' :
                          'bg-[#CC0E21]/15 text-[#CC0E21]'
                        }`}>
                          {session.estado || 'Planificada'}
                        </span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          {session.carga}
                        </span>
                      </div>

                      {/* Chips indicators */}
                      <div className="flex flex-wrap gap-1 mt-1 print:hidden">
                        {sConcepts.slice(0, 2).map((c, i) => (
                          <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-slate-800 text-slate-350 font-bold max-w-[50px] truncate">
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
                    <div className="mt-4 flex flex-col items-center justify-center print:hidden">
                      <span className="text-[9px] text-slate-600 font-bold hover:text-slate-400">
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
        <div className="space-y-6 print:block">
          {Array.from({ length: Math.ceil((monthDays.length + firstDayOfWeek) / 7) }).map((_, weekIdx) => {
            const startDayIdx = weekIdx * 7 - firstDayOfWeek;
            const weekDays = Array.from({ length: 7 }).map((_, dayOffset) => {
              const dayIdx = startDayIdx + dayOffset;
              return dayIdx >= 0 && dayIdx < monthDays.length ? monthDays[dayIdx] : null;
            }).filter(Boolean) as Date[];

            if (weekDays.length === 0) return null;

            const weekSessions = filteredSessions.filter(s => weekDays.some(wd => s.fecha === formatDateString(wd)));
            
            return (
              <div key={weekIdx} className="border border-slate-800/80 bg-slate-900/10 rounded-2xl p-4 space-y-4 print:border-black print:text-black">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2 print:border-black">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 print:text-black">
                    <Activity className="h-4 w-4 text-[#CC0E21]" />
                    Semana {weekIdx + 1} ({weekDays[0] && formatDateString(weekDays[0])} al {weekDays[weekDays.length-1] && formatDateString(weekDays[weekDays.length-1])})
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 print:text-black">
                    <div>Sesiones: <span className="text-white print:text-black">{weekSessions.length}</span></div>
                    <div>Carga Semanal: <span className="text-[#CC0E21] print:text-black">
                      {weekSessions.some(s => s.carga === 'Alta') ? 'Alta' : 'Media'}
                    </span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekDays.map(dateObj => {
                    const dateStr = formatDateString(dateObj);
                    const isDefaultTrain = isDefaultTrainingDay(dateObj);
                    const isMatchDay = isWeekend(dateObj);
                    const session = filteredSessions.find(s => s.fecha === dateStr);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayClick(dateStr)}
                        className={`p-3 rounded-xl border cursor-pointer hover:border-slate-700 transition-colors flex flex-col justify-between min-h-[140px] print:bg-white print:border-black print:text-black ${
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
                            <span className="text-[10px] text-slate-500 font-bold print:text-black">
                              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dateObj.getDay()]}
                            </span>
                            <span className="text-[10px] font-black text-slate-450 print:text-black">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          {session ? (
                            <div className="mt-2 space-y-1.5">
                              <span className="text-[10px] font-black text-white block leading-tight print:text-black">
                                {session.tipo_sesion}
                              </span>
                              <span className="text-[9px] text-slate-400 block leading-tight print:text-black">
                                {session.objetivo_principal}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`text-[8px] font-bold px-1 rounded ${
                                  session.estado === 'Realizada' ? 'bg-green-950 text-green-400' : 'bg-[#CC0E21]/20 text-[#CC0E21]'
                                }`}>
                                  {session.estado || 'Planificada'}
                                </span>
                                <span className="text-[8px] font-black text-slate-400">
                                  {session.carga}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-650 mt-2 block print:hidden font-bold">Libre</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ficha Imprimible Completa */}
      <div id="print-area" className="hidden print:block bg-white text-black p-6 space-y-6">
        <div className="border-b-4 border-black pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">S.D. INDAUTXU JUVENIL DH</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-700">FICHA OFICIAL DE ENTRENAMIENTO</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black">{sessionForm.fecha}</span>
            <p className="text-xs text-slate-600">{sessionForm.hora_inicio} - {sessionForm.hora_fin} ({sessionForm.duracion_total} min)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border border-black p-4 rounded">
          <div>
            <span className="text-xs font-bold text-slate-700 block uppercase">Tipo de Sesión</span>
            <span className="text-sm font-bold">{sessionForm.tipo_sesion}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 block uppercase">Carga de Trabajo</span>
            <span className="text-sm font-bold">{sessionForm.carga}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 block uppercase">Instalación</span>
            <span className="text-sm font-bold">{sessionForm.campo_instalacion}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black border-b border-black pb-1">OBJETIVOS DE LA SESIÓN</h2>
          <p className="text-sm font-bold text-slate-800">Principal: {sessionForm.objetivo_principal}</p>
          {sessionForm.objetivo_semanal && (
            <p className="text-xs text-slate-600">Semanal: {sessionForm.objetivo_semanal}</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-black border-b border-black pb-1">DESGLOSE DE TAREAS</h2>
          {sessionTasks.map((task, idx) => (
            <div key={idx} className="border border-slate-400 p-3 rounded space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>{idx + 1}. {task.nombre_tarea} ({task.tipo_tarea})</span>
                <span>{task.minutos} min | Espacio: {task.espacio || 'N/A'}</span>
              </div>
              <div className="text-xs text-slate-700">Responsable: <span className="font-bold">{task.responsable_staff === 'Otro' ? task.responsable_staff_otro : task.responsable_staff}</span></div>
              <p className="text-xs font-medium whitespace-pre-wrap mt-1 text-slate-900">{task.descripcion}</p>
              {task.observaciones && (
                <p className="text-[11px] text-slate-500 italic mt-1">Variantes/Observaciones: {task.observaciones}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-black p-3 rounded">
            <h3 className="text-xs font-bold uppercase mb-2">Checklist de Material</h3>
            <div className="text-xs space-y-1">
              {sessionForm.checklist_material && (
                <>
                  {sessionForm.checklist_material.balones > 0 && <div>- Balones: {sessionForm.checklist_material.balones}</div>}
                  {sessionForm.checklist_material.petos?.length > 0 && <div>- Petos: {sessionForm.checklist_material.petos.join(', ')}</div>}
                  {sessionForm.checklist_material.conos > 0 && <div>- Conos: {sessionForm.checklist_material.conos}</div>}
                  {sessionForm.checklist_material.chinos > 0 && <div>- Chinos: {sessionForm.checklist_material.chinos}</div>}
                  {sessionForm.checklist_material.picas > 0 && <div>- Picas: {sessionForm.checklist_material.picas}</div>}
                  {sessionForm.checklist_material.vallas > 0 && <div>- Vallas: {sessionForm.checklist_material.vallas}</div>}
                  {sessionForm.checklist_material.porterias_moviles > 0 && <div>- Porterías móviles: {sessionForm.checklist_material.porterias_moviles}</div>}
                  {sessionForm.checklist_material.gps && <div>- Dispositivos GPS cargados</div>}
                  {sessionForm.checklist_material.personalizados?.map((c: { name: string; quantity: number }, i: number) => (
                    <div key={i}>- {c.name}: {c.quantity}</div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="border border-black p-3 rounded">
            <h3 className="text-xs font-bold uppercase mb-2">Convocatoria y Personal</h3>
            <div className="text-xs">
              <div>Previstos: {sessionForm.num_jugadores_previstos} jugadores ({sessionForm.num_porteros_previstos} porteros)</div>
              <div className="mt-2 font-bold">Convocados ({summonedPlayerIds.length}):</div>
              <div className="text-[10px] text-slate-700 truncate max-w-full">
                {players.filter(p => summonedPlayerIds.includes(p.id)).map(p => `#${p.dorsal} ${p.nombre}`).join(', ')}
              </div>
            </div>
          </div>
        </div>

        {sessionForm.estado === 'Realizada' && sessionForm.evaluacion_observaciones && (
          <div className="border-2 border-dashed border-black p-4 rounded bg-slate-50">
            <h3 className="text-xs font-bold uppercase mb-1">Evaluación Post-Entrenamiento</h3>
            <div className="text-xs">
              <div>Duración Real: {sessionForm.evaluacion_duracion_real} minutos (Previsto: {sessionForm.duracion_total} min)</div>
              <div className="mt-1 font-medium">{sessionForm.evaluacion_observaciones}</div>
            </div>
          </div>
        )}
      </div>

      {/* Panel de sesión del día seleccionado (Modal de Edición/Creación) */}
      <Modal
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={selectedDate ? `SESIÓN DE ENTRENAMIENTO - ${selectedDate}` : 'DETALLE DE LA SESIÓN'}
      >
        <div className="space-y-6 text-slate-100 print:text-black">
          {sessionForm.id && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 animate-fadeIn print:hidden">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#CC0E21]" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Asistencia y Valoración</h4>
                  <p className="text-[10px] text-slate-450">Registra el trabajo de hoy en el campo.</p>
                </div>
              </div>
              <a
                href={`/asistencia?session_id=${sessionForm.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CC0E21] hover:bg-[#a80b1a] text-white text-xs font-bold transition-all shadow-md shrink-0 text-center"
              >
                Registrar Asistencia ➔
              </a>
            </div>
          )}
          
          {/* BOTONERA ACCIONES RÁPIDAS V2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-b border-slate-800/60 pb-4 print:hidden">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              <BookOpen className="h-4 w-4 text-[#CC0E21]" />
              Biblioteca
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              <Copy className="h-4 w-4 text-[#CC0E21]" />
              Copiar WhatsApp
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              <Printer className="h-4 w-4 text-[#CC0E21]" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={handleDuplicateSession}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#CC0E21]/10 hover:bg-[#CC0E21]/20 border border-[#CC0E21]/40 text-xs font-bold text-[#CC0E21]"
            >
              <RefreshCw className="h-4 w-4" />
              Duplicar Copia
            </button>
          </div>

          {/* DATOS BÁSICOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              DATOS BÁSICOS
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Estado</label>
                <select
                  value={sessionForm.estado || 'Planificada'}
                  onChange={e => setSessionForm({...sessionForm, estado: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                >
                  {ESTADOS_SESION.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Categoría Filtro</label>
                <select
                  value={sessionForm.categoria_filtro || 'Liga'}
                  onChange={e => setSessionForm({...sessionForm, categoria_filtro: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                >
                  <option value="Pretemporada">Pretemporada</option>
                  <option value="Liga">Liga</option>
                  <option value="Copa">Copa</option>
                  <option value="Amistoso">Amistoso</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Carga Trabajo</label>
                <select
                  value={sessionForm.carga || 'Media'}
                  onChange={e => setSessionForm({...sessionForm, carga: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                >
                  {CARGAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Hora Entrenamiento</label>
                <input
                  type="text"
                  placeholder="18:30"
                  value={sessionForm.hora_inicio || ''}
                  onChange={e => setSessionForm({...sessionForm, hora_inicio: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Convocatoria (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="18:00"
                  value={sessionForm.hora_convocatoria || ''}
                  onChange={e => setSessionForm({...sessionForm, hora_convocatoria: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 font-bold block mb-1">Duración Prevista (min)</label>
                <input
                  type="number"
                  value={sessionForm.duracion_total || 0}
                  onChange={e => setSessionForm({...sessionForm, duracion_total: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* EVALUACIÓN POST-ENTRENAMIENTO (Solo si está realizada) */}
          {sessionForm.estado === 'Realizada' && (
            <div className="p-4 rounded-xl bg-green-950/20 border border-green-800/65 space-y-3">
              <h4 className="text-xs font-black uppercase text-green-400 tracking-wider">Evaluación Post-Entrenamiento</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="eval-completada"
                    checked={sessionForm.evaluacion_completada || false}
                    onChange={e => setSessionForm({...sessionForm, evaluacion_completada: e.target.checked})}
                    className="h-4 w-4 accent-green-600 rounded bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="eval-completada" className="text-[10px] font-bold text-slate-200">¿Sesión completada con éxito?</label>
                </div>
                
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Duración Real (minutos)</label>
                  <input
                    type="number"
                    value={sessionForm.evaluacion_duracion_real === null ? sessionForm.duracion_total : sessionForm.evaluacion_duracion_real}
                    onChange={e => setSessionForm({...sessionForm, evaluacion_duracion_real: Number(e.target.value)})}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Observaciones finales / Variaciones ocurridas</label>
                <textarea
                  placeholder="Ej: Se suspendió la tarea de posesión por lluvia pesada, se disminuyó el ritmo..."
                  value={sessionForm.evaluacion_observaciones || ''}
                  onChange={e => setSessionForm({...sessionForm, evaluacion_observaciones: e.target.value})}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-green-500 h-16"
                />
              </div>
            </div>
          )}

          {/* CHECKLIST DE MATERIALES V2 */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              CHECKLIST DE MATERIAL
            </h3>

            {/* Grid de Material Estándar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-850">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Balones</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.balones ?? 15}
                  onChange={e => updateChecklistInt('balones', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Conos</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.conos ?? 0}
                  onChange={e => updateChecklistInt('conos', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Chinos / Discos</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.chinos ?? 0}
                  onChange={e => updateChecklistInt('chinos', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Picas</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.picas ?? 0}
                  onChange={e => updateChecklistInt('picas', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Vallas</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.vallas ?? 0}
                  onChange={e => updateChecklistInt('vallas', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Estacas</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.estacas ?? 0}
                  onChange={e => updateChecklistInt('estacas', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Porterías móviles</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.porterias_moviles ?? 0}
                  onChange={e => updateChecklistInt('porterias_moviles', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Escaleras Coord.</span>
                <input
                  type="number"
                  value={sessionForm.checklist_material?.escaleras_coordinacion ?? 0}
                  onChange={e => updateChecklistInt('escaleras_coordinacion', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Selector de petos y otros toggles */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Colores de Petos a utilizar:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Blanco', 'Rosa'].map(col => {
                    const isSelected = sessionForm.checklist_material?.petos?.includes(col);
                    return (
                      <button
                        type="button"
                        key={col}
                        onClick={() => handleTogglePetoColor(col)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          isSelected ? 'bg-slate-100 text-slate-950 border-slate-100' : 'bg-slate-950 text-slate-455 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['gps', 'cronometro', 'tablet', 'altavoz', 'agua', 'botiquin'].map(key => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => updateChecklistBool(key, !(sessionForm.checklist_material?.[key]))}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-[10px] font-bold ${
                      sessionForm.checklist_material?.[key] ? 'bg-[#CC0E21]/20 border-[#CC0E21] text-white' : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    <div className={`h-3 w-3 rounded flex items-center justify-center ${sessionForm.checklist_material?.[key] ? 'bg-[#CC0E21]' : 'border border-slate-800'}`}>
                      {sessionForm.checklist_material?.[key] && <Check className="h-2 w-2 text-white" />}
                    </div>
                    <span className="capitalize">{key === 'gps' ? 'GPS' : key === 'botiquin' ? 'Botiquín' : key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Materiales personalizados */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block">Materiales personalizados extra:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre de material..."
                  value={customMaterialName}
                  onChange={e => setCustomMaterialName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                />
                <input
                  type="number"
                  value={customMaterialQty}
                  onChange={e => setCustomMaterialQty(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center"
                />
                <Button type="button" onClick={handleAddCustomMaterial} className="text-xs px-3 py-1">Agregar</Button>
              </div>

              {sessionForm.checklist_material?.personalizados?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {sessionForm.checklist_material.personalizados.map((c: { name: string; quantity: number }, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-bold">
                      {c.name} ({c.quantity})
                      <button type="button" onClick={() => handleRemoveCustomMaterial(c.name)} className="text-red-500 hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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

          {/* TAREAS DE LA SESIÓN (CON ASIGNACIÓN DE STAFF Y BIBLIOTECA) */}
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

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400 font-medium">Suma de tareas:</span>
                <span className={`font-black ${totalTasksTime > (sessionForm.duracion_total || 0) ? 'text-red-500' : 'text-green-400'}`}>
                  {totalTasksTime} min
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-350 font-bold">{sessionForm.duracion_total || 0} min previsto</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {sessionTasks.map((task, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-850 bg-slate-950/40 space-y-2 relative group">
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSaveToLibrary(task)}
                      className="p-1 rounded text-slate-500 hover:text-blue-400"
                      title="Guardar esta tarea en biblioteca permanente"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="p-1 rounded text-slate-500 hover:text-red-500"
                      title="Eliminar de sesión"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

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

                  {/* Responsable de Staff */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Responsable Staff</label>
                      <select
                        value={task.responsable_staff || 'Primer Entrenador'}
                        onChange={e => handleUpdateTaskField(idx, 'responsable_staff', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                      >
                        {STAFF_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {task.responsable_staff === 'Otro' && (
                      <div>
                        <label className="text-[9px] text-[#CC0E21] font-bold block mb-0.5">Rol Personalizado</label>
                        <input
                          type="text"
                          placeholder="Ej: Segundo PF"
                          value={task.responsable_staff_otro || ''}
                          onChange={e => handleUpdateTaskField(idx, 'responsable_staff_otro', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                        />
                      </div>
                    )}
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
                        placeholder="15x15m"
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
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs outline-none focus:border-[#CC0E21] h-12"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* JUGADORES CONVOCADOS Y ALERTA DE LESIONADOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              JUGADORES CONVOCADOS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {players.map(p => {
                const isSelected = summonedPlayerIds.includes(p.id);
                const isInjured = p.estado === 'Lesionado' || p.estado === 'Baja temporal';
                const isDoubt = p.estado === 'Duda' || p.estado === 'Sancionado';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayerSummon(p.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all relative ${
                      isInjured ? 'border-red-950 bg-red-950/10' :
                      isDoubt ? 'border-amber-950 bg-amber-955/10' :
                      isSelected ? 'bg-[#CC0E21]/15 border-[#CC0E21]/40 text-slate-100' :
                      'bg-slate-950/60 border-slate-850 text-slate-400'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#CC0E21] border-[#CC0E21] text-white' : 'border-slate-800'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    
                    <div className="truncate flex-1">
                      <span className="text-[10px] font-black mr-1">#{p.dorsal}</span>
                      <span className="text-[10px] font-bold">{p.nombre}</span>
                      
                      {isInjured && (
                        <span className="block text-[8px] text-red-500 font-extrabold flex items-center gap-0.5">
                          <ShieldAlert className="h-2.5 w-2.5" /> {p.estado}
                        </span>
                      )}
                      {isDoubt && (
                        <span className="block text-[8px] text-amber-500 font-extrabold">
                          ⚠️ {p.estado}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OBSERVACIONES CONVOCATORIA (PARA WHATSAPP) */}
          <div className="space-y-2">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              OBSERVACIONES WHATSAPP
            </h3>
            <textarea
              placeholder="Ej: Traer ropa de entrenamiento azul, recordar DNI, etc..."
              value={sessionForm.observaciones_convocatoria || ''}
              onChange={e => setSessionForm({...sessionForm, observaciones_convocatoria: e.target.value})}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none focus:border-[#CC0E21] h-16"
            />
          </div>

          {/* DOCUMENTOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              DOCUMENTOS Y PDF
            </h3>

            <div className="space-y-3">
              <label className="cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-slate-800 hover:border-blue-500 rounded-xl bg-slate-950/60 text-slate-400 transition-colors">
                <span className="flex items-center gap-2 text-xs font-bold">
                  <Upload className="h-4 w-4" />
                  {uploadingDoc ? 'Subiendo...' : 'Subir PDF de la sesión'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingDoc}
                />
              </label>

              {sessionDocs.length > 0 && (
                <div className="space-y-2">
                  {sessionDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850">
                      <span className="text-xs truncate text-slate-350">{doc.nombre_documento}</span>
                      <div className="flex gap-1">
                        <a href={doc.url_storage} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-white">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button type="button" onClick={() => handleDeleteDoc(doc.id, doc.url_storage)} className="p-1 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RELACIÓN CON JORNADAS */}
          <div className="space-y-3">
            <h3 className="text-sm font-black border-b border-slate-800 pb-1 text-[#CC0E21] uppercase tracking-wider">
              VINCULAR A JORNADA
            </h3>
            <select
              value={sessionForm.jornada_id || ''}
              onChange={e => setSessionForm({...sessionForm, jornada_id: e.target.value || null})}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs outline-none"
            >
              <option value="">Ninguna jornada</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>Jornada {m.jornada} - vs {m.rival}</option>
              ))}
            </select>
          </div>

          {/* PANEL FOOTER */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800 print:hidden">
            <Button variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSession} loading={saving} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Guardar Sesión
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE LA BIBLIOTECA TÁCTICA */}
      <BibliotecaTareasModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectTask={handleImportFromLibrary}
      />
    </div>
  );
}
