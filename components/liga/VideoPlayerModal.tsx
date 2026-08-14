'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Play, AlertCircle, Shield, Eye } from 'lucide-react';
import { parseVideoUrl, VideoInfo } from '@/lib/video';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string | null | undefined;
  tipoOrigen?: 'Enlace' | 'Archivo';
  driveFileId?: string | null;
}

export function parseEmbedVideoUrl(url: string): { embedUrl: string | null; isIframe: boolean; isVertical: boolean; type: string; driveFileId?: string } {
  if (!url) return { embedUrl: null, isIframe: false, isVertical: false, type: 'direct' };

  if (url.startsWith('drive://')) {
    const fileId = url.replace('drive://', '').trim();
    return {
      embedUrl: `/api/google-drive/stream/${fileId}`,
      isIframe: false,
      isVertical: false,
      type: 'gdrive',
      driveFileId: fileId
    };
  }

  if (url.startsWith('/api/google-drive/stream/')) {
    const fileId = url.replace('/api/google-drive/stream/', '').trim();
    return {
      embedUrl: url.trim(),
      isIframe: false,
      isVertical: false,
      type: 'gdrive',
      driveFileId: fileId
    };
  }

  const info: VideoInfo = parseVideoUrl(url);

  if (info.type === 'gdrive' && info.id) {
    return {
      embedUrl: `https://drive.google.com/file/d/${info.id}/preview`,
      isIframe: true,
      isVertical: false,
      type: 'gdrive',
      driveFileId: info.id
    };
  }

  if (info.type === 'youtube' || info.type === 'shorts' || info.type === 'vimeo') {
    return {
      embedUrl: info.embedUrl,
      isIframe: true,
      isVertical: !!info.isVertical,
      type: info.type
    };
  }

  if (info.type === 'veo') {
    return {
      embedUrl: info.embedUrl,
      isIframe: false,
      isVertical: false,
      type: 'veo'
    };
  }

  // Direct video stream / file
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

export function VideoPlayerModal({ isOpen, onClose, title, videoUrl, tipoOrigen = 'Enlace', driveFileId: propDriveId }: VideoPlayerModalProps) {
  const [playMode, setPlayMode] = useState<'stream' | 'iframe'>('stream');

  if (!isOpen) return null;

  const parsed = videoUrl ? parseEmbedVideoUrl(videoUrl) : { embedUrl: null, isIframe: false, isVertical: false, type: 'direct' };
  const effectiveDriveId = propDriveId || parsed.driveFileId;
  const isGDrive = parsed.type === 'gdrive' || !!effectiveDriveId;

  const streamUrl = effectiveDriveId ? `/api/google-drive/stream/${effectiveDriveId}` : (parsed.type === 'direct' ? parsed.embedUrl : null);
  const iframeUrl = effectiveDriveId ? `https://drive.google.com/file/d/${effectiveDriveId}/preview` : (parsed.isIframe ? parsed.embedUrl : null);
  const externalUrl = effectiveDriveId ? `https://drive.google.com/file/d/${effectiveDriveId}/view` : (videoUrl || '');
  const footerAddressUrl = streamUrl || videoUrl || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl w-full ${
        parsed.isVertical ? 'max-w-md' : 'max-w-4xl'
      } shadow-2xl overflow-hidden z-10 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}>
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-[#CC0E21]" />
            <h2 className="text-lg font-bold text-slate-100 truncate max-w-md">{title}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Conmutador de Modo de Reproducción para Vídeos de Drive */}
            {isGDrive && (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPlayMode('stream')}
                  className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    playMode === 'stream' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Streaming Privado Autenticado mediante HTTP Range"
                >
                  <Shield className="h-3 w-3" /> Stream Privado (Proxy)
                </button>
                <button
                  type="button"
                  onClick={() => setPlayMode('iframe')}
                  className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    playMode === 'iframe' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vista previa mediante iframe oficial de Google Drive"
                >
                  <Eye className="h-3 w-3" /> Vista Previa (Iframe)
                </button>
              </div>
            )}

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
        </div>

        {/* Reproductor / Visor Adaptativo */}
        <div className={`bg-slate-950 flex flex-col items-center justify-center p-1 relative ${
          parsed.isVertical ? 'aspect-[9/16] max-h-[75vh]' : 'aspect-video max-h-[80vh]'
        }`}>
          {videoUrl || streamUrl ? (
            isGDrive && playMode === 'stream' && streamUrl ? (
              <video
                src={streamUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full rounded-lg object-contain max-h-[75vh]"
                autoPlay
              />
            ) : iframeUrl && (playMode === 'iframe' || parsed.isIframe) ? (
              <iframe
                src={iframeUrl}
                className="w-full h-full border-0 rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={title}
              />
            ) : parsed.type === 'direct' && parsed.embedUrl ? (
              <video
                src={parsed.embedUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full rounded-lg object-contain max-h-[75vh]"
                autoPlay
              />
            ) : parsed.type === 'veo' ? (
              <div className="text-center p-8 flex flex-col items-center gap-4 max-w-md">
                <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <ExternalLink className="h-7 w-7 text-[#CC0E21]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">Vídeo de Veo</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Los partidos de la plataforma Veo se visualizan externamente en el visor oficial de Veo.
                  </p>
                </div>
                <Button
                  onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 mt-2 bg-[#CC0E21] hover:bg-[#b00c1c]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir partido en Veo
                </Button>
              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center gap-4 max-w-md">
                <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">Reproductor no incrustable</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Este origen de vídeo ({tipoOrigen}) o proveedor no permite su visualización directa.
                  </p>
                </div>
                <Button
                  onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
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
        {(videoUrl || streamUrl) && (
          <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Dirección del vídeo
              </span>
              <input
                type="text"
                readOnly
                value={footerAddressUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-700"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(footerAddressUrl);
                  alert('URL copiada al portapapeles');
                }}
                className="text-[#CC0E21] text-xs py-1.5 px-3"
              >
                Copiar enlace
              </Button>
              <Button
                onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
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
