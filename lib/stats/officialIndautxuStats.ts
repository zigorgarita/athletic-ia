/**
 * ============================================================================
 * CAPA CENTRAL DE ESTADÍSTICAS OFICIALES DEL SD INDAUTXU (RFEF LIGA)
 * ============================================================================
 * Fuente canónica única de verdad para las estadísticas oficiales de Liga:
 *  - Plantilla -> Jugador -> Resumen -> COMPETICIÓN (LIGA)
 *  - DATOS INDAUTXU DE LIGA -> JUGADORES
 *
 * Reglas Oficiales:
 * 1. Filtro Canónico: matches.tipo_partido === 'LIGA' && matches.jugado === true && matches.official_match_id !== null
 *    Stats Canónicas: match_player_stats.origen === 'rfef' && match_player_stats.rfef_acta_id !== null
 * 2. Partidos Jugados (PJ): minutos > 0. Convocado con 0 minutos NO cuenta como PJ.
 * 3. Minutos Posibles: Partidos oficiales de Liga jugados por SD Indautxu * 90.
 * 4. % Minutos: (minutos_jugados / minutos_posibles) * 100.
 * 5. Demarcación: Porteros identificados mediante demarcacion === 'Portero'.
 * 6. Ofensiva/Defensiva:
 *    - Jugadores de campo: goles anotados.
 *    - Porteros: goles_encajados (específica).
 * 7. Asistencias: Omitidas al 100% de la capa oficial RFEF.
 * 8. Porterías a cero: No se calculan (pendiente de definición funcional).
 * 9. Jugadores no convocados (los 27 de public.players): Devuelven ceros correctamente sin fallar.
 * ============================================================================
 */

import { Player, Match, MatchPlayerStats } from '@/types';

export interface OfficialPlayerLeagueStats {
  playerId: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  dorsal: number;
  demarcacion: string;
  isPortero: boolean;
  convocatorias: number;
  partidosJugados: number; // PJ: oficial con minutos > 0
  titularidades: number;
  suplencias: number;
  entradasBanquillo: number;
  minutos: number;
  minutosPosibles: number; // partidos oficiales disputados por el equipo * 90
  porcentajeMinutos: number; // 0.0 - 100.0
  goles: number; // Solo para jugadores de campo (o 0)
  golesEncajados: number | null; // Solo para porteros (null para campo)
  tarjetasAmarillas: number;
  doblesAmarillas: number;
  rojasDirectas: number;
}

export interface OfficialTeamLeagueSummary {
  partidosDisputados: number;
  minutosPosiblesEquipo: number;
  golesFavor: number;
  golesContra: number;
  statsByPlayerId: Record<string, OfficialPlayerLeagueStats>;
  playersStatsList: OfficialPlayerLeagueStats[];
}

/**
 * Valida si un partido pertenece a la competición oficial de Liga del Indautxu.
 */
export function isOfficialLeagueMatch(match: {
  tipo_partido?: string | null;
  jugado?: boolean | null;
  official_match_id?: string | null;
}): boolean {
  return (
    match.tipo_partido === 'LIGA' &&
    match.jugado === true &&
    Boolean(match.official_match_id)
  );
}

/**
 * Valida si un registro estadístico procede de un acta oficial RFEF homologada.
 */
export function isOfficialRfefStat(stat: {
  origen?: string | null;
  rfef_acta_id?: number | null;
}): boolean {
  return stat.origen === 'rfef' && Boolean(stat.rfef_acta_id);
}

/**
 * Genera el objeto de estadísticas oficiales a cero para cualquier futbolista sin participación federativa.
 */
export function createEmptyOfficialPlayerStats(
  player: {
    id: string;
    nombre: string;
    apellidos: string;
    dorsal?: number;
    demarcacion?: string;
  },
  matchesPlayedByTeam: number
): OfficialPlayerLeagueStats {
  const isPortero = player.demarcacion === 'Portero';
  const minutosPosibles = matchesPlayedByTeam * 90;

  return {
    playerId: player.id,
    nombre: player.nombre,
    apellidos: player.apellidos,
    nombreCompleto: `${player.nombre} ${player.apellidos}`.trim(),
    dorsal: player.dorsal || 0,
    demarcacion: player.demarcacion || 'Desconocida',
    isPortero,
    convocatorias: 0,
    partidosJugados: 0,
    titularidades: 0,
    suplencias: 0,
    entradasBanquillo: 0,
    minutos: 0,
    minutosPosibles,
    porcentajeMinutos: 0,
    goles: 0,
    golesEncajados: isPortero ? 0 : null,
    tarjetasAmarillas: 0,
    doblesAmarillas: 0,
    rojasDirectas: 0
  };
}

/**
 * Calcula las estadísticas oficiales de un jugador para Liga a partir de sus filas RFEF.
 * Si el jugador no tiene filas, devuelve el estado a cero de forma completamente segura.
 */
