import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DetailedEvaluation } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type SaveDetailedEvaluation = Omit<DetailedEvaluation, 'id' | 'created_at'>;

export function useCreateEvaluation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const createEvaluation = useCallback(async (evaluation: SaveDetailedEvaluation): Promise<DetailedEvaluation | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'detailed_evaluations',
          payload: evaluation,
          conflict_columns: ['player_id', 'fecha_evaluacion'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      console.error('Supabase evaluation save error:', err);
      setError(err.message || 'Error al guardar la evaluación en Supabase');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { createEvaluation, loading, error };
}
