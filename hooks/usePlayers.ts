import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('players')
        .select('*')
        .order('nombre', { ascending: true });

      if (supabaseError) throw supabaseError;
      setPlayers(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la lista de jugadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return { players, loading, error, refetch: fetchPlayers };
}
