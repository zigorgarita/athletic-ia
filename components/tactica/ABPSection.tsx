'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, ABPPlay, ABPPlayerRole, ABPType, Match, MatchABPPlan, MatchABPPlayerAssignment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Film, Plus, AlertCircle, Trash2, BookOpen, Layers, X, 
  Save, RefreshCw, Copy, Edit2, 
  PlusCircle, Check, ChevronDown, FolderOpen, FileDown, Calendar
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { exportToPDF, buildABPFilename } from '@/lib/exportPdf';
import { ABPFieldExport } from './ABPFieldExport';
import { ABPPlanPartido } from './ABPPlanPartido';
import { ABPPlayerNode, LabelPosition } from './ABPPlayerNode';

const normalizeRoleName = (role: string): string => {
  if (!role) return role;
  if (role === 'Primer palo') return '1º palo';
  if (role === 'Segundo palo') return '2º palo';
  return role;
};

interface ABPSectionProps {
  players: Player[];
  matches?: Match[];
}

const ABP_TYPES: ABPType[] = [
  'Córner ofensivo',
  'Falta frontal ofensiva',
  'Falta lateral ofensiva',
  'Saque de banda ofensivo',
  'Saque de medio ofensivo',
  'Penalti ofensivo',
  'Jugada especial ofensiva',
  'Córner defensivo',
  'Falta frontal defensiva',
  'Falta lateral defensiva',
  'Saque de banda defensivo',
  'Saque de medio defensivo',
  'Penalti defensivo',
  'Jugada especial defensiva',
  'Saque inicial'
];

// Mapeo de abreviaturas para la ficha en la pizarra
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

const SISTEMAS_TACTICOS = {
  '1-4-3-3': [
    { role: 'Portero', label: 'POR', x: 50, y: 88 },
    { role: 'Lateral derecho', label: 'LD', x: 15, y: 68 },
    { role: 'Central derecho', label: 'CD', x: 62, y: 74 },
    { role: 'Central izquierdo', label: 'CI', x: 38, y: 74 },
    { role: 'Lateral izquierdo', label: 'LI', x: 85, y: 68 },
    { role: 'Pivote', label: 'PIV', x: 50, y: 55 },
    { role: 'Interior derecho', label: 'ID', x: 70, y: 44 },
    { role: 'Interior izquierdo', label: 'II', x: 30, y: 44 },
    { role: 'Extremo derecho', label: 'ED', x: 18, y: 22 },
    { role: 'Extremo izquierdo', label: 'EI', x: 82, y: 22 },
    { role: 'Delantero centro', label: 'DC', x: 50, y: 15 }
  ],
  '1-4-2-3-1': [
    { role: 'Portero', label: 'POR', x: 50, y: 88 },
    { role: 'Lateral derecho', label: 'LD', x: 15, y: 68 },
    { role: 'Central derecho', label: 'CD', x: 62, y: 74 },
    { role: 'Central izquierdo', label: 'CI', x: 38, y: 74 },
    { role: 'Lateral izquierdo', label: 'LI', x: 85, y: 68 },
    { role: 'Pivote derecho', label: 'PVD', x: 64, y: 58 },
    { role: 'Pivote izquierdo', label: 'PVI', x: 36, y: 58 },
    { role: 'Media punta', label: 'MP', x: 50, y: 40 },
    { role: 'Extremo derecho', label: 'ED', x: 18, y: 30 },
    { role: 'Extremo izquierdo', label: 'EI', x: 82, y: 30 },
    { role: 'Delantero centro', label: 'DC', x: 50, y: 16 }
  ],
  '1-4-4-2': [
    { role: 'Portero', label: 'POR', x: 50, y: 88 },
    { role: 'Lateral derecho', label: 'LD', x: 15, y: 68 },
    { role: 'Central derecho', label: 'CD', x: 62, y: 74 },
    { role: 'Central izquierdo', label: 'CI', x: 38, y: 74 },
    { role: 'Lateral izquierdo', label: 'LI', x: 85, y: 68 },
    { role: 'Interior derecho', label: 'ID', x: 64, y: 50 },
    { role: 'Interior izquierdo', label: 'II', x: 36, y: 50 },
    { role: 'Extremo derecho', label: 'ED', x: 15, y: 40 },
    { role: 'Extremo izquierdo', label: 'EI', x: 85, y: 40 },
    { role: 'Delantero centro', label: 'DC', x: 38, y: 18 },
    { role: 'Delantero centro', label: 'DC', x: 62, y: 18 }
  ],
  '1-3-5-2': [
    { role: 'Portero', label: 'POR', x: 50, y: 88 },
    { role: 'Central derecho', label: 'CD', x: 75, y: 74 },
    { role: 'Central central', label: 'CC', x: 50, y: 77 },
    { role: 'Central izquierdo', label: 'CI', x: 25, y: 74 },
    { role: 'Pivote derecho', label: 'PVD', x: 64, y: 58 },
    { role: 'Pivote izquierdo', label: 'PVI', x: 36, y: 58 },
    { role: 'Lateral derecho', label: 'LD', x: 15, y: 45 },
    { role: 'Lateral izquierdo', label: 'LI', x: 85, y: 45 },
    { role: 'Media punta', label: 'MP', x: 50, y: 40 },
    { role: 'Delantero centro', label: 'DC', x: 38, y: 18 },
    { role: 'Delantero centro', label: 'DC', x: 62, y: 18 }
  ],
  '1-5-3-2': [
    { role: 'Portero', label: 'POR', x: 50, y: 88 },
    { role: 'Lateral derecho', label: 'LD', x: 15, y: 55 },
    { role: 'Central derecho', label: 'CD', x: 68, y: 74 },
    { role: 'Central central', label: 'CC', x: 50, y: 77 },
    { role: 'Central izquierdo', label: 'CI', x: 32, y: 74 },
    { role: 'Lateral izquierdo', label: 'LI', x: 85, y: 55 },
    { role: 'Pivote', label: 'PIV', x: 50, y: 48 },
    { role: 'Interior derecho', label: 'ID', x: 68, y: 38 },
    { role: 'Interior izquierdo', label: 'II', x: 32, y: 38 },
    { role: 'Delantero centro', label: 'DC', x: 38, y: 18 },
    { role: 'Delantero centro', label: 'DC', x: 62, y: 18 }
  ]
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

const parseComentario = (rawComentario: string | null | undefined): { funcion_tactica: string; comentario: string } => {
  if (!rawComentario) return { funcion_tactica: '', comentario: '' };
  try {
    const trimmed = rawComentario.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      return {
        funcion_tactica: parsed.funcion_tactica || '',
        comentario: parsed.comentario || ''
      };
    }
  } catch {
    // ignorar
  }
  return { funcion_tactica: '', comentario: rawComentario };
};

const serializeComentario = (funcion_tactica: string, comentario: string): string => {
  return JSON.stringify({ funcion_tactica, comentario });
};

const parsePlayDescripcion = (rawDesc: string | null | undefined): { sistema_tactico: string; descripcion_texto: string } => {
  if (!rawDesc) return { sistema_tactico: '1-4-3-3', descripcion_texto: '' };
  try {
    const trimmed = rawDesc.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      return {
        sistema_tactico: parsed.sistema_tactico || '1-4-3-3',
        descripcion_texto: parsed.descripcion_texto || ''
      };
    }
  } catch {
    // ignorar
  }
  return { sistema_tactico: '1-4-3-3', descripcion_texto: rawDesc };
};

const serializePlayDescripcion = (sistema_tactico: string, descripcion_texto: string): string => {
  return JSON.stringify({ sistema_tactico, descripcion_texto });
};



