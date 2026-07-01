'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { TacticalLineup, Match, Player } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Layout, Save, FolderOpen, RefreshCw, AlertCircle, 
  CheckCircle, Users, Trash2, Copy, Plus, X, ShieldAlert,
  Zap, Award, HelpCircle, User, Star, ArrowRight, BookOpen, Edit3,
  ArrowRightLeft
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { TacticalField, PositionNode } from './TacticalField';



const groupPlayers = (playerList: Player[]) => {
  const groups: Record<string, { label: string; list: Player[] }> = {
    Portero: { label: '🧤 Porteros', list: [] },
    Lateral: { label: '🛡️ Laterales', list: [] },
    Central: { label: '🧱 Centrales', list: [] },
    Centrocampista: { label: '⚙️ Centrocampistas', list: [] },
    Mediapunta: { label: '🎯 Mediapuntas', list: [] },
    Extremo: { label: '⚡ Extremos', list: [] },
    Delantero: { label: '🎯 Delanteros', list: [] },
    Otros: { label: '📋 Otros', list: [] }
  };

  playerList.forEach(p => {
    const pos = p.demarcacion || '';
    const posLower = pos.toLowerCase();

    if (posLower.includes('portero')) {
      groups.Portero.list.push(p);
    } else if (posLower.includes('lateral')) {
      groups.Lateral.list.push(p);
    } else if (posLower.includes('central') || posLower === 'defensa') {
      groups.Central.list.push(p);
    } else if (posLower.includes('mediapunta') || posLower.includes('media punta')) {
      groups.Mediapunta.list.push(p);
    } else if (posLower.includes('extremo')) {
      groups.Extremo.list.push(p);
    } else if (posLower.includes('delantero')) {
      groups.Delantero.list.push(p);
    } else if (posLower.includes('centrocampista') || posLower.includes('pivote') || posLower.includes('interior')) {
      groups.Centrocampista.list.push(p);
    } else {
      groups.Otros.list.push(p);
    }
  });

  Object.keys(groups).forEach(k => {
    groups[k].list.sort((a, b) => a.dorsal - b.dorsal);
  });

  return [
    groups.Portero,
    groups.Lateral,
    groups.Central,
    groups.Centrocampista,
    groups.Mediapunta,
    groups.Extremo,
    groups.Delantero,
    groups.Otros
  ].filter(g => g.list.length > 0);
};

const POSITION_ROLES = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

