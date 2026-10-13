'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Database
} from 'lucide-react';
import {
  QueryEngineContext,
  QueryResult,
  executeTacticalQuery
} from '@/lib/planificacion/tacticalQueryEngine';

interface ConsultaTacticoModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: QueryEngineContext;
}

const PREGUNTAS_SUGERIDAS = [
  '¿Cuánto hemos entrenado Modelo de Juego y cuánto Salida de Balón esta temporada?',
  '¿Qué conceptos hemos entrenado más y menos en los últimos 30 días en porcentaje?',
  '¿Qué hemos entrenado los últimos 15 días?',
  '¿Qué conceptos no aparecen en los últimos 30 días?',
  '¿Qué trabajamos antes de J2 Santutxu?',
  '¿Cuándo se registró por última vez Presión Tras Pérdida?',
  '¿Qué conceptos aparecen más en MD-2?'
];

export function ConsultaTacticoModal({
  isOpen,
  onClose,
  context
}: ConsultaTacticoModalProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);

  if (!isOpen) return null;

  const handleRunQuery = (textToRun: string) => {
    const cleanText = textToRun.trim();
    if (!cleanText) return;

    setQuery(cleanText);
    const res = executeTacticalQuery(cleanText, context);
    setResult(res);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRunQuery(query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CC0E21]/15 border border-[#CC0E21]/30 flex items-center justify-center text-[#CC0E21]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                Consultar lo entrenado
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  V1 Datos Reales
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Preguntas en lenguaje natural sobre tareas, conceptos, rivales y microciclos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Formulario de Consulta */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              ¿Qué quieres consultar sobre el trabajo táctico registrado?
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ej. ¿Qué trabajamos antes de J2 Santutxu? o ¿Cuándo se registró PTP?"
                className="w-full pl-10 pr-24 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#CC0E21]/60 focus:ring-1 focus:ring-[#CC0E21]/40 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-1.5 px-3 py-1.5 bg-[#CC0E21] hover:bg-[#a80b1a] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <span>Consultar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Preguntas sugeridas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Preguntas sugeridas (haz clic para consultar)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PREGUNTAS_SUGERIDAS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunQuery(sug)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-left"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Resultado de la Consulta */}
          {result && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className={`p-5 rounded-xl border space-y-4 ${
                result.tipo === 'success'
                  ? 'bg-slate-950/70 border-slate-800'
                  : result.tipo === 'no_data'
                  ? 'bg-amber-950/20 border-amber-800/40'
                  : 'bg-slate-950/50 border-slate-800'
              }`}>
                {/* Cabecera del Resultado */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    {result.tipo === 'success' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : result.tipo === 'no_data' ? (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <span className="text-xs font-black text-slate-200">
                      {result.intencionDetectada}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[220px]">
                    &quot;{result.preguntaOriginal}&quot;
                  </span>
                </div>

                {/* Texto de Respuesta con soporte multilínea y listas */}
                <div className="text-xs text-slate-200 leading-relaxed font-medium whitespace-pre-line space-y-1 text-left">
                  {result.respuesta}
                </div>

                {/* Métricas destacadas (si las hay) */}
                {result.detalles && result.detalles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {result.detalles.map((det, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-left">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                          {det.etiqueta}
                        </span>
                        <span className="text-xs font-black text-slate-200 truncate block mt-0.5">
                          {det.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sello de Trazabilidad Obligatorio */}
                {result.trazabilidad && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-bold text-slate-400">
                      <Database className="w-3.5 h-3.5 text-slate-500" />
                      <span>Trazabilidad:</span>
                      <span className="text-slate-300 font-black">
                        {result.trazabilidad.sesionesCount} sesiones distintas
                      </span>
                      <span>·</span>
                      <span className="text-slate-300 font-black">
                        {result.trazabilidad.tareasCount} tareas registradas
                      </span>
                      <span>·</span>
                      <span className="text-amber-400/90 font-medium">
                        {result.trazabilidad.docPdfCount} doc. PDF
                      </span>
                      <span>·</span>
                      <span className="text-blue-400/90 font-medium">
                        {result.trazabilidad.reuseCount} reutilizaciones
                      </span>
                    </div>

                    {result.trazabilidad.detalle && (
                      <span className="text-[9px] text-slate-500 italic truncate max-w-[180px]">
                        {result.trazabilidad.detalle}
                      </span>
                    )}
                  </div>
                )}

                {/* Sugerencias en caso de no_data o unsupported */}
                {result.sugerencias && result.sugerencias.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Preguntas recomendadas:
                    </span>
                    <div className="flex flex-col gap-1">
                      {result.sugerencias.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleRunQuery(sug)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 text-left hover:underline flex items-center gap-1"
                        >
                          <span>→</span>
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Advertencia Metodológica */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Principio Athletic IA: DOCUMENTADO ≠ EJECUTADO_CONFIRMADO · Cero invención.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
