import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { OfficialStanding } from '@/types';
import {
  getJornadasDisponibles,
  getUltimaJornada,
  getStandingsForJornada,
  getIndautxuHistory,
  getIndautxuStandingForJornada
} from '@/lib/standings/officialStandings';

export interface UseOfficialStandingsOptions {
  temporada?: string;
  initialJornada?: number;
}

export function useOfficialStandings(options: UseOfficialStandingsOptions = {}) {
  const temporada = options.temporada || '2026-27';
  const [allStandings, setAllStandings] = useState<OfficialStanding[]>([]);
  const [selectedJornada, setSelectedJornada] = useState<number | null>(options.initialJornada ?? null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('official_standings')
        .select(`
          id,
          temporada,
          jornada,
          posicion,
          club_id,
          pj,
          g,
          e,
          p,
          gf,
          gc,
          dg,
          puntos,
          source,
          created_at,
          updated_at,
          club:clubs!official_standings_club_id_fkey(
            id,
            nombre,
            nombre_corto,
            escudo_url,
            rfef_club_id
          )
        `)
        .eq('temporada', temporada)
        .order('jornada', { ascending: true })
        .order('posicion', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = ((data || []) as any[]).map((row) => ({
        ...row,
        club: Array.isArray(row.club) ? row.club[0] || null : row.club
      })) as OfficialStanding[];
      setAllStandings(rows);

      // Auto-seleccionar la última jornada disponible si no se ha fijado explícitamente una
      const ult = getUltimaJornada(rows);
      setSelectedJornada((prev) => (prev !== null ? prev : ult));
    } catch (err: any) {
      console.error('Error al cargar clasificación oficial RFEF:', err);
      setError(err.message || 'Error al cargar clasificación oficial');
    } finally {
      setLoading(false);
    }
  }, [temporada]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  const jornadasDisponibles = useMemo(
    () => getJornadasDisponibles(allStandings),
    [allStandings]
  );

  const ultimaJornada = useMemo(
    () => getUltimaJornada(allStandings),
    [allStandings]
  );

  const activeJornada = selectedJornada ?? ultimaJornada ?? 1;

  const currentStandings = useMemo(
    () => getStandingsForJornada(allStandings, activeJornada),
    [allStandings, activeJornada]
  );

  const indautxuHistory = useMemo(
    () => getIndautxuHistory(allStandings),
    [allStandings]
  );

  const indautxuCurrentStanding = useMemo(
    () => getIndautxuStandingForJornada(allStandings, activeJornada),
    [allStandings, activeJornada]
  );

  return {
    allStandings,
    jornadasDisponibles,
    ultimaJornada,
    selectedJornada: activeJornada,
    setSelectedJornada,
    currentStandings,
    indautxuHistory,
    indautxuCurrentStanding,
    loading,
    error,
    refetch: fetchStandings
  };
}
