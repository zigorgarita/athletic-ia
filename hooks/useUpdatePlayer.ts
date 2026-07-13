import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type UpdatedPlayer = Partial<Omit<Player, 'id' | 'created_at' | 'updated_at'>>;

export function useUpdatePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const updatePlayer = useCallback(async (id: string, player: UpdatedPlayer): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // Fetch the current player record to merge fields, preventing database NOT NULL constraint violations on INSERT
      const { data: current, error: getError } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const { created_at, updated_at, ...mergeableCurrent } = current;
      const fullPayload = { ...mergeableCurrent, ...player };

      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'players',
          payload: { ...fullPayload, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el jugador');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { updatePlayer, loading, error };
}
