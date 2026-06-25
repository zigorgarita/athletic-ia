'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Printer, RefreshCw, 
  BookOpen, Check, X, Clock, MapPin, ShieldAlert, AlertTriangle,
  Award, Play, ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  tipo_sesion: 'Entrenamiento' | 'Partido' | 'Libre' | 'Recuperación' | 'Prepartido';
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

// Static mock configuration
const MOCK_PLAYERS: MockPlayer[] = [
  { id: 'p1', nombre: 'Ander', apellidos: 'Ibarreta', dorsal: 1, demarcacion: 'Portero', estado: 'Disponible' },
  { id: 'p2', nombre: 'Mikel', apellidos: 'Arruti', dorsal: 2, demarcacion: 'Central derecho', estado: 'Disponible' },
  { id: 'p3', nombre: 'Iker', apellidos: 'Garmendia', dorsal: 4, demarcacion: 'Central izquierdo', estado: 'Lesionado' },
  { id: 'p4', nombre: 'Jon', apellidos: 'Larrañaga', dorsal: 3, demarcacion: 'Lateral izquierdo', estado: 'Disponible' },
  { id: 'p5', nombre: 'Gorka', apellidos: 'Elustondo', dorsal: 5, demarcacion: 'Pivote', estado: 'Disponible' },
  { id: 'p6', nombre: 'Julen', apellidos: 'Guerrero', dorsal: 8, demarcacion: 'Interior izquierdo', estado: 'Disponible' },
  { id: 'p7', nombre: 'Unai', apellidos: 'López', dorsal: 10, demarcacion: 'Media punta', estado: 'Duda' },
  { id: 'p8', nombre: 'Asier', apellidos: 'Villalibre', dorsal: 9, demarcacion: 'Delantero centro', estado: 'Disponible' },
  { id: 'p9', nombre: 'Oier', apellidos: 'Sancet', dorsal: 11, demarcacion: 'Extremo izquierdo', estado: 'Disponible' },
  { id: 'p10', nombre: 'Nico', apellidos: 'Serrano', dorsal: 7, demarcacion: 'Extremo derecho', estado: 'Disponible' }
];

const MOCK_SESSIONS: MockSession[] = [
  {
    id: 's1',
    fecha: '2026-06-22',
    tipo_sesion: 'Libre',
    hora_inicio: '',
    hora_fin: '',
    duracion_total: 0,
    campo_instalacion: '',
    objetivo_principal: 'Descanso programado',
    carga: 'Recuperación',
    estado: 'Realizada'
  },
  {
    id: 's2',
    fecha: '2026-06-23',
    tipo_sesion: 'Entrenamiento',
    hora_inicio: '18:30',
    hora_fin: '20:00',
    duracion_total: 90,
    campo_instalacion: 'Iparralde (Campo Central)',
    objetivo_principal: 'Salida de balón de tres y basculación defensiva',
    carga: 'Media',
    estado: 'Realizada',
    hora_convocatoria: '18:00',
    ropa_convocatoria: 'Camiseta azul de entreno, pantalón corto negro, medias azules.',
    checklist_material: { balones: 16, petos: ['Rojo', 'Azul'], conos: 12, chinos: 20, gps: true, agua: true },
    evaluacion_completada: true,
    evaluacion_duracion_real: 90,
    evaluacion_observaciones: 'Muy buena intensidad en la fase de posesión. Ander sintió fatiga leve en el aductor.',
    rpe_medio: 6
  },
  {
    id: 's3',
    fecha: '2026-06-24',
    tipo_sesion: 'Libre',
    hora_inicio: '',
    hora_fin: '',
    duracion_total: 0,
    campo_instalacion: '',
    objetivo_principal: 'Descanso semanal',
    carga: 'Recuperación',
    estado: 'Realizada'
  },
  {
    id: 's4',
    fecha: '2026-06-25',
    tipo_sesion: 'Entrenamiento',
    hora_inicio: '18:30',
    hora_fin: '20:15',
    duracion_total: 105,
    campo_instalacion: 'Iparralde (Campo Central)',
    objetivo_principal: 'Presión alta y transiciones rápidas tras recuperación',
    carga: 'Alta',
    estado: 'Realizada',
    hora_convocatoria: '18:00',
    ropa_convocatoria: 'Camiseta blanca de entreno, pantalón negro, medias blancas.',
    checklist_material: { balones: 18, petos: ['Rojo', 'Verde'], conos: 15, chinos: 25, gps: true, tablet: true, agua: true, botiquin: true },
    evaluacion_completada: true,
    evaluacion_duracion_real: 100,
    evaluacion_observaciones: 'Sesión muy física. Completados todos los bloques salvo la vuelta a la calma que se recortó por falta de luz.',
    rpe_medio: 8
  },
  {
    id: 's5',
    fecha: '2026-06-26',
    tipo_sesion: 'Prepartido',
    hora_inicio: '18:30',
    hora_fin: '19:30',
    duracion_total: 60,
    campo_instalacion: 'Iparralde (Fútbol 7)',
    objetivo_principal: 'ABP y reactivación neuromuscular',
    carga: 'Baja',
    estado: 'Planificada',
    hora_convocatoria: '18:15',
    ropa_convocatoria: 'Polo oficial de paseo azul, pantalón corto negro.',
    checklist_material: { balones: 10, petos: ['Verde', 'Amarillo'], conos: 6, chinos: 10, cronometro: true, agua: true },
  },
  {
    id: 's6',
    fecha: '2026-06-27',
    tipo_sesion: 'Partido',
    hora_inicio: '16:30',
    hora_fin: '18:15',
    duracion_total: 105,
    campo_instalacion: 'Estadio La Florida (Sestao)',
    objetivo_principal: 'Jornada 32: SD Indautxu vs Zaragoza Juvenil A',
    carga: 'Muy alta',
    estado: 'Planificada',
    rival: 'Zaragoza Juvenil A',
    hora_convocatoria: '14:45',
    ropa_convocatoria: 'Equipación oficial de juego (Camiseta rojiblanca, pantalón azul, medias rojas).'
  },
  {
    id: 's7',
    fecha: '2026-06-28',
    tipo_sesion: 'Recuperación',
    hora_inicio: '10:30',
    hora_fin: '11:30',
    duracion_total: 60,
    campo_instalacion: 'Gimnasio y Spa Iparralde',
    objetivo_principal: 'Trabajo regenerativo, movilidad articular y spa',
    carga: 'Recuperación',
    estado: 'Planificada',
    hora_convocatoria: '10:15',
    ropa_convocatoria: 'Chándal oficial del club.'
  }
];

