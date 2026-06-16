import React, { useState } from 'react';
import Image from 'next/image';
import { Calendar, Play, Edit, Trash2, Video, Film, Eye, EyeOff } from 'lucide-react';
import { MatchVideo } from '@/types';
import { parseVideoUrl } from '@/lib/video';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface VideoCardProps {
  video: MatchVideo;
  onPlay: (video: MatchVideo) => void;
  onEdit: (video: MatchVideo) => void;
  onDelete: (id: string) => void;
}

export function VideoCard({ video, onPlay, onEdit, onDelete }: VideoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { type, thumbnailUrl } = parseVideoUrl(video.video_url);

  // Formatear fecha de forma segura sin desajuste de zona horaria
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Truncado de descripción
  const shouldTruncate = video.descripcion && video.descripcion.length > 180;
  const displayDescription = isExpanded
    ? video.descripcion
    : shouldTruncate
    ? `${video.descripcion.slice(0, 175)}...`
    : video.descripcion;

  // Renderizar miniatura o un placeholder premium según el tipo
  const renderThumbnail = () => {
    if (thumbnailUrl) {
      return (
        <Image
          src={thumbnailUrl}
          alt={video.titulo}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 256px"
        />
      );
    }

    // Placeholder premium
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center gap-2 text-slate-500 transition-colors duration-300 group-hover:text-green-400">
        {type === 'vimeo' ? (
          <Film className="h-10 w-10 text-slate-600 group-hover:text-green-500 transition-colors duration-300" />
        ) : (
          <Video className="h-10 w-10 text-slate-600 group-hover:text-green-500 transition-colors duration-300" />
        )}
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
          {type === 'vimeo' ? 'Vimeo Video' : 'Video Directo'}
        </span>
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden group border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm transition-all duration-300 hover:border-green-500/40">
      <div className="flex flex-col md:flex-row gap-6 p-5">
        {/* Contenedor de Miniatura / Video Trigger */}
        <div 
          onClick={() => onPlay(video)}
          className="relative w-full md:w-64 h-36 rounded-xl overflow-hidden cursor-pointer bg-slate-950 border border-slate-800 flex-shrink-0 group/thumb"
        >
          {renderThumbnail()}
          {/* Overlay Oscuro y Botón Play */}
          <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-green-500 text-slate-950 flex items-center justify-center shadow-lg transform scale-90 opacity-90 group-hover/thumb:scale-100 group-hover/thumb:opacity-100 transition-all duration-300">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Detalles del Video */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* Header info */}
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-green-500" />
                {formatDate(video.fecha_partido)}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span className="capitalize text-slate-400 bg-slate-850 px-2.5 py-0.5 rounded-full border border-slate-800 text-[10px] font-bold">
                {type}
              </span>
            </div>

            {/* Título */}
            <h3 
              onClick={() => onPlay(video)}
              className="text-lg font-bold text-slate-100 hover:text-green-400 cursor-pointer transition-colors duration-200 mb-2 leading-snug truncate"
            >
              {video.titulo}
            </h3>

            {/* Descripción */}
            {displayDescription ? (
              <div className="text-sm text-slate-400 leading-relaxed break-words mb-3">
                {displayDescription}
                {shouldTruncate && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-green-400 hover:text-green-300 font-bold ml-1.5 inline-flex items-center gap-0.5 text-xs transition-colors duration-150"
                  >
                    {isExpanded ? (
                      <>
                        Ver menos <EyeOff className="h-3 w-3 inline" />
                      </>
                    ) : (
                      <>
                        Ver más <Eye className="h-3 w-3 inline" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic mb-3">Sin descripción para este partido.</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-2">
            <Button
              onClick={() => onPlay(video)}
              variant="primary"
              className="flex items-center gap-1.5 font-bold py-1.5 px-3"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Reproducir
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => onEdit(video)}
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                title="Editar video"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => onDelete(video.id)}
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                title="Eliminar video"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
