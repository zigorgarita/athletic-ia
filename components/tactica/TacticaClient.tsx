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
import { 
  Layout, Save, FolderOpen, RefreshCw, AlertCircle, 
  CheckCircle, Users, Trash2, ChevronDown, Copy, Plus, X, ShieldAlert,
  Zap, Award, HelpCircle, User, Star
} from 'lucide-react';

interface PositionNode {
  id: number;
  label: string; // CD, GK, DC, etc.
  x: number; // %
  y: number; // %
  player_id: string | null;
}

const POSITION_ROLES = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

const FORMATIONS: Record<string, { label: string; coords: Omit<PositionNode, 'player_id'>[] }> = {
  '1-4-2-3-1': {
    label: '1-4-2-3-1',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 15, y: 68 },
      { id: 3, label: 'DFC', x: 38, y: 74 },
      { id: 4, label: 'DFC', x: 62, y: 74 },
      { id: 5, label: 'LI', x: 85, y: 68 },
      { id: 6, label: 'MCD', x: 36, y: 58 },
      { id: 7, label: 'MCD', x: 64, y: 58 },
      { id: 8, label: 'MCO', x: 50, y: 40 },
      { id: 9, label: 'ED', x: 18, y: 30 },
      { id: 10, label: 'EI', x: 82, y: 30 },
      { id: 11, label: 'DC', x: 50, y: 16 },
    ]
  },
  '1-4-3-3': {
    label: '1-4-3-3',
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
  '1-4-4-2': {
    label: '1-4-4-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 15, y: 68 },
      { id: 3, label: 'DFC', x: 38, y: 74 },
      { id: 4, label: 'DFC', x: 62, y: 74 },
      { id: 5, label: 'LI', x: 85, y: 68 },
      { id: 6, label: 'MC', x: 36, y: 50 },
      { id: 7, label: 'MC', x: 64, y: 50 },
      { id: 8, label: 'ED', x: 15, y: 40 },
      { id: 9, label: 'EI', x: 85, y: 40 },
      { id: 10, label: 'DC', x: 38, y: 18 },
      { id: 11, label: 'DC', x: 62, y: 18 },
    ]
  },
  '1-3-5-2': {
    label: '1-3-5-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'DFC', x: 25, y: 74 },
      { id: 3, label: 'DFC', x: 50, y: 77 },
      { id: 4, label: 'DFC', x: 75, y: 74 },
      { id: 5, label: 'MCD', x: 36, y: 58 },
      { id: 6, label: 'MCD', x: 64, y: 58 },
      { id: 7, label: 'LD', x: 15, y: 45 },
      { id: 8, label: 'LI', x: 85, y: 45 },
      { id: 9, label: 'MCO', x: 50, y: 40 },
      { id: 10, label: 'DC', x: 38, y: 18 },
      { id: 11, label: 'DC', x: 62, y: 18 },
    ]
  },
  '1-5-3-2': {
    label: '1-5-3-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88 },
      { id: 2, label: 'LD', x: 12, y: 68 },
      { id: 3, label: 'DFC', x: 30, y: 75 },
      { id: 4, label: 'DFC', x: 50, y: 77 },
      { id: 5, label: 'DFC', x: 70, y: 75 },
      { id: 6, label: 'LI', x: 88, y: 68 },
      { id: 7, label: 'MC', x: 35, y: 50 },
      { id: 8, label: 'MC', x: 50, y: 54 },
      { id: 9, label: 'MC', x: 65, y: 50 },
      { id: 10, label: 'DC', x: 38, y: 22 },
      { id: 11, label: 'DC', x: 62, y: 22 },
    ]
  },
  'Personalizado': {
    label: 'Personalizado (Editar Libremente)',
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
  }
};

