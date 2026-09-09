import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayerFine } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

export function usePlayerFines(playerId: string | null) {
  const [fines, setFines] = useState<PlayerFine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchFines = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('player_fines')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha', { ascending: false });

      if (supabaseError) throw supabaseError;
      setFines((data || []) as PlayerFine[]);
    } catch (err: any) {
      setError(err.message || 'Error al obtener el historial de multas');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const addFine = async (fine: Omit<PlayerFine, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fine),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al registrar la multa');
      }

      await fetchFines();
      return result?.data || null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la multa');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateFine = async (id: string, updates: Partial<PlayerFine>) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/fines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al actualizar la multa');
      }

      await fetchFines();
      return result?.data || null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la multa');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteFine = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/players/fines?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al eliminar la multa');
      }

      setFines(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la multa');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      fetchFines();
    } else {
      setFines([]);
    }
  }, [playerId, fetchFines]);

  return { fines, loading, error, refetch: fetchFines, addFine, updateFine, deleteFine };
}
