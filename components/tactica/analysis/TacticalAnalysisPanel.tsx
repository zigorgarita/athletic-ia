'use client';

import React from 'react';
import { BookOpen, ArrowRight, Zap, ShieldAlert, HelpCircle, Award, Layout, Sparkles, Loader2 } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';

interface TacticalAnalysisPanelProps {
  selectedFormation: string;
  rivalFormation: string;
  ventajas: string;
  onVentajasChange: (val: string) => void;
  desventajas: string;
  onDesventajasChange: (val: string) => void;
  zonaConflicto: string;
  onZonaConflictoChange: (val: string) => void;
  dueloClave: string;
  onDueloClaveChange: (val: string) => void;
  tareasLineas: string;
  onTareasLineasChange: (val: string) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function TacticalAnalysisPanel({
  selectedFormation,
  rivalFormation,
  ventajas,
  onVentajasChange,
  desventajas,
  onDesventajasChange,
  zonaConflicto,
  onZonaConflictoChange,
  dueloClave,
  onDueloClaveChange,
  tareasLineas,
  onTareasLineasChange,
  onAnalyze,
  isAnalyzing = false,
}: TacticalAnalysisPanelProps) {
  const { isEditMode } = useEditMode();

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#CC0E21]" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
            Comparador Táctico (Análisis Estratégico)
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850/60 px-3 py-1 rounded-xl">
            {selectedFormation} <ArrowRight className="inline-block h-3.5 w-3.5 mx-1 text-slate-500" /> {rivalFormation}
          </div>
          {onAnalyze && isEditMode && (
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#CC0E21] to-red-700 hover:from-red-700 hover:to-[#CC0E21] disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 border border-slate-800/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:scale-100 disabled:shadow-none shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Analizar Partido</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-[#CC0E21] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#CC0E21]" /> Ventajas del Sistema
            </label>
            <textarea
              value={ventajas}
              onChange={(e) => onVentajasChange(e.target.value)}
              placeholder="Añade o edita ventajas del sistema..."
              className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Desventajas / Riesgos
            </label>
            <textarea
              value={desventajas}
              onChange={(e) => onDesventajasChange(e.target.value)}
              placeholder="Añade o edita desventajas/riesgos..."
              className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-red-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Zona de Conflicto Clave
              </label>
              <input
                type="text"
                value={zonaConflicto}
                onChange={(e) => onZonaConflictoChange(e.target.value)}
                placeholder="Ej: carril central, interior, exterior..."
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
              />
              <span className="text-[9px] text-slate-500 block leading-tight mt-1">
                Escribe &apos;central&apos;, &apos;interior&apos; o &apos;exterior&apos; para iluminar el carril en los campos.
              </span>
            </div>

            <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-yellow-500" /> Duelo Táctico Principal
              </label>
              <input
                type="text"
                value={dueloClave}
                onChange={(e) => onDueloClaveChange(e.target.value)}
                placeholder="Duelo táctico principal..."
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layout className="h-3.5 w-3.5 text-blue-400" /> Tareas por Líneas
            </label>
            <textarea
              value={tareasLineas}
              onChange={(e) => onTareasLineasChange(e.target.value)}
              placeholder="Añade o edita tareas por líneas..."
              className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
