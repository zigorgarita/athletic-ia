import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/types';

interface UsePlayersOptions {
  includeInactive?: boolean;
}

export function usePlayers(options?: UsePlayersOptions) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const includeInactive = options?.includeInactive ?? false;

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('players')
        .select('*')
        .order('nombre', { ascending: true });

      if (supabaseError) throw supabaseError;
      
      const allPlayers = (data || []) as Player[];
      // Por defecto solo muestra jugadores activos (p.activo !== false)
      const filtered = includeInactive 
        ? allPlayers 
        : allPlayers.filter(p => p.activo !== false);

      setPlayers(filtered);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la lista de jugadores');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return { players, loading, error, refetch: fetchPlayers };
}
