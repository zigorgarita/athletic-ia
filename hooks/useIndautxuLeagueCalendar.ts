import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, OfficialMatch, IndautxuLeagueCalendarMatch } from '@/types';
import { Club } from '@/hooks/useClubs';
import { buildIndautxuLeagueCalendar } from '@/lib/calendar/indautxuLeagueCalendar';

export function useIndautxuLeagueCalendar() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [officialMatches, setOfficialMatches] = useState<OfficialMatch[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener los 30 partidos planificados de Liga del Indautxu
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tipo_partido', 'LIGA')
        .order('jornada', { ascending: true });

      if (matchesError) throw matchesError;

      // 2. Obtener partidos oficiales federativos sincronizados
      const { data: officialData, error: officialError } = await supabase
        .from('official_matches')
        .select(`
          *,
          local_club:clubs!official_matches_local_club_id_fkey(id, nombre, nombre_corto, escudo_url, rfef_club_id),
          visitor_club:clubs!official_matches_visitor_club_id_fkey(id, nombre, nombre_corto, escudo_url, rfef_club_id)
        `);

      if (officialError) throw officialError;

      // 3. Obtener catálogo de clubes para resolución de escudos/rivales
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*');

      if (clubsError) throw clubsError;

      const formattedOfficialMatches = ((officialData || []) as any[]).map((row) => ({
        ...row,
        local_club: Array.isArray(row.local_club) ? row.local_club[0] || null : row.local_club,
        visitor_club: Array.isArray(row.visitor_club) ? row.visitor_club[0] || null : row.visitor_club
      })) as OfficialMatch[];

      setMatches((matchesData || []) as Match[]);
      setOfficialMatches(formattedOfficialMatches);
      setClubs((clubsData || []) as Club[]);
    } catch (err: any) {
      console.error('Error al cargar calendario de Liga del SD Indautxu:', err);
      setError(err.message || 'Error al cargar calendario de Liga');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Construcción unificada y memorizada del calendario
  const calendar = useMemo(
    () => buildIndautxuLeagueCalendar(matches, officialMatches, clubs),
    [matches, officialMatches, clubs]
  );

  // Estadísticas derivadas de progreso del calendario
  const jornadasDisputadas = useMemo(
    () => calendar.filter((m) => m.jugado).length,
    [calendar]
  );

  const jornadasPendientes = useMemo(
    () => calendar.filter((m) => !m.jugado).length,
    [calendar]
  );

  const lastPlayedMatch = useMemo(() => {
    const played = calendar.filter((m) => m.jugado);
    return played.length > 0 ? played[played.length - 1] : null;
  }, [calendar]);

  const nextMatch = useMemo(() => {
    return calendar.find((m) => !m.jugado) || null;
  }, [calendar]);

  return {
    calendar,
    jornadasDisputadas,
    jornadasPendientes,
    lastPlayedMatch,
    nextMatch,
    loading,
    error,
    refetch: fetchCalendarData
  };
}
