'use client';

import React from 'react';
import { CheckCircle2, Clock, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface DieLigenMatchCardProps {
  jornada: number;
  isHome: boolean;
  homeTeamName: string;
  awayTeamName: string;
  scoreDisplay?: string;
  isAnalyzed: boolean;
  analysisStatus?: string;
  onLoadViewer: () => void;
  isLoading?: boolean;
}

export function DieLigenMatchCard({
  jornada,
  isHome,
  homeTeamName,
  awayTeamName,
  scoreDisplay,
  isAnalyzed,
  analysisStatus,
  onLoadViewer,
  isLoading = false,
}: DieLigenMatchCardProps) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all shadow-sm">
      {/* Fila superior: Jornada, Local/Visitante y Estado */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-white font-mono text-[11px]">
            Jornada {jornada}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {isHome ? 'Local' : 'Visitante'}
          </span>
        </div>

        {isAnalyzed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Análisis listo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-slate-400" />
            {analysisStatus || 'Pendiente'}
          </span>
        )}
      </div>

      {/* Fila central: Equipos y Marcador */}
      <div className="text-xs space-y-1">
        <div className="font-semibold text-slate-200 truncate">
          {homeTeamName}
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span className="truncate">{awayTeamName}</span>
          {scoreDisplay && (
            <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] ml-2 border border-slate-800">
              {scoreDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Botón de acción */}
      <div className="pt-1">
        {isAnalyzed ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onLoadViewer}
            disabled={isLoading}
            className="w-full text-xs font-bold py-2 px-3 border-slate-700 bg-slate-800 hover:bg-[#CC0E21] hover:border-[#CC0E21] hover:text-white text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Cargando informe...</span>
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 text-amber-400" />
                <span>Cargar en visor individual</span>
              </>
            )}
          </Button>
        ) : (
          <div className="text-[11px] text-center text-slate-500 italic py-1.5 bg-slate-900/40 rounded-lg border border-slate-850">
            Análisis aún no publicado en Die Ligen
          </div>
        )}
      </div>
    </div>
  );
}
