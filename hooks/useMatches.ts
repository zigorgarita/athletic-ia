import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, MatchPlayerStats } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

export function useMatches(matchType: 'LIGA' | 'AMISTOSO' | 'ALL' = 'LIGA') {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('matches').select('*');
      if (matchType !== 'ALL') {
        query = query.eq('tipo_partido', matchType);
      }
      const { data, error: supabaseError } = await query.order('jornada', { ascending: true });

      if (supabaseError) throw supabaseError;
      setMatches(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la lista de jornadas');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMatch = useCallback(async (matchData: Omit<Match, 'id' | 'created_at'>): Promise<Match | null> => {
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: { ...matchData, tipo_partido: matchType },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setMatches((prev) => [...prev, data].sort((a, b) => a.jornada - b.jornada));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear la jornada');
      return null;
    }
  }, [verifyWritePermission]);

  const updateMatch = useCallback(async (id: string, matchData: Partial<Omit<Match, 'id' | 'created_at'>>): Promise<Match | null> => {
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'matches',
          payload: { ...matchData, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setMatches((prev) => prev.map((m) => (m.id === id ? data : m)));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la jornada');
      return null;
    }
  }, [verifyWritePermission]);

  const deleteMatch = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'matches',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setMatches((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la jornada');
      return false;
    }
  }, [verifyWritePermission]);

  const fetchMatchPlayerStats = async (matchId: string): Promise<MatchPlayerStats[]> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('match_player_stats')
        .select('*')
        .eq('match_id', matchId);

      if (supabaseError) throw supabaseError;
      return data || [];
    } catch (err) {
      console.error('Error fetching match player stats:', err);
      return [];
    }
  };

  const saveMatchPlayerStats = async (
    matchId: string,
    playerStatsList: Omit<MatchPlayerStats, 'id' | 'created_at'>[]
  ): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      // 1. Delete existing stats for this match securely
      const { error: deleteError } = await supabase
        .rpc('delete_match_player_stats_secure', {
          target_match_id: matchId,
          staff_passkey: passkey
        });

      if (deleteError) throw deleteError;

      // 2. Insert new stats list if not empty securely
      if (playerStatsList.length > 0) {
        const { error: insertError } = await supabase
          .rpc('exec_secure_bulk_upsert', {
            target_table: 'match_player_stats',
            payloads: playerStatsList,
            conflict_columns: null,
            staff_passkey: passkey
          });
        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error saving match player stats:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    createMatch,
    updateMatch,
    deleteMatch,
    fetchMatchPlayerStats,
    saveMatchPlayerStats,
    refetch: fetchMatches,
  };
}
