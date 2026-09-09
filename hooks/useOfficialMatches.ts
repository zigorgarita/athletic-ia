'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface OfficialMatchClub {
  id: string;
  nombre: string;
  escudo_url: string | null;
  tipo?: string | null;
  rfef_club_id?: number | null;
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
      const [matchRes, statsRes, ownMatchRes] = await Promise.all([
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
            local_club:clubs!local_club_id(id, nombre, escudo_url, tipo, rfef_club_id),
            visitor_club:clubs!visitor_club_id(id, nombre, escudo_url, tipo, rfef_club_id)
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
          .order('dorsal_partido', { ascending: true }),
        supabase
          .from('matches')
          .select('id')
          .eq('official_match_id', matchId)
          .maybeSingle()
      ]);

      if (matchRes.error) throw matchRes.error;
      if (statsRes.error) throw statsRes.error;

      const matchData = matchRes.data as unknown as OfficialMatch;
      let stats = (statsRes.data as unknown as OfficialPlayerStat[]) || [];

      // Si el acta involucra al SD Indautxu y tenemos el partido interno vinculado,
      // incorporamos dinámicamente las estadísticas de match_player_stats + players
      const indautxuClub = [matchData.local_club, matchData.visitor_club].find(
        c => c?.tipo === 'PROPIO' || c?.rfef_club_id === 33836524
      );

      if (indautxuClub && ownMatchRes?.data?.id) {
        const [statsOwnRes, playersRes] = await Promise.all([
          supabase
            .from('match_player_stats')
            .select('*')
            .eq('match_id', ownMatchRes.data.id),
          supabase
            .from('players')
            .select('id, nombre, apellidos, demarcacion, foto_url')
        ]);

        if (statsOwnRes.data && statsOwnRes.data.length > 0) {
          const playerMap = new Map((playersRes.data || []).map(p => [p.id, p]));

          const indautxuStats: OfficialPlayerStat[] = statsOwnRes.data.map(mps => {
            const p = playerMap.get(mps.player_id);
            const minEntrada = mps.titular
              ? null
              : (mps.minuto_entrada && mps.minuto_entrada > 0 ? mps.minuto_entrada : null);
            const minSalida = (mps.minuto_salida !== null && mps.minuto_salida < 90)
              ? mps.minuto_salida
              : null;

            return {
              id: mps.id,
              official_match_id: matchId,
              club_player_id: mps.player_id,
              club_id: indautxuClub.id,
              dorsal_partido: mps.dorsal_partido ?? null,
              convocado: mps.convocado ?? true,
              titular: Boolean(mps.titular),
              minuto_entrada: minEntrada,
              minuto_salida: minSalida,
              minutos: mps.minutos ?? 0,
              goles: mps.goles ?? 0,
              amarillas: mps.tarjeta_amarilla ? 1 : 0,
              doble_amarilla: Boolean(mps.doble_amarilla),
              roja: Boolean(mps.tarjeta_roja || mps.roja_directa),
              motivo_sancion: null, // match_player_stats no almacena motivo textual de sanción
              player: p
                ? {
                    id: p.id,
                    nombre: p.apellidos ? `${p.nombre} ${p.apellidos}` : p.nombre,
                    posicion: p.demarcacion || null,
                    foto_url: p.foto_url || null,
                  }
                : null,
            };
          });

          indautxuStats.sort((a, b) => {
            if (a.titular !== b.titular) return a.titular ? -1 : 1;
            return (a.dorsal_partido ?? 99) - (b.dorsal_partido ?? 99);
          });

          // Filtrar por si ya hubiera stats de Indautxu para evitar duplicidad
          const existingNonIndautxu = stats.filter(s => s.club_id !== indautxuClub.id);
          stats = [...existingNonIndautxu, ...indautxuStats];
        }
      }

      return {
        match: matchData,
        stats
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
