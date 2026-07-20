/**
 * abpUtils.ts
 * Utilidades compartidas para el módulo ABP (Acciones a Balón Parado).
 */

/**
 * Normaliza nombres de roles de ABP de la base de datos para mostrar uniformemente en la UI y en PDFs.
 * Convierte "Primer palo" -> "1º palo" y "Segundo palo" -> "2º palo".
 */
export const normalizeRoleName = (role: string): string => {
  if (!role) return role;
  if (role === 'Primer palo') return '1º palo';
  if (role === 'Segundo palo') return '2º palo';
  return role;
};
