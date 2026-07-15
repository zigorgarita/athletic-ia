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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'player_fines',
          payload: fine,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
      await fetchFines();
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al registrar la multa');
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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // Fetch current fine to prevent partial upsert overrides
      const { data: current, error: getError } = await supabase
        .from('player_fines')
        .select('*')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      const { created_at, updated_at, ...mergeableCurrent } = current;
      const fullPayload = { ...mergeableCurrent, ...updates };

      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'player_fines',
          payload: { ...fullPayload, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
      await fetchFines();
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la multa');
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
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'player_fines',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      
      setFines(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la multa');
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
