'use client';

import React from 'react';
import { TacticalLineup, Match } from '@/types';
import { FolderOpen, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface LineupManagerProps {
  savedLineups: TacticalLineup[];
  loadingLineups: boolean;
  currentLineupId: string | null;
  matches: Match[];
  onLoad: (lineup: TacticalLineup) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export function LineupManager({
  savedLineups,
  loadingLineups,
  currentLineupId,
  matches,
  onLoad,
  onDelete,
}: LineupManagerProps) {
  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
        <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Pizarras Guardadas
      </h3>

      {loadingLineups ? (
        <Skeleton className="h-16 w-full" />
      ) : savedLineups.length === 0 ? (
        <p className="text-xs text-slate-500 italic p-2 text-center">No hay alineaciones guardadas.</p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {savedLineups.map((lineup) => {
            const match = matches.find((m) => m.id === lineup.match_id);
            return (
              <div
                key={lineup.id}
                onClick={() => onLoad(lineup)}
                className={`flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-850/50 border rounded-2xl text-xs cursor-pointer transition-all duration-200 ${
                  currentLineupId === lineup.id ? 'border-[#CC0E21]/40 bg-[#CC0E21]/5' : 'border-slate-850'
                }`}
              >
                <div className="truncate mr-2 flex-1">
                  <span className="font-bold text-slate-200 block truncate">
                    {lineup.nombre_pizarra || lineup.nombre_sistema}
                  </span>
                  <span className="text-[10px] text-slate-450 block truncate">
                    {lineup.sistema_propio || lineup.nombre_sistema} vs {lineup.sistema_rival || '1-4-3-3'}
                  </span>
                  {match && (
                    <span className="inline-block mt-0.5 text-[8px] bg-slate-900 px-1 py-0.2 rounded text-slate-400">
                      Jor. {match.jornada}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => onDelete(lineup.id, e)}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
