'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { TacticalLineup, Match, Player, PositionNode, TacticalRoleCard } from '@/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Save, Copy, RefreshCw, AlertCircle, 
  CheckCircle, Plus, X, Layout,
  ArrowRight
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { useTacticalSystems } from '@/hooks/useTacticalSystems';
import { useTacticalRoleCards } from '@/hooks/useTacticalRoleCards';
import { TacticalField } from './TacticalField';

// Subcomponents
import { FormationSelector } from './systems/FormationSelector';
import { SystemCard } from './systems/SystemCard';
import { PlayerAssignmentSidebar } from './shared/PlayerAssignmentSidebar';
import { LineupManager } from './shared/LineupManager';
import { MatchPlanSelector } from './analysis/MatchPlanSelector';
import { TacticalAnalysisPanel } from './analysis/TacticalAnalysisPanel';

// Subblock 4C Components
import { RoleCardDrawer } from './roles/RoleCardDrawer';
import { BriefingView } from './roles/BriefingView';

// Subblock 4D Components (Biblioteca de Conocimiento + Asistente IA)
import { KnowledgePanel } from './knowledge/KnowledgePanel';
import { TacticalAIPanel } from './ai/TacticalAIPanel';

const POSITION_ROLES = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

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

  // Subblock 4C Role Cards hook
  const {
    fetchRoleCards,
    saveRoleCard,
    error: roleCardsError
  } = useTacticalRoleCards();

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

  // Subblock 4C Role Cards states
  const [roleCards, setRoleCards] = useState<TacticalRoleCard[]>([]);
  const [selectedRoleNode, setSelectedRoleNode] = useState<PositionNode | null>(null);
  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
  const [isSavingRoleCard, setIsSavingRoleCard] = useState(false);

  // Database Load states
  const [savedLineups, setSavedLineups] = useState<TacticalLineup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal node editor states (for rival team only now)
  const [editingNode, setEditingNode] = useState<{ team: 'rival'; node: PositionNode } | null>(null);
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeNumber, setEditNodeNumber] = useState('');
  const [editNodeRole, setEditNodeRole] = useState('');
  const [editNodeNotes, setEditNodeNotes] = useState('');

  // Formations list from database systems
  const formationsOptions = useMemo(() => {
    return systems.map(s => ({ value: s.nombre, label: s.nombre }));
  }, [systems]);

  // Subblock 4D: Mapear jugadores asignados para contexto IA
  const assignedPlayerIds = useMemo(() => {
    return nodesPropio
      .map(n => n.player_id)
      .filter((id): id is string => id !== null);
  }, [nodesPropio]);

  const assignedPositions = useMemo(() => {
    return nodesPropio.map(n => ({
      label: n.label,
      playerId: n.player_id
    }));
  }, [nodesPropio]);

  // Escuchar evento personalizado de la IA para aplicar análisis táctico
  useEffect(() => {
    const handleApplyAIAnalysis = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data.ventajas) setVentajas(prev => prev ? `${prev}\n${data.ventajas}` : data.ventajas);
      if (data.desventajas) setDesventajas(prev => prev ? `${prev}\n${data.desventajas}` : data.desventajas);
      if (data.zona_conflicto) setZonaConflicto(prev => prev ? `${prev}\n${data.zona_conflicto}` : data.zona_conflicto);
      if (data.duelo_clave) setDueloClave(prev => prev ? `${prev}\n${data.duelo_clave}` : data.duelo_clave);
      if (data.tareas_lineas) setTareasLineas(prev => prev ? `${prev}\n${data.tareas_lineas}` : data.tareas_lineas);
    };

    window.addEventListener('apply-ai-matchup-analysis', handleApplyAIAnalysis);
    return () => {
      window.removeEventListener('apply-ai-matchup-analysis', handleApplyAIAnalysis);
    };
  }, []);

  // Current selected system base description
  const activeSystem = useMemo(() => {
    return systems.find(s => s.nombre === selectedFormation) || null;
  }, [systems, selectedFormation]);

  // Compute zone highlighting based on the input text of the conflict zone
  const highlightedConflictZone = useMemo(() => {
    const text = (zonaConflicto || '').toLowerCase();
    if (text.includes('central')) return 'central';
    if (text.includes('interior') || text.includes('mediapunta')) return 'interior';
    if (text.includes('exterior') || text.includes('banda') || text.includes('lateral')) return 'exterior';
    return null;
  }, [zonaConflicto]);

  // Dynamic helper to search current matchup ID
  const activeMatchup = useMemo(() => {
    if (systems.length === 0 || matchups.length === 0) return null;
    const ownSys = systems.find(s => s.nombre === selectedFormation);
    const rivalSys = systems.find(s => s.nombre === rivalFormation);
    if (!ownSys || !rivalSys) return null;
    return matchups.find(m => m.system_own_id === ownSys.id && m.system_rival_id === rivalSys.id) || null;
  }, [selectedFormation, rivalFormation, systems, matchups]);

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
    if (!activeMatchup) {
      setVentajas(`Ventajas teóricas de jugar con ${selectedFormation} contra un rival posicionado en ${rivalFormation}. Superioridad local en salida de balón y ocupación racional del carril medio.`);
      setDesventajas(`Vulnerabilidad del dibujo ${selectedFormation} ante repliegues fallidos o transiciones rápidas por el perfil exterior si el rival ${rivalFormation} explota las bandas.`);
      setZonaConflicto(`Carriles intermedios entre la línea de volantes rivales y la defensa del bloque bajo.`);
      setDueloClave(`Duelo por la posesión entre la base de construcción central y los interiores rivales.`);
      setTareasLineas(`Defensa: Línea de 4 basculando rápido.\nMedios: Asegurar circulación fluida.\nDelantera: Fijar centrales y generar pasillos exteriores.`);
    } else {
      setVentajas(activeMatchup.ventajas || '');
      setDesventajas(activeMatchup.desventajas || '');
      setZonaConflicto(activeMatchup.zona_conflicto || '');
      setDueloClave(activeMatchup.duelo_clave || '');
      setTareasLineas(activeMatchup.tareas_lineas || '');
    }
  }, [selectedFormation, rivalFormation, activeMatchup]);

  // Load tactical role cards for active systems
  const loadRoleCardsData = useCallback(async () => {
    if (systems.length === 0) return;
    
    // Obtain match plan override if match linked
    let planId = null;
    if (selectedMatchId) {
      const plan = await fetchMatchPlan(selectedMatchId);
      if (plan) planId = plan.id;
    }

    const cards = await fetchRoleCards(activeMatchup?.id || null, planId);
    setRoleCards(cards);
  }, [systems, selectedMatchId, activeMatchup, fetchRoleCards, fetchMatchPlan]);

  useEffect(() => {
    loadRoleCardsData();
  }, [selectedFormation, rivalFormation, selectedMatchId, loadRoleCardsData]);

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
        notas: lineupNotes || null,
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
  const handleOpenNodeEditor = async (team: 'propio' | 'rival', node: PositionNode) => {
    if (team === 'propio') {
      // Open Slide-over Drawer for our position node (Subblock 4C)
      setSelectedRoleNode(node);
      setIsRoleDrawerOpen(true);
    } else {
      // Keep old modal editor for rival nodes
      setEditingNode({ team: 'rival', node });
      setEditNodeName(node.customName || '');
      setEditNodeNumber(node.customNumber || '');
      setEditNodeRole(node.label);
      setEditNodeNotes(node.notas_entrenador || '');
    }
  };

  // Save tactical position role card (fase ofensiva, defensiva, transiciones)
  const handleSaveRoleCardDetails = async (updatedCard: Partial<TacticalRoleCard>) => {
    if (!selectedRoleNode) return;
    setIsSavingRoleCard(true);
    try {
      let planId = null;
      if (selectedMatchId) {
        const plan = await fetchMatchPlan(selectedMatchId);
        if (plan) planId = plan.id;
      }

      const activeCard = roleCards.find(c => c.posicion_label === selectedRoleNode.label);

      const payload = {
        matchup_id: activeMatchup?.id || null,
        match_plan_id: planId,
        posicion_label: selectedRoleNode.label,
        linea: updatedCard.linea || activeCard?.linea || 'Portería' as const,
        fase_ofensiva: updatedCard.fase_ofensiva !== undefined ? updatedCard.fase_ofensiva : (activeCard?.fase_ofensiva || null),
        fase_defensiva: updatedCard.fase_defensiva !== undefined ? updatedCard.fase_defensiva : (activeCard?.fase_defensiva || null),
        transiciones: updatedCard.transiciones !== undefined ? updatedCard.transiciones : (activeCard?.transiciones || null),
        instrucciones_especificas: updatedCard.instrucciones_especificas !== undefined ? updatedCard.instrucciones_especificas : (activeCard?.instrucciones_especificas || null),
        referencia_visual: updatedCard.referencia_visual !== undefined ? updatedCard.referencia_visual : (activeCard?.referencia_visual || null),
        ai_context: updatedCard.ai_context !== undefined ? updatedCard.ai_context : (activeCard?.ai_context || null),
      };

      const success = await saveRoleCard(payload);
      if (success) {
        setSuccessMsg(`Ficha de rol para la posición ${selectedRoleNode.label} guardada con éxito.`);
        loadRoleCardsData();
      } else {
        setErrorMsg('Error al guardar la ficha de rol.');
      }
    } catch (err) {
      console.error('Error saving role card detail:', err);
    } finally {
      setIsSavingRoleCard(false);
    }
  };

  // Helper to save rival node custom details (traditional modal)
  const handleSaveNodeDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    const { node } = editingNode;
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

    setNodesRival(updater);
    setEditingNode(null);
    setSuccessMsg('Ficha del jugador rival actualizada correctamente.');
  };

  if (loadingPlayers || loadingSystems) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full animate-pulse" />
        <Skeleton className="h-96 w-full animate-pulse" />
      </div>
    );
  }

  const finalError = errorMsg || systemsError || roleCardsError;
  const activeRoleCard = selectedRoleNode ? (roleCards.find(c => c.posicion_label === selectedRoleNode.label) || null) : null;
  const assignedPlayerToDrawer = selectedRoleNode ? (players.find(p => p.id === selectedRoleNode.player_id) || null) : null;

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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left column (3/12 on large screens) */}
        <div className="xl:col-span-3 space-y-6">
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

        {/* Center column: Soccer fields stacked vertically */}
        <div className="xl:col-span-6 flex flex-col items-center gap-8 justify-center w-full">
          <TacticalField
            team="propio"
            nodes={nodesPropio}
            players={players}
            isEditMode={isEditMode}
            onNodesChange={setNodesPropio}
            onNodeClick={(node) => handleOpenNodeEditor('propio', node)}
            highlightedZone={highlightedConflictZone}
          />

          {/* UTILITIES TOOLBAR (Always horizontal) */}
          {isEditMode && (
            <div className="flex flex-row items-center gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/80 w-full max-w-[700px] justify-around shrink-0">
              <button
                onClick={handleSwapPizarras}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 transition-all w-full justify-center"
                title="Intercambia las dos pizarras tácticas"
              >
                <RefreshCw className="h-3.5 w-3.5 text-orange-400" />
                <span>Intercambiar</span>
              </button>
              <button
                onClick={handleCopyPropioToRival}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 transition-all w-full justify-center"
                title="Copia el dibujo propio al del rival"
              >
                <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                <span>Copiar a Rival</span>
              </button>
              <button
                onClick={handleCopyRivalToPropio}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 transition-all w-full justify-center"
                title="Copia el dibujo del rival al propio"
              >
                <ArrowRight className="h-3.5 w-3.5 text-emerald-450" />
                <span>Copiar a Propio</span>
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
            highlightedZone={highlightedConflictZone}
          />
        </div>

        {/* Right column: Roster sidebar (3/12 on large screens) */}
        <div className="xl:col-span-3">
          <PlayerAssignmentSidebar
            players={players}
            assignedPlayerIds={getAssignedPlayerIds()}
            isEditMode={isEditMode}
            onPlayerClick={handleRosterClick}
          />
        </div>
      </div>

      {/* Comparador Táctico Section */}
      <TacticalAnalysisPanel
        selectedFormation={selectedFormation}
        rivalFormation={rivalFormation}
        ventajas={ventajas}
        onVentajasChange={setVentajas}
        desventajas={desventajas}
        onDesventajasChange={setDesventajas}
        zonaConflicto={zonaConflicto}
        onZonaConflictoChange={setZonaConflicto}
        dueloClave={dueloClave}
        onDueloClaveChange={setDueloClave}
        tareasLineas={tareasLineas}
        onTareasLineasChange={setTareasLineas}
      />

      {/* Briefing Táctico agrupado por Línea y Posición (Subblock 4C) */}
      <BriefingView
        nodesPropio={nodesPropio}
        players={players}
        roleCards={roleCards}
      />

      {/* Base de Conocimiento Táctico (Subblock 4D) */}
      <KnowledgePanel
        systemOwn={selectedFormation}
        systemRival={rivalFormation}
        matchupId={activeMatchup?.id || null}
        matchId={selectedMatchId || null}
        onImportToAnalysis={({ ventajas: v, desventajas: d, tareas: t }) => {
          if (v) setVentajas(prev => prev ? `${prev}\n${v}` : v);
          if (d) setDesventajas(prev => prev ? `${prev}\n${d}` : d);
          if (t) setTareasLineas(prev => prev ? `${prev}\n${t}` : t);
        }}
      />

      {/* Asistente Inteligente IA (Subblock 4D) */}
      <TacticalAIPanel
        systemOwn={selectedFormation}
        systemRival={rivalFormation}
        matchupId={activeMatchup?.id || null}
        matchId={selectedMatchId || null}
        matchRival={matches.find(m => m.id === selectedMatchId)?.rival || null}
        nodesPropio={nodesPropio}
        assignedPlayerIds={assignedPlayerIds}
        assignedPositions={assignedPositions}
        roleCards={roleCards}
        ventajas={ventajas}
        desventajas={desventajas}
        zonaConflicto={zonaConflicto}
        dueloClave={dueloClave}
        tareasLineas={tareasLineas}
      />

      {/* Side-Drawer overlay panel for role details editing */}
      <RoleCardDrawer
        isOpen={isRoleDrawerOpen}
        onClose={() => {
          setIsRoleDrawerOpen(false);
          setSelectedRoleNode(null);
        }}
        node={selectedRoleNode}
        assignedPlayer={assignedPlayerToDrawer}
        roleCard={activeRoleCard}
        isEditMode={isEditMode}
        onSave={handleSaveRoleCardDetails}
        isSaving={isSavingRoleCard}
      />

      {/* Modal para Editar Ficha / Posición Rival */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Editar Ficha ({editingNode.team === 'rival' ? 'Rival' : 'Nuestro Equipo'})
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
                  Nombre del Jugador Rival
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
                  Dorsal Rival
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
                  Notas Tácticas Rival
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
