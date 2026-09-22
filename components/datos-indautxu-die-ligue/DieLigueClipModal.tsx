'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, Volume2, VolumeX, Maximize, Film, Download, RefreshCw } from 'lucide-react';

export interface DieLigueClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  start: number;
  end: number;
  title: string;
  subtitle?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function DieLigueClipModal({
  isOpen,
  onClose,
  videoUrl,
  start,
  end,
  title,
  subtitle,
  onDownload,
  isDownloading = false,
}: DieLigueClipModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(start);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const clipDuration = Math.max(1, end - start);
  const elapsed = Math.max(0, Math.min(clipDuration, currentTime - start));
  const progressPercent = Math.min(100, Math.max(0, (elapsed / clipDuration) * 100));

  // Inicializar tiempo y autoplay al montar o cambiar de tramo
  const handleLoadedMetadata = useCallback(() => {
    setIsLoading(false);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      setCurrentTime(start);
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsEnded(false);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [start]);

  // Manejo de eventos de tiempo y confinamiento al tramo [start, end]
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Parada automática al alcanzar el final del tramo
    if (cur >= end) {
      videoRef.current.pause();
      videoRef.current.currentTime = end;
      setIsPlaying(false);
      setIsEnded(true);
    } else if (cur < start) {
      videoRef.current.currentTime = start;
      setCurrentTime(start);
    }
  }, [start, end]);

  // Control Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isEnded || videoRef.current.currentTime >= end) {
      videoRef.current.currentTime = start;
      setCurrentTime(start);
      setIsEnded(false);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [start, end, isEnded]);

  // Repetir clip desde el inicio del tramo
  const restartClip = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = start;
    setCurrentTime(start);
    setIsEnded(false);
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [start]);

  // Mutear / Desmutear
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  // Pantalla completa
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  // Salto en la barra de progreso dentro del rango [start, end]
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetTime = start + ratio * clipDuration;

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setIsEnded(false);
    if (!isPlaying) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // Atajos de teclado (Escape para cerrar, Espacio para reproducir/pausar)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, togglePlay]);

  // Al desmontar o cerrar, pausar el reproductor
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Reproductor de Clip */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60">
                  Clip Die Ligue
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Duración: {formatDuration(clipDuration)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate max-w-md sm:max-w-xl mt-0.5">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Cerrar reproductor (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del Vídeo */}
        <div className="relative bg-black flex items-center justify-center aspect-video max-h-[65vh] select-none">
          {isLoading && !videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 gap-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-300 font-medium">Cargando fragmento de vídeo...</span>
            </div>
          )}

          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 p-6 text-center">
              <p className="text-sm font-bold text-red-400">No se pudo reproducir el clip</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">{videoError}</p>
              <button
                onClick={() => {
                  setVideoError(null);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            controlsList="nodownload nofullscreen noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => {
              setIsPlaying(true);
              setIsEnded(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setIsEnded(true);
            }}
            onError={() => {
              setIsLoading(false);
              setVideoError('Error al contactar con el CDN de Die Ligue.');
            }}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Overlay de Clip Terminado con botón destacado para repetir */}
          {isEnded && (
            <div
              onClick={restartClip}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 cursor-pointer animate-in fade-in duration-200"
            >
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                <RotateCcw className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold text-white mt-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                Fin del recorte • Pulsa para repetir
              </p>
            </div>
          )}
        </div>

        {/* Barra de Control Inferior */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
          {/* Barra de Progreso acotada estrictamente a [start, end] */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="relative h-2 sm:h-2.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden group"
            title="Avanzar / retroceder en el clip"
          >
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Fila de Botones y Minutaje */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center transition-colors"
                title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={restartClip}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Volver al inicio del clip"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Repetir</span>
              </button>

              {onDownload && (
                <button
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold flex items-center gap-1.5 transition-colors border border-emerald-500/30 disabled:opacity-50"
                  title="Descargar vídeo MP4 recortado oficial de Die Ligue"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Generando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Descargar clip</span>
                    </>
                  )}
                </button>
              )}

              <div className="text-slate-300 font-mono font-bold text-[11px] sm:text-xs ml-1">
                <span>{formatDuration(elapsed)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-400">{formatDuration(clipDuration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[11px] text-slate-500">
                Tramo Die Ligue: {start}s – {end}s
              </span>

              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Pantalla completa"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
