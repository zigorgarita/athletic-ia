'use client';

import React from 'react';
import { Player } from '@/types';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { PositionNode } from './TacticalField';
import { getPlayerDisplayName } from '@/lib/playerUtils';

interface TacticalFieldExportProps {
  nodes: PositionNode[];
  players?: Player[];
  rivalPlayers?: ClubPlayer[];
  team?: 'propio' | 'rival';
}

export function TacticalFieldExport({
  nodes,
  players = [],
  rivalPlayers = [],
  team = 'propio',
}: TacticalFieldExportProps) {
  const isRival = team === 'rival';

  // We render a horizontal pitch (Aspect ratio 3:2)
  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: '1200px',
        height: '800px',
        borderRadius: '1rem',
        border: isRival ? '4px solid #1e3a8a' : '4px solid #166534',
        backgroundColor: '#F0FDF4',
      }}
    >
      {/* SVG Horizontal Pitch */}
      <svg viewBox="0 0 600 400" className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.85 }}>
        {/* Core field lines */}
        <rect x="15" y="15" width="570" height="370" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <line x1="300" y1="15" x2="300" y2="385" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <circle cx="300" cy="200" r="45" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <circle cx="300" cy="200" r="3" fill={isRival ? '#1e40af' : '#166534'} />
        
        {/* Left Penalty Area */}
        <rect x="15" y="85" width="90" height="230" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <rect x="15" y="140" width="30" height="120" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <circle cx="65" cy="200" r="2.5" fill={isRival ? '#1e40af' : '#166534'} />
        <path d="M 105 155 A 50 50 0 0 1 105 245" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        
        {/* Right Penalty Area */}
        <rect x="495" y="85" width="90" height="230" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <rect x="555" y="140" width="30" height="120" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
        <circle cx="535" cy="200" r="2.5" fill={isRival ? '#1e40af' : '#166534'} />
        <path d="M 495 155 A 50 50 0 0 0 495 245" fill="none" stroke={isRival ? '#1e40af' : '#166534'} strokeWidth="2.5" />
      </svg>

      {/* Render Nodes / Players */}
      {nodes.map((node) => {
        const assignedPlayer = !isRival ? players.find((p) => p.id === node.player_id) : null;
        const assignedRivalPlayer = isRival ? rivalPlayers.find((rp) => rp.id === node.player_id) : null;
        const hasCustomDetails = Boolean(node.customName || node.customNumber || assignedRivalPlayer);

        // Label logic
        const displayName = assignedPlayer
          ? getPlayerDisplayName(assignedPlayer, 'tactical')
          : assignedRivalPlayer
          ? (assignedRivalPlayer.nombre ? assignedRivalPlayer.nombre.split(' ')[0] : node.label)
          : (node.customName ? node.customName.split(' ')[0] : node.label);

        const displayNumber = assignedPlayer
          ? assignedPlayer.dorsal
          : assignedRivalPlayer
          ? (assignedRivalPlayer.dorsal ? String(assignedRivalPlayer.dorsal) : (node.customNumber || ''))
          : (node.customNumber || '');

        const photoUrl = assignedPlayer ? assignedPlayer.foto_url : (assignedRivalPlayer?.foto_url || null);

        // Map coordinates for horizontal layout (inverted node.x to fix reversed left/right flanks)
        const newX = 100 - node.y;
        const newY = 100 - node.x;

        return (
          <div
            key={node.id}
            style={{
              left: `${newX}%`,
              top: `${newY}%`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Position badge — above the photo */}
            <div
              style={{
                backgroundColor: '#1a1a2e',
                border: isRival
                  ? '2.5px solid rgba(59, 130, 246, 0.8)'
                  : '2.5px solid rgba(204, 14, 33, 0.8)',
                borderRadius: '6px',
                padding: '3px 10px',
                marginBottom: '8px',
                fontSize: '15px',
                fontWeight: 850,
                color: isRival ? '#60a5fa' : '#FF4D5E',
                letterSpacing: '0.6px',
                whiteSpace: 'nowrap',
                lineHeight: '1.3',
              }}
            >
              {node.label}
            </div>

            {/* Player Token — photo circle */}
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: assignedPlayer
                  ? '3px solid #CC0E21'
                  : assignedRivalPlayer
                  ? '3px solid #2563eb'
                  : hasCustomDetails
                  ? '3px solid #3b82f6'
                  : '3px solid #475569',
                backgroundColor: (assignedPlayer || assignedRivalPlayer) ? '#0f172a' : '#1e293b',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoUrl}
                  alt={displayName}
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 15%',
                    borderRadius: '50%',
                  }}
                />
              ) : (hasCustomDetails || displayNumber) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#60a5fa' }}>{displayNumber}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#94a3b8', lineHeight: '1' }}>{node.label}</span>
                </div>
              ) : (
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#64748b' }}>{node.label}</span>
              )}
            </div>

            {/* Name label — below the photo */}
            <div
              style={{
                marginTop: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: isRival ? '2px solid #1e3a8a' : '2px solid #334155',
                borderRadius: '10px',
                padding: '6px 18px',
                fontSize: '15px',
                fontWeight: 700,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                letterSpacing: '0.3px',
                lineHeight: '1.4',
              }}
            >
              {displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
