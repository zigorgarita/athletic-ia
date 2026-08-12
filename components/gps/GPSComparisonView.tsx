'use client';

import React, { useState } from 'react';
import { Player, GPSSession, GPSData } from '@/types';
import { GPSMatchPlayerComparison } from './GPSMatchPlayerComparison';
import { GPSPlayerProgressComparison } from './GPSPlayerProgressComparison';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, TrendingUp, ArrowRightLeft } from 'lucide-react';

interface MatchInfo {
  id: string;
  fecha: string;
  rival: string;
  tipo_partido?: string;
  jornada?: number | null;
}

interface GPSComparisonViewProps {
  matches: MatchInfo[];
  sessions: GPSSession[];
  gpsDataList: (GPSData & { player?: Player })[];
  players: Player[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
}

export function GPSComparisonView({
  matches,
  sessions,
  gpsDataList,
  players,
  selectedMatchId,
  onMatchChange
}: GPSComparisonViewProps) {
  // Mode Selection: 'modeA' = Players in 1 match, 'modeB' = Player in N matches
  const [activeComparisonMode, setActiveComparisonMode] = useState<'modeA' | 'modeB'>('modeA');

  return (
    <div className="space-y-6">
      {/* MODE SELECTOR HEADER */}
      <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-md">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-200">Herramienta de Comparación GPS</h3>
              <p className="text-xs text-slate-400">Analiza métricas entre plantilla o sigue la evolución individual</p>
            </div>
          </div>

          {/* Sub-mode selector buttons */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveComparisonMode('modeA')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeComparisonMode === 'modeA'
                  ? 'bg-[#CC0E21] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Modo A: Jugadores en 1 Partido</span>
            </button>

            <button
              onClick={() => setActiveComparisonMode('modeB')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeComparisonMode === 'modeB'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Modo B: Evolución Jugador</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* RENDER SELECTED MODE */}
      {activeComparisonMode === 'modeA' ? (
        <GPSMatchPlayerComparison
          matches={matches}
          sessions={sessions}
          gpsDataList={gpsDataList}
          players={players}
          selectedMatchId={selectedMatchId}
          onMatchChange={onMatchChange}
        />
      ) : (
        <GPSPlayerProgressComparison
          matches={matches}
          sessions={sessions}
          gpsDataList={gpsDataList}
          players={players}
        />
      )}
    </div>
  );
}
