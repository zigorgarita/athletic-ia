/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { Player, DetailedEvaluation, PlayerInjury } from '@/types';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Input } from '@/components/ui/Input';
import { useEvaluations } from '@/hooks/useEvaluations';
import { useCreateEvaluation } from '@/hooks/useCreateEvaluation';
import { useObservaciones } from '@/hooks/useObservaciones';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useUpdatePlayer } from '@/hooks/useUpdatePlayer';
import { useUploadPlayerPhoto } from '@/hooks/useUploadPlayerPhoto';
import { usePlayerInjuries } from '@/hooks/usePlayerInjuries';
import { usePlayerMeetings } from '@/hooks/usePlayerMeetings';
import { compressImage } from '@/lib/image';
import { formatLocalYYYYMMDD } from '@/lib/dateUtils';
import { 
  Award, ClipboardList, BarChart3, PlusCircle, 
  Calendar, Check, Star, Sparkles, User, AlertTriangle,
  History, Trash2, Heart, Plus, ShieldAlert, MessageSquare
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { PlayerProfileViewer } from '@/components/players/PlayerProfileViewer';

const METRICAS_ESPECIFICAS: Record<string, string[]> = {
  Portero: ['Juego aéreo', 'Blocaje', 'Reflejos', 'Juego con pies', 'Salida', 'Comunicación', 'Colocación'],
  Central: ['Juego aéreo', 'Duelos defensivos', 'Anticipación', 'Salida de balón', 'Velocidad al espacio', 'Posicionamiento defensivo', 'Liderazgo defensivo'],
  Defensa: ['Juego aéreo', 'Duelos defensivos', 'Anticipación', 'Salida de balón', 'Velocidad al espacio', 'Posicionamiento defensivo', 'Liderazgo defensivo'],
  Lateral: ['Velocidad', 'Centros laterales', '1vs1 defensivo', '1vs1 ofensivo', 'Recorrido', 'Vigilancias', 'Defensa segundo palo'],
  Pivote: ['Posicionamiento defensivo', 'Posicionamiento ofensivo', 'Juego aéreo', 'Pase corto', 'Pase largo', 'Orientación corporal', 'Toma de decisiones', 'Presión tras pérdida'],
  Centrocampista: ['Posicionamiento defensivo', 'Posicionamiento ofensivo', 'Juego aéreo', 'Pase corto', 'Pase largo', 'Orientación corporal', 'Toma de decisiones', 'Presión tras pérdida'],
  Interior: ['Posicionamiento defensivo', 'Posicionamiento ofensivo', 'Juego aéreo', 'Pase corto', 'Pase largo', 'Orientación corporal', 'Toma de decisiones', 'Presión tras pérdida'],
  Mediapunta: ['Recibir entre líneas', 'Último pase', 'Giro', 'Toma de decisiones', 'Finalización', 'Creatividad', 'Trabajo defensivo'],
  Extremo: ['1vs1', 'Velocidad', 'Desborde', 'Centros laterales', 'Ataque segundo palo', 'Retorno defensivo', 'Finalización'],
  Delantero: ['Finalización', 'Juego de espaldas', 'Ataque al espacio', '1vs1', 'Velocidad', 'Remate', 'Presión', 'Movimientos de ruptura']
};

const METRICAS_GENERALES = {
  TECNICA: ['Control', 'Pase', 'Conducción', 'Regate', 'Finalización'],
  TACTICA: ['Toma de decisiones', 'Posicionamiento', 'Comprensión del juego', 'Trabajo sin balón', 'Relación con compañeros'],
  CONDICIONAL: ['Velocidad', 'Aceleración', 'Resistencia', 'Fuerza', 'Potencia'],
  MENTAL: ['Concentración', 'Competitividad', 'Liderazgo', 'Comunicación', 'Actitud']
};

interface PlayerDetailProps {
  player: Player;
  onBack: () => void;
}

export function PlayerDetail({ player, onBack }: PlayerDetailProps) {
  const [currentPlayer, setCurrentPlayer] = useState<Player>(player);
  const [activeTab, setActiveTab] = useState<'personal' | 'resumen' | 'rendimiento' | 'tactica' | 'fisico' | 'multimedia' | 'ia'>('personal');
  const { isEditMode } = useEditMode();
  
  // Training Attendance States
  const [trainingAttendance, setTrainingAttendance] = useState<any[]>([]);
  const [trainingEvaluations, setTrainingEvaluations] = useState<any[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(false);

  // Load training history
  useEffect(() => {
    async function loadTrainingHistory() {
      if (!currentPlayer.id) return;
      try {
        setLoadingTraining(true);
        // Fetch attendance with session details
        const { data: attData, error: attErr } = await supabase
          .from('training_attendance')
          .select(`
            *,
            planning_sessions (
              id,
              fecha,
              tipo_sesion,
              objetivo_principal,
              carga
            )
          `)
          .eq('player_id', currentPlayer.id)
          .order('created_at', { ascending: false });
        
        if (attErr) throw attErr;

        // Fetch evaluations
        const { data: evalData, error: evalErr } = await supabase
          .from('training_evaluations')
          .select('*')
          .eq('player_id', currentPlayer.id);
        
        if (evalErr) throw evalErr;

        setTrainingAttendance(attData || []);
        setTrainingEvaluations(evalData || []);
      } catch (err) {
        console.error('Error loading training history:', err);
      } finally {
        setLoadingTraining(false);
      }
    }

    if (activeTab === 'rendimiento' || activeTab === 'resumen') {
      loadTrainingHistory();
    }
  }, [currentPlayer.id, activeTab]);

  // Compute training stats
  const trainingStats = useMemo(() => {
    const total = trainingAttendance.length;
    const attendedList = trainingAttendance.filter(a => a.attendance_status === 'Asiste');
    const attended = attendedList.length;
    const absences = trainingAttendance.filter(a => a.attendance_status === 'No asiste').length;
    const lesionados = trainingAttendance.filter(a => a.attendance_status === 'Lesionado').length;
    const bajas = trainingAttendance.filter(a => a.attendance_status === 'Baja temporal').length;
    
    const denominator = total - lesionados - bajas;
    const attendancePct = denominator > 0 ? Math.round((attended / denominator) * 100) : 0;
    
    // Average evaluation
    const ratedEvals = trainingEvaluations.filter(e => e.valoracion_global !== null && e.valoracion_global !== undefined);
    const avgValuation = ratedEvals.length > 0
      ? Number((ratedEvals.reduce((sum, e) => sum + Number(e.valoracion_global), 0) / ratedEvals.length).toFixed(1))
      : null;

    return {
      total,
      attended,
      absences,
      attendancePct,
      avgValuation
    };
  }, [trainingAttendance, trainingEvaluations]);

  // Custom hooks
  const { evaluations, loading: loadingEvals, refetch: refetchEvals } = useEvaluations(currentPlayer.id);
  const { createEvaluation, loading: savingEval, error: evalSaveError } = useCreateEvaluation();
  const { observaciones, loading: loadingObs, createObservacion, refetch: refetchObs } = useObservaciones(currentPlayer.id);
  const { summary: statsSummary, loading: loadingStats } = usePlayerStats(currentPlayer.id);
  const { updatePlayer } = useUpdatePlayer();
  const { uploadPhoto, loading: uploadingPhoto } = useUploadPlayerPhoto();
  const { injuries, loading: loadingInjuries, addInjury, updateInjury, deleteInjury } = usePlayerInjuries(currentPlayer.id);
  const { meetings, loading: loadingMeetings, createMeeting, deleteMeeting, updateMeeting } = usePlayerMeetings(currentPlayer.id);

  // Compute independent performance averages (360)
  const performanceAverages = useMemo(() => {
    // 1. Training average
    const ratedEvals = trainingEvaluations.filter(e => e.valoracion_global !== null && e.valoracion_global !== undefined);
    const avgTraining = ratedEvals.length > 0
      ? Number((ratedEvals.reduce((sum, e) => sum + Number(e.valoracion_global), 0) / ratedEvals.length).toFixed(2))
      : null;

    // 2. Official Matches average (Competicion !== 'Amistoso')
    const officialObs = observaciones.filter(o => o.competicion && o.competicion.toLowerCase() !== 'amistoso' && o.valoracion_global !== null);
    const avgOfficial = officialObs.length > 0
      ? Number((officialObs.reduce((sum, o) => sum + Number(o.valoracion_global), 0) / officialObs.length).toFixed(2))
      : null;

    // 3. Friendly Matches average (Competicion === 'Amistoso')
    const friendlyObs = observaciones.filter(o => o.competicion && o.competicion.toLowerCase() === 'amistoso' && o.valoracion_global !== null);
    const avgFriendly = friendlyObs.length > 0
      ? Number((friendlyObs.reduce((sum, o) => sum + Number(o.valoracion_global), 0) / friendlyObs.length).toFixed(2))
      : null;

    return {
      avgTraining,
      avgOfficial,
      avgFriendly,
      officialCount: officialObs.length,
      friendlyCount: friendlyObs.length,
      trainingCount: ratedEvals.length
    };
  }, [trainingEvaluations, observaciones]);

  // State for ratings
  const [perfilEspecífico, setPerfilEspecífico] = useState<Record<string, number>>({});
  const [valoracionesGenerales, setValoracionesGenerales] = useState<Record<string, number>>({});
  const [evaluador, setEvaluador] = useState<string>('Entrenador');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Meetings local state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    fecha: formatLocalYYYYMMDD(new Date()),
    solicitada_por: 'Staff' as 'Jugador' | 'Staff',
    motivo: '',
    desarrollo: '',
    resolucion: '',
    estado: 'Pendiente' as 'Pendiente' | 'En seguimiento' | 'Resuelta',
    participantes: [] as string[],
    adjuntos: [] as any[],
    firma_url: '',
    seguimiento_notas: '',
    recordatorio_fecha: '',
    metadata: {} as Record<string, any>
  });

  // Injuries tab local state
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryError, setInjuryError] = useState<string | null>(null);
  const [newInjury, setNewInjury] = useState({
    fecha_lesion: formatLocalYYYYMMDD(new Date()),
    tipo_lesion: '',
    diagnostico: '',
    informado_por: 'Fisio' as PlayerInjury['informado_por'],
    estado: 'Activa' as PlayerInjury['estado'],
    fecha_prevista_recuperacion: '',
    fecha_real_recuperacion: '',
    observaciones: ''
  });

  const playerPosition = currentPlayer.demarcacion;
  const specificMetricsList = useMemo(() => METRICAS_ESPECIFICAS[playerPosition] || METRICAS_ESPECIFICAS['Centrocampista'], [playerPosition]);

  // Sync state with latest evaluation from DB if available
  useEffect(() => {
    const initialSpecific: Record<string, number> = {};
    specificMetricsList.forEach(m => {
      initialSpecific[m] = 3;
    });

    const initialGeneral: Record<string, number> = {};
    Object.values(METRICAS_GENERALES).flat().forEach(m => {
      initialGeneral[m] = 3;
    });

    if (evaluations && evaluations.length > 0) {
      const latest = evaluations[0];
      
      // Load evaluator if stored
      if (latest.evaluado_por) {
        setEvaluador(latest.evaluado_por);
      }

      // Load specific metrics
      if (latest.perfil_especifico) {
        specificMetricsList.forEach(m => {
          initialSpecific[m] = latest.perfil_especifico?.[m] ?? 3;
        });
      } else if (latest.metricas) {
        // Fallback from old metricas field
        specificMetricsList.forEach(m => {
          initialSpecific[m] = latest.metricas?.[m] ?? 3;
        });
      }

      // Load general metrics
      if (latest.valoraciones_generales) {
        Object.values(METRICAS_GENERALES).flat().forEach(m => {
          initialGeneral[m] = latest.valoraciones_generales?.[m] ?? 3;
        });
      } else {
        // Fallback mapping from individual fields
        const fieldMap: Record<string, keyof DetailedEvaluation> = {
          'Velocidad': 'velocidad',
          'Aceleración': 'aceleracion',
          'Fuerza': 'fuerza',
          'Resistencia': 'resistencia',
          'Juego aéreo': 'juego_aereo',
          'Marcaje': 'marcaje',
          'Entrada Defensiva': 'entrada_defensiva',
          'Posicionamiento': 'posicionamiento_defensivo',
          'Trabajo Defensivo': 'trabajo_defensivo',
          'Pase': 'pase_corto',
          'Pase corto': 'pase_corto',
          'Pase largo': 'pase_largo',
          'Control orientado': 'control_orientado',
          'Regate': 'regate',
          'Centros': 'centros',
          'Finalización': 'finalizacion',
          'Disparo lejano': 'disparo_lejano',
          'Trabajo Ofensivo': 'trabajo_ofensivo',
          'Visión de juego': 'vision_juego',
          'Inteligencia táctica': 'inteligencia_tactica',
          'Liderazgo': 'liderazgo'
        };
        Object.values(METRICAS_GENERALES).flat().forEach(m => {
          const field = fieldMap[m];
          if (field && latest[field] !== undefined) {
            initialGeneral[m] = latest[field] as number;
          }
        });
      }
    }
    setPerfilEspecífico(initialSpecific);
    setValoracionesGenerales(initialGeneral);
  }, [evaluations, playerPosition, specificMetricsList]);

  // Handle rating change
  const handleSpecificMetricChange = (metricName: string, val: number) => {
    setPerfilEspecífico(prev => ({ ...prev, [metricName]: val }));
  };

  const handleGeneralMetricChange = (metricName: string, val: number) => {
    setValoracionesGenerales(prev => ({ ...prev, [metricName]: val }));
  };

  // Recalculate global rating dynamically
  const computedGlobalRating = useMemo(() => {
    const specificVals = Object.values(perfilEspecífico);
    const generalVals = Object.values(valoracionesGenerales);
    const allVals = [...specificVals, ...generalVals];
    if (allVals.length === 0) return 3.0;
    const sum = allVals.reduce((acc, v) => acc + v, 0);
    return Number((sum / allVals.length).toFixed(1));
  }, [perfilEspecífico, valoracionesGenerales]);

  // Save evaluations
  const handleSaveEvaluation = async () => {
    setShowError(null);
    setSaveSuccess(false);

    const payload: Omit<DetailedEvaluation, 'id' | 'created_at'> = {
      player_id: currentPlayer.id,
      fecha_evaluacion: formatLocalYYYYMMDD(new Date()),
      perfil_especifico: perfilEspecífico,
      valoraciones_generales: valoracionesGenerales,
      evaluado_por: evaluador,
      valoracion_global: computedGlobalRating
    };

    const saved = await createEvaluation(payload);
    if (saved) {
      setSaveSuccess(true);
      refetchEvals();
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setShowError(evalSaveError || 'Error al conectar con la base de datos de Supabase.');
    }
  };

  // Local state for new observation form
  const [newObs, setNewObs] = useState({
    rival: '',
    competicion: 'Liga',
    minutos_jugados: 90,
    observacion_tecnica: '',
    observacion_tactica: '',
    observacion_fisica: '',
    observacion_mental: '',
    valoracion_global: 3.0,
  });

  const [showObsForm, setShowObsForm] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);

  const handleObsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setObsError(null);
    if (!newObs.rival) {
      setObsError('El nombre del rival es obligatorio');
      return;
    }
    const payload = {
      player_id: currentPlayer.id,
      fecha: formatLocalYYYYMMDD(new Date()),
      ...newObs,
    };
    const created = await createObservacion(payload);
    if (created) {
      setShowObsForm(false);
      setNewObs({
        rival: '',
        competicion: 'Liga',
        minutos_jugados: 90,
        observacion_tecnica: '',
        observacion_tactica: '',
        observacion_fisica: '',
        observacion_mental: '',
        valoracion_global: 3.0,
      });
    } else {
      setObsError('Error al registrar la observación en Supabase');
    }
  };

  // Handle Meeting submit
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeetingError(null);
    if (!newMeeting.motivo) {
      setMeetingError('El motivo de la reunión es obligatorio');
      return;
    }
    const payload = {
      player_id: currentPlayer.id,
      fecha: newMeeting.fecha,
      solicitada_por: newMeeting.solicitada_por,
      motivo: newMeeting.motivo,
      desarrollo: newMeeting.desarrollo || null,
      resolucion: newMeeting.resolucion || null,
      estado: newMeeting.estado,
      participantes: newMeeting.participantes,
      adjuntos: newMeeting.adjuntos,
      firma_url: newMeeting.firma_url || null,
      seguimiento_notas: newMeeting.seguimiento_notas || null,
      recordatorio_fecha: newMeeting.recordatorio_fecha || null,
      metadata: newMeeting.metadata || {}
    };
    const created = await createMeeting(payload);
    if (created) {
      setShowMeetingForm(false);
      setNewMeeting({
        fecha: formatLocalYYYYMMDD(new Date()),
        solicitada_por: 'Staff',
        motivo: '',
        desarrollo: '',
        resolucion: '',
        estado: 'Pendiente',
        participantes: [],
        adjuntos: [],
        firma_url: '',
        seguimiento_notas: '',
        recordatorio_fecha: '',
        metadata: {}
      });
    } else {
      setMeetingError('Error al guardar la reunión en Supabase');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta reunión?')) {
      const deleted = await deleteMeeting(meetingId);
      if (!deleted) {
        alert('Error al eliminar la reunión de la base de datos.');
      }
    }
  };

  // Handle Injury submit
  const handleInjurySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInjuryError(null);
    if (!newInjury.tipo_lesion || !newInjury.diagnostico) {
      setInjuryError('El tipo de lesión y el diagnóstico son obligatorios');
      return;
    }

    const payload = {
      player_id: currentPlayer.id,
      fecha_lesion: newInjury.fecha_lesion,
      tipo_lesion: newInjury.tipo_lesion,
      diagnostico: newInjury.diagnostico,
      informado_por: newInjury.informado_por,
      estado: newInjury.estado,
      fecha_prevista_recuperacion: newInjury.fecha_prevista_recuperacion || null,
      fecha_real_recuperacion: newInjury.fecha_real_recuperacion || null,
      observaciones: newInjury.observaciones || null
    };

    const saved = await addInjury(payload);
    if (saved) {
      // Sync player state with injury if active
      if (newInjury.estado === 'Activa' || newInjury.estado === 'Recaída' || newInjury.estado === 'En recuperación') {
        const updatedPlayer = await updatePlayer(currentPlayer.id, { estado: 'Lesionado' });
        if (updatedPlayer) setCurrentPlayer(updatedPlayer);
      }
      setShowInjuryForm(false);
      setNewInjury({
        fecha_lesion: formatLocalYYYYMMDD(new Date()),
        tipo_lesion: '',
        diagnostico: '',
        informado_por: 'Fisio',
        estado: 'Activa',
        fecha_prevista_recuperacion: '',
        fecha_real_recuperacion: '',
        observaciones: ''
      });
    } else {
      setInjuryError('Error al registrar la lesión en Supabase');
    }
  };

  const handleUpdateInjuryStatus = async (injuryId: string, nextStatus: PlayerInjury['estado']) => {
    const isCleared = nextStatus === 'Alta médica';
    const updates: Partial<PlayerInjury> = { 
      estado: nextStatus,
      fecha_real_recuperacion: isCleared ? formatLocalYYYYMMDD(new Date()) : null
    };
    
    const updated = await updateInjury(injuryId, updates);
    if (updated) {
      // If cleared, set player back to Disponible
      if (isCleared) {
        const activeInjuries = injuries.filter(inj => inj.id !== injuryId && (inj.estado === 'Activa' || inj.estado === 'Recaída' || inj.estado === 'En recuperación'));
        if (activeInjuries.length === 0) {
          const updatedPlayer = await updatePlayer(currentPlayer.id, { estado: 'Disponible' });
          if (updatedPlayer) setCurrentPlayer(updatedPlayer);
        }
      }
    }
  };

  const handleDeleteInjury = async (injuryId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta lesión del historial?')) {
      const ok = await deleteInjury(injuryId);
      if (ok) {
        const activeInjuries = injuries.filter(inj => inj.id !== injuryId && (inj.estado === 'Activa' || inj.estado === 'Recaída' || inj.estado === 'En recuperación'));
        if (activeInjuries.length === 0 && currentPlayer.estado === 'Lesionado') {
          const updatedPlayer = await updatePlayer(currentPlayer.id, { estado: 'Disponible' });
          if (updatedPlayer) setCurrentPlayer(updatedPlayer);
        }
      }
    }
  };

  const getAge = (birthDateString: string) => {
    if (!birthDateString) return '-';
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <button 
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        &larr; Volver a la Plantilla
      </button>

      {/* Cabecera Ultra Compacta (Contexto) */}
      <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <Avatar src={currentPlayer.foto_url || undefined} name={`${currentPlayer.nombre} ${currentPlayer.apellidos}`} size="md" className="w-12 h-12 border-2 border-slate-700" />
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">
            <span className="text-[#CC0E21] mr-1.5 font-black">#{currentPlayer.dorsal}</span>
            {currentPlayer.nombre} {currentPlayer.apellidos}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-300">{currentPlayer.demarcacion}</span>
            <span>&bull;</span>
            <span>{currentPlayer.equipo || 'Indautxu Juvenil A'}</span>
          </div>
        </div>
        <div className="ml-auto">
          {currentPlayer.estado && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              currentPlayer.estado === 'Disponible' ? 'bg-green-950/20 text-green-400 border-green-900/30' :
              currentPlayer.estado === 'Lesionado' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
              currentPlayer.estado === 'Duda' ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
              currentPlayer.estado === 'Sancionado' ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' :
              'bg-slate-850/40 text-slate-400 border-slate-700/50'
            }`}>
              {currentPlayer.estado}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'personal'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          Personal
        </button>
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'resumen'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('rendimiento')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'rendimiento'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="h-4 w-4" />
          Rendimiento
        </button>
        <button
          onClick={() => setActiveTab('tactica')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'tactica'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Táctica
        </button>
        <button
          onClick={() => setActiveTab('fisico')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'fisico'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="h-4 w-4" />
          Físico
          {injuries.filter(i => i.estado === 'Activa' || i.estado === 'Recaída').length > 0 && (
            <span className="ml-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
              {injuries.filter(i => i.estado === 'Activa' || i.estado === 'Recaída').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('multimedia')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'multimedia'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          Multimedia
        </button>
        <button
          onClick={() => setActiveTab('ia')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'ia'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          IA
        </button>
      </div>

      {/* Contenido de las Tabs */}
      <div className="pt-2">
        {/* Banner de errores de guardado global */}
        {showError && (
          <div className="mb-4 p-4 bg-red-950/30 border border-red-900/40 text-red-400 rounded-2xl flex items-start gap-2.5 text-xs animate-shake">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">Error al guardar valoraciones:</strong>
              <span className="opacity-90">{showError}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Personal */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Información Personal</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Fecha Nacimiento:</span> <span className="text-white">{currentPlayer.fecha_nacimiento}</span></div>
                <div><span className="text-slate-500">Edad:</span> <span className="text-white">{getAge(currentPlayer.fecha_nacimiento)}</span></div>
                <div><span className="text-slate-500">Nacionalidad:</span> <span className="text-white">{currentPlayer.nacionalidad || '-'}</span></div>
                <div><span className="text-slate-500">Pierna Dominante:</span> <span className="text-white">{currentPlayer.pierna_dominante}</span></div>
              </div>
            </div>
            {isEditMode && (
              <div className="flex justify-end mt-4">
                <Button variant="secondary" className="text-xs" onClick={() => alert('Edición de datos personales habilitada desde la Plantilla')}>
                  Gestionar Datos Personales
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Resumen */}
        {activeTab === 'resumen' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rendimiento Global */}
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-center items-center text-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Valoración Global Vigente</h3>
                <div className="text-5xl font-black text-amber-400 flex items-center gap-2">
                  <Star className="h-10 w-10 fill-amber-400" />
                  {computedGlobalRating}
                </div>
                {currentPlayer.rol_abp && (
                  <p className="mt-4 text-xs text-slate-300">
                    <strong className="text-slate-500 block mb-1">Rol Táctico Principal</strong>
                    {currentPlayer.rol_abp.substring(0, 100)}{currentPlayer.rol_abp.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
              
              {/* Entrenamientos */}
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  Entrenamientos
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Asistencia Total</span>
                    <span className="font-bold text-slate-200">{trainingStats.attendancePct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${trainingStats.attendancePct}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Sesiones Atendidas</span>
                    <span className="text-slate-300">{trainingStats.attended} de {trainingStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/50">
                    <span className="text-slate-500">Valoración Media</span>
                    <span className="text-amber-400 font-bold">{trainingStats.avgValuation || '-'} ★</span>
                  </div>
                </div>
              </div>

              {/* Competición */}
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  Competición (Liga)
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Partidos Jugados</span>
                    <span className="font-bold text-white text-sm">{statsSummary?.partidos || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Titularidades</span>
                    <span className="font-bold text-white">{statsSummary?.titularidades || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Minutos Totales</span>
                    <span className="font-bold text-white">{statsSummary?.minutos || 0}m</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                    <span className="text-slate-400">Goles / Asistencias</span>
                    <span className="font-bold text-green-400">{statsSummary?.goles || 0} / {statsSummary?.asistencias || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Táctica (Antes: Deportivo) */}
        {activeTab === 'tactica' && (
          <div className="space-y-6">
            
            {/* Conclusiones Generales del Jugador */}
            <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-400" />
                Conclusiones Generales / Rol Táctico
              </h3>
              <textarea
                value={currentPlayer.rol_abp || ''}
                disabled={!isEditMode}
                onChange={async (e) => {
                  const text = e.target.value;
                  // Store locally first
                  setCurrentPlayer(prev => ({ ...prev, rol_abp: text }));
                }}
                onBlur={async () => {
                  if (isEditMode) {
                    await updatePlayer(currentPlayer.id, { rol_abp: currentPlayer.rol_abp });
                  }
                }}
                placeholder="Escribe aquí las conclusiones, observaciones generales, fortalezas y plan de mejora de este jugador..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-slate-200 outline-none focus:border-[#CC0E21] h-32 resize-none"
              />
              <span className="text-[10px] text-slate-500 block leading-tight">
                * Este texto se guarda automáticamente al salir del campo. Escribe conclusiones sobre su evolución táctica y física.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Perfil Específico por Posición ({playerPosition.toUpperCase()})
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evalúa las características clave para la posición principal del jugador.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={evaluador}
                    onChange={e => setEvaluador(e.target.value)}
                    placeholder="Evaluador..."
                    className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 outline-none w-32 focus:border-[#CC0E21]"
                  />
                </div>
                {saveSuccess && (
                  <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                    <Check className="h-4 w-4" /> ¡Guardado!
                  </span>
                )}
                {isEditMode && (
                  <Button onClick={handleSaveEvaluation} loading={savingEval} className="px-5 py-2 font-bold text-xs">
                    Guardar Valoraciones
                  </Button>
                )}
              </div>
            </div>

            {loadingEvals ? (
              <div className="p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-24 w-full bg-slate-900 rounded animate-pulse" />
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-6">
                <h3 className="text-sm font-bold text-[#CC0E21] uppercase tracking-wider border-b border-slate-800/60 pb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#CC0E21]" /> Habilidades Clave
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {specificMetricsList.map((metric) => (
                    <StarRating
                      key={metric}
                      label={metric}
                      value={perfilEspecífico[metric] ?? 3}
                      onChange={isEditMode ? (val) => handleSpecificMetricChange(metric, val) : undefined}
                      size={20}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Rendimiento - Valoraciones Generales */}
        {activeTab === 'rendimiento' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#CC0E21]" />
                  Valoraciones Generales
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atributos globales estructurados por categorías técnicas, tácticas, físicas y mentales.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={evaluador}
                    disabled={!isEditMode}
                    onChange={e => setEvaluador(e.target.value)}
                    placeholder="Evaluador..."
                    className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 outline-none w-32 focus:border-[#CC0E21]"
                  />
                </div>
                {saveSuccess && (
                  <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                    <Check className="h-4 w-4" /> ¡Guardado!
                  </span>
                )}
                {isEditMode && (
                  <Button onClick={handleSaveEvaluation} loading={savingEval} className="px-5 py-2 font-bold text-xs">
                    Guardar Valoraciones
                  </Button>
                )}
              </div>
            </div>

            {loadingEvals ? (
              <div className="p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-24 w-full bg-slate-900 rounded animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(METRICAS_GENERALES).map(([cat, list]) => (
                  <div key={cat} className="p-5 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-4">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-1.5">
                      {cat}
                    </h4>
                    <div className="space-y-3">
                      {list.map(metric => (
                        <StarRating
                          key={metric}
                          label={metric}
                          value={valoracionesGenerales[metric] ?? 3}
                          onChange={isEditMode ? (val) => handleGeneralMetricChange(metric, val) : undefined}
                          size={18}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Físico (Historial de Lesiones) */}
        {activeTab === 'fisico' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <History className="h-5 w-5 text-slate-400" />
                Historial Médico de Lesiones
              </h3>
              {isEditMode && (
                <Button onClick={() => setShowInjuryForm(!showInjuryForm)} variant={showInjuryForm ? 'secondary' : 'primary'} className="flex items-center gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  {showInjuryForm ? 'Ocultar Formulario' : 'Registrar Lesión'}
                </Button>
              )}
            </div>

            {showInjuryForm && (
              <form onSubmit={handleInjurySubmit} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nueva Ficha de Lesión</h4>
                {injuryError && (
                  <div className="p-3 bg-red-950/25 border border-red-900/40 text-red-405 text-xs rounded-xl">
                    {injuryError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input 
                    label="Fecha de Lesión *" 
                    type="date"
                    value={newInjury.fecha_lesion} 
                    onChange={e => setNewInjury(prev => ({ ...prev, fecha_lesion: e.target.value }))} 
                  />
                  <Input 
                    label="Tipo de Lesión *" 
                    placeholder="Ej: Esguince tobillo, Rotura fibrilar" 
                    value={newInjury.tipo_lesion} 
                    onChange={e => setNewInjury(prev => ({ ...prev, tipo_lesion: e.target.value }))} 
                  />
                  <Input 
                    label="Diagnóstico / Detalles *" 
                    placeholder="Ej: Grado II ligamento lateral externo" 
                    value={newInjury.diagnostico} 
                    onChange={e => setNewInjury(prev => ({ ...prev, diagnostico: e.target.value }))} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Informado Por</label>
                    <select
                      value={newInjury.informado_por}
                      onChange={e => setNewInjury(prev => ({ ...prev, informado_por: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-200 outline-none"
                    >
                      <option value="Fisio">Fisioterapeuta</option>
                      <option value="Preparador físico">Preparador Físico</option>
                      <option value="Entrenador">Entrenador</option>
                      <option value="Segundo entrenador">Segundo Entrenador</option>
                      <option value="Jugador">Propio Jugador</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Estado de Lesión</label>
                    <select
                      value={newInjury.estado}
                      onChange={e => setNewInjury(prev => ({ ...prev, estado: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-200 outline-none"
                    >
                      <option value="Activa">Activa / De baja</option>
                      <option value="En recuperación">En Readaptación</option>
                      <option value="Alta médica">Alta Médica</option>
                      <option value="Recaída">Recaída</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Fecha Prevista Recuperación" 
                    type="date"
                    value={newInjury.fecha_prevista_recuperacion}
                    onChange={e => setNewInjury(prev => ({ ...prev, fecha_prevista_recuperacion: e.target.value }))} 
                  />
                  <Input 
                    label="Fecha Real Alta" 
                    type="date"
                    disabled={newInjury.estado !== 'Alta médica'}
                    value={newInjury.fecha_real_recuperacion}
                    onChange={e => setNewInjury(prev => ({ ...prev, fecha_real_recuperacion: e.target.value }))} 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-450 font-bold block mb-1">Observaciones Médicas</label>
                  <textarea 
                    className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
                    value={newInjury.observaciones}
                    onChange={e => setNewInjury(prev => ({ ...prev, observaciones: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit" className="px-5 py-2 text-xs font-bold">
                    Guardar Ficha Médica
                  </Button>
                </div>
              </form>
            )}

            {loadingInjuries ? (
              <div className="space-y-3">
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
              </div>
            ) : injuries.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                No hay historial de lesiones registrado para este jugador.
              </div>
            ) : (
              <div className="space-y-4">
                {injuries.map(injury => (
                  <div key={injury.id} className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-3 relative group">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-850 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">{injury.fecha_lesion}</span>
                        <strong className="text-slate-100 text-xs">{injury.tipo_lesion}</strong>
                        <Badge variant="default" className="text-[9px] bg-slate-800 text-slate-350">{injury.informado_por}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={injury.estado}
                          disabled={!isEditMode}
                          onChange={e => handleUpdateInjuryStatus(injury.id, e.target.value as any)}
                          className="bg-slate-950 border border-slate-850 text-[10px] px-2 py-0.5 rounded-lg text-slate-300 outline-none"
                        >
                          <option value="Activa">Baja Activa</option>
                          <option value="En recuperación">En recuperación</option>
                          <option value="Alta médica">Alta Médica</option>
                          <option value="Recaída">Recaída</option>
                        </select>
                        {isEditMode && (
                          <button 
                            onClick={() => handleDeleteInjury(injury.id)} 
                            className="text-red-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-300">
                      <div><strong className="text-slate-500">Diagnóstico:</strong> {injury.diagnostico}</div>
                      {injury.observaciones && <div><strong className="text-slate-500">Observaciones:</strong> {injury.observaciones}</div>}
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 pt-1">
                        <div>Prevista: {injury.fecha_prevista_recuperacion || 'No especificada'}</div>
                        <div>Alta Real: {injury.fecha_real_recuperacion || 'Aún de baja'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Estadísticas Acumuladas */}
        {activeTab === 'rendimiento' && (
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-6">
            {/* Rendimiento y Valoraciones Medias 360 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rendimiento y Valoraciones Medias (360º)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Media Entrenamientos</span>
                    <span className="text-2xl font-black text-[#CC0E21]">
                      {performanceAverages.avgTraining !== null ? `${performanceAverages.avgTraining} ★` : '-'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 block">
                    Calculado sobre {performanceAverages.trainingCount} valoraciones diarias
                  </span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Media Partidos Oficiales</span>
                    <span className="text-2xl font-black text-green-400">
                      {performanceAverages.avgOfficial !== null ? `${performanceAverages.avgOfficial} ★` : '-'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 block">
                    Calculado sobre {performanceAverages.officialCount} observaciones de Liga/Copa
                  </span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Media Partidos Amistosos</span>
                    <span className="text-2xl font-black text-blue-400">
                      {performanceAverages.avgFriendly !== null ? `${performanceAverages.avgFriendly} ★` : '-'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 block">
                    Calculado sobre {performanceAverages.friendlyCount} observaciones de Amistosos
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800/60 my-4" />

            <div>
              <h3 className="text-base font-bold text-slate-100">Estadísticas Acumuladas de Liga</h3>
              <p className="text-xs text-slate-450">Historial deportivo consolidado del jugador en partidos oficiales.</p>
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="h-20 bg-slate-850 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cuadrícula de estadísticas de Convocatorias y Minutos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Partidos Convocados</span>
                    <span className="text-2xl font-black text-white">{statsSummary.partidos}</span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Titularidades</span>
                    <span className="text-2xl font-black text-white">
                      {statsSummary.titularidades}
                      <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                        ({statsSummary.partidos > 0 ? Math.round((statsSummary.titularidades / statsSummary.partidos) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Minutos Totales</span>
                    <span className="text-2xl font-black text-white">
                      {statsSummary.minutos}m
                      <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                        ({statsSummary.partidos > 0 ? Math.round((statsSummary.minutos / (statsSummary.partidos * 90)) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">No Convocado</span>
                    <span className="text-2xl font-black text-slate-400">
                      0
                      <span className="text-[11px] text-slate-500 font-normal ml-1.5">(0%)</span>
                    </span>
                  </div>
                </div>

                {/* Cuadrícula de rendimiento futbolístico */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Goles / Asistencias</span>
                    <span className="text-2xl font-black text-green-400">
                      {statsSummary.goles} / {statsSummary.asistencias}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">T. Amarillas / Rojas</span>
                    <span className="text-2xl font-black text-amber-500">
                      {statsSummary.tarjetas_amarillas} / {statsSummary.tarjetas_rojas}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Recuperaciones</span>
                    <span className="text-2xl font-black text-white">{statsSummary.recuperaciones}</span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Efectividad Pases</span>
                    <span className="text-xl font-bold text-slate-200">
                      {statsSummary.pases_totales > 0 
                        ? `${((statsSummary.pases_completados / statsSummary.pases_totales) * 100).toFixed(0)}%`
                        : '-'
                      }
                    </span>
                    <span className="text-[9px] text-slate-550 block leading-none mt-0.5">
                      {statsSummary.pases_completados} de {statsSummary.pases_totales}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Rendimiento - Observaciones de Partidos */}
        {activeTab === 'rendimiento' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Histórico de Observaciones</h3>
              <Button onClick={() => setShowObsForm(!showObsForm)} variant={showObsForm ? 'secondary' : 'primary'} className="flex items-center gap-1 text-xs">
                <PlusCircle className="h-4 w-4" />
                {showObsForm ? 'Ocultar Formulario' : 'Nueva Observación'}
              </Button>
            </div>

            {showObsForm && (
              <form onSubmit={handleObsSubmit} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Registrar Ficha de Partido</h4>
                {obsError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl">
                    {obsError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input 
                    label="Rival *" 
                    placeholder="Ej: Danok Bat" 
                    value={newObs.rival} 
                    onChange={e => setNewObs(prev => ({ ...prev, rival: e.target.value }))} 
                  />
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Competición</label>
                    <select
                      value={newObs.competicion}
                      onChange={e => setNewObs(prev => ({ ...prev, competicion: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-200 outline-none h-[38px] focus:border-[#CC0E21]"
                    >
                      <option value="Liga">Liga (Oficial)</option>
                      <option value="Copa">Copa (Oficial)</option>
                      <option value="Amistoso">Amistoso</option>
                    </select>
                  </div>
                  <Input 
                    label="Minutos Jugados" 
                    type="number" 
                    value={newObs.minutos_jugados} 
                    onChange={e => setNewObs(prev => ({ ...prev, minutos_jugados: Number(e.target.value) }))} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Técnica</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newObs.observacion_tecnica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_tecnica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Táctica</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newObs.observacion_tactica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_tactica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Física</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newObs.observacion_fisica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_fisica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Mental / Actitudinal</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newObs.observacion_mental}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_mental: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">Valoración Global:</span>
                    <StarRating value={newObs.valoracion_global} onChange={val => setNewObs(prev => ({ ...prev, valoracion_global: val }))} size={18} />
                  </div>
                  <Button type="submit" className="px-5 py-2 text-xs font-bold">
                    Guardar Observación
                  </Button>
                </div>
              </form>
            )}

            {loadingObs ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-slate-900/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : observaciones.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                No hay observaciones registradas para este jugador.
              </div>
            ) : (
              <div className="space-y-4">
                {observaciones.map(obs => (
                  <div key={obs.id} className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{obs.rival}</span>
                        <Badge variant="default" className="text-[10px]">{obs.competicion}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {obs.fecha}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {obs.minutos_jugados} minutos
                        </span>
                        <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5 ml-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400" /> {Number(obs.valoracion_global).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {obs.observacion_tecnica && (
                        <div>
                          <strong className="text-slate-400">Técnica:</strong>
                          <p className="text-slate-200 mt-0.5 leading-relaxed">{obs.observacion_tecnica}</p>
                        </div>
                      )}
                      {obs.observacion_tactica && (
                        <div>
                          <strong className="text-slate-400">Táctica:</strong>
                          <p className="text-slate-200 mt-0.5 leading-relaxed">{obs.observacion_tactica}</p>
                        </div>
                      )}
                      {obs.observacion_fisica && (
                        <div>
                          <strong className="text-slate-400">Física:</strong>
                          <p className="text-slate-200 mt-0.5 leading-relaxed">{obs.observacion_fisica}</p>
                        </div>
                      )}
                      {obs.observacion_mental && (
                        <div>
                          <strong className="text-slate-400">Mental:</strong>
                          <p className="text-slate-200 mt-0.5 leading-relaxed">{obs.observacion_mental}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Rendimiento - Historial de Entrenamientos */}
        {activeTab === 'rendimiento' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-[#CC0E21]" />
              Historial de Entrenamientos y Rendimiento
            </h3>

            {loadingTraining ? (
              <div className="space-y-4">
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
              </div>
            ) : trainingAttendance.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                No hay registros de entrenamientos para este jugador.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen de Asistencia */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Entrenamientos Convocados</span>
                    <span className="text-2xl font-black text-white">{trainingStats.total}</span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-center">
                    <span className="text-[10px] text-green-400 font-bold uppercase block">Asistidos</span>
                    <span className="text-2xl font-black text-green-400">{trainingStats.attended}</span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-center">
                    <span className="text-[10px] text-red-400 font-bold uppercase block">Ausencias</span>
                    <span className="text-2xl font-black text-red-500">{trainingStats.absences}</span>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-center">
                    <span className="text-[10px] text-[#CC0E21] font-bold uppercase block">Media de Valoración</span>
                    <span className="text-2xl font-black text-[#CC0E21]">
                      {trainingStats.avgValuation !== null ? `${trainingStats.avgValuation} ★` : '-'}
                    </span>
                  </div>
                </div>

                {/* Porcentaje de asistencia en barra visual */}
                <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400">Porcentaje de Asistencia Real</span>
                    <span className="text-white">{trainingStats.attendancePct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        trainingStats.attendancePct >= 85 ? 'bg-green-500' :
                        trainingStats.attendancePct >= 70 ? 'bg-amber-500' : 'bg-red-650'
                      }`}
                      style={{ width: `${trainingStats.attendancePct}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500">
                    * Excluye las sesiones marcadas como &quot;Lesionado&quot; o &quot;Baja temporal&quot; del denominador para calcular la asistencia real del jugador.
                  </p>
                </div>

                {/* Timeline de sesiones */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800/85 bg-slate-900/20 shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Tipo Sesión</th>
                        <th className="px-4 py-3">Objetivo</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Valoración Global</th>
                        <th className="px-4 py-3">Notas / Comentarios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                      {trainingAttendance.map(att => {
                        const session = att.planning_sessions || {};
                        const valuation = trainingEvaluations.find(e => e.session_id === att.session_id) || {};
                        
                        return (
                          <tr key={att.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-400">
                              {session.fecha || '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-200">
                              {session.tipo_sesion || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {session.objetivo_principal || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                att.attendance_status === 'Asiste' ? 'bg-green-950/20 text-green-400 border-green-900/30' :
                                att.attendance_status === 'No asiste' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                'bg-slate-850 text-slate-350 border-slate-700/40'
                              }`}>
                                {att.attendance_status}
                              </span>
                              {att.absence_reason && (
                                <span className="block text-[9px] text-slate-500 mt-0.5">
                                  Motivo: {att.absence_reason}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {att.attendance_status === 'Asiste' && valuation.valoracion_global !== undefined && valuation.valoracion_global !== null ? (
                                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                  <Star className="h-3.5 w-3.5 fill-amber-400" /> {Number(valuation.valoracion_global).toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-300 italic max-w-xs truncate" title={valuation.observaciones || att.attendance_notes || ''}>
                              {valuation.observaciones || att.attendance_notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Rendimiento - Historial de Reuniones */}
        {activeTab === 'rendimiento' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <MessageSquare className="h-5 w-5 text-[#CC0E21]" />
                Reuniones Individuales y Seguimiento
              </h3>
              {isEditMode && (
                <Button onClick={() => setShowMeetingForm(!showMeetingForm)} variant={showMeetingForm ? 'secondary' : 'primary'} className="flex items-center gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  {showMeetingForm ? 'Ocultar Formulario' : 'Registrar Reunión'}
                </Button>
              )}
            </div>

            {showMeetingForm && (
              <form onSubmit={handleMeetingSubmit} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">Ficha de Nueva Reunión</h4>
                {meetingError && (
                  <div className="p-3 bg-red-950/25 border border-red-900/40 text-red-405 text-xs rounded-xl">
                    {meetingError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input 
                    label="Fecha *" 
                    type="date"
                    value={newMeeting.fecha} 
                    onChange={e => setNewMeeting(prev => ({ ...prev, fecha: e.target.value }))} 
                  />
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Solicitada Por</label>
                    <select
                      value={newMeeting.solicitada_por}
                      onChange={e => setNewMeeting(prev => ({ ...prev, solicitada_por: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-200 outline-none h-[38px]"
                    >
                      <option value="Staff">Staff Técnico</option>
                      <option value="Jugador">Jugador</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Estado</label>
                    <select
                      value={newMeeting.estado}
                      onChange={e => setNewMeeting(prev => ({ ...prev, estado: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-200 outline-none h-[38px]"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En seguimiento">En seguimiento</option>
                      <option value="Resuelta">Resuelta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input 
                    label="Motivo *" 
                    placeholder="Ej: Revisión de rendimiento táctico, charla sobre minutos jugados, etc." 
                    value={newMeeting.motivo} 
                    onChange={e => setNewMeeting(prev => ({ ...prev, motivo: e.target.value }))} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Desarrollo de la Charla</label>
                    <textarea 
                      placeholder="Resumen de los temas tratados..."
                      className="w-full h-24 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newMeeting.desarrollo}
                      onChange={e => setNewMeeting(prev => ({ ...prev, desarrollo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-450 font-bold block mb-1">Resolución / Acuerdos</label>
                    <textarea 
                      placeholder="Conclusiones y compromisos alcanzados..."
                      className="w-full h-24 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
                      value={newMeeting.resolucion}
                      onChange={e => setNewMeeting(prev => ({ ...prev, resolucion: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Campos de expansión futuros (Plegables o integrados) */}
                <div className="border-t border-slate-850 pt-4 space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Campos de Seguimiento Adicional (Preparados para crecer)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input 
                      label="Participantes (Separados por comas)" 
                      placeholder="Ej: Aitor, Preparador físico"
                      value={newMeeting.participantes.join(', ')}
                      onChange={e => setNewMeeting(prev => ({ ...prev, participantes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    />
                    <Input 
                      label="Seguimiento / Próximos pasos" 
                      placeholder="Ej: Revisar en 2 semanas"
                      value={newMeeting.seguimiento_notas}
                      onChange={e => setNewMeeting(prev => ({ ...prev, seguimiento_notas: e.target.value }))}
                    />
                    <Input 
                      label="Fecha de Recordatorio" 
                      type="date"
                      value={newMeeting.recordatorio_fecha}
                      onChange={e => setNewMeeting(prev => ({ ...prev, recordatorio_fecha: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" className="px-5 py-2 text-xs font-bold">
                    Guardar Reunión
                  </Button>
                </div>
              </form>
            )}

            {loadingMeetings ? (
              <div className="space-y-3">
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
                <div className="h-16 bg-slate-800 rounded animate-pulse" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                No hay reuniones registradas para este jugador.
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-4 relative group">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-850 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">{meeting.fecha}</span>
                        <strong className="text-slate-100 text-sm">{meeting.motivo}</strong>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                          meeting.solicitada_por === 'Staff' 
                            ? 'bg-[#CC0E21]/10 text-[#CC0E21] border-[#CC0E21]/20' 
                            : 'bg-blue-950/20 text-blue-400 border-blue-900/30'
                        }`}>
                          Por: {meeting.solicitada_por}
                        </span>
                        {meeting.participantes && meeting.participantes.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            (Con: {meeting.participantes.join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={meeting.estado}
                          disabled={!isEditMode}
                          onChange={async (e) => {
                            await updateMeeting(meeting.id, { estado: e.target.value as any });
                          }}
                          className="bg-slate-950 border border-slate-850 text-[10px] px-2 py-0.5 rounded-lg text-slate-350 outline-none"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En seguimiento">En seguimiento</option>
                          <option value="Resuelta">Resuelta</option>
                        </select>
                        {isEditMode && (
                          <button 
                            onClick={() => handleDeleteMeeting(meeting.id)} 
                            className="text-red-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {meeting.desarrollo && (
                        <div>
                          <strong className="text-slate-500 block mb-0.5 uppercase tracking-wide text-[9px] font-bold">Desarrollo:</strong>
                          <p className="text-slate-250 leading-relaxed bg-slate-950/30 p-3 rounded-xl border border-slate-850/40">{meeting.desarrollo}</p>
                        </div>
                      )}
                      {meeting.resolucion && (
                        <div>
                          <strong className="text-slate-500 block mb-0.5 uppercase tracking-wide text-[9px] font-bold">Resolución / Acuerdos:</strong>
                          <p className="text-slate-250 leading-relaxed bg-slate-950/30 p-3 rounded-xl border border-slate-850/40">{meeting.resolucion}</p>
                        </div>
                      )}
                    </div>

                    {/* Mostrar campos de expansión si existen */}
                    {(meeting.seguimiento_notas || meeting.recordatorio_fecha) && (
                      <div className="bg-slate-900/10 p-3 rounded-xl border border-slate-850/40 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                        {meeting.seguimiento_notas && (
                          <div>
                            <span className="font-bold text-slate-500 mr-1">Seguimiento:</span>
                            {meeting.seguimiento_notas}
                          </div>
                        )}
                        {meeting.recordatorio_fecha && (
                          <div>
                            <span className="font-bold text-slate-500 mr-1">Fecha Recordatorio:</span>
                            {meeting.recordatorio_fecha}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 10: Multimedia */}
        {activeTab === 'multimedia' && (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl animate-fadeIn">
            <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Galería Multimedia (Próximamente)</h3>
            <p className="text-sm text-slate-500 mt-2">Este módulo almacenará vídeos, cortes de partidos e informes visuales del jugador.</p>
          </div>
        )}

        {/* Tab 11: IA */}
        {activeTab === 'ia' && (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl animate-fadeIn">
            <Sparkles className="h-12 w-12 text-[#CC0E21] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Asistente IA del Jugador (Próximamente)</h3>
            <p className="text-sm text-slate-500 mt-2">Chat conversacional inteligente enfocado en el rendimiento y la evaluación de este jugador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