export function TacticaClient() {
  const { players, loading: loadingPlayers } = usePlayers();

  // Selected lineup / ID for update
  const [currentLineupId, setCurrentLineupId] = useState<string | null>(null);

  // Board states
  const [selectedFormation, setSelectedFormation] = useState<string>('1-4-2-3-1');
  const [nodes, setNodes] = useState<PositionNode[]>([]);
  const [lineupName, setLineupName] = useState<string>('');
  const [lineupNotes, setLineupNotes] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Tactical Analysis States
  const [rivalFormation, setRivalFormation] = useState<string>('1-4-3-3');
  const [ventajas, setVentajas] = useState<string>('');
  const [desventajas, setDesventajas] = useState<string>('');
  const [zonaConflicto, setZonaConflicto] = useState<string>('');
  const [dueloClave, setDueloClave] = useState<string>('');
  const [orientacionesIndividuales, setOrientacionesIndividuales] = useState<string>('');

  // Helper State: Selected Player to assign via click
  const [activePlayerForAssignment, setActivePlayerForAssignment] = useState<string | null>(null);

  // Database Load states
  const [savedLineups, setSavedLineups] = useState<TacticalLineup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize nodes based on selected formation (if not loading saved lineup)
  useEffect(() => {
    if (!currentLineupId) {
      const defaultCoords = FORMATIONS[selectedFormation]?.coords || [];
      setNodes(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
        }))
      );
    }
  }, [selectedFormation, currentLineupId]);

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
    // If click on inner selectors, do not trigger drag
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.closest('.no-drag')) return;

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

  // --- Assign player directly via click helper ---
  const handlePlayerAssign = (nodeId: number, playerId: string | null) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return { ...n, player_id: playerId };
      }
      // Evitar duplicados
      if (playerId && n.player_id === playerId && n.id !== nodeId) {
        return { ...n, player_id: null };
      }
      return n;
    }));
    setActivePlayerForAssignment(null);
  };

  // Click on node: if there is an active player selected, assign them, otherwise do nothing
  const handleNodeClick = (nodeId: number) => {
    if (activePlayerForAssignment) {
      handlePlayerAssign(nodeId, activePlayerForAssignment);
    }
  };

  // Change individual node label/role
  const handleRoleChange = (nodeId: number, newRole: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, label: newRole } : n));
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
        nombre_pizarra: lineupName,
        sistema_propio: selectedFormation,
        sistema_rival: rivalFormation,
        notas: lineupNotes || null,
        posiciones: nodes.map(n => ({
          id: n.id,
          label: n.label,
          x: parseFloat(n.x.toFixed(1)),
          y: parseFloat(n.y.toFixed(1)),
          player_id: n.player_id
        })),
        match_id: selectedMatchId || null,
        ventajas: ventajas || null,
        desventajas: desventajas || null,
        zona_conflicto: zonaConflicto || null,
        duelo_clave: dueloClave || null,
        orientaciones_individuales: orientacionesIndividuales || null
      };

      let error;
      if (currentLineupId) {
        // Update existing
        const res = await supabase.from('tactical_lineups').update(payload).eq('id', currentLineupId);
        error = res.error;
      } else {
        // Insert new
        const res = await supabase.from('tactical_lineups').insert(payload);
        error = res.error;
      }

      if (error) throw error;

      setSuccessMsg('Alineación y análisis táctico guardados con éxito.');
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
    setCurrentLineupId(lineup.id);
    setSelectedFormation(lineup.sistema_propio || lineup.nombre_sistema || '1-4-2-3-1');
    setLineupName(lineup.nombre_pizarra || lineup.nombre_sistema);
    setLineupNotes(lineup.notas || '');
    setSelectedMatchId(lineup.match_id || '');

    // Load analysis fields
    setRivalFormation(lineup.sistema_rival || '1-4-3-3');
    setVentajas(lineup.ventajas || '');
    setDesventajas(lineup.desventajas || '');
    setZonaConflicto(lineup.zona_conflicto || '');
    setDueloClave(lineup.duelo_clave || '');
    setOrientacionesIndividuales(lineup.orientaciones_individuales || '');
    
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
    setSuccessMsg(`Cargada la pizarra: "${lineup.nombre_pizarra || lineup.nombre_sistema}"`);
  };

  // Duplicate current state into a new board
  const handleDuplicateLineup = () => {
    if (!lineupName) {
      setErrorMsg('Primero carga o diseña una alineación para duplicar.');
      return;
    }
    setCurrentLineupId(null); // Clear ID to force insert on save
    setLineupName(`Copia de ${lineupName}`);
    setSuccessMsg('Pizarra duplicada localmente. Cambia el nombre y haz clic en Guardar para persistirla.');
  };

  // Reset to current formation template
  const handleResetBoard = () => {
    if (confirm('¿Deseas restablecer la posición y vaciar todos los jugadores?')) {
      const defaultCoords = FORMATIONS[selectedFormation]?.coords || [];
      setNodes(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
        }))
      );
      setSuccessMsg('Se ha restablecido la pizarra.');
    }
  };

  // Delete Board
  async function handleDeleteLineup(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta pizarra táctica?')) return;
    try {
      const { error } = await supabase.from('tactical_lineups').delete().eq('id', id);
      if (error) throw error;
      if (currentLineupId === id) {
        setCurrentLineupId(null);
        setLineupName('');
        setLineupNotes('');
        setSelectedMatchId('');
        setVentajas('');
        setDesventajas('');
        setZonaConflicto('');
        setDueloClave('');
        setOrientacionesIndividuales('');
      }
      loadSavedData();
      setSuccessMsg('Pizarra eliminada con éxito.');
    } catch (err) {
      console.error('Error deleting lineup:', err);
    }
  }

  // Helper: Get assigned player IDs
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Layout className="h-8 w-8 text-green-500" />
            Pizarra Táctica Profesional
          </h1>
          <p className="text-slate-400 text-sm">
            Diseña formaciones, arrastra jugadores, define roles y realiza el análisis táctico para cada partido.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleResetBoard} className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800">
            <RefreshCw className="h-3.5 w-3.5 text-orange-400" /> Restablecer
          </Button>
          {currentLineupId && (
            <Button variant="secondary" onClick={handleDuplicateLineup} className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800">
              <Copy className="h-3.5 w-3.5 text-blue-400" /> Duplicar Pizarra
            </Button>
          )}
          <Button variant="primary" onClick={handleSaveLineup} loading={isSaving} className="flex items-center gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> {currentLineupId ? 'Actualizar' : 'Guardar'}
          </Button>
          {currentLineupId && (
            <Button 
              variant="secondary" 
              onClick={() => {
                setCurrentLineupId(null);
                setLineupName('');
                setLineupNotes('');
                setSelectedMatchId('');
                setVentajas('');
                setDesventajas('');
                setZonaConflicto('');
                setDueloClave('');
                setOrientacionesIndividuales('');
                setSuccessMsg('Nueva pizarra vacía lista para diseñar.');
              }}
              className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800 text-slate-300"
            >
              <Plus className="h-3.5 w-3.5 text-green-400" /> Nueva Pizarra
            </Button>
          )}
        </div>
      </div>

      {/* Success and Error Banners */}
      {successMsg && (
        <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form, Pitch, and Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna 1 (3/12): Configuraciones, Jornadas y Pizarras Guardadas */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Metadatos de la Pizarra */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-green-500" /> Datos del Plan
            </h3>

            <Input
              label="Nombre de Pizarra / Plan"
              type="text"
              placeholder="Ej. Plan A - Presión Alta"
              value={lineupName}
              onChange={(e) => setLineupName(e.target.value)}
            />

            <Select
              label="Vincular a Partido"
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              options={[
                { value: '', label: '-- Sin vincular --' },
                ...matches.map(m => ({ value: m.id, label: `Jornada ${m.jornada} vs ${m.rival}` }))
              ]}
            />

            <Select
              label="Sistema Propio"
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
              options={Object.keys(FORMATIONS).map(f => ({ value: f, label: FORMATIONS[f].label }))}
            />

            <Input
              label="Sistema Rival"
              type="text"
              placeholder="Ej. 1-4-4-2"
              value={rivalFormation}
              onChange={(e) => setRivalFormation(e.target.value)}
            />

            <div>
              <label className="block text-slate-400 text-xs font-bold mb-1.5">Notas / Observaciones Generales</label>
              <textarea
                value={lineupNotes}
                onChange={(e) => setLineupNotes(e.target.value)}
                placeholder="Anotaciones tácticas rápidas..."
                className="w-full min-h-[70px] bg-slate-950/80 border border-slate-850 focus:border-green-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Historial de Pizarras Guardadas */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Pizarras Guardadas
            </h3>

            {loadingLineups ? (
              <Skeleton className="h-16 w-full" />
            ) : savedLineups.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">No hay alineaciones guardadas.</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {savedLineups.map((lineup) => {
                  const match = matches.find(m => m.id === lineup.match_id);
                  return (
                    <div
                      key={lineup.id}
                      onClick={() => handleLoadLineup(lineup)}
                      className={`flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-850/50 border rounded-2xl text-xs cursor-pointer transition-all duration-200 ${
                        currentLineupId === lineup.id ? 'border-green-500/40 bg-green-500/5' : 'border-slate-850'
                      }`}
                    >
                      <div className="truncate mr-2 flex-1">
                        <span className="font-bold text-slate-200 block truncate">{lineup.nombre_pizarra || lineup.nombre_sistema}</span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          {lineup.sistema_propio || lineup.nombre_sistema} {lineup.sistema_rival ? `vs ${lineup.sistema_rival}` : ''}
                        </span>
                        {match && (
                          <span className="inline-block mt-1 text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-semibold border border-slate-800/60">
                            Jor. {match.jornada} vs {match.rival}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteLineup(lineup.id, e)}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded-xl transition-colors duration-150"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna 2 (6/12): El Campo Interactivo de Fútbol */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {activePlayerForAssignment && (
            <div className="w-full max-w-[480px] mb-3 p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-center text-xs flex items-center justify-between px-3 animation-pulse">
              <span>Haz clic en un círculo en el campo para colocar a: <b>{players.find(p => p.id === activePlayerForAssignment)?.nombre}</b></span>
              <button onClick={() => setActivePlayerForAssignment(null)} className="bg-green-500/20 p-1 rounded-full text-green-400 hover:bg-green-500/30">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div
            ref={containerRef}
            className="relative w-full aspect-[2/3] max-w-[480px] bg-emerald-950/90 rounded-[2rem] border-2 border-emerald-500/20 overflow-hidden shadow-2xl select-none"
          >
            {/* SVG Pitch Lines */}
            <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
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
              const assignedPlayer = players.find(p => p.id === node.player_id);
              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  className="absolute z-10 flex flex-col items-center cursor-move group"
                  onMouseDown={(e) => handleDragStart(e, node.id)}
                  onTouchStart={(e) => handleDragStart(e, node.id)}
                >
                  {/* Ficha Visual */}
                  <div className={`h-11 w-11 rounded-full border-2 bg-slate-950 flex items-center justify-center shadow-xl transition-all duration-150 active:scale-110 border-slate-700 hover:border-green-500/50 ${
                    assignedPlayer ? 'border-green-500/70 shadow-green-500/10' : 'border-slate-800 bg-slate-900/80'
                  }`}>
                    {assignedPlayer ? (
                      <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="sm" className="w-full h-full" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400">{node.label}</span>
                    )}
                  </div>

                  {/* Info / Selector */}
                  <div className="mt-1 bg-slate-950/90 border border-slate-800/80 px-2 py-0.5 rounded-xl text-[8px] font-extrabold text-slate-200 flex items-center gap-1 select-none pointer-events-auto no-drag shadow-lg">
                    <span className="truncate max-w-[65px]">{assignedPlayer ? assignedPlayer.nombre : node.label}</span>
                    
                    {/* Selector de Rol */}
                    <div className="relative">
                      <select
                        value={node.label}
                        onChange={(e) => handleRoleChange(node.id, e.target.value)}
                        className="absolute inset-0 opacity-0 w-3.5 h-3.5 cursor-pointer font-bold"
                      >
                        {POSITION_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <ChevronDown className="h-2 w-2 text-slate-450 hover:text-slate-200" />
                    </div>

                    {/* Remover Asignación */}
                    {assignedPlayer && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayerAssign(node.id, null);
                        }} 
                        className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna 3 (3/12): Barra Lateral de Jugadores de la Plantilla */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[600px]">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-green-500" /> Plantilla Activa
            </h3>
            
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              Selecciona un jugador del roster y pulsa sobre una posición en el campo para asignarlo.
            </p>

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {players.map((p) => {
                const isAssigned = getAssignedPlayerIds().includes(p.id);
                const isSelected = activePlayerForAssignment === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (isAssigned) {
                        // Find node and clear
                        const node = nodes.find(n => n.player_id === p.id);
                        if (node) handlePlayerAssign(node.id, null);
                      } else {
                        setActivePlayerForAssignment(isSelected ? null : p.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all cursor-pointer select-none ${
                      isAssigned
                        ? 'bg-slate-900/30 border-slate-850/60 text-slate-500 hover:bg-slate-900/50'
                        : isSelected
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 ring-1 ring-green-500/30'
                        : 'bg-slate-950/60 border-slate-850/70 text-slate-200 hover:border-slate-800 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                      <div className="truncate">
                        <span className="block font-semibold truncate leading-none mb-0.5">{p.nombre}</span>
                        <span className="text-[9px] text-slate-500 font-medium">#{p.dorsal} - {p.demarcacion}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-bold">
                      {isAssigned ? (
                        <span className="bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/10">ON</span>
                      ) : isSelected ? (
                        <span className="bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/10 animation-pulse">LISTO</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Secciones de Análisis Táctico */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Layout className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
            Análisis Táctico de la Jornada
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ventajas y Desventajas */}
          <div className="space-y-4">
            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-green-400" /> Ventajas del Sistema vs Rival
              </label>
              <textarea
                value={ventajas}
                onChange={(e) => setVentajas(e.target.value)}
                placeholder="Ej. Superioridad numérica en el medio campo, pasillos laterales libres para laterales profundos..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-green-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors resize-y"
              />
            </div>

            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Desventajas / Riesgos del Sistema
              </label>
              <textarea
                value={desventajas}
                onChange={(e) => setDesventajas(e.target.value)}
                placeholder="Ej. Vulnerables en transiciones rápidas si los mediocentros no realizan vigilancias..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-red-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors resize-y"
              />
            </div>
          </div>

          {/* Zonas, Duelo Clave e Orientaciones */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Zona de Conflicto Táctico
                </label>
                <input
                  type="text"
                  value={zonaConflicto}
                  onChange={(e) => setZonaConflicto(e.target.value)}
                  placeholder="Ej. Espacio a la espalda del DFC"
                  className="w-full bg-slate-950/80 border border-slate-850 focus:border-green-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-yellow-500" /> Duelo Táctico Clave
                </label>
                <input
                  type="text"
                  value={dueloClave}
                  onChange={(e) => setDueloClave(e.target.value)}
                  placeholder="Ej. Extremo Izquierdo vs Lateral Derecho"
                  className="w-full bg-slate-950/80 border border-slate-850 focus:border-green-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" /> Orientaciones / Instrucciones Individuales
              </label>
              <textarea
                value={orientacionesIndividuales}
                onChange={(e) => setOrientacionesIndividuales(e.target.value)}
                placeholder="Ej. Aingeru: Presionar la salida del central zurdo. Unax: Mantener posición y cobertura..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-green-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors resize-y"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
