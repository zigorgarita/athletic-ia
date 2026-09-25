'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Zap, HelpCircle, Users, Clock, Maximize2, Target, List, ArrowRight, Shuffle, X } from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import type { PdfAnalysisResult, PdfTaskDraft, GrupoJugadores, FieldConfianza } from '@/app/api/planificacion/analyze-pdf/route';

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS DE CONFIANZA
// ──────────────────────────────────────────────────────────────────────────────
interface ConfidenceBadgeProps {
  confianza: FieldConfianza;
}

function ConfidenceBadge({ confianza }: ConfidenceBadgeProps) {
  if (confianza === 'alta') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Detectado
      </span>
    );
  }
  if (confianza === 'media') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25">
        <Zap className="h-2.5 w-2.5" />
        Interpretado
      </span>
    );
  }
  if (confianza === 'baja') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <Sparkles className="h-2.5 w-2.5" />
        Sugerido IA
      </span>
    );
  }
  // no_detectado
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
      <HelpCircle className="h-2.5 w-2.5" />
      Revisión necesaria
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FILA DE CAMPO DETECTADO
// ──────────────────────────────────────────────────────────────────────────────
interface FieldRowProps {
  label: string;
  icon: React.ReactNode;
  value: string | string[] | null;
  confianza: FieldConfianza;
  isArray?: boolean;
  alwaysSuggested?: boolean; // para conceptos_sugeridos
}

