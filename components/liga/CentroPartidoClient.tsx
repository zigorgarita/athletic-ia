'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';
import {
  Player, Match, MatchPlayerStats, MatchABPPlay, MatchABPPlayerRole,
  MatchFullVideo, MatchVideoClip, MatchStrategicAction, MatchCustomVideo, MatchDocument,
  ABPPlay, TacticalLineup
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MatchHeader } from './MatchHeader';
import { MatchTabs } from './MatchTabs';
import { TacticalField, PositionNode } from '@/components/tactica/TacticalField';
import {
  Trophy, MapPin, Users, Shield, Film,
  BookOpen, Plus, PlusCircle, Save, Trash2, FileText, ClipboardList,
  Eye, Download, Upload, AlertCircle
} from 'lucide-react';

interface CentroPartidoClientProps {
  matchId: string;
}

const MAIN_TABS = [
  { id: 'analisis', label: 'Análisis', icon: FileText },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'plan', label: 'Plan', icon: BookOpen },
  { id: 'abp', label: 'ABP', icon: Shield },
  { id: 'partido', label: 'Partido', icon: ClipboardList }
];

/*
const TABS = [
  { id: 'general', label: 'Info General', icon: Info },
  { id: 'abp', label: 'ABP del Partido', icon: Shield },
  { id: 'video_completo', label: 'Vídeo Completo', icon: Film },
  { id: 'cortes', label: 'Cortes de Vídeo', icon: Film },
  { id: 'vigilar', label: 'Acciones a Vigilar', icon: AlertCircle },
  { id: 'recalcar', label: 'Acciones a Recalcar', icon: Trophy },
  { id: 'personalizados', label: 'Vídeos Staff', icon: Users },
  { id: 'analista', label: 'Informe Analista', icon: FileText },
  { id: 'documentacion', label: 'Documentación', icon: BookOpen }
];
*/

