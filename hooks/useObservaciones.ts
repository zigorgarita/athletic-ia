import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Observacion } from '@/types';

export function useObservaciones(playerId: string | null) {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchObservaciones = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('observaciones')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha', { ascending: false });

      if (supabaseError) throw supabaseError;
      setObservaciones(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener observaciones');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const createObservacion = useCallback(async (obs: Omit<Observacion, 'id' | 'created_at'>): Promise<Observacion | null> => {
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('observaciones')
        .insert([obs])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      setObservaciones((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear la observación');
      return null;
    }
  }, []);

  useEffect(() => {
    if (playerId) {
      fetchObservaciones();
    } else {
      setObservaciones([]);
    }
  }, [playerId, fetchObservaciones]);

  return { observaciones, loading, error, createObservacion, refetch: fetchObservaciones };
}
