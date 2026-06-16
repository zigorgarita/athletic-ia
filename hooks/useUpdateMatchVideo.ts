import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchVideo } from '@/types';

type UpdatedMatchVideo = Partial<Omit<MatchVideo, 'id' | 'created_at'>>;

export function useUpdateMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVideo = useCallback(async (id: string, video: UpdatedMatchVideo): Promise<MatchVideo | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('match_videos')
        .update(video)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el video del partido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateVideo, loading, error };
}
