/**
 * lib/die-ligen/mapping.ts
 *
 * Normalización y correspondencia controlada de equipos entre la app Indautxu y Die Ligen.
 *
 * Reglas estrictas:
 * - NO elimina prefijos arbitrarios (SD, CD, CF, KE).
 * - Normalización segura: minúsculas, eliminación de tildes/diacríticos, colapso de espacios y puntuación.
 * - Coincidencia exacta o resolución mediante diccionario de alias explícito y controlado.
 * - Evita cualquier selección ambigua.
 */

export function normalizeClubName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/[.,\-_/]/g, ' ')       // Sustituye signos de puntuación por espacios
    .replace(/\s+/g, ' ')            // Colapsa múltiples espacios
    .trim();
}

/**
 * Diccionario de equivalencias explícitas y controladas.
 * Clave: nombre normalizado de la app.
 * Valor: lista de nombres normalizados como pueden figurar en Die Ligen.
 */
export const DIE_LIGEN_CLUB_ALIASES: Record<string, string[]> = {
  'sd leioa': ['sd leioa', 'leioa sd', 'leioa', 's d leioa'],
  'arenas club': ['arenas club', 'arenas club de getxo', 'arenas', 'arenas club getxo'],
  'antiguoko ke': ['antiguoko ke', 'antiguoko c f', 'antiguoko cf', 'antiguoko', 'k e antiguoko'],
  'sd indautxu': ['sd indautxu', 'indautxu sd', 'indautxu', 's d indautxu'],
  'athletic club': ['athletic club', 'athletic club a', 'athletic', 'athletic club juvenil a'],
  'real sociedad': ['real sociedad', 'real sociedad de futbol', 'real sociedad a'],
  'deportivo alaves': ['deportivo alaves', 'alaves', 'd alaves', 'deportivo alaves a'],
  'sd eibar': ['sd eibar', 'eibar sd', 'eibar', 's d eibar'],
  'ca osasuna': ['ca osasuna', 'osasuna ca', 'osasuna', 'c a osasuna'],
  'danok bat cf': ['danok bat cf', 'danok bat c f', 'danok bat', 'c f danok bat'],
  'santutxu fc': ['santutxu fc', 'santutxu f c', 'santutxu', 'f c santutxu'],
  'cd vasconia': ['cd vasconia', 'vasconia cd', 'vasconia', 'c d vasconia'],
  'cd getxo': ['cd getxo', 'getxo cd', 'getxo', 'c d getxo'],
  'tolosa cf': ['tolosa cf', 'tolosa c f', 'tolosa', 'c f tolosa'],
  'ud logrones': ['ud logrones', 'logrones ud', 'logrones', 'u d logrones'],
  'cd tudelano': ['cd tudelano', 'tudelano cd', 'tudelano', 'c d tudelano'],
  'cd aurrera de vitoria': ['cd aurrera de vitoria', 'aurrera de vitoria', 'aurrera vitoria', 'cd aurrera vitoria'],
  'cd gazte berriak': ['cd gazte berriak', 'gazte berriak cd', 'gazte berriak'],
  'cd oberena': ['cd oberena', 'oberena cd', 'oberena'],
  'cd txantrea kke': ['cd txantrea kke', 'txantrea', 'cd txantrea'],
  'ad san juan': ['ad san juan', 'san juan ad', 'san juan'],
};

/**
 * Determina si el nombre de un equipo en un partido de Die Ligen corresponde al club objetivo.
 */
export function isMatchingDieLigenTeam(
  dieLigenTeamName: string | null | undefined,
  targetClubName: string,
  targetShortName?: string | null
): boolean {
  if (!dieLigenTeamName || !targetClubName) return false;

  const normDl = normalizeClubName(dieLigenTeamName);
  const normTarget = normalizeClubName(targetClubName);
  const normShort = targetShortName ? normalizeClubName(targetShortName) : '';

  // 1. Coincidencia exacta tras normalización
  if (normDl === normTarget) return true;
  if (normShort && normDl === normShort) return true;

  // 2. Comprobación en alias explícitos (búsqueda bidireccional)
  const targetAliases = DIE_LIGEN_CLUB_ALIASES[normTarget];
  if (targetAliases && targetAliases.includes(normDl)) {
    return true;
  }

  if (normShort) {
    const shortAliases = DIE_LIGEN_CLUB_ALIASES[normShort];
    if (shortAliases && shortAliases.includes(normDl)) {
      return true;
    }
  }

  // Comprobar si normDl está registrado como clave y apunta a normTarget
  const dlAliases = DIE_LIGEN_CLUB_ALIASES[normDl];
  if (dlAliases && (dlAliases.includes(normTarget) || (normShort && dlAliases.includes(normShort)))) {
    return true;
  }

  return false;
}

export interface DieLigenTeamMatchItem {
  gameId: string;
  jornada: number;
  roundName?: string;
  homeTeam: { id?: string; name: string };
  awayTeam: { id?: string; name: string };
  isHome: boolean;
  opponentName: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  scoreFormatted?: string;
  analysisStatus: string;
  isAnalyzed: boolean;
}
