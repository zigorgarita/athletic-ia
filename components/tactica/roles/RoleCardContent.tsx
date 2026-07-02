'use client';

import React from 'react';
import { TacticalRoleCard, Player } from '@/types';
import { Shield, Zap, Sparkles, BookOpen } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface RoleCardContentProps {
  posicion: string;
  assignedPlayer: Player | null;
  card: TacticalRoleCard | null;
}

export function RoleCardContent({ posicion, assignedPlayer, card }: RoleCardContentProps) {
  return (
    <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-4">
      {/* Player Header */}
      <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
        <div className="flex items-center gap-2">
          {assignedPlayer ? (
            <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="sm" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">
              {posicion}
            </div>
          )}
          <div>
            <span className="font-bold text-slate-200 text-xs block leading-none">
              {assignedPlayer ? assignedPlayer.nombre : `Posición libre`}
            </span>
            <span className="text-[8px] font-black text-[#CC0E21] bg-[#CC0E21]/15 px-1 py-0.2 rounded mt-0.5 inline-block">
              {posicion} {assignedPlayer ? `#${assignedPlayer.dorsal}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Phases Grid */}
      <div className="grid grid-cols-1 gap-2.5 text-[11px] text-slate-300">
        {card?.fase_ofensiva && (
          <div className="space-y-0.5">
            <span className="font-bold text-[9px] text-yellow-500 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Zap className="h-2.5 w-2.5" /> Ataque
            </span>
            <p className="italic leading-relaxed">{card.fase_ofensiva}</p>
          </div>
        )}

        {card?.fase_defensiva && (
          <div className="space-y-0.5 pt-1.5 border-t border-slate-850/60">
            <span className="font-bold text-[9px] text-blue-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Shield className="h-2.5 w-2.5" /> Defensa
            </span>
            <p className="italic leading-relaxed">{card.fase_defensiva}</p>
          </div>
        )}

        {card?.transiciones && (
          <div className="space-y-0.5 pt-1.5 border-t border-slate-850/60">
            <span className="font-bold text-[9px] text-orange-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <Sparkles className="h-2.5 w-2.5" /> Transición
            </span>
            <p className="italic leading-relaxed">{card.transiciones}</p>
          </div>
        )}

        {card?.instrucciones_especificas && (
          <div className="space-y-0.5 pt-1.5 border-t border-slate-850/60">
            <span className="font-bold text-[9px] text-purple-400 uppercase tracking-wider flex items-center gap-1 leading-none">
              <BookOpen className="h-2.5 w-2.5" /> Partido
            </span>
            <p className="italic leading-relaxed">{card.instrucciones_especificas}</p>
          </div>
        )}

        {!card && (
          <span className="text-slate-500 italic text-center block py-2">
            Sin instrucciones tácticas añadidas para esta posición.
          </span>
        )}
      </div>
    </div>
  );
}
