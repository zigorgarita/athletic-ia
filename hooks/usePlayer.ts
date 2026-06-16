import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';

export function usePlayer(id: string | null) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;
      setPlayer(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener el jugador');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPlayer();
    } else {
      setPlayer(null);
    }
  }, [id, fetchPlayer]);

  return { player, loading, error, refetch: fetchPlayer };
}
