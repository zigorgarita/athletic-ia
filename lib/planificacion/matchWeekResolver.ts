/**
 * Resolver canónico de semanas y rivales de Liga para eventos de entrenamiento
 * Regla de negocio V1: Cada evento se asocia al siguiente partido oficial de Liga (J1-J30)
 * dentro de un límite de microciclo de 0 a 6 días (deltaDias = fechaPartido - fechaEntrenamiento).
 * 
 * Partidos excluidos: J31-J38, amistosos, torneos, pretemporada.
 * Regla: SIEMPRE SUMAR. NUNCA BORRAR. NUNCA PERDER DATOS.
 */

export interface OfficialLeagueMatch {
  id: string;
  jornada: number;
  rival: string;
  fecha: string;
  es_local: boolean;
  competicion?: string | null;
  tipo_partido?: string | null;
}

export type MDTag = 'MD' | 'MD-1' | 'MD-2' | 'MD-3' | 'MD-4' | 'MD-5' | 'MD-6';

export interface MatchWeekContext {
  matchId: string;
  jornada: number;
  rival: string;
  esLocal: boolean;
  fechaPartido: string;
  deltaDias: number;
  mdTag: MDTag;
  labelJornada: string;
}

/**
 * Filtra rigurosamente los partidos para conservar única y exclusivamente
 * las 30 jornadas oficiales de Liga (J1 a J30), descartando amistosos, torneos y pretemporada.
 */
export function filterOfficialLeagueMatches(matches: Array<Record<string, unknown>>): OfficialLeagueMatch[] {
  if (!Array.isArray(matches)) return [];

  return matches
    .filter(m => {
      const jornada = Number(m.jornada);
      // Regla estricta: Solo J1 a J30
      if (isNaN(jornada) || jornada < 1 || jornada > 30) return false;
      if (!m.fecha || typeof m.fecha !== 'string') return false;

      const comp = typeof m.competicion === 'string' ? m.competicion.toLowerCase() : '';
      const tipo = typeof m.tipo_partido === 'string' ? m.tipo_partido.toLowerCase() : '';

      // Exclusión total de partidos no oficiales o amistosos
      if (tipo === 'amistoso') return false;
      if (comp && comp !== 'liga' && !comp.includes('liga')) return false;

      return true;
    })
    .map(m => ({
      id: String(m.id),
      jornada: Number(m.jornada),
      rival: String(m.rival || 'Rival').trim(),
      fecha: String(m.fecha).trim(),
      es_local: Boolean(m.es_local),
      competicion: typeof m.competicion === 'string' ? m.competicion : null,
      tipo_partido: typeof m.tipo_partido === 'string' ? m.tipo_partido : null
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Resuelve el partido oficial de Liga y la etiqueta MD correspondiente a una fecha de entrenamiento.
 * Devuelve null si la fecha no corresponde a un microciclo de Liga (deltaDias < 0 o deltaDias > 6).
 */
export function resolveMatchForTrainingEvent(
  fechaEntrenamiento: string,
  officialMatches: OfficialLeagueMatch[]
): MatchWeekContext | null {
  if (!fechaEntrenamiento || !Array.isArray(officialMatches) || officialMatches.length === 0) {
    return null;
  }

  // 1. Buscar el siguiente partido oficial de Liga (fechaPartido >= fechaEntrenamiento)
  const nextMatch = officialMatches.find(m => m.fecha >= fechaEntrenamiento);
  if (!nextMatch) return null;

  // 2. Calcular deltaDias = fechaPartido - fechaEntrenamiento usando fecha UTC neutra
  const partsE = fechaEntrenamiento.split('-').map(Number);
  const partsM = nextMatch.fecha.split('-').map(Number);
  if (partsE.length !== 3 || partsM.length !== 3) return null;

  const [fEYear, fEMonth, fEDay] = partsE;
  const [fMYear, fMMonth, fMDay] = partsM;

  const utcE = Date.UTC(fEYear, fEMonth - 1, fEDay);
  const utcM = Date.UTC(fMYear, fMMonth - 1, fMDay);

  const deltaDias = Math.round((utcM - utcE) / (1000 * 60 * 60 * 24));

  // 3. Límite canónico de microciclo: 0 a 6 días
  if (deltaDias < 0 || deltaDias > 6) {
    return null;
  }

  // 4. Mapeo determinista MD
  let mdTag: MDTag;
  switch (deltaDias) {
    case 0: mdTag = 'MD'; break;
    case 1: mdTag = 'MD-1'; break;
    case 2: mdTag = 'MD-2'; break;
    case 3: mdTag = 'MD-3'; break;
    case 4: mdTag = 'MD-4'; break;
    case 5: mdTag = 'MD-5'; break;
    case 6: mdTag = 'MD-6'; break;
    default: return null;
  }

  // Formato etiqueta: J2 · Santutxu F.C. · Casa · 12/09
  const mParts = nextMatch.fecha.split('-');
  const fechaCorta = `${mParts[2]}/${mParts[1]}`;
  const condicion = nextMatch.es_local ? 'Casa' : 'Fuera';
  const labelJornada = `J${nextMatch.jornada} · ${nextMatch.rival} · ${condicion} · ${fechaCorta}`;

  return {
    matchId: nextMatch.id,
    jornada: nextMatch.jornada,
    rival: nextMatch.rival,
    esLocal: nextMatch.es_local,
    fechaPartido: nextMatch.fecha,
    deltaDias,
    mdTag,
    labelJornada
  };
}
