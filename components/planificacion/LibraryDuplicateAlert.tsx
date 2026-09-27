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

export type DuplicateLocation = 'activa' | 'borrador';

export interface DuplicateMatch {
  type: 'exact_name' | 'exact_signature' | 'variant';
  location: DuplicateLocation;
  task: PlanningTaskLibrary;
}

export function detectDuplicate(
  nombre: string,
  tipo: string,
  minutos: number,
  existingTasks: PlanningTaskLibrary[]
): DuplicateMatch | null {
  const normName = normalize(nombre);
  if (!normName) return null;

  // 1. Prioridad absoluta: Coincidencia exacta de nombre normalizado (Constraint UNIQUE de DB)
  for (const task of existingTasks) {
    if (normalize(task.nombre) === normName) {
      const location: DuplicateLocation = task.aprobada === false ? 'borrador' : 'activa';
      return { type: 'exact_name', location, task };
    }
  }

  // 2. Coincidencia por firma completa o variante
  const newSig = buildDuplicateSignature(nombre, tipo, minutos);

  for (const task of existingTasks) {
    const taskMin = task.minutos_defecto ?? 0;
    const existingSig = buildDuplicateSignature(
      task.nombre,
      task.tipo_tarea,
      taskMin
    );
    // Firma exacta (mismo tipo + duración)
    if (newSig === existingSig) {
      const location: DuplicateLocation = task.aprobada === false ? 'borrador' : 'activa';
      return { type: 'exact_signature', location, task };
    }
    // Posible variante: mismo tipo + duración similar (±10 min) pero nombre diferente
    const sameTipo = normalize(tipo) === normalize(task.tipo_tarea);
    const minutesDiff = Math.abs(minutos - taskMin);
    const nombreSimilar =
      normName.includes(normalize(task.nombre).split(' ')[0]) ||
      normalize(task.nombre).includes(normName.split(' ')[0]);
    if (sameTipo && minutesDiff <= 10 && nombreSimilar) {
      const location: DuplicateLocation = task.aprobada === false ? 'borrador' : 'activa';
      return { type: 'variant', location, task };
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
  const isExactName = match.type === 'exact_name';
  const isExactSignature = match.type === 'exact_signature';
  const isExact = isExactName || isExactSignature;
  const isDraft = match.location === 'borrador';

  const badgeText = isExactName
    ? isDraft
      ? 'Ya existe como Borrador PDF · Staff'
      : 'Ya existe en Biblioteca Activa'
    : isExactSignature
      ? 'Firma idéntica en biblioteca'
      : 'Posible variante detectada';

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${
      isExact
        ? 'bg-red-950/25 border-red-800/50'
        : 'bg-amber-950/20 border-amber-800/30'
    }`}>
      <div className={`flex items-start gap-2 text-xs font-bold ${
        isExact ? 'text-red-400' : 'text-amber-400'
      }`}>
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="uppercase tracking-wider text-[10px] font-black">
            {badgeText}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            isDraft
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {isDraft ? 'Borrador PDF' : 'Biblioteca Activa'}
          </span>
        </div>
      </div>

      <div className="pl-6 space-y-1">
        <p className="text-[10px] text-slate-200 font-bold truncate">
          &ldquo;{match.task.nombre}&rdquo;
        </p>
        <p className="text-[9px] text-slate-400">
          {match.task.tipo_tarea} · {match.task.minutos_defecto ?? '—'} min ·{' '}
          {match.task.creado_por || 'Staff'}
        </p>
        {isExactName && (
          <p className="text-[9px] text-red-400 font-semibold pt-0.5">
            ⚠️ No se puede registrar dos veces con el mismo nombre. Modifica el nombre si deseas guardar una versión distinta.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pl-6 pt-0.5">
        <button
          type="button"
          onClick={() => onView(match.task)}
          className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-300 hover:text-white transition-colors bg-slate-800/80 px-2 py-1 rounded border border-slate-700"
        >
          <Eye className="h-3 w-3" />
          {isDraft ? 'Ver borrador existente' : 'Ver tarea existente'}
        </button>

        {/* Si el nombre es idéntico, está prohibido ignorar para no violar la constraint UNIQUE de la DB */}
        {!isExactName && (
          <>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={onIgnore}
              className="text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors underline"
            >
              Ignorar y guardar de todas formas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
