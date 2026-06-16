import React, { useState, useEffect } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Player, Demarcacion } from '@/types';
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
  dorsal: zod.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'El dorsal debe ser entre 1 y 99')
    .max(99, 'El dorsal debe ser entre 1 y 99'),
  demarcacion: zod.enum(['Portero', 'Defensa', 'Centrocampista', 'Delantero', '']).refine((val) => val !== '', {
    message: 'Seleccione una posición válida',
  }),
  fecha_nacimiento: zod
    .string()
    .min(1, 'La fecha de nacimiento es requerida')
    .refine((val) => {
      const selectedDate = new Date(val);
      const today = new Date();
      // Reset hours to compare only dates
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, 'La fecha de nacimiento no puede ser futura'),
  foto_url: zod.string().nullable().optional(),
});

type PlayerFormData = zod.infer<typeof playerSchema>;

interface FormValues {
  nombre: string;
  dorsal: number | string;
  demarcacion: Demarcacion | '';
  fecha_nacimiento: string;
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
      dorsal: '',
      demarcacion: '',
      fecha_nacimiento: '',
      foto_url: null,
    },
  });

  useEffect(() => {
    if (player) {
      reset({
        nombre: player.nombre,
        dorsal: player.dorsal,
        demarcacion: player.demarcacion,
        fecha_nacimiento: player.fecha_nacimiento,
        foto_url: player.foto_url,
      });
      setPhotoPreview(player.foto_url);
    } else {
      reset({
        nombre: '',
        dorsal: '',
        demarcacion: '',
        fecha_nacimiento: '',
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

  // Drag & Drop handlers
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
      // Comprimir imagen antes de subir (canvas nativo en lib/image)
      const compressed = await compressImage(photoFile);
      const uploadedUrl = await uploadPhoto(compressed, values.nombre);
      if (uploadedUrl) {
        finalFotoUrl = uploadedUrl;
      }
    }
    
    const data = values as unknown as PlayerFormData;
    await onSubmit({ ...data, foto_url: finalFotoUrl });
  };

  const positionOptions = [
    { value: 'Portero', label: 'Portero' },
    { value: 'Defensa', label: 'Defensa' },
    { value: 'Centrocampista', label: 'Centrocampista' },
    { value: 'Delantero', label: 'Delantero' },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Subida de foto con Drag & Drop */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group cursor-pointer h-28 w-28 rounded-full border-2 border-dashed overflow-hidden bg-slate-950 flex items-center justify-center transition-all duration-300 ${
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
              <Camera className="h-6 w-6 text-slate-500 group-hover:text-green-400 transition-colors mb-1" />
              <span className="text-[10px] text-slate-500 leading-none">Arrastra o haz clic</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
          />
        </div>
        <span className="text-[11px] text-slate-500 mt-2">Formatos: JPG, PNG. Máx 500KB (autocomprimido).</span>
      </div>

      <Input
        label="Nombre Completo"
        error={errors.nombre?.message?.toString()}
        {...register('nombre')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Dorsal (1-99)"
          type="number"
          error={errors.dorsal?.message?.toString()}
          {...register('dorsal')}
        />
        <Select
          label="Demarcación"
          options={positionOptions}
          error={errors.demarcacion?.message?.toString()}
          {...register('demarcacion')}
        />
      </div>

      <Input
        label="Fecha de Nacimiento"
        type="date"
        error={errors.fecha_nacimiento?.message?.toString()}
        {...register('fecha_nacimiento')}
      />

      {/* Botonera dinámica */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-800 mt-6">
        <div className="w-full sm:w-auto">
          {player && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              className="w-full sm:w-auto text-red-400 hover:text-red-300 hover:bg-red-950/20 px-4 py-2 border border-transparent rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Eliminar Jugador
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
