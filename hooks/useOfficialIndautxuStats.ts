import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, Match, MatchPlayerStats } from '@/types';
import {
  OfficialPlayerLeagueStats,
  OfficialTeamLeagueSummary,
  calculateTeamOfficialStats
} from '@/lib/stats/officialIndautxuStats';

const defaultEmptyTeamSummary: OfficialTeamLeagueSummary = {
  partidosDisputados: 0,
  minutosPosiblesEquipo: 0,
  golesFavor: 0,
  golesContra: 0,
  statsByPlayerId: {},
  playersStatsList: []
};

export function useOfficialIndautxuStats() {
  const [teamSummary, setTeamSummary] = useState<OfficialTeamLeagueSummary>(defaultEmptyTeamSummary);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficialStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener plantilla completa (27 jugadores propios)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('dorsal', { ascending: true });

      if (playersError) throw playersError;

      // 2. Obtener partidos oficiales de Liga disputados por el Indautxu
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tipo_partido', 'LIGA')
        .eq('jugado', true)
        .not('official_match_id', 'is', null)
        .order('jornada', { ascending: true });

      if (matchesError) throw matchesError;

      // 3. Obtener filas oficiales RFEF de match_player_stats
      const { data: statsData, error: statsError } = await supabase
        .from('match_player_stats')
        .select('*')
        .eq('origen', 'rfef')
        .not('rfef_acta_id', 'is', null);

      if (statsError) throw statsError;

      const players = (playersData || []) as Player[];
      const matches = (matchesData || []) as Match[];
      const stats = (statsData || []) as MatchPlayerStats[];

      // 4. Procesar mediante el motor central puro
      const summary = calculateTeamOfficialStats(players, stats, matches);
      setTeamSummary(summary);
    } catch (err: any) {
      console.error('Error al cargar estadísticas oficiales RFEF de Liga:', err);
      setError(err.message || 'Error al cargar estadísticas oficiales de Liga');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficialStats();
  }, [fetchOfficialStats]);

  const getStatsForPlayer = useCallback(
    (playerId: string): OfficialPlayerLeagueStats | undefined => {
      return teamSummary.statsByPlayerId[playerId];
    },
    [teamSummary]
  );

  return {
    teamSummary,
    statsByPlayerId: teamSummary.statsByPlayerId,
    playersStatsList: teamSummary.playersStatsList,
    partidosDisputados: teamSummary.partidosDisputados,
    minutosPosiblesEquipo: teamSummary.minutosPosiblesEquipo,
    getStatsForPlayer,
    loading,
    error,
    refetch: fetchOfficialStats
  };
}
