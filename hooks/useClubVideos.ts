import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';
import { useClubDetails } from '@/hooks/useClubDetails';

export interface ClubVideo {
  id: string;
  club_id: string;
  club_season_id: string | null;
  scouting_match_id: string | null;
  club_player_id: string | null;
  titulo: string;
  descripcion: string | null;
  url: string;
  tipo_origen: 'Enlace' | 'Archivo';
  tipo: 'Partido completo' | 'Corte' | null;
  categoria: 'Salida de balón' | 'Presión' | 'Ataque organizado' | 'Defensa organizada' | 'Transición ofensiva' | 'Transición defensiva' | 'ABP' | 'Finalización' | 'Jugadores' | null;
  etiquetas: string[];
  fecha: string | null;
  created_at: string;
}

export function useClubVideos(clubId: string | undefined, seasonId: string | undefined) {
  const [videos, setVideos] = useState<ClubVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadVideos = useCallback(async () => {
    if (!clubId && !seasonId) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('club_videos').select('*');
      
      if (seasonId) {
        // En prioridad traemos los de la temporada, o los globales del club
        query = query.or(`club_season_id.eq.${seasonId},club_season_id.is.null`).eq('club_id', clubId);
      } else if (clubId) {
        query = query.eq('club_id', clubId);
      }
      
      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;
      setVideos(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar vídeos');
    } finally {
      setLoading(false);
    }
  }, [clubId, seasonId]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const saveVideo = async (data: Partial<ClubVideo>): Promise<boolean> => {
    try {
      if (!clubId) throw new Error('No club ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      const isNew = !data.id;
      const payload = { 
        ...data, 
        club_id: clubId,
        club_season_id: data.club_season_id || seasonId || null 
      };
      
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_videos',
        payload: payload,
        conflict_columns: isNew ? null : '{id}',
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadVideos();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar vídeo');
      return false;
    }
  };

  const deleteVideo = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'club_videos',
        record_id: id,
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      setVideos(prev => prev.filter(v => v.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar vídeo');
      return false;
    }
  };

  return { videos, loading, error, refetch: loadVideos, saveVideo, deleteVideo };
}
