'use client';

import React from 'react';
import { Player, ABPPlayerRole, ABPType } from '@/types';
import { ABPPlayerNode } from './ABPPlayerNode';
import { normalizeRoleName, normalizeRoleLabel, ROLE_ABBRS } from '@/lib/abpUtils';

interface ABPFieldExportProps {
  playRoles: (ABPPlayerRole & { player?: Player })[];
  playType: ABPType;
  playZona?: string | null;
}



const POSITION_ABBRS: Record<string, string> = {
  'Portero': 'POR',
  'Lateral derecho': 'LD',
  'Central derecho': 'CD',
  'Central izquierdo': 'CI',
  'Central central': 'CC',
  'Lateral izquierdo': 'LI',
  'Pivote': 'PIV',
  'Pivote derecho': 'PVD',
  'Pivote izquierdo': 'PVI',
  'Interior derecho': 'ID',
  'Interior izquierdo': 'II',
  'Media punta': 'MP',
  'Extremo derecho': 'ED',
  'Extremo izquierdo': 'EI',
  'Delantero centro': 'DC'
};

const isRealPositionPlayType = (type: ABPType): boolean => {
  return (
    type === 'Saque de banda ofensivo' ||
    type === 'Saque de banda defensivo' ||
    type === 'Saque de medio ofensivo' ||
    type === 'Saque de medio defensivo' ||
    type === 'Saque inicial'
  );
};

const getFieldView = (type: ABPType, zona?: string | null): 'full' | 'attack' | 'defense' | 'midfield' => {
  if (type === 'Saque inicial' || type === 'Saque de medio ofensivo' || type === 'Saque de medio defensivo') {
    return 'full';
  }
  if (type === 'Saque de banda ofensivo') {
    if (zona === 'Inicio') return 'defense';
    if (zona === 'Medio') return 'midfield';
    return 'attack';
  }
  if (type === 'Saque de banda defensivo') {
    if (zona === 'Inicio') return 'attack';
    if (zona === 'Medio') return 'midfield';
    return 'defense';
  }
  const lower = type.toLowerCase();
  if (lower.includes('defensivo') || lower.includes('defensiva')) return 'defense';
  return 'attack';
};

export function ABPFieldExport({ playRoles, playType, playZona }: ABPFieldExportProps) {
  const view = getFieldView(playType, playZona);

  return (
    <div
      className="relative w-[1200px] h-[900px] bg-[#F0FDF4] rounded-[1rem] border-4 border-emerald-600 overflow-hidden"
    >
      {/* SVG Pitch */}
      {(() => {
        if (view === 'full') {
          return (
            <svg viewBox="0 0 507 535" className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
              <rect x="20" y="20" width="467" height="495" rx="12" fill="none" stroke="#166534" strokeWidth="2.5" />
              <line x1="20" y1="267.5" x2="487" y2="267.5" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="267.5" r="60" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="267.5" r="3.5" fill="#166534" />
              {/* Área Superior */}
              <rect x="135" y="20" width="237" height="90" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="188.5" y="20" width="130" height="30" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="75" r="3" fill="#166534" />
              <path d="M 203.5 110 A 50 50 0 0 0 303.5 110" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="218.5" y="10" width="70" height="10" fill="none" stroke="#166534" strokeWidth="3" />
              {/* Área Inferior */}
              <rect x="135" y="425" width="237" height="90" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="188.5" y="485" width="130" height="30" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="460" r="3" fill="#166534" />
              <path d="M 203.5 425 A 50 50 0 0 1 303.5 425" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="218.5" y="515" width="70" height="10" fill="none" stroke="#166534" strokeWidth="3" />
            </svg>
          );
        } else if (view === 'midfield') {
          return (
            <svg viewBox="0 0 507 535" className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
              <rect x="20" y="20" width="467" height="495" rx="12" fill="none" stroke="#166534" strokeWidth="2.5" />
              <line x1="20" y1="267.5" x2="487" y2="267.5" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="267.5" r="60" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="267.5" r="3.5" fill="#166534" />
              <text x="253.5" y="440" fill="#166534" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.85">ZONA MEDIA (MEDIO CAMPO)</text>
            </svg>
          );
        } else if (view === 'defense') {
          return (
            <svg viewBox="0 0 507 535" className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
              <rect x="20" y="20" width="467" height="495" rx="12" fill="none" stroke="#166534" strokeWidth="2.5" />
              <path d="M 20 38 A 18 18 0 0 1 38 20" fill="none" stroke="#166534" strokeWidth="2.5" />
              <path d="M 487 38 A 18 18 0 0 0 469 20" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="210" y="10" width="87" height="10" fill="none" stroke="#166534" strokeWidth="3" />
              <rect x="178.5" y="20" width="150" height="55" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="96" y="20" width="315" height="155" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="120" r="3.5" fill="#166534" />
              <path d="M 196 175 A 60 60 0 0 0 311 175" fill="none" stroke="#166534" strokeWidth="2.5" />
              <text x="253.5" y="225" fill="#166534" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.85">ÁREA PROPIA (DEFENSA)</text>
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 507 535" className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
              <rect x="20" y="20" width="467" height="495" rx="12" fill="none" stroke="#166534" strokeWidth="2.5" />
              <path d="M 20 38 A 18 18 0 0 1 38 20" fill="none" stroke="#166534" strokeWidth="2.5" />
              <path d="M 487 38 A 18 18 0 0 0 469 20" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="210" y="10" width="87" height="10" fill="none" stroke="#166534" strokeWidth="3" />
              <rect x="178.5" y="20" width="150" height="55" fill="none" stroke="#166534" strokeWidth="2.5" />
              <rect x="96" y="20" width="315" height="155" fill="none" stroke="#166534" strokeWidth="2.5" />
              <circle cx="253.5" cy="120" r="3.5" fill="#166534" />
              <path d="M 196 175 A 60 60 0 0 0 311 175" fill="none" stroke="#166534" strokeWidth="2.5" />
              <text x="253.5" y="225" fill="#166534" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.85">ÁREA RIVAL (ATAQUE)</text>
            </svg>
          );
        }
      })()}

      {/* Tokens — usa ABPPlayerNode en modo export (idéntico al editor, tamaño fijo) */}
      {playRoles.map((role) => {
        const isRealPosType = isRealPositionPlayType(playType);
        const px = role.posicion_x !== null ? role.posicion_x : 50;
        const py = role.posicion_y !== null ? role.posicion_y : 50;

        const rName = normalizeRoleName(role.rol_asignado);
        const roleLabel = normalizeRoleLabel(role.etiqueta) || (isRealPosType ? POSITION_ABBRS[rName] : ROLE_ABBRS[rName]) || rName.substring(0, 4).toUpperCase();

        return (
          <div
            key={role.id}
            style={{
              position: 'absolute',
              left: `${px}%`,
              top: `${py}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ABPPlayerNode
              role={role}
              roleLabel={roleLabel}
              isExport={true}
            />
          </div>
        );
      })}
    </div>
  );
}