const FORMATIONS: Record<string, { label: string; coords: Omit<PositionNode, 'player_id'>[] }> = {
  '1-4-2-3-1': {
    label: '1-4-2-3-1',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'LD', x: 15, y: 68, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 38, y: 74, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 62, y: 74, notas_entrenador: '' },
      { id: 5, label: 'LI', x: 85, y: 68, notas_entrenador: '' },
      { id: 6, label: 'MCD', x: 36, y: 58, notas_entrenador: '' },
      { id: 7, label: 'MCD', x: 64, y: 58, notas_entrenador: '' },
      { id: 8, label: 'MCO', x: 50, y: 40, notas_entrenador: '' },
      { id: 9, label: 'ED', x: 18, y: 30, notas_entrenador: '' },
      { id: 10, label: 'EI', x: 82, y: 30, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 50, y: 16, notas_entrenador: '' },
    ]
  },
  '1-4-3-3': {
    label: '1-4-3-3',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'LD', x: 15, y: 68, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 38, y: 74, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 62, y: 74, notas_entrenador: '' },
      { id: 5, label: 'LI', x: 85, y: 68, notas_entrenador: '' },
      { id: 6, label: 'MCD', x: 50, y: 55, notas_entrenador: '' },
      { id: 7, label: 'MC', x: 30, y: 44, notas_entrenador: '' },
      { id: 8, label: 'MC', x: 70, y: 44, notas_entrenador: '' },
      { id: 9, label: 'ED', x: 18, y: 22, notas_entrenador: '' },
      { id: 10, label: 'EI', x: 82, y: 22, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 50, y: 15, notas_entrenador: '' },
    ]
  },
  '1-4-4-2': {
    label: '1-4-4-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'LD', x: 15, y: 68, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 38, y: 74, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 62, y: 74, notas_entrenador: '' },
      { id: 5, label: 'LI', x: 85, y: 68, notas_entrenador: '' },
      { id: 6, label: 'MC', x: 36, y: 50, notas_entrenador: '' },
      { id: 7, label: 'MC', x: 64, y: 50, notas_entrenador: '' },
      { id: 8, label: 'ED', x: 15, y: 40, notas_entrenador: '' },
      { id: 9, label: 'EI', x: 85, y: 40, notas_entrenador: '' },
      { id: 10, label: 'DC', x: 38, y: 18, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 62, y: 18, notas_entrenador: '' },
    ]
  },
  '1-3-5-2': {
    label: '1-3-5-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'DFC', x: 25, y: 74, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 50, y: 77, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 75, y: 74, notas_entrenador: '' },
      { id: 5, label: 'MCD', x: 36, y: 58, notas_entrenador: '' },
      { id: 6, label: 'MCD', x: 64, y: 58, notas_entrenador: '' },
      { id: 7, label: 'LD', x: 15, y: 45, notas_entrenador: '' },
      { id: 8, label: 'LI', x: 85, y: 45, notas_entrenador: '' },
      { id: 9, label: 'MCO', x: 50, y: 40, notas_entrenador: '' },
      { id: 10, label: 'DC', x: 38, y: 18, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 62, y: 18, notas_entrenador: '' },
    ]
  },
  '1-5-3-2': {
    label: '1-5-3-2',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'LD', x: 12, y: 68, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 30, y: 75, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 50, y: 77, notas_entrenador: '' },
      { id: 5, label: 'DFC', x: 70, y: 75, notas_entrenador: '' },
      { id: 6, label: 'LI', x: 88, y: 68, notas_entrenador: '' },
      { id: 7, label: 'MC', x: 35, y: 50, notas_entrenador: '' },
      { id: 8, label: 'MC', x: 50, y: 54, notas_entrenador: '' },
      { id: 9, label: 'MC', x: 65, y: 50, notas_entrenador: '' },
      { id: 10, label: 'DC', x: 38, y: 22, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 62, y: 22, notas_entrenador: '' },
    ]
  },
  'Personalizado': {
    label: 'Personalizado',
    coords: [
      { id: 1, label: 'POR', x: 50, y: 88, notas_entrenador: '' },
      { id: 2, label: 'LD', x: 15, y: 68, notas_entrenador: '' },
      { id: 3, label: 'DFC', x: 38, y: 74, notas_entrenador: '' },
      { id: 4, label: 'DFC', x: 62, y: 74, notas_entrenador: '' },
      { id: 5, label: 'LI', x: 85, y: 68, notas_entrenador: '' },
      { id: 6, label: 'MCD', x: 50, y: 55, notas_entrenador: '' },
      { id: 7, label: 'MC', x: 30, y: 44, notas_entrenador: '' },
      { id: 8, label: 'MC', x: 70, y: 44, notas_entrenador: '' },
      { id: 9, label: 'ED', x: 18, y: 22, notas_entrenador: '' },
      { id: 10, label: 'EI', x: 82, y: 22, notas_entrenador: '' },
      { id: 11, label: 'DC', x: 50, y: 15, notas_entrenador: '' },
    ]
  }
};

