import React, { useState, useEffect } from 'react';
import { Player, DetailedEvaluation } from '@/types';
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
import { compressImage } from '@/lib/image';
import { 
  Award, ClipboardList, BarChart3, PlusCircle, 
  Calendar, Check, ShieldAlert, Heart, Star, Sparkles 
} from 'lucide-react';

interface PlayerDetailProps {
  player: Player;
  onBack: () => void;
}

export function PlayerDetail({ player, onBack }: PlayerDetailProps) {
  const [currentPlayer, setCurrentPlayer] = useState<Player>(player);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'observations'>('profile');
  
  // Custom hooks
  const { evaluations, loading: loadingEvals, refetch: refetchEvals } = useEvaluations(currentPlayer.id);
  const { createEvaluation } = useCreateEvaluation();
  const { observaciones, loading: loadingObs, createObservacion } = useObservaciones(currentPlayer.id);
  const { summary: statsSummary, loading: loadingStats } = usePlayerStats(currentPlayer.id);
  const { updatePlayer } = useUpdatePlayer();
  const { uploadPhoto, loading: uploadingPhoto } = useUploadPlayerPhoto();

  // Local state for detailed evaluation values
  const [currentEval, setCurrentEval] = useState<Omit<DetailedEvaluation, 'id' | 'created_at'>>({
    player_id: currentPlayer.id,
    fecha_evaluacion: new Date().toISOString().split('T')[0],
    velocidad: 3,
    aceleracion: 3,
    fuerza: 3,
    resistencia: 3,
    juego_aereo: 3,
    marcaje: 3,
    entrada_defensiva: 3,
    posicionamiento_defensivo: 3,
    trabajo_defensivo: 3,
    pase_corto: 3,
    pase_largo: 3,
    control_orientado: 3,
    regate: 3,
    centros: 3,
    finalizacion: 3,
    disparo_lejano: 3,
    trabajo_ofensivo: 3,
    vision_juego: 3,
    inteligencia_tactica: 3,
    liderazgo: 3,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with latest evaluation from DB if available
  useEffect(() => {
    if (evaluations && evaluations.length > 0) {
      const latest = evaluations[0];
      setCurrentEval({
        player_id: currentPlayer.id,
        fecha_evaluacion: new Date().toISOString().split('T')[0],
        velocidad: latest.velocidad,
        aceleracion: latest.aceleracion,
        fuerza: latest.fuerza,
        resistencia: latest.resistencia,
        juego_aereo: latest.juego_aereo,
        marcaje: latest.marcaje,
        entrada_defensiva: latest.entrada_defensiva,
        posicionamiento_defensivo: latest.posicionamiento_defensivo,
        trabajo_defensivo: latest.trabajo_defensivo,
        pase_corto: latest.pase_corto,
        pase_largo: latest.pase_largo,
        control_orientado: latest.control_orientado,
        regate: latest.regate,
        centros: latest.centros,
        finalizacion: latest.finalizacion,
        disparo_lejano: latest.disparo_lejano,
        trabajo_ofensivo: latest.trabajo_ofensivo,
        vision_juego: latest.vision_juego,
        inteligencia_tactica: latest.inteligencia_tactica,
        liderazgo: latest.liderazgo,
      });
    }
  }, [evaluations, currentPlayer.id]);

  // Handle rating metric change
  const handleMetricChange = (metric: keyof Omit<DetailedEvaluation, 'id' | 'created_at' | 'player_id' | 'fecha_evaluacion'>, val: number) => {
    setCurrentEval(prev => ({
      ...prev,
      [metric]: val
    }));
  };

  // Save detailed evaluations
  const handleSaveEvaluation = async () => {
    const saved = await createEvaluation(currentEval);
    if (saved) {
      setSaveSuccess(true);
      refetchEvals();
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const getAge = (birthDateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate global rating average
  const globalRatingAvg = evaluations && evaluations.length > 0 
    ? (evaluations.reduce((acc, curr) => {
        const sumMetrics = 
          curr.velocidad + curr.aceleracion + curr.fuerza + curr.resistencia + curr.juego_aereo +
          curr.marcaje + curr.entrada_defensiva + curr.posicionamiento_defensivo + curr.trabajo_defensivo +
          curr.pase_corto + curr.pase_largo + curr.control_orientado + curr.regate + curr.centros +
          curr.finalizacion + curr.disparo_lejano + curr.trabajo_ofensivo + curr.vision_juego +
          curr.inteligencia_tactica + curr.liderazgo;
        return acc + (sumMetrics / 20);
      }, 0) / evaluations.length).toFixed(1)
    : '-';

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
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-green-500/5 blur-[80px] pointer-events-none" />
        
        {/* Foto de Perfil Grande */}
        <div className="relative group cursor-pointer h-32 w-32 rounded-full overflow-hidden border-4 border-slate-800/80 shadow-2xl transition-all duration-300 hover:border-green-500/50">
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
              <span className="absolute bottom-2 text-[8px] text-green-400 font-extrabold uppercase tracking-wider bg-slate-950/90 px-2 py-0.5 rounded-full border border-green-500/30">
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
          <div className="absolute bottom-1 right-1 bg-green-500 text-slate-950 font-black h-6 w-6 rounded-lg flex items-center justify-center text-[10px] shadow-lg z-20">
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
                  const newPos = e.target.value as Player['demarcacion'];
                  const updated = await updatePlayer(currentPlayer.id, { demarcacion: newPos });
                  if (updated) {
                    setCurrentPlayer(updated);
                  }
                }}
                className="bg-slate-900/80 hover:bg-slate-800 text-green-400 border border-green-500/20 rounded-xl px-3 py-1 text-xs outline-none focus:border-green-500 cursor-pointer font-bold transition-all duration-200 shadow-md shadow-green-500/5 appearance-none pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2322c55e' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
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
                'bg-slate-950/20 text-slate-400 border-slate-900/30'
              }`}>
                {currentPlayer.estado === 'Duda' ? 'Duda Semanal' : currentPlayer.estado}
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
                  className="bg-slate-900/40 hover:bg-slate-800/60 text-slate-200 border border-slate-700/30 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-green-500 cursor-pointer font-semibold appearance-none pr-6 w-full"
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

          <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 justify-center md:justify-start">
            {currentPlayer.rol_abp && (
              <span><strong className="text-slate-300">Rol ABP:</strong> {currentPlayer.rol_abp}</span>
            )}
            <span>
              <strong className="text-slate-300">Valoración Global:</strong> 
              <span className="text-green-400 font-extrabold ml-1.5 flex items-center gap-0.5 inline-flex">
                <Star className="h-3 w-3 fill-green-400 text-green-400" /> {globalRatingAvg}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'profile'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="h-4 w-4" />
          Perfil y Valoraciones
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'stats'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Estadísticas
        </button>
        <button
          onClick={() => setActiveTab('observations')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'observations'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Observaciones
        </button>
      </div>

      {/* Contenido de las Tabs */}
      <div className="pt-2">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Cabecera Guardar Valoraciones */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Sistema de Rendimiento (20 Métricas)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Establece la valoración técnica, táctica, física y cognitiva. Cada cambio requiere guardarse en Supabase.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                    <Check className="h-4 w-4" /> ¡Guardado en Supabase!
                  </span>
                )}
                <Button onClick={handleSaveEvaluation} className="px-5 py-2 font-bold text-xs">
                  Guardar Valoraciones
                </Button>
              </div>
            </div>

            {/* Grid de 20 Métricas por Categorías */}
            {loadingEvals ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                    <div className="h-24 w-full bg-slate-900 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. MÉTRIQUES FÍSICAS */}
                <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-4">
                  <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider border-b border-slate-800/60 pb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-green-500" /> Físicas
                  </h3>
                  <div className="space-y-1">
                    <StarRating label="Velocidad" value={currentEval.velocidad} onChange={(v) => handleMetricChange('velocidad', v)} size={18} />
                    <StarRating label="Aceleración" value={currentEval.aceleracion} onChange={(v) => handleMetricChange('aceleracion', v)} size={18} />
                    <StarRating label="Fuerza" value={currentEval.fuerza} onChange={(v) => handleMetricChange('fuerza', v)} size={18} />
                    <StarRating label="Resistencia" value={currentEval.resistencia} onChange={(v) => handleMetricChange('resistencia', v)} size={18} />
                    <StarRating label="Juego Aéreo" value={currentEval.juego_aereo} onChange={(v) => handleMetricChange('juego_aereo', v)} size={18} />
                  </div>
                </div>

                {/* 2. MÉTRIQUES DEFENSIVAS */}
                <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-4">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800/60 pb-2 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-blue-500" /> Defensivas
                  </h3>
                  <div className="space-y-1">
                    <StarRating label="Marcaje" value={currentEval.marcaje} onChange={(v) => handleMetricChange('marcaje', v)} size={18} />
                    <StarRating label="Entrada Defensiva" value={currentEval.entrada_defensiva} onChange={(v) => handleMetricChange('entrada_defensiva', v)} size={18} />
                    <StarRating label="Posicionamiento" value={currentEval.posicionamiento_defensivo} onChange={(v) => handleMetricChange('posicionamiento_defensivo', v)} size={18} />
                    <StarRating label="Trabajo Defensivo" value={currentEval.trabajo_defensivo} onChange={(v) => handleMetricChange('trabajo_defensivo', v)} size={18} />
                  </div>
                </div>

                {/* 3. MÉTRIQUES TÉCNICAS / OFENSIVAS */}
                <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-4 md:col-span-2">
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider border-b border-slate-800/60 pb-2 flex items-center gap-2">
                    <Award className="h-4 w-4 text-rose-500" /> Técnicas y Ofensivas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    <StarRating label="Pase Corto" value={currentEval.pase_corto} onChange={(v) => handleMetricChange('pase_corto', v)} size={18} />
                    <StarRating label="Pase Largo" value={currentEval.pase_largo} onChange={(v) => handleMetricChange('pase_largo', v)} size={18} />
                    <StarRating label="Control Orientado" value={currentEval.control_orientado} onChange={(v) => handleMetricChange('control_orientado', v)} size={18} />
                    <StarRating label="Regate" value={currentEval.regate} onChange={(v) => handleMetricChange('regate', v)} size={18} />
                    <StarRating label="Centros" value={currentEval.centros} onChange={(v) => handleMetricChange('centros', v)} size={18} />
                    <StarRating label="Finalización" value={currentEval.finalizacion} onChange={(v) => handleMetricChange('finalizacion', v)} size={18} />
                    <StarRating label="Disparo Lejano" value={currentEval.disparo_lejano} onChange={(v) => handleMetricChange('disparo_lejano', v)} size={18} />
                    <StarRating label="Trabajo Ofensivo" value={currentEval.trabajo_ofensivo} onChange={(v) => handleMetricChange('trabajo_ofensivo', v)} size={18} />
                  </div>
                </div>

                {/* 4. MÉTRIQUES TÁCTICAS / COGNITIVAS */}
                <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/70 space-y-4 md:col-span-2">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800/60 pb-2 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" /> Tácticas y Cognitivas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-1">
                    <StarRating label="Visión de Juego" value={currentEval.vision_juego} onChange={(v) => handleMetricChange('vision_juego', v)} size={18} />
                    <StarRating label="Inteligencia Táctica" value={currentEval.inteligencia_tactica} onChange={(v) => handleMetricChange('inteligencia_tactica', v)} size={18} />
                    <StarRating label="Liderazgo" value={currentEval.liderazgo} onChange={(v) => handleMetricChange('liderazgo', v)} size={18} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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

        {activeTab === 'observations' && (
          <div className="space-y-6">
            {/* Cabecera & Botón agregar */}
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Histórico de Observaciones</h3>
              <Button onClick={() => setShowObsForm(!showObsForm)} variant={showObsForm ? 'secondary' : 'primary'} className="flex items-center gap-1 text-xs">
                <PlusCircle className="h-4 w-4" />
                {showObsForm ? 'Ocultar Formulario' : 'Nueva Observación'}
              </Button>
            </div>

            {/* Formulario Observación */}
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
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-green-500"
                      value={newObs.observacion_tecnica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_tecnica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Táctica</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-green-500"
                      value={newObs.observacion_tactica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_tactica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Física</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-green-500"
                      value={newObs.observacion_fisica}
                      onChange={e => setNewObs(prev => ({ ...prev, observacion_fisica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Observación Mental / Actitudinal</label>
                    <textarea 
                      className="w-full h-20 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 outline-none focus:border-green-500"
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

            {/* Listado Timeline Observaciones */}
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
      </div>
    </div>
  );
}
