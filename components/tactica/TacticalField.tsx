'use client';

import React, { useRef } from 'react';
import { Player } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronDown, X } from 'lucide-react';

export interface PositionNode {
  id: number;
  label: string;
  x: number;
  y: number;
  player_id: string | null;
  notas_entrenador?: string;
  customName?: string;
  customNumber?: string;
}

interface TacticalFieldProps {
  team: 'propio' | 'rival';
  nodes: PositionNode[];
  players: Player[];
  isEditMode: boolean;
  onNodesChange: (newNodes: PositionNode[]) => void;
  onNodeClick: (node: PositionNode) => void;
  highlightedZone?: 'central' | 'interior' | 'exterior' | null;
}

const POSITION_ROLES = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

export function TacticalField({
  team,
  nodes,
  players,
  isEditMode,
  onNodesChange,
  onNodeClick,
  highlightedZone = null,
}: TacticalFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Drag & Drop logic for free movement of nodes ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, nodeId: number) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.closest('.no-drag')) return;

    const isTouch = 'touches' in e;
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const initialX = node.x;
    const initialY = node.y;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = ((currentX - startX) / rect.width) * 100;
      const deltaY = ((currentY - startY) / rect.height) * 100;

      onNodesChange(
        nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              x: Math.max(4, Math.min(96, initialX + deltaX)),
              y: team === 'rival' 
                ? Math.max(4, Math.min(96, initialY - deltaY)) // Inverted Y-drag for rival
                : Math.max(4, Math.min(96, initialY + deltaY)),
            };
          }
          return n;
        })
      );
    };

    const handleDragEnd = () => {
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

  // --- HTML5 Drag & Drop from squad list ---
  const handlePitchNodeDrop = (e: React.DragEvent, targetNodeId: number) => {
    if (!isEditMode || team === 'rival') return;
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;

    // Dragging from one node to another within the pitch
    if (rawData.startsWith('node:')) {
      const parts = rawData.split(':');
      const sourceNodeId = parseInt(parts[1]);
      const sourcePlayerId = parts[2];

      const targetNode = nodes.find((n) => n.id === targetNodeId);
      const targetPlayerId = targetNode ? targetNode.player_id : null;

      onNodesChange(
        nodes.map((n) => {
          if (n.id === targetNodeId) {
            return { ...n, player_id: sourcePlayerId };
          }
          if (n.id === sourceNodeId) {
            return { ...n, player_id: targetPlayerId };
          }
          return n;
        })
      );
    } else {
      // Dragging a player from the sidebar roster
      const playerId = rawData;
      onNodesChange(
        nodes.map((n) => {
          if (n.id === targetNodeId) {
            return { ...n, player_id: playerId };
          }
          if (playerId && n.player_id === playerId && n.id !== targetNodeId) {
            return { ...n, player_id: null };
          }
          return n;
        })
      );
    }
  };

  const handleRoleChange = (nodeId: number, newRole: string) => {
    if (!isEditMode) return;
    onNodesChange(
      nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, label: newRole };
        }
        return n;
      })
    );
  };

  const handleClearPlayer = (nodeId: number) => {
    if (!isEditMode) return;
    onNodesChange(
      nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, player_id: null, customName: undefined, customNumber: undefined };
        }
        return n;
      })
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-[480px] text-center mb-2 flex justify-between items-center px-4 bg-slate-900/50 py-1.5 rounded-xl border border-slate-800/60">
        <span className="text-xs font-black uppercase tracking-wider text-slate-350">
          {team === 'propio' ? 'Nuestro Equipo (DH)' : 'Equipo Rival (Frente)'}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-[2/3] max-w-[480px] bg-emerald-950/90 rounded-[2.5rem] border border-emerald-500/20 overflow-hidden shadow-2xl select-none"
        onDragOver={(e) => {
          if (isEditMode && team === 'propio') {
            e.preventDefault();
          }
        }}
      >
        {/* SVG Pitch Lines and Zones */}
        <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          {/* Highlight tactical zones */}
          {highlightedZone === 'central' && (
            <rect x="160" y="15" width="80" height="570" fill="red" fillOpacity="0.2" stroke="red" strokeWidth="1" strokeDasharray="3,3" />
          )}
          {highlightedZone === 'interior' && (
            <>
              <rect x="80" y="15" width="80" height="570" fill="yellow" fillOpacity="0.15" stroke="yellow" strokeWidth="1" strokeDasharray="3,3" />
              <rect x="240" y="15" width="80" height="570" fill="yellow" fillOpacity="0.15" stroke="yellow" strokeWidth="1" strokeDasharray="3,3" />
            </>
          )}
          {highlightedZone === 'exterior' && (
            <>
              <rect x="15" y="15" width="65" height="570" fill="blue" fillOpacity="0.15" stroke="blue" strokeWidth="1" strokeDasharray="3,3" />
              <rect x="320" y="15" width="65" height="570" fill="blue" fillOpacity="0.15" stroke="blue" strokeWidth="1" strokeDasharray="3,3" />
            </>
          )}

          {/* Core field lines */}
          <rect x="15" y="15" width="370" height="570" fill="none" stroke="#fff" strokeWidth="2" />
          <line x1="15" y1="300" x2="385" y2="300" stroke="#fff" strokeWidth="2" />
          <circle cx="200" cy="300" r="50" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="200" cy="300" r="4" fill="#fff" />
          <rect x="100" y="15" width="200" height="90" fill="none" stroke="#fff" strokeWidth="2" />
          <rect x="150" y="15" width="100" height="30" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="200" cy="75" r="3" fill="#fff" />
          <path d="M 160 105 A 50 50 0 0 0 240 105" fill="none" stroke="#fff" strokeWidth="2" />
          <rect x="100" y="495" width="200" height="90" fill="none" stroke="#fff" strokeWidth="2" />
          <rect x="150" y="495" width="100" height="30" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="200" cy="525" r="3" fill="#fff" />
          <path d="M 160 495 A 50 50 0 0 1 240 495" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>

        {/* Render Nodes / Players */}
        {nodes.map((node) => {
          const assignedPlayer = team === 'propio' ? players.find((p) => p.id === node.player_id) : null;
          const hasCustomDetails = node.customName || node.customNumber;

          // Determine label details
          const displayName = assignedPlayer
            ? assignedPlayer.nombre.split(' ')[0]
            : (node.customName ? node.customName.split(' ')[0] : node.label);

          const displayNumber = assignedPlayer
            ? assignedPlayer.dorsal
            : (node.customNumber || '');

          // Calculate Y visual position (inverted for rival)
          const visualY = team === 'rival' ? (100 - node.y) : node.y;

          return (
            <div
              key={node.id}
              style={{
                left: `${node.x}%`,
                top: `${visualY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-10 flex flex-col items-center cursor-pointer group"
              onMouseDown={(e) => handleDragStart(e, node.id)}
              onTouchStart={(e) => handleDragStart(e, node.id)}
              onDragOver={(e) => {
                if (isEditMode && team === 'propio') {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => handlePitchNodeDrop(e, node.id)}
              draggable={isEditMode && (!!node.player_id || team === 'rival')}
              onDragStart={(e) => {
                if (isEditMode && node.player_id && team === 'propio') {
                  e.dataTransfer.setData('text/plain', `node:${node.id}:${node.player_id}`);
                  e.dataTransfer.effectAllowed = 'move';
                }
              }}
              onClick={() => onNodeClick(node)}
            >
              {/* Outer circle with premium jersey design */}
              <div
                className={`h-12 w-12 rounded-full border-2 flex items-center justify-center shadow-xl transition-all duration-200 ${
                  assignedPlayer
                    ? 'border-[#CC0E21] bg-slate-950 shadow-red-500/10'
                    : hasCustomDetails
                    ? 'border-blue-500 bg-slate-900 shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {assignedPlayer ? (
                  <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="sm" className="w-full h-full" />
                ) : hasCustomDetails ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-blue-400">{displayNumber}</span>
                    <span className="text-[8px] font-extrabold text-slate-400 leading-none">{node.label}</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-black text-slate-500">{node.label}</span>
                )}
              </div>

              {/* Position overlay badge */}
              <div className={`absolute -top-2 bg-slate-950 border px-1 py-0.2 rounded text-[7px] font-extrabold no-drag ${
                team === 'propio' ? 'border-[#CC0E21]/50 text-[#CC0E21]' : 'border-blue-500/50 text-blue-400'
              }`}>
                {node.label}
              </div>

              {/* Name overlay */}
              <div className="mt-1 bg-slate-950/90 border border-slate-900 px-1.5 py-0.2 rounded-lg text-[8px] font-bold text-slate-200 flex items-center gap-1 select-none pointer-events-auto no-drag shadow-md">
                <span className="truncate max-w-[50px]">{displayName}</span>

                {isEditMode && (
                  <>
                    {/* Inline select to change role */}
                    <div className="relative">
                      <select
                        value={node.label}
                        onChange={(e) => handleRoleChange(node.id, e.target.value)}
                        className="absolute inset-0 opacity-0 w-3 h-3 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {POSITION_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-2 w-2 text-slate-500 hover:text-slate-250" />
                    </div>

                    {/* Clear button */}
                    {(assignedPlayer || hasCustomDetails) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearPlayer(node.id);
                        }}
                        className="ml-0.5 text-slate-500 hover:text-red-400"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
