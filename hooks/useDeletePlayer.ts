import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useDeletePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePlayer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'players',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el jugador');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deletePlayer, loading, error };
}
