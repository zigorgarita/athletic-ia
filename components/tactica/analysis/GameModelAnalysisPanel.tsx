'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Loader2, Target, ArrowRight, Zap, ShieldAlert, RefreshCw, ChevronDown, ChevronUp, BookOpen, Layers } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { GameModelAnalysis } from '@/types';

interface GameModelAnalysisPanelProps {
  selectedFormation: string;
  rivalFormation: string;
  analysisData: GameModelAnalysis;
  onChange: (updated: GameModelAnalysis) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function GameModelAnalysisPanel({
  selectedFormation,
  rivalFormation,
  analysisData,
  onChange,
  onAnalyze,
  isAnalyzing = false,
}: GameModelAnalysisPanelProps) {
  const { isEditMode } = useEditMode();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'fases' | 'roles'>('plan');

  const updateField = (field: keyof GameModelAnalysis, value: string) => {
    onChange({
      ...analysisData,
      [field]: value
    });
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6 shadow-xl transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#CC0E21]/20 to-red-900/30 border border-[#CC0E21]/40 rounded-2xl">
            <Shield className="h-5 w-5 text-[#CC0E21]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">
                Análisis según nuestro Modelo de Juego
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#CC0E21]/20 text-red-400 border border-[#CC0E21]/30 rounded-full">
                Indautxu DH 1-4-2-3-1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identidad de juego: Ataque posicional, 3º Hombre, Presión 6-8&apos;&apos; condicionada y Repliegue en 40m.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] text-slate-300 font-bold bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-red-400">{selectedFormation}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-amber-400">{rivalFormation}</span>
          </div>

          {onAnalyze && isEditMode && (
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-gradient-to-r from-[#CC0E21] via-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-red-900/30 active:scale-95 disabled:scale-100"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Aplicando Modelo de Juego...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                  <span>Analizar según Modelo</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors"
            title={isExpanded ? 'Plegar bloque' : 'Desplegar bloque'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub-navigation tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800/40 pb-2">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'plan'
                  ? 'bg-[#CC0E21]/20 text-red-300 border border-[#CC0E21]/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Plan de Juego & Ajustes</span>
            </button>
            <button
              onClick={() => setActiveTab('fases')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'fases'
                  ? 'bg-[#CC0E21]/20 text-red-300 border border-[#CC0E21]/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Transiciones & Fases</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'roles'
                  ? 'bg-[#CC0E21]/20 text-red-300 border border-[#CC0E21]/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Instrucciones por Puesto</span>
            </button>
          </div>

          {/* TAB 1: Plan de Juego y Ajustes */}
          {activeTab === 'plan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Ataque Posicional & Progresión */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" /> 1. Plan de Ataque y Progresión
                    </label>
                    <span className="text-[9px] text-slate-500 font-semibold">Progresar para Finalizar</span>
                  </div>
                  <textarea
                    value={analysisData.ataque_posicional || ''}
                    onChange={(e) => updateField('ataque_posicional', e.target.value)}
                    placeholder="Mecanismos de ataque: 3º hombre, Cuadrado de superioridad, Dividir, Juntar y girar..."
                    className="w-full min-h-[120px] bg-slate-950/90 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>

                {/* Defensa Posicional & Presión Alta */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> 2. Defensa Posicional & Presión Alta
                    </label>
                    <span className="text-[9px] text-slate-500 font-semibold">Bloque Máx 40m</span>
                  </div>
                  <textarea
                    value={analysisData.defensa_posicional || ''}
                    onChange={(e) => updateField('defensa_posicional', e.target.value)}
                    placeholder="Estructura de presión: Delantero entre DFCs, MCO a 8m, Extremos en diagonal..."
                    className="w-full min-h-[120px] bg-slate-950/90 border border-slate-800 focus:border-red-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Riesgos Asumidos */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-400" /> 3. Riesgos Asumidos
                  </label>
                  <textarea
                    value={analysisData.riesgos_asumidos || ''}
                    onChange={(e) => updateField('riesgos_asumidos', e.target.value)}
                    placeholder="Riesgos potenciales del matchup contra el sistema rival..."
                    className="w-full min-h-[100px] bg-slate-950/90 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>

                {/* Ajustes Tácticos Específicos */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-400" /> 4. Ajustes Específicos del Míster
                  </label>
                  <textarea
                    value={analysisData.ajustes_especificos || ''}
                    onChange={(e) => updateField('ajustes_especificos', e.target.value)}
                    placeholder="Ajustes específicos según el sistema rival..."
                    className="w-full min-h-[120px] bg-slate-950/90 border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Transiciones & Fases */}
          {activeTab === 'fases' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transición Ataque-Defensa */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-orange-400" /> Transición Ataque-Defensa (Tras Pérdida)
                  </label>
                  <span className="text-[9px] text-slate-500 font-semibold">6-8&apos;&apos; Condicionada</span>
                </div>
                <textarea
                  value={analysisData.transicion_perdida || ''}
                  onChange={(e) => updateField('transicion_perdida', e.target.value)}
                  placeholder="Presión 6-8'' condicionada a cercanía y coberturas. Si superados: abandonar y repliegue 40m..."
                  className="w-full min-h-[160px] bg-slate-950/90 border border-slate-800 focus:border-orange-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              {/* Transición Defensa-Ataque */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" /> Transición Defensa-Ataque (Tras Recuperación)
                  </label>
                  <span className="text-[9px] text-slate-500 font-semibold">Contraataque vs Mantener</span>
                </div>
                <textarea
                  value={analysisData.transicion_recuperacion || ''}
                  onChange={(e) => updateField('transicion_recuperacion', e.target.value)}
                  placeholder="Contraataque si superioridad/igualdad. Mantener si inferioridad. Robo en iniciación/creación/finalización..."
                  className="w-full min-h-[160px] bg-slate-950/90 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Instrucciones por Puesto */}
          {activeTab === 'roles' && (
            <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-purple-400" /> Tareas por Líneas e Instrucciones Individuales
                </label>
                <span className="text-[9px] text-slate-500 font-semibold">Identidad 1-4-2-3-1</span>
              </div>
              <textarea
                value={analysisData.tareas_roles_modelo || ''}
                onChange={(e) => updateField('tareas_roles_modelo', e.target.value)}
                placeholder="Instrucciones específicas por puesto (POR, DFC, LAT, MCD, MCO, EXT, DC) según nuestro modelo..."
                className="w-full min-h-[220px] bg-slate-950/90 border border-slate-800 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors font-mono leading-relaxed"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
