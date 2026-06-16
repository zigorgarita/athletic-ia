import React, { useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { MatchVideo } from '@/types';
import { parseVideoUrl } from '@/lib/video';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: MatchVideo | null;
}

export function VideoPlayerModal({ isOpen, onClose, video }: VideoPlayerModalProps) {
  // Manejo de la tecla Esc para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Evitar scroll en el body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !video) return null;

  const { type, embedUrl } = parseVideoUrl(video.video_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-fade-in">
      {/* Backdrop de cine (Muy oscuro) */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Contenedor del Reproductor */}
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2 text-green-400">
            <Play className="h-4.5 w-4.5 fill-current" />
            <h2 className="text-md font-bold text-slate-100 truncate max-w-[65vw] sm:max-w-md">
              {video.titulo}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Cerrar reproductor"
          >
            <X size={20} />
          </button>
        </div>

        {/* Reproductor de Video */}
        <div className="relative w-full aspect-video bg-black flex-1">
          {type === 'youtube' || type === 'vimeo' ? (
            <iframe
              src={embedUrl}
              title={video.titulo}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              controls
              autoPlay
              playsInline
            />
          )}
        </div>

        {/* Descripción del partido */}
        {video.descripcion && (
          <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-850 max-h-32 overflow-y-auto text-sm text-slate-300">
            <h4 className="font-semibold text-slate-400 mb-1 text-xs uppercase tracking-wider">
              Análisis Táctico / Notas del Partido
            </h4>
            <p className="leading-relaxed whitespace-pre-line">{video.descripcion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
