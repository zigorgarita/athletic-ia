'use client';

import React from 'react';
import { Player } from '@/types';
import { PositionNode } from './TacticalField';

interface TacticalFieldExportProps {
  nodes: PositionNode[];
  players: Player[];
}

export function TacticalFieldExport({ nodes, players }: TacticalFieldExportProps) {
  // We render a horizontal pitch (Aspect ratio 3:2)
  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: '1200px',
        height: '800px',
        borderRadius: '1rem',
        border: '4px solid #4ade80',
        backgroundColor: '#3b8c5a',
      }}
    >
      {/* SVG Horizontal Pitch */}
      <svg viewBox="0 0 600 400" className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
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
        const newX = 100 - node.y;
        const newY = node.x;

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
                border: '2px solid rgba(204, 14, 33, 0.7)',
                borderRadius: '4px',
                padding: '2px 8px',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#FF4D5E',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                lineHeight: '1.3',
              }}
            >
              {node.label}
            </div>

            {/* Player Token — photo circle */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: assignedPlayer
                  ? '3px solid #CC0E21'
                  : hasCustomDetails
                  ? '3px solid #3b82f6'
                  : '3px solid #475569',
                backgroundColor: assignedPlayer ? '#0f172a' : '#1e293b',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {assignedPlayer && assignedPlayer.foto_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={assignedPlayer.foto_url}
                  alt={assignedPlayer.nombre}
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 15%',
                    borderRadius: '50%',
                  }}
                />
              ) : hasCustomDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#60a5fa' }}>{displayNumber}</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', lineHeight: '1' }}>{node.label}</span>
                </div>
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#64748b' }}>{node.label}</span>
              )}
            </div>

            {/* Name label — below the photo */}
            <div
              style={{
                marginTop: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '2px solid #334155',
                borderRadius: '10px',
                padding: '5px 16px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
                maxWidth: '140px',
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
