'use client';

import React from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import type { PlanningTaskLibrary } from '@/types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de firma de duplicados
// ──────────────────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function roundMinutes(min: number): number {
  return Math.round(min / 5) * 5;
}

export function buildDuplicateSignature(nombre: string, tipo: string, minutos: number): string {
  return `${normalize(nombre)}|${normalize(tipo)}|${roundMinutes(minutos)}`;
}

export interface DuplicateMatch {
  type: 'exact' | 'variant';
  task: PlanningTaskLibrary;
}

export function detectDuplicate(
  nombre: string,
  tipo: string,
  minutos: number,
  existingTasks: PlanningTaskLibrary[]
): DuplicateMatch | null {
  const newSig = buildDuplicateSignature(nombre, tipo, minutos);

  for (const task of existingTasks) {
    const existingSig = buildDuplicateSignature(
      task.nombre,
      task.tipo_tarea,
      task.minutos_defecto
    );
    // Firma exacta
    if (newSig === existingSig) {
      return { type: 'exact', task };
    }
    // Posible variante: mismo tipo + duración similar (±10 min) pero nombre diferente
    const sameTipo = normalize(tipo) === normalize(task.tipo_tarea);
    const minutesDiff = Math.abs(minutos - task.minutos_defecto);
    const nombreSimilar =
      normalize(nombre).includes(normalize(task.nombre).split(' ')[0]) ||
      normalize(task.nombre).includes(normalize(nombre).split(' ')[0]);
    if (sameTipo && minutesDiff <= 10 && nombreSimilar) {
      return { type: 'variant', task };
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente de alerta de duplicado
// ──────────────────────────────────────────────────────────────────────────────
interface LibraryDuplicateAlertProps {
  match: DuplicateMatch;
  onIgnore: () => void;
  onView: (task: PlanningTaskLibrary) => void;
}

export function LibraryDuplicateAlert({ match, onIgnore, onView }: LibraryDuplicateAlertProps) {
  const isExact = match.type === 'exact';

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${
      isExact
        ? 'bg-red-950/20 border-red-800/40'
        : 'bg-amber-950/20 border-amber-800/30'
    }`}>
      <div className={`flex items-start gap-2 text-xs font-bold ${
        isExact ? 'text-red-400' : 'text-amber-400'
      }`}>
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="uppercase tracking-wider text-[10px] font-black">
          {isExact ? 'posible duplicado' : 'posible variante'}
        </span>
      </div>
      <div className="pl-6 space-y-1">
        <p className="text-[10px] text-slate-300 font-semibold truncate">
          &ldquo;{match.task.nombre}&rdquo;
        </p>
        <p className="text-[9px] text-slate-500">
          {match.task.tipo_tarea} · {match.task.minutos_defecto} min ·{' '}
          {match.task.creado_por}
        </p>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <button
          type="button"
          onClick={() => onView(match.task)}
          className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Eye className="h-3 w-3" />
          Ver tarea existente
        </button>
        <span className="text-slate-700">·</span>
        <button
          type="button"
          onClick={onIgnore}
          className="text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors underline"
        >
          Ignorar y guardar de todas formas
        </button>
      </div>
    </div>
  );
}
