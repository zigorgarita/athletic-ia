import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';

type NewPlayer = Omit<Player, 'id' | 'created_at' | 'updated_at'>;

export function useCreatePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlayer = useCallback(async (player: NewPlayer): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('players')
        .insert([player])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear el jugador');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createPlayer, loading, error };
}
