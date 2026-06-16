import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useDeletePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePlayer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: supabaseError } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

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