// Formación/Posición inicial por defecto según tipo de ABP
const DEFAULT_POSITIONS_BY_TYPE: Record<ABPType, { role: string; x: number; y: number }[]> = {
  'Córner ofensivo': [
    { role: 'Lanzador', x: 5, y: 10 },
    { role: '1º palo', x: 42, y: 22 },
    { role: '2º palo', x: 58, y: 24 },
    { role: 'Rematador', x: 48, y: 32 },
    { role: 'Rematador', x: 53, y: 32 },
    { role: 'Bloqueador', x: 44, y: 36 },
    { role: 'Arrastrador', x: 51, y: 38 },
    { role: 'Rechace', x: 50, y: 55 },
    { role: 'Cierre', x: 30, y: 78 },
    { role: 'Cierre', x: 70, y: 78 }
  ],
  'Córner defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 40, y: 20 },
    { role: 'Vigilancia', x: 50, y: 20 },
    { role: 'Vigilancia', x: 60, y: 20 },
    { role: 'Libre', x: 42, y: 28 },
    { role: 'Libre', x: 48, y: 28 },
    { role: 'Libre', x: 58, y: 28 },
    { role: '1º palo', x: 40, y: 22 },
    { role: 'Rechace', x: 50, y: 48 },
    { role: 'Vigilancia', x: 20, y: 60 },
    { role: 'Vigilancia', x: 80, y: 60 }
  ],
  'Falta frontal ofensiva': [
    { role: 'Lanzador', x: 50, y: 65 },
    { role: 'Rematador', x: 40, y: 32 },
    { role: 'Rematador', x: 45, y: 32 },
    { role: 'Rematador', x: 55, y: 32 },
    { role: 'Rematador', x: 35, y: 35 },
    { role: 'Rematador', x: 65, y: 35 },
    { role: 'Bloqueador', x: 50, y: 42 },
    { role: 'Rechace', x: 50, y: 52 },
    { role: 'Vigilancia', x: 25, y: 80 },
    { role: 'Vigilancia', x: 75, y: 80 }
  ],
  'Falta frontal defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 42, y: 45 },
    { role: 'Vigilancia', x: 46, y: 45 },
    { role: 'Vigilancia', x: 50, y: 45 },
    { role: 'Vigilancia', x: 54, y: 45 },
    { role: 'Vigilancia', x: 58, y: 45 },
    { role: 'Libre', x: 45, y: 32 },
    { role: 'Libre', x: 55, y: 32 },
    { role: 'Vigilancia', x: 30, y: 60 },
    { role: 'Vigilancia', x: 70, y: 60 },
    { role: 'Libre', x: 50, y: 70 }
  ],
  'Falta lateral ofensiva': [
    { role: 'Lanzador', x: 10, y: 40 },
    { role: 'Rematador', x: 42, y: 25 },
    { role: 'Rematador', x: 48, y: 28 },
    { role: 'Rematador', x: 54, y: 25 },
    { role: 'Bloqueador', x: 44, y: 32 },
    { role: '2º palo', x: 58, y: 26 },
    { role: 'Rechace', x: 50, y: 48 },
    { role: 'Vigilancia', x: 30, y: 75 },
    { role: 'Vigilancia', x: 70, y: 75 },
    { role: 'Libre', x: 40, y: 50 }
  ],
  'Falta lateral defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 45, y: 22 },
    { role: 'Vigilancia', x: 55, y: 22 },
    { role: 'Libre', x: 42, y: 30 },
    { role: 'Libre', x: 48, y: 30 },
    { role: 'Libre', x: 54, y: 30 },
    { role: 'Rechace', x: 50, y: 45 },
    { role: 'Vigilancia', x: 30, y: 70 },
    { role: 'Vigilancia', x: 70, y: 70 },
    { role: 'Libre', x: 40, y: 58 },
    { role: 'Libre', x: 60, y: 58 }
  ],
  'Saque de banda ofensivo': [
    { role: 'Sacador', x: 5, y: 45 },
    { role: 'Rematador', x: 15, y: 45 },
    { role: 'Rematador', x: 25, y: 38 },
    { role: 'Rematador', x: 30, y: 28 },
    { role: 'Rematador', x: 45, y: 25 },
    { role: 'Rechace', x: 50, y: 50 },
    { role: 'Vigilancia', x: 30, y: 75 },
    { role: 'Vigilancia', x: 70, y: 75 },
    { role: 'Libre', x: 40, y: 60 },
    { role: 'Libre', x: 60, y: 60 }
  ],
  'Saque de banda defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 20, y: 45 },
    { role: 'Vigilancia', x: 30, y: 40 },
    { role: 'Libre', x: 18, y: 35 },
    { role: 'Libre', x: 28, y: 35 },
    { role: 'Rechace', x: 50, y: 50 },
    { role: 'Vigilancia', x: 35, y: 70 },
    { role: 'Vigilancia', x: 65, y: 70 },
    { role: 'Libre', x: 40, y: 30 },
    { role: 'Libre', x: 45, y: 30 },
    { role: 'Libre', x: 50, y: 30 }
  ],
  'Saque de medio ofensivo': [
    { role: 'Lanzador', x: 50, y: 52 },
    { role: 'Rematador', x: 42, y: 54 },
    { role: 'Rematador', x: 30, y: 40 },
    { role: 'Rematador', x: 70, y: 40 },
    { role: 'Rematador', x: 50, y: 45 },
    { role: 'Rematador', x: 50, y: 30 },
    { role: 'Vigilancia', x: 35, y: 75 },
    { role: 'Vigilancia', x: 65, y: 75 },
    { role: 'Libre', x: 45, y: 60 },
    { role: 'Libre', x: 55, y: 60 }
  ],
  'Saque de medio defensivo': [
    { role: 'Cierre', x: 50, y: 88 },
    { role: 'Vigilancia', x: 35, y: 65 },
    { role: 'Vigilancia', x: 50, y: 65 },
    { role: 'Vigilancia', x: 65, y: 65 },
    { role: 'Libre', x: 40, y: 55 },
    { role: 'Libre', x: 60, y: 55 },
    { role: 'Vigilancia', x: 50, y: 75 },
    { role: 'Libre', x: 30, y: 45 },
    { role: 'Libre', x: 45, y: 45 },
    { role: 'Libre', x: 55, y: 45 },
    { role: 'Libre', x: 70, y: 45 }
  ],
  'Penalti ofensivo': [
    { role: 'Lanzador', x: 50, y: 36 },
    { role: 'Rechace', x: 38, y: 52 },
    { role: 'Rechace', x: 44, y: 52 },
    { role: 'Rechace', x: 56, y: 52 },
    { role: 'Rechace', x: 62, y: 52 },
    { role: 'Libre', x: 30, y: 58 },
    { role: 'Libre', x: 70, y: 58 },
    { role: 'Libre', x: 40, y: 65 },
    { role: 'Libre', x: 60, y: 65 },
    { role: 'Libre', x: 50, y: 75 }
  ],
  'Penalti defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Libre', x: 38, y: 52 },
    { role: 'Libre', x: 44, y: 52 },
    { role: 'Libre', x: 56, y: 52 },
    { role: 'Libre', x: 62, y: 52 },
    { role: 'Libre', x: 30, y: 58 },
    { role: 'Libre', x: 70, y: 58 },
    { role: 'Libre', x: 40, y: 65 },
    { role: 'Libre', x: 60, y: 65 },
    { role: 'Libre', x: 45, y: 75 },
    { role: 'Libre', x: 55, y: 75 }
  ],
  'Jugada especial ofensiva': [
    { role: 'Lanzador', x: 50, y: 70 },
    { role: 'Rematador', x: 40, y: 30 },
    { role: 'Rematador', x: 60, y: 30 },
    { role: 'Bloqueador', x: 50, y: 38 },
    { role: 'Vigilancia', x: 30, y: 80 },
    { role: 'Vigilancia', x: 70, y: 80 },
    { role: 'Libre', x: 40, y: 50 },
    { role: 'Libre', x: 60, y: 50 },
    { role: 'Libre', x: 45, y: 65 },
    { role: 'Libre', x: 55, y: 65 }
  ],
  'Jugada especial defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 40, y: 25 },
    { role: 'Vigilancia', x: 60, y: 25 },
    { role: 'Libre', x: 45, y: 35 },
    { role: 'Libre', x: 55, y: 35 },
    { role: 'Vigilancia', x: 50, y: 70 },
    { role: 'Libre', x: 30, y: 50 },
    { role: 'Libre', x: 70, y: 50 },
    { role: 'Libre', x: 40, y: 60 },
    { role: 'Libre', x: 60, y: 60 },
    { role: 'Libre', x: 50, y: 80 }
  ],
  'Saque inicial': [
    { role: 'Libre', x: 8, y: 50 },
    { role: 'Cobertura', x: 25, y: 20 },
    { role: 'Vigilancia', x: 20, y: 40 },
    { role: 'Vigilancia', x: 20, y: 60 },
    { role: 'Cobertura', x: 25, y: 80 },
    { role: 'Apoyo', x: 35, y: 50 },
    { role: 'Cambio de orientación', x: 42, y: 35 },
    { role: 'Receptor', x: 42, y: 65 },
    { role: 'Profundidad', x: 48, y: 15 },
    { role: 'Profundidad', x: 48, y: 85 },
    { role: 'Sacador', x: 49, y: 50 }
  ]
};

