import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export function useDeleteMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'match_videos',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el video del partido');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { deleteVideo, loading, error };
}
