/**
 * Helper centralizado para gestión y obtención de la temporada activa en la aplicación.
 * Permite configuración dinámica vía variables de entorno (NEXT_PUBLIC_ACTIVE_SEASON / ACTIVE_SEASON)
 * o selector de temporada en cliente/servidor.
 */

export const DEFAULT_SEASON = process.env.NEXT_PUBLIC_ACTIVE_SEASON || process.env.ACTIVE_SEASON || '2026-27';

export function getActiveSeason(): string {
  return process.env.NEXT_PUBLIC_ACTIVE_SEASON || process.env.ACTIVE_SEASON || DEFAULT_SEASON;
}

export function getAvailableSeasons(): string[] {
  return ['2025-26', '2026-27', '2027-28'];
}
