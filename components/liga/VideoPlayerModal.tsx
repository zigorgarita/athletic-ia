'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Play, AlertCircle } from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string | null | undefined;
  tipoOrigen?: 'Enlace' | 'Archivo';
}

import { parseVideoUrl, VideoInfo } from '@/lib/video';

export function parseEmbedVideoUrl(url: string): { embedUrl: string | null; isIframe: boolean; isVertical: boolean; type: string } {
  if (!url) return { embedUrl: null, isIframe: false, isVertical: false, type: 'direct' };

  const info: VideoInfo = parseVideoUrl(url);

  if (info.type === 'youtube' || info.type === 'shorts' || info.type === 'vimeo' || info.type === 'gdrive') {
    return {
      embedUrl: info.embedUrl,
      isIframe: true,
      isVertical: !!info.isVertical,
      type: info.type
    };
  }

  // Direct video file
  if (url.match(/\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i) || url.includes('supabase.co/storage/')) {
    return {
      embedUrl: url.trim(),
      isIframe: false,
      isVertical: false,
      type: 'direct'
    };
  }

  return {
    embedUrl: null,
    isIframe: false,
    isVertical: false,
    type: 'unknown'
  };
}

export function VideoPlayerModal({ isOpen, onClose, title, videoUrl, tipoOrigen = 'Enlace' }: VideoPlayerModalProps) {
  if (!isOpen) return null;

  const { embedUrl, isIframe, isVertical, type } = videoUrl
    ? parseEmbedVideoUrl(videoUrl)
    : { embedUrl: null, isIframe: false, isVertical: false, type: 'direct' };

  const isGDrive = type === 'gdrive';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl w-full ${
        isVertical ? 'max-w-md' : 'max-w-4xl'
      } shadow-2xl overflow-hidden z-10 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}>
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#CC0E21]" />
            <h2 className="text-lg font-bold text-slate-100 truncate max-w-md">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors duration-200"
            aria-label="Cerrar reproductor"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aviso de procesamiento de Google Drive */}
        {isGDrive && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 text-[11px] text-amber-300 flex items-center justify-between">
            <span>ℹ️ Si el vídeo de Google Drive se ha subido recientemente, es posible que tarde unos minutos en procesar la vista previa.</span>
          </div>
        )}

        {/* Reproductor / Visor Adaptativo */}
        <div className={`bg-slate-950 flex flex-col items-center justify-center p-1 relative ${
          isVertical ? 'aspect-[9/16] max-h-[75vh]' : 'aspect-video max-h-[80vh]'
        }`}>
          {videoUrl ? (
            embedUrl ? (
              isIframe ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0 rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={title}
                />
              ) : (
                <video
                  src={embedUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full rounded-lg object-contain max-h-[75vh]"
                  autoPlay
                />
              )
            ) : (
              <div className="text-center p-8 flex flex-col items-center gap-4 max-w-md">
                <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">Reproductor no incrustable</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Este origen de vídeo ({tipoOrigen}) o proveedor (ej. Hudl, Veo) no permite su visualización dentro de otras aplicaciones por motivos de seguridad.
                  </p>
                </div>
                <Button
                  onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 mt-2 bg-[#CC0E21] hover:bg-[#b00c1c]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir en pestaña nueva
                </Button>
              </div>
            )
          ) : (
            <div className="text-slate-500 text-sm">No hay URL de vídeo válida disponible.</div>
          )}
        </div>

        {/* Footer/URL details */}
        {videoUrl && (
          <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Dirección del vídeo
              </span>
              <input
                type="text"
                readOnly
                value={videoUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-700"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(videoUrl);
                  alert('URL copiada al portapapeles');
                }}
                className="text-xs py-1.5 px-3"
              >
                Copiar enlace
              </Button>
              <Button
                onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1 text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Externo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
