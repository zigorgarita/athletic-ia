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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'players',
          payload: player,
          conflict_columns: null,
          staff_passkey: passkey
        });

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
