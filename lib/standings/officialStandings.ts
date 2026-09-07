/**
 * ============================================================================
 * CAPA CENTRAL DE CLASIFICACIÓN OFICIAL RFEF (PASO 7)
 * ============================================================================
 * Fuente canónica para consulta de las instantáneas históricas de la tabla
 * federativa de la competición oficial de Liga (División de Honor Juvenil).
 *
 * Principio de Autoridad RFEF:
 * - La posición publicada y persistida es la máxima autoridad deportiva.
 * - La aplicación no recalcula ni reinterpreta desempates particulares ni generales.
 * ============================================================================
 */

import { OfficialStanding } from '@/types';

export const INDAUTXU_RFEF_CLUB_ID = 33836524;
export const INDAUTXU_CANONICAL_UUID = '13f4a8d6-a39c-4b39-a8dd-ca9c63c0c1ee';

/**
 * Obtiene la lista de jornadas disponibles ordenadas ascendentemente.
 */
export function getJornadasDisponibles(standings: OfficialStanding[]): number[] {
  if (!standings || standings.length === 0) return [];
  const jornadasSet = new Set(standings.map((s) => s.jornada));
  return Array.from(jornadasSet).sort((a, b) => a - b);
}

/**
 * Obtiene la última jornada oficial almacenada con datos.
 */
export function getUltimaJornada(standings: OfficialStanding[]): number | null {
  const jornadas = getJornadasDisponibles(standings);
  if (jornadas.length === 0) return null;
  return jornadas[jornadas.length - 1];
}

/**
 * Obtiene la clasificación completa de una jornada específica ordenada por posición oficial RFEF.
 * La posición devuelta respeta estrictamente la posición persistida sin alterar el orden federativo.
 */
export function getStandingsForJornada(
  standings: OfficialStanding[],
  jornada: number
): OfficialStanding[] {
  if (!standings) return [];
  return standings
    .filter((s) => s.jornada === jornada)
    .sort((a, b) => a.posicion - b.posicion);
}

/**
 * Identifica si un registro de clasificación corresponde al SD Indautxu.
 */
export function isIndautxuStanding(standing: OfficialStanding): boolean {
  if (!standing) return false;
  if (standing.club_id === INDAUTXU_CANONICAL_UUID) return true;
  if (standing.club?.rfef_club_id === INDAUTXU_RFEF_CLUB_ID) return true;
  const nombre = standing.club?.nombre?.toUpperCase() || '';
  return nombre.includes('INDAUTXU');
}

/**
 * Obtiene la trayectoria/histórico del SD Indautxu jornada a jornada ordenada ascendentemente.
 */
export function getIndautxuHistory(standings: OfficialStanding[]): OfficialStanding[] {
  if (!standings) return [];
  return standings
    .filter(isIndautxuStanding)
    .sort((a, b) => a.jornada - b.jornada);
}

/**
 * Obtiene la fila del SD Indautxu para una jornada específica (o la última si no se especifica).
 */
export function getIndautxuStandingForJornada(
  standings: OfficialStanding[],
  jornada?: number | null
): OfficialStanding | null {
  if (!standings || standings.length === 0) return null;
  const targetJornada = jornada ?? getUltimaJornada(standings);
  if (!targetJornada) return null;

  return (
    standings.find((s) => s.jornada === targetJornada && isIndautxuStanding(s)) ||
    null
  );
}
