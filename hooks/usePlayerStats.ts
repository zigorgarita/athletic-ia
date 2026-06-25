import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchPlayerStats } from '@/types';

export interface PlayerStatsSummary {
  partidos: number;
  titularidades: number;
  minutos: number;
  goles: number;
  asistencias: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  recuperaciones: number;
  intercepciones: number;
  duelos_ganados: number;
  pases_completados: number;
  pases_totales: number;
}

export function usePlayerStats(playerId: string | null) {
  const [stats, setStats] = useState<MatchPlayerStats[]>([]);
  const [summary, setSummary] = useState<PlayerStatsSummary>({
    partidos: 0,
    titularidades: 0,
    minutos: 0,
    goles: 0,
    asistencias: 0,
    tarjetas_amarillas: 0,
    tarjetas_rojas: 0,
    recuperaciones: 0,
    intercepciones: 0,
    duelos_ganados: 0,
    pases_completados: 0,
    pases_totales: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('match_player_stats')
        .select('*')
        .eq('player_id', playerId);

      if (supabaseError) throw supabaseError;
      
      const rows = data || [];
      setStats(rows);

      // Compute summary aggregates
      const agg: PlayerStatsSummary = {
        partidos: rows.length,
        titularidades: rows.filter((r) => r.titular).length,
        minutos: rows.reduce((sum, r) => sum + (r.minutos || 0), 0),
        goles: rows.reduce((sum, r) => sum + (r.goles || 0), 0),
        asistencias: rows.reduce((sum, r) => sum + (r.asistencias || 0), 0),
        tarjetas_amarillas: rows.filter((r) => r.tarjeta_amarilla).length,
        tarjetas_rojas: rows.filter((r) => r.tarjeta_roja).length,
        recuperaciones: rows.reduce((sum, r) => sum + (r.recuperaciones || 0), 0),
        intercepciones: rows.reduce((sum, r) => sum + (r.intercepciones || 0), 0),
        duelos_ganados: rows.reduce((sum, r) => sum + (r.duelos_ganados || 0), 0),
        pases_completados: rows.reduce((sum, r) => sum + (r.pases_completados || 0), 0),
        pases_totales: rows.reduce((sum, r) => sum + (r.pases_totales || 0), 0),
      };
      setSummary(agg);
    } catch (err: any) {
      setError(err.message || 'Error al obtener estadísticas del jugador');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const updatePlayerStats = useCallback(async (statId: string, updates: Partial<MatchPlayerStats>) => {
    setError(null);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'match_player_stats',
          payload: { ...updates, id: statId },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      await fetchStats();
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar las estadísticas');
      return false;
    }
  }, [fetchStats]);

  useEffect(() => {
    if (playerId) {
      fetchStats();
    } else {
      setStats([]);
      setSummary({
        partidos: 0,
        titularidades: 0,
        minutos: 0,
        goles: 0,
        asistencias: 0,
        tarjetas_amarillas: 0,
        tarjetas_rojas: 0,
        recuperaciones: 0,
        intercepciones: 0,
        duelos_ganados: 0,
        pases_completados: 0,
        pases_totales: 0,
      });
    }
  }, [playerId, fetchStats]);

  return { stats, summary, loading, error, updatePlayerStats, refetch: fetchStats };
}
