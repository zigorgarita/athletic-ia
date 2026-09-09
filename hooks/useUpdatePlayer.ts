import { useState, useCallback } from 'react';
import { Player } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type UpdatedPlayer = Partial<Omit<Player, 'id' | 'created_at' | 'updated_at'>>;

export function useUpdatePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const updatePlayer = useCallback(async (id: string, player: UpdatedPlayer): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...player, id })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al actualizar el jugador');
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el jugador');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { updatePlayer, loading, error };
}
