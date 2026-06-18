'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, ABPPlay, ABPPlayerRole, ABPType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Film, Plus, AlertCircle, Trash2, BookOpen, Layers, X, 
  Save, RefreshCw, Copy, Edit2, Search, UserCheck, 
  PlusCircle, Check, ChevronDown
} from 'lucide-react';

interface ABPSectionProps {
  players: Player[];
}

const ABP_TYPES: ABPType[] = [
  'Córner ofensivo',
  'Falta frontal ofensiva',
  'Falta lateral ofensiva',
  'Saque de banda ofensivo',
  'Saque de medio ofensivo',
  'Penalti ofensivo',
  'Jugada especial ofensiva',
  'Córner defensivo',
  'Falta frontal defensiva',
  'Falta lateral defensiva',
  'Saque de banda defensivo',
  'Saque de medio defensivo',
  'Penalti defensivo',
  'Jugada especial defensiva'
];

const ROLES_LIST = [
  'Lanzador', 'Sacador', 'Rematador', 'Bloqueador', 'Arrastrador',
  'Rechace', 'Cierre', 'Primer palo', 'Segundo palo', 'Vigilancia', 'Libre'
];

// Mapeo de abreviaturas para la ficha en la pizarra
const ROLE_ABBRS: Record<string, string> = {
  'Lanzador': 'LAN',
  'Sacador': 'SAC',
  'Rematador': 'REM',
  'Bloqueador': 'BLOQ',
  'Arrastrador': 'ARR',
  'Rechace': 'RECH',
  'Cierre': 'CIER',
  'Primer palo': 'P.PALO',
  'Segundo palo': 'S.PALO',
  'Vigilancia': 'VIG',
  'Libre': 'LIB'
};

