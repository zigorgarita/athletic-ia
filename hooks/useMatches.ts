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
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...matchData, tipo_partido: matchType }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

      const json = await res.json();
      const data: Match = json.data;
      setMatches((prev) => [...prev, data].sort((a, b) => a.jornada - b.jornada));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear la jornada');
      return null;
    }
  }, [verifyWritePermission, matchType]);

  const updateMatch = useCallback(async (id: string, matchData: Partial<Omit<Match, 'id' | 'created_at'>>): Promise<Match | null> => {
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/matches/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(matchData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

      const json = await res.json();
      const data: Match = json.data;
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
      const res = await fetch(`/api/matches/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/stats`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ stats: playerStatsList }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      return Boolean(json.success);
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
