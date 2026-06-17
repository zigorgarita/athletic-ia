import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DetailedEvaluation } from '@/types';

type NewDetailedEvaluation = Omit<DetailedEvaluation, 'id' | 'created_at'>;

export function useCreateEvaluation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvaluation = useCallback(async (evaluation: NewDetailedEvaluation): Promise<DetailedEvaluation | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('detailed_evaluations')
        .insert([evaluation])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al guardar la evaluación');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEvaluation, loading, error };
}
