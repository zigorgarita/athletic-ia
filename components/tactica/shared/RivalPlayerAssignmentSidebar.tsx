'use client';

import React, { useState, useMemo } from 'react';
import { Club } from '@/hooks/useClubs';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { Users, Search, X, Shield, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface RivalPlayerAssignmentSidebarProps {
  rivalClub: Club | null;
  rivalPlayers: ClubPlayer[];
  assignedPlayerIds: string[];
  isEditMode: boolean;
  loading: boolean;
  selectedMatchName?: string | null;
  onPlayerClick: (player: ClubPlayer) => void;
}

interface PlayerGroup {
  label: string;
  list: ClubPlayer[];
}

/**
 * Agrupa jugadores rivales respetando estrictamente su posición registrada.
 * Si no tiene posición registrada o es desconocida, se agrupa bajo "Posición no registrada".
 * NUNCA se inventa una posición.
 */
function groupRivalPlayers(playerList: ClubPlayer[]): PlayerGroup[] {
  const groups: Record<string, PlayerGroup> = {
    Portero: { label: '🧤 Porteros', list: [] },
    Defensa: { label: '🛡️ Defensas (Laterales / Centrales)', list: [] },
    Centrocampista: { label: '⚙️ Centrocampistas', list: [] },
    Delantero: { label: '⚡ Delanteros / Extremos', list: [] },
    SinPosicion: { label: '📋 Posición no registrada', list: [] },
  };

  playerList.forEach((p) => {
    const pos = (p.posicion || '').toLowerCase().trim();

    if (!pos) {
      groups.SinPosicion.list.push(p);
    } else if (pos.includes('portero') || pos.includes('arquero')) {
      groups.Portero.list.push(p);
    } else if (pos.includes('lateral') || pos.includes('central') || pos.includes('defensa')) {
      groups.Defensa.list.push(p);
    } else if (
      pos.includes('centrocampista') ||
      pos.includes('medio') ||
      pos.includes('pivote') ||
      pos.includes('interior') ||
      pos.includes('mediapunta') ||
      pos.includes('media punta')
    ) {
      groups.Centrocampista.list.push(p);
    } else if (pos.includes('delantero') || pos.includes('extremo') || pos.includes('punta') || pos.includes('ariete')) {
      groups.Delantero.list.push(p);
    } else {
      groups.SinPosicion.list.push(p);
    }
  });

  // Ordenar cada grupo por dorsal si existe, o por nombre
  Object.keys(groups).forEach((k) => {
    groups[k].list.sort((a, b) => {
      if (a.dorsal && b.dorsal) return a.dorsal - b.dorsal;
      if (a.dorsal) return -1;
      if (b.dorsal) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  });

  return [
    groups.Portero,
    groups.Defensa,
    groups.Centrocampista,
    groups.Delantero,
    groups.SinPosicion,
  ].filter((g) => g.list.length > 0);
}

export function RivalPlayerAssignmentSidebar({
  rivalClub,
  rivalPlayers,
  assignedPlayerIds,
  isEditMode,
  loading,
  selectedMatchName,
  onPlayerClick,
}: RivalPlayerAssignmentSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return rivalPlayers;
    const q = searchTerm.toLowerCase().trim();
    return rivalPlayers.filter((p) => {
      const matchName = p.nombre && p.nombre.toLowerCase().includes(q);
      const matchDorsal = p.dorsal && String(p.dorsal) === q;
      const matchPos = p.posicion && p.posicion.toLowerCase().includes(q);
      return matchName || matchDorsal || matchPos;
    });
  }, [rivalPlayers, searchTerm]);

  const grouped = useMemo(() => groupRivalPlayers(filteredPlayers), [filteredPlayers]);

  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[600px] overflow-hidden">
      {/* Cabecera del Panel Rival */}
      <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 mb-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          {rivalClub?.escudo_url ? (
            <img
              src={rivalClub.escudo_url}
              alt={rivalClub.nombre}
              className="h-4 w-4 object-contain"
            />
          ) : (
            <Shield className="h-3.5 w-3.5 text-blue-400" />
          )}
          <span>Plantilla Rival</span>
        </h3>
        {rivalClub && (
          <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded-full truncate max-w-[130px]">
            {rivalClub.nombre_corto || rivalClub.nombre}
          </span>
        )}
      </div>

      {/* Caso 1: Sin partido vinculado */}
      {!selectedMatchName && (
        <div className="py-6 px-3 text-center space-y-2 text-slate-500">
          <Info className="h-6 w-6 mx-auto text-slate-600" />
          <p className="text-xs">
            Selecciona un partido en <strong className="text-slate-400">Plan del Partido</strong> para cargar automáticamente la plantilla del rival.
          </p>
        </div>
      )}

      {/* Caso 2: Con partido vinculado pero cargando */}
      {selectedMatchName && loading && (
        <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
          Cargando plantilla de {rivalClub?.nombre || 'rival'}...
        </div>
      )}

      {/* Caso 3: Con partido vinculado pero rival sin jugadores registrados */}
      {selectedMatchName && !loading && rivalPlayers.length === 0 && (
        <div className="py-6 px-3 text-center space-y-2 text-slate-500">
          <Users className="h-6 w-6 mx-auto text-slate-600" />
          <p className="text-xs">
            No constan jugadores registrados para <strong className="text-slate-400">{rivalClub?.nombre || 'este rival'}</strong>.
          </p>
          <p className="text-[10px] text-slate-600">
            Puedes continuar posicionando fichas tácticas genéricas en el campo rival con total libertad.
          </p>
        </div>
      )}

      {/* Caso 4: Con jugadores rivales */}
      {selectedMatchName && !loading && rivalPlayers.length > 0 && (
        <>
          <p className="text-[10px] text-slate-500 mb-2 leading-tight">
            Arrastra un jugador rival al campo o haz clic en su ficha para colocarlo en cualquier posición libre.
          </p>

          {/* Buscador de jugadores rivales */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar jugador rival por nombre o dorsal..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lista agrupada */}
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {grouped.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No se encontraron jugadores que coincidan con la búsqueda.
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.label} className="space-y-1">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-900 sticky top-0 z-10 flex justify-between items-center">
                    <span>{group.label}</span>
                    <span className="text-slate-500 font-normal">({group.list.length})</span>
                  </h4>
                  <div className="space-y-1.5 pt-1">
                    {group.list.map((p) => {
                      const isAssigned = assignedPlayerIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          draggable={!isAssigned && isEditMode}
                          onDragStart={(e) => {
                            if (!isAssigned && isEditMode) {
                              // Namespace estricto 'rival:<id>' para evitar cruces con Nuestro Equipo
                              e.dataTransfer.setData('text/plain', `rival:${p.id}`);
                              e.dataTransfer.effectAllowed = 'move';
                            }
                          }}
                          onClick={() => onPlayerClick(p)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all select-none ${
                            isAssigned
                              ? 'bg-slate-900/20 border-slate-850/40 text-slate-500 opacity-60 cursor-pointer'
                              : isEditMode
                              ? 'bg-slate-950/60 border-slate-850/60 text-slate-200 hover:border-blue-500/40 hover:bg-slate-950 cursor-grab active:cursor-grabbing'
                              : 'bg-slate-950/30 border-slate-900 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                            <div className="truncate">
                              <span className="block font-semibold truncate leading-none mb-0.5">
                                {p.nombre}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium">
                                {p.dorsal ? `#${p.dorsal}` : 'S/D'} · {p.posicion || 'Posición no reg.'}
                              </span>
                            </div>
                          </div>

                          {isAssigned && (
                            <span className="text-[8px] bg-blue-500/15 text-blue-400 px-1 py-0.2 rounded border border-blue-500/25 shrink-0 font-bold">
                              PUESTO
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
