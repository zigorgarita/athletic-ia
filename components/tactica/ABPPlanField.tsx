'use client';

import React, { useState } from 'react';
import { Player, ABPPlayerRole, MatchABPPlayerAssignment } from '@/types';
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

  // Determinar la vista del campo basada en el tipo y zona
  const getFieldView = () => {
    if (tipo === 'Saque inicial' || tipo.includes('medio')) return 'full';
    if (tipo.includes('banda')) {
      if (tipo.includes('ofensivo')) {
        if (zona === 'Inicio') return 'defense';
        if (zona === 'Medio') return 'midfield';
        return 'attack';
      } else {
        if (zona === 'Inicio') return 'attack';
        if (zona === 'Medio') return 'midfield';
        return 'defense';
      }
    }
    if (tipo.toLowerCase().includes('defensiv')) return 'defense';
    return 'attack';
  };

  const fieldView = getFieldView();

  return (
    <div className="relative w-full flex flex-col md:flex-row gap-4 h-full">
      {/* Campo de fútbol */}
      <div className="relative flex-1 bg-[#2E7D32] rounded-xl overflow-hidden border-2 border-white/10 min-h-[400px]">
        {/* Líneas del campo (simplificadas para visualización) */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white"></div>
          {/* Áreas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-b-0 border-white"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-t-0 border-white"></div>
        </div>

        {/* Nodos de la jugada */}
        {roles.map((role) => {
          const isSelected = selectedRoleId === role.id;
          const assigned = role.assignedPlayer;
          const isTitular = assigned ? lineupPlayerIds.includes(assigned.id) : false;

          return (
            <div
              key={role.id}
              className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${isSelected ? 'scale-110 z-20' : 'z-10 hover:scale-105'}`}
              style={{ left: `${role.posicion_x}%`, top: `${role.posicion_y}%` }}
              onClick={() => setSelectedRoleId(isSelected ? null : role.id)}
            >
              {assigned ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 ${isTitular ? 'bg-green-600 border-green-400' : 'bg-blue-600 border-blue-400'}`}>
                  {assigned.dorsal || assigned.nombre.charAt(0)}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/80 border-2 border-white/80 border-dashed flex items-center justify-center shadow-lg">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className="mt-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                {role.etiqueta || role.rol_asignado}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel lateral para el nodo seleccionado */}
      {selectedRoleId && (
        <div className="w-full md:w-64 bg-slate-900 rounded-xl border border-slate-700 flex flex-col p-3">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
            <h4 className="text-xs font-bold text-slate-200">Asignar Jugador</h4>
            <button onClick={() => setSelectedRoleId(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[350px]">
            {/* Opción para desasignar */}
            {roles.find(r => r.id === selectedRoleId)?.assignedPlayer && (
               <button
                 className="w-full text-left p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs flex items-center gap-2 mb-4"
                 onClick={() => onRemovePlayer(selectedRoleId)}
               >
                 <X className="w-3 h-3" /> Quitar jugador actual
               </button>
            )}

            <div className="text-[10px] font-bold text-slate-500 mb-1">TITULARES (PIZARRA)</div>
            {players
              .filter(p => lineupPlayerIds.includes(p.id))
              .map(p => (
              <button
                key={p.id}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                onClick={() => onAssignPlayer(selectedRoleId, p.id)}
              >
                <Avatar src={p.foto_url} name={p.nombre.substring(0, 2)} className="w-6 h-6 text-[10px]" />
                <span className="text-xs text-slate-300 truncate">{p.nombre}</span>
              </button>
            ))}

            <div className="text-[10px] font-bold text-slate-500 mt-3 mb-1">RESTO DE PLANTILLA</div>
            {players
              .filter(p => !lineupPlayerIds.includes(p.id))
              .map(p => (
              <button
                key={p.id}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left opacity-70 hover:opacity-100"
                onClick={() => onAssignPlayer(selectedRoleId, p.id)}
              >
                <Avatar src={p.foto_url} name={p.nombre.substring(0, 2)} className="w-6 h-6 text-[10px]" />
                <span className="text-xs text-slate-300 truncate">{p.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