// Formación/Posición inicial por defecto según tipo de ABP
const DEFAULT_POSITIONS_BY_TYPE: Record<ABPType, { role: string; x: number; y: number }[]> = {
  'Córner ofensivo': [
    { role: 'Lanzador', x: 5, y: 10 },
    { role: 'Primer palo', x: 42, y: 22 },
    { role: 'Segundo palo', x: 58, y: 24 },
    { role: 'Rematador', x: 48, y: 32 },
    { role: 'Rematador', x: 53, y: 32 },
    { role: 'Bloqueador', x: 44, y: 36 },
    { role: 'Arrastrador', x: 51, y: 38 },
    { role: 'Rechace', x: 50, y: 55 },
    { role: 'Cierre', x: 30, y: 78 },
    { role: 'Cierre', x: 70, y: 78 }
  ],
  'Córner defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 40, y: 20 },
    { role: 'Vigilancia', x: 50, y: 20 },
    { role: 'Vigilancia', x: 60, y: 20 },
    { role: 'Libre', x: 42, y: 28 },
    { role: 'Libre', x: 48, y: 28 },
    { role: 'Libre', x: 58, y: 28 },
    { role: 'Primer palo', x: 40, y: 22 },
    { role: 'Rechace', x: 50, y: 48 },
    { role: 'Vigilancia', x: 20, y: 60 },
    { role: 'Vigilancia', x: 80, y: 60 }
  ],
  'Falta frontal ofensiva': [
    { role: 'Lanzador', x: 50, y: 65 },
    { role: 'Rematador', x: 40, y: 32 },
    { role: 'Rematador', x: 45, y: 32 },
    { role: 'Rematador', x: 55, y: 32 },
    { role: 'Rematador', x: 35, y: 35 },
    { role: 'Rematador', x: 65, y: 35 },
    { role: 'Bloqueador', x: 50, y: 42 },
    { role: 'Rechace', x: 50, y: 52 },
    { role: 'Vigilancia', x: 25, y: 80 },
    { role: 'Vigilancia', x: 75, y: 80 }
  ],
  'Falta frontal defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 42, y: 45 },
    { role: 'Vigilancia', x: 46, y: 45 },
    { role: 'Vigilancia', x: 50, y: 45 },
    { role: 'Vigilancia', x: 54, y: 45 },
    { role: 'Vigilancia', x: 58, y: 45 },
    { role: 'Libre', x: 45, y: 32 },
    { role: 'Libre', x: 55, y: 32 },
    { role: 'Vigilancia', x: 30, y: 60 },
    { role: 'Vigilancia', x: 70, y: 60 },
    { role: 'Libre', x: 50, y: 70 }
  ],
  'Falta lateral ofensiva': [
    { role: 'Lanzador', x: 10, y: 40 },
    { role: 'Rematador', x: 42, y: 25 },
    { role: 'Rematador', x: 48, y: 28 },
    { role: 'Rematador', x: 54, y: 25 },
    { role: 'Bloqueador', x: 44, y: 32 },
    { role: 'Segundo palo', x: 58, y: 26 },
    { role: 'Rechace', x: 50, y: 48 },
    { role: 'Vigilancia', x: 30, y: 75 },
    { role: 'Vigilancia', x: 70, y: 75 },
    { role: 'Libre', x: 40, y: 50 }
  ],
  'Falta lateral defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 45, y: 22 },
    { role: 'Vigilancia', x: 55, y: 22 },
    { role: 'Libre', x: 42, y: 30 },
    { role: 'Libre', x: 48, y: 30 },
    { role: 'Libre', x: 54, y: 30 },
    { role: 'Rechace', x: 50, y: 45 },
    { role: 'Vigilancia', x: 30, y: 70 },
    { role: 'Vigilancia', x: 70, y: 70 },
    { role: 'Libre', x: 40, y: 58 },
    { role: 'Libre', x: 60, y: 58 }
  ],
  'Saque de banda ofensivo': [
    { role: 'Sacador', x: 5, y: 45 },
    { role: 'Rematador', x: 15, y: 45 },
    { role: 'Rematador', x: 25, y: 38 },
    { role: 'Rematador', x: 30, y: 28 },
    { role: 'Rematador', x: 45, y: 25 },
    { role: 'Rechace', x: 50, y: 50 },
    { role: 'Vigilancia', x: 30, y: 75 },
    { role: 'Vigilancia', x: 70, y: 75 },
    { role: 'Libre', x: 40, y: 60 },
    { role: 'Libre', x: 60, y: 60 }
  ],
  'Saque de banda defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 20, y: 45 },
    { role: 'Vigilancia', x: 30, y: 40 },
    { role: 'Libre', x: 18, y: 35 },
    { role: 'Libre', x: 28, y: 35 },
    { role: 'Rechace', x: 50, y: 50 },
    { role: 'Vigilancia', x: 35, y: 70 },
    { role: 'Vigilancia', x: 65, y: 70 },
    { role: 'Libre', x: 40, y: 30 },
    { role: 'Libre', x: 45, y: 30 },
    { role: 'Libre', x: 50, y: 30 }
  ],
  'Saque de medio ofensivo': [
    { role: 'Lanzador', x: 50, y: 52 },
    { role: 'Rematador', x: 42, y: 54 },
    { role: 'Rematador', x: 30, y: 40 },
    { role: 'Rematador', x: 70, y: 40 },
    { role: 'Rematador', x: 50, y: 45 },
    { role: 'Rematador', x: 50, y: 30 },
    { role: 'Vigilancia', x: 35, y: 75 },
    { role: 'Vigilancia', x: 65, y: 75 },
    { role: 'Libre', x: 45, y: 60 },
    { role: 'Libre', x: 55, y: 60 }
  ],
  'Saque de medio defensivo': [
    { role: 'Cierre', x: 50, y: 88 },
    { role: 'Vigilancia', x: 35, y: 65 },
    { role: 'Vigilancia', x: 50, y: 65 },
    { role: 'Vigilancia', x: 65, y: 65 },
    { role: 'Libre', x: 40, y: 55 },
    { role: 'Libre', x: 60, y: 55 },
    { role: 'Vigilancia', x: 50, y: 75 },
    { role: 'Libre', x: 30, y: 45 },
    { role: 'Libre', x: 45, y: 45 },
    { role: 'Libre', x: 55, y: 45 },
    { role: 'Libre', x: 70, y: 45 }
  ],
  'Penalti ofensivo': [
    { role: 'Lanzador', x: 50, y: 36 },
    { role: 'Rechace', x: 38, y: 52 },
    { role: 'Rechace', x: 44, y: 52 },
    { role: 'Rechace', x: 56, y: 52 },
    { role: 'Rechace', x: 62, y: 52 },
    { role: 'Libre', x: 30, y: 58 },
    { role: 'Libre', x: 70, y: 58 },
    { role: 'Libre', x: 40, y: 65 },
    { role: 'Libre', x: 60, y: 65 },
    { role: 'Libre', x: 50, y: 75 }
  ],
  'Penalti defensivo': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Libre', x: 38, y: 52 },
    { role: 'Libre', x: 44, y: 52 },
    { role: 'Libre', x: 56, y: 52 },
    { role: 'Libre', x: 62, y: 52 },
    { role: 'Libre', x: 30, y: 58 },
    { role: 'Libre', x: 70, y: 58 },
    { role: 'Libre', x: 40, y: 65 },
    { role: 'Libre', x: 60, y: 65 },
    { role: 'Libre', x: 45, y: 75 },
    { role: 'Libre', x: 55, y: 75 }
  ],
  'Jugada especial ofensiva': [
    { role: 'Lanzador', x: 50, y: 70 },
    { role: 'Rematador', x: 40, y: 30 },
    { role: 'Rematador', x: 60, y: 30 },
    { role: 'Bloqueador', x: 50, y: 38 },
    { role: 'Vigilancia', x: 30, y: 80 },
    { role: 'Vigilancia', x: 70, y: 80 },
    { role: 'Libre', x: 40, y: 50 },
    { role: 'Libre', x: 60, y: 50 },
    { role: 'Libre', x: 45, y: 65 },
    { role: 'Libre', x: 55, y: 65 }
  ],
  'Jugada especial defensiva': [
    { role: 'Cierre', x: 50, y: 15 },
    { role: 'Vigilancia', x: 40, y: 25 },
    { role: 'Vigilancia', x: 60, y: 25 },
    { role: 'Libre', x: 45, y: 35 },
    { role: 'Libre', x: 55, y: 35 },
    { role: 'Vigilancia', x: 50, y: 70 },
    { role: 'Libre', x: 30, y: 50 },
    { role: 'Libre', x: 70, y: 50 },
    { role: 'Libre', x: 40, y: 60 },
    { role: 'Libre', x: 60, y: 60 },
    { role: 'Libre', x: 50, y: 80 }
  ]
};

