'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';
import {
  Player, Match, MatchPlayerStats,
  MatchFullVideo, MatchVideoClip, MatchStrategicAction, MatchCustomVideo, MatchDocument,
  TacticalLineup, GameModelAnalysis, MatchABPPlan, GPSSession, GPSData
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MatchHeader } from './MatchHeader';
import { MatchTabs } from './MatchTabs';
import { AnalisisPropioTab } from './AnalisisPropioTab';
import { useClubLogos } from '@/hooks/useClubLogos';
import { TacticalField, PositionNode } from '@/components/tactica/TacticalField';
import { ABPPlanField } from '@/components/tactica/ABPPlanField';
import { normalizeRoleName } from '@/lib/abpUtils';
import { useTacticalAI } from '@/hooks/useTacticalAI';
import { DriveResumableUploader } from '@/lib/drive-resumable';
import { DriveUploadContext } from '@/lib/drive-folders';
import { uploadToStorage } from '@/lib/storage';
import {
  Trophy, MapPin, Users, Shield, Film,
  BookOpen, Plus, FolderOpen, Save, Trash2, FileText, ClipboardList,
  Eye, Download, Upload, AlertCircle, Brain, TrendingUp, Lightbulb,
  AlertTriangle, Activity, CheckCircle2, User, Calendar, RefreshCw,
  Sparkles, PlayCircle, Target, Clock, Paperclip, Link2, ExternalLink, Loader2,
  BarChart3, Zap, Award, Gauge
} from 'lucide-react';

interface LineupAnalysisResult {
  fortalezas: string[];
  riesgos: string[];
  encajeModelo: string[];
  clavesDefensa: string[];
  clavesMedio: string[];
  clavesAtaque: string[];
  alertas: string[];
  recomendaciones: string[];
}

interface CentroPartidoClientProps {
  matchId: string;
}