// Tactical Database for IA recommendations according to combinations
const TACTICAL_DATABASE: Record<string, Record<string, {
  ventajas: string;
  desventajas: string;
  zonaConflicto: string;
  dueloClave: string;
  tareasLineas: string;
  orientaciones: Record<string, string>;
}>> = {
  '1-4-2-3-1': {
    '1-4-3-3': {
      ventajas: 'Superioridad táctica en la mediapunta: nuestro mediapunta central (MCO) flotará libre a la espalda de sus dos interiores, forzando a su único pivote defensivo a salir de zona. Extremos que ensanchan su última línea.',
      desventajas: 'Riesgo de emparejamiento desfavorable en bandas si sus extremos rápidos atacan el espacio exterior libre antes de las coberturas de nuestro doble pivote.',
      zonaConflicto: 'La zona de la mediapunta interior (carril central entre línea de volantes rival y su defensa).',
      dueloClave: 'Nuestro MCO contra el MCD organizador rival (fijación táctica).',
      tareasLineas: 'Portería: Salida en corto y apoyo a centrales.\nDefensa: Coberturas laterales rápidas.\nMedios: Doble pivote sostiene y MCO distribuye.\nDelantera: Fijar a centrales y diagonales al espacio.',
      orientaciones: {
        'POR': 'Cobertura constante del espacio libre detrás del bloque de centrales.',
        'LD': 'Atento al extremo zurdo rápido del rival; no conceder el perfil interior.',
        'LI': 'Asegurar repliegue rápido y vigilancias del extremo diestro.',
        'DFC': 'Ganar duelos aéreos con su Delantero Centro; achicar en bloque medio.',
        'MCD': 'Sostén táctico, equilibrar coberturas en bandas si el lateral salta.',
        'MC': 'Distribución fluida de primer contacto, ocupar la corona en área rival.',
        'MCO': 'Recibir entre líneas, girar rápido y alimentar pasillos de extremos.',
        'ED': 'Aislar al lateral izquierdo rival en 1x1 por fuera.',
        'EI': 'Diagonales de fuera hacia dentro hacia zona de finalización.',
        'DC': 'Fijar a centrales, provocar desmarques de ruptura y descarga de espaldas.'
      }
    },
    '1-4-4-2': {
      ventajas: 'Superioridad numérica de 3 vs 2 en zona de mediocampo gracias al triángulo invertido formado por el doble pivote y el mediapunta central.',
      desventajas: 'Dificultad en basculación si sus dos delanteros fijan a nuestros dos centrales y sus laterales se proyectan con libertad.',
      zonaConflicto: 'Espacio de construcción en zona media (interior central).',
      dueloClave: 'Doble pivote propio frente a la línea de medios rival para dominar posesión.',
      tareasLineas: 'Portería: Reiniciar juego con pivotes.\nDefensa: Anticipar juego directo a sus dos puntas.\nMedios: Controlar tiempos de juego y circular.\nDelantera: MCO explota el carril central.',
      orientaciones: {
        'POR': 'Apoyo activo en salida de balón.',
        'DFC': 'Uno anticipa al delantero que desciende y otro cubre profundidad.',
        'MCD': 'Mantener vigilancias estrechas al mediocampo rival.',
        'MCO': 'Ocupar el espacio desierto a la espalda de su doble pivote.',
        'DC': 'Estirar al rival buscando balones en profundidad a la espalda de centrales.'
      }
    }
  },
  '1-4-3-3': {
    '1-4-4-2': {
      ventajas: 'Ocupación de espacios en amplitud. Extremos que aíslan a laterales, permitiendo crear superioridades en mediocampo de 3 contra 2 volantes.',
      desventajas: 'Sufrimiento en transiciones rápidas si el pivote propio queda superado por su doble delantero en zona de rebote.',
      zonaConflicto: 'La franja de tres cuartos exterior y el pasillo interior de transición.',
      dueloClave: 'Extremos propios vs Laterales rivales (desequilibrio individual).',
      tareasLineas: 'Portería: Actuar como jugador libre en construcción.\nDefensa: Progresión combinada por bandas.\nMedios: Rotaciones dinámicas para liberar carriles.\nDelantera: Extremos con libertad ofensiva.',
      orientaciones: {
        'POR': 'Distribución rápida en transiciones ofensivas.',
        'LD': 'Proyección ofensiva profunda doblando al extremo.',
        'LI': 'Asegurar equilibrio defensivo si el LD sube.',
        'DFC': 'Controlar el juego directo hacia sus dos delanteros centro.',
        'MCD': 'Ancla del equipo, equilibrar coberturas.',
        'MC': 'Ocupar espacios de interior y pisar área rival.',
        'ED': 'Desborde en amplitud exterior.',
        'EI': 'Diagonales para el disparo a pierna cambiada.',
        'DC': 'Rematar centros laterales y fijar marca de centrales.'
      }
    }
  }
};

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

  // Initialize nodes based on selected formation
  useEffect(() => {
    if (!currentLineupId) {
      const defaultCoords = FORMATIONS[selectedFormation]?.coords || [];
      setNodesPropio(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
    }
  }, [selectedFormation, currentLineupId]);

  // Initialize rival nodes based on rival formation
  useEffect(() => {
    if (!currentLineupId) {
      const defaultCoords = FORMATIONS[rivalFormation]?.coords || [];
      setNodesRival(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
    }
  }, [rivalFormation, currentLineupId]);

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

  // Load tactical proposals when systems change
  useEffect(() => {
    // Generate AI recommendations based on own vs rival system
    const databaseMatch = TACTICAL_DATABASE[selectedFormation]?.[rivalFormation];
    if (databaseMatch) {
      setVentajas(databaseMatch.ventajas);
      setDesventajas(databaseMatch.desventajas);
      setZonaConflicto(databaseMatch.zonaConflicto);
      setDueloClave(databaseMatch.dueloClave);
      setTareasLineas(databaseMatch.tareasLineas);
    } else {
      // Default proposals
      setVentajas(`Ventajas teóricas de jugar con ${selectedFormation} contra un rival posicionado en ${rivalFormation}. Superioridad local en salida de balón y ocupación racional del carril medio.`);
      setDesventajas(`Vulnerabilidad del dibujo ${selectedFormation} ante repliegues fallidos o transiciones rápidas por el perfil exterior si el rival ${rivalFormation} explota las bandas.`);
      setZonaConflicto(`Carriles intermedios entre la línea de volantes rivales y la defensa del bloque bajo.`);
      setDueloClave(`Duelo por la posesión entre la base de construcción central y los interiores rivales.`);
      setTareasLineas(`Defensa: Línea de 4 basculando rápido.\nMedios: Asegurar circulación fluida.\nDelantera: Fijar centrales y generar pasillos exteriores.`);
    }
  }, [selectedFormation, rivalFormation]);

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
  const handleFormationChange = (formationKey: string) => {
    setSelectedFormation(formationKey);
    const defaultCoords = FORMATIONS[formationKey]?.coords || [];
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

  const handleRivalFormationChange = (formationKey: string) => {
    setRivalFormation(formationKey);
    const defaultCoords = FORMATIONS[formationKey]?.coords || [];
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
      player_id: null, // Clear roster player reference for rival
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

  // Helper to extract clean coordinate info
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
        // Format legacy array
        setNodesPropio((lineup.posiciones as PositionNode[]).map((p) => ({
          id: p.id,
          label: p.label,
          x: p.x,
          y: p.y,
          player_id: p.player_id,
          notas_entrenador: p.notas_entrenador || ''
        })));
        // Initialize default rival nodes
        const defaultRivalCoords = FORMATIONS[lineup.sistema_rival || '1-4-3-3']?.coords || [];
        setNodesRival(defaultRivalCoords.map(coord => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        })));
      }
    }
    setSuccessMsg(`Cargada la pizarra: "${lineup.nombre_pizarra || lineup.nombre_sistema}"`);
  };

  const handleDuplicateLineup = () => {
    if (!lineupName) {
      setErrorMsg('Primero carga o diseña una alineación para duplicar.');
      return;
    }
    setCurrentLineupId(null); // Clear ID to force insert on save
    setLineupName(`Copia de ${lineupName}`);
    setSuccessMsg('Pizarra duplicada localmente. Haz clic en Guardar para persistirla.');
  };

  const handleResetBoard = () => {
    if (confirm('¿Deseas restablecer la posición y vaciar todos los jugadores?')) {
      const defaultCoords = FORMATIONS[selectedFormation]?.coords || [];
      setNodesPropio(
        defaultCoords.map((coord) => ({
          ...coord,
          player_id: null,
          notas_entrenador: ''
        }))
      );
      const defaultRivalCoords = FORMATIONS[rivalFormation]?.coords || [];
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

  const getAssignedPlayerIds = () => nodesPropio.map(n => n.player_id).filter(id => !!id);

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

        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <label className="block text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">Sistema de Juego Propio</label>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.keys(FORMATIONS).map(formationKey => {
            const isActive = selectedFormation === formationKey;
            return (
              <button
                key={formationKey}
                onClick={() => handleFormationChange(formationKey)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isActive 
                    ? 'bg-[#CC0E21]/10 border-[#CC0E21]/30 text-[#CC0E21] shadow-md shadow-red-500/5' 
                    : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                }`}
              >
                {formationKey}
              </button>
            );
          })}
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

      {/* Main Pitch and configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-[#CC0E21]" /> Plan del Partido
            </h3>

            <Input
              label="Nombre de Alineación"
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
              label="Sistema Rival"
              value={rivalFormation}
              onChange={(e) => handleRivalFormationChange(e.target.value)}
              options={Object.keys(FORMATIONS).map(f => ({ value: f, label: FORMATIONS[f].label }))}
            />

            <div>
              <label className="block text-slate-400 text-xs font-bold mb-1.5">Notas Generales</label>
              <textarea
                value={lineupNotes}
                onChange={(e) => setLineupNotes(e.target.value)}
                placeholder="Notas rápidas..."
                className="w-full min-h-[80px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Saved boards list */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Pizarras Guardadas
            </h3>

            {loadingLineups ? (
              <Skeleton className="h-16 w-full" />
            ) : savedLineups.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">No hay alineaciones guardadas.</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {savedLineups.map((lineup) => {
                  const match = matches.find(m => m.id === lineup.match_id);
                  return (
                    <div
                      key={lineup.id}
                      onClick={() => handleLoadLineup(lineup)}
                      className={`flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-850/50 border rounded-2xl text-xs cursor-pointer transition-all duration-200 ${
                        currentLineupId === lineup.id ? 'border-[#CC0E21]/40 bg-[#CC0E21]/5' : 'border-slate-850'
                      }`}
                    >
                      <div className="truncate mr-2 flex-1">
                        <span className="font-bold text-slate-200 block truncate">{lineup.nombre_pizarra || lineup.nombre_sistema}</span>
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
                        onClick={(e) => handleDeleteLineup(lineup.id, e)}
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
                <RefreshCw className="h-3.5 w-3.5 text-orange-400 animate-spin-hover" />
                Intercambiar campos
              </button>
              <button
                onClick={handleCopyPropioToRival}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all"
                title="Copia el dibujo propio al del rival"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
                Copiar a Rival
              </button>
              <button
                onClick={handleCopyRivalToPropio}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 transition-all"
                title="Copia el dibujo del rival al propio"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-450" />
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
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[600px] overflow-hidden">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#CC0E21]" /> Plantilla
            </h3>
            
            <p className="text-[10px] text-slate-500 mb-3 leading-tight">
              Arrastra un jugador al campo o haz clic en su ficha para colocarlo en cualquier posición libre.
            </p>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {groupPlayers(players).map(group => (
                <div key={group.label} className="space-y-1">
                  <h4 className="text-[9px] font-bold text-slate-450 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-900 sticky top-0 z-10">
                    {group.label} ({group.list.length})
                  </h4>
                  <div className="space-y-1.5 pt-1">
                    {group.list.map((p) => {
                      const isAssigned = getAssignedPlayerIds().includes(p.id);
                      return (
                        <div
                          key={p.id}
                          draggable={!isAssigned}
                          onDragStart={(e) => {
                            if (!isAssigned) {
                              e.dataTransfer.setData('text/plain', p.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }
                          }}
                          onClick={() => handleRosterClick(p)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all cursor-grab select-none active:cursor-grabbing ${
                            isAssigned
                              ? 'bg-slate-900/20 border-slate-850/40 text-slate-500 opacity-60'
                              : 'bg-slate-950/60 border-slate-850/60 text-slate-200 hover:border-slate-800 hover:bg-slate-950'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Avatar src={p.foto_url} name={p.nombre} size="sm" />
                            <div className="truncate">
                              <span className="block font-semibold truncate leading-none mb-0.5">{p.nombre}</span>
                              <span className="text-[9px] text-slate-500 font-medium">#{p.dorsal} - {p.demarcacion}</span>
                            </div>
                          </div>

                          {isAssigned && (
                            <span className="text-[8px] bg-[#CC0E21]/10 text-[#CC0E21] px-1 py-0.2 rounded border border-[#CC0E21]/15 shrink-0">
                              PUESTO
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            const presetInstructions = TACTICAL_DATABASE[selectedFormation]?.[rivalFormation]?.orientaciones?.[node.label] || 
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
