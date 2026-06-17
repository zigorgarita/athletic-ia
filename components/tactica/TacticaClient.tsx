'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { TacticalLineup, Match } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { ABPSection } from './ABPSection';
import { 
  Layout, Shield, Save, FolderOpen, RefreshCw, AlertCircle, 
  CheckCircle, Users, Trash2, ChevronDown
} from 'lucide-react';

interface PositionNode {
  id: number;
  label: string; // CD, GK, DC, etc.
  x: number; // %
  y: number; // %
  player_id: string | null;
}

const FORMATIONS: Record<string, { label: string; coords: Omit<PositionNode, 'player_id'>[] }> = {
  '4-3-3': {
    label: '4-3-3',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 15, y: 68 },
      { id: 3, label: 'DFC', x: 38, y: 74 },
      { id: 4, label: 'DFC', x: 62, y: 74 },
      { id: 5, label: 'LI', x: 85, y: 68 },
      { id: 6, label: 'MCD', x: 50, y: 55 },
      { id: 7, label: 'MC', x: 30, y: 44 },
      { id: 8, label: 'MC', x: 70, y: 44 },
      { id: 9, label: 'ED', x: 18, y: 22 },
      { id: 10, label: 'EI', x: 82, y: 22 },
      { id: 11, label: 'DC', x: 50, y: 15 },
    ]
  },
  '4-4-2': {
    label: '4-4-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 15, y: 68 },
      { id: 3, label: 'DFC', x: 38, y: 74 },
      { id: 4, label: 'DFC', x: 62, y: 74 },
      { id: 5, label: 'LI', x: 85, y: 68 },
      { id: 6, label: 'MC', x: 36, y: 50 },
      { id: 7, label: 'MC', x: 64, y: 50 },
      { id: 8, label: 'MD', x: 15, y: 40 },
      { id: 9, label: 'MI', x: 85, y: 40 },
      { id: 10, label: 'DC', x: 38, y: 18 },
      { id: 11, label: 'DC', x: 62, y: 18 },
    ]
  },
  '3-5-2': {
    label: '3-5-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'DFC', x: 25, y: 74 },
      { id: 3, label: 'DFC', x: 50, y: 77 },
      { id: 4, label: 'DFC', x: 75, y: 74 },
      { id: 5, label: 'MCD', x: 36, y: 58 },
      { id: 6, label: 'MCD', x: 64, y: 58 },
      { id: 7, label: 'CAD', x: 15, y: 45 },
      { id: 8, label: 'CAI', x: 85, y: 45 },
      { id: 9, label: 'MCO', x: 50, y: 40 },
      { id: 10, label: 'DC', x: 38, y: 18 },
      { id: 11, label: 'DC', x: 62, y: 18 },
    ]
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 15, y: 68 },
      { id: 3, label: 'DFC', x: 38, y: 74 },
      { id: 4, label: 'DFC', x: 62, y: 74 },
      { id: 5, label: 'LI', x: 85, y: 68 },
      { id: 6, label: 'MCD', x: 36, y: 58 },
      { id: 7, label: 'MCD', x: 64, y: 58 },
      { id: 8, label: 'MCO', x: 50, y: 40 },
      { id: 9, label: 'MD', x: 18, y: 30 },
      { id: 10, label: 'MI', x: 82, y: 30 },
      { id: 11, label: 'DC', x: 50, y: 16 },
    ]
  }
};

