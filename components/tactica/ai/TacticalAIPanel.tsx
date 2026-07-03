'use client';

import React, { useState } from 'react';
import { useTacticalAI } from '@/hooks/useTacticalAI';
import { TacticalAIContext, TacticalRoleCard } from '@/types';
import { AIChatDrawer } from './AIChatDrawer';
import { 
  Bot, ShieldAlert, Cpu, Layers, Calendar, 
  HelpCircle, MessageSquare, Clipboard, Sparkles, AlertCircle 
} from 'lucide-react';

interface TacticalAIPanelProps {
  systemOwn: string;
  systemRival: string;
  matchupId: string | null;
  matchId: string | null;
  matchRival?: string | null;
  assignedPlayerIds: string[];
  assignedPositions: { label: string; playerId: string | null }[];
  roleCards: TacticalRoleCard[];
  ventajas: string;
  desventajas: string;
  zonaConflicto: string;
  dueloClave: string;
  tareasLineas: string;
}

export function TacticalAIPanel({
  systemOwn,
  systemRival,
  matchupId,
  matchId,
  matchRival,
  assignedPlayerIds,
  assignedPositions,
  roleCards,
  ventajas,
  desventajas,
  zonaConflicto,
  dueloClave,
  tareasLineas
}: TacticalAIPanelProps) {
  const { 
    clearConversation,
    analyzeRival,
    analyzeOwnSystem,
    compareSystems,
    prepareMatch,
    createBriefing,
    generateLineTasks,
    recommendExercises,
    recommendSession,
    explainConcept
  } = useTacticalAI();

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Construir el contexto unificado para enviar a la IA
  const getAIContext = (): TacticalAIContext => {
    return {
      systemOwn,
      systemRival,
      matchupId,
      matchId,
      matchRival: matchRival || null,
      assignedPlayerIds,
      assignedPositions,
      roleCards,
      ventajas,
      desventajas,
      zonaConflicto,
      dueloClave,
      tareasLineas
    };
  };

  const handleAction = async (actionFn: (ctx: TacticalAIContext) => Promise<void>) => {
    setIsChatOpen(true);
    const ctx = getAIContext();
    await actionFn(ctx);
  };

  const handleExplain = async () => {
    const concept = prompt('¿Qué concepto táctico deseas que te explique?');
    if (!concept || !concept.trim()) return;
    
    setIsChatOpen(true);
    const ctx = getAIContext();
    await explainConcept(concept.trim(), ctx);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
      
      {/* Header del Panel */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[#CC0E21]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">Asistente Inteligente IA</h3>
            <p className="text-[10px] text-slate-400">Herramientas automatizadas basadas en Gemini para planificar y analizar.</p>
          </div>
        </div>

        <button
          onClick={() => {
            clearConversation();
            setIsChatOpen(true);
          }}
          className="px-3 py-1.5 bg-[#CC0E21]/15 hover:bg-[#CC0E21]/25 text-[#CC0E21] hover:text-red-400 border border-[#CC0E21]/25 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chat Abierto</span>
        </button>
      </div>

      {/* Grid de 11 acciones agrupadas */}
      <div className="space-y-4">
        
        {/* Grupo 1: Análisis e Inteligencia */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block ml-1">Análisis e Inteligencia</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleAction(analyzeRival)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-[#CC0E21] hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Analizar Rival</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Ventajas, debilidades, duelos.</p>
              </div>
            </button>

            <button
              onClick={() => handleAction(analyzeOwnSystem)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-blue-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Cpu className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Analizar Sistema</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Evaluación de la alineación.</p>
              </div>
            </button>

            <button
              onClick={() => handleAction(compareSystems)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-purple-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Layers className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Comparar Dibujos</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Frenado y desborde teórico.</p>
              </div>
            </button>

            <button
              onClick={() => handleAction(prepareMatch)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-emerald-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Preparar Partido</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Estrategia táctica global.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Grupo 2: Briefing y Instrucciones */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block ml-1">Briefing e Instrucciones</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleAction(createBriefing)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-orange-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Clipboard className="h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Briefing Vestuario</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Charla táctica por líneas.</p>
              </div>
            </button>

            <button
              onClick={() => handleAction(generateLineTasks)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-indigo-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Clipboard className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Tareas por Líneas</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Instrucciones específicas.</p>
              </div>
            </button>

            <button
              onClick={handleExplain}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-yellow-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <HelpCircle className="h-4 w-4 text-yellow-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Explicar Concepto</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Resolver dudas tácticas.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Grupo 3: Planificación de Entrenamientos */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block ml-1">Entrenamientos</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAction(recommendExercises)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-teal-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Calendar className="h-4 w-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Recomendar Ejercicios</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Trabajar principios en campo.</p>
              </div>
            </button>

            <button
              onClick={() => handleAction(recommendSession)}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-cyan-500 hover:bg-slate-900/10 text-left transition-all group flex flex-col gap-1.5"
            >
              <Calendar className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-200">Proponer Sesión</h4>
                <p className="text-[8px] text-slate-450 line-clamp-1">Estructura completa de entrenamiento.</p>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Status Bar */}
      <div className="pt-2 flex items-center justify-between text-[8px] text-slate-500 border-t border-slate-900">
        <span className="flex items-center gap-1">
          <AlertCircle className="h-2.5 w-2.5 text-slate-650" />
          IA activa: Gemini 2.0 Flash (agnóstica a proveedor)
        </span>
        <span>División de Honor Nacional</span>
      </div>

      {/* Drawer del Chat */}
      {isChatOpen && (
        <AIChatDrawer 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          context={getAIContext()}
        />
      )}
    </div>
  );
}
