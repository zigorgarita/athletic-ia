/**
 * ============================================================================
 * CAPA LÓGICA DE CALENDARIO DE LIGA DEL SD INDAUTXU (PASO 7)
 * ============================================================================
 * Unifica el calendario planificado de las 30 jornadas de Liga (public.matches)
 * con el enriquecimiento oficial federativo (public.official_matches) y la
 * resolución de escudos/identidades de los 15 rivales (public.clubs).
 *
 * Principios:
 * 1. Fuente troncal: public.matches (contiene las 30 jornadas planificadas).
 * 2. Cero duplicados: exactamente 30 partidos de Liga.
 * 3. Enriquecimiento federativo automático cuando existe official_match_id.
 * 4. Mantiene los partidos futuros intactos como programados.
 * ============================================================================
 */

import { Match, OfficialMatch, IndautxuLeagueCalendarMatch } from '@/types';
import { Club } from '@/hooks/useClubs';

/**
 * Normaliza nombres para comparación flexible de clubes.
 */
export function normalizeClubName(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, '')
    .replace(/\b(de|del|el|la|los|las|cf|fc|cd|sd|ud|sad|c\.f\.|f\.c\.|c\.d\.|s\.d\.|u\.d\.|ke)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resuelve un club rival a partir de su nombre en public.matches contra el catálogo public.clubs.
 */
export function findClubForRival(
  rivalName: string,
  clubs: (Club | { id: string; nombre: string; nombre_corto?: string | null; escudo_url?: string | null })[]
): { id: string; nombre: string; nombre_corto?: string | null; escudo_url?: string | null } | null {
  if (!rivalName || !clubs || clubs.length === 0) return null;
  const normRival = normalizeClubName(rivalName);

  // 1. Coincidencia exacta de nombre o nombre corto
  let match = clubs.find(
    (c) =>
      normalizeClubName(c.nombre) === normRival ||
      (c.nombre_corto && normalizeClubName(c.nombre_corto) === normRival)
  );
  if (match) return match;

  // 2. Contención de subcadenas
  match = clubs.find((c) => {
    const cNom = normalizeClubName(c.nombre);
    const cCorto = c.nombre_corto ? normalizeClubName(c.nombre_corto) : '';
    return (
      (cNom && (normRival.includes(cNom) || cNom.includes(normRival))) ||
      (cCorto && (normRival.includes(cCorto) || cCorto.includes(normRival)))
    );
  });
  if (match) return match;

  // 3. Palabra clave principal (> 3 caracteres)
  const keywords = normRival.split(' ').filter((w) => w.length > 3);
  match = clubs.find((c) => {
    const cNom = normalizeClubName(c.nombre);
    return keywords.some((kw) => cNom.includes(kw));
  });

  return match || null;
}

/**
 * Construye la vista lógica enriquecida del calendario de 30 jornadas del SD Indautxu.
 */
export function buildIndautxuLeagueCalendar(
  leagueMatches: Match[],
  officialMatches: OfficialMatch[],
  clubs: (Club | { id: string; nombre: string; nombre_corto?: string | null; escudo_url?: string | null })[]
): IndautxuLeagueCalendarMatch[] {
  if (!leagueMatches || leagueMatches.length === 0) return [];

  // Filtrar estrictamente partidos de LIGA y ordenar por jornada
  const filteredMatches = leagueMatches
    .filter((m) => m.tipo_partido === 'LIGA' || !m.tipo_partido)
    .sort((a, b) => a.jornada - b.jornada);

  return filteredMatches.map((m) => {
    // 1. Buscar acta oficial sincronizada si existe
    const official = m.official_match_id
      ? officialMatches.find((o) => o.id === m.official_match_id)
      : null;

    // 2. Resolver identidad y escudo del club rival
    let rivalClub: { id: string; nombre: string; nombre_corto?: string | null; escudo_url?: string | null } | null = null;
    if (official) {
      rivalClub = m.es_local ? official.visitor_club || null : official.local_club || null;
    }
    if (!rivalClub) {
      rivalClub = findClubForRival(m.rival, clubs);
    }

    // 3. Resolver marcador y estado de juego
    const jugado = Boolean(official?.jugado || m.jugado);
    let golesIndautxu: number | null = null;
    let golesRival: number | null = null;

    if (official && official.jugado) {
      golesIndautxu = m.es_local ? official.goles_local : official.goles_visitante;
      golesRival = m.es_local ? official.goles_visitante : official.goles_local;
    } else if (m.jugado) {
      golesIndautxu = m.goles_favor;
      golesRival = m.goles_contra;
    }

    // 4. Calcular signo deportivo (Victoria, Empate, Derrota)
    let signoResultado: 'V' | 'E' | 'D' | null = null;
    if (jugado && golesIndautxu !== null && golesRival !== null) {
      if (golesIndautxu > golesRival) {
        signoResultado = 'V';
      } else if (golesIndautxu === golesRival) {
        signoResultado = 'E';
      } else {
        signoResultado = 'D';
      }
    }

    const resultadoTexto =
      jugado && golesIndautxu !== null && golesRival !== null
        ? `${golesIndautxu} - ${golesRival}`
        : null;

    return {
      id: m.id,
      jornada: m.jornada,
      fecha: official?.fecha || m.fecha,
      hora: official?.hora || m.hora || null,
      campo: official?.campo || m.campo || null,
      es_local: m.es_local,
      rivalNombre: rivalClub?.nombre || m.rival,
      rivalClubId: rivalClub?.id || null,
      rivalEscudoUrl: rivalClub?.escudo_url || null,
      jugado,
      golesIndautxu,
      golesRival,
      resultadoTexto,
      signoResultado,
      isOfficialSynced: Boolean(m.official_match_id && official),
      officialMatchId: m.official_match_id || null,
      officialCodActa: official?.rfef_cod_acta || null,
      arbitro: official?.arbitro || null,
      superficie: official?.superficie || null
    };
  });
}
