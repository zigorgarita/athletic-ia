import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Player, DetailedEvaluation } from '@/types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Heart, ShieldAlert, Award, Star } from 'lucide-react';

const evaluationSchema = zod.object({
  player_id: zod.string().min(1, 'Seleccione un jugador'),
  fecha_evaluacion: zod.string().min(1, 'La fecha es requerida'),
  
  // Físicas
  velocidad: zod.number().min(1).max(5),
  aceleracion: zod.number().min(1).max(5),
  fuerza: zod.number().min(1).max(5),
  resistencia: zod.number().min(1).max(5),
  juego_aereo: zod.number().min(1).max(5),
  
  // Defensivas
  marcaje: zod.number().min(1).max(5),
  entrada_defensiva: zod.number().min(1).max(5),
  posicionamiento_defensivo: zod.number().min(1).max(5),
  trabajo_defensivo: zod.number().min(1).max(5),
  
  // Técnicas
  pase_corto: zod.number().min(1).max(5),
  pase_largo: zod.number().min(1).max(5),
  control_orientado: zod.number().min(1).max(5),
  regate: zod.number().min(1).max(5),
  centros: zod.number().min(1).max(5),
  finalizacion: zod.number().min(1).max(5),
  disparo_lejano: zod.number().min(1).max(5),
  trabajo_ofensivo: zod.number().min(1).max(5),
  
  // Tácticas
  vision_juego: zod.number().min(1).max(5),
  inteligencia_tactica: zod.number().min(1).max(5),
  liderazgo: zod.number().min(1).max(5),
});

type EvaluationFormData = zod.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  players: Player[];
  preselectedPlayerId?: string | null;
  onSubmit: (data: Omit<DetailedEvaluation, 'id' | 'created_at'>) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function EvaluationForm({
  players,
  preselectedPlayerId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EvaluationFormProps) {
  
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      player_id: preselectedPlayerId || '',
      fecha_evaluacion: getTodayString(),
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
    },
  });

  useEffect(() => {
    reset({
      player_id: preselectedPlayerId || '',
      fecha_evaluacion: getTodayString(),
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
  }, [preselectedPlayerId, reset]);

  const handleFormSubmit = async (data: EvaluationFormData) => {
    await onSubmit(data);
  };

  const playerOptions = players.map((p) => ({
    value: p.id,
    label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal} - ${p.demarcacion})`,
  }));

  const setRating = (name: keyof Omit<EvaluationFormData, 'player_id' | 'fecha_evaluacion'>, val: number) => {
    setValue(name, val, { shouldValidate: true });
  };

  const values = watch();

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Selector de Jugador */}
      <Select
        label="Seleccionar Jugador"
        options={playerOptions}
        disabled={!!preselectedPlayerId}
        error={errors.player_id?.message?.toString()}
        {...register('player_id')}
      />

      <Input
        label="Fecha de la Evaluación"
        type="date"
        error={errors.fecha_evaluacion?.message?.toString()}
        {...register('fecha_evaluacion')}
      />

      {/* Ratings interactivos por categorías */}
      <div className="space-y-4">
        {/* FÍSICAS */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
            <Heart className="h-4 w-4" /> Físicas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <StarRating value={values.velocidad || 3} onChange={(val) => setRating('velocidad', val)} label="Velocidad" />
            <StarRating value={values.aceleracion || 3} onChange={(val) => setRating('aceleracion', val)} label="Aceleración" />
            <StarRating value={values.fuerza || 3} onChange={(val) => setRating('fuerza', val)} label="Fuerza" />
            <StarRating value={values.resistencia || 3} onChange={(val) => setRating('resistencia', val)} label="Resistencia" />
            <StarRating value={values.juego_aereo || 3} onChange={(val) => setRating('juego_aereo', val)} label="Juego Aéreo" />
          </div>
        </div>

        {/* DEFENSIVAS */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" /> Defensivas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <StarRating value={values.marcaje || 3} onChange={(val) => setRating('marcaje', val)} label="Marcaje" />
            <StarRating value={values.entrada_defensiva || 3} onChange={(val) => setRating('entrada_defensiva', val)} label="Entrada Defensiva" />
            <StarRating value={values.posicionamiento_defensivo || 3} onChange={(val) => setRating('posicionamiento_defensivo', val)} label="Posicionamiento Defensivo" />
            <StarRating value={values.trabajo_defensivo || 3} onChange={(val) => setRating('trabajo_defensivo', val)} label="Trabajo Defensivo" />
          </div>
        </div>

        {/* TÉCNICAS */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Award className="h-4 w-4" /> Técnicas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <StarRating value={values.pase_corto || 3} onChange={(val) => setRating('pase_corto', val)} label="Pase Corto" />
            <StarRating value={values.pase_largo || 3} onChange={(val) => setRating('pase_largo', val)} label="Pase Largo" />
            <StarRating value={values.control_orientado || 3} onChange={(val) => setRating('control_orientado', val)} label="Control Orientado" />
            <StarRating value={values.regate || 3} onChange={(val) => setRating('regate', val)} label="Regate" />
            <StarRating value={values.centros || 3} onChange={(val) => setRating('centros', val)} label="Centros" />
            <StarRating value={values.finalizacion || 3} onChange={(val) => setRating('finalizacion', val)} label="Finalización" />
            <StarRating value={values.disparo_lejano || 3} onChange={(val) => setRating('disparo_lejano', val)} label="Disparo Lejano" />
            <StarRating value={values.trabajo_ofensivo || 3} onChange={(val) => setRating('trabajo_ofensivo', val)} label="Trabajo Ofensivo" />
          </div>
        </div>

        {/* TÁCTICAS */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Star className="h-4 w-4" /> Tácticas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <StarRating value={values.vision_juego || 3} onChange={(val) => setRating('vision_juego', val)} label="Visión de Juego" />
            <StarRating value={values.inteligencia_tactica || 3} onChange={(val) => setRating('inteligencia_tactica', val)} label="Inteligencia Táctica" />
            <StarRating value={values.liderazgo || 3} onChange={(val) => setRating('liderazgo', val)} label="Liderazgo" />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} className="px-6">
          Guardar Evaluación
        </Button>
      </div>
    </form>
  );
}
