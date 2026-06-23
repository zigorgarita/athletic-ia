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

export function parseEmbedVideoUrl(url: string): { embedUrl: string | null; isIframe: boolean } {
  if (!url) return { embedUrl: null, isIframe: false };

  const cleanUrl = url.trim();

  // YouTube
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      isIframe: true
    };
  }

  // Vimeo
  // https://vimeo.com/123456789
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      isIframe: true
    };
  }

  // Google Drive
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // https://drive.google.com/file/d/FILE_ID/preview
  if (cleanUrl.includes('drive.google.com')) {
    const gdMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (gdMatch && gdMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${gdMatch[1]}/preview`,
        isIframe: true
      };
    }
  }

  // Direct Video files (mp4, webm, ogg, etc. or Supabase Storage links)
  const isDirectVideo = 
    cleanUrl.match(/\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i) || 
    cleanUrl.includes('supabase.co/storage/v1/object/public/');
    
  if (isDirectVideo) {
    return {
      embedUrl: cleanUrl,
      isIframe: false
    };
  }

  // Fallback (e.g. Hudl, Veo, or general links that we can't embed reliably)
  return {
    embedUrl: null,
    isIframe: false
  };
}

export function VideoPlayerModal({ isOpen, onClose, title, videoUrl, tipoOrigen = 'Enlace' }: VideoPlayerModalProps) {
  if (!isOpen) return null;

  const { embedUrl, isIframe } = videoUrl ? parseEmbedVideoUrl(videoUrl) : { embedUrl: null, isIframe: false };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden z-10 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#CC0E21]" />
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
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

        {/* Reproductor / Visor */}
        <div className="bg-slate-950 aspect-video flex flex-col items-center justify-center p-1 relative">
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
                  className="w-full h-full rounded-lg object-contain"
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
