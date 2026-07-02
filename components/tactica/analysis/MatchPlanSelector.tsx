'use client';

import React from 'react';
import { Match } from '@/types';
import { Star } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface MatchPlanSelectorProps {
  lineupName: string;
  onLineupNameChange: (val: string) => void;
  selectedMatchId: string;
  onMatchIdChange: (val: string) => void;
  rivalFormation: string;
  onRivalFormationChange: (val: string) => void;
  formationsOptions: { value: string; label: string }[];
  matches: Match[];
  lineupNotes: string;
  onLineupNotesChange: (val: string) => void;
}

export function MatchPlanSelector({
  lineupName,
  onLineupNameChange,
  selectedMatchId,
  onMatchIdChange,
  rivalFormation,
  onRivalFormationChange,
  formationsOptions,
  matches,
  lineupNotes,
  onLineupNotesChange,
}: MatchPlanSelectorProps) {
  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
        <Star className="h-3.5 w-3.5 text-[#CC0E21]" /> Plan del Partido
      </h3>

      <Input
        label="Nombre de Alineación"
        type="text"
        placeholder="Ej. Plan A - Presión Alta"
        value={lineupName}
        onChange={(e) => onLineupNameChange(e.target.value)}
      />

      <Select
        label="Vincular a Partido"
        value={selectedMatchId}
        onChange={(e) => onMatchIdChange(e.target.value)}
        options={[
          { value: '', label: '-- Sin vincular --' },
          ...matches.map((m) => ({
            value: m.id,
            label: `Jornada ${m.jornada} vs ${m.rival}`,
          })),
        ]}
      />

      <Select
        label="Sistema Rival"
        value={rivalFormation}
        onChange={(e) => onRivalFormationChange(e.target.value)}
        options={formationsOptions}
      />

      <div>
        <label className="block text-slate-400 text-xs font-bold mb-1.5">
          Notas Generales
        </label>
        <textarea
          value={lineupNotes}
          onChange={(e) => onLineupNotesChange(e.target.value)}
          placeholder="Notas rápidas..."
          className="w-full min-h-[80px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
}
