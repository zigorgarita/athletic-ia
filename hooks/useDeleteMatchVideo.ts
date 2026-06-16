import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useDeleteMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: supabaseError } = await supabase
        .from('match_videos')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el video del partido');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteVideo, loading, error };
}