const MOCK_TASKS: Record<string, MockTask[]> = {
  s2: [
    { id: 't1', nombre_tarea: 'Calentamiento dinámico y movilidad', tipo_tarea: 'Calentamiento', minutos: 15, jugadores: 20, espacio: 'Medio campo', objetivo: 'Activación muscular', descripcion: 'Movilidad articular general seguida de sprints progresivos y saltos de valla.', responsable_staff: 'Preparador Físico' },
    { id: 't2', nombre_tarea: 'Rondo 4x4 + 3 apoyos neutros', tipo_tarea: 'Rondo', minutos: 20, jugadores: 11, espacio: '15x15m', objetivo: 'Mantener posesión y pase rápido', descripcion: 'El equipo en posesión busca dar 10 pases seguidos. Al perder balón cambian roles.', responsable_staff: 'Segundo Entrenador' },
    { id: 't3', nombre_tarea: 'Salida de tres en campo completo con rival pasivo', tipo_tarea: 'Juego de posición', minutos: 40, jugadores: 18, espacio: 'Todo el campo', objetivo: 'Salida de balón estructurada', descripcion: 'Se entrena el inicio del juego desde el portero con tres defensas centrales y pivote cayendo a bandas.', responsable_staff: 'Primer Entrenador' }
  ],
  s4: [
    { id: 't4', nombre_tarea: 'Juego reducido de presión tras pérdida', tipo_tarea: 'Juego reducido', minutos: 30, jugadores: 16, espacio: '30x40m', objetivo: 'Reacción tras pérdida', descripcion: 'Partidos de 4vs4 con porterías pequeñas. Al perder el balón, el equipo debe presionar en menos de 3 segundos.', responsable_staff: 'Primer Entrenador' },
    { id: 't5', nombre_tarea: 'Partido condicionado 10vs10', tipo_tarea: 'Partido condicionado', minutos: 50, jugadores: 20, espacio: 'Todo el campo', objetivo: 'Aplicar conceptos defensivos', descripcion: 'Partido normal pero los goles marcados tras recuperación en campo contrario valen doble.', responsable_staff: 'Primer Entrenador' }
  ]
};

