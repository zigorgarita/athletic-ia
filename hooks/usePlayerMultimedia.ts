import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayerMultimediaItem } from '@/types';

export function usePlayerMultimedia(playerId: string | null) {
  const [items, setItems] = useState<PlayerMultimediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMultimedia = useCallback(async () => {
    if (!playerId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Type A videos (Match videos where player is assigned)
      const { data: matchAssigns, error: matchAssignsErr } = await supabase
        .from('match_own_analysis_video_players')
        .select(`
          video_id,
          match_own_analysis_videos (
            id,
            match_id,
            categoria,
            titulo,
            video_url,
            drive_file_id,
            tipo_origen,
            created_at,
            matches (
              id,
              rival,
              fecha,
              jornada,
              es_local,
              tipo_partido
            )
          )
        `)
        .eq('player_id', playerId);

      if (matchAssignsErr) throw matchAssignsErr;

      // 2. Fetch Type B videos (Individual player videos where player is targeted)
      const { data: playerTargets, error: playerTargetsErr } = await supabase
        .from('player_video_targets')
        .select(`
          is_primary,
          player_videos (
            id,
            titulo,
            categoria,
            comentario_tecnico,
            video_url,
            drive_file_id,
            tipo_origen,
            created_at
          )
        `)
        .eq('player_id', playerId);

      if (playerTargetsErr) throw playerTargetsErr;

      const typeAItems: PlayerMultimediaItem[] = (matchAssigns || [])
        .filter(row => row.match_own_analysis_videos)
        .map(row => {
          const vid = row.match_own_analysis_videos as any;
          const match = vid.matches as any;
          return {
            id: vid.id,
            tipo_origen_video: 'PARTIDO' as const,
            titulo: vid.titulo || 'Corte de Partido',
            categoria: vid.categoria || 'ANÁLISIS PROPIO',
            video_url: vid.video_url || null,
            drive_file_id: vid.drive_file_id || null,
            tipo_origen: vid.tipo_origen || 'Enlace',
            created_at: vid.created_at || new Date().toISOString(),
            matchContext: match ? {
              match_id: match.id,
              rival: match.rival || 'Rival',
              fecha: match.fecha || '',
              jornada: match.jornada ? `J${match.jornada}` : 'Partido',
              es_local: match.es_local ?? true,
              tipo_partido: match.tipo_partido || 'Liga'
            } : undefined,
            player_ids: [playerId]
          };
        });

      const typeBItems: PlayerMultimediaItem[] = (playerTargets || [])
        .filter(row => row.player_videos)
        .map(row => {
          const vid = row.player_videos as any;
          return {
            id: vid.id,
            tipo_origen_video: 'INDIVIDUAL' as const,
            titulo: vid.titulo || 'Vídeo Individual',
            categoria: vid.categoria || 'Seguimiento Individual',
            comentario_tecnico: vid.comentario_tecnico || null,
            video_url: vid.video_url || null,
            drive_file_id: vid.drive_file_id || null,
            tipo_origen: vid.tipo_origen || 'Enlace',
            created_at: vid.created_at || new Date().toISOString(),
            player_ids: [playerId],
            is_primary: row.is_primary || false
          };
        });

      // Combine and sort by date descending
      const combined = [...typeAItems, ...typeBItems].sort((a, b) => {
        const dateA = new Date(a.matchContext?.fecha || a.created_at).getTime();
        const dateB = new Date(b.matchContext?.fecha || b.created_at).getTime();
        return dateB - dateA;
      });

      setItems(combined);
    } catch (err: any) {
      console.error('Error fetching player multimedia:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchMultimedia();
  }, [fetchMultimedia]);

  // Remove player assignment from a video (only removes the relational entry)
  const removePlayerAssignment = async (videoId: string, videoType: 'PARTIDO' | 'INDIVIDUAL') => {
    if (!playerId) return false;
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      if (videoType === 'PARTIDO') {
        // Delete from match_own_analysis_video_players
        const { data: rows } = await supabase
          .from('match_own_analysis_video_players')
          .select('id')
          .eq('video_id', videoId)
          .eq('player_id', playerId);

        if (rows && rows.length > 0) {
          for (const row of rows) {
            await supabase.rpc('exec_secure_delete', {
              target_table: 'match_own_analysis_video_players',
              record_id: row.id,
              staff_passkey: passkey
            });
          }
        }
      } else {
        // Delete from player_video_targets
        const { data: rows } = await supabase
          .from('player_video_targets')
          .select('id')
          .eq('video_id', videoId)
          .eq('player_id', playerId);

        if (rows && rows.length > 0) {
          for (const row of rows) {
            await supabase.rpc('exec_secure_delete', {
              target_table: 'player_video_targets',
              record_id: row.id,
              staff_passkey: passkey
            });
          }
        }
      }

      await fetchMultimedia();
      return true;
    } catch (err: any) {
      console.error('Error removing player video assignment:', err);
      return false;
    }
  };

  return {
    items,
    loading,
    error,
    refetch: fetchMultimedia,
    removePlayerAssignment
  };
}
