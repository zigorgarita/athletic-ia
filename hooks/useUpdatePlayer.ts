import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';

type UpdatedPlayer = Partial<Omit<Player, 'id' | 'created_at' | 'updated_at'>>;

export function useUpdatePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePlayer = useCallback(async (id: string, player: UpdatedPlayer): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('players')
        .update(player)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el jugador');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updatePlayer, loading, error };
}
