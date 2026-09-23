import React, { useState } from 'react';
import { DieLigueTacticalEventActa, DieLigueMatchActa } from '@/lib/die-ligen/actas';
import {
  Film,
  ArrowUp,
  ArrowDown,
  X,
  RefreshCw,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';

interface ClipsMergeDrawerProps {
  match: DieLigueMatchActa;
  selectedClips: DieLigueTacticalEventActa[];
  onRemoveClip: (clipId: string) => void;
  onMoveClip: (index: number, direction: 'up' | 'down') => void;
  onClearSelection: () => void;
}

export function ClipsMergeDrawer({
  match,
  selectedClips,
  onRemoveClip,
  onMoveClip,
  onClearSelection,
}: ClipsMergeDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (selectedClips.length === 0) {
    return null;
  }

  const handleCreateMergedVideo = async () => {
    if (selectedClips.length < 2) {
      setErrorMsg('Selecciona al menos 2 clips para crear el vídeo recopilatorio.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressStep('1/3: Solicitando recortes a Die Ligue...');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'video/mp4, application/json',
      };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      // Preparar payload de recortes respetando el orden
      const payloadClips = selectedClips.map((c) => ({
        id: c.id,
        trimStart: c.start,
        trimEnd: c.end,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        gameDate: match.fecha || undefined,
        videoUrl: c.videoUrl,
        translatedEventName: c.nombreTipo,
        gameMinutes: c.minutoTexto,
      }));

      // Paso 2 visual tras 2.5s mientras el servidor procesa en paralelo
      const stepTimer1 = setTimeout(() => {
        setProgressStep('2/3: Descargando clips y procesando pistas...');
      }, 2500);

      // Paso 3 visual tras 6s
      const stepTimer2 = setTimeout(() => {
        setProgressStep('3/3: Ensamblando vídeo con FFmpeg (-c copy)...');
      }, 6000);

      const res = await fetch('/api/die-ligen/merge-clips', {
        method: 'POST',
        headers,
        body: JSON.stringify({ clips: payloadClips }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        let errDetail = `Error en el servidor (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) errDetail = errJson.error;
        } catch {
          // ignore non-json
        }
        throw new Error(errDetail);
      }

      setProgressStep('Descargando archivo final...');
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `recopilatorio_${match.homeTeam.name}_vs_${match.awayTeam.name}_${selectedClips.length}_clips.mp4`;
      if (disposition && disposition.includes('filename=')) {
        const matchName = disposition.match(/filename="?([^";]+)"?/);
        if (matchName?.[1]) filename = matchName[1];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setSuccessMsg(`¡Vídeo de ${selectedClips.length} clips generado y descargado!`);
      setProgressStep(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al crear el vídeo';
      setErrorMsg(msg);
      setProgressStep(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-20 mt-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl p-3 sm:p-4 text-slate-100">
      {/* Barra superior de la bandeja */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white">
                Bandeja de Clips
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-500/30">
                {selectedClips.length} {selectedClips.length === 1 ? 'clip seleccionado' : 'clips seleccionados'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {match.homeTeam.name} vs {match.awayTeam.name} • Ordena y genera un solo MP4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title={isExpanded ? 'Plegar lista' : 'Desplegar lista'}
          >
            {isExpanded ? (
              <>
                <span className="hidden sm:inline text-[11px]">Ocultar</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline text-[11px]">Ver orden</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClearSelection}
            className="px-2 py-1 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/40 text-[11px] font-medium transition-colors border border-transparent hover:border-red-900/50 cursor-pointer disabled:opacity-50"
            title="Deseleccionar todos los clips"
          >
            Limpiar
          </button>

          <button
            type="button"
            disabled={isProcessing || selectedClips.length < 2}
            onClick={handleCreateMergedVideo}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Crear vídeo recopilatorio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Indicador de progreso activo */}
      {isProcessing && progressStep && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span className="font-medium">{progressStep}</span>
        </div>
      )}

      {/* Mensaje de error si falla */}
      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Lista desplegable para ordenar clips */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin">
          {selectedClips.map((clip, idx) => (
            <div
              key={clip.id}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <span
                  className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 border ${
                    clip.esOfensivo
                      ? 'text-amber-400 bg-amber-950/40 border-amber-900/40'
                      : 'text-blue-400 bg-blue-950/40 border-blue-900/40'
                  }`}
                >
                  {clip.minutoTexto}
                </span>

                <span className="font-semibold text-white truncate shrink-0">
                  {clip.nombreTipo}
                </span>

                {clip.jugadorPrincipal && (
                  <span className="text-slate-400 truncate hidden sm:inline">
                    #{clip.jugadorPrincipal.dorsal} {clip.jugadorPrincipal.nombre}
                  </span>
                )}

                <span className="text-[10px] text-slate-500 shrink-0">
                  ({clip.equipoNombre})
                </span>
              </div>

              {/* Botones de acción del clip en bandeja: Subir, Bajar, Quitar */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0 || isProcessing}
                  onClick={() => onMoveClip(idx, 'up')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title="Mover arriba en el orden"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={idx === selectedClips.length - 1 || isProcessing}
                  onClick={() => onMoveClip(idx, 'down')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title="Mover abajo en el orden"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onRemoveClip(clip.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 cursor-pointer transition-colors"
                  title="Quitar clip de la selección"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