export function CentroPartidoClient({ matchId }: CentroPartidoClientProps) {
  const { isEditMode } = useEditMode();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('analisis');
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video visor states
  const [activeVideoTitle, setActiveVideoTitle] = useState('');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoType, setActiveVideoType] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Tab 1: General Info states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [matchHora, setMatchHora] = useState('');
  const [matchCampo, setMatchCampo] = useState('');
  const [matchClasificacionNota, setMatchClasificacionNota] = useState('');
  const [matchStats, setMatchStats] = useState<MatchPlayerStats[]>([]);
  const [nodesPropio, setNodesPropio] = useState<PositionNode[]>([]);
  const [tacticalLineup, setTacticalLineup] = useState<TacticalLineup | null>(null);

  // Tab 2: ABP states
  const [matchABPs, setMatchABPs] = useState<MatchABPPlay[]>([]);
  const [selectedABP, setSelectedABP] = useState<MatchABPPlay | null>(null);
  const [abpRoles, setAbpRoles] = useState<MatchABPPlayerRole[]>([]);
  const [isImportABPModalOpen, setIsImportABPModalOpen] = useState(false);
  const [masterABPs, setMasterABPs] = useState<ABPPlay[]>([]);
  const [selectedMasterABPId, setSelectedMasterABPId] = useState('');
  const [isCreatingABP, setIsCreatingABP] = useState(false);
  const [newABPTitle, setNewABPTitle] = useState('');
  const [newABPTipo, setNewABPTipo] = useState('Córner ofensivo');
  const [newABPDesc, setNewABPDesc] = useState('');
  const [newABPUrl, setNewABPUrl] = useState('');
  const [newABPOrigin, setNewABPOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [abpFile, setAbpFile] = useState<File | null>(null);
  const [isUploadingABP, setIsUploadingABP] = useState(false);

  // Tab 3: Video Completo states
  const [fullVideos, setFullVideos] = useState<MatchFullVideo[]>([]);
  const [completoUrl, setCompletoUrl] = useState('');
  const [completoOrigin, setCompletoOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [completoFile, setCompletoFile] = useState<File | null>(null);
  const [p1Url, setP1Url] = useState('');
  const [p1Origin, setP1Origin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [p1File, setP1File] = useState<File | null>(null);
  const [p2Url, setP2Url] = useState('');
  const [p2Origin, setP2Origin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [p2File, setP2File] = useState<File | null>(null);
  const [isSavingFullVideos, setIsSavingFullVideos] = useState(false);

  // Tab 4: Cortes de Vídeo states
  const [videoClips, setVideoClips] = useState<MatchVideoClip[]>([]);
  const [isClipModalOpen, setIsClipModalOpen] = useState(false);
  const [clipTitle, setClipTitle] = useState('');
  const [clipCategory, setClipCategory] = useState<'OFENSIVO' | 'DEFENSIVO'>('OFENSIVO');
  const [clipSubcategory, setClipSubcategory] = useState('Ataque organizado');
  const [clipUrl, setClipUrl] = useState('');
  const [clipOrigin, setClipOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [clipComment, setClipComment] = useState('');
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [isSavingClip, setIsSavingClip] = useState(false);

  // Tabs 5 & 6: Strategic Actions states (Vigilar & Recalcar)
  const [strategicActions, setStrategicActions] = useState<MatchStrategicAction[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'VIGILAR' | 'RECALCAR'>('VIGILAR');
  const [actionAspect, setActionAspect] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionOrigin, setActionOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [actionFile, setActionFile] = useState<File | null>(null);
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Tab 7: Custom Videos states
  const [customVideos, setCustomVideos] = useState<MatchCustomVideo[]>([]);
  const [isCustomVideoModalOpen, setIsCustomVideoModalOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState<'Delanteros' | 'Centrales' | 'Pivotes' | 'Individual' | 'Otros'>('Otros');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customOrigin, setCustomOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isSavingCustomVideo, setIsSavingCustomVideo] = useState(false);

  // Tab 8: Analyst Report states
  const [reportResumen, setReportResumen] = useState('');
  const [reportPositivos, setReportPositivos] = useState('');
  const [reportMejorar, setReportMejorar] = useState('');
  const [reportClaves, setReportClaves] = useState('');
  const [reportConclusiones, setReportConclusiones] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Tab 9: Documentacion states
  const [documents, setDocuments] = useState<MatchDocument[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Convocatoria PDF');
  const [docUrl, setDocUrl] = useState('');
  const [docOrigin, setDocOrigin] = useState<'Enlace' | 'Archivo'>('Enlace');
  const [docComment, setDocComment] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // --- FETCH DATA ---
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Match Details
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      if (matchErr) throw matchErr;
      setMatch(matchData);
      setMatchHora(matchData.hora || '');
      setMatchCampo(matchData.campo || '');
      setMatchClasificacionNota(matchData.clasificacion_nota || '');
      setReportResumen(matchData.analisis_resumen || '');
      setReportPositivos(matchData.analisis_positivos || '');
      setReportMejorar(matchData.analisis_mejorar || '');
      setReportClaves(matchData.analisis_claves || '');
      setReportConclusiones(matchData.analisis_conclusiones || '');

      // 2. Squad/Players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .order('dorsal', { ascending: true });
      if (playersErr) throw playersErr;
      setPlayers(playersData || []);

      // 3. Match Player Stats
      const { data: statsData, error: statsErr } = await supabase
        .from('match_player_stats')
        .select('*')
        .eq('match_id', matchId);
      if (statsErr) throw statsErr;
      setMatchStats(statsData || []);

      // 4. Match ABP plays
      const { data: abpPlaysData, error: abpPlaysErr } = await supabase
        .from('match_abp_plays')
        .select('*')
        .eq('match_id', matchId);
      if (abpPlaysErr) throw abpPlaysErr;
      setMatchABPs(abpPlaysData || []);
      if (abpPlaysData && abpPlaysData.length > 0) {
        setSelectedABP(abpPlaysData[0]);
      } else {
        setSelectedABP(null);
      }

      // 5. Match Full Videos
      const { data: fullVideosData, error: fullVideosErr } = await supabase
        .from('match_full_videos')
        .select('*')
        .eq('match_id', matchId);
      if (fullVideosErr) throw fullVideosErr;
      setFullVideos(fullVideosData || []);
      // Pre-populate full videos fields
      const comp = fullVideosData?.find(v => v.tipo_video === 'Completo');
      const p1 = fullVideosData?.find(v => v.tipo_video === 'Primera Parte');
      const p2 = fullVideosData?.find(v => v.tipo_video === 'Segunda Parte');
      if (comp) {
        setCompletoUrl(comp.video_url);
        setCompletoOrigin(comp.tipo_origen);
      }
      if (p1) {
        setP1Url(p1.video_url);
        setP1Origin(p1.tipo_origen);
      }
      if (p2) {
        setP2Url(p2.video_url);
        setP2Origin(p2.tipo_origen);
      }

      // 6. Match Video Clips
      const { data: videoClipsData, error: videoClipsErr } = await supabase
        .from('match_video_clips')
        .select('*')
        .eq('match_id', matchId);
      if (videoClipsErr) throw videoClipsErr;
      setVideoClips(videoClipsData || []);

      // 7. Match Strategic Actions
      const { data: strategicData, error: strategicErr } = await supabase
        .from('match_strategic_actions')
        .select('*')
        .eq('match_id', matchId);
      if (strategicErr) throw strategicErr;
      setStrategicActions(strategicData || []);

      // 8. Match Custom Videos
      const { data: customData, error: customErr } = await supabase
        .from('match_custom_videos')
        .select('*')
        .eq('match_id', matchId);
      if (customErr) throw customErr;
      setCustomVideos(customData || []);

      // 9. Match Documents
      const { data: documentsData, error: docsErr } = await supabase
        .from('match_documents')
        .select('*')
        .eq('match_id', matchId);
      if (docsErr) throw docsErr;
      setDocuments(documentsData || []);

      // 10. Tactical Lineup
      const { data: lineupData, error: lineupErr } = await supabase
        .from('tactical_lineups')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch systems for default coordinates fallback
      const { data: systemsData } = await supabase
        .from('tactical_systems')
        .select('*');

      if (lineupErr) {
        console.error('Error loading tactical lineup:', lineupErr);
      } else if (lineupData && lineupData.length > 0) {
        const lineup = lineupData[0];
        setTacticalLineup(lineup);
        if (lineup.posiciones) {
          let pos = lineup.posiciones;
          if (!Array.isArray(pos) && pos.propio && Array.isArray(pos.propio)) {
            pos = pos.propio;
          }
          if (Array.isArray(pos)) {
            setNodesPropio(pos as PositionNode[]);
          }
        }
      } else {
        setTacticalLineup(null);
        const defaultSys = systemsData?.find(s => s.nombre === '1-4-2-3-1') || systemsData?.[0];
        if (defaultSys && defaultSys.coordenadas_base) {
          setNodesPropio(
            (defaultSys.coordenadas_base as unknown as PositionNode[]).map(c => ({
              ...c,
              player_id: null,
              notas_entrenador: ''
            }))
          );
        } else {
          setNodesPropio([]);
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del Centro de Partido');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load abp roles when selected ABP changes
  useEffect(() => {
    async function loadABPRoles() {
      if (!selectedABP) {
        setAbpRoles([]);
        return;
      }
      const { data, error } = await supabase
        .from('match_abp_player_roles')
        .select('*')
        .eq('match_abp_play_id', selectedABP.id)
        .order('orden', { ascending: true });
      if (error) {
        console.error('Error fetching match ABP roles:', error);
      } else {
        setAbpRoles(data || []);
      }
    }
    loadABPRoles();
  }, [selectedABP]);

  // Load Master ABPs for cloning
  const openImportABPModal = async () => {
    setIsImportABPModalOpen(true);
    const { data, error } = await supabase
      .from('abp_plays')
      .select('*')
      .order('titulo', { ascending: true });
    if (!error) {
      setMasterABPs(data || []);
    }
  };

  // Visor play helper
  const handlePlayVideo = (title: string, url: string, origin: 'Enlace' | 'Archivo') => {
    setActiveVideoTitle(title);
    setActiveVideoUrl(url);
    setActiveVideoType(origin);
    setIsVideoModalOpen(true);
  };

  // Helper function to upload files to Supabase Storage
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('match-videos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // --- SAVE ACTIONS ---

  // Tab 1: General Info Save
  const handleSaveGeneralInfo = async () => {
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: {
            id: matchId,
            hora: matchHora || null,
            campo: matchCampo || null,
            clasificacion_nota: matchClasificacionNota || null
          },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (error) throw error;
      setIsEditingInfo(false);
      loadAllData();
      alert('Información general guardada correctamente.');
    } catch (err: unknown) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 2: Clone master ABP play to match ABP play
  const handleImportABP = async () => {
    if (!selectedMasterABPId) return;
    try {
      // 1. Get master play
      const { data: masterPlay, error: playErr } = await supabase
        .from('abp_plays')
        .select('*')
        .eq('id', selectedMasterABPId)
        .single();
      if (playErr) throw playErr;

      // 2. Clone play to match_abp_plays
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: clonedPlay, error: cloneErr } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_abp_plays',
          payload: {
            match_id: matchId,
            tipo: masterPlay.tipo,
            titulo: masterPlay.titulo,
            descripcion: masterPlay.descripcion,
            video_url: masterPlay.video_url,
            tipo_origen: 'Enlace'
          },
          conflict_columns: null,
          staff_passkey: passkey
        });
      if (cloneErr) throw cloneErr;

      // 3. Get master roles
      const { data: masterRoles, error: rolesErr } = await supabase
        .from('abp_player_roles')
        .select('*')
        .eq('abp_play_id', selectedMasterABPId);
      if (rolesErr) throw rolesErr;

      // 4. Clone roles to match_abp_player_roles
      if (masterRoles && masterRoles.length > 0) {
        const clonedRoles = masterRoles.map(mr => {
          const player = players.find(p => p.id === mr.player_id);
          return {
            match_abp_play_id: clonedPlay.id,
            player_id: mr.player_id,
            player_full_name_backup: player ? `${player.nombre} ${player.apellidos}` : null,
            player_dorsal_backup: player ? player.dorsal : null,
            rol_asignado: mr.rol_asignado,
            posicion_x: mr.posicion_x || 50,
            posicion_y: mr.posicion_y || 50,
            etiqueta: mr.etiqueta || '',
            comentario: mr.comentario || '',
            orden: mr.orden || 1
          };
        });

        const { error: rolesInsertErr } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'match_abp_player_roles',
            payloads: clonedRoles,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (rolesInsertErr) throw rolesInsertErr;
      }

      setIsImportABPModalOpen(false);
      setSelectedMasterABPId('');
      loadAllData();
      alert('ABP clonada al partido correctamente.');
    } catch (err: unknown) {
      alert(`Error al clonar ABP: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 2: Create new custom Match ABP
  const handleCreateMatchABP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newABPTitle.trim()) return;
    setIsUploadingABP(true);
    try {
      let finalUrl = newABPUrl;
      if (newABPOrigin === 'Archivo' && abpFile) {
        finalUrl = await uploadFile(abpFile, 'match-abp');
      }

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: play, error: playErr } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_abp_plays',
          payload: {
            match_id: matchId,
            tipo: newABPTipo,
            titulo: newABPTitle,
            descripcion: newABPDesc,
            video_url: finalUrl || null,
            tipo_origen: newABPOrigin
          },
          conflict_columns: null,
          staff_passkey: passkey
        });
      if (playErr) throw playErr;

      // Create default empty roles (say 6 default roles)
      const defaultRoles = [
        { rol_asignado: 'Lanzador', posicion_x: 10, posicion_y: 50, orden: 1 },
        { rol_asignado: 'Rematador', posicion_x: 45, posicion_y: 20, orden: 2 },
        { rol_asignado: 'Rematador', posicion_x: 52, posicion_y: 20, orden: 3 },
        { rol_asignado: 'Cierre', posicion_x: 50, posicion_y: 75, orden: 4 },
        { rol_asignado: 'Cierre', posicion_x: 35, posicion_y: 70, orden: 5 },
        { rol_asignado: 'Rechace', posicion_x: 50, posicion_y: 45, orden: 6 }
      ];

      const rolesPayload = defaultRoles.map(dr => ({
        match_abp_play_id: play.id,
        player_id: null,
        player_full_name_backup: null,
        player_dorsal_backup: null,
        rol_asignado: dr.rol_asignado,
        posicion_x: dr.posicion_x,
        posicion_y: dr.posicion_y,
        orden: dr.orden
      }));

      const { error: rolesErr } = await supabase
        .rpc('exec_secure_bulk_upsert', {
          target_table: 'match_abp_player_roles',
          payloads: rolesPayload,
          conflict_columns: null,
          staff_passkey: passkey
        });
      if (rolesErr) throw rolesErr;

      setNewABPTitle('');
      setNewABPDesc('');
      setNewABPUrl('');
      setAbpFile(null);
      setIsCreatingABP(false);
      loadAllData();
      alert('ABP creada correctamente para el partido.');
    } catch (err: unknown) {
      alert(`Error al crear ABP: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploadingABP(false);
    }
  };

  // Tab 2: Update assigned player and coordinates on ABP Role
  const handleUpdateABPRole = async (roleId: string, playerId: string | null, posX?: number, posY?: number) => {
    try {
      const player = players.find(p => p.id === playerId);
      const updates: Partial<MatchABPPlayerRole> = {};
      if (playerId !== undefined) {
        updates.player_id = playerId;
        updates.player_full_name_backup = player ? `${player.nombre} ${player.apellidos}` : null;
        updates.player_dorsal_backup = player ? player.dorsal : null;
      }
      if (posX !== undefined) updates.posicion_x = posX;
      if (posY !== undefined) updates.posicion_y = posY;

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_abp_player_roles',
          payload: { ...updates, id: roleId },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (error) throw error;

      // Update local state
      setAbpRoles(prev => prev.map(r => r.id === roleId ? { ...r, ...updates } : r));
    } catch (err: unknown) {
      console.error('Error updating ABP role:', err);
    }
  };

  // Tab 2: Delete match ABP play
  const handleDeleteMatchABP = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ABP específica del partido?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'match_abp_plays',
          record_id: id,
          staff_passkey: passkey
        });
      if (error) throw error;
      loadAllData();
    } catch (err: unknown) {
      alert(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 3: Save Full Videos
  const handleSaveFullVideos = async () => {
    setIsSavingFullVideos(true);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const videoTypes: { type: 'Completo' | 'Primera Parte' | 'Segunda Parte', url: string, origin: 'Enlace' | 'Archivo', file: File | null }[] = [
        { type: 'Completo', url: completoUrl, origin: completoOrigin, file: completoFile },
        { type: 'Primera Parte', url: p1Url, origin: p1Origin, file: p1File },
        { type: 'Segunda Parte', url: p2Url, origin: p2Origin, file: p2File }
      ];

      for (const vt of videoTypes) {
        let finalUrl = vt.url;
        if (vt.origin === 'Archivo' && vt.file) {
          finalUrl = await uploadFile(vt.file, 'full-videos');
        }

        const existing = fullVideos.find(v => v.tipo_video === vt.type);

        if (existing) {
          if (finalUrl) {
            const { error } = await supabase
              .rpc('exec_secure_upsert', {
                target_table: 'match_full_videos',
                payload: { id: existing.id, video_url: finalUrl, tipo_origen: vt.origin },
                conflict_columns: ['id'],
                staff_passkey: passkey
              });
            if (error) throw error;
          } else {
            // Delete if cleared
            await supabase.rpc('exec_secure_delete', {
              target_table: 'match_full_videos',
              record_id: existing.id,
              staff_passkey: passkey
            });
          }
        } else if (finalUrl) {
          const { error } = await supabase
            .rpc('exec_secure_upsert', {
              target_table: 'match_full_videos',
              payload: {
                match_id: matchId,
                tipo_video: vt.type,
                tipo_origen: vt.origin,
                video_url: finalUrl
              },
              conflict_columns: null,
              staff_passkey: passkey
            });
          if (error) throw error;
        }
      }

      setCompletoFile(null);
      setP1File(null);
      setP2File(null);
      loadAllData();
      alert('Vídeos completos del partido actualizados.');
    } catch (err: unknown) {
      alert(`Error al guardar vídeos: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingFullVideos(false);
    }
  };

  // Tab 4: Save Tactical Clip
  const handleSaveClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipTitle.trim()) return;
    setIsSavingClip(true);
    try {
      let finalUrl = clipUrl;
      if (clipOrigin === 'Archivo' && clipFile) {
        finalUrl = await uploadFile(clipFile, 'video-clips');
      }

      if (!finalUrl) throw new Error('Es necesario un archivo o enlace para el clip');

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_video_clips',
          payload: {
            match_id: matchId,
            categoria: clipCategory,
            subcategoria: clipSubcategory,
            titulo: clipTitle,
            tipo_origen: clipOrigin,
            video_url: finalUrl,
            comentario_tecnico: clipComment || null
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (error) throw error;

      setClipTitle('');
      setClipUrl('');
      setClipComment('');
      setClipFile(null);
      setIsClipModalOpen(false);
      loadAllData();
      alert('Corte de vídeo guardado correctamente.');
    } catch (err: unknown) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingClip(false);
    }
  };

  const handleDeleteClip = async (id: string) => {
    if (!confirm('¿Deseas eliminar este corte de vídeo?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'match_video_clips',
        record_id: id,
        staff_passkey: passkey
      });
      if (error) throw error;
      loadAllData();
    } catch (err: unknown) {
      alert(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 5 & 6: Save Strategic Action
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionAspect.trim()) return;
    setIsSavingAction(true);
    try {
      let finalUrl = actionUrl;
      if (actionOrigin === 'Archivo' && actionFile) {
        finalUrl = await uploadFile(actionFile, 'strategic-actions');
      }

      if (!finalUrl) throw new Error('Es necesario un archivo o enlace para la acción');

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_strategic_actions',
          payload: {
            match_id: matchId,
            tipo: actionType,
            aspecto: actionAspect,
            descripcion: actionDesc || null,
            tipo_origen: actionOrigin,
            video_url: finalUrl
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (error) throw error;

      setActionAspect('');
      setActionDesc('');
      setActionUrl('');
      setActionFile(null);
      setIsActionModalOpen(false);
      loadAllData();
      alert('Acción estratégica guardada correctamente.');
    } catch (err: unknown) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta acción táctica?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'match_strategic_actions',
        record_id: id,
        staff_passkey: passkey
      });
      if (error) throw error;
      loadAllData();
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 7: Custom Staff Videos Save
  const handleSaveCustomVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setIsSavingCustomVideo(true);
    try {
      let finalUrl = customUrl;
      if (customOrigin === 'Archivo' && customFile) {
        finalUrl = await uploadFile(customFile, 'custom-videos');
      }

      if (!finalUrl) throw new Error('Es necesario un archivo o enlace para el vídeo');

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_custom_videos',
          payload: {
            match_id: matchId,
            etiqueta: customLabel,
            titulo: customTitle,
            tipo_origen: customOrigin,
            video_url: finalUrl
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (error) throw error;

      setCustomTitle('');
      setCustomUrl('');
      setCustomFile(null);
      setIsCustomVideoModalOpen(false);
      loadAllData();
      alert('Vídeo personalizado del staff guardado.');
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingCustomVideo(false);
    }
  };

  const handleDeleteCustomVideo = async (id: string) => {
    if (!confirm('¿Deseas eliminar este vídeo?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'match_custom_videos',
        record_id: id,
        staff_passkey: passkey
      });
      if (error) throw error;
      loadAllData();
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Tab 8: Save Analyst Report
  const handleSaveReport = async () => {
    setIsSavingReport(true);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: {
            id: matchId,
            analisis_resumen: reportResumen || null,
            analisis_positivos: reportPositivos || null,
            analisis_mejorar: reportMejorar || null,
            analisis_claves: reportClaves || null,
            analisis_conclusiones: reportConclusiones || null
          },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (error) throw error;
      loadAllData();
      alert('Informe del analista guardado con éxito.');
    } catch (err: unknown) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Tab 9: Save Document
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setIsSavingDoc(true);
    try {
      let finalUrl = docUrl;
      if (docOrigin === 'Archivo' && docFile) {
        // We will store docs in documents folder
        finalUrl = await uploadFile(docFile, 'documents');
      }

      if (!finalUrl) throw new Error('Es necesario un archivo o enlace para el documento');

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_documents',
          payload: {
            match_id: matchId,
            nombre_documento: docName,
            tipo_documento: docType,
            tipo_origen: docOrigin,
            url_storage: finalUrl,
            comentario: docComment || null
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (error) throw error;

      setDocName('');
      setDocUrl('');
      setDocComment('');
      setDocFile(null);
      setIsDocModalOpen(false);
      loadAllData();
      alert('Documento guardado con éxito.');
    } catch (err: unknown) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('¿Deseas eliminar este documento?')) return;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'match_documents',
        record_id: id,
        staff_passkey: passkey
      });
      if (error) throw error;
      loadAllData();
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Render Loader
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/30 text-red-400 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto" />
        <div>
          <h3 className="text-lg font-bold">Error</h3>
          <p className="text-sm mt-1">{error || 'Jornada no encontrada.'}</p>
        </div>
        <Link href="/liga" className="inline-block">
          <Button>Volver a la Liga</Button>
        </Link>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {/* Cabecera Premium del Partido */}
      <MatchHeader 
        match={match} 
        onBack={() => router.push('/liga')} 
      />

      {/* Selector de Pestañas */}
      <MatchTabs
        tabs={MAIN_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Contents */}
      <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6 min-h-[500px]">

        {/* TAB 1: EQUIPO (CONVOCATORIA Y ESTADÍSTICAS) */}
        {activeTab === 'equipo' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Datos Encuentro */}
              <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                    <MapPin className="h-4.5 w-4.5 text-[#CC0E21]" />
                    Detalles del Encuentro
                  </h3>
                  {isEditMode && (
                    <button
                      onClick={() => {
                        if (isEditingInfo) handleSaveGeneralInfo();
                        else setIsEditingInfo(true);
                      }}
                      className="text-xs text-[#CC0E21] hover:underline font-bold"
                    >
                      {isEditingInfo ? 'Guardar' : 'Editar'}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Campo / Instalación</label>
                    {isEditingInfo ? (
                      <input value={matchCampo} onChange={(e) => setMatchCampo(e.target.value)} placeholder="Ej: Iparralde, Fadura..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                    ) : (
                      <span className="text-sm font-semibold text-slate-300">{matchCampo || 'No asignado'}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Hora del Partido</label>
                    {isEditingInfo ? (
                      <input value={matchHora} onChange={(e) => setMatchHora(e.target.value)} placeholder="Ej: 12:00, 17:30..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                    ) : (
                      <span className="text-sm font-semibold text-slate-300">{matchHora || 'No asignada'}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Impacto Clasificatorio</label>
                    {isEditingInfo ? (
                      <input value={matchClasificacionNota} onChange={(e) => setMatchClasificacionNota(e.target.value)} placeholder="Ej: Nos ponemos colíderes..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                    ) : (
                      <p className="text-xs text-slate-400 leading-relaxed italic">{matchClasificacionNota || 'Sin comentarios sobre la clasificación.'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Resumen Convocatoria */}
              <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4 md:col-span-2">
                <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm border-b border-slate-800/60 pb-3">
                  <Users className="h-4.5 w-4.5 text-[#CC0E21]" />
                  Convocatoria ({matchStats.length} Jugadores)
                </h3>
                {matchStats.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No se ha registrado la convocatoria todavía para esta jornada.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {matchStats.map(stat => {
                      const player = players.find(p => p.id === stat.player_id);
                      if (!player) return null;
                      return (
                        <div key={stat.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                            {player.dorsal}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate">{player.nombre} {player.apellidos}</h4>
                            <span className="text-[10px] text-slate-500 font-bold">{stat.titular ? 'Titular' : 'Suplente'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pizarra Táctica / Alineación Visual */}
            {nodesPropio.length > 0 && (
              <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4 flex flex-col items-center">
                <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm border-b border-slate-800/60 pb-3 w-full self-start">
                  <Shield className="h-4.5 w-4.5 text-[#CC0E21]" />
                  Disposición Táctica / Pizarra del Partido {tacticalLineup?.nombre_pizarra && `(${tacticalLineup.nombre_pizarra})`}
                </h3>
                <div className="w-full max-w-[700px] flex justify-center bg-slate-950/20 p-4 rounded-xl border border-slate-900/50">
                  <TacticalField
                    team="propio"
                    nodes={nodesPropio}
                    players={players}
                    isEditMode={false}
                    onNodesChange={() => {}}
                    onNodeClick={() => {}}
                  />
                </div>
              </div>
            )}

            {/* Estadísticas de Jugadores */}
            {matchStats.length > 0 && (
              <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm border-b border-slate-800/60 pb-3">
                  <ClipboardList className="h-4.5 w-4.5 text-[#CC0E21]" />
                  Estadísticas y Minutos de Juego
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Jugador</th>
                        <th className="py-2.5 px-3 text-center">Rol</th>
                        <th className="py-2.5 px-3 text-center">Minutos</th>
                        <th className="py-2.5 px-3 text-center">Goles</th>
                        <th className="py-2.5 px-3 text-center">Asist.</th>
                        <th className="py-2.5 px-3 text-center">Tarjetas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {matchStats.map(stat => {
                        const player = players.find(p => p.id === stat.player_id);
                        if (!player) return null;
                        return (
                          <tr key={stat.id} className="hover:bg-slate-900/20 text-slate-300">
                            <td className="py-2.5 px-3 font-semibold text-slate-100">{player.nombre} {player.apellidos}</td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge className={stat.titular ? 'bg-[#CC0E21]/15 text-[#CC0E21] border-[#CC0E21]/30' : 'bg-slate-800 text-slate-400'}>
                                {stat.titular ? 'Titular' : 'Suplente'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">{stat.minutos}&apos;</td>
                            <td className="py-2.5 px-3 text-center font-bold text-green-400">{stat.goles || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-amber-400">{stat.asistencias || 0}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {stat.tarjeta_amarilla && <div className="h-4 w-3 bg-yellow-500 rounded-sm" title="Tarjeta Amarilla" />}
                                {stat.tarjeta_roja && <div className="h-4 w-3 bg-red-500 rounded-sm" title="Tarjeta Roja" />}
                                {!stat.tarjeta_amarilla && !stat.tarjeta_roja && <span className="text-slate-600">-</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ABP DEL PARTIDO */}
        {activeTab === 'abp' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#CC0E21]" />
                  Acciones a Balón Parado del Partido
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Clona jugadas maestras y adapta las asignaciones sin modificar la biblioteca principal.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button onClick={openImportABPModal} className="flex items-center gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Importar de Biblioteca
                </Button>
                <Button onClick={() => setIsCreatingABP(true)} variant="secondary" className="flex items-center gap-1 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Nueva ABP Exclusiva
                </Button>
              </div>
            </div>

            {matchABPs.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-3 bg-slate-900/5">
                <Shield className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No se han asociado jugadas ABP a este partido de liga.</p>
                <Button onClick={openImportABPModal} variant="secondary" className="text-xs">Importar una jugada ahora</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Lateral: List of match ABPs */}
                <div className="space-y-2">
                  {matchABPs.map(abp => {
                    const isSelected = selectedABP?.id === abp.id;
                    return (
                      <div
                        key={abp.id}
                        onClick={() => setSelectedABP(abp)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#CC0E21]/10 border-[#CC0E21]/40 text-[#CC0E21]'
                            : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase text-[#CC0E21]">{abp.tipo}</span>
                          <h4 className="text-xs font-bold text-slate-200 truncate mt-0.5">{abp.titulo}</h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMatchABP(abp.id);
                          }}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Main: Details, Player Assignments & Video */}
                {selectedABP && (
                  <div className="lg:col-span-3 p-6 bg-slate-950/20 border border-slate-850 rounded-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-850 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#CC0E21]">{selectedABP.tipo}</span>
                        <h3 className="text-lg font-bold text-slate-100 mt-1">{selectedABP.titulo}</h3>
                        <p className="text-xs text-slate-400 mt-1">{selectedABP.descripcion}</p>
                      </div>
                      {selectedABP.video_url && (
                        <Button
                          onClick={() => handlePlayVideo(selectedABP.titulo, selectedABP.video_url!, selectedABP.tipo_origen)}
                          className="flex items-center gap-1.5 text-xs py-1.5 px-3 self-start"
                        >
                          <Film className="h-3.5 w-3.5" />
                          Ver vídeo ABP
                        </Button>
                      )}
                    </div>

                    {/* Role Player Assignments Editor */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-[#CC0E21]" />
                        Asignación de Roles del Partido
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {abpRoles.map(role => (
                          <div key={role.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide block">Rol</span>
                              <span className="text-xs font-bold text-slate-200">{role.rol_asignado}</span>
                            </div>
                            <div className="w-48">
                              <select
                                value={role.player_id || ''}
                                onChange={(e) => handleUpdateABPRole(role.id, e.target.value || null)}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none"
                              >
                                <option value="">-- Sin asignar / Histórico --</option>
                                {players.map(p => (
                                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                                    ({p.dorsal}) {p.nombre} {p.apellidos}
                                  </option>
                                ))}
                              </select>
                              {/* Show Backup Info if player was deleted or not matching */}
                              {!role.player_id && role.player_full_name_backup && (
                                <span className="text-[9px] text-amber-500/80 block mt-1 font-semibold">
                                  Historial: {role.player_full_name_backup} (Dorsal {role.player_dorsal_backup})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PARTIDO */}
        {activeTab === 'partido' && (
          <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10 select-none">
            <ClipboardList className="h-12 w-12 text-slate-655" />
            <div>
              <h3 className="text-lg font-bold text-slate-200">Cronología de Eventos</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                Próximamente podrás visualizar el registro detallado de incidencias del encuentro (goles, cambios, tarjetas y momentos clave) en tiempo real.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: VÍDEO COMPLETO */}
        {activeTab === 'video_completo' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <Film className="h-5 w-5 text-[#CC0E21]" />
                Vídeos Completos del Partido
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">Enlaza o sube los vídeos del partido completo, la primera parte o la segunda parte.</p>
            </div>

            <div className="space-y-6 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl">
              {/* Completo */}
              <div className="space-y-2 border-b border-slate-800/60 pb-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Partido Completo</label>
                  {completoUrl && (
                    <button
                      onClick={() => handlePlayVideo('Partido Completo', completoUrl, completoOrigin)}
                      className="text-xs text-[#CC0E21] hover:underline font-bold flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Ver Reproductor
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={completoOrigin} onChange={(e) => setCompletoOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                    <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace externo (YouTube/Drive)</option>
                    <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo (Subir local)</option>
                  </select>
                  {completoOrigin === 'Enlace' ? (
                    <input value={completoUrl} onChange={(e) => setCompletoUrl(e.target.value)} placeholder="Pegar URL del vídeo completo" className="sm:col-span-3 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                  ) : (
                    <div className="sm:col-span-3 flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5">
                      <Upload className="h-4 w-4 text-slate-500" />
                      <input type="file" accept="video/*" onChange={(e) => setCompletoFile(e.target.files?.[0] || null)} className="text-xs text-slate-400 bg-transparent border-0 focus:ring-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Primera Parte */}
              <div className="space-y-2 border-b border-slate-800/60 pb-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Primera Parte</label>
                  {p1Url && (
                    <button
                      onClick={() => handlePlayVideo('Primera Parte', p1Url, p1Origin)}
                      className="text-xs text-[#CC0E21] hover:underline font-bold flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Ver Reproductor
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={p1Origin} onChange={(e) => setP1Origin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                    <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace externo (YouTube/Drive)</option>
                    <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo (Subir local)</option>
                  </select>
                  {p1Origin === 'Enlace' ? (
                    <input value={p1Url} onChange={(e) => setP1Url(e.target.value)} placeholder="Pegar URL de la Primera Parte" className="sm:col-span-3 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                  ) : (
                    <div className="sm:col-span-3 flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5">
                      <Upload className="h-4 w-4 text-slate-500" />
                      <input type="file" accept="video/*" onChange={(e) => setP1File(e.target.files?.[0] || null)} className="text-xs text-slate-400 bg-transparent border-0 focus:ring-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Segunda Parte */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Segunda Parte</label>
                  {p2Url && (
                    <button
                      onClick={() => handlePlayVideo('Segunda Parte', p2Url, p2Origin)}
                      className="text-xs text-[#CC0E21] hover:underline font-bold flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Ver Reproductor
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={p2Origin} onChange={(e) => setP2Origin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                    <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace externo (YouTube/Drive)</option>
                    <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo (Subir local)</option>
                  </select>
                  {p2Origin === 'Enlace' ? (
                    <input value={p2Url} onChange={(e) => setP2Url(e.target.value)} placeholder="Pegar URL de la Segunda Parte" className="sm:col-span-3 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                  ) : (
                    <div className="sm:col-span-3 flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5">
                      <Upload className="h-4 w-4 text-slate-500" />
                      <input type="file" accept="video/*" onChange={(e) => setP2File(e.target.files?.[0] || null)} className="text-xs text-slate-400 bg-transparent border-0 focus:ring-0" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-4">
                <Button onClick={handleSaveFullVideos} disabled={isSavingFullVideos} className="flex items-center gap-1 text-xs">
                  <Save className="h-4 w-4" />
                  {isSavingFullVideos ? 'Guardando...' : 'Guardar Vídeos'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CORTES DE VÍDEO */}
        {activeTab === 'cortes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Film className="h-5 w-5 text-[#CC0E21]" />
                  Cortes de Vídeo del Analista
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Visualiza y analiza jugadas ofensivas y defensivas concretas del partido.</p>
              </div>
              <Button onClick={() => setIsClipModalOpen(true)} className="flex items-center gap-1 text-xs self-start sm:self-auto">
                <Plus className="h-3.5 w-3.5" />
                Añadir Corte
              </Button>
            </div>

            {videoClips.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2 bg-slate-900/5">
                <Film className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No se han registrado cortes de vídeo para este encuentro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoClips.map(clip => (
                  <div key={clip.id} className="p-5 bg-slate-950/20 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 left-0 h-1 ${clip.categoria === 'OFENSIVO' ? 'bg-green-500/80' : 'bg-red-500/80'}`} />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={clip.categoria === 'OFENSIVO' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                          {clip.categoria}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{clip.subcategoria}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mt-1">{clip.titulo}</h4>
                      {clip.comentario_tecnico && (
                        <p className="text-xs text-slate-400 leading-relaxed italic">{clip.comentario_tecnico}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-1">
                      <Button
                        onClick={() => handlePlayVideo(clip.titulo, clip.video_url, clip.tipo_origen)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-750"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#CC0E21]" />
                        Ver Vídeo
                      </Button>
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Eliminar corte"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACCIONES A VIGILAR (CORRECCIONES) */}
        {activeTab === 'vigilar' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Acciones a Vigilar (Correcciones Tácticas)
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Clips y observaciones sobre errores tácticos del equipo o amenazas específicas del rival.</p>
              </div>
              <Button onClick={() => { setActionType('VIGILAR'); setIsActionModalOpen(true); }} className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white self-start sm:self-auto">
                <Plus className="h-3.5 w-3.5" />
                Añadir Aspecto a Vigilar
              </Button>
            </div>

            {strategicActions.filter(a => a.tipo === 'VIGILAR').length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2 bg-slate-900/5">
                <AlertCircle className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No se han registrado aspectos a vigilar para este partido.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {strategicActions.filter(a => a.tipo === 'VIGILAR').map(action => (
                  <div key={action.id} className="p-5 bg-slate-950/20 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {action.aspecto}
                      </h4>
                      {action.descripcion && (
                        <p className="text-xs text-slate-400 leading-relaxed italic">{action.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                      <Button
                        onClick={() => handlePlayVideo(action.aspecto, action.video_url, action.tipo_origen)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5 text-red-500" />
                        Ver Vídeo
                      </Button>
                      <button onClick={() => handleDeleteAction(action.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACCIONES A RECALCAR (ACIERTOS) */}
        {activeTab === 'recalcar' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  Acciones a Recalcar (Refuerzo Positivo)
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Clips y observaciones sobre aciertos colectivos y conductas tácticas excelentes del encuentro.</p>
              </div>
              <Button onClick={() => { setActionType('RECALCAR'); setIsActionModalOpen(true); }} className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 text-white self-start sm:self-auto">
                <Plus className="h-3.5 w-3.5" />
                Añadir Aspecto a Recalcar
              </Button>
            </div>

            {strategicActions.filter(a => a.tipo === 'RECALCAR').length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2 bg-slate-900/5">
                <Trophy className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No se han registrado aspectos a recalcar para este partido.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {strategicActions.filter(a => a.tipo === 'RECALCAR').map(action => (
                  <div key={action.id} className="p-5 bg-slate-950/20 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {action.aspecto}
                      </h4>
                      {action.descripcion && (
                        <p className="text-xs text-slate-400 leading-relaxed italic">{action.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                      <Button
                        onClick={() => handlePlayVideo(action.aspecto, action.video_url, action.tipo_origen)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5 text-green-500" />
                        Ver Vídeo
                      </Button>
                      <button onClick={() => handleDeleteAction(action.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: VÍDEOS PERSONALIZADOS (GRUPOS DE TRABAJO STAFF) */}
        {activeTab === 'personalizados' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#CC0E21]" />
                  Vídeos del Staff por Grupos
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Clips dirigidos a sectores concretos del equipo (defensas, delanteros, mediocampistas, etc.).</p>
              </div>
              <Button onClick={() => setIsCustomVideoModalOpen(true)} className="flex items-center gap-1 text-xs self-start sm:self-auto">
                <Plus className="h-3.5 w-3.5" />
                Subir Clip por Grupo
              </Button>
            </div>

            {customVideos.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2 bg-slate-900/5">
                <Users className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No hay clips específicos de grupo cargados en esta jornada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customVideos.map(video => (
                  <div key={video.id} className="p-5 bg-slate-950/20 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-[#CC0E21]/15 text-[#CC0E21] border-[#CC0E21]/20">
                          {video.etiqueta}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1">{video.titulo}</h4>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                      <Button
                        onClick={() => handlePlayVideo(video.titulo, video.video_url, video.tipo_origen)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#CC0E21]" />
                        Ver Vídeo
                      </Button>
                      <button onClick={() => handleDeleteCustomVideo(video.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: INFORME DEL ANALISTA (ANÁLISIS) */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#CC0E21]" />
                  Informe Técnico del Analista
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Redacta el análisis en profundidad estructurado en las cinco áreas principales.</p>
              </div>
              <Button onClick={handleSaveReport} disabled={isSavingReport} className="flex items-center gap-1 text-xs">
                <Save className="h-4 w-4" />
                {isSavingReport ? 'Guardando...' : 'Guardar Informe'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección 1 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Resumen del Partido</label>
                <textarea
                  value={reportResumen}
                  onChange={(e) => setReportResumen(e.target.value)}
                  placeholder="Redacta un resumen general de cómo se desarrolló el encuentro..."
                  rows={6}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                />
              </div>

              {/* Sección 2 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Aspectos Positivos</label>
                <textarea
                  value={reportPositivos}
                  onChange={(e) => setReportPositivos(e.target.value)}
                  placeholder="Fortalezas, dinámicas que funcionaron, buena actitud..."
                  rows={6}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                />
              </div>

              {/* Sección 3 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Aspectos a Mejorar</label>
                <textarea
                  value={reportMejorar}
                  onChange={(e) => setReportMejorar(e.target.value)}
                  placeholder="Errores cometidos, desajustes defensivos, tomas de decisión incorrectas..."
                  rows={6}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                />
              </div>

              {/* Sección 4 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Claves Tácticas del Encuentro</label>
                <textarea
                  value={reportClaves}
                  onChange={(e) => setReportClaves(e.target.value)}
                  placeholder="Decisiones tácticas del rival o propias que decantaron el marcador..."
                  rows={6}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                />
              </div>

              {/* Sección 5 */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Conclusiones Finales</label>
                <textarea
                  value={reportConclusiones}
                  onChange={(e) => setReportConclusiones(e.target.value)}
                  placeholder="Plan de trabajo derivado, conclusiones de cara a la próxima semana..."
                  rows={4}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: DOCUMENTACIÓN DEL PARTIDO (PLAN DE PARTIDO) */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#CC0E21]" />
                  Documentación del Partido
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Repositorio centralizado del encuentro: convocatorias, planes de partido e informes del rival.</p>
              </div>
              <Button onClick={() => setIsDocModalOpen(true)} className="flex items-center gap-1 text-xs self-start sm:self-auto">
                <Plus className="h-3.5 w-3.5" />
                Añadir Documento
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2 bg-slate-900/5">
                <BookOpen className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-sm">No hay documentos cargados para esta jornada todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(doc => (
                  <div key={doc.id} className="p-5 bg-slate-950/20 border border-slate-850 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-slate-850 border border-slate-800 text-slate-400">
                          {doc.tipo_documento}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-bold">{new Date(doc.fecha).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{doc.nombre_documento}</h4>
                        {doc.comentario && <p className="text-xs text-slate-400 italic mt-1 leading-relaxed">{doc.comentario}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                      <Button
                        onClick={() => window.open(doc.url_storage, '_blank', 'noopener,noreferrer')}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        <Download className="h-3.5 w-3.5 text-[#CC0E21]" />
                        Ver / Descargar
                      </Button>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* 1. Modal Importar ABP */}
      <Modal isOpen={isImportABPModalOpen} onClose={() => setIsImportABPModalOpen(false)} title="Importar ABP de Biblioteca">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Seleccionar Jugada ABP</label>
            <select value={selectedMasterABPId} onChange={(e) => setSelectedMasterABPId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="" className="bg-slate-900 text-slate-100">-- Seleccionar jugada --</option>
              {masterABPs.map(abp => (
                <option key={abp.id} value={abp.id} className="bg-slate-900 text-slate-100">
                  [{abp.tipo}] {abp.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" onClick={() => setIsImportABPModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleImportABP} className="text-xs" disabled={!selectedMasterABPId}>
              Clonar Jugada al Partido
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal Crear ABP Exclusiva */}
      <Modal isOpen={isCreatingABP} onClose={() => setIsCreatingABP(false)} title="Nueva ABP Exclusiva del Partido">
        <form onSubmit={handleCreateMatchABP} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Tipo de ABP</label>
              <select value={newABPTipo} onChange={(e) => setNewABPTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                <option value="Córner ofensivo" className="bg-slate-900 text-slate-100">Córner ofensivo</option>
                <option value="Córner defensivo" className="bg-slate-900 text-slate-100">Córner defensivo</option>
                <option value="Falta frontal ofensiva" className="bg-slate-900 text-slate-100">Falta frontal ofensiva</option>
                <option value="Falta frontal defensiva" className="bg-slate-900 text-slate-100">Falta frontal defensiva</option>
                <option value="Falta lateral ofensiva" className="bg-slate-900 text-slate-100">Falta lateral ofensiva</option>
                <option value="Falta lateral defensiva" className="bg-slate-900 text-slate-100">Falta lateral defensiva</option>
                <option value="Penalti ofensivo" className="bg-slate-900 text-slate-100">Penalti ofensivo</option>
                <option value="Penalti defensivo" className="bg-slate-900 text-slate-100">Penalti defensivo</option>
                <option value="Jugada especial ofensiva" className="bg-slate-900 text-slate-100">Jugada especial ofensiva</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Título de la Jugada</label>
              <input required value={newABPTitle} onChange={(e) => setNewABPTitle(e.target.value)} placeholder="Ej: Bloqueo primer palo..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Descripción / Instrucciones</label>
            <textarea value={newABPDesc} onChange={(e) => setNewABPDesc(e.target.value)} placeholder="Pasos, bloqueos, movimientos de arrastre..." rows={3} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none" />
          </div>
          <div className="space-y-2 border-t border-slate-800/60 pt-3">
            <label className="text-xs font-bold text-slate-350 block">Vídeo de la ABP</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={newABPOrigin} onChange={(e) => setNewABPOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
                <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
              </select>
              {newABPOrigin === 'Enlace' ? (
                <input value={newABPUrl} onChange={(e) => setNewABPUrl(e.target.value)} placeholder="URL del vídeo" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
              ) : (
                <input type="file" accept="video/*" onChange={(e) => setAbpFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreatingABP(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploadingABP} className="text-xs">
              {isUploadingABP ? 'Subiendo...' : 'Crear ABP'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal Añadir Clip de Vídeo */}
      <Modal isOpen={isClipModalOpen} onClose={() => setIsClipModalOpen(false)} title="Añadir Corte de Vídeo Táctico">
        <form onSubmit={handleSaveClip} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Categoría</label>
              <select value={clipCategory} onChange={(e) => setClipCategory(e.target.value as 'OFENSIVO' | 'DEFENSIVO')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                <option value="OFENSIVO" className="bg-slate-900 text-slate-100">Ofensivo</option>
                <option value="DEFENSIVO" className="bg-slate-900 text-slate-100">Defensivo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Subcategoría</label>
              <input required value={clipSubcategory} onChange={(e) => setClipSubcategory(e.target.value)} placeholder="Ej: Transición Ofensiva, Bloque Bajo..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Título de la Jugada</label>
            <input required value={clipTitle} onChange={(e) => setClipTitle(e.target.value)} placeholder="Ej: Robo y contra rápida con extremo..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={clipOrigin} onChange={(e) => setClipOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
              <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
            </select>
            {clipOrigin === 'Enlace' ? (
              <input value={clipUrl} onChange={(e) => setClipUrl(e.target.value)} placeholder="URL del vídeo" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            ) : (
              <input type="file" accept="video/*" onChange={(e) => setClipFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Comentario Técnico</label>
            <textarea value={clipComment} onChange={(e) => setClipComment(e.target.value)} placeholder="Observaciones técnicas para el equipo..." rows={3} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsClipModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingClip} className="text-xs">
              {isSavingClip ? 'Guardando...' : 'Añadir Corte'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal Acciones Estratégicas */}
      <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} title={`Aspecto a ${actionType === 'VIGILAR' ? 'Vigilar' : 'Recalcar'}`}>
        <form onSubmit={handleSaveAction} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Aspecto / Concepto</label>
            <input required value={actionAspect} onChange={(e) => setActionAspect(e.target.value)} placeholder="Ej: Vigilancias ofensivas de los centrales..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Descripción Detallada</label>
            <textarea value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} placeholder="Detalla el comportamiento táctico observado..." rows={3} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={actionOrigin} onChange={(e) => setActionOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
              <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
            </select>
            {actionOrigin === 'Enlace' ? (
              <input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="URL del vídeo" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            ) : (
              <input type="file" accept="video/*" onChange={(e) => setActionFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsActionModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingAction} className="text-xs">
              {isSavingAction ? 'Guardando...' : 'Añadir'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal Staff Custom Videos */}
      <Modal isOpen={isCustomVideoModalOpen} onClose={() => setIsCustomVideoModalOpen(false)} title="Vídeo del Staff por Grupo de Trabajo">
        <form onSubmit={handleSaveCustomVideo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Grupo de Trabajo</label>
              <select value={customLabel} onChange={(e) => setCustomLabel(e.target.value as 'Delanteros' | 'Centrales' | 'Pivotes' | 'Individual' | 'Otros')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                <option value="Delanteros" className="bg-slate-900 text-slate-100">Delanteros</option>
                <option value="Centrales" className="bg-slate-900 text-slate-100">Centrales</option>
                <option value="Pivotes" className="bg-slate-900 text-slate-100">Pivotes</option>
                <option value="Individual" className="bg-slate-900 text-slate-100">Análisis Individual</option>
                <option value="Otros" className="bg-slate-900 text-slate-100">Otros</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Título del Vídeo</label>
              <input required value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Ej: Movimientos de ruptura delanteros..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={customOrigin} onChange={(e) => setCustomOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
              <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
            </select>
            {customOrigin === 'Enlace' ? (
              <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="URL del vídeo" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            ) : (
              <input type="file" accept="video/*" onChange={(e) => setCustomFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCustomVideoModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingCustomVideo} className="text-xs">
              {isSavingCustomVideo ? 'Guardando...' : 'Subir Vídeo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal Documentos */}
      <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title="Añadir Documento del Partido">
        <form onSubmit={handleSaveDoc} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Tipo de Documento</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                <option value="Convocatoria PDF" className="bg-slate-900 text-slate-100">Convocatoria PDF</option>
                <option value="Informe previo rival" className="bg-slate-900 text-slate-100">Informe previo rival</option>
                <option value="Plan de partido" className="bg-slate-900 text-slate-100">Plan de partido</option>
                <option value="Informe postpartido" className="bg-slate-900 text-slate-100">Informe postpartido</option>
                <option value="Estadísticas externas" className="bg-slate-900 text-slate-100">Estadísticas externas</option>
                <option value="Presentación del staff" className="bg-slate-900 text-slate-100">Presentación del staff</option>
                <option value="Otros documentos" className="bg-slate-900 text-slate-100">Otros documentos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Nombre del Documento</label>
              <input required value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ej: Plan Partido Jornada 1..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={docOrigin} onChange={(e) => setDocOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
              <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
            </select>
            {docOrigin === 'Enlace' ? (
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="URL de descarga/enlace nuble" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            ) : (
              <input type="file" accept="application/pdf,image/*,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Comentario Opcional</label>
            <textarea value={docComment} onChange={(e) => setDocComment(e.target.value)} placeholder="Comentarios o notas breves..." rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsDocModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingDoc} className="text-xs">
              {isSavingDoc ? 'Guardando...' : 'Guardar Documento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reusable Video Player Modal */}
      <VideoPlayerModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        title={activeVideoTitle}
        videoUrl={activeVideoUrl}
        tipoOrigen={activeVideoType}
      />
    </div>
  );
}
