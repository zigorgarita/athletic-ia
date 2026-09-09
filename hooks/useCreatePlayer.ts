import { useState, useCallback } from 'react';
import { Player } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type NewPlayer = Omit<Player, 'id' | 'created_at' | 'updated_at'>;

export function useCreatePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const createPlayer = useCallback(async (player: NewPlayer): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(player)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al crear el jugador');
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear el jugador');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { createPlayer, loading, error };
}
