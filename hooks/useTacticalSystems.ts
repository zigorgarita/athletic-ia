import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TacticalSystem, TacticalMatchup, TacticalMatchPlan } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

// Simple in-memory cache for static configuration tables
let cachedSystems: TacticalSystem[] | null = null;
let cachedMatchups: TacticalMatchup[] | null = null;

export function useTacticalSystems() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systems, setSystems] = useState<TacticalSystem[]>(cachedSystems || []);
  const [matchups, setMatchups] = useState<TacticalMatchup[]>(cachedMatchups || []);
  const { verifyWritePermission } = useEditMode();

  const loadSystemsAndMatchups = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && cachedSystems && cachedMatchups) {
      setSystems(cachedSystems);
      setMatchups(cachedMatchups);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [sysRes, matchRes] = await Promise.all([
        supabase.from('tactical_systems').select('*').order('nombre', { ascending: true }),
        supabase.from('tactical_matchups').select('*')
      ]);

      if (sysRes.error) throw sysRes.error;
      if (matchRes.error) throw matchRes.error;

      const loadedSystems = sysRes.data || [];
      const loadedMatchups = matchRes.data || [];

      cachedSystems = loadedSystems;
      cachedMatchups = loadedMatchups;

      setSystems(loadedSystems);
      setMatchups(loadedMatchups);
    } catch (err: any) {
      console.error('Error loading systems/matchups:', err);
      setError(err.message || 'Error al obtener sistemas tácticos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMatchPlan = useCallback(async (matchId: string): Promise<TacticalMatchPlan | null> => {
    if (!matchId) return null;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('tactical_match_plans')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      return data;
    } catch (err: any) {
      console.error('Error fetching match plan:', err);
      setError(err.message || 'Error al obtener el plan táctico del partido.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMatchPlan = useCallback(async (plan: Omit<TacticalMatchPlan, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const { data, error: upsertErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'tactical_match_plans',
        payload: plan,
        conflict_columns: ['match_id'],
        staff_passkey: passkey
      });

      if (upsertErr) throw upsertErr;
      return true;
    } catch (err: any) {
      console.error('Error saving match plan:', err);
      setError(err.message || 'Error al guardar el plan táctico.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  useEffect(() => {
    if (systems.length === 0) {
      loadSystemsAndMatchups();
    }
  }, [systems.length, loadSystemsAndMatchups]);

  return {
    systems,
    matchups,
    loading,
    error,
    refresh: () => loadSystemsAndMatchups(true),
    fetchMatchPlan,
    saveMatchPlan
  };
}
