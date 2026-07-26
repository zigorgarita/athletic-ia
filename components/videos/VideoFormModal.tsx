import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { MatchVideo } from '@/types';
import { isValidVideoUrl } from '@/lib/video';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { VideoUploader } from '@/components/ui/VideoUploader';

const videoSchema = zod.object({
  titulo: zod.string().min(1, 'El título es requerido').max(100, 'El título no puede superar los 100 caracteres'),
  video_url: zod.string()
    .min(1, 'La URL del video es requerida')
    .refine((url) => isValidVideoUrl(url), {
      message: 'Ingrese una URL válida de YouTube, Shorts, Google Drive o enlace directo a video',
    }),
  fecha_partido: zod.string().min(1, 'La fecha del partido es requerida'),
  descripcion: zod.string().optional(),
});

type VideoFormData = zod.infer<typeof videoSchema>;

interface VideoFormModalProps {
  video?: MatchVideo | null;
  onSubmit: (data: Omit<MatchVideo, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function VideoFormModal({
  video = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: VideoFormModalProps) {
  const isEditMode = !!video;

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
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      titulo: '',
      video_url: '',
      fecha_partido: getTodayString(),
      descripcion: '',
    },
  });

  const currentVideoUrl = watch('video_url');

  // Resetear el formulario cuando cambie el video (modo edición o creación)
  useEffect(() => {
    if (video) {
      reset({
        titulo: video.titulo,
        video_url: video.video_url,
        fecha_partido: video.fecha_partido,
        descripcion: video.descripcion || '',
      });
    } else {
      reset({
        titulo: '',
        video_url: '',
        fecha_partido: getTodayString(),
        descripcion: '',
      });
    }
  }, [video, reset]);

  const handleFormSubmit = async (data: VideoFormData) => {
    await onSubmit({
      titulo: data.titulo,
      video_url: data.video_url,
      fecha_partido: data.fecha_partido,
      descripcion: data.descripcion || '',
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Título del Video / Partido"
        placeholder="Ej: Indautxu A vs Zaragoza - Segunda Parte"
        error={errors.titulo?.message}
        {...register('titulo')}
      />

      <div className="space-y-1">
        <VideoUploader
          initialUrl={currentVideoUrl}
          onVideoSelected={({ url, fileName }) => {
            setValue('video_url', url, { shouldValidate: true });
            const currentTitle = watch('titulo');
            if (!currentTitle && fileName) {
              setValue('titulo', fileName, { shouldValidate: true });
            }
          }}
        />
        {errors.video_url?.message && (
          <p className="text-xs text-red-400 font-medium px-1">{errors.video_url.message}</p>
        )}
      </div>

      <Input
        label="Fecha del Partido"
        type="date"
        error={errors.fecha_partido?.message}
        {...register('fecha_partido')}
      />

      <div className="relative w-full">
        <label className="block text-xs font-semibold text-slate-400 mb-1">
          Descripción / Notas Tácticas
        </label>
        <textarea
          placeholder="Escribe comentarios sobre las jugadas clave, errores cometidos o el análisis táctico..."
          className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-755 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-sm"
          {...register('descripcion')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} className="px-6 bg-[#CC0E21] hover:bg-[#b00c1c]">
          {isEditMode ? 'Guardar Cambios' : 'Añadir Video'}
        </Button>
      </div>
    </form>
  );
}
