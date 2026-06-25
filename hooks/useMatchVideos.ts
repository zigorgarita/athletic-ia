import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchVideo } from '@/types';

type NewMatchVideo = Omit<MatchVideo, 'id' | 'created_at'>;

export function useMatchVideos() {
  const [videos, setVideos] = useState<MatchVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('match_videos')
        .select('*')
        .order('fecha_partido', { ascending: false });

      if (supabaseError) throw supabaseError;
      setVideos(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los videos de los partidos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createVideo = useCallback(async (video: NewMatchVideo): Promise<MatchVideo | null> => {
    setCreating(true);
    setError(null);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_videos',
          payload: video,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setVideos((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al registrar el video del partido');
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, creating, error, createVideo, refetch: fetchVideos };
}
