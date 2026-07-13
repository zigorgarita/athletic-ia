'use client';

import React, { useState } from 'react';
import { Player, ABPPlayerRole, MatchABPPlayerAssignment, ABPType } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { UserCheck, X } from 'lucide-react';

interface RoleWithAssignment extends ABPPlayerRole {
  assignment?: MatchABPPlayerAssignment;
  assignedPlayer?: Player;
}

interface ABPPlanFieldProps {
  planId: string;
  tipo: string;
  zona: string | null;
  roles: RoleWithAssignment[];
  players: Player[];
  lineupPlayerIds: string[]; // IDs de los 11 titulares
  onAssignPlayer: (roleId: string, playerId: string) => void;
  onRemovePlayer: (roleId: string) => void;
}

// Map database string to typed ABPType
const getABPType = (tipo: string): ABPType => {
  return tipo as ABPType;
};

// Helper to determine the field view exactly like ABPSection.tsx
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

export function ABPPlanField({
  planId,
  tipo,
  zona,
  roles,
  players,
  lineupPlayerIds,
  onAssignPlayer,
  onRemovePlayer
}: ABPPlanFieldProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const abpType = getABPType(tipo);
  const view = getFieldView(abpType, zona);

  // Helper to check assignment status of a player
  const getPlayerAssignment = (playerId: string) => {
    return roles.find(r => r.assignedPlayer?.id === playerId);
  };

  const handlePlayerClick = (playerId: string) => {
    if (selectedRoleId) {
      onAssignPlayer(selectedRoleId, playerId);
      setSelectedRoleId(null);
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(prev => prev === playerId ? null : playerId);
    }
  };

  const handleNodeClick = (roleId: string) => {
    if (selectedPlayerId) {
      onAssignPlayer(roleId, selectedPlayerId);
      setSelectedRoleId(null);
      setSelectedPlayerId(null);
    } else {
      setSelectedRoleId(prev => prev === roleId ? null : roleId);
    }
  };

  // Group players by starters vs bench
  const starters = players.filter(p => lineupPlayerIds.includes(p.id));
  const bench = players.filter(p => !lineupPlayerIds.includes(p.id));

  const assignedCount = roles.filter(r => r.assignedPlayer || r.player_id).length;

  // Render player list item
  const renderPlayerRow = (p: Player) => {
    const assignment = getPlayerAssignment(p.id);
    const isSelected = selectedPlayerId === p.id;
    
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => handlePlayerClick(p.id)}
        className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all text-left ${
          isSelected
            ? 'bg-green-500/10 border-green-500 text-green-200 ring-2 ring-green-500/30'
            : assignment
              ? 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60 hover:opacity-80'
              : 'bg-slate-950/60 border-slate-850 text-slate-200 hover:border-slate-800 hover:bg-slate-900/30'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Avatar src={p.foto_url} name={p.nombre.substring(0, 2)} className="w-7 h-7 text-[10px]" />
          <div className="truncate">
            <div className="font-bold truncate text-slate-200">
              {p.nombre} {p.apellidos || ''}
            </div>
            <div className="text-[9px] text-slate-400 font-semibold">
              #{p.dorsal || '-'} • {p.demarcacion || 'Jugador'}
            </div>
          </div>
        </div>
        <div>
          {assignment ? (
            <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 uppercase font-black tracking-wider truncate max-w-[80px] block text-center">
              {assignment.etiqueta || assignment.rol_asignado}
            </span>
          ) : (
            <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-wider text-center block">
              Libre
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="relative w-full flex flex-col xl:flex-row gap-4">
      {/* Campo de fútbol */}
      <div id={`abp-plan-field-${planId}`} className="relative flex-1 aspect-[4/3] bg-emerald-950/80 rounded-2xl border-2 border-emerald-500/25 overflow-hidden select-none">
        {/* Renderizado del campo según la vista */}
        {(() => {
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

        {/* Nodos de la jugada */}
        {roles.map((role) => {
          const isSelected = selectedRoleId === role.id;
          const assigned = role.assignedPlayer;
          const isTitular = assigned ? lineupPlayerIds.includes(assigned.id) : false;

          const px = role.posicion_x !== null ? role.posicion_x : 50;
          const py = role.posicion_y !== null ? role.posicion_y : 50;

          return (
            <div
              key={role.id}
              className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                isSelected ? 'scale-110 z-30' : 'z-10 hover:scale-105'
              }`}
              style={{ left: `${px}%`, top: `${py}%` }}
              onClick={() => handleNodeClick(role.id)}
            >
              {assigned ? (
                <div 
                  className={`px-2.5 py-1 rounded-full flex items-center justify-center text-white font-black text-[9px] shadow-lg border-2 transition-all whitespace-nowrap min-w-[28px] ${
                    isTitular 
                      ? 'bg-green-600 border-green-400 hover:bg-green-500' 
                      : 'bg-blue-600 border-blue-400 hover:bg-blue-500'
                  } ${
                    isSelected ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-emerald-950 scale-105' : ''
                  }`}
                  title={assigned.nombre}
                >
                  {assigned.nombre.split(' ')[0]}
                </div>
              ) : (
                <div 
                  className={`w-9 h-9 rounded-full bg-slate-900/90 border-2 border-slate-600/80 border-dashed flex items-center justify-center shadow-lg hover:border-white transition-all ${
                    isSelected ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-emerald-950 scale-105' : ''
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                </div>
              )}
              
              <div className="mt-1 bg-black/85 border border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-200 whitespace-nowrap shadow-md">
                {role.etiqueta || role.rol_asignado}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel lateral persistent de Plantilla / Once Inicial */}
      <div className="w-full xl:w-72 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col p-4">
        {assignedCount === 11 && (
          <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-450 font-bold text-center flex items-center justify-center gap-1.5 shadow-md">
            ✓ ABP completa (11/11 jugadores asignados)
          </div>
        )}
        {/* Banner de flujo de asignación manual */}
        {selectedRoleId ? (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-slate-200">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold flex items-center gap-1.5 text-yellow-500">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                Posición: {roles.find(r => r.id === selectedRoleId)?.etiqueta || roles.find(r => r.id === selectedRoleId)?.rol_asignado}
              </span>
              <button 
                type="button" 
                onClick={() => { setSelectedRoleId(null); setSelectedPlayerId(null); }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed font-semibold mb-2">
              Posición seleccionada. Ahora elige un jugador.
            </p>
            {roles.find(r => r.id === selectedRoleId)?.assignedPlayer && (
              <button
                type="button"
                className="w-full py-1.5 text-center bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                onClick={() => {
                  onRemovePlayer(selectedRoleId);
                  setSelectedRoleId(null);
                }}
              >
                Quitar jugador actual
              </button>
            )}
          </div>
        ) : selectedPlayerId ? (
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-slate-200">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold flex items-center gap-1.5 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Jugador seleccionado
              </span>
              <button 
                type="button" 
                onClick={() => { setSelectedRoleId(null); setSelectedPlayerId(null); }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
              Jugador seleccionado: <span className="font-bold text-green-300">{players.find(p => p.id === selectedPlayerId)?.nombre}</span>. Ahora pulsa una posición del campo.
            </p>
          </div>
        ) : (
          <div className="mb-3 p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-xs text-slate-350 text-center font-semibold leading-relaxed flex flex-col items-center justify-center gap-1.5">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Asignación de Jugadores</div>
            <div className="text-[11px] text-slate-250">
              Selecciona un jugador <span className="text-[#CC0E21] font-bold mx-0.5">➜</span> Pulsa una posición del campo
            </div>
            <div className="text-[9px] text-slate-500 font-normal">
              (o viceversa)
            </div>
          </div>
        )}

        {/* Listado de Jugadores */}
        <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] xl:max-h-[420px] pr-1 custom-scrollbar">
          {/* Once Inicial */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-900/60 flex justify-between items-center sticky top-0 z-10">
              <span>ONCE INICIAL</span>
              <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-1 py-0.2 rounded text-[7px]">
                {starters.length} TITULARES
              </span>
            </div>
            {starters.length === 0 ? (
              <p className="text-[10px] text-slate-550 italic py-2 pl-2">No hay once guardado para esta jornada.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {starters.map(renderPlayerRow)}
              </div>
            )}
          </div>

          {/* Suplentes y Resto */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-black text-slate-450 uppercase tracking-widest bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-900/60 flex justify-between items-center sticky top-0 z-10">
              <span>SUPLENTES / PLANTILLA</span>
              <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded text-[7px]">
                {bench.length} JUGADORES
              </span>
            </div>
            {bench.length === 0 ? (
              <p className="text-[10px] text-slate-550 italic py-2 pl-2">No hay suplentes cargados.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {bench.map(renderPlayerRow)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
