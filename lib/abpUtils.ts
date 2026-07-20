/**
 * abpUtils.ts
 * Utilidades compartidas para el módulo ABP (Acciones a Balón Parado).
 */

export const ROLE_ABBRS: Record<string, string> = {
  'Lanzador': 'LAN',
  'Sacador': 'SAC',
  'Rematador': 'REM',
  'Bloqueador': 'BLOQ',
  'Arrastrador': 'ARR',
  'Rechace': 'RECH',
  'Cierre': 'CIER',
  'Primer palo': '1º PALO',
  'Segundo palo': '2º PALO',
  '1º palo': '1º PALO',
  '2º palo': '2º PALO',
  'Barrera': 'BARR',
  'Vigilancia': 'VIG',
  'Defensa zona': 'D.ZONA',
  'Marca individual': 'M.INDIV',
  'Libre': 'LIB',
  'Apoyo': 'APOYO',
  'Receptor': 'REC',
  'Cambio de orientación': 'C.ORI',
  'Profundidad': 'PROF',
  'Cobertura': 'COB'
};

/**
 * Normaliza nombres de roles de ABP de la base de datos para mostrar uniformemente en la UI y en PDFs.
 * Convierte "Primer palo" -> "1º palo" y "Segundo palo" -> "2º palo".
 */
export const normalizeRoleName = (role: string | null | undefined): string => {
  if (!role) return '';
  if (role === 'Primer palo') return '1º palo';
  if (role === 'Segundo palo') return '2º palo';
  return role;
};

/**
 * Normaliza etiquetas de rol de ABP de la base de datos para mostrar uniformemente.
 * Convierte "P.PALO", "1ºPALO" -> "1º PALO" y "S.PALO", "2ºPALO" -> "2º PALO".
 */
export const normalizeRoleLabel = (label: string | null | undefined): string => {
  if (!label) return '';
  const upper = label.trim().toUpperCase();
  if (upper === 'P.PALO' || upper === '1ºPALO' || upper === '1º PALO' || upper === 'PRIMER PALO') {
    return '1º PALO';
  }
  if (upper === 'S.PALO' || upper === '2ºPALO' || upper === '2º PALO' || upper === 'SEGUNDO PALO') {
    return '2º PALO';
  }
  return label;
};