const normalizePlayType = (type: string): ABPType => {
  const lower = type.toLowerCase().trim();
  if (lower === 'córner ofensivo') return 'Córner ofensivo';
  if (lower === 'córner defensivo') return 'Córner defensivo';
  if (lower === 'falta ofensiva' || lower === 'falta frontal ofensiva') return 'Falta frontal ofensiva';
  if (lower === 'falta defensiva' || lower === 'falta frontal defensiva') return 'Falta frontal defensiva';
  if (lower === 'falta lateral ofensiva') return 'Falta lateral ofensiva';
  if (lower === 'falta lateral defensiva') return 'Falta lateral defensiva';
  if (lower === 'saque de banda' || lower === 'saque de banda ofensivo') return 'Saque de banda ofensivo';
  if (lower === 'saque de banda defensivo') return 'Saque de banda defensivo';
  if (lower === 'saque de medio ofensivo') return 'Saque de medio ofensivo';
  if (lower === 'saque de medio defensivo') return 'Saque de medio defensivo';
  if (lower === 'penalti' || lower === 'penalti ofensivo') return 'Penalti ofensivo';
  if (lower === 'penalti defensivo') return 'Penalti defensivo';
  if (lower === 'jugada ensayada' || lower === 'jugada especial ofensiva') return 'Jugada especial ofensiva';
  if (lower === 'jugada especial defensiva') return 'Jugada especial defensiva';
  if (lower === 'saque inicial' || lower === 'saque_inicial') return 'Saque inicial';
  return 'Córner ofensivo'; // fallback
};

const getRolesForPlayType = (type: ABPType): string[] => {
  if (type === 'Saque inicial') {
    return ['Sacador', 'Apoyo', 'Receptor', 'Cambio de orientación', 'Profundidad', 'Vigilancia', 'Cobertura', 'Libre'];
  }
  return [
    'Lanzador',
    'Sacador',
    'Rematador',
    'Bloqueador',
    'Arrastrador',
    'Rechace',
    'Cierre',
    '1º palo',
    '2º palo',
    'Barrera',
    'Vigilancia',
    'Defensa zona',
    'Marca individual',
    'Libre'
  ];
};

const getPositionsForPlay = (type: ABPType, zona?: string | null): { role: string; x: number; y: number }[] => {
  if (type === 'Saque de banda ofensivo') {
    if (zona === 'Inicio') {
      return [
        { role: 'Sacador', x: 5, y: 70 },
        { role: 'Apoyo', x: 20, y: 65 },
        { role: 'Libre', x: 30, y: 55 },
        { role: 'Rechace', x: 40, y: 75 },
        { role: 'Vigilancia', x: 35, y: 35 },
        { role: 'Libre', x: 50, y: 45 },
        { role: 'Cambio de orientación', x: 60, y: 25 },
        { role: 'Profundidad', x: 70, y: 55 },
        { role: 'Libre', x: 80, y: 35 },
        { role: 'Libre', x: 90, y: 50 }
      ];
    } else if (zona === 'Medio') {
      return [
        { role: 'Sacador', x: 5, y: 50 },
        { role: 'Apoyo', x: 25, y: 40 },
        { role: 'Libre', x: 30, y: 60 },
        { role: 'Rechace', x: 45, y: 50 },
        { role: 'Vigilancia', x: 40, y: 20 },
        { role: 'Libre', x: 55, y: 35 },
        { role: 'Cambio de orientación', x: 65, y: 15 },
        { role: 'Profundidad', x: 75, y: 50 },
        { role: 'Libre', x: 80, y: 30 },
        { role: 'Libre', x: 85, y: 45 }
      ];
    } else {
      return DEFAULT_POSITIONS_BY_TYPE[type] || [];
    }
  }

  if (type === 'Saque de banda defensivo') {
    if (zona === 'Inicio') {
      return [
        { role: 'Cierre', x: 50, y: 15 },
        { role: 'Vigilancia', x: 20, y: 45 },
        { role: 'Vigilancia', x: 30, y: 40 },
        { role: 'Libre', x: 18, y: 35 },
        { role: 'Libre', x: 28, y: 35 },
        { role: 'Rechace', x: 50, y: 50 },
        { role: 'Vigilancia', x: 35, y: 70 },
        { role: 'Vigilancia', x: 65, y: 70 },
        { role: 'Libre', x: 40, y: 30 },
        { role: 'Libre', x: 45, y: 30 },
        { role: 'Libre', x: 50, y: 30 }
      ];
    } else if (zona === 'Medio') {
      return [
        { role: 'Cierre', x: 50, y: 15 },
        { role: 'Libre', x: 30, y: 45 },
        { role: 'Libre', x: 40, y: 45 },
        { role: 'Libre', x: 50, y: 45 },
        { role: 'Libre', x: 60, y: 45 },
        { role: 'Rechace', x: 50, y: 55 },
        { role: 'Vigilancia', x: 35, y: 65 },
        { role: 'Vigilancia', x: 65, y: 65 },
        { role: 'Vigilancia', x: 50, y: 75 },
        { role: 'Libre', x: 45, y: 35 },
        { role: 'Libre', x: 55, y: 35 }
      ];
    } else {
      return [
        { role: 'Cierre', x: 50, y: 15 },
        { role: 'Vigilancia', x: 42, y: 28 },
        { role: 'Vigilancia', x: 48, y: 28 },
        { role: 'Vigilancia', x: 58, y: 28 },
        { role: '1º palo', x: 40, y: 22 },
        { role: 'Rechace', x: 50, y: 48 },
        { role: 'Vigilancia', x: 20, y: 60 },
        { role: 'Vigilancia', x: 80, y: 60 },
        { role: 'Libre', x: 42, y: 35 },
        { role: 'Libre', x: 48, y: 35 },
        { role: 'Libre', x: 58, y: 35 }
      ];
    }
  }

  return DEFAULT_POSITIONS_BY_TYPE[type] || [];
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
  if (lower.includes('defensivo') || lower.includes('defensiva')) {
    return 'defense';
  }
  
  return 'attack';
};

