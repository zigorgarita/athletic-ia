import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayerInjury } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

export function usePlayerInjuries(playerId: string | null) {
  const [injuries, setInjuries] = useState<PlayerInjury[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchInjuries = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('player_injuries')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha_lesion', { ascending: false });

      if (supabaseError) throw supabaseError;
      setInjuries(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener el historial de lesiones');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const addInjury = async (injury: Omit<PlayerInjury, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/injuries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(injury),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al registrar la lesión');
      }

      await fetchInjuries();
      return result?.data;
    } catch (err: any) {
      setError(err.message || 'Error al registrar la lesión');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateInjury = async (id: string, updates: Partial<PlayerInjury>) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/injuries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al actualizar la lesión');
      }

      await fetchInjuries();
      return result?.data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la lesión');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteInjury = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/players/injuries?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al eliminar la lesión');
      }

      setInjuries(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la lesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      fetchInjuries();
    } else {
      setInjuries([]);
    }
  }, [playerId, fetchInjuries]);

  return { injuries, loading, error, refetch: fetchInjuries, addInjury, updateInjury, deleteInjury };
}
