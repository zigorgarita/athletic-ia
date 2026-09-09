import { useState, useCallback } from 'react';
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
      const res = await fetch('/api/players/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluation),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al guardar la evaluación');
      }

      return (result?.data as DetailedEvaluation) || null;
    } catch (err: any) {
      console.error('API evaluation save error:', err);
      setError(err.message || 'Error al guardar la evaluación');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { createEvaluation, loading, error };
}
