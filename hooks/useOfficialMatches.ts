'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface OfficialMatchClub {
  id: string;
  nombre: string;
  escudo_url: string | null;
}

export interface OfficialMatch {
  id: string;
  rfef_cod_acta: number;
  temporada: string;
  competicion: string;
  grupo: string;
  jornada: number;
  fecha: string | null;
  hora: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  campo: string | null;
  superficie: string | null;
  arbitro: string | null;
  asistentes: string | null;
  oficiales: {
    incidencias?: Array<{
      club?: string;
      tipo?: string;
      cargo?: string;
      minuto?: number;
      motivo?: string;
      nombre?: string;
    }>;
  } | null;
  source: string;
  local_club: OfficialMatchClub | null;
  visitor_club: OfficialMatchClub | null;
}

export interface OfficialPlayerStat {
  id: string;
  official_match_id: string;
  club_player_id: string;
  club_id: string;
  dorsal_partido: number | null;
  convocado: boolean;
  titular: boolean;
  minuto_entrada: number | null;
  minuto_salida: number | null;
  minutos: number;
  goles: number;
  amarillas: number;
  doble_amarilla: boolean;
  roja: boolean;
  motivo_sancion: string | null;
  player: {
    id: string;
    nombre: string;
    posicion: string | null;
    foto_url: string | null;
  } | null;
}

export function useOfficialMatches(clubId?: string) {
  const [matches, setMatches] = useState<OfficialMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!clubId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('official_matches')
        .select(`
          id,
          rfef_cod_acta,
          temporada,
          competicion,
          grupo,
          jornada,
          fecha,
          hora,
          goles_local,
          goles_visitante,
          jugado,
          campo,
          superficie,
          arbitro,
          asistentes,
          oficiales,
          source,
          local_club:clubs!local_club_id(id, nombre, escudo_url),
          visitor_club:clubs!visitor_club_id(id, nombre, escudo_url)
        `)
        .or(`local_club_id.eq.${clubId},visitor_club_id.eq.${clubId}`)
        .order('jornada', { ascending: true });

      if (err) throw err;
      setMatches((data as unknown as OfficialMatch[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar partidos oficiales RFEF');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const loadMatchDetail = useCallback(async (matchId: string) => {
    try {
      const [matchRes, statsRes] = await Promise.all([
        supabase
          .from('official_matches')
          .select(`
            id,
            rfef_cod_acta,
            temporada,
            competicion,
            grupo,
            jornada,
            fecha,
            hora,
            goles_local,
            goles_visitante,
            jugado,
            campo,
            superficie,
            arbitro,
            asistentes,
            oficiales,
            source,
            local_club:clubs!local_club_id(id, nombre, escudo_url),
            visitor_club:clubs!visitor_club_id(id, nombre, escudo_url)
          `)
          .eq('id', matchId)
          .single(),
        supabase
          .from('club_match_player_stats')
          .select(`
            id,
            official_match_id,
            club_player_id,
            club_id,
            dorsal_partido,
            convocado,
            titular,
            minuto_entrada,
            minuto_salida,
            minutos,
            goles,
            amarillas,
            doble_amarilla,
            roja,
            motivo_sancion,
            player:club_players(id, nombre, posicion, foto_url)
          `)
          .eq('official_match_id', matchId)
          .order('titular', { ascending: false })
          .order('dorsal_partido', { ascending: true })
      ]);

      if (matchRes.error) throw matchRes.error;
      if (statsRes.error) throw statsRes.error;

      return {
        match: matchRes.data as unknown as OfficialMatch,
        stats: (statsRes.data as unknown as OfficialPlayerStat[]) || []
      };
    } catch (err: unknown) {
      console.error('Error al cargar detalle del acta oficial:', err);
      return null;
    }
  }, []);

  return {
    matches,
    loading,
    error,
    refresh: loadMatches,
    loadMatchDetail
  };
}
