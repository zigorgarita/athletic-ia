import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayerInjury } from '@/types';

export function usePlayerInjuries(playerId: string | null) {
  const [injuries, setInjuries] = useState<PlayerInjury[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'player_injuries',
          payload: injury,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
      // Update local state and trigger refresh
      await fetchInjuries();
      return data;
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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'player_injuries',
          payload: { ...updates, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
      await fetchInjuries();
      return data;
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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'player_injuries',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
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
