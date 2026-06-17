import React, { useState, useEffect } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Player, Demarcacion, Pierna, EstadoJugador } from '@/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUploadPlayerPhoto } from '@/hooks/useUploadPlayerPhoto';
import { Camera, Trash2, X } from 'lucide-react';
import { compressImage } from '@/lib/image';

const playerSchema = zod.object({
  nombre: zod
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede superar los 50 caracteres'),
  apellidos: zod
    .string()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(80, 'Los apellidos no pueden superar los 80 caracteres'),
  dorsal: zod.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'El dorsal debe ser entre 1 y 99')
    .max(99, 'El dorsal debe ser entre 1 y 99'),
  demarcacion: zod.enum(['Portero', 'Defensa', 'Centrocampista', 'Delantero', '']).refine((val) => val !== '', {
    message: 'Seleccione una posición principal válida',
  }),
  posicion_secundaria: zod.string().nullable().optional(),
  fecha_nacimiento: zod
    .string()
    .min(1, 'La fecha de nacimiento es requerida')
    .refine((val) => {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, 'La fecha de nacimiento no puede ser futura'),
  altura: zod.coerce
    .number()
    .min(1.0, 'La altura debe ser mayor a 1.0m')
    .max(2.5, 'La altura debe ser menor a 2.5m')
    .nullable()
    .optional()
    .or(zod.literal('')),
  peso: zod.coerce
    .number()
    .min(30, 'El peso debe ser mayor a 30kg')
    .max(150, 'El peso debe ser menor a 150kg')
    .nullable()
    .optional()
    .or(zod.literal('')),
  pierna_dominante: zod.enum(['Diestro', 'Zurdo', 'Ambidiestro']),
  estado: zod.enum(['Disponible', 'Lesionado', 'Duda', 'Sancionado']),
  rol_abp: zod.string().nullable().optional(),
  foto_url: zod.string().nullable().optional(),
});

type PlayerFormData = zod.infer<typeof playerSchema>;

interface FormValues {
  nombre: string;
  apellidos: string;
  dorsal: number | string;
  demarcacion: Demarcacion | '';
  posicion_secundaria: string;
  fecha_nacimiento: string;
  altura: number | string;
  peso: number | string;
  pierna_dominante: Pierna;
  estado: EstadoJugador;
  rol_abp: string;
  foto_url?: string | null;
}

interface PlayerFormProps {
  player?: Player | null;
  onSubmit: (data: PlayerFormData & { foto_url?: string | null }) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
}

