import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchOwnAnalysisVideo } from '@/types';

type NewOwnAnalysisVideo = Omit<MatchOwnAnalysisVideo, 'id' | 'created_at'>;

export function useMatchOwnAnalysisVideos(matchId?: string) {
  const [videos, setVideos] = useState<MatchOwnAnalysisVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('match_own_analysis_videos')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (supabaseError) throw supabaseError;
      setVideos(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los vídeos de análisis propio');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Alta segura usando exec_secure_upsert
  const addVideo = useCallback(async (video: NewOwnAnalysisVideo): Promise<MatchOwnAnalysisVideo | null> => {
    setCreating(true);
    setError(null);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_own_analysis_videos',
          payload: video,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;

      setVideos((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al añadir vídeo de análisis propio');
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  // Borrado seguro usando exec_secure_delete
  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    setDeleting(id);
    setError(null);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'match_own_analysis_videos',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;

      setVideos((prev) => prev.filter((v) => v.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el vídeo de análisis propio');
      return false;
    } finally {
      setDeleting(null);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, creating, deleting, error, addVideo, deleteVideo, refetch: fetchVideos };
}
