'use client';

import React from 'react';
import { TacticalRoleCard, PositionNode, Player } from '@/types';
import { RoleCardContent } from './RoleCardContent';
import { LayoutList, Trophy } from 'lucide-react';

interface BriefingViewProps {
  nodesPropio: PositionNode[];
  players: Player[];
  roleCards: TacticalRoleCard[];
}

export function BriefingView({ nodesPropio, players, roleCards }: BriefingViewProps) {
  console.log('--- BriefingView Render ---');
  console.log('Active Matchup ID:', roleCards[0]?.matchup_id || 'null');
  console.log('Number of roleCards:', roleCards.length);
  console.log('roleCards positions:', roleCards.map(c => c.posicion_label));
  console.log('nodesPropio positions:', nodesPropio.map(n => n.label));

  const POR = nodesPropio.filter(n => n.label === 'POR');
  const DEF = nodesPropio.filter(n => ['LD', 'LI', 'DFC', 'CT', 'DCD', 'DCI', 'CAD', 'CAI'].includes(n.label));
  const MED = nodesPropio.filter(n => ['MCD', 'MC', 'MCO', 'MD', 'MI', 'MVD', 'MVI', 'PIV'].includes(n.label));
  const DEL = nodesPropio.filter(n => !['POR', 'LD', 'LI', 'DFC', 'CT', 'DCD', 'DCI', 'CAD', 'CAI', 'MCD', 'MC', 'MCO', 'MD', 'MI', 'MVD', 'MVI', 'PIV'].includes(n.label));
  const usedCardIndexes = new Set<number>();

  const renderLineSection = (title: string, icon: string, lineNodes: PositionNode[]) => {
    if (lineNodes.length === 0) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-900 inline-block">
          {icon} {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lineNodes.map(node => {
            const assignedPlayer = players.find(p => p.id === node.player_id);
            
            // Find the first unused card for this position
            const cardIndex = roleCards.findIndex((c, i) => c.posicion_label === node.label && !usedCardIndexes.has(i));
            let card = null;
            
            if (cardIndex !== -1) {
              card = roleCards[cardIndex];
              usedCardIndexes.add(cardIndex);
            } else {
              // Fallback to the first available card for this position if we run out
              card = roleCards.find(c => c.posicion_label === node.label) || null;
            }
            
            return (
              <RoleCardContent
                key={node.id}
                posicion={node.label}
                assignedPlayer={assignedPlayer || null}
                card={card}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
        <LayoutList className="h-5 w-5 text-[#CC0E21]" />
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
          Briefing Táctico del Equipo
          <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg flex items-center gap-1 normal-case">
            <Trophy className="h-3 w-3 text-yellow-500" /> DH 2026-27
          </span>
        </h3>
      </div>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
        {renderLineSection('Portería', '🧤', POR)}
        {renderLineSection('Defensa', '🛡️', DEF)}
        {renderLineSection('Mediocampo', '⚙️', MED)}
        {renderLineSection('Delantera', '⚡', DEL)}

        {nodesPropio.length === 0 && (
          <p className="text-xs text-slate-500 italic text-center py-6">
            Configura y guarda el sistema táctico para ver la distribución por líneas.
          </p>
        )}
      </div>
    </div>
  );
}
