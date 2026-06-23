import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DetailedEvaluation } from '@/types';

type SaveDetailedEvaluation = Omit<DetailedEvaluation, 'id' | 'created_at'>;

export function useCreateEvaluation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvaluation = useCallback(async (evaluation: SaveDetailedEvaluation): Promise<DetailedEvaluation | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use upsert to handle one evaluation per player per day
      const { data, error: supabaseError } = await supabase
        .from('detailed_evaluations')
        .upsert(evaluation, { onConflict: 'player_id,fecha_evaluacion' })
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      console.error('Supabase evaluation save error:', err);
      setError(err.message || 'Error al guardar la evaluación en Supabase');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEvaluation, loading, error };
}
