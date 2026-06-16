import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Player, Evaluation } from '@/types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';

const evaluationSchema = zod.object({
  player_id: zod.string().min(1, 'Seleccione un jugador'),
  tecnica: zod.number().min(1, 'Califique la técnica (mínimo 1 estrella)').max(5),
  tactica: zod.number().min(1, 'Califique la táctica (mínimo 1 estrella)').max(5),
  condicional: zod.number().min(1, 'Califique el físico (mínimo 1 estrella)').max(5),
  fecha_evaluacion: zod.string().min(1, 'La fecha es requerida'),
  notas: zod.string().optional(),
});

type EvaluationFormData = zod.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  players: Player[];
  preselectedPlayerId?: string | null;
  onSubmit: (data: Omit<Evaluation, 'id' | 'created_at'>) => Promise<void>;
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
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
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
      tecnica: 0,
      tactica: 0,
      condicional: 0,
      fecha_evaluacion: getTodayString(),
      notas: '',
    },
  });
  useEffect(() => {
    reset({
      player_id: preselectedPlayerId || '',
      tecnica: 0,
      tactica: 0,
      condicional: 0,
      fecha_evaluacion: getTodayString(),
      notas: '',
    });
  }, [preselectedPlayerId, reset]);

  const handleFormSubmit = async (data: EvaluationFormData) => {
    await onSubmit(data as Omit<Evaluation, 'id' | 'created_at'>);
  };

  const playerOptions = players.map((p) => ({
    value: p.id,
    label: `${p.nombre} (#${p.dorsal} - ${p.demarcacion})`,
  }));

  const tecnicaVal = watch('tecnica') || 0;
  const tacticaVal = watch('tactica') || 0;
  const condicionalVal = watch('condicional') || 0;

  // Registro de valores de StarRating de forma manual en RHF
  const setRating = (name: 'tecnica' | 'tactica' | 'condicional', val: number) => {
    setValue(name, val, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Selector de Jugador */}
      <Select
        label="Seleccionar Jugador"
        options={playerOptions}
        disabled={!!preselectedPlayerId}
        error={errors.player_id?.message?.toString()}
        {...register('player_id')}
      />

      {/* Ratings interactivos de 1 a 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
        <StarRating
          value={tecnicaVal}
          onChange={(val) => setRating('tecnica', val)}
          label="Técnica"
          error={errors.tecnica?.message?.toString()}
        />

        <StarRating
          value={tacticaVal}
          onChange={(val) => setRating('tactica', val)}
          label="Táctica"
          error={errors.tactica?.message?.toString()}
        />

        <StarRating
          value={condicionalVal}
          onChange={(val) => setRating('condicional', val)}
          label="Condicional (Físico)"
          error={errors.condicional?.message?.toString()}
        />
      </div>

      <Input
        label="Fecha de la Evaluación"
        type="date"
        error={errors.fecha_evaluacion?.message?.toString()}
        {...register('fecha_evaluacion')}
      />

      <div className="relative w-full">
        <textarea
          placeholder="Notas / Observaciones sobre la evaluación técnica o de comportamiento..."
          className="w-full min-h-[90px] px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm"
          {...register('notas')}
        />
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
