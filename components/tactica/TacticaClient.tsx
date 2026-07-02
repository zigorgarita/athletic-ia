'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { TacticalLineup, Match, Player, PositionNode } from '@/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Save, Copy, RefreshCw, AlertCircle, 
  CheckCircle, Plus, X, ShieldAlert,
  Zap, Award, HelpCircle, User, Edit3, BookOpen, Layout,
  ArrowRight
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { useTacticalSystems } from '@/hooks/useTacticalSystems';
import { TacticalField } from './TacticalField';

// Subcomponents
import { FormationSelector } from './systems/FormationSelector';
import { SystemCard } from './systems/SystemCard';
import { PlayerAssignmentSidebar } from './shared/PlayerAssignmentSidebar';
import { LineupManager } from './shared/LineupManager';
import { MatchPlanSelector } from './analysis/MatchPlanSelector';

const POSITION_ROLES = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

const DEFAULT_RECOMMENDATIONS: Record<string, string> = {
  'POR': 'Portero: Voz de mando activa. Cobertura del área y juego con el pie ágil.',
  'LD': 'Lateral Derecho: Progresar en amplitud y doblar por fuera al extremo.',
  'LI': 'Lateral Izquierdo: Mantener vigilancias rápidas y asegurar repliegue.',
  'DFC': 'Central: Anticipar juego directo, coberturas limpias y salida aseada.',
  'MCD': 'Mediocentro Defensivo: Sostén defensivo, ganar segundas jugadas y equilibrar basculaciones.',
  'MC': 'Mediocentro: Conexión dinámica entre líneas, distribución y pisar área rival.',
  'MCO': 'Mediapunta: Recibir entre líneas, giros rápidos para habilitar puntas.',
  'ED': 'Extremo Derecho: Aislar al lateral rival en 1x1 exterior, diagonal al área en centros opuestos.',
  'EI': 'Extremo Izquierdo: Desborde exterior, diagonales de fuera hacia dentro.',
  'DC': 'Delantero Centro: Fijar centrales rivales, juego de espaldas y desmarques de ruptura.'
};