export function PlanificacionClient() {
  // Views and navigation
  const [viewMode, setViewMode] = useState<'semanal' | 'mensual'>('semanal');
  
  // Data states (Simulated mockup)
  const [sessions, setSessions] = useState<MockSession[]>(MOCK_SESSIONS);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-25');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basicos' | 'tareas' | 'convocatoria' | 'evaluacion'>('basicos');
  
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

  // Open sidebar/drawer on day click
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = sessions.find(s => s.fecha === dateStr);

    if (existing) {
      setSessionForm({ ...existing });
      setSessionTasks(MOCK_TASKS[existing.id] || []);
      // Preset summoned players (all available by default)
      setSummonedPlayerIds(MOCK_PLAYERS.filter(p => p.estado === 'Disponible').map(p => p.id));
    } else {
      setSessionForm({
        fecha: dateStr,
        tipo_sesion: 'Entrenamiento',
        hora_inicio: '18:30',
        hora_fin: '20:00',
        duracion_total: 90,
        campo_instalacion: 'Iparralde',
        objetivo_principal: 'Diseño táctico nuevo',
        carga: 'Media',
        estado: 'Borrador',
        hora_convocatoria: '18:00',
        ropa_convocatoria: 'Camiseta oficial de entrenamiento.'
      });
      setSessionTasks([]);
      setSummonedPlayerIds([]);
    }
    setActiveTab('basicos');
    setIsPanelOpen(true);
  };

  // Handle simulated action buttons
  const handleSaveSimulated = () => {
    const updated = sessions.map(s => s.fecha === sessionForm.fecha ? { ...s, ...sessionForm } as MockSession : s);
    if (!sessions.some(s => s.fecha === sessionForm.fecha)) {
      updated.push({ ...sessionForm, id: 's' + (updated.length + 1) } as MockSession);
    }
    setSessions(updated);
    setIsPanelOpen(false);
    triggerToast('¡Sesión guardada con éxito (Modo Simulación)!');
  };

  const handleDuplicateSimulated = () => {
    triggerToast('¡Sesión duplicada! Copiada al día siguiente.');
  };

  const handleCopyWhatsAppSimulated = () => {
    const text = `⚽ S.D. INDAUTXU DH - CONVOCATORIA ⚽\n📅 Fecha: ${sessionForm.fecha}\n⏰ Citación: ${sessionForm.hora_convocatoria || '18:00'}h\n📍 Lugar: ${sessionForm.campo_instalacion || 'Iparralde'}\n👕 Ropa: ${sessionForm.ropa_convocatoria || 'Polo del club'}`;
    navigator.clipboard.writeText(text);
    triggerToast('¡Convocatoria de WhatsApp copiada al portapapeles!');
  };

  // UI styling helpers based on session type
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Entrenamiento':
        return { border: 'border-l-4 border-l-blue-600', badge: 'bg-blue-950/40 text-blue-400 border border-blue-900/60' };
      case 'Partido':
        return { border: 'border-l-4 border-l-emerald-600', badge: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60' };
      case 'Libre':
        return { border: 'border-l-4 border-l-slate-700', badge: 'bg-slate-900 text-slate-500 border border-slate-800' };
      case 'Recuperación':
        return { border: 'border-l-4 border-l-cyan-600', badge: 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/60' };
      case 'Prepartido':
        return { border: 'border-l-4 border-l-amber-600', badge: 'bg-amber-950/40 text-amber-400 border border-amber-900/60' };
      default:
        return { border: 'border-l-4 border-l-slate-500', badge: 'bg-slate-850 text-slate-400' };
    }
  };

  // Weekly Dashboard calculation
  const totalVolume = sessions.reduce((acc, s) => acc + (s.duracion_total || 0), 0);
  const activeSessionsCount = sessions.filter(s => s.tipo_sesion !== 'Libre').length;
  const injuryCount = MOCK_PLAYERS.filter(p => p.estado === 'Lesionado').length;

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border-2 border-[#CC0E21] px-4 py-3 rounded-2xl shadow-2xl text-slate-100 text-sm font-bold animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera superior */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#CC0E21]/15 border border-[#CC0E21]/30 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-[#CC0E21]" />
            </div>
            PLANIFICACIÓN <span className="text-[#CC0E21]">V3</span>
          </h1>
          <p className="text-slate-450 text-sm">
            Panel de control diario para el cuerpo técnico (División de Honor).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            🛠️ Modo Simulación / Maqueta UX
          </span>

          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('semanal')}
              className={`text-xs px-3.5 py-1.5 font-bold rounded-lg transition-all ${viewMode === 'semanal' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Vista Semanal
            </button>
            <button 
              onClick={() => setViewMode('mensual')}
              className={`text-xs px-3.5 py-1.5 font-bold rounded-lg transition-all ${viewMode === 'mensual' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Vista Mensual
            </button>
          </div>

          <Button 
            onClick={() => handleDayClick('2026-06-29')}
            className="flex items-center gap-1 text-xs font-bold px-3 py-2 bg-[#CC0E21] hover:bg-[#a80b1a] text-white"
          >
            <Plus className="h-4 w-4" />
            Nueva Sesión
          </Button>
        </div>
      </div>

      {/* DASHBOARD RESUMEN DE LA SEMANA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-md">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Tipo de Microciclo</span>
          <div className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#CC0E21]" />
            Competitivo (J32)
          </div>
        </div>
        <div className="space-y-1 border-l border-slate-800/60 pl-4">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Volumen Semanal</span>
          <div className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#CC0E21]" />
            {totalVolume} min <span className="text-xs text-slate-500">({activeSessionsCount} sesiones)</span>
          </div>
        </div>
        <div className="space-y-1 border-l border-slate-800/60 pl-4">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Enfoque de Carga</span>
          <div className="text-lg font-black text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Impacto / Alta
          </div>
        </div>
        <div className="space-y-1 border-l border-slate-800/60 pl-4">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Disponibilidad Médica</span>
          <div className="text-lg font-black text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            90% <span className="text-xs text-slate-500">({injuryCount} lesionados)</span>
          </div>
        </div>
      </div>

      {/* VISTA PRINCIPAL: SEMANAS Y DÍAS */}
      {viewMode === 'semanal' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-200">MICROCICLO SEMANAL</h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">Part. vs Zaragoza</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-black text-slate-300 px-2">Semana 32</span>
              <button className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {sessions.map((session) => {
              const config = getTypeConfig(session.tipo_sesion);
              const date = new Date(session.fecha);
              const dayName = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][date.getDay()];

              return (
                <div
                  key={session.id}
                  onClick={() => handleDayClick(session.fecha)}
                  className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-slate-700/85 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[190px] shadow-lg hover:shadow-xl relative group ${config.border}`}
                >
                  <div className="space-y-3">
                    {/* Fila superior: Día y tipo */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-slate-400">{dayName}</span>
                        <span className="text-base font-extrabold text-slate-200">{date.getDate()}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase ${config.badge}`}>
                        {session.tipo_sesion}
                      </span>
                    </div>

                    {/* Fila del medio: Datos informativos */}
                    {session.tipo_sesion !== 'Libre' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{session.hora_inicio || 'N/D'}</span>
                          {session.campo_instalacion && (
                            <>
                              <span className="text-slate-700">•</span>
                              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 truncate max-w-[80px]" />
                              <span className="truncate max-w-[80px]">{session.campo_instalacion.split(' ')[0]}</span>
                            </>
                          )}
                        </div>

                        {session.rival && (
                          <div className="text-[10px] font-extrabold text-red-400 flex items-center gap-1">
                            <Award className="h-3 w-3 shrink-0" />
                            <span>Rival: {session.rival}</span>
                          </div>
                        )}

                        <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">
                          {session.objetivo_principal}
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-600 font-bold italic">
                        Descanso General
                      </div>
                    )}
                  </div>

                  {/* Estado / Carga inferior */}
                  {session.tipo_sesion !== 'Libre' && (
                    <div className="flex items-center justify-between border-t border-slate-800/40 pt-2.5 mt-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${
                        session.estado === 'Realizada' ? 'bg-green-950 text-green-400 border border-green-900/40' : 'bg-amber-950 text-amber-400 border border-amber-900/40'
                      }`}>
                        {session.estado}
                      </span>
                      <span className="text-[9px] text-slate-450 font-bold">
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
        /* VISTA MENSUAL DEL CALENDARIO COMPLETO (MAX ESTATE) */
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-500 py-1 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2.5">
            {sessions.map(session => {
              const date = new Date(session.fecha);
              const config = getTypeConfig(session.tipo_sesion);

              return (
                <div
                  key={session.id}
                  onClick={() => handleDayClick(session.fecha)}
                  className={`min-h-[120px] p-3 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between ${config.border}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400">{date.getDate()}</span>
                    <span className={`text-[8px] px-1 rounded font-bold uppercase ${config.badge}`}>
                      {session.tipo_sesion}
                    </span>
                  </div>

                  {session.tipo_sesion !== 'Libre' ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-200 truncate">{session.tipo_sesion}</div>
                      <div className="text-[9px] text-slate-550 truncate">{session.objetivo_principal}</div>
                      <div className="flex items-center justify-between text-[8px] mt-1">
                        <span className={session.estado === 'Realizada' ? 'text-green-400' : 'text-amber-400'}>{session.estado}</span>
                        <span className="text-slate-500">Carga: {session.carga}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-700 italic text-center">Descanso</div>
                  )}
                </div>
              );
            })}
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
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ficha Lateral TABS */}
        <div className="flex border-b border-slate-850 bg-slate-900/20 px-3">
          {(['basicos', 'tareas', 'convocatoria', 'evaluacion'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-extrabold uppercase border-b-2 tracking-wider transition-all ${
                activeTab === tab 
                  ? 'border-[#CC0E21] text-slate-100' 
                  : 'border-transparent text-slate-500 hover:text-slate-355'
              }`}
            >
              {tab === 'basicos' ? 'Datos Básicos' : tab === 'tareas' ? 'Ejercicios' : tab === 'convocatoria' ? 'Logística' : 'Evaluación'}
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
                    onChange={e => setSessionForm({...sessionForm, tipo_sesion: e.target.value as MockSession['tipo_sesion']})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                  >
                    <option value="Entrenamiento">Entrenamiento</option>
                    <option value="Partido">Partido</option>
                    <option value="Libre">Libre / Descanso</option>
                    <option value="Recuperación">Recuperación</option>
                    <option value="Prepartido">Prepartido / Activación</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Carga Teórica</label>
                  <select
                    value={sessionForm.carga || 'Media'}
                    onChange={e => setSessionForm({...sessionForm, carga: e.target.value as MockSession['carga']})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
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
                          onChange={e => setSessionForm({...sessionForm, hora_convocatoria: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
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
                          onChange={e => setSessionForm({...sessionForm, hora_inicio: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
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
                        onChange={e => setSessionForm({...sessionForm, campo_instalacion: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                      />
                    </div>
                  </div>

                  {sessionForm.tipo_sesion === 'Partido' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rival</label>
                      <input
                        type="text"
                        placeholder="Ej. Zaragoza Juvenil A"
                        value={sessionForm.rival || ''}
                        onChange={e => setSessionForm({...sessionForm, rival: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo de la sesión</label>
                    <input
                      type="text"
                      placeholder="Ej. Organización ofensiva..."
                      value={sessionForm.objetivo_principal || ''}
                      onChange={e => setSessionForm({...sessionForm, objetivo_principal: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Estado de Convocatoria</label>
                    <select
                      value={sessionForm.estado || 'Planificada'}
                      onChange={e => setSessionForm({...sessionForm, estado: e.target.value as MockSession['estado']})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                    >
                      <option value="Borrador">Borrador (Oculto)</option>
                      <option value="Planificada">Planificada / Publicada</option>
                      <option value="Realizada">Realizada / Concluida</option>
                      <option value="Suspendida">Suspendida</option>
                    </select>
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
                    onClick={() => triggerToast('Mostrando Biblioteca Táctica (Simulado)...')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-200 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#CC0E21]" />
                    Importar Biblioteca
                  </button>
                  <button
                    onClick={() => {
                      const newTask: MockTask = {
                        id: 't' + (sessionTasks.length + 1),
                        nombre_tarea: 'Nuevo ejercicio táctico',
                        tipo_tarea: 'Técnica',
                        minutos: 15,
                        jugadores: 20,
                        espacio: 'Medio campo',
                        objetivo: 'Mejora de pases',
                        descripcion: 'Los jugadores realizan pases cortos alternando posiciones en triángulo.',
                        responsable_staff: 'Primer Entrenador'
                      };
                      setSessionTasks([...sessionTasks, newTask]);
                      triggerToast('¡Ejercicio añadido manual!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CC0E21]/15 hover:bg-[#CC0E21]/20 border border-[#CC0E21]/30 text-[11px] font-bold text-[#CC0E21] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir Tarea
                  </button>
                </div>
              </div>

              {sessionTasks.length > 0 ? (
                <div className="space-y-3.5">
                  {sessionTasks.map((task, idx) => (
                    <div key={task.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-2.5 relative group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Paso {idx + 1} • {task.tipo_tarea}</span>
                          <h5 className="text-xs font-black text-slate-200">{task.nombre_tarea}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#CC0E21] bg-[#CC0E21]/10 px-2 py-0.5 rounded-lg border border-[#CC0E21]/20">
                            {task.minutos} min
                          </span>
                          <button 
                            onClick={() => {
                              setSessionTasks(sessionTasks.filter(t => t.id !== task.id));
                              triggerToast('Tarea eliminada.');
                            }}
                            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                        <div>Espacio: <span className="text-slate-200 font-bold">{task.espacio}</span></div>
                        <div>Jugadores: <span className="text-slate-200 font-bold">{task.jugadores}</span></div>
                        <div className="truncate">Staff: <span className="text-slate-200 font-bold">{task.responsable_staff}</span></div>
                      </div>

                      <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-850 rounded-xl">
                  No hay tareas planificadas para hoy. Importa de la biblioteca o añade manual.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOGÍSTICA & MATERIAL */}
          {activeTab === 'convocatoria' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Checklist de Material</h4>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-850">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Balones</span>
                    <input 
                      type="number" 
                      defaultValue={16} 
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Conos</span>
                    <input 
                      type="number" 
                      defaultValue={12} 
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Chinos / Discos</span>
                    <input 
                      type="number" 
                      defaultValue={24} 
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Picas</span>
                    <input 
                      type="number" 
                      defaultValue={8} 
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 text-center" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 block">Colores de Petos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Rojo', 'Azul', 'Verde', 'Amarillo', 'Rosa'].map(c => (
                      <span key={c} className="text-[9px] font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                        Peto {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-400 pt-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#CC0E21]" />
                    <span>Cronómetro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#CC0E21]" />
                    <span>Dispositivos GPS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#CC0E21]" />
                    <span>Botiquín médico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#CC0E21]" />
                    <span>Agua hidratación</span>
                  </div>
                </div>
              </div>

              {/* Ropa convocatoria */}
              <div className="space-y-2 pt-4 border-t border-slate-850">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Ropa Requerida</h4>
                <textarea
                  value={sessionForm.ropa_convocatoria || ''}
                  onChange={e => setSessionForm({...sessionForm, ropa_convocatoria: e.target.value})}
                  placeholder="Instrucciones de indumentaria..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] h-16"
                />
              </div>

              {/* Convocatoria jugadores */}
              <div className="space-y-2.5 pt-4 border-t border-slate-850">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lista de Convocatoria</h4>
                  <span className="text-[10px] text-slate-500 font-bold">Autocartados lesionados</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {MOCK_PLAYERS.map(player => {
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Duración Real (minutos)</label>
                <input
                  type="number"
                  defaultValue={sessionForm.evaluacion_duracion_real || sessionForm.duracion_total}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#CC0E21]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Fatiga Percibida (RPE Medio de la plantilla: 1-10)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    defaultValue={sessionForm.rpe_medio || 6}
                    className="flex-1 accent-[#CC0E21] bg-slate-900 rounded-lg h-2 border border-slate-800"
                    onChange={e => setSessionForm({...sessionForm, rpe_medio: Number(e.target.value)})}
                  />
                  <span className="text-sm font-black text-[#CC0E21] bg-[#CC0E21]/15 px-2.5 py-1 rounded-xl border border-[#CC0E21]/20">
                    {sessionForm.rpe_medio || 6} / 10
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Observaciones Post-Entrenamiento / Incidencias</label>
                <textarea
                  value={sessionForm.evaluacion_observaciones || ''}
                  onChange={e => setSessionForm({...sessionForm, evaluacion_observaciones: e.target.value})}
                  placeholder="Detalla cómo se desarrolló el entrenamiento, variaciones de los ejercicios, actitudes a destacar..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] h-32"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Asistencia y Valoración</h5>
                    <p className="text-[9px] text-slate-500">Métricas individuales ya preparadas.</p>
                  </div>
                </div>
                <button
                  onClick={() => triggerToast('Navegando a registrar asistencia...')}
                  className="text-[10px] px-3 py-1.5 bg-[#CC0E21] text-white font-extrabold rounded-lg hover:bg-[#a80b1a] transition-all"
                >
                  Registrar Asistencia
                </button>
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

            <button
              onClick={handleDuplicateSimulated}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-400 hover:text-slate-200"
              title="Duplicar esta sesión"
            >
              <RefreshCw className="h-4 w-4 text-[#CC0E21]" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsPanelOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSimulated}
              className="px-4 py-2 rounded-xl bg-[#CC0E21] hover:bg-[#a80b1a] text-white text-xs font-bold shadow-md shadow-[#CC0E21]/15"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
