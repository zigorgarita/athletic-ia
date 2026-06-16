import React, { useState } from 'react';
import { Player, Evaluation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ArrowUpDown } from 'lucide-react';

interface RankingTableProps {
  players: Player[];
  evaluations: Evaluation[];
  onSelectPlayer: (id: string) => void;
}

interface PlayerStats {
  player: Player;
  tecnica: number;
  tactica: number;
  condicional: number;
  media: number;
  evalCount: number;
}

export function RankingTable({ players, evaluations, onSelectPlayer }: RankingTableProps) {
  const [sortField, setSortField] = useState<'nombre' | 'demarcacion' | 'tecnica' | 'tactica' | 'condicional' | 'media' | 'evalCount'>('media');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Calcular estadísticas por jugador
  const playerStatsList: PlayerStats[] = players.map((p) => {
    const playerEvals = evaluations.filter((e) => e.player_id === p.id);
    const count = playerEvals.length;

    if (count === 0) {
      return {
        player: p,
        tecnica: 0,
        tactica: 0,
        condicional: 0,
        media: 0,
        evalCount: 0,
      };
    }

    const tSum = playerEvals.reduce((s, e) => s + e.tecnica, 0);
    const taSum = playerEvals.reduce((s, e) => s + e.tactica, 0);
    const cSum = playerEvals.reduce((s, e) => s + e.condicional, 0);

    const tAvg = tSum / count;
    const taAvg = taSum / count;
    const cAvg = cSum / count;
    const mediaGlobal = (tAvg + taAvg + cAvg) / 3;

    return {
      player: p,
      tecnica: tAvg,
      tactica: taAvg,
      condicional: cAvg,
      media: mediaGlobal,
      evalCount: count,
    };
  });

  // Lógica de ordenamiento
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedStats = [...playerStatsList].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortField === 'nombre') {
      aValue = a.player.nombre.toLowerCase();
      bValue = b.player.nombre.toLowerCase();
    } else if (sortField === 'demarcacion') {
      aValue = a.player.demarcacion;
      bValue = b.player.demarcacion;
    } else {
      aValue = a[sortField as Exclude<typeof sortField, 'nombre' | 'demarcacion'>];
      bValue = b[sortField as Exclude<typeof sortField, 'nombre' | 'demarcacion'>];
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getMediaColor = (val: number) => {
    if (val === 0) return 'text-slate-500';
    if (val >= 4.0) return 'text-green-400';
    if (val >= 3.0) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <th className="py-4 px-6 select-none cursor-pointer hover:bg-slate-800/40" onClick={() => handleSort('nombre')}>
              <div className="flex items-center gap-1.5">
                Jugador
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none" onClick={() => handleSort('demarcacion')}>
              <div className="flex items-center gap-1.5">
                Posición
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none text-center" onClick={() => handleSort('tecnica')}>
              <div className="flex items-center justify-center gap-1.5">
                Téc
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none text-center" onClick={() => handleSort('tactica')}>
              <div className="flex items-center justify-center gap-1.5">
                Tac
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none text-center" onClick={() => handleSort('condicional')}>
              <div className="flex items-center justify-center gap-1.5">
                Fís
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none text-center" onClick={() => handleSort('media')}>
              <div className="flex items-center justify-center gap-1.5 text-green-400">
                Media Global
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
            <th className="py-4 px-6 cursor-pointer hover:bg-slate-800/40 select-none text-center" onClick={() => handleSort('evalCount')}>
              <div className="flex items-center justify-center gap-1.5">
                Eval
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-sm">
          {sortedStats.map((row) => (
            <tr
              key={row.player.id}
              onClick={() => onSelectPlayer(row.player.id)}
              className="hover:bg-slate-800/30 cursor-pointer transition-colors duration-150"
            >
              <td className="py-4 px-6 flex items-center gap-3">
                <Avatar src={row.player.foto_url} name={row.player.nombre} size="sm" />
                <div>
                  <span className="font-bold text-slate-100 hover:text-green-400 block transition-colors duration-150">
                    {row.player.nombre}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Dorsal #{row.player.dorsal}</span>
                </div>
              </td>
              <td className="py-4 px-6">
                <Badge variant={row.player.demarcacion}>{row.player.demarcacion}</Badge>
              </td>
              <td className="py-4 px-6 text-center font-semibold text-slate-200">
                {row.evalCount > 0 ? row.tecnica.toFixed(1) : '-'}
              </td>
              <td className="py-4 px-6 text-center font-semibold text-slate-200">
                {row.evalCount > 0 ? row.tactica.toFixed(1) : '-'}
              </td>
              <td className="py-4 px-6 text-center font-semibold text-slate-200">
                {row.evalCount > 0 ? row.condicional.toFixed(1) : '-'}
              </td>
              <td className={`py-4 px-6 text-center font-bold ${getMediaColor(row.media)}`}>
                {row.evalCount > 0 ? row.media.toFixed(1) : 'Sin datos'}
              </td>
              <td className="py-4 px-6 text-center font-semibold text-slate-400">
                {row.evalCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
