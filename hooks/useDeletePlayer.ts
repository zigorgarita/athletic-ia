import { useState, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';

export function useDeletePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const deletePlayer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/players?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al eliminar el jugador');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el jugador');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { deletePlayer, loading, error };
}