export function ABPSection({ players, matches }: ABPSectionProps) {
  const { isEditMode } = useEditMode();


  const [plays, setPlays] = useState<ABPPlay[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<ABPPlay | null>(null);
  const [playRoles, setPlayRoles] = useState<(ABPPlayerRole & { player?: Player })[]>([]);
  
  // Modo Plan de Partido
  const [viewMode, setViewMode] = useState<'home' | 'categories' | 'category-detail' | 'play-editor' | 'partido'>('home');
  const [selectedCategory, setSelectedCategory] = useState<ABPType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchAbpPlans, setMatchAbpPlans] = useState<MatchABPPlan[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchAbpRoles, setMatchAbpRoles] = useState<MatchABPPlayerAssignment[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchLineupPlayerIds, setMatchLineupPlayerIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingMatchPlan, setLoadingMatchPlan] = useState(false);
  
  // Modals & loading states
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [selectedTacticalSystem, setSelectedTacticalSystem] = useState<keyof typeof SISTEMAS_TACTICOS>('1-4-3-3');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  
  // Form states - Play Creation/Edition
  const [playTitle, setPlayTitle] = useState('');
  const [playDesc, setPlayDesc] = useState('');
  const [playType, setPlayType] = useState<ABPType>('Córner ofensivo');
  const [playVideoUrl, setPlayVideoUrl] = useState('');
  const [playZone, setPlayZone] = useState<'Inicio' | 'Medio' | 'Último tercio' | ''>('Último tercio');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Filters & Search
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeFilter, setActiveFilter] = useState<ABPType | 'Todos'>('Todos');

  
  // Board configuration state
  const isEditingPositions = true;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load ABP plays
  const loadPlays = useCallback(async () => {
    setLoadingPlays(true);
    try {
      const { data, error } = await supabase
        .from('abp_plays')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const normalized = (data || []).map(p => ({
        ...p,
        tipo: normalizePlayType(p.tipo)
      }));
      setPlays(normalized);
      
      // If we don't have a selected play, choose the first one
      if (normalized.length > 0 && !selectedPlay) {
        setSelectedPlay(normalized[0]);
      }
    } catch (err) {
      console.error('Error loading ABP plays:', err);
    } finally {
      setLoadingPlays(false);
    }
  }, [selectedPlay]);

  const loadMatchPlans = useCallback(async () => {
    if (!selectedMatchId) {
      setMatchAbpPlans([]);
      setMatchAbpRoles([]);
      return;
    }
    
    setLoadingMatchPlan(true);
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('match_abp_plans')
        .select(`*, abp_play:abp_plays(*)`)
        .eq('match_id', selectedMatchId)
        .order('orden', { ascending: true });
        
      if (plansError) throw plansError;
      setMatchAbpPlans(plansData || []);
      
      const { data: rolesData, error: rolesError } = await supabase
        .from('match_abp_player_assignments')
        .select(`*, role:abp_player_roles(*)`)
        .in('match_abp_plan_id', (plansData || []).map(p => p.id));
        
      if (rolesError) throw rolesError;
      setMatchAbpRoles(rolesData || []);
      
      // Obtener la alineación de la pizarra táctica para este partido
      const { data: lineupData } = await supabase
        .from('tactical_lineups')
        .select('posiciones')
        .eq('match_id', selectedMatchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (lineupData && lineupData.posiciones) {
        let pIds: string[] = [];
        const pos = lineupData.posiciones;
        
        if (Array.isArray(pos)) {
          pIds = pos.filter((p: { player_id?: string }) => p.player_id).map((p: { player_id?: string }) => p.player_id as string);
        } else if (pos.propio && Array.isArray(pos.propio)) {
          pIds = pos.propio.filter((p: { player_id?: string }) => p.player_id).map((p: { player_id?: string }) => p.player_id as string);
        }
        
        setMatchLineupPlayerIds(pIds);
      } else {
        setMatchLineupPlayerIds([]);
      }
      
    } catch (err) {
      console.error('Error loading match plans:', err);
      setErrorMsg('Error al cargar el plan de partido.');
    } finally {
      setLoadingMatchPlan(false);
    }
  }, [selectedMatchId]);

  useEffect(() => {
    if (viewMode === 'partido' && selectedMatchId) {
      loadMatchPlans();
    }
  }, [viewMode, selectedMatchId, loadMatchPlans]);

  // Load roles & positions for the selected play
  const loadPlayRoles = useCallback(async (playId: string) => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('abp_player_roles')
        .select('*')
        .eq('abp_play_id', playId)
        .order('orden', { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map((r: ABPPlayerRole) => ({
        ...r,
        rol_asignado: normalizeRoleName(r.rol_asignado),
        player: players.find(p => p.id === r.player_id),
        posicion_x: r.posicion_x !== null ? parseFloat(String(r.posicion_x)) : null,
        posicion_y: r.posicion_y !== null ? parseFloat(String(r.posicion_y)) : null,
      }));

      // Si es una jugada de posición real (Saque de banda o Saque inicial)
      if (selectedPlay && isRealPositionPlayType(selectedPlay.tipo)) {
        const { sistema_tactico } = parsePlayDescripcion(selectedPlay.descripcion);
        const hasOldRoles = mapped.some(r => !Object.keys(POSITION_ABBRS).includes(r.rol_asignado));
        const activeSystem = (sistema_tactico as keyof typeof SISTEMAS_TACTICOS) || '1-4-3-3';
        
        if (mapped.length === 0 || hasOldRoles) {
          // Si tiene roles antiguos o está vacío, cargamos en local temporalmente el sistema por defecto
          const systemPositions = SISTEMAS_TACTICOS[activeSystem] || SISTEMAS_TACTICOS['1-4-3-3'];
          const tempRoles = systemPositions.map((sp, index) => {
            const existingRole = mapped[index];
            return {
              id: existingRole?.id || `temp-${index}`,
              abp_play_id: playId,
              player_id: existingRole?.player_id || null,
              player: existingRole?.player,
              rol_asignado: sp.role,
              posicion_x: sp.x,
              posicion_y: sp.y,
              etiqueta: sp.label,
              comentario: JSON.stringify({ funcion_tactica: '', comentario: '' }),
              orden: index + 1,
              created_at: new Date().toISOString()
            };
          });
          setPlayRoles(tempRoles);
          setSelectedTacticalSystem(activeSystem);
        } else {
          setPlayRoles(mapped);
          setSelectedTacticalSystem(sistema_tactico as keyof typeof SISTEMAS_TACTICOS || '1-4-3-3');
        }
      } else {
        setPlayRoles(mapped);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [players, selectedPlay]);

  const handleExportPDF = async () => {
    if (!selectedPlay) return;
    setIsPdfExporting(true);
    try {
      const { descripcion_texto } = parsePlayDescripcion(selectedPlay.descripcion);
      const filename = buildABPFilename({
        tipoABP: selectedPlay.tipo,
        playName: selectedPlay.titulo || 'Jugada',
      });

      // Dynamically compile legend of abbreviations used
      const isRealPosType = isRealPositionPlayType(selectedPlay.tipo);
      const leyenda: Record<string, string> = {};
      playRoles.forEach((role) => {
        const label = role.etiqueta || (isRealPosType ? POSITION_ABBRS[role.rol_asignado] : ROLE_ABBRS[role.rol_asignado]);
        if (label) {
          leyenda[label] = role.rol_asignado;
        }
      });

      await exportToPDF({
        mode: 'abp',
        fieldElementId: 'abp-field-export-container',
        filename,
        playName: selectedPlay.titulo || 'Jugada',
        tipoABP: selectedPlay.tipo,
        instrucciones: descripcion_texto || '',
        leyenda,
      });
    } catch (err) {
      console.error('[PDF Export] Error:', err);
      setErrorMsg('Error al generar el PDF de ABP. Inténtalo de nuevo.');
    } finally {
      setIsPdfExporting(false);
    }
  };

  useEffect(() => {
    loadPlays();
  }, [loadPlays]);

  useEffect(() => {
    if (selectedPlay) {
      loadPlayRoles(selectedPlay.id);
      setErrorMsg(null);
      setSuccessMsg(null);
    } else {
      setPlayRoles([]);
    }
  }, [selectedPlay, loadPlayRoles]);

  // --- CREATE NEW ABP PLAY ---
  async function handleCreatePlay(e: React.FormEvent) {
    e.preventDefault();
    if (!playTitle.trim()) {
      setErrorMsg('El título es obligatorio.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let videoUrl = playVideoUrl.trim() || null;

      // Handle video upload if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `abp-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      const isThrowIn = playType === 'Saque de banda ofensivo' || playType === 'Saque de banda defensivo';
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: playRes, error: insertError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'abp_plays',
          payload: {
            tipo: playType,
            titulo: playTitle,
            descripcion: isRealPositionPlayType(playType)
              ? serializePlayDescripcion('1-4-3-3', playDesc)
              : (playDesc || null),
            video_url: videoUrl,
            zona: isThrowIn ? playZone : null
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (insertError) throw insertError;

      // Insert default roles & positions for the chosen ABPType
      let rolesPayload;
      if (isRealPositionPlayType(playType)) {
        rolesPayload = SISTEMAS_TACTICOS['1-4-3-3'].map((sp, index) => ({
          abp_play_id: playRes.id,
          player_id: null,
          rol_asignado: sp.role,
          posicion_x: sp.x,
          posicion_y: sp.y,
          etiqueta: sp.label,
          comentario: JSON.stringify({ funcion_tactica: '', comentario: '' }),
          orden: index + 1
        }));
      } else {
        const defaultRoles = getPositionsForPlay(playType, isThrowIn ? playZone : null);
        rolesPayload = defaultRoles.map((dr, index) => ({
          abp_play_id: playRes.id,
          player_id: null, // VACÍO initially
          rol_asignado: dr.role,
          posicion_x: dr.x,
          posicion_y: dr.y,
          etiqueta: ROLE_ABBRS[dr.role] || dr.role.substring(0, 4).toUpperCase(),
          orden: index + 1
        }));
      }

      if (rolesPayload.length > 0 && playRes) {
        const { error: rolesError } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'abp_player_roles',
            payloads: rolesPayload,
            conflict_columns: null,
            staff_passkey: passkey
          });

        if (rolesError) console.error('Error creating default roles:', rolesError);
      }

      setPlayTitle('');
      setPlayDesc('');
      setPlayVideoUrl('');
      setVideoFile(null);
      setIsPlayModalOpen(false);
      
      // Select the new play
      if (playRes) {
        setSelectedPlay(playRes);
      }
      await loadPlays();
      setSuccessMsg('Jugada de estrategia creada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating ABP play:', error);
      setErrorMsg(error.message || 'Error al guardar la jugada.');
    } finally {
      setIsSaving(false);
    }
  }

  // --- EDIT PLAY DETAILS (Title, Type, Description, Video) ---
  async function handleEditPlay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlay) return;
    if (!playTitle.trim()) {
      setErrorMsg('El título es obligatorio.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let videoUrl = playVideoUrl.trim() || selectedPlay.video_url;

      // Handle video upload if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `abp-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      const isThrowIn = playType === 'Saque de banda ofensivo' || playType === 'Saque de banda defensivo';
      const nextDesc = isRealPositionPlayType(playType)
        ? serializePlayDescripcion(selectedTacticalSystem, playDesc)
        : (playDesc || null);

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: updateError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'abp_plays',
          payload: {
            id: selectedPlay.id,
            titulo: playTitle,
            tipo: playType,
            descripcion: nextDesc,
            video_url: videoUrl,
            zona: isThrowIn ? playZone : null
          },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (updateError) throw updateError;

      setIsEditModalOpen(false);
      setVideoFile(null);
      
      // Reload play data
      const updatedPlay = {
        ...selectedPlay,
        titulo: playTitle,
        tipo: playType,
        descripcion: nextDesc,
        video_url: videoUrl,
        zona: isThrowIn ? playZone : null
      };
      setSelectedPlay(updatedPlay);
      await loadPlays();
      setSuccessMsg('Jugada actualizada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating play details:', error);
      setErrorMsg(error.message || 'Error al actualizar la jugada.');
    } finally {
      setIsSaving(false);
    }
  }

  // Open Edit Modal with current values
  const openEditModal = () => {
    if (!selectedPlay) return;
    const { descripcion_texto } = parsePlayDescripcion(selectedPlay.descripcion);
    setPlayTitle(selectedPlay.titulo);
    setPlayType(selectedPlay.tipo);
    setPlayDesc(descripcion_texto);
    setPlayVideoUrl(selectedPlay.video_url || '');
    setPlayZone((selectedPlay.zona as 'Inicio' | 'Medio' | 'Último tercio') || 'Último tercio');
    setIsEditModalOpen(true);
  };

  // --- DUPLICATE PLAY ---
  async function handleDuplicatePlay() {
    if (!selectedPlay) return;
    setIsDuplicating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: newPlay, error: playError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'abp_plays',
          payload: {
            titulo: `${selectedPlay.titulo} (Copia)`,
            tipo: selectedPlay.tipo,
            descripcion: selectedPlay.descripcion,
            video_url: selectedPlay.video_url
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (playError) throw playError;

      // 2. Clone all player roles / positions
      if (playRoles.length > 0 && newPlay) {
        const rolesPayload = playRoles.map(r => ({
          abp_play_id: newPlay.id,
          player_id: r.player_id,
          rol_asignado: r.rol_asignado,
          posicion_x: r.posicion_x,
          posicion_y: r.posicion_y,
          etiqueta: r.etiqueta,
          comentario: r.comentario,
          orden: r.orden
        }));

        const { error: rolesError } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'abp_player_roles',
            payloads: rolesPayload,
            conflict_columns: null,
            staff_passkey: passkey
          });

        if (rolesError) throw rolesError;
      }

      setSelectedPlay(newPlay);
      await loadPlays();
      setSuccessMsg('Jugada duplicada con éxito.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error duplicating play:', error);
      setErrorMsg('Error al duplicar la jugada.');
    } finally {
      setIsDuplicating(false);
    }
  }

  // --- DELETE PLAY ---
  async function handleDeletePlay(playId: string) {
    if (!confirm('¿Seguro que deseas eliminar esta jugada de estrategia? Se borrarán todas las posiciones y roles.')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'abp_plays',
        record_id: playId,
        staff_passkey: passkey
      });
      if (error) throw error;
      
      if (selectedPlay?.id === playId) {
        setSelectedPlay(null);
      }
      setSuccessMsg('Jugada eliminada.');
      loadPlays();
    } catch (err) {
      console.error('Error deleting play:', err);
      setErrorMsg('Error al eliminar la jugada.');
    }
  }

  // --- SAVE CURRENT TACTICAL POSITIONS & ROLES ---
  async function handleSavePositions() {
    if (!selectedPlay) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const rolesPayload = playRoles.map((role) => ({
        id: role.id,
        abp_play_id: selectedPlay.id,
        player_id: role.player_id || null,
        rol_asignado: role.rol_asignado,
        posicion_x: role.posicion_x !== null ? parseFloat(role.posicion_x.toFixed(1)) : null,
        posicion_y: role.posicion_y !== null ? parseFloat(role.posicion_y.toFixed(1)) : null,
        etiqueta: role.etiqueta || ROLE_ABBRS[role.rol_asignado] || role.rol_asignado.substring(0, 4).toUpperCase(),
        comentario: role.comentario || null,
        orden: role.orden || null,
        label_position: role.label_position ?? 'bottom'
      }));

      const { error } = await supabase.rpc('exec_secure_bulk_upsert', {
        target_table: 'abp_player_roles',
        payloads: rolesPayload,
        conflict_columns: ['id'],
        staff_passkey: passkey
      });
      if (error) throw error;

      setSuccessMsg('Posiciones y roles guardados correctamente en Supabase.');
      loadPlayRoles(selectedPlay.id);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saving tactical board:', error);
      setErrorMsg('Error al guardar la pizarra táctica.');
    } finally {
      setIsSaving(false);
    }
  }

  // --- ADD NEW ROLE NODE TO THE BOARD ---
  async function handleAddRoleNode() {
    if (!selectedPlay) return;
    setErrorMsg(null);

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'abp_player_roles',
          payload: {
            abp_play_id: selectedPlay.id,
            player_id: null,
            rol_asignado: 'Libre',
            posicion_x: 45.0 + (Math.random() * 10), // Randomize slightly around center
            posicion_y: 40.0 + (playRoles.length * 2), // Cascade downwards
            etiqueta: 'LIB',
            orden: playRoles.length + 1
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (error) throw error;
      
      if (data) {
        setPlayRoles(prev => [...prev, { ...data, player: undefined }]);
      }
    } catch (err) {
      console.error('Error adding role node:', err);
      setErrorMsg('No se pudo añadir un nuevo rol.');
    }
  }

  // --- REMOVE ROLE NODE FROM THE BOARD ---
  async function handleRemoveRoleNode(roleId: string) {
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'abp_player_roles',
        record_id: roleId,
        staff_passkey: passkey
      });
      if (error) throw error;
      setPlayRoles(prev => prev.filter(r => r.id !== roleId));
      setSuccessMsg('Puesto eliminado del campo.');
    } catch (err) {
      console.error('Error deleting role node:', err);
      setErrorMsg('Error al borrar el puesto.');
    }
  }

  // --- POSITION RESET (Default Layout) ---
  const handleApplyTacticalSystem = async (systemKey: keyof typeof SISTEMAS_TACTICOS) => {
    if (!selectedPlay) return;
    if (!confirm(`¿Seguro que deseas aplicar el sistema ${systemKey}? Se restablecerán las posiciones y roles de esta jugada.`)) return;
    
    setSelectedTacticalSystem(systemKey);
    setLoadingRoles(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      // 1. Delete all existing roles for this play
      const { error: deleteError } = await supabase
        .rpc('exec_secure_delete_by_col', {
          target_table: 'abp_player_roles',
          col_name: 'abp_play_id',
          col_value: selectedPlay.id,
          staff_passkey: passkey
        });
        
      if (deleteError) throw deleteError;

      // 2. Insert new positions based on selected system
      const systemPositions = SISTEMAS_TACTICOS[systemKey];
      const rolesPayload = systemPositions.map((sp, index) => ({
        abp_play_id: selectedPlay.id,
        player_id: null,
        rol_asignado: sp.role,
        posicion_x: sp.x,
        posicion_y: sp.y,
        etiqueta: sp.label,
        comentario: JSON.stringify({ funcion_tactica: '', comentario: '' }),
        orden: index + 1
      }));

      const { error: insertError } = await supabase
        .rpc('exec_secure_bulk_upsert', {
          target_table: 'abp_player_roles',
          payloads: rolesPayload,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (insertError) throw insertError;

      // Update play description in DB to store system
      const { descripcion_texto } = parsePlayDescripcion(selectedPlay.descripcion);
      const nextDesc = serializePlayDescripcion(systemKey, descripcion_texto);
      const { error: playError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'abp_plays',
          payload: { id: selectedPlay.id, descripcion: nextDesc },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (playError) throw playError;

      // Update state
      setSelectedPlay(prev => prev ? { ...prev, descripcion: nextDesc } : null);

      // 3. Reload roles
      await loadPlayRoles(selectedPlay.id);
      setSuccessMsg(`Sistema ${systemKey} aplicado correctamente.`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error applying tactical system:', error);
      setErrorMsg(error.message || 'Error al aplicar el sistema táctico.');
    } finally {
      setLoadingRoles(false);
    }
  };

  // --- POSITION RESET (Default Layout) ---
  const handleResetPositions = async () => {
    if (!selectedPlay) return;
    if (!confirm('¿Seguro que deseas restablecer la jugada a su diseño por defecto? Se borrarán todos los cambios y asignaciones.')) return;
    
    setLoadingRoles(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      // 1. Delete all existing roles for this play
      const { error: deleteError } = await supabase
        .from('abp_player_roles')
        .delete()
        .eq('abp_play_id', selectedPlay.id);
        
      if (deleteError) throw deleteError;

      // 2. Insert new default roles
      let rolesPayload;
      if (isRealPositionPlayType(selectedPlay.tipo)) {
        rolesPayload = SISTEMAS_TACTICOS[selectedTacticalSystem].map((sp, index) => ({
          abp_play_id: selectedPlay.id,
          player_id: null,
          rol_asignado: sp.role,
          posicion_x: sp.x,
          posicion_y: sp.y,
          etiqueta: sp.label,
          comentario: JSON.stringify({ funcion_tactica: '', comentario: '' }),
          orden: index + 1
        }));
      } else {
        const defaults = getPositionsForPlay(selectedPlay.tipo, selectedPlay.zona);
        rolesPayload = defaults.map((dr, index) => ({
          abp_play_id: selectedPlay.id,
          player_id: null,
          rol_asignado: dr.role,
          posicion_x: dr.x,
          posicion_y: dr.y,
          etiqueta: ROLE_ABBRS[dr.role] || dr.role.substring(0, 4).toUpperCase(),
          comentario: '',
          orden: index + 1
        }));
      }

      if (rolesPayload.length > 0) {
        const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
        const { error: insertError } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'abp_player_roles',
            payloads: rolesPayload,
            conflict_columns: null,
            staff_passkey: passkey
          });

        if (insertError) throw insertError;
      }

      // 3. Reload roles
      await loadPlayRoles(selectedPlay.id);
      setSuccessMsg('Diseño restablecido por defecto.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error resetting positions:', error);
      setErrorMsg(error.message || 'Error al restablecer las posiciones.');
    } finally {
      setLoadingRoles(false);
    }
  };



  // --- DRAG AND DROP ON THE FIELD (CANVAS COORDINATES) ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, roleId: string) => {
    if (!isEditingPositions) return;
    
    const isTouch = 'touches' in e;
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const roleNode = playRoles.find(r => r.id === roleId);
    if (!roleNode) return;
    
    const initialX = roleNode.posicion_x !== null ? roleNode.posicion_x : 50;
    const initialY = roleNode.posicion_y !== null ? roleNode.posicion_y : 50;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = ((currentX - startX) / rect.width) * 100;
      const deltaY = ((currentY - startY) / rect.height) * 100;

      setPlayRoles(prev => prev.map(r => {
        if (r.id === roleId) {
          return {
            ...r,
            posicion_x: Math.max(2, Math.min(98, initialX + deltaX)),
            posicion_y: Math.max(2, Math.min(98, initialY + deltaY))
          };
        }
        return r;
      }));
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDragEnd = (endEvent: MouseEvent | TouchEvent) => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);




    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  const handleRoleChange = (roleId: string, newRole: string) => {
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          rol_asignado: newRole,
          etiqueta: ROLE_ABBRS[newRole] || newRole.substring(0, 4).toUpperCase()
        };
      }
      return role;
    }));
  };

  const handleCommentChange = (roleId: string, newComment: string) => {
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          comentario: newComment
        };
      }
      return role;
    }));
  };

  // Actualiza la posición de la etiqueta del rol en el estado local
  const handleLabelPositionChange = (roleId: string, pos: LabelPosition) => {
    setPlayRoles(prev => prev.map(role =>
      role.id === roleId ? { ...role, label_position: pos } : role
    ));
  };



  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredPlays = plays.filter(p => activeFilter === 'Todos' || p.tipo === activeFilter);

  // Helper to extract YouTube video ID if present
  const getEmbedVideoUrl = (url: string | null) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const videoId = urlParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    } catch {
      console.warn('URL parsing failed, falling back to raw video tag.');
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        
        {viewMode === 'home' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-12 px-4">
            {/* Card Plan de Partido */}
            <button
              onClick={() => setViewMode('partido')}
              className="flex flex-col items-center justify-center p-8 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-red-500/40 rounded-3xl transition-all duration-300 group shadow-2xl hover:shadow-red-500/5 select-none text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-10 w-10 text-[#CC0E21]" />
              </div>
              <h2 className="text-xl font-black text-slate-100 tracking-wider mb-2">📋 PLAN DE PARTIDO</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Prepara el partido de la jornada seleccionando las jugadas a utilizar, asignando el Once Inicial y generando el PDF multipágina final.
              </p>
            </button>

            {/* Card Biblioteca de Jugadas */}
            <button
              onClick={() => { setViewMode('categories'); setSelectedCategory(null); setSelectedPlay(null); }}
              className="flex flex-col items-center justify-center p-8 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-red-500/40 rounded-3xl transition-all duration-300 group shadow-2xl hover:shadow-red-500/5 select-none text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-10 w-10 text-[#CC0E21]" />
              </div>
              <h2 className="text-xl font-black text-slate-100 tracking-wider mb-2">📚 BIBLIOTECA DE JUGADAS</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Crea, edita, duplica y mantén todas las jugadas estratégicas de balón parado para toda la temporada.
              </p>
            </button>
          </div>
        ) : viewMode === 'partido' ? (
          <ABPPlanPartido 
            players={players} 
            matches={matches || []} 
            onExit={() => setViewMode('home')} 
          />
        ) : viewMode === 'categories' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-[#CC0E21]" />
                  Categorías ABP
                </h2>
                <p className="text-sm text-slate-400 mt-1">Explora la biblioteca de jugadas por tipo de acción a balón parado.</p>
              </div>
              <Button variant="secondary" onClick={() => setViewMode('home')}>
                Volver a Inicio
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ABP_TYPES.map(type => {
                const typePlays = plays.filter(p => p.tipo === type);
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedCategory(type);
                      setViewMode('category-detail');
                    }}
                    className="flex flex-col items-start p-6 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-[#CC0E21]/50 rounded-2xl transition-all duration-200 text-left group shadow-lg hover:shadow-[#CC0E21]/5"
                  >
                    <div className="flex justify-between w-full items-start mb-4">
                      <FolderOpen className="h-10 w-10 text-yellow-500/90 group-hover:text-yellow-400 transition-colors" />
                      <span className="text-xs font-bold text-slate-500 bg-slate-950/50 px-2 py-1 rounded-lg">
                        {typePlays.length}
                      </span>
                    </div>
                    <span className="font-bold text-slate-200 group-hover:text-white line-clamp-2">{type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'category-detail' && selectedCategory ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setViewMode('categories')} className="p-2 hover:bg-slate-800">
                  <ChevronDown className="h-5 w-5 transform rotate-90 text-slate-400" />
                </Button>
                <div>
                  <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-yellow-500" />
                    {selectedCategory}
                  </h2>
                </div>
              </div>
              {isEditMode && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setPlayTitle('');
                    setPlayDesc('');
                    setPlayVideoUrl('');
                    setVideoFile(null);
                    setPlayType(selectedCategory);
                    setIsPlayModalOpen(true);
                  }}
                  className="bg-[#CC0E21] hover:bg-red-500 text-white font-bold w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nueva Jugada
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {plays.filter(p => p.tipo === selectedCategory).map(play => (
                <div
                  key={play.id}
                  onClick={() => {
                    setSelectedPlay(play);
                    setViewMode('play-editor');
                  }}
                  className="group flex flex-col justify-between p-5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-[#CC0E21]/50 rounded-2xl cursor-pointer transition-all h-32"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-slate-200 line-clamp-2 pr-4">{play.titulo}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlay(play.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-all shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <Film className="h-3 w-3" />
                    {play.video_url ? 'Con vídeo' : 'Sin vídeo'}
                  </div>
                </div>
              ))}
              {plays.filter(p => p.tipo === selectedCategory).length === 0 && (
                <div className="col-span-full py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                  <FolderOpen className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold">Carpeta vacía</p>
                  <p className="text-sm text-slate-500 mt-1">Añade jugadas a esta categoría para empezar.</p>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'play-editor' && selectedPlay ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            {/* Toolbar superior */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setViewMode('category-detail')} className="p-2 hover:bg-slate-800">
                  <ChevronDown className="h-5 w-5 transform rotate-90 text-slate-400" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] text-[#CC0E21] font-bold bg-[#CC0E21]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedPlay.tipo}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-100 leading-tight">{selectedPlay.titulo}</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isEditMode && (
                  <>
                    <Button variant="secondary" onClick={openEditModal} className="text-xs border-slate-800 py-1.5 px-3">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar Info
                    </Button>
                    <Button variant="secondary" onClick={handleDuplicatePlay} loading={isDuplicating} className="text-xs border-slate-800 py-1.5 px-3">
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicar
                    </Button>
                    <Button variant="primary" onClick={handleSavePositions} loading={isSaving} className="text-xs bg-[#CC0E21] hover:bg-red-500 text-white font-bold py-1.5 px-4 shadow-lg shadow-red-900/20">
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Guardar Pizarra
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={handleExportPDF} loading={isPdfExporting} className="text-xs border-slate-800 text-slate-200 hover:border-[#CC0E21]/50 font-bold py-1.5 px-3">
                  <FileDown className="h-3.5 w-3.5 text-[#CC0E21] mr-1.5" /> PDF
                </Button>
              </div>
            </div>

            {/* Area de Trabajo del Editor */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* CAMPOGRAMA INTERACTIVO (Hero size) */}
              <div className="xl:col-span-9 flex flex-col space-y-4">
<div className="w-full bg-slate-900/20 border border-slate-800/60 rounded-3xl p-4 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Posicionamiento Táctico
                      </span>
                      {isRealPositionPlayType(selectedPlay.tipo) && (
                        <div className="flex items-center gap-1.5 mr-auto ml-4">
                          <span className="text-[10px] text-slate-450">Sistema:</span>
                          <select
                            value={selectedTacticalSystem}
                            onChange={(e) => handleApplyTacticalSystem(e.target.value as keyof typeof SISTEMAS_TACTICOS)}
                            className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-[#CC0E21] rounded px-1.5 py-0.5 outline-none"
                          >
                            <option value="1-4-3-3">1-4-3-3</option>
                            <option value="1-4-2-3-1">1-4-2-3-1</option>
                            <option value="1-4-4-2">1-4-4-2</option>
                            <option value="1-3-5-2">1-3-5-2</option>
                          </select>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          variant={showAdvanced ? "primary" : "secondary"}
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className={`py-1 px-2.5 text-[10px] h-auto border transition-all ${
                            showAdvanced ? 'bg-[#CC0E21] text-white border-transparent' : 'border-slate-800'
                          }`}
                          title="Muestra u oculta los puestos manuales de la jugada"
                        >
                          <Layers className="h-3 w-3 mr-1" /> {showAdvanced ? "Ocultar Puestos" : "Ver Puestos"}
                        </Button>
                        {isEditMode && (
                          <Button 
                            variant="secondary" 
                            onClick={handleResetPositions} 
                            className="py-1 px-2.5 text-[10px] h-auto border border-slate-800"
                            title="Restablece posiciones a su esquema inicial"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Reiniciar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Area de Fútbol (SVG y Fichas Drag) */}
                    <div 
                      ref={containerRef}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      className="relative w-full aspect-[4/3] bg-emerald-950/80 rounded-2xl border-2 border-emerald-500/25 overflow-hidden select-none"
                    >
                      {(() => {
                        const view = getFieldView(selectedPlay.tipo, selectedPlay.zona);
                        if (view === 'full') {
                          return (
                            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                              {/* Contorno del campo */}
                              <rect x="15" y="15" width="370" height="270" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Línea central */}
                              <line x1="200" y1="15" x2="200" y2="285" stroke="#fff" strokeWidth="1.5" />
                              {/* Círculo central */}
                              <circle cx="200" cy="150" r="45" fill="none" stroke="#fff" strokeWidth="1.5" />
                              <circle cx="200" cy="150" r="2.5" fill="#fff" />
                              
                              {/* Área Grande Izquierda */}
                              <rect x="15" y="65" width="60" height="170" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Área Pequeña Izquierda */}
                              <rect x="15" y="105" width="22" height="90" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Punto de Penalti Izquierdo */}
                              <circle cx="55" cy="150" r="2" fill="#fff" />
                              {/* Semicírculo Área Izquierda */}
                              <path d="M 75 115 A 40 40 0 0 1 75 185" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Portería Izquierda */}
                              <rect x="7" y="115" width="8" height="70" fill="none" stroke="#fff" strokeWidth="1.8" />
                              
                              {/* Área Grande Derecha */}
                              <rect x="325" y="65" width="60" height="170" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Área Pequeña Derecha */}
                              <rect x="363" y="105" width="22" height="90" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Punto de Penalti Derecho */}
                              <circle cx="345" cy="150" r="2" fill="#fff" />
                              {/* Semicírculo Área Derecha */}
                              <path d="M 325 115 A 40 40 0 0 0 325 185" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Portería Derecha */}
                              <rect x="385" y="115" width="8" height="70" fill="none" stroke="#fff" strokeWidth="1.8" />
                            </svg>
                          );
                        } else if (view === 'midfield') {
                          return (
                            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                              {/* Contorno del campo */}
                              <rect x="15" y="15" width="370" height="270" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Línea central */}
                              <line x1="200" y1="15" x2="200" y2="285" stroke="#fff" strokeWidth="1.5" />
                              {/* Círculo central */}
                              <circle cx="200" cy="150" r="45" fill="none" stroke="#fff" strokeWidth="1.5" />
                              <circle cx="200" cy="150" r="2.5" fill="#fff" />
                              <text x="200" y="250" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.5">ZONA MEDIA (MEDIO CAMPO)</text>
                            </svg>
                          );
                        } else if (view === 'defense') {
                          return (
                            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                              {/* Líneas principales del área */}
                              <rect x="0" y="0" width="400" height="300" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Línea de fondo y córner flag arcs */}
                              <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="2" />
                              <path d="M 400 10 A 10 10 0 0 0 390 0" fill="none" stroke="#fff" strokeWidth="2" />
                              
                              {/* Área Grande */}
                              <rect x="75" y="0" width="250" height="110" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Área Pequeña */}
                              <rect x="140" y="0" width="120" height="40" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Punto de Penalti */}
                              <circle cx="200" cy="80" r="2.5" fill="#fff" />
                              {/* Semi-circunferencia del área grande */}
                              <path d="M 150 110 A 60 60 0 0 0 250 110" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Portería */}
                              <rect x="165" y="-6" width="70" height="6" fill="none" stroke="#fff" strokeWidth="2" />
                              <text x="200" y="125" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.5">ÁREA PROPIA (DEFENSA)</text>
                            </svg>
                          );
                        } else {
                          return (
                            <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                              {/* Líneas principales del área */}
                              <rect x="0" y="0" width="400" height="300" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Línea de fondo y córner flag arcs */}
                              <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="2" />
                              <path d="M 400 10 A 10 10 0 0 0 390 0" fill="none" stroke="#fff" strokeWidth="2" />
                              
                              {/* Área Grande */}
                              <rect x="75" y="0" width="250" height="110" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Área Pequeña */}
                              <rect x="140" y="0" width="120" height="40" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Punto de Penalti */}
                              <circle cx="200" cy="80" r="2.5" fill="#fff" />
                              {/* Semi-circunferencia del área grande */}
                              <path d="M 150 110 A 60 60 0 0 0 250 110" fill="none" stroke="#fff" strokeWidth="1.5" />
                              {/* Portería */}
                              <rect x="165" y="-6" width="70" height="6" fill="none" stroke="#fff" strokeWidth="2" />
                              <text x="200" y="125" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.5">ÁREA RIVAL (ATAQUE)</text>
                            </svg>
                          );
                        }
                      })()}

                      {/* Renderizado de Fichas/Roles — usa ABPPlayerNode (mismo visual que PDF) */}
                      {playRoles.map((role) => {
                        const isRealPosType = isRealPositionPlayType(selectedPlay.tipo);
                        const px = role.posicion_x !== null ? role.posicion_x : 50;
                        const py = role.posicion_y !== null ? role.posicion_y : 50;
                        const label = role.etiqueta || (isRealPosType ? POSITION_ABBRS[role.rol_asignado] : ROLE_ABBRS[role.rol_asignado]) || 'P';

                        return (
                          <div
                            key={role.id}
                            style={{
                              left: `${px}%`,
                              top: `${py}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className={`absolute z-10 cursor-move transition-transform duration-100 ${
                              activeNodeId === role.id ? 'ring-2 ring-[#CC0E21] ring-offset-2 ring-offset-emerald-950 scale-105 shadow-2xl rounded-full' : ''
                            }`}
                            onMouseDown={(e) => {
                              setActiveNodeId(role.id);
                              handleDragStart(e, role.id);
                            }}
                            onTouchStart={(e) => {
                              setActiveNodeId(role.id);
                              handleDragStart(e, role.id);
                            }}
                          >
                            <ABPPlayerNode
                              role={role}
                              roleLabel={label}
                              isExport={false}
                              onChangeLabelPosition={(pos) => handleLabelPositionChange(role.id, pos)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-full flex justify-between items-center mt-2.5">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-slate-600" />
                        Arrastra fichas para moverlas, o suelta jugadores encima para asignarlos. Arrastra a la sidebar para liberarlos.
                      </span>
                      {showAdvanced && (
                        <Button 
                          variant="secondary"
                          onClick={handleAddRoleNode}
                          className="py-1 px-2 text-[10px] h-auto flex items-center gap-1 border border-slate-800 text-[#CC0E21]"
                        >
                          <PlusCircle className="h-3 w-3" /> Añadir Puesto
                        </Button>
                      )}
                    </div>
                  </div>

                
                {/* Instrucciones & Vídeo debajo de la pizarra */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instrucciones */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col h-[220px]">
                    <h4 className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-[#CC0E21]" /> Instrucciones tácticas
                    </h4>
                    <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex-1 overflow-y-auto custom-scrollbar">
                      {selectedPlay.descripcion ? (
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {selectedPlay.descripcion}
                        </p>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-600 italic">Sin instrucciones.</div>
                      )}
                    </div>
                  </div>

                  {/* Vídeo */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col h-[220px]">
                    <h4 className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 shrink-0">
                      <Film className="h-3.5 w-3.5 text-blue-500" /> Vídeo táctico
                    </h4>
                    {selectedPlay.video_url ? (
                      <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-800 bg-black">
                        {getEmbedVideoUrl(selectedPlay.video_url) ? (
                          <iframe
                            src={getEmbedVideoUrl(selectedPlay.video_url) || ''}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={selectedPlay.video_url}
                            controls
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="border border-slate-850 bg-slate-950/20 rounded-xl text-center text-xs text-slate-600 italic flex items-center justify-center flex-1">
                        Sin vídeo asociado.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BARRA LATERAL (Roles y Opciones) */}
              <div className="xl:col-span-3">
<div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col h-full">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#CC0E21]" /> Puestos de la jugada ({playRoles.length})
                    </h3>

                    {loadingRoles ? (
                      <Skeleton className="h-40 w-full" />
                    ) : playRoles.length === 0 ? (
                      <p className="text-xs text-slate-550 italic text-center py-6 border border-dashed border-slate-800 rounded-xl">
                        No hay puestos colocados en el campo. Usa &quot;Añadir Puesto&quot;.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {playRoles.map((role) => {
                          const isRealPosType = isRealPositionPlayType(selectedPlay.tipo);
                          const { funcion_tactica, comentario } = parseComentario(role.comentario);
                          const label = role.etiqueta || (isRealPosType ? POSITION_ABBRS[role.rol_asignado] : ROLE_ABBRS[role.rol_asignado]) || 'P';

                          return (
                            <div 
                              key={role.id}
                              className="bg-slate-950/60 border border-slate-855 p-2.5 rounded-xl space-y-2 transition-all hover:border-slate-800"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="h-6 w-8 bg-slate-900 border border-slate-800 text-[9px] text-[#CC0E21] font-bold rounded flex items-center justify-center">
                                    {label}
                                  </span>
                                  {isRealPosType ? (
                                    <select
                                      value={role.rol_asignado}
                                      onChange={(e) => handleRoleChange(role.id, e.target.value)}
                                      className="bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 rounded px-2 py-0.5 outline-none focus:border-[#CC0E21]"
                                    >
                                      {Object.keys(POSITION_ABBRS).map((pos) => (
                                        <option key={pos} value={pos}>{pos}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <select
                                      value={role.rol_asignado}
                                      onChange={(e) => handleRoleChange(role.id, e.target.value)}
                                      className="bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 rounded px-2 py-0.5 outline-none focus:border-[#CC0E21]"
                                    >
                                      {getRolesForPlayType(selectedPlay.tipo).map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  )}

                                  {isRealPosType && (
                                    <select
                                      value={funcion_tactica}
                                      onChange={(e) => {
                                        const nextCom = serializeComentario(e.target.value, comentario);
                                        handleCommentChange(role.id, nextCom);
                                      }}
                                      className="bg-slate-900/60 border border-slate-800 text-[10px] text-[#CC0E21] rounded px-1.5 py-0.5 outline-none"
                                    >
                                      <option value="">-- Sin función --</option>
                                      <option value="Sacador">Sacador</option>
                                      <option value="Apoyo">Apoyo</option>
                                      <option value="Tercer hombre">Tercer hombre</option>
                                      <option value="Receptor">Receptor</option>
                                      <option value="Profundidad">Profundidad</option>
                                      <option value="Vigilancia">Vigilancia</option>
                                      <option value="Cobertura">Cobertura</option>
                                    </select>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleRemoveRoleNode(role.id)}
                                  className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-500"
                                  title="Borrar este puesto de la jugada"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>


                              {/* Comentario / Movimiento */}
                              <input
                                type="text"
                                value={isRealPosType ? comentario : (role.comentario || '')}
                                onChange={(e) => {
                                  if (isRealPosType) {
                                    const nextCom = serializeComentario(funcion_tactica, e.target.value);
                                    handleCommentChange(role.id, nextCom);
                                  } else {
                                    handleCommentChange(role.id, e.target.value);
                                  }
                                }}
                                placeholder={isRealPosType ? "Añadir movimiento o variante táctica..." : "Ej. Bloqueo al central o desmarque de arrastre..."}
                                className="w-full bg-slate-900/60 border border-slate-855/80 rounded px-2 py-0.5 text-[10px] text-slate-400 placeholder-slate-650 outline-none focus:border-slate-800"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              
            </div>
          </div>
        ) : null}
      
      {/* Hidden container for high-res PDF Export */}
      {selectedPlay && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
          <div id="abp-field-export-container">
            <ABPFieldExport
              playRoles={playRoles}
              playType={selectedPlay.tipo}
              playZona={selectedPlay.zona}
            />
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: NUEVA JUGADA ABP */}
      {/* ========================================================================= */}
      <Modal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} title="Crear Nueva Jugada ABP">
        <form onSubmit={handleCreatePlay} className="space-y-4">
          <Input
            label="Título de la Jugada"
            type="text"
            required
            placeholder="Ej. Córner al primer palo (Bloqueo y arrastre)"
            value={playTitle}
            onChange={(e) => setPlayTitle(e.target.value)}
          />

          <Select
            label="Tipo de ABP"
            value={playType}
            onChange={(e) => setPlayType(e.target.value as ABPType)}
            options={ABP_TYPES.map(t => ({ value: t, label: t }))}
          />

          {(playType === 'Saque de banda ofensivo' || playType === 'Saque de banda defensivo') && (
            <Select
              label="Zona del Campo (Tercio)"
              value={playZone}
              onChange={(e) => setPlayZone(e.target.value as 'Inicio' | 'Medio' | 'Último tercio')}
              options={[
                { value: 'Inicio', label: 'Inicio (tercio defensivo)' },
                { value: 'Medio', label: 'Medio (tercio medio)' },
                { value: 'Último tercio', label: 'Último tercio' }
              ]}
            />
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Instrucciones y Ejecución</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
              rows={4}
              placeholder="Detalla la trayectoria del balón, los desmarques y las vigilancias defensivas..."
              value={playDesc}
              onChange={(e) => setPlayDesc(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Input
              label="URL de Vídeo Táctico (YouTube / Vimeo)"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={playVideoUrl}
              onChange={(e) => setPlayVideoUrl(e.target.value)}
            />
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">O subir archivo de vídeo (.mp4/.mov)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsPlayModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSaving} className="bg-[#CC0E21] hover:bg-red-500 text-white font-bold">
              Guardar Jugada
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR INFORMACIÓN JUGADA */}
      {/* ========================================================================= */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Información de la Jugada">
        <form onSubmit={handleEditPlay} className="space-y-4">
          <Input
            label="Título de la Jugada"
            type="text"
            required
            value={playTitle}
            onChange={(e) => setPlayTitle(e.target.value)}
          />

          <Select
            label="Tipo de ABP"
            value={playType}
            onChange={(e) => setPlayType(e.target.value as ABPType)}
            options={ABP_TYPES.map(t => ({ value: t, label: t }))}
          />

          {(playType === 'Saque de banda ofensivo' || playType === 'Saque de banda defensivo') && (
            <Select
              label="Zona del Campo (Tercio)"
              value={playZone}
              onChange={(e) => setPlayZone(e.target.value as 'Inicio' | 'Medio' | 'Último tercio')}
              options={[
                { value: 'Inicio', label: 'Inicio (tercio defensivo)' },
                { value: 'Medio', label: 'Medio (tercio medio)' },
                { value: 'Último tercio', label: 'Último tercio' }
              ]}
            />
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Instrucciones y Ejecución</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21]"
              rows={4}
              value={playDesc}
              onChange={(e) => setPlayDesc(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Input
              label="URL de Vídeo Táctico (YouTube / Vimeo)"
              type="text"
              value={playVideoUrl}
              onChange={(e) => setPlayVideoUrl(e.target.value)}
            />
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">Cambiar archivo de vídeo (.mp4/.mov)</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSaving} className="bg-[#CC0E21] hover:bg-red-500 text-white font-bold">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hidden container for high-res PDF Export */}
      {selectedPlay && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
          <div id="abp-field-export-container">
            <ABPFieldExport
              playRoles={playRoles}
              playType={selectedPlay.tipo}
              playZona={selectedPlay.zona}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
