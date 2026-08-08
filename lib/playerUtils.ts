import { Player } from '@/types';

export type PlayerNameContext = 'tactical' | 'full';

/**
 * Devuelve el nombre formateado del jugador según el contexto:
 * - 'tactical' (ABP, Pizarra, Alineaciones, Drag & Drop): Usa `alias` si existe; si no, fallback al primer nombre corto.
 * - 'full' (Fichas administrativas, Informes oficiales, Asistencia, Lesiones, Multas): Usa `nombre` + `apellidos`.
 */
export function getPlayerDisplayName(
  player: Pick<Player, 'nombre' | 'apellidos' | 'alias'> | null | undefined,
  context: PlayerNameContext = 'tactical'
): string {
  if (!player) return 'Sin Asignar';

  if (context === 'tactical') {
    if (player.alias && typeof player.alias === 'string' && player.alias.trim() !== '') {
      return player.alias.trim();
    }
    // Fallback seguro al primer nombre
    return player.nombre ? player.nombre.trim().split(' ')[0] : 'Jugador';
  }

  // Contexto administrativo / oficial
  const fullName = `${player.nombre || ''} ${player.apellidos || ''}`.trim();
  return fullName || 'Jugador Desconocido';
}