const MAIN_TABS = [
  { id: 'analisis', label: 'Análisis', icon: FileText },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'plan', label: 'Plan', icon: BookOpen },
  { id: 'abp', label: 'ABP', icon: Shield },
  { id: 'partido', label: 'Partido', icon: ClipboardList },
  { id: 'analisis_propio', label: 'Análisis Propio', icon: Sparkles }
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
  const { getLogo } = useClubLogos();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('analisis');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  // Official Match ABP Plans (from /abp module)
  const [officialAbpPlans, setOfficialAbpPlans] = useState<MatchABPPlan[]>([]);
  const [abpTabFilter, setAbpTabFilter] = useState<'FAVOR' | 'CONTRA'>('FAVOR');
  const [abpModuleTabFilter, setAbpModuleTabFilter] = useState<'TODOS' | 'FAVOR' | 'CONTRA'>('TODOS');
  const [selectedOfficialPlanId, setSelectedOfficialPlanId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // GPS Session & Data states
  const [gpsSession, setGpsSession] = useState<GPSSession | null>(null);
  const [gpsData, setGpsData] = useState<(GPSData & { player?: Player })[]>([]);

  const openAnalysisDocModal = (type: string, origin: 'Archivo' | 'Enlace') => {
    setDocType(type);
    setDocOrigin(origin);
    setDocName('');
    setDocUrl('');
    setDocComment('');
    setDocFile(null);
    setIsDocModalOpen(true);
  };

  // --- IA TÁCTICA REAL (ANÁLISIS DEL ONCE Y SISTEMA) ---
  const { analyzeMatchLineup } = useTacticalAI();
  const [lineupAnalysis, setLineupAnalysis] = useState<LineupAnalysisResult | null>(null);
  const [isAnalyzingLineup, setIsAnalyzingLineup] = useState(false);
  const [lineupAnalysisError, setLineupAnalysisError] = useState<string | null>(null);

  const handleRunLineupAnalysis = async () => {
    setLineupAnalysisError(null);
    setIsAnalyzingLineup(true);
    try {
      const assignedNodes = nodesPropio.filter(n => n.player_id);
      if (assignedNodes.length === 0) {
        throw new Error('Coloca al menos un jugador en la pizarra para iniciar el análisis táctico.');
      }

      const assignedPlayerIds = assignedNodes.map(n => n.player_id as string);
      const systemNodes = nodesPropio.map(n => {
        const p = players.find(x => x.id === n.player_id);
        return `${n.label}: ${p ? `${p.nombre} ${p.apellidos} (${p.demarcacion})` : 'Sin asignar'}`;
      });

      const rivalSystem = tacticalLineup?.sistema_rival || '1-4-4-2';
      const ownSystem = tacticalLineup?.sistema_propio || tacticalLineup?.nombre_sistema || '1-4-2-3-1';

      const res = await analyzeMatchLineup({
        systemOwn: ownSystem,
        systemRival: rivalSystem,
        matchId,
        matchRival: match?.rival || null,
        assignedPlayerIds,
        systemNodes
      });

      if (!res || !res.content) {
        throw new Error('No se recibió respuesta del proveedor de IA.');
      }

      let rawJson = res.content.trim();
      if (rawJson.startsWith('```json')) rawJson = rawJson.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (rawJson.startsWith('```')) rawJson = rawJson.replace(/^```/, '').replace(/```$/, '').trim();

      const parsed = JSON.parse(rawJson);
      const sanitizeStr = (t: unknown): string => {
        if (typeof t !== 'string') return '';
        return t
          .replace(/^svg[A-Za-z0-9_]*:?\s*/i, '')
          .replace(/\bsvg[A-Za-z0-9_]+\b/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      };
      const sanitizeArr = (arr: unknown): string[] => {
        if (!Array.isArray(arr)) {
          if (typeof arr === 'string') return [sanitizeStr(arr)].filter(Boolean);
          return [];
        }
        return arr.map(sanitizeStr).filter(Boolean);
      };

      const cleaned: LineupAnalysisResult = {
        fortalezas: sanitizeArr(parsed.fortalezas),
        riesgos: sanitizeArr(parsed.riesgos),
        encajeModelo: sanitizeArr(parsed.encajeModelo),
        clavesDefensa: sanitizeArr(parsed.clavesDefensa || parsed.clavesPorLineas?.defensa),
        clavesMedio: sanitizeArr(parsed.clavesMedio || parsed.clavesPorLineas?.medio),
        clavesAtaque: sanitizeArr(parsed.clavesAtaque || parsed.clavesPorLineas?.ataque),
        alertas: sanitizeArr(parsed.alertas || parsed.alertasReales),
        recomendaciones: sanitizeArr(parsed.recomendaciones)
      };

      setLineupAnalysis(cleaned);
    } catch (err: unknown) {
      console.error('Error al analizar once con IA:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setLineupAnalysisError(msg || 'Error al conectar con la IA.');
    } finally {
      setIsAnalyzingLineup(false);
    }
  };

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



      // 4b. Official Match ABP Plans (vincular automáticamente desde el módulo ABP en 2 pasos)
      const { data: plansData, error: plansErr } = await supabase
        .from('match_abp_plans')
        .select('*, abp_play:abp_plays(*)')
        .eq('match_id', matchId)
        .order('orden', { ascending: true });

      if (plansErr) {
        console.error('Error fetching match_abp_plans:', plansErr);
      }

      if (plansData && plansData.length > 0) {
        const { data: rolesData, error: rolesErr } = await supabase
          .from('match_abp_player_assignments')
          .select('*, role:abp_player_roles(*)')
          .in('match_abp_plan_id', plansData.map(p => p.id));

        if (rolesErr) {
          console.error('Error fetching match_abp_player_assignments:', rolesErr);
        }

        const normalizedPlans: MatchABPPlan[] = plansData.map(plan => {
          const planAssignments = (rolesData || [])
            .filter(r => r.match_abp_plan_id === plan.id)
            .map(r => {
              const assignedPlayer = (playersData || []).find(p => p.id === r.player_id);
              return {
                ...r,
                player: assignedPlayer,
                role: r.role ? {
                  ...r.role,
                  rol_asignado: normalizeRoleName(r.role.rol_asignado)
                } : undefined
              };
            });

          return {
            ...plan,
            assignments: planAssignments
          };
        });

        setOfficialAbpPlans(normalizedPlans);
      } else {
        setOfficialAbpPlans([]);
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

      // 11. GPS Session & Data
      const { data: gpsSessionRows, error: gpsSessionErr } = await supabase
        .from('gps_sessions')
        .select('*')
        .eq('match_id', matchId)
        .limit(1);

      if (!gpsSessionErr && gpsSessionRows && gpsSessionRows.length > 0) {
        const session = gpsSessionRows[0];
        setGpsSession(session);

        const { data: gpsDataRows, error: gpsDataErr } = await supabase
          .from('gps_data')
          .select('*')
          .eq('session_id', session.id);

        if (!gpsDataErr && gpsDataRows) {
          const playersList = playersData || [];
          const mapped = gpsDataRows.map((d: GPSData) => ({
            ...d,
            player: playersList.find(p => p.id === d.player_id)
          }));
          setGpsData(mapped);
        } else {
          setGpsData([]);
        }
      } else {
        setGpsSession(null);
        setGpsData([]);
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

  // Visor play helper
  const handlePlayVideo = (title: string, url: string, origin: 'Enlace' | 'Archivo') => {
    setActiveVideoTitle(title);
    setActiveVideoUrl(url);
    setActiveVideoType(origin);
    setIsVideoModalOpen(true);
  };

  // Helper function to upload files preferring Google Drive (Resumable Chunks) with Supabase Storage fallback
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    setUploadProgress(0);
    setUploadStatusText('Iniciando subida...');

    // 1. Intentar subir mediante Google Drive Resumable Uploader (chunks de 4 MiB para archivos de cualquier tamaño)
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      let subCat = 'Documentos';
      if (folder === 'full-videos') subCat = 'Videos_Completos';
      else if (folder === 'video-clips') subCat = 'Cortes';
      else if (folder === 'strategic-actions') subCat = 'Acciones_Estrategicas';
      else if (folder === 'custom-videos') subCat = 'Videos_Staff';
      else if (folder === 'match-abp') subCat = 'ABP';
      else if (folder === 'documents') subCat = 'Documentos';

      const entityName = match 
        ? `${match.fecha || 'SF'}_J${match.jornada ? String(match.jornada).padStart(2, '0') : '00'}_${match.rival || 'Rival'}`
        : `Partido_${matchId}`;

      const uploadContext: DriveUploadContext = {
        season: '2026-27',
        module: 'PARTIDOS',
        entityName,
        subCategory: subCat
      };

      const uploader = new DriveResumableUploader({
        file,
        passkey,
        uploadContext,
        onProgress: (info) => {
          setUploadProgress(info.percent);
          const speed = info.speedMBps > 0 ? ` (${info.speedMBps.toFixed(1)} MB/s)` : '';
          setUploadStatusText(`Subiendo: ${info.percent}%${speed}`);
        }
      });

      const info = await uploader.start();
      let finalUrl = info.videoUrl || (info.driveFileId ? `https://drive.google.com/file/d/${info.driveFileId}/view` : '');

      if (!info.driveFileId && info.status === 'fallido') {
        throw new Error(info.errorMessage || 'Error en subida a Google Drive.');
      }

      if (!finalUrl && info.driveFileId) {
        finalUrl = `https://drive.google.com/file/d/${info.driveFileId}/view`;
      }

      if (finalUrl) {
        setUploadProgress(100);
        return finalUrl;
      }
    } catch (driveErr) {
      console.warn('[uploadFile] Fallo o aviso en Google Drive, iniciando fallback a Supabase Storage:', driveErr);
      setUploadStatusText('Guardando en almacenamiento de respaldo...');
    }

    // 2. Fallback a Supabase Storage con bucket indautxu-assets
    try {
      const storagePath = `matches/${folder}`;
      const publicUrl = await uploadToStorage(storagePath, file);
      setUploadProgress(100);
      return publicUrl;
    } catch (supabaseErr) {
      console.error('[uploadFile] Fallo en Supabase Storage fallback:', supabaseErr);
      throw new Error(`Error al subir el archivo: ${supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr)}`);
    }
  };

  // --- SAVE ACTIONS ---

  // Tab 1: General Info Save
  const handleSaveGeneralInfo = async () => {
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // Fetch fila actual para evitar violación NOT NULL al hacer upsert parcial
      // Mismo patrón que useUpdatePlayer.ts y usePlayerInjuries.ts
      const { data: currentMatch, error: fetchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (fetchErr) throw fetchErr;

      const { created_at, ...mergeableMatch } = currentMatch as Record<string, unknown>;
      void created_at; // excluido intencionalmente

      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: {
            ...mergeableMatch,
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
      const msg = err instanceof Error
        ? err.message
        : (err as Record<string, unknown>)?.message as string ?? JSON.stringify(err);
      alert(`Error al guardar: ${msg}`);
    }
  };

  // Official ABP Player Assignment Handlers
  const handleAssignOfficialABPPlayer = async (planId: string, roleId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('match_abp_player_assignments')
        .update({ player_id: playerId })
        .match({ match_abp_plan_id: planId, abp_player_role_id: roleId });

      if (error) throw error;

      setOfficialAbpPlans(prev => prev.map(plan => {
        if (plan.id === planId) {
          const updatedAssignments = (plan.assignments || []).map(asg => {
            if (asg.abp_player_role_id === roleId) {
              const assignedPlayer = players.find(p => p.id === playerId);
              return { ...asg, player_id: playerId, player: assignedPlayer };
            }
            return asg;
          });
          return { ...plan, assignments: updatedAssignments };
        }
        return plan;
      }));
    } catch (e: unknown) {
      alert('Error al asignar jugador: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRemoveOfficialABPPlayer = async (planId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('match_abp_player_assignments')
        .update({ player_id: null })
        .match({ match_abp_plan_id: planId, abp_player_role_id: roleId });

      if (error) throw error;

      setOfficialAbpPlans(prev => prev.map(plan => {
        if (plan.id === planId) {
          const updatedAssignments = (plan.assignments || []).map(asg => {
            if (asg.abp_player_role_id === roleId) {
              return { ...asg, player_id: null, player: undefined };
            }
            return asg;
          });
          return { ...plan, assignments: updatedAssignments };
        }
        return plan;
      }));
    } catch (e: unknown) {
      alert('Error al quitar jugador: ' + (e instanceof Error ? e.message : String(e)));
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

      // Fetch fila actual para evitar violación NOT NULL al hacer upsert parcial
      // Mismo patrón que useUpdatePlayer.ts y usePlayerInjuries.ts
      const { data: currentMatch, error: fetchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (fetchErr) throw fetchErr;

      const { created_at, ...mergeableMatch } = currentMatch as Record<string, unknown>;
      void created_at; // excluido intencionalmente

      const { error } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: {
            ...mergeableMatch,
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
      const msg = err instanceof Error
        ? err.message
        : (err as Record<string, unknown>)?.message as string ?? JSON.stringify(err);
      alert(`Error al guardar: ${msg}`);
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
        onBack={() => router.push(match.tipo_partido === 'AMISTOSO' ? '/amistosos' : '/liga')} 
        getLogo={getLogo}
      />

      {/* Selector de Pestañas */}
      <MatchTabs
        tabs={MAIN_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Contents */}
      <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6 min-h-[500px]">
        {/* TAB ANÁLISIS PROPIO */}
        {activeTab === 'analisis_propio' && <AnalisisPropioTab match={match} />}

        {/* TAB 1: EQUIPO (CONVOCATORIA Y ESTADÍSTICAS) */}
        {activeTab === 'equipo' && (() => {
          // Categorizar jugadores
          const titularPlayers = nodesPropio
            .filter((n) => n.player_id)
            .map((node) => {
              const player = players.find((p) => p.id === node.player_id);
              return player ? { ...player, role: node.label, node } : null;
            })
            .filter(Boolean) as (Player & { role: string; node: PositionNode })[];

          const suplentePlayers = matchStats
            .filter((stat) => !nodesPropio.some((node) => node.player_id === stat.player_id))
            .map((stat) => {
              const player = players.find((p) => p.id === stat.player_id);
              return player ? { ...player, stat } : null;
            })
            .filter(Boolean) as (Player & { stat: MatchPlayerStats })[];

          const noConvocados = players.filter(
            (player) => !matchStats.some((stat) => stat.player_id === player.id)
          );

          const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) : null;
          const selectedNode = selectedPlayerId ? nodesPropio.find((n) => n.player_id === selectedPlayerId) : null;

          // Generador de mockups de IA por jugador basado en su demarcación natural
          const getMockIAIndividual = (p: Player, node: PositionNode | undefined | null) => {
            let category = 'Delantero';
            if (['Portero'].includes(p.demarcacion)) category = 'Portero';
            else if (['Defensa', 'Lateral', 'Central'].includes(p.demarcacion)) category = 'Defensa';
            else if (['Centrocampista', 'Pivote', 'Interior', 'MCD', 'MC', 'MCO'].includes(p.demarcacion)) category = 'Centrocampista';

            const isOutOfPosition = node && 
              ((category === 'Portero' && node.label !== 'POR') ||
               (category === 'Defensa' && !['DFC', 'LD', 'LI', 'CAD', 'CAI'].includes(node.label)) ||
               (category === 'Centrocampista' && !['MC', 'MCD', 'MCO', 'Pivote', 'Interior'].includes(node.label)) ||
               (category === 'Delantero' && !['DC', 'ED', 'EI', 'SP', 'Extremo'].includes(node.label)));

            const encaje = isOutOfPosition ? 65 : 95;
            const encajeLabel = isOutOfPosition ? 'Ajustado (Fuera de rol natural)' : 'Óptimo (Rol ideal)';

            switch (category) {
              case 'Portero':
                return {
                  encaje,
                  encajeLabel,
                  fortalezas: [
                    'Excelente colocación bajo palos y reflejos rápidos.',
                    'Seguridad y solvencia en salidas y blocaje aéreo.',
                    'Liderazgo y comunicación constante con la defensa.'
                  ],
                  mejoras: [
                    'Juego de pies bajo presión intensa de la delantera rival.',
                    'Velocidad de reacción en salidas en el borde del área.'
                  ],
                  riesgos: [
                    p.estado === 'Duda' ? 'Alerta física: Molestias menores que reducen golpeos en largo.' : 'Ninguno crítico detectado para esta jornada.'
                  ],
                  recomendaciones: [
                    'Priorizar juego en corto con los centrales en salida organizada.',
                    'Mantener una distancia prudencial en repliegues.'
                  ]
                };
              case 'Defensa':
                return {
                  encaje,
                  encajeLabel,
                  fortalezas: [
                    'Fuerte capacidad de anticipación y recuperación en duelos individuales.',
                    'Excelente cobertura al lateral y juego aéreo contundente.',
                    'Gran disciplina táctica y solidez en el repliegue.'
                  ],
                  mejoras: [
                    'Precisión en envíos largos bajo presión de espaldas.',
                    'Velocidad en basculaciones defensivas laterales.'
                  ],
                  riesgos: [
                    p.estado === 'Duda' ? 'Riesgo de fatiga prematura y lentitud en giros.' : 'Vulnerabilidad ante delantera rival veloz con desmarques al espacio.'
                  ],
                  recomendaciones: [
                    'Coordinar la altura de la línea de fuera de juego.',
                    'Evitar saltar a la presión sin la cobertura del pivote defensivo.'
                  ]
                };
              case 'Centrocampista':
                return {
                  encaje,
                  encajeLabel,
                  fortalezas: [
                    'Gran visión de juego y precisión en distribución en corto.',
                    'Excelente control orientado para superar la primera línea de presión.',
                    'Compromiso táctico alto para equilibrar fases ofensivas y defensivas.'
                  ],
                  mejoras: [
                    'Velocidad en la transición defensiva tras pérdida en campo rival.',
                    'Efectividad en duelos terrestres divididos.'
                  ],
                  riesgos: [
                    p.estado === 'Duda' ? 'Molestias musculares: Riesgo de pérdida de metros en el segundo tiempo.' : 'Pérdidas de balón en zonas de transición bajo presión rival.'
                  ],
                  recomendaciones: [
                    'Temporizar el juego cuando el rival suba la intensidad de presión.',
                    'Buscar pases progresivos y directos con el mediapunta/extremos.'
                  ]
                };
              case 'Delantero':
              default:
                return {
                  encaje,
                  encajeLabel,
                  fortalezas: [
                    'Gran capacidad de finalización en el área y remate de primera.',
                    'Velocidad punta para explotar el espacio libre en contragolpes.',
                    'Capacidad de desborde y regate uno contra uno en banda.'
                  ],
                  mejoras: [
                    'Coordinación en la presión alta tras pérdida en campo rival.',
                    'Definición y juego con el perfil no hábil.'
                  ],
                  riesgos: [
                    p.estado === 'Duda' ? 'Alerta física: Posible reducción de velocidad explosiva.' : 'Pérdida de balones aéreos contra centrales de gran envergadura.'
                  ],
                  recomendaciones: [
                    'Fijar a la pareja de centrales rivales para liberar al mediapunta.',
                    'Atacar el primer palo con agresividad en centros laterales.'
                  ]
                };
            }
          };

          const mockIA = selectedPlayer ? getMockIAIndividual(selectedPlayer, selectedNode) : null;

          return (
            <div className="space-y-8">
              {/* Contenedor Superior: Detalles + Grid Principal */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA Y CENTRAL: Detalles + Pizarra + Convocatoria (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Detalles del Encuentro */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Campo / Instalación</label>
                        {isEditingInfo ? (
                          <input value={matchCampo} onChange={(e) => setMatchCampo(e.target.value)} placeholder="Ej: Iparralde, Fadura..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">{matchCampo || 'No asignado'}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Hora del Partido</label>
                        {isEditingInfo ? (
                          <input value={matchHora} onChange={(e) => setMatchHora(e.target.value)} placeholder="Ej: 12:00, 17:30..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">{matchHora || 'No asignada'}</span>
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

                  {/* Pizarra Táctica */}
                  {nodesPropio.length > 0 && (
                    <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 w-full mb-4">
                        <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                          <Shield className="h-4.5 w-4.5 text-[#CC0E21]" />
                          Disposición Táctica / Pizarra del Partido
                        </h3>
                        <Badge className="bg-[#CC0E21]/15 text-[#CC0E21] border-[#CC0E21]/30">
                          {tacticalLineup?.nombre_pizarra || tacticalLineup?.nombre_sistema || '1-4-2-3-1'}
                        </Badge>
                      </div>
                      <div className="w-full max-w-[550px] flex justify-center bg-slate-950/20 p-4 rounded-xl border border-slate-900/50">
                        <TacticalField
                          team="propio"
                          nodes={nodesPropio}
                          players={players}
                          isEditMode={false}
                          onNodesChange={() => {}}
                          onNodeClick={(node) => {
                            if (node.player_id) {
                              setSelectedPlayerId(node.player_id);
                            }
                          }}
                          selectedPlayerId={selectedPlayerId}
                        />
                      </div>
                    </div>
                  )}

                  {/* Convocatoria y Roster */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm border-b border-slate-800/60 pb-3">
                      <Users className="h-4.5 w-4.5 text-[#CC0E21]" />
                      Panel de Convocatoria ({matchStats.length} Jugadores)
                    </h3>
                    
                    {matchStats.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        No se ha registrado la convocatoria todavía para esta jornada.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* TITULARES */}
                        <div>
                          <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Once Inicial / Titulares ({titularPlayers.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {titularPlayers.map(p => {
                              const isSelected = p.id === selectedPlayerId;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => setSelectedPlayerId(p.id)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                      : 'bg-slate-950/60 border-slate-850 hover:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      isSelected
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                                    }`}>
                                      {p.dorsal}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-slate-200 truncate">{p.nombre} {p.apellidos}</h4>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold">{p.demarcacion}</span>
                                        <span className="text-[9px] text-[#CC0E21] font-black uppercase">({p.role})</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                                      p.estado === 'Disponible' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      p.estado === 'Duda' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                      {p.estado}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* SUPLENTES */}
                        {suplentePlayers.length > 0 && (
                          <div>
                            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-slate-500" />
                              Suplencia / Convocados ({suplentePlayers.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {suplentePlayers.map(p => {
                                const isSelected = p.id === selectedPlayerId;
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => setSelectedPlayerId(p.id)}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                      isSelected
                                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        isSelected
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-slate-900 border border-slate-800 text-slate-200'
                                      }`}>
                                        {p.dorsal}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-slate-350 truncate">{p.nombre} {p.apellidos}</h4>
                                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{p.demarcacion}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                                        p.estado === 'Disponible' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        p.estado === 'Duda' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                      }`}>
                                        {p.estado}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* NO CONVOCADOS / BAJAS */}
                        {noConvocados.length > 0 && (
                          <div>
                            <h4 className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-red-500/60" />
                              Resto de Plantilla ({noConvocados.length})
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {noConvocados.map(p => {
                                const isSelected = p.id === selectedPlayerId;
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => setSelectedPlayerId(p.id)}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 text-center ${
                                      isSelected
                                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                        : 'bg-slate-950/20 border-slate-850 hover:border-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 font-mono">#{p.dorsal}</span>
                                      <span className={`h-1.5 w-1.5 rounded-full ${
                                        p.estado === 'Disponible' ? 'bg-emerald-500' :
                                        p.estado === 'Duda' ? 'bg-amber-500' :
                                        'bg-red-500'
                                      }`} />
                                    </div>
                                    <h4 className="text-[10px] font-semibold text-slate-450 truncate leading-tight">{p.nombre}</h4>
                                    <span className="text-[8px] text-slate-500 leading-none">{p.estado === 'Baja temporal' ? 'Baja' : p.estado}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: IA Táctica e IA Individual (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Panel IA Táctica Real */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                          <Brain className="h-4.5 w-4.5 text-[#CC0E21]" />
                          Análisis del Once (IA)
                        </h3>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Doctrina Oficial S.D. Indautxu
                        </span>
                      </div>

                      {isAnalyzingLineup ? (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin text-[#CC0E21]" />
                          Analizando...
                        </span>
                      ) : lineupAnalysis ? (
                        <Button 
                          onClick={handleRunLineupAnalysis} 
                          variant="secondary" 
                          className="text-[11px] h-7 px-2.5 flex items-center gap-1.5 border border-slate-750 hover:border-red-500/40"
                        >
                          <RefreshCw className="h-3 w-3 text-slate-400" />
                          Actualizar
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleRunLineupAnalysis} 
                          className="text-[11px] h-7 px-3 bg-[#CC0E21] hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40"
                        >
                          <Sparkles className="h-3 w-3" />
                          Analizar Once
                        </Button>
                      )}
                    </div>

                    {lineupAnalysisError && (
                      <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-[11px] text-red-300 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-200">Error en el análisis</p>
                          <p className="text-red-300/90 mt-0.5">{lineupAnalysisError}</p>
                        </div>
                      </div>
                    )}

                    {!lineupAnalysis && !isAnalyzingLineup && (
                      <div className="p-5 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30 text-center space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-[#CC0E21]">
                          <Brain className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Análisis Táctico del Once</h4>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                            Evalúa el encaje del sistema ({tacticalLineup?.sistema_propio || tacticalLineup?.nombre_sistema || '1-4-2-3-1'}) y los {nodesPropio.filter(n => n.player_id).length} jugadores colocados en pizarra frente a {match?.rival || 'el rival'} según el Modelo de Juego Indautxu.
                          </p>
                        </div>
                        <Button 
                          onClick={handleRunLineupAnalysis} 
                          className="text-xs px-4 py-2 bg-[#CC0E21] hover:bg-red-700 text-white font-bold inline-flex items-center gap-1.5 shadow-lg shadow-red-950/50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Ejecutar Análisis con IA
                        </Button>
                      </div>
                    )}

                    {isAnalyzingLineup && (
                      <div className="p-8 border border-slate-800 rounded-xl bg-slate-950/40 text-center space-y-3 animate-pulse">
                        <Loader2 className="h-8 w-8 animate-spin text-[#CC0E21] mx-auto" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Razonando con la Doctrina Indautxu...</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Evaluando alineación, demarcaciones naturales, transiciones y vigilancias contra {match?.rival || 'el rival'}.
                          </p>
                        </div>
                      </div>
                    )}

                    {lineupAnalysis && !isAnalyzingLineup && (
                      <div className="space-y-4">
                        {/* 1. Fortalezas del Once */}
                        {lineupAnalysis.fortalezas && lineupAnalysis.fortalezas.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">🟢</span>
                              <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                Fortalezas del Once
                              </h4>
                            </div>
                            <ul className="text-xs text-slate-350 space-y-1 pl-4 list-disc">
                              {lineupAnalysis.fortalezas.map((f, idx) => (
                                <li key={idx} className="leading-relaxed">{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 2. Riesgos Tácticos */}
                        {lineupAnalysis.riesgos && lineupAnalysis.riesgos.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">🟡</span>
                              <h4 className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                Riesgos Tácticos
                              </h4>
                            </div>
                            <ul className="text-xs text-slate-350 space-y-1 pl-4 list-disc">
                              {lineupAnalysis.riesgos.map((r, idx) => (
                                <li key={idx} className="leading-relaxed">{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 3. Encaje con Nuestro Modelo */}
                        {lineupAnalysis.encajeModelo && lineupAnalysis.encajeModelo.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">🔴</span>
                              <h4 className="text-[10px] text-[#CC0E21] font-bold uppercase tracking-wider">
                                Encaje con Nuestro Modelo
                              </h4>
                            </div>
                            <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc bg-red-500/5 border border-red-500/15 p-3 rounded-xl">
                              {lineupAnalysis.encajeModelo.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 4. Claves por Líneas */}
                        {((lineupAnalysis.clavesDefensa && lineupAnalysis.clavesDefensa.length > 0) ||
                          (lineupAnalysis.clavesMedio && lineupAnalysis.clavesMedio.length > 0) ||
                          (lineupAnalysis.clavesAtaque && lineupAnalysis.clavesAtaque.length > 0)) && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">🎯</span>
                              <h4 className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                                Claves por Líneas
                              </h4>
                            </div>
                            <div className="space-y-2.5 bg-slate-950/50 border border-slate-850 p-3 rounded-xl text-xs">
                              {lineupAnalysis.clavesDefensa && lineupAnalysis.clavesDefensa.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">🧤 Portería y Defensa:</span>
                                  <ul className="text-slate-300 text-[11px] space-y-1 pl-4 list-disc">
                                    {lineupAnalysis.clavesDefensa.map((cd, idx) => (
                                      <li key={idx} className="leading-relaxed">{cd}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {lineupAnalysis.clavesMedio && lineupAnalysis.clavesMedio.length > 0 && (
                                <div className="border-t border-slate-850 pt-2">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">⚙️ Medio Campo:</span>
                                  <ul className="text-slate-300 text-[11px] space-y-1 pl-4 list-disc">
                                    {lineupAnalysis.clavesMedio.map((cm, idx) => (
                                      <li key={idx} className="leading-relaxed">{cm}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {lineupAnalysis.clavesAtaque && lineupAnalysis.clavesAtaque.length > 0 && (
                                <div className="border-t border-slate-850 pt-2">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">⚡ Ataque y Presión:</span>
                                  <ul className="text-slate-300 text-[11px] space-y-1 pl-4 list-disc">
                                    {lineupAnalysis.clavesAtaque.map((ca, idx) => (
                                      <li key={idx} className="leading-relaxed">{ca}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. Alertas de Roster */}
                        {lineupAnalysis.alertas && lineupAnalysis.alertas.length > 0 && (
                          <div className="space-y-1.5 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">⚠️</span>
                              <h4 className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                                Alertas de Roster
                              </h4>
                            </div>
                            <ul className="text-[11px] text-slate-300 space-y-1 pl-4 list-disc">
                              {lineupAnalysis.alertas.map((a, idx) => (
                                <li key={idx} className="leading-relaxed">{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 6. Recomendaciones */}
                        {lineupAnalysis.recomendaciones && lineupAnalysis.recomendaciones.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs select-none" aria-hidden="true">💡</span>
                              <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                                Recomendaciones para el Partido
                              </h4>
                            </div>
                            <ul className="text-xs text-slate-350 space-y-1 pl-4 list-disc">
                              {lineupAnalysis.recomendaciones.map((rec, idx) => (
                                <li key={idx} className="leading-relaxed">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel IA Individual */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl min-h-[300px] flex flex-col">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm border-b border-slate-800/60 pb-3 mb-4">
                      <User className="h-4.5 w-4.5 text-[#CC0E21]" />
                      Informe Individual (IA)
                    </h3>

                    {mockIA && selectedPlayer ? (
                      <div className="space-y-4 flex-1">
                        {/* Cabecera Jugador */}
                        <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                          <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-200 font-mono">
                            {selectedPlayer.dorsal}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-200 truncate">{selectedPlayer.nombre} {selectedPlayer.apellidos}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold">{selectedPlayer.demarcacion}</span>
                              {selectedNode && (
                                <span className="text-[10px] text-[#CC0E21] font-black uppercase">Rol: {selectedNode.label}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Encaje en el rol */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1 font-bold">
                            <span className="text-slate-400">Encaje del Jugador en el Sistema</span>
                            <span className={mockIA.encaje > 80 ? 'text-emerald-400' : 'text-amber-400'}>{mockIA.encaje}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${mockIA.encaje > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${mockIA.encaje}%` }} />
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold mt-1 block">{mockIA.encajeLabel}</span>
                        </div>

                        {/* Puntos Fuertes */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Puntos Fuertes
                          </h5>
                          <ul className="text-[11px] text-slate-350 space-y-1 pl-4 list-disc">
                            {mockIA.fortalezas.map((f, idx) => <li key={idx}>{f}</li>)}
                          </ul>
                        </div>

                        {/* Aspectos a Mejorar */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Puntos de Mejora
                          </h5>
                          <ul className="text-[11px] text-slate-350 space-y-1 pl-4 list-disc">
                            {mockIA.mejoras.map((m, idx) => <li key={idx}>{m}</li>)}
                          </ul>
                        </div>

                        {/* Riesgos */}
                        <div className="space-y-1.5 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">
                          <h5 className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Factores de Riesgo
                          </h5>
                          <ul className="text-[10px] text-slate-400 space-y-1 pl-3 list-disc">
                            {mockIA.riesgos.map((r, idx) => <li key={idx}>{r}</li>)}
                          </ul>
                        </div>

                        {/* Recomendación Individual */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" /> Recomendaciones IA
                          </h5>
                          <ul className="text-[11px] text-slate-350 space-y-1 pl-4 list-disc">
                            {mockIA.recomendaciones.map((rec, idx) => <li key={idx}>{rec}</li>)}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                        <Brain className="h-10 w-10 text-slate-700 mb-2.5 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-300">Mesa de Análisis de Jugador</h4>
                        <p className="text-[11px] text-slate-500 leading-normal max-w-[200px] mt-1.5">
                          Selecciona a cualquier jugador desde la pizarra táctica o la convocatoria para visualizar su informe individual en tiempo real.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

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
                            <tr key={stat.id} className="hover:bg-slate-900/20 text-slate-350">
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
          );
        })()}

        {/* TAB 2: ABP DEL PARTIDO (OFICIAL DESDE MATCH_ABP_PLANS) */}
        {activeTab === 'abp' && (() => {
          const favorPlans = officialAbpPlans.filter(p => !p.abp_play?.tipo?.toLowerCase().includes('defensiv'));
          const contraPlans = officialAbpPlans.filter(p => p.abp_play?.tipo?.toLowerCase().includes('defensiv'));

          const displayedPlans = abpModuleTabFilter === 'FAVOR'
            ? favorPlans
            : abpModuleTabFilter === 'CONTRA'
            ? contraPlans
            : officialAbpPlans;

          const selectedPlan = officialAbpPlans.find(p => p.id === selectedOfficialPlanId) || displayedPlans[0] || officialAbpPlans[0] || null;

          // Prepare roles for ABPPlanField
          const planRoles = (selectedPlan?.assignments || []).map(asg => {
            const originalRole = asg.role || {
              id: asg.abp_player_role_id,
              abp_play_id: selectedPlan?.abp_play_id || '',
              player_id: asg.player_id || null,
              rol_asignado: 'Rol',
              etiqueta: '',
              comentario: '',
              orden: 1,
              posicion_x: 50,
              posicion_y: 50,
              created_at: ''
            };
            return {
              ...originalRole,
              player_id: asg.player_id || (originalRole as { player_id?: string | null }).player_id || null,
              rol_asignado: normalizeRoleName(originalRole.rol_asignado),
              assignment: asg,
              assignedPlayer: asg.player || players.find(p => p.id === asg.player_id)
            };
          });

          const lineupPlayerIds = nodesPropio
            .filter(n => n.player_id)
            .map(n => n.player_id as string);

          return (
            <div className="space-y-6">
              {/* CABECERA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#CC0E21]" />
                    Acciones a Balón Parado (ABP del Partido)
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Centro de preparación estratégica. Jugadas ensayadas y asignación de responsabilidades planificadas para este encuentro.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link href="/abp" className="inline-flex">
                    <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Planificador ABP
                    </Button>
                  </Link>
                </div>
              </div>

              {officialAbpPlans.length === 0 ? (
                <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-3 bg-slate-900/5">
                  <Shield className="h-10 w-10 text-slate-700 mx-auto" />
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-sm font-bold text-slate-400">No se han asociado jugadas ABP a este partido todavía</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Planifica y asigna jugadas maestras para esta jornada desde el módulo oficial de Estrategia ABP.
                    </p>
                  </div>
                  <Link href="/abp" className="inline-block mt-2">
                    <Button variant="primary" className="text-xs">Ir al Planificador ABP</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* COLUMNA IZQUIERDA: MESA DE TRABAJO Y LISTADO DE ABP (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                        <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                          Jugadas del Partido
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-bold">
                          {officialAbpPlans.length}
                        </span>
                      </div>

                      {/* Selector de Filtro */}
                      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setAbpModuleTabFilter('TODOS')}
                          className={`flex-1 py-1 rounded-md font-bold transition-all text-center ${
                            abpModuleTabFilter === 'TODOS'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Todos ({officialAbpPlans.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbpModuleTabFilter('FAVOR')}
                          className={`flex-1 py-1 rounded-md font-bold transition-all text-center ${
                            abpModuleTabFilter === 'FAVOR'
                              ? 'bg-[#CC0E21] text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          A Favor ({favorPlans.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbpModuleTabFilter('CONTRA')}
                          className={`flex-1 py-1 rounded-md font-bold transition-all text-center ${
                            abpModuleTabFilter === 'CONTRA'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          En Contra ({contraPlans.length})
                        </button>
                      </div>

                      {/* Lista de Jugadas */}
                      <div className="space-y-2 pt-1">
                        {displayedPlans.map((plan, idx) => {
                          const isSelected = selectedPlan?.id === plan.id;
                          const play = plan.abp_play;
                          const isDef = play?.tipo?.toLowerCase().includes('defensiv');
                          const assignedCount = (plan.assignments || []).filter(a => a.player_id).length;
                          const totalRoles = (plan.assignments || []).length;

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setSelectedOfficialPlanId(plan.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                                isSelected
                                  ? isDef
                                    ? 'bg-blue-950/20 border-blue-800 text-blue-300 shadow-sm'
                                    : 'bg-red-950/20 border-red-800 text-red-300 shadow-sm'
                                  : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                  isDef
                                    ? 'bg-blue-950/60 border-blue-800/80 text-blue-400'
                                    : 'bg-red-950/60 border-red-900/80 text-red-400'
                                }`}>
                                  {play?.tipo || 'ABP'}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500">
                                  #{idx + 1}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-200 truncate">
                                {play?.titulo || 'Jugada sin título'}
                              </h4>
                              {plan.observaciones && (
                                <p className="text-[10px] text-slate-400 italic truncate">
                                  {plan.observaciones}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                                <span>{totalRoles > 0 ? `${assignedCount}/${totalRoles} roles asignados` : 'Sin roles'}</span>
                                {(plan.video_asociado || play?.video_url) && (
                                  <Film className="h-3 w-3 text-slate-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  {/* COLUMNA DERECHA: PIZARRA TÁCTICA OFICIAL Y ASIGNACIONES (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {selectedPlan ? (
                      <div className="space-y-6">
                        
                        {/* PANEL PRINCIPAL: DETALLES DE JUGADA */}
                        <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                selectedPlan.abp_play?.tipo?.toLowerCase().includes('defensiv')
                                  ? 'bg-blue-950 border-blue-800 text-blue-400'
                                  : 'bg-red-950 border-red-900 text-red-400'
                              }`}>
                                {selectedPlan.abp_play?.tipo || 'ABP'}
                              </span>
                              {selectedPlan.abp_play?.zona && (
                                <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-medium">
                                  Zona: {selectedPlan.abp_play.zona}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-slate-200 mt-1">
                              {selectedPlan.abp_play?.titulo || 'Jugada sin título'}
                            </h3>
                            {selectedPlan.abp_play?.descripcion && (
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {selectedPlan.abp_play.descripcion}
                              </p>
                            )}
                            {selectedPlan.observaciones && (
                              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850 text-xs text-slate-400 mt-2">
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-0.5">
                                  Observaciones del Encuentro
                                </span>
                                {selectedPlan.observaciones}
                              </div>
                            )}
                          </div>

                          {(selectedPlan.video_asociado || selectedPlan.abp_play?.video_url) && (
                            <Button
                              onClick={() =>
                                handlePlayVideo(
                                  selectedPlan.abp_play?.titulo || 'Vídeo ABP',
                                  (selectedPlan.video_asociado || selectedPlan.abp_play?.video_url)!,
                                  'Enlace'
                                )
                              }
                              className="flex items-center gap-1.5 text-xs py-1.5 px-3 self-start hover:bg-[#a80b1a] shrink-0"
                            >
                              <Film className="h-3.5 w-3.5" />
                              Ver vídeo ABP
                            </Button>
                          )}
                        </div>

                        {/* PIZARRA TÁCTICA OFICIAL REUTILIZANDO ABPPlanField */}
                        <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest border-b border-slate-850 pb-2.5 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-[#CC0E21]" />
                            Pizarra Táctica y Reparto de Roles
                          </h4>

                          <ABPPlanField
                            planId={selectedPlan.id}
                            tipo={selectedPlan.abp_play?.tipo || ''}
                            zona={selectedPlan.abp_play?.zona || null}
                            roles={planRoles}
                            players={players}
                            lineupPlayerIds={lineupPlayerIds}
                            onAssignPlayer={(roleId, playerId) =>
                              handleAssignOfficialABPPlayer(selectedPlan.id, roleId, playerId)
                            }
                            onRemovePlayer={(roleId) =>
                              handleRemoveOfficialABPPlayer(selectedPlan.id, roleId)
                            }
                          />
                        </div>

                      </div>
                    ) : (
                      <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-3 bg-slate-900/5 h-full flex flex-col items-center justify-center select-none">
                        <Shield className="h-10 w-10 text-slate-700 mx-auto" />
                        <div className="max-w-md mx-auto space-y-1">
                          <p className="text-sm font-bold text-slate-400">Ninguna jugada seleccionada</p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Selecciona una jugada de la columna izquierda para visualizar su pizarra táctica y responsabilidades.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 5: PARTIDO */}
        {activeTab === 'partido' && (() => {
          const isPlayed = match?.jugado;
          const gf = match?.goles_favor ?? 0;
          const gc = match?.goles_contra ?? 0;
          const rival = match?.rival || 'Rival';
          const matchState = isPlayed ? 'Finalizado' : 'Programado';
          const stateColor = isPlayed 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

          return (
            <div className="space-y-6">
              {/* AREA 1: INFORMACIÓN DEL PARTIDO (Cabecera de Metadatos) */}
              <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-[#CC0E21]">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Operaciones del Día de Partido</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {matchCampo || 'Campo no especificado'}
                      </span>
                      <span className="text-slate-650">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {matchHora || 'Hora no definida'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado:</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold border ${stateColor}`}>{matchState}</span>
                </div>
              </div>

              {/* GRID PRINCIPAL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA: LÍNEA TEMPORAL DE EVENTOS (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                        Línea Temporal de Eventos
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-wider">
                        DIE LIGEN · Pendiente conexión
                      </span>
                    </div>

                    <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-xl">
                      <Activity className="h-8 w-8 text-slate-700 mx-auto" />
                      <div className="max-w-md mx-auto space-y-1">
                        <h5 className="text-xs font-bold text-slate-300">Registro de Eventos en Tiempo Real</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Espacio reservado para la sincronización automática de goles, tarjetas, sustituciones e incidencias cronológicas a través de Die Ligen.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: MARCADOR Y ESTADÍSTICAS (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* AREA 2: MARCADOR Y RESULTADO */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                        Resultado Final
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-wider">
                        DIE LIGEN · Pendiente conexión
                      </span>
                    </div>
                    
                    <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-xl text-center">
                      {/* Marcador real de Supabase */}
                      <div className="flex items-center justify-center gap-6">
                        <div>
                          <span className="text-xs font-black text-slate-400 block uppercase">Indautxu</span>
                          <span className="text-3xl font-black text-slate-100">{isPlayed ? gf : '-'}</span>
                        </div>
                        <span className="text-slate-650 text-lg font-bold">vs</span>
                        <div>
                          <span className="text-xs font-black text-slate-400 block uppercase truncate w-24">{rival}</span>
                          <span className="text-3xl font-black text-slate-100">{isPlayed ? gc : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AREA 3: ESTADÍSTICAS */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                        Estadísticas del Encuentro
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-wider">
                        DIE LIGEN · Pendiente conexión
                      </span>
                    </div>

                    <div className="p-6 text-center text-slate-500 space-y-2 bg-slate-950/20 border border-dashed border-slate-850/80 rounded-xl">
                      <BarChart3 className="h-7 w-7 text-slate-700 mx-auto" />
                      <div className="max-w-sm mx-auto space-y-1">
                        <p className="text-xs font-bold text-slate-300">Estadísticas Oficiales del Partido</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Métricas de juego reservadas para la conexión e importación de datos desde Die Ligen.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* AREA 4: RENDIMIENTO FÍSICO GPS (12 cols) */}
                <div className="lg:col-span-12">
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#CC0E21]" />
                        <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                          Rendimiento Físico GPS
                        </h4>
                        {gpsSession?.descripcion && (
                          <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
                            • {gpsSession.descripcion}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        gpsData.length > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {gpsData.length > 0 ? 'GPS · Datos del Partido' : 'GPS · Sin datos'}
                      </span>
                    </div>

                    {(() => {
                      const getMetersPerMin = (dist: number | null | undefined, mins: number | null | undefined) => {
                        if (!mins || mins <= 0 || !dist || dist <= 0) return 0;
                        return Math.round(dist / mins);
                      };

                      if (gpsData.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-950/20 border border-dashed border-slate-850/80 rounded-xl">
                            <Activity className="h-8 w-8 text-slate-700 mx-auto" />
                            <div className="max-w-md mx-auto space-y-1">
                              <h5 className="text-xs font-bold text-slate-300">Sin datos GPS asociados a este partido</h5>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Puedes importar el archivo de rendimiento físico de este encuentro desde la pestaña{' '}
                                <Link href="/gps" className="text-[#CC0E21] hover:underline font-bold">
                                  GPS
                                </Link>.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Cálculo de los 4 líderes reales del partido
                      const maxDist = Math.max(...gpsData.map(d => d.distancia_total || 0));
                      const maxSpeed = Math.max(...gpsData.map(d => d.velocidad_maxima || 0));
                      const maxSprints = Math.max(...gpsData.map(d => d.num_sprints || 0));
                      const maxIntensity = Math.max(...gpsData.map(d => getMetersPerMin(d.distancia_total, d.minutos)));

                      const topDistRow = gpsData.find(d => (d.distancia_total || 0) === maxDist && maxDist > 0);
                      const topSpeedRow = gpsData.find(d => (d.velocidad_maxima || 0) === maxSpeed && maxSpeed > 0);
                      const topSprintsRow = gpsData.find(d => (d.num_sprints || 0) === maxSprints && maxSprints > 0);
                      const topIntensityRow = gpsData.find(d => getMetersPerMin(d.distancia_total, d.minutos) === maxIntensity && maxIntensity > 0);

                      return (
                        <div className="space-y-4">
                          {/* 4 Indicadores / Líderes del Partido */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            
                            {/* 1. Mayor Distancia */}
                            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Mayor Distancia</span>
                                <Award className="h-4 w-4 text-emerald-500" />
                              </div>
                              <div className="mt-2.5">
                                <span className="text-lg font-black text-slate-100">
                                  {maxDist > 0 ? `${(maxDist / 1000).toFixed(2)} km` : '—'}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                                  {topDistRow?.player && (
                                    <Avatar src={topDistRow.player.foto_url} name={topDistRow.player.nombre} size="sm" className="h-5 w-5 text-[9px]" />
                                  )}
                                  <span className="truncate">
                                    {topDistRow?.player ? `${topDistRow.player.nombre} ${topDistRow.player.apellidos}` : topDistRow?.gps_id || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 2. Mayor Intensidad */}
                            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Mayor Intensidad</span>
                                <Gauge className="h-4 w-4 text-cyan-400" />
                              </div>
                              <div className="mt-2.5">
                                <span className="text-lg font-black text-slate-100">
                                  {maxIntensity > 0 ? `${maxIntensity} m/min` : '—'}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                                  {topIntensityRow?.player && (
                                    <Avatar src={topIntensityRow.player.foto_url} name={topIntensityRow.player.nombre} size="sm" className="h-5 w-5 text-[9px]" />
                                  )}
                                  <span className="truncate">
                                    {topIntensityRow?.player ? `${topIntensityRow.player.nombre} ${topIntensityRow.player.apellidos}` : topIntensityRow?.gps_id || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Velocidad Máxima */}
                            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Velocidad Máxima</span>
                                <Zap className="h-4 w-4 text-amber-500" />
                              </div>
                              <div className="mt-2.5">
                                <span className="text-lg font-black text-slate-100">
                                  {maxSpeed > 0 ? `${maxSpeed.toFixed(1)} km/h` : '—'}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                                  {topSpeedRow?.player && (
                                    <Avatar src={topSpeedRow.player.foto_url} name={topSpeedRow.player.nombre} size="sm" className="h-5 w-5 text-[9px]" />
                                  )}
                                  <span className="truncate">
                                    {topSpeedRow?.player ? `${topSpeedRow.player.nombre} ${topSpeedRow.player.apellidos}` : topSpeedRow?.gps_id || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 4. Más Sprints */}
                            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Más Sprints</span>
                                <Activity className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="mt-2.5">
                                <span className="text-lg font-black text-slate-100">
                                  {maxSprints > 0 ? `${maxSprints}` : '—'}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                                  {topSprintsRow?.player && (
                                    <Avatar src={topSprintsRow.player.foto_url} name={topSprintsRow.player.nombre} size="sm" className="h-5 w-5 text-[9px]" />
                                  )}
                                  <span className="truncate">
                                    {topSprintsRow?.player ? `${topSprintsRow.player.nombre} ${topSprintsRow.player.apellidos}` : topSprintsRow?.gps_id || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Resumen Compacto por Jugador */}
                          <div className="border border-slate-850 bg-slate-950/40 rounded-xl overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-slate-950/80 border-b border-slate-850 text-slate-400 font-bold uppercase select-none">
                                  <th className="px-3 py-2.5">Jugador</th>
                                  <th className="px-2.5 py-2.5 text-center">Min</th>
                                  <th className="px-2.5 py-2.5 text-right">Distancia (m)</th>
                                  <th className="px-2.5 py-2.5 text-right">m/min</th>
                                  <th className="px-2.5 py-2.5 text-right">Vel. Máx (km/h)</th>
                                  <th className="px-2.5 py-2.5 text-center">Sprints</th>
                                  <th className="px-2.5 py-2.5 text-right">Sprint / HSR (m)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                                {gpsData.map((row) => {
                                  const mPerMin = getMetersPerMin(row.distancia_total, row.minutos);
                                  return (
                                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="px-3 py-2 font-semibold text-slate-200">
                                        {row.player ? (
                                          <div className="flex items-center gap-2">
                                            <Avatar src={row.player.foto_url} name={row.player.nombre} size="sm" className="h-5 w-5 text-[8px]" />
                                            <span className="truncate">{row.player.nombre} {row.player.apellidos}</span>
                                            <span className="text-[9px] text-slate-500 font-bold">#{row.player.dorsal}</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">{row.gps_id}</span>
                                        )}
                                      </td>
                                      <td className="px-2.5 py-2 text-center text-slate-400">{row.minutos}&apos;</td>
                                      <td className="px-2.5 py-2 text-right font-medium text-slate-200">
                                        {row.distancia_total ? `${row.distancia_total.toLocaleString('es-ES')} m` : '—'}
                                      </td>
                                      <td className="px-2.5 py-2 text-right font-semibold text-[#CC0E21]">
                                        {mPerMin > 0 ? mPerMin : '—'}
                                      </td>
                                      <td className="px-2.5 py-2 text-right text-slate-200">
                                        {row.velocidad_maxima ? `${row.velocidad_maxima.toFixed(1)}` : '—'}
                                      </td>
                                      <td className="px-2.5 py-2 text-center text-slate-200">
                                        {row.num_sprints ?? '—'}
                                      </td>
                                      <td className="px-2.5 py-2 text-right text-slate-300">
                                        {row.sprint_distance
                                          ? `${row.sprint_distance.toLocaleString('es-ES')} m`
                                          : row.hsr
                                          ? `${row.hsr.toLocaleString('es-ES')} m`
                                          : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>
            </div>
          );
        })()}

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
        {activeTab === 'analisis' && (() => {
          const hasSomeAnalysis = reportResumen || reportPositivos || reportMejorar || reportClaves || reportConclusiones;
          const hasAllAnalysis = reportResumen && reportPositivos && reportMejorar && reportClaves && reportConclusiones;
          const statusLabel = hasAllAnalysis ? 'Completado' : hasSomeAnalysis ? 'En progreso' : 'Pendiente';
          const statusColor = hasAllAnalysis 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : hasSomeAnalysis 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
            : 'bg-slate-800 text-slate-400 border-slate-700/50';

          return (
            <div className="space-y-6">
              {/* AREA 1: RESUMEN DEL PARTIDO (Cabecera Horizontal) */}
              <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-[#CC0E21]">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Preparación del Encuentro vs {match?.rival || 'Rival'}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" /> 
                        {match?.fecha ? new Date(match.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                      </span>
                      <span className="text-slate-650">•</span>
                      <span className="font-semibold text-slate-300">
                        {match?.tipo_partido === 'AMISTOSO' ? 'Partido Amistoso' : `Jornada ${match?.jornada || ''}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado:</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${statusColor}`}>{statusLabel}</span>
                  </div>
                  <Button onClick={handleSaveReport} disabled={isSavingReport} className="flex items-center gap-1.5 text-xs">
                    <Save className="h-3.5 w-3.5" />
                    {isSavingReport ? 'Guardando...' : 'Guardar Informe'}
                  </Button>
                </div>
              </div>

              {/* GRID PRINCIPAL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* AREA 3: OBSERVACIONES DEL CUERPO TÉCNICO (7 columnas de 12) */}
                <div className="lg:col-span-7 space-y-6">
                  {(() => {
                    const renderSectionAttachments = (tipoDoc: string) => {
                      const sectionDocs = documents.filter(d => d.tipo_documento === tipoDoc);

                      return (
                        <div className="mt-2 pt-2 border-t border-slate-850/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAnalysisDocModal(tipoDoc, 'Archivo')}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Paperclip className="h-3 w-3 text-[#CC0E21]" />
                                Adjuntar archivo
                              </button>
                              <button
                                type="button"
                                onClick={() => openAnalysisDocModal(tipoDoc, 'Enlace')}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Link2 className="h-3 w-3 text-blue-400" />
                                Añadir enlace
                              </button>
                            </div>
                            {sectionDocs.length > 0 && (
                              <span className="text-[9px] font-bold text-slate-500">
                                {sectionDocs.length} {sectionDocs.length === 1 ? 'adjunto' : 'adjuntos'}
                              </span>
                            )}
                          </div>

                          {sectionDocs.length > 0 && (
                            <div className="space-y-1.5 pt-0.5">
                              {sectionDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  className="p-2 bg-slate-950/60 border border-slate-850/80 rounded-lg flex items-center justify-between gap-3 text-xs hover:border-slate-800 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {doc.tipo_origen === 'Enlace' ? (
                                      <Link2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                    ) : (
                                      <Paperclip className="h-3.5 w-3.5 text-[#CC0E21] shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-200 truncate">{doc.nombre_documento}</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                                          {doc.tipo_origen}
                                        </span>
                                      </div>
                                      {doc.comentario && (
                                        <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{doc.comentario}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => window.open(doc.url_storage, '_blank', 'noopener,noreferrer')}
                                      className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded transition-colors"
                                      title="Abrir / Ver"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(doc.id)}
                                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-red-900/30 rounded transition-colors"
                                      title="Eliminar adjunto"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-5">
                        <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest border-b border-slate-850 pb-2.5">
                          Observaciones del Cuerpo Técnico
                        </h4>
                        <div className="space-y-4">
                          
                          {/* 1. Resumen del Encuentro */}
                          <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Resumen del Encuentro</label>
                            <textarea
                              value={reportResumen}
                              onChange={(e) => setReportResumen(e.target.value)}
                              placeholder="Redacta un resumen general de cómo se desarrolló el encuentro..."
                              rows={4}
                              className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                            />
                            {renderSectionAttachments('analisis_resumen')}
                          </div>

                          {/* 2 y 3. Puntos Fuertes y Áreas de Mejora */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl flex flex-col justify-between">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Puntos Fuertes Propios</label>
                                <textarea
                                  value={reportPositivos}
                                  onChange={(e) => setReportPositivos(e.target.value)}
                                  placeholder="Fortalezas del equipo en el encuentro..."
                                  rows={4}
                                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                                />
                              </div>
                              {renderSectionAttachments('analisis_puntos_fuertes')}
                            </div>
                            <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl flex flex-col justify-between">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Áreas de Mejora Propias</label>
                                <textarea
                                  value={reportMejorar}
                                  onChange={(e) => setReportMejorar(e.target.value)}
                                  placeholder="Desajustes y errores a corregir..."
                                  rows={4}
                                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                                />
                              </div>
                              {renderSectionAttachments('analisis_areas_mejora')}
                            </div>
                          </div>

                          {/* 4. Claves Tácticas del Encuentro */}
                          <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Claves Tácticas del Encuentro</label>
                            <textarea
                              value={reportClaves}
                              onChange={(e) => setReportClaves(e.target.value)}
                              placeholder="Aspectos tácticos determinantes del partido..."
                              rows={3}
                              className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                            />
                            {renderSectionAttachments('analisis_claves_tacticas')}
                          </div>

                          {/* 5. Notas del Entrenador / Plan de Trabajo */}
                          <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Notas del Entrenador / Plan de Trabajo</label>
                            <textarea
                              value={reportConclusiones}
                              onChange={(e) => setReportConclusiones(e.target.value)}
                              placeholder="Directrices de cara a los próximos entrenamientos..."
                              rows={3}
                              className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60 resize-y"
                            />
                            {renderSectionAttachments('analisis_plan_trabajo')}
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* COLUMNA DERECHA: ANÁLISIS TÁCTICO REAL DE LA PIZARRA (5 columnas de 12) */}
                <div className="lg:col-span-5 space-y-6">
                  {(() => {
                    let parsedModeloJuego: GameModelAnalysis | null = null;
                    if (tacticalLineup?.analisis_modelo_juego) {
                      if (typeof tacticalLineup.analisis_modelo_juego === 'object') {
                        parsedModeloJuego = tacticalLineup.analisis_modelo_juego as GameModelAnalysis;
                      } else if (typeof tacticalLineup.analisis_modelo_juego === 'string') {
                        try {
                          parsedModeloJuego = JSON.parse(tacticalLineup.analisis_modelo_juego) as GameModelAnalysis;
                        } catch {
                          parsedModeloJuego = null;
                        }
                      }
                    }

                    // Datos del Comparador Táctico / Pizarra
                    const ownSystem = tacticalLineup?.sistema_propio || tacticalLineup?.nombre_sistema || null;
                    const rivalSystem = tacticalLineup?.sistema_rival || null;
                    const boardName = tacticalLineup?.nombre_pizarra || null;
                    const ventajas = tacticalLineup?.ventajas || null;
                    const desventajas = tacticalLineup?.desventajas || null;
                    const zonaConflicto = tacticalLineup?.zona_conflicto || null;
                    const dueloClave = tacticalLineup?.duelo_clave || null;
                    const tareasLineas = tacticalLineup?.orientaciones_individuales || parsedModeloJuego?.tareas_roles_modelo || null;

                    // Datos de Nuestro Plan de Juego (Modelo Indautxu)
                    const planAtaque = parsedModeloJuego?.planAtaque || parsedModeloJuego?.ataque_posicional || null;
                    const planDefensivo = parsedModeloJuego?.planDefensivo || parsedModeloJuego?.defensa_posicional || null;
                    const riesgosAsumidos = parsedModeloJuego?.riesgosAsumidos || parsedModeloJuego?.riesgos_asumidos || null;
                    const ajustesMister = parsedModeloJuego?.ajustesMister || parsedModeloJuego?.ajustes_especificos || (parsedModeloJuego ? null : tacticalLineup?.notas) || null;

                    const transicionAtaqueDefensa = parsedModeloJuego?.transicionAtaqueDefensa || parsedModeloJuego?.transicion_perdida || null;
                    const transicionDefensaAtaque = parsedModeloJuego?.transicionDefensaAtaque || parsedModeloJuego?.transicion_recuperacion || null;
                    const principiosAplicados = parsedModeloJuego?.principiosIndautxuAplicados || null;

                    const instruccionesPorPuesto = parsedModeloJuego?.instruccionesPorPuesto || null;
                    const hasInstruccionesPorPuesto = !!(
                      instruccionesPorPuesto &&
                      Object.keys(instruccionesPorPuesto).length > 0 &&
                      Object.values(instruccionesPorPuesto).some(v => typeof v === 'string' && v.trim().length > 0)
                    );

                    // Fallback de notas_entrenador desde los nodos de la pizarra
                    let fallbackPlayerNotes: { label: string; playerName?: string; dorsal?: number; notas: string }[] = [];
                    if (!hasInstruccionesPorPuesto) {
                      let propioNodes: PositionNode[] = [];
                      if (Array.isArray(nodesPropio) && nodesPropio.length > 0) {
                        propioNodes = nodesPropio;
                      } else if (tacticalLineup?.posiciones) {
                        const pos = tacticalLineup.posiciones;
                        if (Array.isArray(pos)) {
                          propioNodes = pos;
                        } else if (pos.propio && Array.isArray(pos.propio)) {
                          propioNodes = pos.propio;
                        }
                      }

                      fallbackPlayerNotes = propioNodes
                        .filter(n => typeof n.notas_entrenador === 'string' && n.notas_entrenador.trim().length > 0)
                        .map(n => {
                          const player = players.find(p => p.id === n.player_id);
                          return {
                            label: n.label || 'Puesto',
                            playerName: player ? `${player.nombre} ${player.apellidos}` : n.customName || undefined,
                            dorsal: player?.dorsal,
                            notas: n.notas_entrenador!.trim()
                          };
                        });
                    }

                    const hasFallbackNotes = fallbackPlayerNotes.length > 0;

                    const hasComparadorData = !!(
                      ownSystem ||
                      rivalSystem ||
                      ventajas ||
                      desventajas ||
                      zonaConflicto ||
                      dueloClave ||
                      tareasLineas
                    );

                    const hasModeloJuegoData = !!(
                      planAtaque ||
                      planDefensivo ||
                      riesgosAsumidos ||
                      ajustesMister ||
                      transicionAtaqueDefensa ||
                      transicionDefensaAtaque ||
                      hasInstruccionesPorPuesto ||
                      hasFallbackNotes
                    );

                    const roleLabels: Record<string, string> = {
                      portero: 'Portero (POR)',
                      centralIzquierdo: 'Central Izquierdo (DFCI)',
                      centralDerecho: 'Central Derecho (DFCD)',
                      lateralIzquierdo: 'Lateral Izquierdo (LI)',
                      lateralDerecho: 'Lateral Derecho (LD)',
                      pivoteDefensivo: 'Pivote Defensivo (MCD)',
                      pivoteOfensivo: 'Pivote Ofensivo / Interior (MC)',
                      mediapunta: 'Mediapunta (MCO)',
                      extremoIzquierdo: 'Extremo Izquierdo (EI)',
                      extremoDerecho: 'Extremo Derecho (ED)',
                      delantero: 'Delantero Centro (DC)'
                    };

                    if (!hasComparadorData && !hasModeloJuegoData) {
                      return (
                        <div className="p-5 bg-slate-900/30 border border-slate-850 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-850/60 pb-3">
                            <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-1.5">
                              <Brain className="h-4.5 w-4.5 text-[#CC0E21]" />
                              Análisis Táctico del Partido
                            </h4>
                            <span className="text-[8px] bg-slate-800 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                              Pizarra
                            </span>
                          </div>
                          <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                            <Brain className="h-9 w-9 text-slate-700 mx-auto" />
                            <div className="space-y-1">
                              <h5 className="text-xs font-bold text-slate-300">No hay análisis táctico guardado en la Pizarra para este encuentro.</h5>
                              <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                                Los análisis estructurales, ventajas, zonas de conflicto y modelo de juego guardados en la Pizarra Táctica aparecerán aquí automáticamente.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* ============================================================ */}
                        {/* BLOQUE 1: ANÁLISIS TÁCTICO DEL PARTIDO (Comparador Pizarra) */}
                        {/* ============================================================ */}
                        {hasComparadorData && (
                          <div className="p-5 bg-slate-900/30 border border-slate-850 rounded-2xl space-y-4 relative overflow-hidden">
                            {/* Cabecera */}
                            <div className="flex items-center justify-between border-b border-slate-850/60 pb-3">
                              <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-1.5">
                                <Brain className="h-4.5 w-4.5 text-[#CC0E21]" />
                                Análisis Táctico del Partido
                              </h4>
                              <span className="text-[8px] bg-[#CC0E21]/15 text-[#CC0E21] border border-[#CC0E21]/30 px-1.5 py-0.5 rounded font-black tracking-widest uppercase truncate max-w-[140px]">
                                {boardName || 'Pizarra Táctica'}
                              </span>
                            </div>

                            <div className="space-y-3.5">
                              {/* Sistemas del Encuentro */}
                              {(ownSystem || rivalSystem) && (
                                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Sistema Propio</span>
                                    <span className="text-xs font-extrabold text-[#CC0E21]">{ownSystem || 'Sin definir'}</span>
                                  </div>
                                  <div className="text-slate-650 font-black text-[10px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800">VS</div>
                                  <div className="text-right">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Sistema Rival</span>
                                    <span className="text-xs font-extrabold text-blue-400">{rivalSystem || 'Sin definir'}</span>
                                  </div>
                                </div>
                              )}

                              {/* Ventajas y Riesgos / Desventajas */}
                              {(ventajas || desventajas) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {ventajas && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-emerald-900/30 space-y-1">
                                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> Ventajas del Sistema
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{ventajas}</p>
                                    </div>
                                  )}
                                  {desventajas && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-red-900/30 space-y-1">
                                      <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Riesgos / Desventajas
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{desventajas}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Zona de Conflicto y Duelo Clave */}
                              {(zonaConflicto || dueloClave) && (
                                <div className="space-y-2.5">
                                  {zonaConflicto && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                      <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Target className="h-3 w-3 text-amber-400" /> Zona de Conflicto Clave
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{zonaConflicto}</p>
                                    </div>
                                  )}
                                  {dueloClave && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Shield className="h-3 w-3 text-blue-400" /> Duelo Táctico Principal
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{dueloClave}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Tareas Colectivas y por Líneas */}
                              {tareasLineas && (
                                <details className="group p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-xs">
                                  <summary className="font-bold text-slate-300 cursor-pointer flex items-center justify-between text-[11px] uppercase tracking-wider select-none">
                                    <span className="flex items-center gap-1.5 text-slate-200">
                                      <Users className="h-3.5 w-3.5 text-[#CC0E21]" /> Tareas Colectivas y por Líneas
                                    </span>
                                    <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                                  </summary>
                                  <div className="mt-2.5 pt-2 border-t border-slate-850/60 text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {tareasLineas}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ============================================================ */}
                        {/* BLOQUE 2: NUESTRO PLAN DE JUEGO (Modelo de Juego Indautxu)  */}
                        {/* ============================================================ */}
                        <div className="p-5 bg-slate-900/30 border border-slate-850 rounded-2xl space-y-4 relative overflow-hidden">
                          {/* Cabecera */}
                          <div className="flex items-center justify-between border-b border-slate-850/60 pb-3">
                            <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-1.5">
                              <Sparkles className="h-4.5 w-4.5 text-[#CC0E21]" />
                              Nuestro Plan de Juego
                            </h4>
                            <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                              Modelo Indautxu
                            </span>
                          </div>

                          {!hasModeloJuegoData ? (
                            /* Estado discreto si no se ha generado modelo de juego */
                            <div className="p-4 bg-slate-950/30 border border-dashed border-slate-850 rounded-xl text-center">
                              <p className="text-[11px] text-slate-500 italic">
                                Este encuentro no tiene guardado todavía el análisis según nuestro Modelo de Juego.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Principios aplicados si existen */}
                              {principiosAplicados && principiosAplicados.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {principiosAplicados.map((p, idx) => (
                                    <span key={idx} className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800 font-medium">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* 1. PLAN DE JUEGO & AJUSTES */}
                              {(planAtaque || planDefensivo || riesgosAsumidos || ajustesMister) && (
                                <div className="space-y-3">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <Target className="h-3 w-3 text-[#CC0E21]" />
                                    1. Plan de Juego & Ajustes
                                  </div>

                                  {planAtaque && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                                        Plan de Ataque y Progresión
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{planAtaque}</p>
                                    </div>
                                  )}

                                  {planDefensivo && (
                                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block">
                                        Plan Defensivo y Presión Alta
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed">{planDefensivo}</p>
                                    </div>
                                  )}

                                  {(riesgosAsumidos || ajustesMister) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {riesgosAsumidos && (
                                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">
                                            Riesgos Asumidos
                                          </span>
                                          <p className="text-xs text-slate-300 leading-relaxed">{riesgosAsumidos}</p>
                                        </div>
                                      )}
                                      {ajustesMister && (
                                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-1">
                                          <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block">
                                            Ajustes Específicos del Míster
                                          </span>
                                          <p className="text-xs text-slate-300 leading-relaxed">{ajustesMister}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 2. TRANSICIONES & FASES */}
                              {(transicionAtaqueDefensa || transicionDefensaAtaque) && (
                                <details className="group p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-xs" open>
                                  <summary className="font-bold text-slate-300 cursor-pointer flex items-center justify-between text-[10px] font-black uppercase tracking-wider select-none">
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <Activity className="h-3 w-3 text-amber-400" />
                                      2. Transiciones & Fases
                                    </span>
                                    <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                                  </summary>
                                  <div className="mt-2.5 pt-2 border-t border-slate-850/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {transicionAtaqueDefensa && (
                                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850/60 space-y-1">
                                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">
                                          Transición Ataque → Defensa (Pérdida)
                                        </span>
                                        <p className="text-[11px] text-slate-300 leading-relaxed">{transicionAtaqueDefensa}</p>
                                      </div>
                                    )}
                                    {transicionDefensaAtaque && (
                                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850/60 space-y-1">
                                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                                          Transición Defensa → Ataque (Recuperación)
                                        </span>
                                        <p className="text-[11px] text-slate-300 leading-relaxed">{transicionDefensaAtaque}</p>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}

                              {/* 3. INSTRUCCIONES POR PUESTO (Prioridad 1: Modelo de Juego / Prioridad 2: Fallback Nodos) */}
                              {(hasInstruccionesPorPuesto || hasFallbackNotes) && (
                                <details className="group p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-xs">
                                  <summary className="font-bold text-slate-300 cursor-pointer flex items-center justify-between text-[10px] font-black uppercase tracking-wider select-none">
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <User className="h-3 w-3 text-[#CC0E21]" />
                                      3. Instrucciones por Puesto
                                      {hasFallbackNotes && !hasInstruccionesPorPuesto && (
                                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-normal lowercase tracking-normal">
                                          (notas pizarra)
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                                  </summary>
                                  <div className="mt-2.5 pt-2 border-t border-slate-850/60 space-y-2">
                                    {/* Prioridad 1: instruccionesPorPuesto del Modelo de Juego */}
                                    {hasInstruccionesPorPuesto &&
                                      Object.entries(instruccionesPorPuesto!).map(([key, val]) => {
                                        if (!val || (typeof val === 'string' && val.trim().length === 0)) return null;
                                        return (
                                          <div key={key} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850/60">
                                            <span className="text-[9px] font-extrabold text-[#CC0E21] uppercase tracking-wider block">
                                              {roleLabels[key] || key}
                                            </span>
                                            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{val}</p>
                                          </div>
                                        );
                                      })}

                                    {/* Prioridad 2: Fallback de notas_entrenador desde los nodos de la pizarra */}
                                    {!hasInstruccionesPorPuesto &&
                                      hasFallbackNotes &&
                                      fallbackPlayerNotes.map((nodeNote, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850/60">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-extrabold text-[#CC0E21] uppercase tracking-wider">
                                              {nodeNote.label}
                                            </span>
                                            {nodeNote.playerName && (
                                              <span className="text-[9px] text-slate-400 font-bold">
                                                {nodeNote.dorsal ? `#${nodeNote.dorsal} ` : ''}{nodeNote.playerName}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{nodeNote.notas}</p>
                                        </div>
                                      ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 4. ABP DEL PARTIDO (Vinculadas desde el Módulo ABP) */}
                        <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-[#CC0E21]" />
                              <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
                                ABP del Partido
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-slate-400 font-bold">
                                {officialAbpPlans.length}
                              </span>
                            </div>

                            {officialAbpPlans.length > 0 && (
                              <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-850 text-[10px]">
                                {(() => {
                                  const favorCount = officialAbpPlans.filter(p => !p.abp_play?.tipo?.toLowerCase().includes('defensiv')).length;
                                  const contraCount = officialAbpPlans.filter(p => p.abp_play?.tipo?.toLowerCase().includes('defensiv')).length;
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setAbpTabFilter('FAVOR')}
                                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                          abpTabFilter === 'FAVOR'
                                            ? 'bg-[#CC0E21] text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        A Favor ({favorCount})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAbpTabFilter('CONTRA')}
                                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                          abpTabFilter === 'CONTRA'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        En Contra ({contraCount})
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {officialAbpPlans.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-3 text-center">
                              Sin jugadas ABP asignadas para este encuentro.
                            </p>
                          ) : (
                            (() => {
                              const filtered = officialAbpPlans.filter(p => {
                                const isDef = p.abp_play?.tipo?.toLowerCase().includes('defensiv');
                                return abpTabFilter === 'CONTRA' ? isDef : !isDef;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <p className="text-xs text-slate-500 italic py-3 text-center">
                                    No hay jugadas {abpTabFilter === 'FAVOR' ? 'a favor' : 'en contra'} asignadas para este partido.
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-2.5">
                                  {filtered.map((plan) => {
                                    const play = plan.abp_play;
                                    const isExpanded = expandedPlanId === plan.id;
                                    const videoTargetUrl = plan.video_asociado || play?.video_url;
                                    const assignments = plan.assignments || [];

                                    return (
                                      <div
                                        key={plan.id}
                                        className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2 hover:border-slate-800 transition-colors"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div
                                            className="min-w-0 flex-1 cursor-pointer select-none"
                                            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                                          >
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                                play?.tipo?.toLowerCase().includes('defensiv')
                                                  ? 'bg-blue-950/40 border-blue-800/60 text-blue-400'
                                                  : 'bg-red-950/40 border-red-900/60 text-red-400'
                                              }`}>
                                                {play?.tipo || 'ABP'}
                                              </span>
                                              <span className="text-xs font-bold text-slate-200">
                                                {play?.titulo || 'Jugada sin título'}
                                              </span>
                                            </div>
                                            {plan.observaciones && (
                                              <p className="text-[11px] text-slate-400 mt-1 italic leading-snug">
                                                {plan.observaciones}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {videoTargetUrl && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handlePlayVideo(
                                                    play?.titulo || 'Vídeo ABP',
                                                    videoTargetUrl,
                                                    'Enlace'
                                                  )
                                                }
                                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-slate-800/80 rounded transition-colors"
                                                title="Ver vídeo de la jugada"
                                              >
                                                <PlayCircle className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                                              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80 rounded transition-colors"
                                              title={isExpanded ? 'Contraer' : 'Expandir detalles'}
                                            >
                                              <span className={`inline-block text-[10px] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                ▼
                                              </span>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Vista expandida: Descripción y Jugadores Asignados */}
                                        {isExpanded && (
                                          <div className="pt-2 border-t border-slate-850/60 space-y-2.5 text-xs">
                                            {play?.descripcion && (
                                              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850/60">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                                  Descripción Táctica
                                                </span>
                                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                                  {play.descripcion}
                                                </p>
                                              </div>
                                            )}

                                            {assignments.length > 0 && (
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                                  Roles y Jugadores Asignados ({assignments.length})
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                                  {assignments.map((asg) => {
                                                    const roleName = asg.role?.rol_asignado || 'Rol';
                                                    const playerName = asg.player?.nombre;
                                                    const dorsal = asg.player?.dorsal;

                                                    return (
                                                      <div
                                                        key={asg.id}
                                                        className="p-1.5 bg-slate-900/40 rounded border border-slate-850/50 flex items-center justify-between text-[10px]"
                                                      >
                                                        <span className="font-semibold text-slate-400 truncate">
                                                          {roleName}
                                                        </span>
                                                        <span className="font-bold text-slate-200 truncate ml-1">
                                                          {playerName ? `${dorsal ? `#${dorsal} ` : ''}${playerName}` : '—'}
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          );
        })()}

        {activeTab === 'plan' && (() => {
          const mainPlan = documents.find(doc => doc.tipo_documento === 'Plan de partido');
          const otherDocs = documents.filter(
            doc => doc.id !== mainPlan?.id && !doc.tipo_documento.startsWith('analisis_') && doc.tipo_documento !== 'Informe Propio PDF'
          );

          return (
            <div className="space-y-6">
              {/* CABECERA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#CC0E21]" />
                    Planificación del Encuentro
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Repositorio de trabajo pre-partido: planes de juego, convocatorias e informes.</p>
                </div>
                <Button
                  onClick={() => {
                    setDocType('Convocatoria PDF');
                    setDocOrigin('Enlace');
                    setDocName('');
                    setDocUrl('');
                    setDocComment('');
                    setDocFile(null);
                    setIsDocModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Añadir Documento
                </Button>
              </div>

              {/* CONTENIDO EN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA: PLAN PRINCIPAL + ADJUNTOS (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* AREA 1: PLAN DE PARTIDO PRINCIPAL */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest border-b border-slate-850 pb-2">
                      Plan de Partido Principal
                    </h4>
                    
                    {mainPlan ? (
                      <div className="p-4 bg-slate-950/60 border border-[#CC0E21]/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bg-[#CC0E21] w-1 h-full" />
                        <div className="space-y-2 pl-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-extrabold uppercase">
                              Vigente
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">Actualizado: {new Date(mainPlan.fecha).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-200">{mainPlan.nombre_documento}</h5>
                            {mainPlan.comentario && <p className="text-xs text-slate-400 italic mt-0.5">{mainPlan.comentario}</p>}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Responsable: Cuerpo Técnico</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start md:self-auto pl-2 md:pl-0">
                          <Button
                            onClick={() => window.open(mainPlan.url_storage, '_blank', 'noopener,noreferrer')}
                            className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-855 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5 text-[#CC0E21]" />
                            Ver / Descargar
                          </Button>
                          <button onClick={() => handleDeleteDoc(mainPlan.id)} className="text-slate-500 hover:text-red-400 p-2 border border-slate-850 bg-slate-900/40 rounded-xl hover:border-red-900/30 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 space-y-3 bg-slate-950/20">
                        <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center mx-auto text-slate-650">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <p className="text-xs font-bold text-slate-405">No se ha cargado el Plan de Partido Principal</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">Sube el documento de planificación para que los jugadores y asistentes conozcan las directrices tácticas del encuentro.</p>
                        </div>
                        <Button onClick={() => { setDocType('Plan de partido'); setIsDocModalOpen(true); }} className="text-xs py-1.5 px-3 bg-[#CC0E21]/10 text-[#CC0E21] border border-[#CC0E21]/20 hover:bg-[#CC0E21]/20">
                          Subir Plan de Partido
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* AREA 2: DOCUMENTACIÓN ADJUNTA */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest border-b border-slate-850 pb-2">
                      Documentación Adjunta y Archivos
                    </h4>
                    
                    {otherDocs.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 space-y-1">
                        <FileText className="h-8 w-8 text-slate-800 mx-auto" />
                        <p className="text-xs font-medium">No hay informes o documentos adicionales subidos.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {otherDocs.map(doc => (
                          <div key={doc.id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl flex flex-col justify-between gap-4.5 hover:border-slate-800 transition-colors">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-slate-850 border border-slate-800 text-[9px] text-slate-400 font-bold px-1.5 py-0.5 rounded">
                                  {doc.tipo_documento}
                                </Badge>
                                <span className="text-[9px] text-slate-500 font-medium">{new Date(doc.fecha).toLocaleDateString('es-ES')}</span>
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{doc.nombre_documento}</h5>
                                {doc.comentario && <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-2 leading-relaxed">{doc.comentario}</p>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-850/60 pt-2.5">
                              <Button
                                onClick={() => window.open(doc.url_storage, '_blank', 'noopener,noreferrer')}
                                className="flex items-center gap-1.5 text-[10px] py-1 px-2.5 bg-slate-900 border border-slate-855 text-slate-350 hover:text-slate-200"
                              >
                                <Download className="h-3 w-3 text-[#CC0E21]" />
                                Descargar
                              </Button>
                              <button onClick={() => handleDeleteDoc(doc.id)} className="text-slate-600 hover:text-red-400 p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMNA DERECHA: ACTA RFEF + ACCIONES RÁPIDAS (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* AREA 3: ACTA OFICIAL RFEF */}
                  <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-[#CC0E21]" />
                        Acta Oficial RFEF
                      </h4>
                      <span className="text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                        Pendiente
                      </span>
                    </div>
                    
                    <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3 text-center">
                      <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center mx-auto text-slate-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-300">Sincronización de Acta Oficial</p>
                        <p className="text-[9px] text-slate-500 leading-relaxed">
                          Permite enlazar directamente el acta oficial RFEF una vez cerrado y subido por el equipo arbitral en su portal.
                        </p>
                      </div>
                      <div className="pt-1.5">
                        <Button disabled className="w-full flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-slate-900 border border-slate-850 text-slate-500 select-none">
                          <RefreshCw className="h-3 w-3 animate-pulse" />
                          Sincronizar con RFEF
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* AREA 4: ACCIONES RÁPIDAS / GUÍA */}
                  <div className="p-5 bg-slate-900/30 border border-slate-850 rounded-2xl space-y-3.5">
                    <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest border-b border-slate-850 pb-2">
                      Gestión Documental
                    </h4>
                    <div className="space-y-2">
                      <Button onClick={() => setIsDocModalOpen(true)} className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-[#CC0E21] hover:bg-[#a80b1a]">
                        <Plus className="h-4 w-4" />
                        Subir Nuevo Documento
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-950/20 border border-slate-850/60 rounded-xl">
                      <span className="text-[9px] text-[#CC0E21] font-extrabold uppercase tracking-wider block mb-1">Tip de Formato</span>
                      <p className="text-[10px] text-slate-450 leading-relaxed">
                        Para optimizar la visualización por parte de los jugadores en la app móvil, te recomendamos subir los planes y convocatorias en formato **PDF** o mediante enlaces públicos.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

      </div>

      {/* --- MODALS --- */}

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
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={
          docType.startsWith('analisis_')
            ? `Adjuntar en ${
                docType === 'analisis_resumen'
                  ? 'Resumen del Encuentro'
                  : docType === 'analisis_puntos_fuertes'
                  ? 'Puntos Fuertes Propios'
                  : docType === 'analisis_areas_mejora'
                  ? 'Áreas de Mejora Propias'
                  : docType === 'analisis_claves_tacticas'
                  ? 'Claves Tácticas'
                  : 'Notas del Entrenador'
              }`
            : 'Añadir Documento del Partido'
        }
      >
        <form onSubmit={handleSaveDoc} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Tipo de Documento</label>
              {docType.startsWith('analisis_') ? (
                <div className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium truncate">
                  {docType === 'analisis_resumen' && 'Análisis — Resumen'}
                  {docType === 'analisis_puntos_fuertes' && 'Análisis — Puntos Fuertes'}
                  {docType === 'analisis_areas_mejora' && 'Análisis — Áreas de Mejora'}
                  {docType === 'analisis_claves_tacticas' && 'Análisis — Claves Tácticas'}
                  {docType === 'analisis_plan_trabajo' && 'Análisis — Plan de Trabajo'}
                </div>
              ) : (
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
                  <option value="Convocatoria PDF" className="bg-slate-900 text-slate-100">Convocatoria PDF</option>
                  <option value="Informe previo rival" className="bg-slate-900 text-slate-100">Informe previo rival</option>
                  <option value="Plan de partido" className="bg-slate-900 text-slate-100">Plan de partido</option>
                  <option value="Informe postpartido" className="bg-slate-900 text-slate-100">Informe postpartido</option>
                  <option value="Estadísticas externas" className="bg-slate-900 text-slate-100">Estadísticas externas</option>
                  <option value="Presentación del staff" className="bg-slate-900 text-slate-100">Presentación del staff</option>
                  <option value="Otros documentos" className="bg-slate-900 text-slate-100">Otros documentos</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-350 block mb-1">Nombre del Documento</label>
              <input required value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ej: Scouting rival, Plan sesión..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={docOrigin} onChange={(e) => setDocOrigin(e.target.value as 'Enlace' | 'Archivo')} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none">
              <option value="Enlace" className="bg-slate-900 text-slate-100">Enlace</option>
              <option value="Archivo" className="bg-slate-900 text-slate-100">Archivo</option>
            </select>
            {docOrigin === 'Enlace' ? (
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="URL de descarga/enlace nube" className="col-span-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-100 text-xs focus:border-[#CC0E21] outline-none" />
            ) : (
              <input type="file" accept="application/pdf,image/*,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="col-span-2 text-xs text-slate-400 bg-slate-950 border border-slate-850 rounded-lg p-1.5" />
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-350 block mb-1">Comentario Opcional</label>
            <textarea value={docComment} onChange={(e) => setDocComment(e.target.value)} placeholder="Comentarios o notas breves..." rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none" />
          </div>
          {isSavingDoc && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-[#CC0E21] animate-pulse" />
                  {uploadStatusText || `Subiendo archivo: ${uploadProgress}%`}
                </span>
                <span className="text-[#CC0E21] font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#CC0E21] to-red-500 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
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
