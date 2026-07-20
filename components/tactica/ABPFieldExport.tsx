'use client';

import React from 'react';
import { Player, ABPPlayerRole, ABPType } from '@/types';
import { ABPPlayerNode } from './ABPPlayerNode';
import { normalizeRoleName } from '@/lib/abpUtils';

interface ABPFieldExportProps {
  playRoles: (ABPPlayerRole & { player?: Player })[];
  playType: ABPType;
  playZona?: string | null;
}

const ROLE_ABBRS: Record<string, string> = {
  'Lanzador': 'LAN',
  'Sacador': 'SAC',
  'Rematador': 'REM',
  'Bloqueador': 'BLOQ',
  'Arrastrador': 'ARR',
  'Rechace': 'RECH',
  'Cierre': 'CIER',
  'Primer palo': 'P.PALO',
  'Segundo palo': 'S.PALO',
  '1º palo': '1ºPALO',
  '2º palo': '2ºPALO',
  'Barrera': 'BARR',
  'Vigilancia': 'VIG',
  'Defensa zona': 'D.ZONA',
  'Marca individual': 'M.INDIV',
  'Libre': 'LIB',
  'Apoyo': 'APOYO',
  'Receptor': 'REC',
  'Cambio de orientación': 'C.ORI',
  'Profundidad': 'PROF',
  'Cobertura': 'COB'
};

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
      className="relative w-[1200px] h-[900px] bg-emerald-950 rounded-[1rem] border-4 border-emerald-500 overflow-hidden"
    >
      {/* SVG Pitch */}
      {(() => {
        if (view === 'full') {
          return (
            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <rect x="15" y="15" width="370" height="270" fill="none" stroke="#fff" strokeWidth="2.5" />
              <line x1="200" y1="15" x2="200" y2="285" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="150" r="45" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="150" r="3" fill="#fff" />
              <rect x="15" y="65" width="60" height="170" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="15" y="105" width="22" height="90" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="55" cy="150" r="2.5" fill="#fff" />
              <path d="M 75 115 A 40 40 0 0 1 75 185" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="7" y="115" width="8" height="70" fill="none" stroke="#fff" strokeWidth="3" />
              <rect x="325" y="65" width="60" height="170" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="363" y="105" width="22" height="90" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="345" cy="150" r="2.5" fill="#fff" />
              <path d="M 325 115 A 40 40 0 0 0 325 185" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="385" y="115" width="8" height="70" fill="none" stroke="#fff" strokeWidth="3" />
            </svg>
          );
        } else if (view === 'midfield') {
          return (
            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <rect x="15" y="15" width="370" height="270" fill="none" stroke="#fff" strokeWidth="2.5" />
              <line x1="200" y1="15" x2="200" y2="285" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="150" r="45" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="150" r="3" fill="#fff" />
              <text x="200" y="260" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">ZONA MEDIA (MEDIO CAMPO)</text>
            </svg>
          );
        } else if (view === 'defense') {
          return (
            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <rect x="0" y="0" width="400" height="300" fill="none" stroke="#fff" strokeWidth="2.5" />
              <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="3" />
              <path d="M 400 10 A 10 10 0 0 0 390 0" fill="none" stroke="#fff" strokeWidth="3" />
              <rect x="75" y="0" width="250" height="110" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="140" y="0" width="120" height="40" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="80" r="3" fill="#fff" />
              <path d="M 150 110 A 60 60 0 0 0 250 110" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="165" y="-6" width="70" height="6" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="200" y="140" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">ÁREA PROPIA (DEFENSA)</text>
            </svg>
          );
        } else {
          return (
            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <rect x="0" y="0" width="400" height="300" fill="none" stroke="#fff" strokeWidth="2.5" />
              <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="3" />
              <path d="M 400 10 A 10 10 0 0 0 390 0" fill="none" stroke="#fff" strokeWidth="3" />
              <rect x="75" y="0" width="250" height="110" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="140" y="0" width="120" height="40" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="200" cy="80" r="3" fill="#fff" />
              <path d="M 150 110 A 60 60 0 0 0 250 110" fill="none" stroke="#fff" strokeWidth="2.5" />
              <rect x="165" y="-6" width="70" height="6" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="200" y="140" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" opacity="0.6">ÁREA RIVAL (ATAQUE)</text>
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
        const roleLabel = role.etiqueta || (isRealPosType ? POSITION_ABBRS[rName] : ROLE_ABBRS[rName]) || rName.substring(0, 4).toUpperCase();

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
