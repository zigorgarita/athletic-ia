'use client';

/**
 * ABPPlayerNode.tsx
 * Componente compartido que renderiza un token de jugador en la pizarra ABP.
 * Se usa tanto en el editor interactivo como en la exportación PDF (html2canvas).
 *
 * - isExport=false (editor): dimensiones responsivas, muestra el selector ↑↓←→
 * - isExport=true  (PDF):    dimensiones fijas en px para alta resolución, sin selector
 *
 * En ambos casos: nombre del jugador dentro del círculo, rol fuera en la posición elegida.
 */

import React from 'react';
import { Player, ABPPlayerRole } from '@/types';

export type LabelPosition = 'top' | 'bottom' | 'left' | 'right';

interface ABPPlayerNodeProps {
  role: ABPPlayerRole & { player?: Player };
  roleLabel: string;     // abreviatura o etiqueta del rol
  isExport?: boolean;    // true → tamaño fijo para PDF
  /** Solo en editor (isExport=false): callback para cambiar posición de etiqueta */
  onChangeLabelPosition?: (pos: LabelPosition) => void;
}

// ─── Selector ↑↓←→ (solo en editor) ──────────────────────────────────────────

function LabelPositionSelector({
  current,
  onChange,
}: {
  current: LabelPosition;
  onChange: (pos: LabelPosition) => void;
}) {
  const options: { pos: LabelPosition; label: string; title: string }[] = [
    { pos: 'top',    label: '↑', title: 'Rol arriba' },
    { pos: 'bottom', label: '↓', title: 'Rol abajo' },
    { pos: 'left',   label: '←', title: 'Rol izquierda' },
    { pos: 'right',  label: '→', title: 'Rol derecha' },
  ];

  return (
    <div
      className="no-export flex gap-0.5 mt-1"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map(({ pos, label, title }) => (
        <button
          key={pos}
          type="button"
          title={title}
          onClick={() => onChange(pos)}
          className={`w-5 h-5 rounded text-[10px] font-black transition-all flex items-center justify-center ${
            current === pos
              ? 'bg-[#CC0E21] text-white'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ABPPlayerNode({
  role,
  roleLabel,
  isExport = false,
  onChangeLabelPosition,
}: ABPPlayerNodeProps) {
  const player = role.player;
  const labelPos: LabelPosition = (role.label_position as LabelPosition) ?? 'bottom';

  // Nombre del jugador (primer nombre) o abreviatura si no hay jugador
  const circleContent = player
    ? player.nombre.split(' ')[0]
    : roleLabel;

  const hasPlayer = !!player;

  if (isExport) {
    // ── EXPORT MODE: tamaños fijos en px, sin selector ──────────────────────
    const CIRCLE_PX = 80;
    const GAP = 12;                     // separación círculo ↔ badge (equivale a mt-1.5 × escala 2×)
    const OFFSET = CIRCLE_PX + GAP;    // 92px — empieza FUERA del círculo, igual que top-full en editor

    const badgePosStyle: React.CSSProperties = (() => {
      switch (labelPos) {
        case 'top':    return { position: 'absolute', bottom: `${OFFSET}px`, left: '50%', transform: 'translateX(-50%)' };
        case 'bottom': return { position: 'absolute', top:    `${OFFSET}px`, left: '50%', transform: 'translateX(-50%)' };
        case 'left':   return { position: 'absolute', right:  `${OFFSET}px`, top:  '50%', transform: 'translateY(-50%)' };
        case 'right':  return { position: 'absolute', left:   `${OFFSET}px`, top:  '50%', transform: 'translateY(-50%)' };
      }
    })();

    return (
      <div
        style={{
          position: 'relative',
          width: `${CIRCLE_PX}px`,
          height: `${CIRCLE_PX}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Círculo */}
        <div
          style={{
            width: `${CIRCLE_PX}px`,
            height: `${CIRCLE_PX}px`,
            borderRadius: '50%',
            border: hasPlayer ? '4px solid #CC0E21' : '4px solid #475569',
            backgroundColor: hasPlayer ? '#0f172a' : 'rgba(30, 41, 59, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <span
            style={{
              fontSize: hasPlayer ? '16px' : '20px',
              fontWeight: 900,
              color: hasPlayer ? '#f1f5f9' : '#94a3b8',
              textAlign: 'center',
              lineHeight: 1.1,
              padding: '0 4px',
              wordBreak: 'break-word',
              maxWidth: '72px',
            }}
          >
            {circleContent}
          </span>
        </div>

        {/* Badge de rol fuera del círculo — solo si hay jugador asignado */}
        {hasPlayer && (
          <div
            style={{
              ...badgePosStyle,
              backgroundColor: '#0f172a',
              border: '2px solid rgba(204, 14, 33, 0.9)',
              borderRadius: '6px',
              padding: '0 10px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 900,
              color: '#CC0E21',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              zIndex: 20,
            }}
          >
            {roleLabel}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR MODE: tamaños responsivos con Tailwind, con selector ──────────

  // Clases CSS según posición (editor usa Tailwind, misma lógica visual)
  const badgeClasses = (() => {
    const base = 'absolute bg-slate-950/95 border border-[#CC0E21]/80 px-2 py-0.5 rounded text-[8px] font-black text-[#CC0E21] whitespace-nowrap shadow-md z-20';
    switch (labelPos) {
      case 'top':    return `${base} bottom-full mb-1.5 left-1/2 -translate-x-1/2`;
      case 'bottom': return `${base} top-full mt-1.5 left-1/2 -translate-x-1/2`;
      case 'left':   return `${base} right-full mr-1.5 top-1/2 -translate-y-1/2`;
      case 'right':  return `${base} left-full ml-1.5 top-1/2 -translate-y-1/2`;
    }
  })();

  return (
    <div className="flex flex-col items-center">
      {/* Círculo + badge de rol posicionado absolutamente */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
            hasPlayer
              ? 'border-[#CC0E21] bg-slate-950'
              : 'border-slate-600/80 border-dashed bg-slate-900/90'
          }`}
        >
          <span
            className={`font-black text-center leading-tight ${
              hasPlayer ? 'text-[9px] text-slate-100' : 'text-[9px] text-slate-400'
            }`}
            style={{ maxWidth: '36px', wordBreak: 'break-word' }}
          >
            {circleContent}
          </span>
        </div>

        {/* Badge rol fuera del círculo — solo si hay jugador */}
        {hasPlayer && (
          <div className={badgeClasses}>
            {roleLabel}
          </div>
        )}
      </div>

      {/* Selector ↑↓←→ solo en modo editor */}
      {onChangeLabelPosition && (
        <LabelPositionSelector
          current={labelPos}
          onChange={onChangeLabelPosition}
        />
      )}
    </div>
  );
}
