import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Evaluation } from '@/types';

export function useEvaluations(playerId: string | null) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha_evaluacion', { ascending: false });

      if (supabaseError) throw supabaseError;
      setEvaluations(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener las evaluaciones');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (playerId) {
      fetchEvaluations();
    } else {
      setEvaluations([]);
    }
  }, [playerId, fetchEvaluations]);

  return { evaluations, loading, error, refetch: fetchEvaluations };
}