export function TacticaClient() {
  const { isEditMode } = useEditMode();
  const { players, loading: loadingPlayers } = usePlayers();
  
  // Tactical Systems and DB communication hook
  const {
    systems,
    matchups,
    loading: loadingSystems,
    error: systemsError,
    fetchMatchPlan,
    saveMatchPlan
  } = useTacticalSystems();

  // Selected lineup / ID for update
  const [currentLineupId, setCurrentLineupId] = useState<string | null>(null);

  // Board states
  const [selectedFormation, setSelectedFormation] = useState<string>('1-4-2-3-1');
  const [nodesPropio, setNodesPropio] = useState<PositionNode[]>([]);
  const [nodesRival, setNodesRival] = useState<PositionNode[]>([]);
  const [lineupName, setLineupName] = useState<string>('');
  const [lineupNotes, setLineupNotes] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Tactical Analysis States
  const [rivalFormation, setRivalFormation] = useState<string>('1-4-3-3');
  const [ventajas, setVentajas] = useState<string>('');
  const [desventajas, setDesventajas] = useState<string>('');
  const [zonaConflicto, setZonaConflicto] = useState<string>('');
  const [dueloClave, setDueloClave] = useState<string>('');
  const [tareasLineas, setTareasLineas] = useState<string>('');

  // Database Load states
  const [savedLineups, setSavedLineups] = useState<TacticalLineup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal node editor states
  const [editingNode, setEditingNode] = useState<{ team: 'propio' | 'rival'; node: PositionNode } | null>(null);
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeNumber, setEditNodeNumber] = useState('');
  const [editNodeRole, setEditNodeRole] = useState('');
  const [editNodeNotes, setEditNodeNotes] = useState('');

  // Formations list from database systems
  const formationsOptions = useMemo(() => {
    return systems.map(s => ({ value: s.nombre, label: s.nombre }));
  }, [systems]);

  // Current selected system base description
  const activeSystem = useMemo(() => {
    return systems.find(s => s.nombre === selectedFormation) || null;
  }, [systems, selectedFormation]);

  // Initialize nodes based on selected own formation
  useEffect(() => {
    if (!currentLineupId && systems.length > 0) {
      const activeSys = systems.find(s => s.nombre === selectedFormation);
      const defaultCoords = activeSys?.coordenadas_base || [];
      setNodesPropio(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
    }
  }, [selectedFormation, currentLineupId, systems]);

  // Initialize nodes based on selected rival formation
  useEffect(() => {
    if (!currentLineupId && systems.length > 0) {
      const activeSys = systems.find(s => s.nombre === rivalFormation);
      const defaultCoords = activeSys?.coordenadas_base || [];
      setNodesRival(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
    }
  }, [rivalFormation, currentLineupId, systems]);

  // Sync date/match selection details and proposals
  useEffect(() => {
    if (systems.length === 0 || matchups.length === 0) return;

    const ownSys = systems.find(s => s.nombre === selectedFormation);
    const rivalSys = systems.find(s => s.nombre === rivalFormation);

    if (!ownSys || !rivalSys) return;

    const databaseMatch = matchups.find(
      m => m.system_own_id === ownSys.id && m.system_rival_id === rivalSys.id
    );

    if (databaseMatch) {
      setVentajas(databaseMatch.ventajas || '');
      setDesventajas(databaseMatch.desventajas || '');
      setZonaConflicto(databaseMatch.zona_conflicto || '');
      setDueloClave(databaseMatch.duelo_clave || '');
      setTareasLineas(databaseMatch.tareas_lineas || '');
    } else {
      setVentajas(`Ventajas teóricas de jugar con ${selectedFormation} contra un rival posicionado en ${rivalFormation}. Superioridad local en salida de balón y ocupación racional del carril medio.`);
      setDesventajas(`Vulnerabilidad del dibujo ${selectedFormation} ante repliegues fallidos o transiciones rápidas por el perfil exterior si el rival ${rivalFormation} explota las bandas.`);
      setZonaConflicto(`Carriles intermedios entre la línea de volantes rivales y la defensa del bloque bajo.`);
      setDueloClave(`Duelo por la posesión entre la base de construcción central y los interiores rivales.`);
      setTareasLineas(`Defensa: Línea de 4 basculando rápido.\nMedios: Asegurar circulación fluida.\nDelantera: Fijar centrales y generar pasillos exteriores.`);
    }
  }, [selectedFormation, rivalFormation, systems, matchups]);

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

  // --- Change Formation and Maintain assigned players ---
  const handleFormationChange = (formationName: string) => {
    setSelectedFormation(formationName);
    const activeSys = systems.find(s => s.nombre === formationName);
    const defaultCoords = activeSys?.coordenadas_base || [];
    setNodesPropio(prev => {
      return defaultCoords.map(coord => {
        const existingNode = prev.find(n => n.id === coord.id);
        return {
          ...coord,
          player_id: existingNode ? existingNode.player_id : null,
          notas_entrenador: existingNode?.notas_entrenador || '',
          customName: existingNode?.customName,
          customNumber: existingNode?.customNumber
        };
      });
    });
  };

  const handleRivalFormationChange = (formationName: string) => {
    setRivalFormation(formationName);
    const activeSys = systems.find(s => s.nombre === formationName);
    const defaultCoords = activeSys?.coordenadas_base || [];
    setNodesRival(prev => {
      return defaultCoords.map(coord => {
        const existingNode = prev.find(n => n.id === coord.id);
        return {
          ...coord,
          player_id: null,
          notas_entrenador: existingNode?.notas_entrenador || '',
          customName: existingNode?.customName,
          customNumber: existingNode?.customNumber
        };
      });
    });
  };

  const handleSwapPizarras = () => {
    const tempNodes = [...nodesPropio];
    const tempForm = selectedFormation;

    setNodesPropio(nodesRival);
    setNodesRival(tempNodes);

    setSelectedFormation(rivalFormation);
    setRivalFormation(tempForm);

    setSuccessMsg('Intercambiadas las pizarras tácticas de ambos campos.');
  };

  const handleCopyPropioToRival = () => {
    setNodesRival(nodesPropio.map(n => ({
      ...n,
      player_id: null,
      customName: n.customName || players.find(p => p.id === n.player_id)?.nombre || undefined,
      customNumber: n.customNumber || players.find(p => p.id === n.player_id)?.dorsal.toString() || undefined
    })));
    setRivalFormation(selectedFormation);
    setSuccessMsg('Copiada la alineación de nuestro equipo al rival.');
  };

  const handleCopyRivalToPropio = () => {
    setNodesPropio(nodesRival.map(n => ({
      ...n,
      player_id: null,
      customName: n.customName,
      customNumber: n.customNumber
    })));
    setSelectedFormation(rivalFormation);
    setSuccessMsg('Copiada la alineación del rival a nuestro equipo.');
  };

  const formatNodeForDb = (n: PositionNode) => ({
    id: n.id,
    label: n.label,
    x: parseFloat(n.x.toFixed(1)),
    y: parseFloat(n.y.toFixed(1)),
    player_id: n.player_id,
    notas_entrenador: n.notas_entrenador || '',
    customName: n.customName || undefined,
    customNumber: n.customNumber || undefined
  });

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
        notes: lineupNotes || null,
        posiciones: {
          propio: nodesPropio.map(formatNodeForDb),
          rival: nodesRival.map(formatNodeForDb)
        },
        match_id: selectedMatchId || null,
        ventajas: ventajas || null,
        desventajas: desventajas || null,
        zona_conflicto: zonaConflicto || null,
        duelo_clave: dueloClave || null,
        orientaciones_individuales: tareasLineas || null
      };

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      let error;
      if (currentLineupId) {
        const res = await supabase.rpc('exec_secure_upsert', {
          target_table: 'tactical_lineups',
          payload: { ...payload, id: currentLineupId },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });
        error = res.error;
      } else {
        const res = await supabase.rpc('exec_secure_upsert', {
          target_table: 'tactical_lineups',
          payload: payload,
          conflict_columns: null,
          staff_passkey: passkey
        });
        error = res.error;
      }

      if (error) throw error;

      // Save Plan táctico of the Match if connected
      if (selectedMatchId) {
        const ownSys = systems.find(s => s.nombre === selectedFormation);
        const rivalSys = systems.find(s => s.nombre === rivalFormation);
        const databaseMatch = matchups.find(
          m => ownSys && rivalSys && m.system_own_id === ownSys.id && m.system_rival_id === rivalSys.id
        );

        await saveMatchPlan({
          match_id: selectedMatchId,
          system_own_id: ownSys?.id || null,
          system_rival_id: rivalSys?.id || null,
          matchup_id: databaseMatch?.id || null,
          notas_entrenador: lineupNotes || null,
          conclusiones_post: null,
          estado: 'borrador'
        });
      }

      setSuccessMsg('Alineación táctica y análisis de comparador guardados con éxito.');
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
  const handleLoadLineup = async (lineup: TacticalLineup) => {
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
    setTareasLineas(lineup.orientaciones_individuales || '');
    
    // Load position nodes with backward compatibility
    if (lineup.posiciones && typeof lineup.posiciones === 'object') {
      const posObj = lineup.posiciones as { propio?: PositionNode[]; rival?: PositionNode[] };
      if (posObj.propio && posObj.rival) {
        setNodesPropio((posObj.propio as PositionNode[]).map((p) => ({
          id: p.id,
          label: p.label,
          x: p.x,
          y: p.y,
          player_id: p.player_id,
          notas_entrenador: p.notas_entrenador || '',
          customName: p.customName,
          customNumber: p.customNumber
        })));
        setNodesRival((posObj.rival as PositionNode[]).map((p) => ({
          id: p.id,
          label: p.label,
          x: p.x,
          y: p.y,
          player_id: p.player_id,
          notas_entrenador: p.notas_entrenador || '',
          customName: p.customName,
          customNumber: p.customNumber
        })));
      } else if (Array.isArray(lineup.posiciones)) {
        setNodesPropio((lineup.posiciones as PositionNode[]).map((p) => ({
          id: p.id,
          label: p.label,
          x: p.x,
          y: p.y,
          player_id: p.player_id,
          notas_entrenador: p.notas_entrenador || ''
        })));
        const activeSys = systems.find(s => s.nombre === (lineup.sistema_rival || '1-4-3-3'));
        const defaultRivalCoords = activeSys?.coordenadas_base || [];
        setNodesRival(defaultRivalCoords.map(coord => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        })));
      }
    }
    setSuccessMsg(`Cargada la pizarra: "${lineup.nombre_pizarra || lineup.nombre_sistema}"`);

    // Load match plan override details if match exists
    if (lineup.match_id) {
      const plan = await fetchMatchPlan(lineup.match_id);
      if (plan && plan.notas_entrenador) {
        setLineupNotes(plan.notas_entrenador);
      }
    }
  };

  const handleDuplicateLineup = () => {
    if (!lineupName) {
      setErrorMsg('Primero carga o diseña una alineación para duplicar.');
      return;
    }
    setCurrentLineupId(null);
    setLineupName(`Copia de ${lineupName}`);
    setSuccessMsg('Pizarra duplicada localmente. Haz clic en Guardar para persistirla.');
  };

  const handleResetBoard = () => {
    if (confirm('¿Deseas restablecer la posición y vaciar todos los jugadores?')) {
      const ownSys = systems.find(s => s.nombre === selectedFormation);
      const defaultCoords = ownSys?.coordenadas_base || [];
      setNodesPropio(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
      const rivalSys = systems.find(s => s.nombre === rivalFormation);
      const defaultRivalCoords = rivalSys?.coordenadas_base || [];
      setNodesRival(
        defaultRivalCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
      setSuccessMsg('Se ha restablecido la pizarra.');
    }
  };

  async function handleDeleteLineup(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta pizarra táctica?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'tactical_lineups',
        record_id: id,
        staff_passkey: passkey
      });
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
        setTareasLineas('');
      }
      loadSavedData();
      setSuccessMsg('Pizarra eliminada con éxito.');
    } catch (err) {
      console.error('Error deleting lineup:', err);
    }
  }

  const getAssignedPlayerIds = () => nodesPropio.map(n => n.player_id).filter(id => !!id) as string[];

  const handleRosterClick = (player: Player) => {
    if (!isEditMode) return;
    const isAssigned = getAssignedPlayerIds().includes(player.id);
    if (isAssigned) {
      setNodesPropio(prev => prev.map(n => n.player_id === player.id ? { ...n, player_id: null } : n));
    } else {
      const emptyNode = nodesPropio.find(n => !n.player_id);
      if (emptyNode) {
        setNodesPropio(prev => prev.map(n => n.id === emptyNode.id ? { ...n, player_id: player.id } : n));
      } else {
        alert('El campo está completo. Quita o sustituye un jugador.');
      }
    }
  };

  // Helper to open node editor
  const handleOpenNodeEditor = (team: 'propio' | 'rival', node: PositionNode) => {
    const assignedPlayer = team === 'propio' ? players.find(p => p.id === node.player_id) : null;
    
    setEditingNode({ team, node });
    setEditNodeName(node.customName || (assignedPlayer ? assignedPlayer.nombre : ''));
    setEditNodeNumber(node.customNumber || (assignedPlayer ? assignedPlayer.dorsal.toString() : ''));
    setEditNodeRole(node.label);
    setEditNodeNotes(node.notas_entrenador || '');
  };

  // Helper to save node custom details
  const handleSaveNodeDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    const { team, node } = editingNode;
    const updater = (prev: PositionNode[]) =>
      prev.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            label: editNodeRole,
            customName: editNodeName.trim() || undefined,
            customNumber: editNodeNumber.trim() || undefined,
            notas_entrenador: editNodeNotes.trim() || undefined,
          };
        }
        return n;
      });

    if (team === 'propio') {
      setNodesPropio(updater);
    } else {
      setNodesRival(updater);
    }

    setEditingNode(null);
    setSuccessMsg('Ficha de posición actualizada correctamente.');
  };

  if (loadingPlayers || loadingSystems) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full animate-pulse" />
        <Skeleton className="h-96 w-full animate-pulse" />
      </div>
    );
  }

  const finalError = errorMsg || systemsError;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Layout className="h-8 w-8 text-[#CC0E21]" />
            Pizarra Táctica
          </h1>
          <p className="text-slate-400 text-sm">
            Diseña formaciones, arrastra jugadores, define roles y realiza el análisis táctico para cada partido.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode && (
            <Button variant="secondary" onClick={handleResetBoard} className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800">
              <RefreshCw className="h-3.5 w-3.5 text-orange-400" /> Restablecer
            </Button>
          )}
          {currentLineupId && isEditMode && (
            <Button variant="secondary" onClick={handleDuplicateLineup} className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800">
              <Copy className="h-3.5 w-3.5 text-blue-400" /> Duplicar Pizarra
            </Button>
          )}
          {isEditMode && (
            <Button variant="primary" onClick={handleSaveLineup} loading={isSaving} className="flex items-center gap-1.5 text-xs">
              <Save className="h-3.5 w-3.5" /> {currentLineupId ? 'Actualizar' : 'Guardar'}
            </Button>
          )}
          {currentLineupId && isEditMode && (
            <Button 
              variant="secondary" 
              onClick={() => {
                setCurrentLineupId(null);
                setLineupName('');
                setLineupNotes('');
                setSelectedMatchId('');
                setSuccessMsg('Nueva pizarra vacía lista para diseñar.');
              }}
              className="flex items-center gap-1.5 text-xs bg-slate-900/60 border-slate-800 text-slate-300"
            >
              <Plus className="h-3.5 w-3.5 text-[#CC0E21]" /> Nueva
            </Button>
          )}
        </div>
      </div>

      {/* Own Formation Selector */}
      <FormationSelector
        label="Sistema de Juego Propio"
        systems={systems}
        selectedFormation={selectedFormation}
        onSelect={handleFormationChange}
      />

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
      {finalError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{finalError}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Pitch and configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          <MatchPlanSelector
            lineupName={lineupName}
            onLineupNameChange={setLineupName}
            selectedMatchId={selectedMatchId}
            onMatchIdChange={setSelectedMatchId}
            rivalFormation={rivalFormation}
            onRivalFormationChange={handleRivalFormationChange}
            formationsOptions={formationsOptions}
            matches={matches}
            lineupNotes={lineupNotes}
            onLineupNotesChange={setLineupNotes}
          />

          <LineupManager
            savedLineups={savedLineups}
            loadingLineups={loadingLineups}
            currentLineupId={currentLineupId}
            matches={matches}
            onLoad={handleLoadLineup}
            onDelete={handleDeleteLineup}
          />

          {/* Description of current selected own system */}
          <SystemCard system={activeSystem} />
        </div>

        {/* Center column: Soccer fields (6/12) */}
        <div className="lg:col-span-6 flex flex-col items-center gap-6">
          <TacticalField
            team="propio"
            nodes={nodesPropio}
            players={players}
            isEditMode={isEditMode}
            onNodesChange={setNodesPropio}
            onNodeClick={(node) => handleOpenNodeEditor('propio', node)}
          />

          {/* UTILITIES TOOLBAR */}
          {isEditMode && (
            <div className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-2xl border border-slate-800/80 w-full max-w-[480px] justify-around">
              <button
                onClick={handleSwapPizarras}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all"
                title="Intercambia las dos pizarras tácticas"
              >
                <RefreshCw className="h-3.5 w-3.5 text-orange-400" />
                Intercambiar campos
              </button>
              <button
                onClick={handleCopyPropioToRival}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all"
                title="Copia el dibujo propio al del rival"
              >
                <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                Copiar a Rival
              </button>
              <button
                onClick={handleCopyRivalToPropio}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all"
                title="Copia el dibujo del rival al propio"
              >
                <ArrowRight className="h-3.5 w-3.5 text-emerald-450" />
                Copiar a Propio
              </button>
            </div>
          )}

          <TacticalField
            team="rival"
            nodes={nodesRival}
            players={players}
            isEditMode={isEditMode}
            onNodesChange={setNodesRival}
            onNodeClick={(node) => handleOpenNodeEditor('rival', node)}
          />
        </div>

        {/* Right column: Roster sidebar (3/12) */}
        <div className="lg:col-span-3">
          <PlayerAssignmentSidebar
            players={players}
            assignedPlayerIds={getAssignedPlayerIds()}
            isEditMode={isEditMode}
            onPlayerClick={handleRosterClick}
          />
        </div>
      </div>

      {/* Comparador Táctico Section */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#CC0E21]" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
              Comparador Táctico (Análisis Estratégico)
            </h3>
          </div>
          <div className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850/60 px-3 py-1 rounded-xl">
            {selectedFormation} <ArrowRight className="inline-block h-3.5 w-3.5 mx-1 text-slate-500" /> {rivalFormation}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-[#CC0E21] flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#CC0E21]" /> Ventajas del Sistema
              </label>
              <textarea
                value={ventajas}
                onChange={(e) => setVentajas(e.target.value)}
                placeholder="Añade o edita ventajas del sistema..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Desventajas / Riesgos
              </label>
              <textarea
                value={desventajas}
                onChange={(e) => setDesventajas(e.target.value)}
                placeholder="Añade o edita desventajas/riesgos..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-red-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Zona de Conflicto Clave
                </label>
                <input
                  type="text"
                  value={zonaConflicto}
                  onChange={(e) => setZonaConflicto(e.target.value)}
                  placeholder="Zona de conflicto clave..."
                  className="w-full bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              <div className="bg-slate-950/30 border border-slate-850/60 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-yellow-500" /> Duelo Táctico Principal
                </label>
                <input
                  type="text"
                  value={dueloClave}
                  onChange={(e) => setDueloClave(e.target.value)}
                  placeholder="Duelo táctico principal..."
                  className="w-full bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-850/60 p-4.5 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-blue-400" /> Tareas por Líneas
              </label>
              <textarea
                value={tareasLineas}
                onChange={(e) => setTareasLineas(e.target.value)}
                placeholder="Añade o edita tareas por líneas..."
                className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orientaciones Individuales y Notas del Entrenador */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <User className="h-5 w-5 text-[#CC0E21]" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
            Orientaciones Individuales y Notas del Entrenador
          </h3>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {nodesPropio.map(node => {
            const assignedPlayer = players.find(p => p.id === node.player_id);
            if (!assignedPlayer) return null;

            // Extract preset instructions for this position from tactical db
            const ownSys = systems.find(s => s.nombre === selectedFormation);
            const rivalSys = systems.find(s => s.nombre === rivalFormation);
            const match = matchups.find(
              m => ownSys && rivalSys && m.system_own_id === ownSys.id && m.system_rival_id === rivalSys.id
            );
            const presetInstructions = match?.ai_context || 
                                       DEFAULT_RECOMMENDATIONS[node.label] || 
                                       `Recomendación de posición para ${node.label}.`;

            return (
              <div key={node.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="sm" />
                    <div>
                      <span className="font-bold text-slate-100 text-xs block">{assignedPlayer.nombre}</span>
                      <span className="text-[9px] font-bold text-[#CC0E21] bg-[#CC0E21]/10 px-1.5 py-0.2 rounded">
                        Posición: {node.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/40 border border-slate-850/60 rounded-xl text-[11px] text-slate-350 italic space-y-1">
                    <span className="font-bold text-[9px] uppercase tracking-wide text-slate-500 block">Propuesta IA:</span>
                    <span>{presetInstructions}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Edit3 className="h-3 w-3 text-slate-500" /> Notas del Entrenador
                  </label>
                  <textarea
                    value={node.notas_entrenador || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodesPropio(prev => prev.map(n => n.id === node.id ? { ...n, notas_entrenador: val } : n));
                    }}
                    placeholder={`Escribe notas tácticas específicas para ${assignedPlayer.nombre.split(' ')[0]}...`}
                    className="w-full min-h-[70px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            );
          })}

          {nodesPropio.filter(n => !!n.player_id).length === 0 && (
            <p className="text-xs text-slate-500 italic p-4 text-center">
              Asigna jugadores de la plantilla en el campo para configurar sus notas y orientaciones.
            </p>
          )}
        </div>
      </div>

      {/* Modal para Editar Ficha / Posición */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Editar Ficha ({editingNode.team === 'propio' ? 'Nuestro Equipo' : 'Rival'})
              </h3>
              <button
                onClick={() => setEditingNode(null)}
                className="text-slate-500 hover:text-slate-350"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNodeDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Nombre del Jugador
                </label>
                <input
                  type="text"
                  value={editNodeName}
                  onChange={(e) => setEditNodeName(e.target.value)}
                  placeholder="Ej: John Doe"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Dorsal
                </label>
                <input
                  type="text"
                  value={editNodeNumber}
                  onChange={(e) => setEditNodeNumber(e.target.value)}
                  placeholder="Ej: 10"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Rol / Posición
                </label>
                <select
                  value={editNodeRole}
                  onChange={(e) => setEditNodeRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
                >
                  {POSITION_ROLES.map(role => (
                    <option key={role} value={role} className="bg-slate-900">{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Notas Tácticas
                </label>
                <textarea
                  value={editNodeNotes}
                  onChange={(e) => setEditNodeNotes(e.target.value)}
                  placeholder="Notas tácticas específicas para esta ficha..."
                  className="w-full min-h-[80px] px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingNode(null)}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 text-xs"
                >
                  Guardar Ficha
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