export function TacticaClient() {
  const { players, loading: loadingPlayers } = usePlayers();
  const [activeTab, setActiveTab] = useState<'pizarra' | 'abp'>('pizarra');

  // Board states
  const [selectedFormation, setSelectedFormation] = useState<string>('4-3-3');
  const [nodes, setNodes] = useState<PositionNode[]>([]);
  const [lineupName, setLineupName] = useState<string>('');
  const [lineupNotes, setLineupNotes] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Database Load states
  const [savedLineups, setSavedLineups] = useState<TacticalLineup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize nodes based on selected formation
  useEffect(() => {
    const defaultCoords = FORMATIONS[selectedFormation]?.coords || [];
    setNodes(
      defaultCoords.map((coord) => ({
        ...coord,
        player_id: null,
      }))
    );
  }, [selectedFormation]);

  useEffect(() => {
    loadSavedData();
  }, []);

  async function loadSavedData() {
    setLoadingLineups(true);
    try {
      const [lineupsRes, matchesRes] = await Promise.all([
        supabase.from('tactical_lineups').select('*').order('created_at', { ascending: false }),
        supabase.from('matches').select('*').order('jornada', { ascending: true })
      ]);

      if (lineupsRes.error) throw lineupsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      setSavedLineups(lineupsRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (err) {
      console.error('Error loading tactical lineups:', err);
    } finally {
      setLoadingLineups(false);
    }
  }

  // --- Drag & Drop logic for nodes ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, nodeId: number) => {
    const isTouch = 'touches' in e;
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const node = nodes.find(n => n.id === nodeId);
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

      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            x: Math.max(4, Math.min(96, initialX + deltaX)),
            y: Math.max(4, Math.min(96, initialY + deltaY))
          };
        }
        return n;
      }));
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

  // --- Assign player directly via popup/click helper ---
  const handlePlayerAssign = (nodeId: number, playerId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return { ...n, player_id: playerId || null };
      }
      // Evitar duplicados (un jugador no puede estar en dos posiciones a la vez)
      if (playerId && n.player_id === playerId && n.id !== nodeId) {
        return { ...n, player_id: null };
      }
      return n;
    }));
  };

  // --- Save Tactical Lineup ---
  async function handleSaveLineup() {
    if (!lineupName.trim()) {
      setErrorMsg('Debes introducir un nombre para la alineación.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        nombre_sistema: selectedFormation,
        notas: lineupNotes || null,
        posiciones: nodes.map(n => ({
          id: n.id,
          label: n.label,
          x: parseFloat(n.x.toFixed(1)),
          y: parseFloat(n.y.toFixed(1)),
          player_id: n.player_id
        })),
        match_id: selectedMatchId || null
      };

      const { error } = await supabase.from('tactical_lineups').insert(payload);
      if (error) throw error;

      setSuccessMsg('Alineación táctica guardada con éxito.');
      setLineupName('');
      setLineupNotes('');
      setSelectedMatchId('');
      loadSavedData();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saving lineup:', error);
      setErrorMsg(error.message || 'Error al guardar la alineación.');
    } finally {
      setIsSaving(false);
    }
  }

  // --- Load Saved Lineup ---
  const handleLoadLineup = (lineup: TacticalLineup) => {
    setSelectedFormation(lineup.nombre_sistema);
    setLineupName(lineup.nombre_sistema);
    setLineupNotes(lineup.notas || '');
    setSelectedMatchId(lineup.match_id || '');
    
    // Load position nodes
    if (Array.isArray(lineup.posiciones)) {
      setNodes((lineup.posiciones as PositionNode[]).map((p) => ({
        id: p.id,
        label: p.label,
        x: p.x,
        y: p.y,
        player_id: p.player_id
      })));
    }
    setSuccessMsg(`Cargada la alineación del ${new Date(lineup.created_at).toLocaleDateString()}`);
  };

  async function handleDeleteLineup(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta alineación?')) return;
    try {
      const { error } = await supabase.from('tactical_lineups').delete().eq('id', id);
      if (error) throw error;
      loadSavedData();
    } catch (err) {
      console.error('Error deleting lineup:', err);
    }
  }

  // Helper: Get available players (not yet positioned)
  const getAssignedPlayerIds = () => nodes.map(n => n.player_id).filter(id => !!id);

  if (loadingPlayers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
          <Layout className="h-8 w-8 text-green-500" />
          Pizarra Táctica y ABP
        </h1>
        <p className="text-slate-400 text-sm">
          Planificación visual de sistemas tácticos, alineaciones y jugadas ensayadas a balón parado.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('pizarra')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'pizarra'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          Pizarra Táctica
        </button>
        <button
          onClick={() => setActiveTab('abp')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'abp'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Estrategias ABP
        </button>
      </div>

      {activeTab === 'pizarra' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Configuración de la Pizarra */}
          <div className="space-y-6 lg:col-span-1">
            {/* Controles de Configuración */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-green-500" /> Configuración Inicial
              </h3>

              <Select
                label="Sistema de Juego"
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
                options={Object.keys(FORMATIONS).map(f => ({ value: f, label: FORMATIONS[f].label }))}
              />

              <div className="border-t border-slate-850 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400">Guardar Alineación</h4>
                
                {successMsg && (
                  <div className="p-2.5 bg-green-500/10 border border-green-500/25 text-green-400 rounded-xl text-[11px] flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-[11px] flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Input
                  label="Nombre de Alineación"
                  type="text"
                  placeholder="Ej. Táctico vs Santutxu"
                  value={lineupName}
                  onChange={(e) => setLineupName(e.target.value)}
                />

                <Select
                  label="Vincular a Partido (Opcional)"
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  options={[
                    { value: '', label: '-- Sin vincular --' },
                    ...matches.map(m => ({ value: m.id, label: `Jornada ${m.jornada} vs ${m.rival}` }))
                  ]}
                />

                <Input
                  label="Notas de la Alineación"
                  type="text"
                  placeholder="Instrucciones tácticas..."
                  value={lineupNotes}
                  onChange={(e) => setLineupNotes(e.target.value)}
                />

                <Button 
                  variant="primary" 
                  onClick={handleSaveLineup} 
                  loading={isSaving}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar Alineación
                </Button>
              </div>
            </div>

            {/* Listado de Alineaciones Guardadas */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Alineaciones Guardadas
              </h3>

              {loadingLineups ? (
                <Skeleton className="h-16 w-full" />
              ) : savedLineups.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2 text-center">No hay alineaciones guardadas.</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {savedLineups.map((lineup) => (
                    <div
                      key={lineup.id}
                      onClick={() => handleLoadLineup(lineup)}
                      className="flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-850/50 border border-slate-850 rounded-xl text-xs cursor-pointer transition-colors duration-200"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-200 block truncate">{lineup.nombre_sistema}</span>
                        <span className="text-[10px] text-slate-550 block">
                          {new Date(lineup.created_at).toLocaleDateString()} {lineup.notas ? `- ${lineup.notas}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteLineup(lineup.id, e)}
                        className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors duration-150"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Central/Derecha: El Campo de Fútbol Interactivo */}
          <div className="lg:col-span-2 flex flex-col md:flex-row gap-6">
            {/* El Campo (Pizarra) */}
            <div className="flex-1 flex flex-col items-center">
              <div
                ref={containerRef}
                className="relative w-full aspect-[2/3] max-w-[400px] bg-emerald-950/80 rounded-3xl border-2 border-emerald-500/30 overflow-hidden shadow-inner select-none"
              >
                {/* SVG Pitch Lines */}
                <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                  <rect x="15" y="15" width="370" height="570" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <line x1="15" y1="300" x2="385" y2="300" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="200" cy="300" r="50" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="200" cy="300" r="3" fill="#fff" />
                  <rect x="100" y="15" width="200" height="90" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <rect x="150" y="15" width="100" height="30" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="200" cy="75" r="2" fill="#fff" />
                  <path d="M 160 105 A 50 50 0 0 0 240 105" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <rect x="100" y="495" width="200" height="90" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <rect x="150" y="495" width="100" height="30" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="200" cy="525" r="2" fill="#fff" />
                  <path d="M 160 495 A 50 50 0 0 1 240 495" fill="none" stroke="#fff" strokeWidth="1.5" />
                </svg>

                {/* Render Nodes / Players */}
                {nodes.map((node) => {
                  const assignedPlayer = players.find(p => p.id === node.player_id);
                  return (
                    <div
                      key={node.id}
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute z-10 flex flex-col items-center cursor-move group"
                      onMouseDown={(e) => handleDragStart(e, node.id)}
                      onTouchStart={(e) => handleDragStart(e, node.id)}
                    >
                      {/* Ficha Visual */}
                      <div className="h-10 w-10 rounded-full border-2 bg-slate-900 flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-110 border-green-500 shadow-green-500/10">
                        {assignedPlayer ? (
                          <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="sm" />
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">{node.label}</span>
                        )}
                      </div>

                      {/* Info / Selector */}
                      <div className="mt-1 bg-slate-950/90 border border-slate-800 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-200 flex items-center gap-1 select-none pointer-events-auto">
                        <span>{assignedPlayer ? assignedPlayer.nombre : node.label}</span>
                        {/* Selector integrado para hacer clic */}
                        <div className="relative">
                          <select
                            value={node.player_id || ''}
                            onChange={(e) => handlePlayerAssign(node.id, e.target.value)}
                            className="absolute inset-0 opacity-0 w-4 h-4 cursor-pointer"
                          >
                            <option value="">-- Vaciar --</option>
                            {players.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre} (#{p.dorsal})</option>
                            ))}
                          </select>
                          <ChevronDown className="h-2.5 w-2.5 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Jugadores Disponibles */}
            <div className="w-full md:w-48 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[600px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-green-500" /> Futbolistas
              </h4>
              <div className="space-y-1.5">
                {players.map((p) => {
                  const isAssigned = getAssignedPlayerIds().includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs border transition-all ${
                        isAssigned
                          ? 'bg-slate-900/30 border-slate-850 text-slate-500 opacity-60'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-green-500/30'
                      }`}
                    >
                      <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                      <div className="truncate flex-1">
                        <span className="block font-semibold truncate leading-none mb-0.5">{p.nombre}</span>
                        <span className="text-[9px] text-slate-500">#{p.dorsal} - {p.demarcacion}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'abp' && (
        <ABPSection players={players} />
      )}
    </div>
  );
}