export function PlayerForm({ player, onSubmit, onCancel, onDelete, isSubmitting = false }: PlayerFormProps) {
  const { uploadPhoto, loading: uploading } = useUploadPlayerPhoto();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(playerSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      nombre: '',
      apellidos: '',
      dorsal: '',
      demarcacion: '',
      posicion_secundaria: '',
      fecha_nacimiento: '',
      altura: '',
      peso: '',
      pierna_dominante: 'Diestro',
      estado: 'Disponible',
      rol_abp: '',
      foto_url: null,
    },
  });

  useEffect(() => {
    if (player) {
      reset({
        nombre: player.nombre,
        apellidos: player.apellidos || '',
        dorsal: player.dorsal,
        demarcacion: player.demarcacion,
        posicion_secundaria: player.posicion_secundaria || '',
        fecha_nacimiento: player.fecha_nacimiento,
        altura: player.altura || '',
        peso: player.peso || '',
        pierna_dominante: player.pierna_dominante || 'Diestro',
        estado: player.estado || 'Disponible',
        rol_abp: player.rol_abp || '',
        foto_url: player.foto_url,
      });
      setPhotoPreview(player.foto_url);
    } else {
      reset({
        nombre: '',
        apellidos: '',
        dorsal: '',
        demarcacion: '',
        posicion_secundaria: '',
        fecha_nacimiento: '',
        altura: '',
        peso: '',
        pierna_dominante: 'Diestro',
        estado: 'Disponible',
        rol_abp: '',
        foto_url: null,
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
    setIsPhotoRemoved(false);
  }, [player, reset]);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setIsPhotoRemoved(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsPhotoRemoved(true);
  };

  const handleFormSubmit = async (values: FormValues) => {
    let finalFotoUrl = isPhotoRemoved ? null : (player?.foto_url || null);
    
    if (photoFile) {
      const compressed = await compressImage(photoFile);
      const uploadedUrl = await uploadPhoto(compressed, values.nombre);
      if (uploadedUrl) {
        finalFotoUrl = uploadedUrl;
      }
    }
    
    // Parse empty strings to null for optional numeric/text fields
    const formattedValues: PlayerFormData & { foto_url?: string | null } = {
      ...values,
      dorsal: Number(values.dorsal),
      demarcacion: values.demarcacion as Demarcacion,
      altura: values.altura === '' ? null : Number(values.altura),
      peso: values.peso === '' ? null : Number(values.peso),
      posicion_secundaria: values.posicion_secundaria === '' ? null : values.posicion_secundaria,
      rol_abp: values.rol_abp === '' ? null : values.rol_abp,
      foto_url: finalFotoUrl
    };

    await onSubmit(formattedValues);
  };

  const positionOptions = [
    { value: 'Portero', label: 'Portero' },
    { value: 'Defensa', label: 'Defensa' },
    { value: 'Centrocampista', label: 'Centrocampista' },
    { value: 'Delantero', label: 'Delantero' },
  ];

  const piernaOptions = [
    { value: 'Diestro', label: 'Diestro' },
    { value: 'Zurdo', label: 'Zurdo' },
    { value: 'Ambidiestro', label: 'Ambidiestro' },
  ];

  const estadoOptions = [
    { value: 'Disponible', label: 'Disponible' },
    { value: 'Lesionado', label: 'Lesionado' },
    { value: 'Duda', label: 'Duda Semanal' },
    { value: 'Sancionado', label: 'Sancionado' },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Subida de foto con Drag & Drop */}
      <div className="flex flex-col items-center justify-center mb-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group cursor-pointer h-24 w-24 rounded-full border-2 border-dashed overflow-hidden bg-slate-950 flex items-center justify-center transition-all duration-300 ${
            isDragOver ? 'border-green-500 bg-green-500/5 scale-105' : 'border-slate-700 hover:border-green-500/70'
          }`}
        >
          {photoPreview ? (
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full hover:bg-red-500 transition-colors z-30 shadow-md"
                title="Eliminar foto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="text-center p-2 flex flex-col items-center justify-center">
              <Camera className="h-5 w-5 text-slate-500 group-hover:text-green-400 transition-colors mb-1" />
              <span className="text-[9px] text-slate-500 leading-none">Arrastra o clic</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
          />
        </div>
        <span className="text-[10px] text-slate-500 mt-1">Formatos: JPG, PNG. Autocomprimido.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          error={errors.nombre?.message?.toString()}
          {...register('nombre')}
        />
        <Input
          label="Apellidos"
          error={errors.apellidos?.message?.toString()}
          {...register('apellidos')}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Dorsal (1-99)"
          type="number"
          error={errors.dorsal?.message?.toString()}
          {...register('dorsal')}
        />
        <Select
          label="P. Principal"
          options={positionOptions}
          error={errors.demarcacion?.message?.toString()}
          {...register('demarcacion')}
        />
        <Input
          label="P. Secundaria"
          error={errors.posicion_secundaria?.message?.toString()}
          {...register('posicion_secundaria')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Fecha Nacimiento"
          type="date"
          error={errors.fecha_nacimiento?.message?.toString()}
          {...register('fecha_nacimiento')}
        />
        <Input
          label="Altura (m)"
          type="number"
          step="0.01"
          placeholder="Ej: 1.80"
          error={errors.altura?.message?.toString()}
          {...register('altura')}
        />
        <Input
          label="Peso (kg)"
          type="number"
          step="0.1"
          placeholder="Ej: 72.5"
          error={errors.peso?.message?.toString()}
          {...register('peso')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Pierna Dominante"
          options={piernaOptions}
          error={errors.pierna_dominante?.message?.toString()}
          {...register('pierna_dominante')}
        />
        <Select
          label="Estado Semanal"
          options={estadoOptions}
          error={errors.estado?.message?.toString()}
          {...register('estado')}
        />
      </div>

      <Input
        label="Rol ABP"
        placeholder="Ej: Servidor, Rematador en segundo palo"
        error={errors.rol_abp?.message?.toString()}
        {...register('rol_abp')}
      />

      {/* Botonera dinámica */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-4">
        <div className="w-full sm:w-auto">
          {player && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              className="w-full sm:w-auto text-red-400 hover:text-red-300 hover:bg-red-950/20 px-4 py-2 border border-transparent rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Eliminar
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting || uploading}
            className="w-full sm:w-auto px-6"
          >
            {player ? 'Guardar Cambios' : 'Registrar Jugador'}
          </Button>
        </div>
      </div>
    </form>
  );
}
