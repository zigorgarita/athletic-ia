'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Loader2, Target, ArrowRight, Zap, ShieldAlert, RefreshCw, ChevronDown, ChevronUp, BookOpen, Layers, UserCheck } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { GameModelAnalysis, GameModelRoleInstructions } from '@/types';

interface GameModelAnalysisPanelProps {
  selectedFormation: string;
  rivalFormation: string;
  analysisData: GameModelAnalysis;
  onChange: (updated: GameModelAnalysis) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

// Sanitizar Markdown innecesario (asteriscos, almohadillas) para mostrar texto limpio
export function sanitizeMarkdownText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`/g, '')
    .trim();
}

const ROLE_LABELS: { key: keyof GameModelRoleInstructions; label: string; badge: string; line: string }[] = [
  { key: 'portero', label: 'Portero', badge: 'POR', line: 'Portería' },
  { key: 'centralIzquierdo', label: 'Central Izquierdo', badge: 'DCI', line: 'Defensa' },
  { key: 'centralDerecho', label: 'Central Derecho', badge: 'DCD', line: 'Defensa' },
  { key: 'lateralIzquierdo', label: 'Lateral Izquierdo', badge: 'LI', line: 'Defensa' },
  { key: 'lateralDerecho', label: 'Lateral Derecho', badge: 'LD', line: 'Defensa' },
  { key: 'pivoteDefensivo', label: 'Pivote Defensivo (Contención)', badge: 'MCD', line: 'Mediocampo' },
  { key: 'pivoteOfensivo', label: 'Pivote Ofensivo (Creador)', badge: 'MC/MCD', line: 'Mediocampo' },
  { key: 'mediapunta', label: 'Mediapunta', badge: 'MCO', line: 'Mediocampo' },
  { key: 'extremoIzquierdo', label: 'Extremo Izquierdo', badge: 'EI', line: 'Delantera' },
  { key: 'extremoDerecho', label: 'Extremo Derecho', badge: 'ED', line: 'Delantera' },
  { key: 'delantero', label: 'Delantero Centro', badge: 'DC', line: 'Delantera' },
];

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

  const updateRoleInstruction = (roleKey: keyof GameModelRoleInstructions, value: string) => {
    const currentRoles = analysisData.instruccionesPorPuesto || {
      portero: '',
      centralIzquierdo: '',
      centralDerecho: '',
      lateralIzquierdo: '',
      lateralDerecho: '',
      pivoteDefensivo: '',
      pivoteOfensivo: '',
      mediapunta: '',
      extremoIzquierdo: '',
      extremoDerecho: '',
      delantero: ''
    };

    onChange({
      ...analysisData,
      instruccionesPorPuesto: {
        ...currentRoles,
        [roleKey]: value
      }
    });
  };

  const rolesObj = analysisData.instruccionesPorPuesto;

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
          {/* Insignia de Fuentes Utilizadas & Trazabilidad */}
          {((analysisData.fuentesUtilizadas && analysisData.fuentesUtilizadas.length > 0) || (analysisData.principiosIndautxuAplicados && analysisData.principiosIndautxuAplicados.length > 0)) && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs text-slate-300">
              {analysisData.fuentesUtilizadas && analysisData.fuentesUtilizadas.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="h-4 w-4 text-[#CC0E21]" />
                  <span className="font-bold text-slate-200">Fuentes del Análisis:</span>
                  <div className="flex flex-wrap gap-1">
                    {analysisData.fuentesUtilizadas.map((src, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-200">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysisData.principiosIndautxuAplicados && analysisData.principiosIndautxuAplicados.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 flex-wrap">
                  <Shield className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-emerald-400 text-xs block mb-1">Principios Indautxu Aplicados en este Matchup:</strong>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisData.principiosIndautxuAplicados.map((prin, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[10px] font-semibold">
                          {prin}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {analysisData.avisoIncertidumbre && (
                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {analysisData.avisoIncertidumbre}
                </div>
              )}
            </div>
          )}

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
              <span>Instrucciones por Puesto (11 Roles)</span>
            </button>
          </div>

          {/* TAB 1: Plan de Juego y Ajustes */}
          {activeTab === 'plan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Plan de Ataque & Progresión */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" /> Plan de Ataque y Progresión
                    </label>
                    <span className="text-[9px] text-slate-500 font-semibold">1-4-2-3-1 Posicional</span>
                  </div>
                  <textarea
                    value={sanitizeMarkdownText(analysisData.planAtaque || analysisData.ataque_posicional || '')}
                    onChange={(e) => updateField('planAtaque', e.target.value)}
                    placeholder="Cómo progresar contra su estructura, papel del mediapunta entre líneas, relación laterales-extremos, 3º hombre..."
                    className="w-full min-h-[140px] bg-slate-950/90 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
                  />
                </div>

                {/* Plan Defensivo & Presión Alta */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Plan Defensivo & Presión Alta
                    </label>
                    <span className="text-[9px] text-slate-500 font-semibold">Bloque Máx 40m</span>
                  </div>
                  <textarea
                    value={sanitizeMarkdownText(analysisData.planDefensivo || analysisData.defensa_posicional || '')}
                    onChange={(e) => updateField('planDefensivo', e.target.value)}
                    placeholder="Cómo fijar atacantes en salida, quién salta sobre sus centrales y laterales, coberturas del doble pivote..."
                    className="w-full min-h-[140px] bg-slate-950/90 border border-slate-800 focus:border-red-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Riesgos Asumidos */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-400" /> Riesgos Asumidos
                  </label>
                  <textarea
                    value={sanitizeMarkdownText(analysisData.riesgosAsumidos || analysisData.riesgos_asumidos || '')}
                    onChange={(e) => updateField('riesgosAsumidos', e.target.value)}
                    placeholder="Riesgos concretos asumidos: bandas, segundas jugadas, duelos 1v1, espaldas de laterales..."
                    className="w-full min-h-[120px] bg-slate-950/90 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
                  />
                </div>

                {/* Ajustes Específicos del Míster */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-400" /> Ajustes Específicos del Míster
                  </label>
                  <textarea
                    value={sanitizeMarkdownText(analysisData.ajustesMister || analysisData.ajustes_especificos || '')}
                    onChange={(e) => updateField('ajustesMister', e.target.value)}
                    placeholder="Consignas directas y ajustes específicos para contrarrestar las fortalezas del rival..."
                    className="w-full min-h-[140px] bg-slate-950/90 border border-slate-800 focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
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
                  value={sanitizeMarkdownText(analysisData.transicionAtaqueDefensa || analysisData.transicion_perdida || '')}
                  onChange={(e) => updateField('transicionAtaqueDefensa', e.target.value)}
                  placeholder="Presión 6-8'' condicionada a cercanía, coberturas y carril interior. Si superados: abandono y repliegue al bloque compacto..."
                  className="w-full min-h-[180px] bg-slate-950/90 border border-slate-800 focus:border-orange-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
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
                  value={sanitizeMarkdownText(analysisData.transicionDefensaAtaque || analysisData.transicion_recuperacion || '')}
                  onChange={(e) => updateField('transicionDefensaAtaque', e.target.value)}
                  placeholder="Contraataque si superioridad/igualdad hacia adelante. Mantener para progresar si inferioridad. Plan según zonas de robo..."
                  className="w-full min-h-[180px] bg-slate-950/90 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Instrucciones por Puesto para los 11 Roles */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Instrucciones Individuales para los 11 Roles del Once Inicial
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  Modelo 1-4-2-3-1 vs {rivalFormation}
                </span>
              </div>

              {rolesObj ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ROLE_LABELS.map((item) => {
                    const textVal = sanitizeMarkdownText(rolesObj[item.key] || '');
                    return (
                      <div key={item.key} className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-purple-950 border border-purple-500/30 text-purple-300 rounded-md">
                              {item.badge}
                            </span>
                            {item.label}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500">{item.line}</span>
                        </div>
                        <textarea
                          value={textVal}
                          onChange={(e) => updateRoleInstruction(item.key, e.target.value)}
                          placeholder={`Instrucciones específicas para ${item.label}...`}
                          className="w-full min-h-[90px] bg-slate-950 border border-slate-800/80 focus:border-purple-500/50 rounded-xl px-2.5 py-2 text-[11px] text-slate-200 focus:outline-none transition-colors leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Compatibilidad si es texto genérico sin desglosar */
                <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-purple-400" /> Tareas por Líneas e Instrucciones
                  </label>
                  <textarea
                    value={sanitizeMarkdownText(analysisData.tareas_roles_modelo || '')}
                    onChange={(e) => updateField('tareas_roles_modelo', e.target.value)}
                    placeholder="Instrucciones específicas por puesto (POR, DFC, LAT, MCD, MCO, EXT, DC) según nuestro modelo..."
                    className="w-full min-h-[220px] bg-slate-950/90 border border-slate-800 focus:border-purple-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
