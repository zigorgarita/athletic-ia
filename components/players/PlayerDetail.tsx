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
import { compressImage } from '@/lib/image';
import { 
  Award, ClipboardList, BarChart3, PlusCircle, 
  Calendar, Check, Star, Sparkles, User, AlertTriangle,
  History, Trash2, Heart, Plus, ShieldAlert
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'deportivo' | 'valoraciones' | 'stats' | 'lesiones' | 'observations' | 'entrenamientos'>('profile');
  
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

    if (activeTab === 'entrenamientos') {
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
  const { observaciones, loading: loadingObs, createObservacion } = useObservaciones(currentPlayer.id);
  const { summary: statsSummary, loading: loadingStats } = usePlayerStats(currentPlayer.id);
  const { updatePlayer } = useUpdatePlayer();
  const { uploadPhoto, loading: uploadingPhoto } = useUploadPlayerPhoto();
  const { injuries, loading: loadingInjuries, addInjury, updateInjury, deleteInjury } = usePlayerInjuries(currentPlayer.id);

  // State for ratings
  const [perfilEspecífico, setPerfilEspecífico] = useState<Record<string, number>>({});
  const [valoracionesGenerales, setValoracionesGenerales] = useState<Record<string, number>>({});
  const [evaluador, setEvaluador] = useState<string>('Entrenador');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Injuries tab local state
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryError, setInjuryError] = useState<string | null>(null);
  const [newInjury, setNewInjury] = useState({
    fecha_lesion: new Date().toISOString().split('T')[0],
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
      fecha_evaluacion: new Date().toISOString().split('T')[0],
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
      fecha: new Date().toISOString().split('T')[0],
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
        fecha_lesion: new Date().toISOString().split('T')[0],
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
      fecha_real_recuperacion: isCleared ? new Date().toISOString().split('T')[0] : null
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

      {/* Tarjeta de Encabezado Principal */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row gap-6 items-center md:items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#CC0E21]/5 blur-[80px] pointer-events-none" />
        
        {/* Foto de Perfil Grande */}
        <div className="relative group cursor-pointer h-32 w-32 rounded-full overflow-hidden border-4 border-slate-850 shadow-2xl transition-all duration-300 hover:border-[#CC0E21]/40">
          <input
            type="file"
            accept="image/*"
            disabled={uploadingPhoto}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const compressed = await compressImage(file);
                const url = await uploadPhoto(compressed, currentPlayer.nombre);
                if (url) {
                  const updated = await updatePlayer(currentPlayer.id, { foto_url: url });
                  if (updated) {
                    setCurrentPlayer(updated);
                  }
                }
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer z-30"
            title="Cambiar foto"
          />
          <Avatar src={currentPlayer.foto_url} name={currentPlayer.nombre} size="xl" className="h-full w-full object-cover" />
          {!currentPlayer.foto_url && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors duration-200">
              <span className="absolute bottom-2 text-[8px] text-[#CC0E21] font-extrabold uppercase tracking-wider bg-slate-950/90 px-2 py-0.5 rounded-full border border-[#CC0E21]/30">
                {uploadingPhoto ? 'Subiendo...' : 'Añadir foto'}
              </span>
            </div>
          )}
          {currentPlayer.foto_url && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[8px] text-white font-extrabold uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/50">
                {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
              </span>
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-[#CC0E21] text-white font-black h-6 w-6 rounded-lg flex items-center justify-center text-[10px] shadow-lg z-20">
            #{currentPlayer.dorsal}
          </div>
        </div>

        {/* Información General */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 justify-center md:justify-start">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {currentPlayer.nombre} {currentPlayer.apellidos}
            </h1>
            <div className="relative self-center md:self-auto">
              <select
                value={currentPlayer.demarcacion}
                onChange={async (e) => {
                  const newPos = e.target.value as any;
                  const updated = await updatePlayer(currentPlayer.id, { demarcacion: newPos });
                  if (updated) {
                    setCurrentPlayer(updated);
                  }
                }}
                className="bg-slate-900/80 hover:bg-slate-800 text-[#CC0E21] border border-[#CC0E21]/20 rounded-xl px-3 py-1 text-xs outline-none focus:border-[#CC0E21] cursor-pointer font-bold transition-all duration-200 shadow-md shadow-[#CC0E21]/5 appearance-none pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23CC0E21' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
              >
                <option value="Portero" className="bg-slate-950 text-slate-200">Portero</option>
                <option value="Lateral" className="bg-slate-950 text-slate-200">Lateral</option>
                <option value="Central" className="bg-slate-950 text-slate-200">Central</option>
                <option value="Defensa" className="bg-slate-950 text-slate-200">Defensa</option>
                <option value="Pivote" className="bg-slate-950 text-slate-200">Pivote</option>
                <option value="Interior" className="bg-slate-950 text-slate-200">Interior</option>
                <option value="Centrocampista" className="bg-slate-950 text-slate-200">Centrocampista</option>
                <option value="Extremo" className="bg-slate-950 text-slate-200">Extremo</option>
                <option value="Delantero" className="bg-slate-950 text-slate-200">Delantero</option>
              </select>
            </div>
            {currentPlayer.estado && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border self-center md:self-auto ${
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

          {/* Fila de Datos Secundarios */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left max-w-2xl bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Edad</span>
              <span className="text-sm font-semibold text-slate-200">{getAge(currentPlayer.fecha_nacimiento)} años</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Estatura / Peso</span>
              <span className="text-sm font-semibold text-slate-200">
                {currentPlayer.altura ? `${currentPlayer.altura}m` : '-'} / {currentPlayer.peso ? `${currentPlayer.peso}kg` : '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Pierna Dominante</span>
              <span className="text-sm font-semibold text-slate-200">{currentPlayer.pierna_dominante}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Posición Sec.</span>
              <div className="relative">
                <select
                  value={currentPlayer.posicion_secundaria || ''}
                  onChange={async (e) => {
                    const newPos = e.target.value || null;
                    const updated = await updatePlayer(currentPlayer.id, { posicion_secundaria: newPos });
                    if (updated) {
                      setCurrentPlayer(updated);
                    }
                  }}
                  className="bg-slate-900/40 hover:bg-slate-800/60 text-slate-200 border border-slate-700/30 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-[#CC0E21] cursor-pointer font-semibold appearance-none pr-6 w-full"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.35rem center', backgroundSize: '1rem', backgroundRepeat: 'no-repeat' }}
                >
                  <option value="" className="bg-slate-950 text-slate-350">Ninguna</option>
                  <option value="Portero" className="bg-slate-950 text-slate-200">Portero</option>
                  <option value="Lateral" className="bg-slate-950 text-slate-200">Lateral</option>
                  <option value="Central" className="bg-slate-950 text-slate-200">Central</option>
                  <option value="Defensa" className="bg-slate-950 text-slate-200">Defensa</option>
                  <option value="Pivote" className="bg-slate-950 text-slate-200">Pivote</option>
                  <option value="Interior" className="bg-slate-950 text-slate-200">Interior</option>
                  <option value="Centrocampista" className="bg-slate-950 text-slate-200">Centrocampista</option>
                  <option value="Extremo" className="bg-slate-950 text-slate-200">Extremo</option>
                  <option value="Delantero" className="bg-slate-950 text-slate-200">Delantero</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 justify-center md:justify-start items-center">
            {currentPlayer.rol_abp && (
              <span><strong className="text-slate-300">Rol ABP:</strong> {currentPlayer.rol_abp}</span>
            )}
            <span>
              <strong className="text-slate-300">Valoración Global Vigente:</strong> 
              <span className="text-amber-400 font-extrabold ml-1.5 flex items-center gap-0.5 inline-flex">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {computedGlobalRating}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'profile'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          Datos Generales
        </button>
        <button
          onClick={() => setActiveTab('deportivo')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'deportivo'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Perfil Deportivo
        </button>
        <button
          onClick={() => setActiveTab('valoraciones')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'valoraciones'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="h-4 w-4" />
          Valoraciones
        </button>
        <button
          onClick={() => setActiveTab('lesiones')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'lesiones'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Lesiones
          {injuries.filter(i => i.estado === 'Activa' || i.estado === 'Recaída').length > 0 && (
            <span className="ml-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
              {injuries.filter(i => i.estado === 'Activa' || i.estado === 'Recaída').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'stats'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Estadísticas
        </button>
        <button
          onClick={() => setActiveTab('observations')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'observations'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Observaciones
        </button>
        <button
          onClick={() => setActiveTab('entrenamientos')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'entrenamientos'
              ? 'border-[#CC0E21] text-[#CC0E21] bg-[#CC0E21]/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Entrenamientos
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

        {/* Tab 1: Datos Generales */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">Información del Jugador</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Nombre Completo</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.nombre} {currentPlayer.apellidos}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Equipo</span>
                    <span className="text-slate-200 text-sm font-medium">Juvenil {currentPlayer.equipo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Dorsal</span>
                    <span className="text-slate-200 text-sm font-medium">#{currentPlayer.dorsal}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Fecha Nacimiento</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.fecha_nacimiento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Posición Principal</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.demarcacion}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Posición Secundaria</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.posicion_secundaria || 'Ninguna'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">Antropometría y Físico</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Altura</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.altura ? `${currentPlayer.altura} m` : 'No registrada'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Peso</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.peso ? `${currentPlayer.peso} kg` : 'No registrado'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-bold block mb-0.5">Pierna Dominante</span>
                    <span className="text-slate-200 text-sm font-medium">{currentPlayer.pierna_dominante}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Perfil Deportivo */}
        {activeTab === 'deportivo' && (
          <div className="space-y-6">
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
                <Button onClick={handleSaveEvaluation} loading={savingEval} className="px-5 py-2 font-bold text-xs">
                  Guardar Valoraciones
                </Button>
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
                      onChange={(val) => handleSpecificMetricChange(metric, val)}
                      size={20}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Valoraciones Generales */}
        {activeTab === 'valoraciones' && (
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
                <Button onClick={handleSaveEvaluation} loading={savingEval} className="px-5 py-2 font-bold text-xs">
                  Guardar Valoraciones
                </Button>
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
                          onChange={(val) => handleGeneralMetricChange(metric, val)}
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

        {/* Tab 4: Historial de Lesiones */}
        {activeTab === 'lesiones' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <History className="h-5 w-5 text-slate-400" />
                Historial Médico de Lesiones
              </h3>
              <Button onClick={() => setShowInjuryForm(!showInjuryForm)} variant={showInjuryForm ? 'secondary' : 'primary'} className="flex items-center gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                {showInjuryForm ? 'Ocultar Formulario' : 'Registrar Lesión'}
              </Button>
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
                          onChange={e => handleUpdateInjuryStatus(injury.id, e.target.value as any)}
                          className="bg-slate-950 border border-slate-850 text-[10px] px-2 py-0.5 rounded-lg text-slate-300 outline-none"
                        >
                          <option value="Activa">Baja Activa</option>
                          <option value="En recuperación">En recuperación</option>
                          <option value="Alta médica">Alta Médica</option>
                          <option value="Recaída">Recaída</option>
                        </select>
                        <button 
                          onClick={() => handleDeleteInjury(injury.id)} 
                          className="text-red-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
        {activeTab === 'stats' && (
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Estadísticas Acumuladas de Liga</h3>
            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="h-20 bg-slate-850 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Partidos Jugados</span>
                  <span className="text-2xl font-black text-white">{statsSummary.partidos}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Titularidades</span>
                  <span className="text-2xl font-black text-white">{statsSummary.titularidades}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Minutos Totales</span>
                  <span className="text-2xl font-black text-white">{statsSummary.minutos} m</span>
                </div>
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
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Intercepciones</span>
                  <span className="text-2xl font-black text-white">{statsSummary.intercepciones}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Efectividad Pases</span>
                  <span className="text-xl font-bold text-slate-200">
                    {statsSummary.pases_totales > 0 
                      ? `${((statsSummary.pases_completados / statsSummary.pases_totales) * 100).toFixed(0)}%`
                      : '-'
                    }
                  </span>
                  <span className="text-[9px] text-slate-500 block leading-none">
                    {statsSummary.pases_completados} de {statsSummary.pases_totales}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Observaciones de Partidos */}
        {activeTab === 'observations' && (
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
                  <Input 
                    label="Competición" 
                    placeholder="Ej: Liga / Copa" 
                    value={newObs.competicion} 
                    onChange={e => setNewObs(prev => ({ ...prev, competicion: e.target.value }))} 
                  />
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

        {/* Tab 7: Historial de Entrenamientos */}
        {activeTab === 'entrenamientos' && (
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
      </div>
    </div>
  );
}