function FieldRow({ label, icon, value, confianza, isArray = false, alwaysSuggested = false }: FieldRowProps) {
  const effectiveConfianza: FieldConfianza = alwaysSuggested ? 'baja' : confianza;
  const isNotDetected = value === null || (Array.isArray(value) && value.length === 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
          {icon}
          {label}
        </div>
        <ConfidenceBadge confianza={isNotDetected ? 'no_detectado' : effectiveConfianza} />
      </div>
      {isNotDetected ? (
        <p className="text-[10px] text-slate-600 italic pl-1">—</p>
      ) : isArray && Array.isArray(value) ? (
        <ul className="space-y-0.5 pl-1">
          {(value as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300 leading-snug">
              <span className="text-slate-600 mt-0.5 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-slate-200 leading-relaxed pl-1 whitespace-pre-line">{value as string}</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TARJETA DE TAREA DETECTADA
// ──────────────────────────────────────────────────────────────────────────────
const GRUPO_COLORS: Record<string, string> = {
  rojo: 'bg-red-500/20 text-red-300 border-red-500/30',
  verde: 'bg-green-500/20 text-green-300 border-green-500/30',
  amarillo: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  azul: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  neutro: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
};

interface TaskCardProps {
  tarea: PdfTaskDraft;
  globalGroups: GrupoJugadores[];
}

function TaskCard({ tarea, globalGroups }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const nombre = tarea.nombre.valor ?? `Tarea ${tarea.numero_tarea}`;
  const tipoLabel = tarea.tipo_tarea.valor ?? '—';

  // Grupos que pertenecen a esta tarea (si vienen etiquetados con el nº)
  const taskGroups = globalGroups.filter(g =>
    g.nombre.toLowerCase().includes(`tarea ${tarea.numero_tarea}`) ||
    !g.nombre.toLowerCase().includes('tarea')
  );
  const showGroups = tarea.numero_tarea === 1 && taskGroups.length > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Cabecera de tarjeta */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="space-y-1 flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0">
              TAREA {tarea.numero_tarea}
            </span>
            <span className="text-[9px] font-bold text-slate-600">·</span>
            <ConfidenceBadge confianza={tarea.tipo_tarea.valor ? tarea.tipo_tarea.confianza : 'no_detectado'} />
            <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
              {tipoLabel}
            </span>
          </div>
          <h4 className="text-sm font-black text-slate-100 leading-snug">
            {nombre}
          </h4>
          {/* Resumen rápido de métricas */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            {tarea.duracion_minutos.valor && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                {tarea.duracion_minutos.valor}
                {tarea.duracion_minutos.confianza !== 'alta' && (
                  <ConfidenceBadge confianza={tarea.duracion_minutos.confianza} />
                )}
              </span>
            )}
            {tarea.num_jugadores.valor && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Users className="h-3 w-3 text-slate-500 shrink-0" />
                {tarea.num_jugadores.valor}
                {tarea.num_jugadores.confianza !== 'alta' && (
                  <ConfidenceBadge confianza={tarea.num_jugadores.confianza} />
                )}
              </span>
            )}
            {tarea.espacio.valor && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Maximize2 className="h-3 w-3 text-slate-500 shrink-0" />
                {tarea.espacio.valor}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 mt-1 text-slate-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Cuerpo expandido */}
      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          {/* Objetivo */}
          <FieldRow
            label="Objetivo"
            icon={<Target className="h-3 w-3" />}
            value={tarea.objetivo.valor}
            confianza={tarea.objetivo.confianza}
          />

          {/* Organización */}
          <FieldRow
            label="Organización"
            icon={<Users className="h-3 w-3" />}
            value={tarea.organizacion.valor}
            confianza={tarea.organizacion.confianza}
          />

          {/* Grupos de jugadores (solo Tarea 1 desde portada) */}
          {showGroups && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                <Users className="h-3 w-3" />
                Grupos (portada)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {taskGroups.map((grupo, gi) => {
                  const colorClass = GRUPO_COLORS[grupo.color] ?? GRUPO_COLORS['neutro'];
                  return (
                    <div
                      key={gi}
                      className={`rounded-lg border px-3 py-2 text-xs ${colorClass}`}
                    >
                      <p className="font-black text-[10px] uppercase tracking-wider mb-1">{grupo.nombre}</p>
                      <p className="font-medium leading-relaxed opacity-80">{grupo.jugadores.join(' · ')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desarrollo */}
          <FieldRow
            label="Desarrollo"
            icon={<List className="h-3 w-3" />}
            value={tarea.desarrollo.valor}
            confianza={tarea.desarrollo.confianza}
          />

          {/* Consignas */}
          <FieldRow
            label="Consignas"
            icon={<CheckCircle2 className="h-3 w-3" />}
            value={tarea.consignas.valor}
            confianza={tarea.consignas.confianza}
            isArray
          />

          {/* Transiciones */}
          {(tarea.transicion_tras_recuperacion.valor || tarea.transicion_tras_perdida.valor) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                <Shuffle className="h-3 w-3" />
                Transiciones
              </div>
              <div className="grid grid-cols-1 gap-2">
                {tarea.transicion_tras_recuperacion.valor && (
                  <div className="rounded-lg bg-slate-950/50 border border-emerald-900/30 px-3 py-2 space-y-0.5">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                      <ArrowRight className="h-2.5 w-2.5" /> Tras recuperación
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-line">
                      {tarea.transicion_tras_recuperacion.valor}
                    </p>
                  </div>
                )}
                {tarea.transicion_tras_perdida.valor && (
                  <div className="rounded-lg bg-slate-950/50 border border-red-900/30 px-3 py-2 space-y-0.5">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <ArrowRight className="h-2.5 w-2.5 rotate-180" /> Tras pérdida
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-line">
                      {tarea.transicion_tras_perdida.valor}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conceptos sugeridos — siempre baja confianza, etiqueta explícita */}
          {tarea.conceptos_sugeridos.valor && tarea.conceptos_sugeridos.valor.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  Conceptos tácticos
                </div>
                <ConfidenceBadge confianza="baja" />
              </div>
              <p className="text-[9px] text-amber-500/70 italic">
                Sugerencia automática — no validada. Revisar antes de usar.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tarea.conceptos_sugeridos.valor.map((c, ci) => (
                  <span
                    key={ci}
                    className="text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────
interface PdfSessionAnalyzerProps {
  pdfUrl: string;
  sessionId?: string;
}

export function PdfSessionAnalyzer({ pdfUrl, sessionId }: PdfSessionAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PdfAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!pdfUrl || dismissed) return null;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const passkey = getStaffPasskey();
      if (passkey) headers['x-staff-passkey'] = passkey;

      const res = await fetch('/api/planificacion/analyze-pdf', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ pdf_url: pdfUrl, session_id: sessionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setResult(data as PdfAnalysisResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido al analizar el PDF.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="pt-4 border-t border-slate-800 space-y-3">
      {/* Cabecera de sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Análisis de Sesión desde PDF
          </h4>
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Prototipo
          </span>
        </div>
        {result && (
          <button
            type="button"
            onClick={() => { setResult(null); setDismissed(false); }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Cerrar análisis"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Estado inicial: botón analizar */}
      {!result && !error && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Athletic IA intentará desglosar el PDF de esta sesión en tareas estructuradas. El análisis es únicamente visual — no se guardará ningún dato.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                analyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
              }`}
            >
              {analyzing ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                  Analizando PDF...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Analizar PDF con IA
                </>
              )}
            </button>
            {analyzing && (
              <span className="text-[9px] text-slate-500 italic">
                Esto puede tardar 10-30 segundos.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 space-y-2">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Error al analizar el PDF
          </div>
          <p className="text-[10px] text-red-300/80 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[9px] text-slate-500 hover:text-slate-300 underline"
          >
            Volver a intentar
          </button>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Banner informativo */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                Borrador — solo lectura
              </p>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Este desglose es generado por IA a partir del PDF. No se ha modificado ningún dato de la sesión. Valida cada campo antes de cualquier uso.
              </p>
            </div>
          </div>

          {/* Metadata de sesión */}
          {result.titulo_sesion && (
            <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Título detectado</p>
              <p className="text-xs font-bold text-slate-200">{result.titulo_sesion}</p>
            </div>
          )}

          {/* Grupos globales (portada) */}
          {result.grupos_globales.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                <Users className="h-3 w-3" />
                Grupos de portada
              </div>
              <div className="grid grid-cols-1 gap-2">
                {result.grupos_globales.map((grupo, gi) => {
                  const colorClass = GRUPO_COLORS[grupo.color] ?? GRUPO_COLORS['neutro'];
                  return (
                    <div key={gi} className={`rounded-lg border px-3 py-2 text-xs ${colorClass}`}>
                      <p className="font-black text-[10px] uppercase tracking-wider mb-1">{grupo.nombre}</p>
                      <p className="font-medium leading-relaxed opacity-80">{grupo.jugadores.join(' · ')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leyenda de confianza */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-wider">Confianza:</span>
            <ConfidenceBadge confianza="alta" />
            <ConfidenceBadge confianza="media" />
            <ConfidenceBadge confianza="baja" />
            <ConfidenceBadge confianza="no_detectado" />
          </div>

          {/* Tareas detectadas */}
          <div className="space-y-3">
            {result.tareas.map(tarea => (
              <TaskCard
                key={tarea.numero_tarea}
                tarea={tarea}
                globalGroups={result.grupos_globales}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="pt-1 pb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors underline"
            >
              Cerrar y ocultar análisis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
