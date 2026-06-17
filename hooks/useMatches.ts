import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, MatchPlayerStats } from '@/types';

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('matches')
        .select('*')
        .order('jornada', { ascending: true });

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
      const { data, error: supabaseError } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      setMatches((prev) => [...prev, data].sort((a, b) => a.jornada - b.jornada));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear la jornada');
      return null;
    }
  }, []);

  const updateMatch = useCallback(async (id: string, matchData: Partial<Omit<Match, 'id' | 'created_at'>>): Promise<Match | null> => {
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      setMatches((prev) => prev.map((m) => (m.id === id ? data : m)));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la jornada');
      return null;
    }
  }, []);

  const deleteMatch = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: supabaseError } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      setMatches((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la jornada');
      return false;
    }
  }, []);

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
      // 1. Delete existing stats for this match to overwrite/sync clean
      const { error: deleteError } = await supabase
        .from('match_player_stats')
        .delete()
        .eq('match_id', matchId);

      if (deleteError) throw deleteError;

      // 2. Insert new stats list if not empty
      if (playerStatsList.length > 0) {
        const { error: insertError } = await supabase
          .from('match_player_stats')
          .insert(playerStatsList);
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
