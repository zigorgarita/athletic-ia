import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchVideo } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type UpdatedMatchVideo = Partial<Omit<MatchVideo, 'id' | 'created_at'>>;

export function useUpdateMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const updateVideo = useCallback(async (id: string, video: UpdatedMatchVideo): Promise<MatchVideo | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_videos',
          payload: { ...video, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

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
