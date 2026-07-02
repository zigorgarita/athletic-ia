'use client';

import React from 'react';
import { Player } from '@/types';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface PlayerAssignmentSidebarProps {
  players: Player[];
  assignedPlayerIds: string[];
  isEditMode: boolean;
  onPlayerClick: (player: Player) => void;
}

const groupPlayers = (playerList: Player[]) => {
  const groups: Record<string, { label: string; list: Player[] }> = {
    Portero: { label: '🧤 Porteros', list: [] },
    Lateral: { label: '🛡️ Laterales', list: [] },
    Central: { label: '🧱 Centrales', list: [] },
    Centrocampista: { label: '⚙️ Centrocampistas', list: [] },
    Mediapunta: { label: '🎯 Mediapuntas', list: [] },
    Extremo: { label: '⚡ Extremos', list: [] },
    Delantero: { label: '🎯 Delanteros', list: [] },
    Otros: { label: '📋 Otros', list: [] }
  };

  playerList.forEach(p => {
    const pos = p.demarcacion || '';
    const posLower = pos.toLowerCase();

    if (posLower.includes('portero')) {
      groups.Portero.list.push(p);
    } else if (posLower.includes('lateral')) {
      groups.Lateral.list.push(p);
    } else if (posLower.includes('central') || posLower === 'defensa') {
      groups.Central.list.push(p);
    } else if (posLower.includes('mediapunta') || posLower.includes('media punta')) {
      groups.Mediapunta.list.push(p);
    } else if (posLower.includes('extremo')) {
      groups.Extremo.list.push(p);
    } else if (posLower.includes('delantero')) {
      groups.Delantero.list.push(p);
    } else if (posLower.includes('centrocampista') || posLower.includes('pivote') || posLower.includes('interior')) {
      groups.Centrocampista.list.push(p);
    } else {
      groups.Otros.list.push(p);
    }
  });

  Object.keys(groups).forEach(k => {
    groups[k].list.sort((a, b) => a.dorsal - b.dorsal);
  });

  return [
    groups.Portero,
    groups.Lateral,
    groups.Central,
    groups.Centrocampista,
    groups.Mediapunta,
    groups.Extremo,
    groups.Delantero,
    groups.Otros
  ].filter(g => g.list.length > 0);
};

export function PlayerAssignmentSidebar({
  players,
  assignedPlayerIds,
  isEditMode,
  onPlayerClick,
}: PlayerAssignmentSidebarProps) {
  const grouped = React.useMemo(() => groupPlayers(players), [players]);

  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[600px] overflow-hidden">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
        <Users className="h-3.5 w-3.5 text-[#CC0E21]" /> Plantilla
      </h3>

      <p className="text-[10px] text-slate-500 mb-3 leading-tight">
        Arrastra un jugador al campo o haz clic en su ficha para colocarlo en cualquier posición libre.
      </p>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {grouped.map(group => (
          <div key={group.label} className="space-y-1">
            <h4 className="text-[9px] font-bold text-slate-450 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-900 sticky top-0 z-10">
              {group.label} ({group.list.length})
            </h4>
            <div className="space-y-1.5 pt-1">
              {group.list.map((p) => {
                const isAssigned = assignedPlayerIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    draggable={!isAssigned && isEditMode}
                    onDragStart={(e) => {
                      if (!isAssigned && isEditMode) {
                        e.dataTransfer.setData('text/plain', p.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onClick={() => onPlayerClick(p)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all select-none active:cursor-grabbing ${
                      isAssigned
                        ? 'bg-slate-900/20 border-slate-850/40 text-slate-500 opacity-60'
                        : isEditMode
                          ? 'bg-slate-950/60 border-slate-850/60 text-slate-200 hover:border-slate-800 hover:bg-slate-950 cursor-grab'
                          : 'bg-slate-950/30 border-slate-900 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                      <div className="truncate">
                        <span className="block font-semibold truncate leading-none mb-0.5">{p.nombre}</span>
                        <span className="text-[9px] text-slate-500 font-medium">#{p.dorsal} - {p.demarcacion}</span>
                      </div>
                    </div>

                    {isAssigned && (
                      <span className="text-[8px] bg-[#CC0E21]/10 text-[#CC0E21] px-1 py-0.2 rounded border border-[#CC0E21]/15 shrink-0">
                        PUESTO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
