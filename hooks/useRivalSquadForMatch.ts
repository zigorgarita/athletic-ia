import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Match } from '@/types';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { findClubForRival } from '@/lib/calendar/indautxuLeagueCalendar';

export interface UseRivalSquadResult {
  rivalClub: Club | null;
  rivalSeason: ClubSeason | null;
  rivalPlayers: ClubPlayer[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook de solo lectura para obtener la plantilla real del club rival
 * asociado al partido seleccionado en el Plan del Partido.
 *
 * Flujo:
 * selectedMatchId -> match.rival -> findClubForRival(clubs) -> club_seasons ('2026-27') -> club_players
 */
export function useRivalSquadForMatch(
  match: Match | undefined | null,
  temporada: string = '2026-27'
): UseRivalSquadResult {
  const [rivalClub, setRivalClub] = useState<Club | null>(null);
  const [rivalSeason, setRivalSeason] = useState<ClubSeason | null>(null);
  const [rivalPlayers, setRivalPlayers] = useState<ClubPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRivalSquad = useCallback(async () => {
    if (!match || !match.rival || !match.rival.trim()) {
      setRivalClub(null);
      setRivalSeason(null);
      setRivalPlayers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener catálogo de clubes para resolver el rival
      const { data: clubsData, error: clubsErr } = await supabase
        .from('clubs')
        .select('*');

      if (clubsErr) throw clubsErr;

      const clubs: Club[] = clubsData || [];
      const resolvedClub = findClubForRival(match.rival, clubs) as Club | null;

      if (!resolvedClub) {
        setRivalClub(null);
        setRivalSeason(null);
        setRivalPlayers([]);
        setLoading(false);
        return;
      }

      setRivalClub(resolvedClub);

      // 2. Obtener temporada 2026-27 del club rival
      const { data: seasonData, error: seasonErr } = await supabase
        .from('club_seasons')
        .select('*')
        .eq('club_id', resolvedClub.id)
        .eq('temporada', temporada)
        .maybeSingle();

      if (seasonErr) throw seasonErr;

      if (!seasonData) {
        setRivalSeason(null);
        setRivalPlayers([]);
        setLoading(false);
        return;
      }

      setRivalSeason(seasonData as ClubSeason);

      // 3. Obtener jugadores de la plantilla del rival desde la fuente canónica
      const { data: playersData, error: playersErr } = await supabase
        .from('club_players')
        .select('*')
        .eq('club_season_id', seasonData.id)
        .order('dorsal', { ascending: true, nullsFirst: false })
        .order('nombre', { ascending: true });

      if (playersErr) throw playersErr;

      setRivalPlayers((playersData as ClubPlayer[]) || []);
    } catch (err: unknown) {
      console.error('[useRivalSquadForMatch] Error al cargar plantilla rival:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setRivalPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [match?.id, match?.rival, temporada]);

  useEffect(() => {
    fetchRivalSquad();
  }, [fetchRivalSquad]);

  return {
    rivalClub,
    rivalSeason,
    rivalPlayers,
    loading,
    error,
  };
}