export function calculateOfficialPlayerStats(
  player: {
    id: string;
    nombre: string;
    apellidos: string;
    dorsal?: number;
    demarcacion?: string;
  },
  playerStats: MatchPlayerStats[],
  matchesPlayedByTeam: number
): OfficialPlayerLeagueStats {
  const isPortero = player.demarcacion === 'Portero';
  const minutosPosibles = matchesPlayedByTeam * 90;

  // Filtrar estrictamente filas RFEF oficiales
  const rfefStats = (playerStats || []).filter(isOfficialRfefStat);

  if (rfefStats.length === 0) {
    return createEmptyOfficialPlayerStats(player, matchesPlayedByTeam);
  }

  const convocatorias = rfefStats.filter(s => Boolean(s.convocado)).length;
  // Regla Oficial: PJ cuenta únicamente si minutos disputados > 0
  const partidosJugados = rfefStats.filter(s => (s.minutos || 0) > 0).length;
  const titularidades = rfefStats.filter(s => Boolean(s.titular)).length;
  const suplencias = rfefStats.filter(s => Boolean(s.suplente)).length;
  const entradasBanquillo = rfefStats.filter(s => Boolean(s.entro_banquillo)).length;
  const minutos = rfefStats.reduce((sum, s) => sum + (s.minutos || 0), 0);
  const goles = rfefStats.reduce((sum, s) => sum + (s.goles || 0), 0);
  const golesEncajados = isPortero
    ? rfefStats.reduce((sum, s) => sum + (s.goles_encajados || 0), 0)
    : null;
  const tarjetasAmarillas = rfefStats.filter(s => Boolean(s.tarjeta_amarilla)).length;
  const doblesAmarillas = rfefStats.filter(s => Boolean(s.doble_amarilla)).length;
  const rojasDirectas = rfefStats.filter(s => Boolean(s.roja_directa || s.tarjeta_roja)).length;

  const porcentajeMinutos = minutosPosibles > 0
    ? Number(((minutos / minutosPosibles) * 100).toFixed(1))
    : 0;

  return {
    playerId: player.id,
    nombre: player.nombre,
    apellidos: player.apellidos,
    nombreCompleto: `${player.nombre} ${player.apellidos}`.trim(),
    dorsal: player.dorsal || 0,
    demarcacion: player.demarcacion || 'Desconocida',
    isPortero,
    convocatorias,
    partidosJugados,
    titularidades,
    suplencias,
    entradasBanquillo,
    minutos,
    minutosPosibles,
    porcentajeMinutos,
    goles: isPortero ? 0 : goles,
    golesEncajados,
    tarjetasAmarillas,
    doblesAmarillas,
    rojasDirectas
  };
}

/**
 * Motor central de cálculo acumulado para los 27 futbolistas del equipo.
 */
export function calculateTeamOfficialStats(
  players: Player[],
  allStats: MatchPlayerStats[],
  matches: Match[]
): OfficialTeamLeagueSummary {
  // 1. Partidos oficiales de liga jugados por el Indautxu
  const officialPlayedMatches = (matches || []).filter(isOfficialLeagueMatch);
  const matchesPlayedByTeam = officialPlayedMatches.length;
  const minutosPosiblesEquipo = matchesPlayedByTeam * 90;

  const officialMatchIdSet = new Set(officialPlayedMatches.map(m => m.id));

  // Goles globales del equipo en Liga
  const golesFavor = officialPlayedMatches.reduce((sum, m) => sum + (m.goles_favor || 0), 0);
  const golesContra = officialPlayedMatches.reduce((sum, m) => sum + (m.goles_contra || 0), 0);

  // 2. Filtrar filas de match_player_stats que pertenezcan a partidos oficiales válidos y con origen rfef
  const validStats = (allStats || []).filter(
    s => officialMatchIdSet.has(s.match_id) && isOfficialRfefStat(s)
  );

  // Agrupar filas por player_id
  const statsByPlayerMap = new Map<string, MatchPlayerStats[]>();
  validStats.forEach(stat => {
    const list = statsByPlayerMap.get(stat.player_id) || [];
    list.push(stat);
    statsByPlayerMap.set(stat.player_id, list);
  });

  // 3. Procesar los 27 jugadores
  const statsByPlayerId: Record<string, OfficialPlayerLeagueStats> = {};
  const playersStatsList: OfficialPlayerLeagueStats[] = [];

  (players || []).forEach(player => {
    const pStats = statsByPlayerMap.get(player.id) || [];
    const calculated = calculateOfficialPlayerStats(player, pStats, matchesPlayedByTeam);
    statsByPlayerId[player.id] = calculated;
    playersStatsList.push(calculated);
  });

  // Ordenar la lista por dorsal de plantilla por defecto
  playersStatsList.sort((a, b) => a.dorsal - b.dorsal);

  return {
    partidosDisputados: matchesPlayedByTeam,
    minutosPosiblesEquipo,
    golesFavor,
    golesContra,
    statsByPlayerId,
    playersStatsList
  };
}
