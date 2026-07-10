'use client';

import React from 'react';
import { Player } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { PositionNode } from './TacticalField';

interface TacticalFieldExportProps {
  nodes: PositionNode[];
  players: Player[];
}

export function TacticalFieldExport({ nodes, players }: TacticalFieldExportProps) {
  // We render a horizontal pitch (Aspect ratio 3:2)
  return (
    <div 
      className="relative w-[1200px] h-[800px] bg-emerald-950 rounded-[1rem] border-4 border-emerald-500 overflow-hidden"
    >
      {/* SVG Horizontal Pitch */}
      <svg viewBox="0 0 600 400" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {/* Core field lines */}
        <rect x="15" y="15" width="570" height="370" fill="none" stroke="#fff" strokeWidth="2.5" />
        <line x1="300" y1="15" x2="300" y2="385" stroke="#fff" strokeWidth="2.5" />
        <circle cx="300" cy="200" r="45" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="300" cy="200" r="3" fill="#fff" />
        
        {/* Left Penalty Area */}
        <rect x="15" y="85" width="90" height="230" fill="none" stroke="#fff" strokeWidth="2.5" />
        <rect x="15" y="140" width="30" height="120" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="65" cy="200" r="2.5" fill="#fff" />
        <path d="M 105 155 A 50 50 0 0 1 105 245" fill="none" stroke="#fff" strokeWidth="2.5" />
        
        {/* Right Penalty Area */}
        <rect x="495" y="85" width="90" height="230" fill="none" stroke="#fff" strokeWidth="2.5" />
        <rect x="555" y="140" width="30" height="120" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="535" cy="200" r="2.5" fill="#fff" />
        <path d="M 495 155 A 50 50 0 0 0 495 245" fill="none" stroke="#fff" strokeWidth="2.5" />
      </svg>

      {/* Render Nodes / Players */}
      {nodes.map((node) => {
        const assignedPlayer = players.find((p) => p.id === node.player_id);
        const hasCustomDetails = node.customName || node.customNumber;

        // Label logic
        const displayName = assignedPlayer
          ? assignedPlayer.nombre.split(' ')[0]
          : (node.customName ? node.customName.split(' ')[0] : node.label);

        const displayNumber = assignedPlayer
          ? assignedPlayer.dorsal
          : (node.customNumber || '');

        // Map coordinates for horizontal layout
        // Assuming team attacks left to right.
        // Original field: y=100 is bottom (our goal), y=0 is top (opponent goal).
        // x=0 is left, x=100 is right.
        // So for horizontal (left to right):
        // X-axis: our goal is at left (0), opponent is at right (100).
        // So newX = 100 - original Y
        // Y-axis: original X was left-right. If we rotate -90 deg, original left (0) becomes bottom (100), right (100) becomes top (0).
        // wait, let's trace: original (x=20, y=90) -> (left back). In horizontal (attacking right), left back is top left or bottom left?
        // Let's say top is left side of field. So newY = original X.
        const newX = 100 - node.y;
        const newY = node.x;

        return (
          <div
            key={node.id}
            style={{
              left: `${newX}%`,
              top: `${newY}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-10 flex flex-col items-center"
          >
            {/* Player Token */}
            <div
              className={`h-24 w-24 rounded-full border-[3px] flex items-center justify-center shadow-2xl ${
                assignedPlayer
                  ? 'border-[#CC0E21] bg-slate-950'
                  : hasCustomDetails
                  ? 'border-blue-500 bg-slate-900'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              {assignedPlayer ? (
                <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="xl" className="w-full h-full" />
              ) : hasCustomDetails ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-blue-400">{displayNumber}</span>
                  <span className="text-base font-extrabold text-slate-400 leading-none">{node.label}</span>
                </div>
              ) : (
                <span className="text-xl font-black text-slate-500">{node.label}</span>
              )}
            </div>

            {/* Position badge */}
            <div className="absolute -top-4 bg-slate-950 border-2 border-[#CC0E21]/50 px-2 py-0.5 rounded text-sm font-extrabold text-[#CC0E21]">
              {node.label}
            </div>

            {/* Name overlay */}
            <div className="mt-2 bg-slate-950/90 border-2 border-slate-900 px-3 py-1 rounded-xl text-base font-bold text-slate-200">
              <span className="truncate max-w-[150px] block text-center">{displayName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
