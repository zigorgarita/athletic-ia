import React from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Match } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const matchSchema = zod.object({
  jornada: zod.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'La jornada debe ser al menos 1'),
  rival: zod.string().min(2, 'El nombre del rival debe tener al menos 2 caracteres'),
  fecha: zod.string().min(1, 'La fecha es requerida'),
  es_local: zod.boolean().default(true),
  goles_favor: zod.coerce.number().optional().nullable().or(zod.literal('')),
  goles_contra: zod.coerce.number().optional().nullable().or(zod.literal('')),
  jugado: zod.boolean().default(false),
});

type MatchFormData = zod.infer<typeof matchSchema>;

interface MatchFormProps {
  match?: Match | null;
  onSubmit: (data: Omit<Match, 'id' | 'created_at'>) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function MatchForm({ match, onSubmit, onCancel, isSubmitting = false }: MatchFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema) as unknown as Resolver<MatchFormData>,
    defaultValues: match
      ? {
          jornada: match.jornada,
          rival: match.rival,
          fecha: match.fecha,
          es_local: match.es_local,
          goles_favor: match.goles_favor,
          goles_contra: match.goles_contra,
          jugado: match.jugado,
        }
      : {
          jornada: 1,
          rival: '',
          fecha: new Date().toISOString().split('T')[0],
          es_local: true,
          goles_favor: null,
          goles_contra: null,
          jugado: false,
        },
  });

  const jugado = watch('jugado');

  const handleFormSubmit = async (values: MatchFormData) => {
    const payload: Omit<Match, 'id' | 'created_at'> = {
      ...values,
      goles_favor: values.goles_favor === '' || !values.jugado ? null : Number(values.goles_favor),
      goles_contra: values.goles_contra === '' || !values.jugado ? null : Number(values.goles_contra),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Número de Jornada *"
          type="number"
          error={errors.jornada?.message?.toString()}
          {...register('jornada')}
        />
        <Input
          label="Rival *"
          placeholder="Ej: Danok Bat"
          error={errors.rival?.message?.toString()}
          {...register('rival')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Fecha del Partido *"
          type="date"
          error={errors.fecha?.message?.toString()}
          {...register('fecha')}
        />
        <div className="flex flex-col justify-end pb-3">
          <label className="flex items-center gap-2 text-sm text-slate-350 font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded bg-slate-950 border-slate-800 text-green-500 focus:ring-green-500 h-4.5 w-4.5"
              {...register('es_local')}
            />
            ¿Jugamos de Local?
          </label>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded bg-slate-950 border-slate-855 text-green-500 focus:ring-green-500 h-4.5 w-4.5"
            {...register('jugado')}
          />
          ¿El partido ya se ha jugado?
        </label>

        {jugado && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 animate-fadeIn">
            <Input
              label="Goles a Favor"
              type="number"
              placeholder="Goles Indautxu"
              error={errors.goles_favor?.message?.toString()}
              {...register('goles_favor')}
            />
            <Input
              label="Goles en Contra"
              type="number"
              placeholder="Goles Rival"
              error={errors.goles_contra?.message?.toString()}
              {...register('goles_contra')}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} className="px-6">
          Guardar Partido
        </Button>
      </div>
    </form>
  );
}