export function ABPSection({ players }: ABPSectionProps) {
  const [plays, setPlays] = useState<ABPPlay[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<ABPPlay | null>(null);
  const [playRoles, setPlayRoles] = useState<(ABPPlayerRole & { player?: Player })[]>([]);
  
  // Modals & loading states
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // Form states - Play Creation/Edition
  const [playTitle, setPlayTitle] = useState('');
  const [playDesc, setPlayDesc] = useState('');
  const [playType, setPlayType] = useState<ABPType>('Córner ofensivo');
  const [playVideoUrl, setPlayVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<ABPType | 'Todos'>('Todos');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerFilterPos, setPlayerFilterPos] = useState<string>('Todas');
  const [playerStatusTab, setPlayerStatusTab] = useState<'todos' | 'libres'>('todos');
  
  // Board configuration state
  const isEditingPositions = true;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load ABP plays
  const loadPlays = useCallback(async () => {
    setLoadingPlays(true);
    try {
      const { data, error } = await supabase
        .from('abp_plays')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlays(data || []);
      
      // If we don't have a selected play, choose the first one
      if (data && data.length > 0 && !selectedPlay) {
        setSelectedPlay(data[0]);
      }
    } catch (err) {
      console.error('Error loading ABP plays:', err);
    } finally {
      setLoadingPlays(false);
    }
  }, [selectedPlay]);

  // Load roles & positions for the selected play
  const loadPlayRoles = useCallback(async (playId: string) => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('abp_player_roles')
        .select('*')
        .eq('abp_play_id', playId)
        .order('orden', { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map((r: ABPPlayerRole) => ({
        ...r,
        player: players.find(p => p.id === r.player_id),
        posicion_x: r.posicion_x !== null ? parseFloat(String(r.posicion_x)) : null,
        posicion_y: r.posicion_y !== null ? parseFloat(String(r.posicion_y)) : null,
      }));
      setPlayRoles(mapped);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [players]);

  useEffect(() => {
    loadPlays();
  }, [loadPlays]);

  useEffect(() => {
    if (selectedPlay) {
      loadPlayRoles(selectedPlay.id);
      setErrorMsg(null);
      setSuccessMsg(null);
    } else {
      setPlayRoles([]);
    }
  }, [selectedPlay, loadPlayRoles]);

  // --- CREATE NEW ABP PLAY ---
  async function handleCreatePlay(e: React.FormEvent) {
    e.preventDefault();
    if (!playTitle.trim()) {
      setErrorMsg('El título es obligatorio.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let videoUrl = playVideoUrl.trim() || null;

      // Handle video upload if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `abp-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      // Insert Play record
      const { data: playRes, error: insertError } = await supabase
        .from('abp_plays')
        .insert({
          tipo: playType,
          titulo: playTitle,
          descripcion: playDesc || null,
          video_url: videoUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert default roles & positions for the chosen ABPType
      const defaultRoles = DEFAULT_POSITIONS_BY_TYPE[playType] || [];
      if (defaultRoles.length > 0 && playRes) {
        const rolesPayload = defaultRoles.map((dr, index) => ({
          abp_play_id: playRes.id,
          player_id: null, // VACÍO initially
          rol_asignado: dr.role,
          posicion_x: dr.x,
          posicion_y: dr.y,
          etiqueta: ROLE_ABBRS[dr.role] || dr.role.substring(0, 4).toUpperCase(),
          orden: index + 1
        }));

        const { error: rolesError } = await supabase
          .from('abp_player_roles')
          .insert(rolesPayload);

        if (rolesError) console.error('Error creating default roles:', rolesError);
      }

      setPlayTitle('');
      setPlayDesc('');
      setPlayVideoUrl('');
      setVideoFile(null);
      setIsPlayModalOpen(false);
      
      // Select the new play
      if (playRes) {
        setSelectedPlay(playRes);
      }
      await loadPlays();
      setSuccessMsg('Jugada de estrategia creada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating ABP play:', error);
      setErrorMsg(error.message || 'Error al guardar la jugada.');
    } finally {
      setIsSaving(false);
    }
  }

  // --- EDIT PLAY DETAILS (Title, Type, Description, Video) ---
  async function handleEditPlay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlay) return;
    if (!playTitle.trim()) {
      setErrorMsg('El título es obligatorio.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let videoUrl = playVideoUrl.trim() || selectedPlay.video_url;

      // Handle video upload if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `abp-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('abp_plays')
        .update({
          titulo: playTitle,
          tipo: playType,
          descripcion: playDesc || null,
          video_url: videoUrl
        })
        .eq('id', selectedPlay.id);

      if (updateError) throw updateError;

      setIsEditModalOpen(false);
      setVideoFile(null);
      
      // Reload play data
      const updatedPlay = {
        ...selectedPlay,
        titulo: playTitle,
        tipo: playType,
        descripcion: playDesc || null,
        video_url: videoUrl
      };
      setSelectedPlay(updatedPlay);
      await loadPlays();
      setSuccessMsg('Jugada actualizada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error updating play details:', error);
      setErrorMsg(error.message || 'Error al actualizar la jugada.');
    } finally {
      setIsSaving(false);
    }
  }

  // Open Edit Modal with current values
  const openEditModal = () => {
    if (!selectedPlay) return;
    setPlayTitle(selectedPlay.titulo);
    setPlayType(selectedPlay.tipo);
    setPlayDesc(selectedPlay.descripcion || '');
    setPlayVideoUrl(selectedPlay.video_url || '');
    setIsEditModalOpen(true);
  };

  // --- DUPLICATE PLAY ---
  async function handleDuplicatePlay() {
    if (!selectedPlay) return;
    setIsDuplicating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Create duplicate play metadata
      const { data: newPlay, error: playError } = await supabase
        .from('abp_plays')
        .insert({
          titulo: `${selectedPlay.titulo} (Copia)`,
          tipo: selectedPlay.tipo,
          descripcion: selectedPlay.descripcion,
          video_url: selectedPlay.video_url
        })
        .select()
        .single();

      if (playError) throw playError;

      // 2. Clone all player roles / positions
      if (playRoles.length > 0 && newPlay) {
        const rolesPayload = playRoles.map(r => ({
          abp_play_id: newPlay.id,
          player_id: r.player_id,
          rol_asignado: r.rol_asignado,
          posicion_x: r.posicion_x,
          posicion_y: r.posicion_y,
          etiqueta: r.etiqueta,
          comentario: r.comentario,
          orden: r.orden
        }));

        const { error: rolesError } = await supabase
          .from('abp_player_roles')
          .insert(rolesPayload);

        if (rolesError) throw rolesError;
      }

      setSelectedPlay(newPlay);
      await loadPlays();
      setSuccessMsg('Jugada duplicada con éxito.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error duplicating play:', error);
      setErrorMsg('Error al duplicar la jugada.');
    } finally {
      setIsDuplicating(false);
    }
  }

  // --- DELETE PLAY ---
  async function handleDeletePlay(playId: string) {
    if (!confirm('¿Seguro que deseas eliminar esta jugada de estrategia? Se borrarán todas las posiciones y roles.')) return;
    try {
      const { error } = await supabase.from('abp_plays').delete().eq('id', playId);
      if (error) throw error;
      
      if (selectedPlay?.id === playId) {
        setSelectedPlay(null);
      }
      setSuccessMsg('Jugada eliminada.');
      loadPlays();
    } catch (err) {
      console.error('Error deleting play:', err);
      setErrorMsg('Error al eliminar la jugada.');
    }
  }

  // --- SAVE CURRENT TACTICAL POSITIONS & ROLES ---
  async function handleSavePositions() {
    if (!selectedPlay) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // We perform updates for each role node
      const promises = playRoles.map((role) => {
        return supabase
          .from('abp_player_roles')
          .update({
            player_id: role.player_id || null,
            rol_asignado: role.rol_asignado,
            posicion_x: role.posicion_x !== null ? parseFloat(role.posicion_x.toFixed(1)) : null,
            posicion_y: role.posicion_y !== null ? parseFloat(role.posicion_y.toFixed(1)) : null,
            etiqueta: role.etiqueta || ROLE_ABBRS[role.rol_asignado] || role.rol_asignado.substring(0, 4).toUpperCase(),
            comentario: role.comentario || null,
            orden: role.orden || null
          })
          .eq('id', role.id);
      });

      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      setSuccessMsg('Posiciones y roles guardados correctamente en Supabase.');
      loadPlayRoles(selectedPlay.id);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saving tactical board:', error);
      setErrorMsg('Error al guardar la pizarra táctica.');
    } finally {
      setIsSaving(false);
    }
  }

  // --- ADD NEW ROLE NODE TO THE BOARD ---
  async function handleAddRoleNode() {
    if (!selectedPlay) return;
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('abp_player_roles')
        .insert({
          abp_play_id: selectedPlay.id,
          player_id: null,
          rol_asignado: 'Libre',
          posicion_x: 50.0,
          posicion_y: 50.0,
          etiqueta: 'LIB',
          orden: playRoles.length + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setPlayRoles(prev => [...prev, { ...data, player: undefined }]);
      }
    } catch (err) {
      console.error('Error adding role node:', err);
      setErrorMsg('No se pudo añadir un nuevo rol.');
    }
  }

  // --- REMOVE ROLE NODE FROM THE BOARD ---
  async function handleRemoveRoleNode(roleId: string) {
    try {
      const { error } = await supabase.from('abp_player_roles').delete().eq('id', roleId);
      if (error) throw error;
      setPlayRoles(prev => prev.filter(r => r.id !== roleId));
      setSuccessMsg('Puesto eliminado del campo.');
    } catch (err) {
      console.error('Error deleting role node:', err);
      setErrorMsg('Error al borrar el puesto.');
    }
  }

  // --- POSITION RESET (Default Layout) ---
  const handleResetPositions = () => {
    if (!selectedPlay) return;
    const defaults = DEFAULT_POSITIONS_BY_TYPE[selectedPlay.tipo] || [];
    
    setPlayRoles(prev => {
      return prev.map((role, idx) => {
        const def = defaults[idx] || { x: 50 + (idx * 2), y: 50 };
        return {
          ...role,
          posicion_x: def.x,
          posicion_y: def.y
        };
      });
    });
    setSuccessMsg('Posiciones restablecidas al diseño por defecto. Recuerda pulsar GUARDAR.');
  };

  // --- CLEAR ALL PLAYERS FROM ROLES ---
  const handleClearPlay = () => {
    setPlayRoles(prev => prev.map(role => ({
      ...role,
      player_id: null,
      player: undefined,
      comentario: ''
    })));
    setSuccessMsg('Fichas vaciadas. Se han desasignado todos los jugadores. Recuerda GUARDAR.');
  };

  // --- AUTO-ASSIGN PLAYERS TO EMPTY ROLES ---
  const handleAutoAssignPlayers = () => {
    const assignedIds = playRoles.map(r => r.player_id).filter(id => !!id) as string[];
    const freePlayers = players.filter(p => !assignedIds.includes(p.id));

    if (freePlayers.length === 0) {
      setErrorMsg('No hay jugadores libres en la plantilla.');
      return;
    }

    let freeIdx = 0;
    setPlayRoles(prev => {
      return prev.map(role => {
        if (!role.player_id && freeIdx < freePlayers.length) {
          const player = freePlayers[freeIdx++];
          return {
            ...role,
            player_id: player.id,
            player: player
          };
        }
        return role;
      });
    });
    setSuccessMsg(`Se han asignado automáticamente ${freeIdx} jugadores. Recuerda GUARDAR.`);
  };

  // --- DRAG AND DROP ON THE FIELD (CANVAS COORDINATES) ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, roleId: string) => {
    if (!isEditingPositions) return;
    
    const isTouch = 'touches' in e;
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const roleNode = playRoles.find(r => r.id === roleId);
    if (!roleNode) return;
    
    const initialX = roleNode.posicion_x !== null ? roleNode.posicion_x : 50;
    const initialY = roleNode.posicion_y !== null ? roleNode.posicion_y : 50;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = ((currentX - startX) / rect.width) * 100;
      const deltaY = ((currentY - startY) / rect.height) * 100;

      setPlayRoles(prev => prev.map(r => {
        if (r.id === roleId) {
          return {
            ...r,
            posicion_x: Math.max(2, Math.min(98, initialX + deltaX)),
            posicion_y: Math.max(2, Math.min(98, initialY + deltaY))
          };
        }
        return r;
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

  // --- DRAG FROM SIDEBAR HANDLERS ---
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  const handleSidebarDragStart = (playerId: string) => {
    setDraggedPlayerId(playerId);
  };

  const handleDropOnRole = (roleId: string) => {
    if (!draggedPlayerId) return;
    
    const player = players.find(p => p.id === draggedPlayerId);
    if (!player) return;

    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          player_id: player.id,
          player: player
        };
      }
      // Evitar duplicar el mismo jugador en varios roles de la misma jugada
      if (role.player_id === player.id && role.id !== roleId) {
        return {
          ...role,
          player_id: null,
          player: undefined
        };
      }
      return role;
    }));
    setDraggedPlayerId(null);
  };

  // --- DROPDOWN OR SELECT HANDLERS ---
  const handleAssignPlayerDirect = (roleId: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          player_id: playerId || null,
          player: player
        };
      }
      // Evitar duplicidad
      if (playerId && role.player_id === playerId && role.id !== roleId) {
        return { ...role, player_id: null, player: undefined };
      }
      return role;
    }));
  };

  const handleRoleChange = (roleId: string, newRole: string) => {
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          rol_asignado: newRole,
          etiqueta: ROLE_ABBRS[newRole] || newRole.substring(0, 4).toUpperCase()
        };
      }
      return role;
    }));
  };

  const handleCommentChange = (roleId: string, newComment: string) => {
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          comentario: newComment
        };
      }
      return role;
    }));
  };

  const handleRemovePlayerFromRole = (roleId: string) => {
    setPlayRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          player_id: null,
          player: undefined
        };
      }
      return role;
    }));
  };

  // --- FILTERS & SQUAD LIST HELPERS ---
  const getAssignedPlayerIds = () => {
    return playRoles.map(r => r.player_id).filter(id => !!id) as string[];
  };

  const filteredSquad = players.filter(p => {
    // Search filter
    const matchesSearch = p.nombre.toLowerCase().includes(playerSearch.toLowerCase()) || 
                          (p.apellidos && p.apellidos.toLowerCase().includes(playerSearch.toLowerCase())) ||
                          p.dorsal.toString() === playerSearch;
    
    // Position filter
    const matchesPos = playerFilterPos === 'Todas' || p.demarcacion === playerFilterPos;

    // Status filter
    const isAssigned = getAssignedPlayerIds().includes(p.id);
    const matchesStatus = playerStatusTab === 'todos' || !isAssigned;

    return matchesSearch && matchesPos && matchesStatus;
  });

  const filteredPlays = activeFilter === 'Todos' 
    ? plays 
    : plays.filter(p => p.tipo === activeFilter);

  // Helper to extract YouTube video ID if present
  const getEmbedVideoUrl = (url: string | null) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const videoId = urlParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    } catch {
      console.warn('URL parsing failed, falling back to raw video tag.');
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ========================================================================= */}
        {/* PANEL IZQUIERDO: SELECTOR DE JUGADAS ABP */}
        {/* ========================================================================= */}
        <div className="xl:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selector de Jugadas</h3>
              <Button 
                variant="primary" 
                onClick={() => {
                  setPlayTitle('');
                  setPlayDesc('');
                  setPlayVideoUrl('');
                  setVideoFile(null);
                  setIsPlayModalOpen(true);
                }}
                className="py-1 px-2.5 text-[10px] h-auto flex items-center gap-1 bg-green-500 hover:bg-green-600 text-slate-950 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva Jugada
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              Organiza tus jugadas de estrategia tácticas (ABP). Cada una contiene su estructura de fichas, notas y vídeo táctico.
            </p>

            {/* Categorías de Filtro */}
            <div className="space-y-1 pt-2 border-t border-slate-800/60 max-h-[180px] overflow-y-auto pr-1">
              <button
                onClick={() => setActiveFilter('Todos')}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
                  activeFilter === 'Todos' 
                    ? 'bg-green-500/10 text-green-400 font-bold border border-green-500/20' 
                    : 'text-slate-400 hover:bg-slate-800/30'
                }`}
              >
                Todas las categorías
              </button>
              {ABP_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
                    activeFilter === type 
                      ? 'bg-green-500/10 text-green-400 font-bold border border-green-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Jugadas Filtradas */}
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col max-h-[350px] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Listado ({filteredPlays.length})</h3>
            {loadingPlays ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredPlays.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No hay jugadas registradas.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredPlays.map((play, index) => (
                  <div
                    key={play.id}
                    onClick={() => setSelectedPlay(play)}
                    className={`group w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedPlay?.id === play.id
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 font-bold'
                        : 'bg-slate-950/40 border-slate-850 text-slate-350 hover:bg-slate-850/50 hover:border-slate-800'
                    }`}
                  >
                    <div className="truncate mr-2 flex items-center gap-2">
                      <span className="h-5 w-5 bg-slate-800 text-[10px] text-slate-300 font-bold rounded-md flex items-center justify-center shrink-0">
                        {filteredPlays.length - index}
                      </span>
                      <div className="truncate">
                        <span className="block truncate font-bold text-slate-200">{play.titulo}</span>
                        <span className="text-[9px] text-slate-500 font-semibold">{play.tipo}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlay(play.id); }}
                      className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DETALLE DE JUGADA Y PIZARRA TÁCTICA */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 space-y-6">
          {selectedPlay ? (
            <div className="space-y-6">
              {/* CABECERA DETALLE DE JUGADA */}
              <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedPlay.tipo}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-100">{selectedPlay.titulo}</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="secondary"
                    onClick={openEditModal}
                    className="py-1.5 px-3 text-xs flex items-center gap-1.5 border border-slate-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar Título/Info
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={handleDuplicatePlay}
                    loading={isDuplicating}
                    className="py-1.5 px-3 text-xs flex items-center gap-1.5 border border-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={handleSavePositions}
                    loading={isSaving}
                    className="py-1.5 px-4 text-xs flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-slate-950 font-bold"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>

              {/* PIZARRA TÁCTICA E INFORMACIÓN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LA PIZARRA (CAMPOGRAMA INTERACTIVO) - 7 cols */}
                <div className="lg:col-span-7 flex flex-col items-center space-y-4">
                  {/* Pizarra Táctica */}
                  <div className="w-full bg-slate-900/20 border border-slate-800/60 rounded-3xl p-4 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Posicionamiento Táctico
                      </span>
                      <div className="flex gap-1.5">
                        <Button 
                          variant="secondary" 
                          onClick={handleResetPositions} 
                          className="py-1 px-2.5 text-[10px] h-auto border border-slate-800"
                          title="Restablece posiciones a su esquema inicial"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Reiniciar
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleAutoAssignPlayers} 
                          className="py-1 px-2.5 text-[10px] h-auto border border-slate-800"
                          title="Asigna jugadores de la plantilla automáticamente"
                        >
                          <UserCheck className="h-3 w-3 mr-1" /> Auto-Asignar
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={handleClearPlay} 
                          className="py-1 px-2 text-[10px] h-auto text-red-400 hover:bg-red-500/10"
                          title="Desasigna a todos los jugadores de los roles"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Limpiar
                        </Button>
                      </div>
                    </div>

                    {/* Area de Fútbol (SVG y Fichas Drag) */}
                    <div 
                      ref={containerRef}
                      className="relative w-full aspect-[4/3] bg-emerald-950/80 rounded-2xl border-2 border-emerald-500/25 overflow-hidden select-none"
                    >
                      {/* SVG del Campo (Detalle de Córner / Falta / Área) */}
                      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                        {/* Líneas principales del área */}
                        <rect x="0" y="0" width="400" height="300" fill="none" stroke="#fff" strokeWidth="1.5" />
                        {/* Línea de fondo y córner flag arcs */}
                        <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#fff" strokeWidth="2" />
                        <path d="M 400 10 A 10 10 0 0 0 390 0" fill="none" stroke="#fff" strokeWidth="2" />
                        
                        {/* Área Grande */}
                        <rect x="75" y="0" width="250" height="110" fill="none" stroke="#fff" strokeWidth="1.5" />
                        {/* Área Pequeña */}
                        <rect x="140" y="0" width="120" height="40" fill="none" stroke="#fff" strokeWidth="1.5" />
                        {/* Punto de Penalti */}
                        <circle cx="200" cy="80" r="2.5" fill="#fff" />
                        {/* Semi-circunferencia del área grande */}
                        <path d="M 150 110 A 60 60 0 0 0 250 110" fill="none" stroke="#fff" strokeWidth="1.5" />
                        {/* Portería */}
                        <rect x="165" y="-6" width="70" height="6" fill="none" stroke="#fff" strokeWidth="2" />
                      </svg>

                      {/* Renderizado de Fichas/Roles */}
                      {playRoles.map((role) => {
                        const px = role.posicion_x !== null ? role.posicion_x : 50;
                        const py = role.posicion_y !== null ? role.posicion_y : 50;
                        const label = role.etiqueta || ROLE_ABBRS[role.rol_asignado] || 'P';
                        const player = role.player;

                        return (
                          <div
                            key={role.id}
                            style={{
                              left: `${px}%`,
                              top: `${py}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className="absolute z-10 flex flex-col items-center cursor-move"
                            onMouseDown={(e) => handleDragStart(e, role.id)}
                            onTouchStart={(e) => handleDragStart(e, role.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropOnRole(role.id)}
                          >
                            {/* Ficha Visual del Jugador / Rol */}
                            <div 
                              className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform duration-100 active:scale-110 ${
                                player
                                  ? 'bg-slate-900 border-green-500 shadow-green-500/20'
                                  : 'bg-slate-950 border-slate-700/80 border-dashed text-slate-400'
                              }`}
                            >
                              {player ? (
                                <div className="relative flex items-center justify-center w-full h-full">
                                  <Avatar src={player.foto_url} name={player.nombre} size="sm" />
                                  <span className="absolute -bottom-1 -right-1 bg-green-500 text-slate-950 font-black text-[7px] h-3.5 w-3.5 rounded-full flex items-center justify-center border border-slate-900 shadow">
                                    #{player.dorsal}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black tracking-tight">{label}</span>
                              )}
                            </div>

                            {/* Nombre y Rol con Selector */}
                            <div className="mt-1 bg-slate-950/90 border border-slate-800 px-1 py-0.5 rounded text-[8px] font-bold text-slate-300 max-w-[100px] flex flex-col items-center leading-tight select-none pointer-events-auto">
                              <span className="truncate max-w-[85px]">{player ? player.nombre : 'Puesto Vacío'}</span>
                              <div className="flex items-center gap-0.5 mt-0.5 text-[7px] text-slate-450 border-t border-slate-800/60 pt-0.5 w-full justify-center">
                                <span className="truncate max-w-[65px]">{role.rol_asignado}</span>
                                <div className="relative shrink-0">
                                  <select
                                    value={role.rol_asignado}
                                    onChange={(e) => handleRoleChange(role.id, e.target.value)}
                                    className="absolute inset-0 opacity-0 w-3 h-3 cursor-pointer"
                                  >
                                    {ROLES_LIST.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="h-2 w-2 text-slate-500" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-full flex justify-between items-center mt-2.5">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-slate-600" />
                        Arrastra las fichas en el campo para moverlas. Arrastra un jugador de la plantilla sobre una ficha para asignarlo.
                      </span>
                      <Button 
                        variant="secondary"
                        onClick={handleAddRoleNode}
                        className="py-1 px-2 text-[10px] h-auto flex items-center gap-1 border border-slate-800 text-green-400"
                      >
                        <PlusCircle className="h-3 w-3" /> Añadir Puesto
                      </Button>
                    </div>
                  </div>

                  {/* Instrucciones & Vídeo */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Instrucciones */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-green-500" /> Instrucciones tácticas
                      </h4>
                      <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl min-h-[120px] max-h-[220px] overflow-y-auto">
                        {selectedPlay.descripcion ? (
                          <p className="text-xs text-slate-350 whitespace-pre-line leading-relaxed">
                            {selectedPlay.descripcion}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 italic">No se han registrado órdenes o instrucciones.</p>
                        )}
                      </div>
                    </div>

                    {/* Vídeo */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5 text-blue-500" /> Vídeo táctico asociado
                      </h4>
                      {selectedPlay.video_url ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black">
                          {getEmbedVideoUrl(selectedPlay.video_url) ? (
                            <iframe
                              src={getEmbedVideoUrl(selectedPlay.video_url) || ''}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={selectedPlay.video_url}
                              controls
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="border border-slate-850 bg-slate-950/20 p-8 rounded-xl text-center text-xs text-slate-500 italic flex flex-col justify-center items-center h-[120px]">
                          No hay un vídeo asociado. Usa &quot;Editar&quot; para añadir una URL de YouTube o subir un vídeo explicativo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ASIGNACIÓN DE JUGADORES Y ROLES - 5 cols */}
                <div className="lg:col-span-5 space-y-6">
                  {/* PANEL: ROLES Y PUESTOS DE LA JUGADA */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-green-500" /> Puestos de la jugada ({playRoles.length})
                    </h3>

                    {loadingRoles ? (
                      <Skeleton className="h-40 w-full" />
                    ) : playRoles.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-6 border border-dashed border-slate-800 rounded-xl">
                        No hay puestos colocados en el campo. Usa &quot;Añadir Puesto&quot;.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {playRoles.map((role) => (
                          <div 
                            key={role.id}
                            className="bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl space-y-2 transition-all hover:border-slate-800"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-8 bg-slate-900 border border-slate-800 text-[9px] text-green-400 font-bold rounded flex items-center justify-center">
                                  {role.etiqueta || ROLE_ABBRS[role.rol_asignado] || 'P'}
                                </span>
                                <select
                                  value={role.rol_asignado}
                                  onChange={(e) => handleRoleChange(role.id, e.target.value)}
                                  className="bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 rounded px-2 py-0.5 outline-none focus:border-green-500"
                                >
                                  {ROLES_LIST.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>

                              <button
                                onClick={() => handleRemoveRoleNode(role.id)}
                                className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-500"
                                title="Borrar este puesto de la jugada"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Asignar jugador */}
                            <div className="flex items-center gap-2">
                              <select
                                value={role.player_id || ''}
                                onChange={(e) => handleAssignPlayerDirect(role.id, e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 text-xs text-slate-350 rounded px-2.5 py-1 outline-none focus:border-green-500"
                              >
                                <option value="">-- Sin asignar (Vacío) --</option>
                                {players.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    #{p.dorsal} - {p.nombre} {p.apellidos || ''} ({p.demarcacion})
                                  </option>
                                ))}
                              </select>

                              {role.player_id && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlayerFromRole(role.id)}
                                  className="p-1 text-slate-550 hover:text-slate-300 hover:bg-slate-800 rounded"
                                  title="Desasignar jugador"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Comentario sobre el rol en la jugada */}
                            <input
                              type="text"
                              value={role.comentario || ''}
                              onChange={(e) => handleCommentChange(role.id, e.target.value)}
                              placeholder="Ej. Bloqueo al central o desmarque de arrastre..."
                              className="w-full bg-slate-900/60 border border-slate-850/80 rounded px-2 py-0.5 text-[10px] text-slate-400 placeholder-slate-600 outline-none focus:border-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PANEL: PLANTILLA DE JUGADORES */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-green-500" /> Plantilla de Jugadores
                      </h3>
                      <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-850">
                        <button
                          type="button"
                          onClick={() => setPlayerStatusTab('todos')}
                          className={`px-2 py-1 text-[9px] font-bold rounded-md transition-colors ${
                            playerStatusTab === 'todos' ? 'bg-slate-800 text-green-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          TODOS
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerStatusTab('libres')}
                          className={`px-2 py-1 text-[9px] font-bold rounded-md transition-colors ${
                            playerStatusTab === 'libres' ? 'bg-slate-800 text-green-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          LIBRES
                        </button>
                      </div>
                    </div>

                    {/* Inputs de Filtro */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                          <Search className="h-3 w-3 text-slate-500" />
                        </span>
                        <input
                          type="text"
                          value={playerSearch}
                          onChange={(e) => setPlayerSearch(e.target.value)}
                          placeholder="Buscar dorsal/nombre..."
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-300 placeholder-slate-650 outline-none focus:border-green-500"
                        />
                      </div>

                      <select
                        value={playerFilterPos}
                        onChange={(e) => setPlayerFilterPos(e.target.value)}
                        className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-green-500"
                      >
                        <option value="Todas">Todas las posiciones</option>
                        <option value="Portero">Portero</option>
                        <option value="Defensa">Defensa</option>
                        <option value="Centrocampista">Centrocampista</option>
                        <option value="Delantero">Delantero</option>
                      </select>
                    </div>

                    {/* Squad List */}
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {filteredSquad.length === 0 ? (
                        <p className="text-xs text-slate-550 italic text-center py-6">No hay jugadores disponibles.</p>
                      ) : (
                        filteredSquad.map((player) => {
                          const isAssigned = getAssignedPlayerIds().includes(player.id);
                          return (
                            <div
                              key={player.id}
                              draggable
                              onDragStart={() => handleSidebarDragStart(player.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-grab active:cursor-grabbing ${
                                isAssigned
                                  ? 'bg-slate-900/30 border-slate-850/40 text-slate-500 opacity-50'
                                  : 'bg-slate-950/60 border-slate-850 text-slate-200 hover:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Avatar src={player.foto_url} name={player.nombre} size="sm" />
                                <div className="truncate text-left">
                                  <span className="block font-bold truncate leading-none mb-0.5">
                                    {player.nombre} {player.apellidos || ''}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-semibold">
                                    #{player.dorsal} - {player.demarcacion}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] text-slate-600 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded uppercase">
                                {isAssigned ? 'Ocupado' : 'Arrastrar'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-center space-y-4">
              <BookOpen className="h-12 w-12 text-slate-600" />
              <div className="space-y-1">
                <p className="text-base text-slate-300 font-bold">Sin jugadas de estrategia</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Crea tu primera jugada táctica a balón parado (ABP) para empezar a planificar movimientos, asignar roles y analizar jugadas con la plantilla.
                </p>
              </div>
              <Button 
                variant="primary" 
                onClick={() => setIsPlayModalOpen(true)}
                className="mt-2 bg-green-500 hover:bg-green-600 text-slate-950 font-bold"
              >
                Crear Primera Jugada
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NUEVA JUGADA ABP */}
      {/* ========================================================================= */}
      <Modal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} title="Crear Nueva Jugada ABP">
        <form onSubmit={handleCreatePlay} className="space-y-4">
          <Input
            label="Título de la Jugada"
            type="text"
            required
            placeholder="Ej. Córner al primer palo (Bloqueo y arrastre)"
            value={playTitle}
            onChange={(e) => setPlayTitle(e.target.value)}
          />

          <Select
            label="Tipo de ABP"
            value={playType}
            onChange={(e) => setPlayType(e.target.value as ABPType)}
            options={ABP_TYPES.map(t => ({ value: t, label: t }))}
          />

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Instrucciones y Ejecución</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-green-500"
              rows={4}
              placeholder="Detalla la trayectoria del balón, los desmarques y las vigilancias defensivas..."
              value={playDesc}
              onChange={(e) => setPlayDesc(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Input
              label="URL de Vídeo Táctico (YouTube / Vimeo)"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={playVideoUrl}
              onChange={(e) => setPlayVideoUrl(e.target.value)}
            />
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">O subir archivo de vídeo (.mp4/.mov)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsPlayModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSaving} className="bg-green-500 text-slate-950 font-bold">
              Guardar Jugada
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR INFORMACIÓN JUGADA */}
      {/* ========================================================================= */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Información de la Jugada">
        <form onSubmit={handleEditPlay} className="space-y-4">
          <Input
            label="Título de la Jugada"
            type="text"
            required
            value={playTitle}
            onChange={(e) => setPlayTitle(e.target.value)}
          />

          <Select
            label="Tipo de ABP"
            value={playType}
            onChange={(e) => setPlayType(e.target.value as ABPType)}
            options={ABP_TYPES.map(t => ({ value: t, label: t }))}
          />

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Instrucciones y Ejecución</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-green-500"
              rows={4}
              value={playDesc}
              onChange={(e) => setPlayDesc(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Input
              label="URL de Vídeo Táctico (YouTube / Vimeo)"
              type="text"
              value={playVideoUrl}
              onChange={(e) => setPlayVideoUrl(e.target.value)}
            />
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">Cambiar archivo de vídeo (.mp4/.mov)</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSaving} className="bg-green-500 text-slate-950 font-bold">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
