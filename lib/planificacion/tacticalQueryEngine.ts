/**
 * Motor de Consulta Táctica Conversacional V1 — Athletic IA
 * 
 * Reglas de negocio:
 * 1. Cero invención: Responde exclusivamente a partir de evidencias reales registradas.
 * 2. DOCUMENTADO ≠ EJECUTADA_CONFIRMADA:
 *    - Registros documentados de pretemporada/liga (PDF) se reportan como "registros documentados (PDF)".
 *    - Reutilizaciones activas en el planificador se reportan como "reutilizaciones operativas".
 * 3. Separación estricta de métricas:
 *    - Sesiones/días distintos ≠ Número de tareas registradas.
 * 4. Trazabilidad obligatoria:
 *    - Cada respuesta incluye un sello exacto de evidencias consultadas.
 * 5. Guardrails:
 *    - Consultas fuera de alcance (causalidad, asistencia individual, recomendaciones abiertas)
 *      reciben una respuesta transparente y estructurada.
 */

import {
  CANONICAL_TO_FAMILY_MAP
} from '@/lib/planificacion/tacticalDictionary';
import { MDTag, OfficialLeagueMatch } from '@/lib/planificacion/matchWeekResolver';
import { PlanningTaskLibrary } from '@/types';
import { TaskEvent, ConceptMetricRow } from '@/hooks/useLibraryAnalytics';

export interface QueryEngineContext {
  events: TaskEvent[];
  conceptMetrics: ConceptMetricRow[];
  libraryTasks: PlanningTaskLibrary[];
  conceptApprovedTasksMap: Map<string, PlanningTaskLibrary[]>;
  taskConceptsMap: Map<string, string[]>;
  officialLeagueMatches: OfficialLeagueMatch[];
  todayStr?: string;
}

export interface QueryResultTrace {
  sesionesCount: number;
  tareasCount: number;
  docPdfCount: number;
  reuseCount: number;
  detalle: string;
}

export interface QueryResult {
  tipo: 'success' | 'no_data' | 'unsupported' | 'clarification';
  preguntaOriginal: string;
  intencionDetectada: string;
  respuesta: string;
  trazabilidad?: QueryResultTrace;
  detalles?: Array<{
    etiqueta: string;
    valor: string | number;
  }>;
  sugerencias?: string[];
}

// ── UTILIDADES DE NORMALIZACIÓN Y BÚSQUEDA ──

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Todos los 63 conceptos canónicos */
export const ALL_CANONICAL_CONCEPTS: string[] = Object.keys(CANONICAL_TO_FAMILY_MAP);

/** Sinónimos o equivalencias inequívocas */
const CANONICAL_ALIASES: Record<string, string> = {
  'ptp': 'Presión Tras Pérdida (PTP)',
  'presion tras perdida': 'Presión Tras Pérdida (PTP)',
  'ptp rondo': 'Presión Tras Pérdida (PTP)',
  'transicion ofensiva': 'Transición Ofensiva',
  'transicion defensiva': 'Transición Defensiva',
  'ataque posicional': 'Ataque Posicional',
  'salida de balon': 'Salida de Balón',
  'pase a jugador profundo': 'Pase a Jugador Profundo',
  'jugador profundo': 'Pase a Jugador Profundo',
  'duelo 1v1': 'Duelo 1v1',
  '1v1': 'Duelo 1v1',
  'tercer hombre': 'Tercer Hombre',
  'bloque defensivo': 'Bloque Defensivo',
  'bloque bajo': 'Bloque Bajo',
  'bloque medio': 'Bloque Medio',
  'presion alta': 'Presión Alta',
  'presion colectiva': 'Presión Colectiva',
  'defensa de centros': 'Defensa de Centros',
  'tiro a puerta': 'Tiro a Puerta',
  'centros al area': 'Centros al Área',
  'juego aereo': 'Juego Aéreo',
  'segunda jugada': 'Segunda Jugada',
  'estructura 1-4-2-3-1': 'Estructura 1-4-2-3-1',
  '1-4-2-3-1': 'Estructura 1-4-2-3-1',
  '14231': 'Estructura 1-4-2-3-1'
};

/** Intenta reconocer de forma inequívoca uno de los 63 conceptos canónicos */
function findCanonicalConceptInQuery(queryNorm: string): string | null {
  // 1. Alias exacto o frase
  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const aliasNorm = normalizeText(alias);
    const regex = new RegExp(`(^|\\b|\\s)${aliasNorm}(\\b|\\s|$)`, 'i');
    if (regex.test(queryNorm)) {
      return canonical;
    }
  }

  // 2. Coincidencia con nombre canónico completo
  for (const concept of ALL_CANONICAL_CONCEPTS) {
    const conceptNorm = normalizeText(concept);
    if (queryNorm.includes(conceptNorm)) {
      return concept;
    }
  }

  // 3. Coincidencia con parte canónica sin paréntesis
  for (const concept of ALL_CANONICAL_CONCEPTS) {
    const clean = concept.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (clean.length > 4) {
      const cleanNorm = normalizeText(clean);
      const regex = new RegExp(`(^|\\b|\\s)${cleanNorm}(\\b|\\s|$)`, 'i');
      if (regex.test(queryNorm)) {
        return concept;
      }
    }
  }

  return null;
}

/** Detecta mención a una jornada oficial (J1 a J30) */
function findJornadaInQuery(queryNorm: string): number | null {
  const match = queryNorm.match(/(?:jornada|j)\s*(\d{1,2})\b/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 30) return num;
  }
  return null;
}

/** Detecta mención a un rival de la liga */
function findRivalInQuery(queryNorm: string, matches: OfficialLeagueMatch[]): OfficialLeagueMatch | null {
  for (const m of matches) {
    const rivalNorm = normalizeText(m.rival);
    if (rivalNorm.length > 2 && queryNorm.includes(rivalNorm)) {
      return m;
    }
  }
  // Búsquedas comunes conocidas
  const rivalesComunes: Record<string, string> = {
    'santutxu': 'santutxu',
    'leioa': 'leioa',
    'real sociedad': 'real sociedad',
    'eibar': 'eibar',
    'alaves': 'alaves',
    'danok bat': 'danok bat',
    'arratia': 'arratia',
    'cultural leonesa': 'cultural leonesa',
    'logrones': 'logroñes'
  };
  for (const [slug, term] of Object.entries(rivalesComunes)) {
    if (queryNorm.includes(slug)) {
      const found = matches.find(m => normalizeText(m.rival).includes(term));
      if (found) return found;
    }
  }
  return null;
}

/** Detecta mención a un día de microciclo MD */
function findMdTagInQuery(queryNorm: string): MDTag | null {
  const match = queryNorm.match(/\bmd\s*-\s*([1-6])\b/i);
  if (match) {
    return `MD-${match[1]}` as MDTag;
  }
  if (/\bmd\b/i.test(queryNorm) && !/md\s*-\s*\d/i.test(queryNorm)) {
    return 'MD';
  }
  return null;
}

/** Detecta filtros de periodo temporal */
function findPeriodInQuery(queryNorm: string): '15d' | '30d' | 'temporada' | 'septiembre' | null {
  if (queryNorm.includes('15 dias') || queryNorm.includes('ultimos 15')) return '15d';
  if (queryNorm.includes('30 dias') || queryNorm.includes('ultimos 30') || queryNorm.includes('ultimo mes') || queryNorm.includes('este mes')) return '30d';
  if (queryNorm.includes('desde septiembre') || queryNorm.includes('en septiembre')) return 'septiembre';
  if (queryNorm.includes('temporada') || queryNorm.includes('todo el ano') || queryNorm.includes('toda la temporada')) return 'temporada';
  return null;
}

/** Encuentra todos los conceptos canónicos presentes en el texto ordenados por aparición */
function findAllCanonicalConceptsInQuery(queryNorm: string): string[] {
  const found: Array<{ concept: string; index: number; length: number }> = [];

  // 1. Alias
  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const aliasNorm = normalizeText(alias);
    const regex = new RegExp(`(^|\\b|\\s)${aliasNorm}(\\b|\\s|$)`, 'gi');
    let match;
    while ((match = regex.exec(queryNorm)) !== null) {
      if (!found.some(f => f.concept === canonical)) {
        found.push({ concept: canonical, index: match.index, length: aliasNorm.length });
      }
    }
  }

  // 2. Nombres canónicos exactos
  for (const concept of ALL_CANONICAL_CONCEPTS) {
    const conceptNorm = normalizeText(concept);
    const regex = new RegExp(`(^|\\b|\\s)${conceptNorm}(\\b|\\s|$)`, 'gi');
    let match;
    while ((match = regex.exec(queryNorm)) !== null) {
      if (!found.some(f => f.concept === concept)) {
        found.push({ concept, index: match.index, length: conceptNorm.length });
      }
    }
  }

  // 3. Parte canónica sin paréntesis
  for (const concept of ALL_CANONICAL_CONCEPTS) {
    const clean = concept.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (clean.length > 4) {
      const cleanNorm = normalizeText(clean);
      const regex = new RegExp(`(^|\\b|\\s)${cleanNorm}(\\b|\\s|$)`, 'gi');
      let match;
      while ((match = regex.exec(queryNorm)) !== null) {
        if (!found.some(f => f.concept === concept)) {
          found.push({ concept, index: match.index, length: cleanNorm.length });
        }
      }
    }
  }

  found.sort((a, b) => a.index - b.index);
  return found.map(f => f.concept);
}

/** Extrae dos candidatos a concepto en preguntas de comparación determinista */
function extractTwoConceptCandidates(query: string): [string, string] | null {
  const clean = query.replace(/^[¿?\s]+/, '');

  // 1. Cuanto X y cuanto Y
  const m1 = clean.match(/cu[aá]nto(?:s)?(?:\s+(?:hemos\s+entrenado|se\s+ha\s+trabajado|hemos\s+trabajado|se\s+ha\s+entrenado|tenemos|hay))?\s+(?:de\s+)?(.+?)\s+y\s+cu[aá]nto(?:s)?(?:\s+(?:hemos\s+entrenado|se\s+ha\s+trabajado|hemos\s+trabajado|se\s+ha\s+entrenado|tenemos|hay))?\s+(?:de\s+)?(.+?)(?:\s+esta\s+temporada|\s+en\s+los|\s+en\s+la|\s+en\s+el|\s+en\s+septiembre|\s+en|\s+ultimos|\?|\.|$)/i);
  if (m1) {
    return [m1[1].trim(), m1[2].trim()];
  }

  // 2. Que hemos entrenado mas, X o Y
  const m2 = clean.match(/qu[eé]\s+(?:hemos\s+entrenado|se\s+ha\s+trabajado|se\s+ha\s+entrenado)\s+m[aá]s,?\s*(?:de\s+)?(.+?)\s+o\s+(?:de\s+)?(.+?)(?:\s+esta\s+temporada|\s+en\s+los|\s+en\s+la|\s+en\s+el|\s+en|\s+ultimos|\?|\.|$)/i);
  if (m2) {
    return [m2[1].trim(), m2[2].trim()];
  }

  // 3. Compara / comparativa / diferencia entre X y/con/vs Y
  const m3 = clean.match(/(?:compara|comparar|comparativa|diferencia\s+entre)\s+(?:de\s+|el\s+|la\s+)?(.+?)\s+(?:y|con|frente\s+a|vs\.?)\s+(?:de\s+|el\s+|la\s+)?(.+?)(?:\s+esta\s+temporada|\s+en\s+los|\s+en\s+la|\s+en\s+el|\s+en\s+septiembre|\s+en|\s+ultimos|\?|\.|$)/i);
  if (m3) {
    return [m3[1].trim(), m3[2].trim()];
  }

  // 4. X vs Y
  const m4 = clean.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+esta\s+temporada|\s+en\s+los|\s+en\s+la|\s+en\s+el|\s+en|\s+ultimos|\?|\.|$)/i);
  if (m4) {
    return [m4[1].trim(), m4[2].trim()];
  }

  return null;
}

/** Extrae un término candidato a concepto cuando el usuario pregunta por él directamente */
function extractSingleConceptCandidate(query: string): string | null {
  const clean = query.replace(/^[¿?\s]+/, '').trim();
  const m = clean.match(/cu[aá]nto(?:s)?(?:\s+(?:hemos\s+entrenado|se\s+ha\s+trabajado|hemos\s+trabajado|se\s+ha\s+entrenado|tenemos|hay))?\s+(?:de\s+)?(.+?)(?:\s+esta\s+temporada|\s+en\s+los|\s+en\s+la|\s+en\s+el|\s+en\s+septiembre|\s+en|\s+ultimos|\?|\.|$)/i);
  if (m) {
    const cand = m[1].trim();
    if (cand.length > 2 && !/^(conceptos|tiempo|sesiones|tareas|este|esta)/i.test(cand)) {
      return cand;
    }
  }
  return null;
}

/**
 * Manejador determinista para comparación de dos conceptos tácticos en un mismo periodo.
 * Soporta:
 * - Sesiones distintas con registro (X / total).
 * - Porcentaje sobre el total de sesiones de registro del periodo.
 * - Número de tareas asociadas.
 * - Última fecha registrada (DD/MM/AAAA).
 * - Origen: doc. PDF / reutilización / ambos.
 * - Si uno o ambos términos no son canónicos, no asume equivalencias:
 *   lo indica explícitamente y solicita aclaración.
 */
function handleTwoConceptsComparison(
  query: string,
  raw1: string,
  raw2: string,
  context: QueryEngineContext,
  detectedPeriod: '15d' | '30d' | 'temporada' | 'septiembre' | null
): QueryResult {
  const cleanRaw1 = raw1.replace(/^["'«“\s]+|["'»”\s]+$/g, '').trim();
  const cleanRaw2 = raw2.replace(/^["'«“\s]+|["'»”\s]+$/g, '').trim();

  const canonical1 = findCanonicalConceptInQuery(normalizeText(cleanRaw1));
  const canonical2 = findCanonicalConceptInQuery(normalizeText(cleanRaw2));

  let periodEvents = context.events;
  let labelPeriodo = 'la temporada completa';

  if (detectedPeriod === '15d') {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    const minDate = d.toISOString().slice(0, 10);
    periodEvents = periodEvents.filter(e => e.fecha >= minDate);
    labelPeriodo = 'los últimos 15 días';
  } else if (detectedPeriod === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const minDate = d.toISOString().slice(0, 10);
    periodEvents = periodEvents.filter(e => e.fecha >= minDate);
    labelPeriodo = 'los últimos 30 días';
  } else if (detectedPeriod === 'septiembre') {
    periodEvents = periodEvents.filter(e => e.fecha >= '2026-09-01' && e.fecha <= '2026-09-30');
    labelPeriodo = 'septiembre';
  }

  const uniqueDates = Array.from(new Set(periodEvents.map(e => e.fecha))).sort();
  const totalSesiones = uniqueDates.length;

  if (totalSesiones === 0) {
    return {
      tipo: 'no_data',
      preguntaOriginal: query,
      intencionDetectada: `Comparativa de conceptos en ${labelPeriodo}`,
      respuesta: `No hay registros documentados ni reutilizaciones en ${labelPeriodo} en Athletic IA.`
    };
  }

  function evaluateConcept(raw: string, canonical: string | null) {
    if (!canonical) {
      return {
        raw,
        canonical: null,
        sesionesCount: 0,
        pctFormatted: '0,0 %',
        tareasCount: 0,
        docCount: 0,
        reuseCount: 0,
        ultimaFechaFormateada: 'sin registro',
        origenTexto: 'no canónico',
        isCanonical: false,
        linea: `• "${raw}" — No figura como concepto canónico en el catálogo oficial de 63 conceptos de Athletic IA. Para mantener el rigor metodológico no se asumen equivalencias automáticas sin confirmación; por favor, especifica un concepto canónico oficial (ej. Ataque Posicional, Estructura de Juego, etc.).`
      };
    }

    const approvedTasks = context.conceptApprovedTasksMap.get(canonical.trim()) || [];
    const taskIds = new Set(approvedTasks.map(t => t.id));
    const matchingEvents = periodEvents.filter(e => taskIds.has(e.library_task_id));
    const sesionesSet = new Set(matchingEvents.map(e => e.fecha));
    const sesionesCount = sesionesSet.size;
    const tareasCount = matchingEvents.length;
    const pct = totalSesiones > 0 ? (sesionesCount / totalSesiones) * 100 : 0;
    const pctFormatted = pct.toFixed(1).replace('.', ',') + ' %';

    const docCount = matchingEvents.filter(e => e.source === 'historical').length;
    const reuseCount = matchingEvents.filter(e => e.source === 'reuse').length;

    let origenTexto = 'sin registros en el periodo';
    if (docCount > 0 && reuseCount > 0) {
      origenTexto = 'ambos (doc. PDF + reutilización)';
    } else if (docCount > 0) {
      origenTexto = 'doc. PDF';
    } else if (reuseCount > 0) {
      origenTexto = 'reutilización';
    }

    const fechasOrdenadas = Array.from(sesionesSet).sort();
    const ultimaFecha = fechasOrdenadas.length > 0 ? fechasOrdenadas[fechasOrdenadas.length - 1] : null;
    let ultimaFechaFormateada = 'sin registro en el periodo';
    if (ultimaFecha) {
      const parts = ultimaFecha.split('-');
      if (parts.length === 3) {
        ultimaFechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    let linea: string;
    if (sesionesCount === 0) {
      linea = `• ${canonical} — 0/${totalSesiones} sesiones · 0,0 % · 0 tareas · Sin registros en el periodo`;
    } else {
      linea = `• ${canonical} — ${sesionesCount}/${totalSesiones} sesiones · ${pctFormatted} · ${tareasCount} ${tareasCount === 1 ? 'tarea' : 'tareas'} · último reg. ${ultimaFechaFormateada} · origen: ${origenTexto}`;
    }

    return {
      raw,
      canonical,
      sesionesCount,
      pctFormatted,
      tareasCount,
      docCount,
      reuseCount,
      ultimaFechaFormateada,
      origenTexto,
      isCanonical: true,
      linea
    };
  }

  const eval1 = evaluateConcept(cleanRaw1, canonical1);
  const eval2 = evaluateConcept(cleanRaw2, canonical2);

  const hasNonCanonical = !eval1.isCanonical || !eval2.isCanonical;
  const allNonCanonical = !eval1.isCanonical && !eval2.isCanonical;

  const lineas: string[] = [];
  lineas.push(`En ${labelPeriodo} constan ${totalSesiones} sesiones con registro en Athletic IA.\n`);
  lineas.push(`Comparativa de conceptos solicitada:`);
  lineas.push(eval1.linea);
  lineas.push(eval2.linea);

  return {
    tipo: hasNonCanonical ? 'clarification' : 'success',
    preguntaOriginal: query,
    intencionDetectada: allNonCanonical
      ? 'Consulta de conceptos no canónicos'
      : hasNonCanonical
      ? `Comparativa y aclaración metodológica (${labelPeriodo})`
      : `Comparativa: ${eval1.canonical} vs ${eval2.canonical} (${labelPeriodo})`,
    respuesta: lineas.join('\n'),
    trazabilidad: {
      sesionesCount: totalSesiones,
      tareasCount: eval1.tareasCount + eval2.tareasCount,
      docPdfCount: eval1.docCount + eval2.docCount,
      reuseCount: eval1.reuseCount + eval2.reuseCount,
      detalle: `Comparativa: ${cleanRaw1} vs ${cleanRaw2} · ${labelPeriodo}`
    },
    detalles: [
      { etiqueta: 'Periodo', valor: labelPeriodo },
      { etiqueta: 'Total sesiones', valor: totalSesiones },
      {
        etiqueta: eval1.canonical || cleanRaw1,
        valor: eval1.isCanonical ? `${eval1.sesionesCount}/${totalSesiones} (${eval1.pctFormatted})` : 'No canónico'
      },
      {
        etiqueta: eval2.canonical || cleanRaw2,
        valor: eval2.isCanonical ? `${eval2.sesionesCount}/${totalSesiones} (${eval2.pctFormatted})` : 'No canónico'
      }
    ]
  };
}

/**
 * Manejador determinista para rankings y porcentajes de presencia por sesión.
 * Regla metodológica estricta:
 * porcentaje = sesiones_distintas_en_que_aparece_el_concepto / total_sesiones_con_registro_del_periodo × 100
 * Un concepto cuenta como máximo 1 vez por sesión, aunque aparezca en varias tareas.
 */
function handleRankingAndPercentages(
  query: string,
  qNorm: string,
  context: QueryEngineContext,
  detectedPeriod: '15d' | '30d' | 'temporada' | 'septiembre' | null,
  isAskingMoreAndLess: boolean
): QueryResult {
  let periodEvents = context.events;
  let labelPeriodo = 'la temporada completa';

  if (detectedPeriod === '15d' || qNorm.includes('15 dias') || qNorm.includes('ultimos 15')) {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    const minDate = d.toISOString().slice(0, 10);
    periodEvents = periodEvents.filter(e => e.fecha >= minDate);
    labelPeriodo = 'los últimos 15 días';
  } else if (detectedPeriod === '30d' || qNorm.includes('30 dias') || qNorm.includes('ultimos 30') || qNorm.includes('mes')) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const minDate = d.toISOString().slice(0, 10);
    periodEvents = periodEvents.filter(e => e.fecha >= minDate);
    labelPeriodo = 'los últimos 30 días';
  } else if (detectedPeriod === 'septiembre' || qNorm.includes('septiembre')) {
    periodEvents = periodEvents.filter(e => e.fecha >= '2026-09-01' && e.fecha <= '2026-09-30');
    labelPeriodo = 'septiembre';
  }

  const uniqueDates = Array.from(new Set(periodEvents.map(e => e.fecha))).sort();
  const totalSesiones = uniqueDates.length;
  const docCount = periodEvents.filter(e => e.source === 'historical').length;
  const reuseCount = periodEvents.filter(e => e.source === 'reuse').length;

  if (totalSesiones === 0) {
    return {
      tipo: 'no_data',
      preguntaOriginal: query,
      intencionDetectada: `Distribución táctica en ${labelPeriodo}`,
      respuesta: `No hay registros documentados ni reutilizaciones en ${labelPeriodo} en Athletic IA.`
    };
  }

  interface ConceptStat {
    concepto: string;
    sesionesCount: number;
    tareasCount: number;
    pct: number;
    pctFormatted: string;
  }

  const stats: ConceptStat[] = ALL_CANONICAL_CONCEPTS.map(concepto => {
    const approvedTasks = context.conceptApprovedTasksMap.get(concepto.trim()) || [];
    const taskIds = new Set(approvedTasks.map(t => t.id));
    const matchingEvents = periodEvents.filter(e => taskIds.has(e.library_task_id));
    const sesionesSet = new Set(matchingEvents.map(e => e.fecha));
    const sesionesCount = sesionesSet.size;
    const tareasCount = matchingEvents.length;
    const pct = totalSesiones > 0 ? (sesionesCount / totalSesiones) * 100 : 0;
    const pctFormatted = pct.toFixed(1).replace('.', ',') + ' %';

    return {
      concepto,
      sesionesCount,
      tareasCount,
      pct,
      pctFormatted
    };
  });

  const conRegistro = stats.filter(s => s.sesionesCount > 0);
  const sinRegistro = stats.filter(s => s.sesionesCount === 0);

  // Ordenar estrictamente de mayor a menor porcentaje, luego por tareas
  conRegistro.sort((a, b) => b.sesionesCount - a.sesionesCount || b.tareasCount - a.tareasCount || a.concepto.localeCompare(b.concepto));

  const isOnlyAskingLess = !isAskingMoreAndLess && /(?:menos|menor|menor\s+presencia|menos\s+entrenados)/i.test(qNorm);

  const lineas: string[] = [];
  lineas.push(`En ${labelPeriodo} constan ${totalSesiones} sesiones distintas con registro y ${periodEvents.length} tareas registradas sobre los 63 conceptos canónicos:`);

  if (isAskingMoreAndLess) {
    // 1. Mayor porcentaje
    const topCount = Math.min(5, conRegistro.length);
    const topItems = conRegistro.slice(0, topCount);
    lineas.push(`\n• Mayor porcentaje de presencia por sesión (ordenado de mayor a menor):`);
    topItems.forEach((c, idx) => {
      lineas.push(`${idx + 1}. ${c.concepto} — ${c.sesionesCount}/${totalSesiones} sesiones · ${c.pctFormatted} (${c.tareasCount} ${c.tareasCount === 1 ? 'tarea' : 'tareas'})`);
    });

    // 2. Menor porcentaje (> 0)
    if (conRegistro.length > topCount) {
      const bottomCount = Math.min(4, Math.max(1, conRegistro.length - topCount));
      const bottomItems = [...conRegistro].reverse().slice(0, bottomCount);
      lineas.push(`\n• Menor presencia registrada (> 0 %):`);
      bottomItems.forEach(c => {
        lineas.push(`- ${c.concepto} — ${c.sesionesCount}/${totalSesiones} sesiones · ${c.pctFormatted} (${c.tareasCount} ${c.tareasCount === 1 ? 'tarea' : 'tareas'})`);
      });
    }

    // 3. Sin registros en el periodo (0 %)
    lineas.push(`\n• Sin registros en el periodo (0 %):`);
    const muestraSin = sinRegistro.slice(0, 5).map(c => c.concepto).join(', ');
    lineas.push(`${sinRegistro.length} conceptos de los 63 canónicos cuentan con 0 % de presencia en el periodo (ej. ${muestraSin}${sinRegistro.length > 5 ? '...' : ''}).`);
  } else if (isOnlyAskingLess) {
    const bottomItems = [...conRegistro].reverse().slice(0, 5);
    lineas.push(`\n• Menor presencia registrada (> 0 %):`);
    bottomItems.forEach((c, idx) => {
      lineas.push(`${idx + 1}. ${c.concepto} — ${c.sesionesCount}/${totalSesiones} sesiones · ${c.pctFormatted} (${c.tareasCount} ${c.tareasCount === 1 ? 'tarea' : 'tareas'})`);
    });

    lineas.push(`\n• Sin registros en el periodo (0 %):`);
    const muestraSin = sinRegistro.slice(0, 5).map(c => c.concepto).join(', ');
    lineas.push(`${sinRegistro.length} conceptos de los 63 canónicos cuentan con 0 % de presencia en el periodo (ej. ${muestraSin}${sinRegistro.length > 5 ? '...' : ''}).`);
  } else {
    // Mayor presencia / ranking general con porcentaje
    const topCount = Math.min(6, conRegistro.length);
    const topItems = conRegistro.slice(0, topCount);
    lineas.push(`\n• Distribución de mayor a menor porcentaje de presencia:`);
    topItems.forEach((c, idx) => {
      lineas.push(`${idx + 1}. ${c.concepto} — ${c.sesionesCount}/${totalSesiones} sesiones · ${c.pctFormatted} (${c.tareasCount} ${c.tareasCount === 1 ? 'tarea' : 'tareas'})`);
    });

    lineas.push(`\n• Sin registros en el periodo (0 %):`);
    const muestraSin = sinRegistro.slice(0, 5).map(c => c.concepto).join(', ');
    lineas.push(`${sinRegistro.length} conceptos cuentan con 0 % de presencia en el periodo (ej. ${muestraSin}${sinRegistro.length > 5 ? '...' : ''}).`);
  }

  return {
    tipo: 'success',
    preguntaOriginal: query,
    intencionDetectada: isAskingMoreAndLess
      ? `Conceptos con mayor y menor presencia en porcentaje (${labelPeriodo})`
      : `Ranking de conceptos en porcentaje sobre sesiones (${labelPeriodo})`,
    respuesta: lineas.join('\n'),
    trazabilidad: {
      sesionesCount: totalSesiones,
      tareasCount: periodEvents.length,
      docPdfCount: docCount,
      reuseCount: reuseCount,
      detalle: `Porcentaje sobre ${totalSesiones} sesiones con registro · 63 conceptos auditados`
    },
    detalles: [
      { etiqueta: 'Periodo', valor: labelPeriodo },
      { etiqueta: 'Total sesiones', valor: totalSesiones },
      { etiqueta: 'Conceptos con presencia', valor: `${conRegistro.length} / 63` },
      { etiqueta: 'Sin registros', valor: `${sinRegistro.length} / 63` }
    ]
  };
}

// ── MOTOR PRINCIPAL DE EJECUCIÓN DE CONSULTA ──

export function executeTacticalQuery(
  rawQuery: string,
  context: QueryEngineContext
): QueryResult {
  const query = rawQuery.trim();
  const qNorm = normalizeText(query);
  const today = context.todayStr || new Date().toISOString().slice(0, 10);

  // 1. GUARDRAILS: Preguntas no soportadas metodológicamente
  if (/(qui[eé]n\s+(jug[oó]|jugador|entren[oó]|estuvo|asisti[oó])|rendimiento|asistencia\s+individual|mejor\s+jugador)/i.test(qNorm)) {
    return {
      tipo: 'unsupported',
      preguntaOriginal: query,
      intencionDetectada: 'Rendimiento o asistencia individual de jugadores',
      respuesta: 'Esta consulta requiere datos de rendimiento individual o asistencia que no forman parte de la analítica táctica de tareas. Para asistencia y valoraciones de jugadores, consulta el módulo de Asistencia.'
    };
  }

  if (/(por\s*qu[eé]\s+(perdimos|ganamos|no\s+funcion[oó]|fall[oó]|encajamos|perdimos))/i.test(qNorm)) {
    return {
      tipo: 'unsupported',
      preguntaOriginal: query,
      intencionDetectada: 'Causalidad o juicio subjetivo de partido',
      respuesta: 'Athletic IA no realiza deducciones de causalidad deportiva abierta ni juicios subjetivos. Los datos registrados reflejan qué tareas y conceptos se trabajaron de forma objetiva.'
    };
  }

  if (/(qu[eé]\s+(debo|deber[ií]amos|entrenar\s+mañana|recomiendas|prop[oó]n|recomiendame))/i.test(qNorm)) {
    return {
      tipo: 'unsupported',
      preguntaOriginal: query,
      intencionDetectada: 'Recomendación prescriptiva abierta',
      respuesta: 'Para obtener recomendaciones directas de tareas según concepto y rotación de registros, utiliza la herramienta oficial "Quiero Entrenar…" disponible en la Biblioteca.',
      sugerencias: [
        '¿Qué hemos entrenado los últimos 15 días?',
        '¿Cuándo se registró por última vez Presión Tras Pérdida?'
      ]
    };
  }

  if (/(valoraci[oó]n\s+de\s+tarea|c[oó]mo\s+se\s+valor[oó])/i.test(qNorm)) {
    return {
      tipo: 'unsupported',
      preguntaOriginal: query,
      intencionDetectada: 'Valoraciones operativas post-entreno',
      respuesta: 'Las valoraciones de feedback de tareas están en fase de diseño metodológico y no forman parte de las consultas disponibles en esta versión.'
    };
  }

  // 2. EXTRACCIÓN DE ENTIDADES / SLOTS
  const detectedConcept = findCanonicalConceptInQuery(qNorm);
  const detectedJornada = findJornadaInQuery(qNorm);
  const detectedRivalMatch = findRivalInQuery(qNorm, context.officialLeagueMatches);
  const detectedMdTag = findMdTagInQuery(qNorm);
  const detectedPeriod = findPeriodInQuery(qNorm);

  const twoConceptCandidates = extractTwoConceptCandidates(query);
  const allCanonicalInQuery = findAllCanonicalConceptsInQuery(qNorm);

  // ─────────────────────────────────────────────────────────────
  // CASO COMPARATIVO: COMPARACIÓN DETERMINISTA DE DOS CONCEPTOS
  // ─────────────────────────────────────────────────────────────
  if (twoConceptCandidates) {
    return handleTwoConceptsComparison(
      query,
      twoConceptCandidates[0],
      twoConceptCandidates[1],
      context,
      detectedPeriod
    );
  }

  if (allCanonicalInQuery.length >= 2 && !detectedRivalMatch && detectedJornada === null) {
    return handleTwoConceptsComparison(
      query,
      allCanonicalInQuery[0],
      allCanonicalInQuery[1],
      context,
      detectedPeriod
    );
  }

  // Guardrail para consulta sobre término no reconocido en catálogo
  const singleCandidate = extractSingleConceptCandidate(query);
  if (singleCandidate && !detectedConcept && !detectedRivalMatch && detectedJornada === null && !detectedMdTag) {
    const isKnownNonCanonical = findCanonicalConceptInQuery(normalizeText(singleCandidate)) === null;
    if (isKnownNonCanonical) {
      return {
        tipo: 'clarification',
        preguntaOriginal: query,
        intencionDetectada: `Concepto no reconocido ("${singleCandidate}")`,
        respuesta: `El término "${singleCandidate}" no figura como concepto canónico en el catálogo oficial de 63 conceptos de Athletic IA. Para preservar el rigor metodológico no se asumen equivalencias automáticas sin confirmación; por favor, formula la consulta indicando un concepto canónico oficial (ej. Ataque Posicional, Estructura de Juego, Salida de Balón, etc.).`,
        detalles: [
          { etiqueta: 'Término consultado', valor: singleCandidate },
          { etiqueta: 'Catálogo oficial', valor: '63 conceptos canónicos' },
          { etiqueta: 'Estado', valor: 'No canónico (sin equivalencia asumida)' }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CASO A: CONSULTA POR RIVAL O JORNADA DE LIGA
  // ─────────────────────────────────────────────────────────────
  if (detectedRivalMatch || detectedJornada !== null) {
    const targetJornada = detectedJornada ?? detectedRivalMatch?.jornada ?? null;
    const match = targetJornada
      ? context.officialLeagueMatches.find(m => m.jornada === targetJornada)
      : detectedRivalMatch;

    if (!match) {
      return {
        tipo: 'no_data',
        preguntaOriginal: query,
        intencionDetectada: 'Consulta por rival o jornada',
        respuesta: `No se encontraron datos registrados para la jornada ${targetJornada || 'solicitada'} en las 30 jornadas oficiales de Liga.`
      };
    }

    // Filtrar eventos asociados a esta jornada/partido
    const matchEvents = context.events.filter(ev => ev.jornada === match.jornada || ev.matchId === match.id);

    if (matchEvents.length === 0) {
      return {
        tipo: 'no_data',
        preguntaOriginal: query,
        intencionDetectada: `Trabajo previo a J${match.jornada} ${match.rival}`,
        respuesta: `No hay registros documentados ni reutilizaciones que coincidan con la preparación de la Jornada ${match.jornada} vs ${match.rival} en Athletic IA.`
      };
    }

    const uniqueDates = Array.from(new Set(matchEvents.map(e => e.fecha))).sort();
    const docCount = matchEvents.filter(e => e.source === 'historical').length;
    const reuseCount = matchEvents.filter(e => e.source === 'reuse').length;

    // Desglose por MD
    const mdMap = new Map<string, number>();
    matchEvents.forEach(ev => {
      const tag = ev.mdTag || 'Sin MD';
      mdMap.set(tag, (mdMap.get(tag) || 0) + 1);
    });
    const mdSummary = Array.from(mdMap.entries()).map(([tag, count]) => `${tag} (${count} ${count === 1 ? 'tarea' : 'tareas'})`).join(', ');

    // Conceptos trabajados
    const conceptFreq = new Map<string, { sesiones: Set<string>; tareas: number }>();
    matchEvents.forEach(ev => {
      const concepts = context.taskConceptsMap.get(ev.library_task_id) || [];
      concepts.forEach(c => {
        const clean = c.trim();
        if (!conceptFreq.has(clean)) {
          conceptFreq.set(clean, { sesiones: new Set(), tareas: 0 });
        }
        conceptFreq.get(clean)!.sesiones.add(ev.fecha);
        conceptFreq.get(clean)!.tareas += 1;
      });
    });

    const topConcepts = Array.from(conceptFreq.entries())
      .sort((a, b) => b[1].sesiones.size - a[1].sesiones.size || b[1].tareas - a[1].tareas)
      .slice(0, 5)
      .map(([name, data]) => `${name} (${data.sesiones.size} ${data.sesiones.size === 1 ? 'sesión' : 'sesiones'})`);

    const formattedDates = uniqueDates.map(d => {
      const [, m, day] = d.split('-');
      return `${day}/${m}`;
    }).join(', ');

    const respuesta = `En el microciclo previo a la Jornada ${match.jornada} vs ${match.rival} constan ${uniqueDates.length} sesiones con registro (${formattedDates}) y ${matchEvents.length} tareas registradas con impacto, distribuidas en: ${mdSummary}. Los conceptos con mayor presencia fueron: ${topConcepts.join(', ')}.`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: `Trabajo táctico previo a J${match.jornada} ${match.rival}`,
      respuesta,
      trazabilidad: {
        sesionesCount: uniqueDates.length,
        tareasCount: matchEvents.length,
        docPdfCount: docCount,
        reuseCount: reuseCount,
        detalle: `Jornada ${match.jornada} vs ${match.rival} (${match.fecha})`
      },
      detalles: [
        { etiqueta: 'Rival', valor: match.rival },
        { etiqueta: 'Jornada', valor: `J${match.jornada}` },
        { etiqueta: 'Sesiones distintas', valor: uniqueDates.length },
        { etiqueta: 'Tareas registradas', valor: matchEvents.length }
      ]
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO B: CONSULTA POR DÍA DE MICROCICLO (MDTag)
  // ─────────────────────────────────────────────────────────────
  if (detectedMdTag && (qNorm.includes('mas') || qNorm.includes('aparece') || qNorm.includes('conceptos') || qNorm.includes('trabajamos'))) {
    const mdEvents = context.events.filter(e => e.mdTag === detectedMdTag);

    if (mdEvents.length === 0) {
      return {
        tipo: 'no_data',
        preguntaOriginal: query,
        intencionDetectada: `Conceptos trabajados en ${detectedMdTag}`,
        respuesta: `No hay registros documentados ni reutilizaciones clasificadas en ${detectedMdTag} en Athletic IA.`
      };
    }

    const uniqueDates = Array.from(new Set(mdEvents.map(e => e.fecha)));
    const docCount = mdEvents.filter(e => e.source === 'historical').length;
    const reuseCount = mdEvents.filter(e => e.source === 'reuse').length;

    const conceptFreq = new Map<string, { sesiones: Set<string>; tareas: number }>();
    mdEvents.forEach(ev => {
      const concepts = context.taskConceptsMap.get(ev.library_task_id) || [];
      concepts.forEach(c => {
        const clean = c.trim();
        if (!conceptFreq.has(clean)) {
          conceptFreq.set(clean, { sesiones: new Set(), tareas: 0 });
        }
        conceptFreq.get(clean)!.sesiones.add(ev.fecha);
        conceptFreq.get(clean)!.tareas += 1;
      });
    });

    const topConcepts = Array.from(conceptFreq.entries())
      .sort((a, b) => b[1].sesiones.size - a[1].sesiones.size || b[1].tareas - a[1].tareas)
      .slice(0, 4)
      .map(([name, data]) => `${name} (presente en ${data.sesiones.size} de ${uniqueDates.length} sesiones)`);

    const respuesta = `En las sesiones clasificadas como ${detectedMdTag} constan ${uniqueDates.length} sesiones con registro y ${mdEvents.length} tareas registradas. Los conceptos con mayor presencia registrada son: ${topConcepts.join(', ')}.`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: `Distribución conceptual en ${detectedMdTag}`,
      respuesta,
      trazabilidad: {
        sesionesCount: uniqueDates.length,
        tareasCount: mdEvents.length,
        docPdfCount: docCount,
        reuseCount: reuseCount,
        detalle: `Filtro microciclo ${detectedMdTag}`
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO C: CONSULTA POR CONCEPTO CANÓNICO CONCRETO
  // ─────────────────────────────────────────────────────────────
  if (detectedConcept) {
    const metric = context.conceptMetrics.find(m => m.concepto.trim() === detectedConcept.trim());
    const approvedTasks = context.conceptApprovedTasksMap.get(detectedConcept.trim()) || [];

    // Concepto sin tareas aprobadas en Biblioteca
    if (approvedTasks.length === 0) {
      return {
        tipo: 'success',
        preguntaOriginal: query,
        intencionDetectada: `Estado de ${detectedConcept}`,
        respuesta: `El concepto "${detectedConcept}" forma parte del catálogo oficial de 63 conceptos canónicos de Athletic IA, pero actualmente no dispone de tareas aprobadas en la Biblioteca ni cuenta con registros en la temporada.`,
        trazabilidad: {
          sesionesCount: 0,
          tareasCount: 0,
          docPdfCount: 0,
          reuseCount: 0,
          detalle: 'Concepto canónico oficial sin tareas aprobadas'
        }
      };
    }

    // Filtrar eventos de este concepto
    const conceptTaskIds = new Set(approvedTasks.map(t => t.id));
    let conceptEvents = context.events.filter(e => conceptTaskIds.has(e.library_task_id));

    // Si además especificó periodo (ej. "este mes" o "últimos 30 días")
    if (detectedPeriod === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const minDate = d.toISOString().slice(0, 10);
      conceptEvents = conceptEvents.filter(e => e.fecha >= minDate);
    } else if (detectedPeriod === '15d') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      const minDate = d.toISOString().slice(0, 10);
      conceptEvents = conceptEvents.filter(e => e.fecha >= minDate);
    } else if (detectedPeriod === 'septiembre') {
      conceptEvents = conceptEvents.filter(e => e.fecha >= '2026-09-01' && e.fecha <= '2026-09-30');
    }

    const uniqueDates = Array.from(new Set(conceptEvents.map(e => e.fecha))).sort();
    const docCount = conceptEvents.filter(e => e.source === 'historical').length;
    const reuseCount = conceptEvents.filter(e => e.source === 'reuse').length;
    const ultimaFecha = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : metric?.ultimaVez;

    let diasTranscurridosTexto = '';
    if (ultimaFecha) {
      const diffDays = Math.max(0, Math.floor((new Date(today).getTime() - new Date(ultimaFecha).getTime()) / (1000 * 60 * 60 * 24)));
      diasTranscurridosTexto = ` (hace ${diffDays} días)`;
    }

    const formattedUltima = ultimaFecha
      ? `${ultimaFecha.split('-')[2]}/${ultimaFecha.split('-')[1]}/${ultimaFecha.split('-')[0]}${diasTranscurridosTexto}`
      : 'sin registro';

    const periodoDesc = detectedPeriod === '30d' ? 'en los últimos 30 días' : detectedPeriod === '15d' ? 'en los últimos 15 días' : 'esta temporada';

    let respuesta: string;
    if (conceptEvents.length === 0) {
      respuesta = `El concepto "${detectedConcept}" cuenta con ${approvedTasks.length} tareas aprobadas en Biblioteca, pero no tiene registros ${periodoDesc}.`;
    } else {
      respuesta = `El concepto "${detectedConcept}" cuenta con ${approvedTasks.length} tareas aprobadas en Biblioteca y registra presencia ${periodoDesc} en ${uniqueDates.length} sesiones distintas y ${conceptEvents.length} tareas registradas. Su último registro fue el ${formattedUltima}.`;
    }

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: `Historial de ${detectedConcept}`,
      respuesta,
      trazabilidad: {
        sesionesCount: uniqueDates.length,
        tareasCount: conceptEvents.length,
        docPdfCount: docCount,
        reuseCount: reuseCount,
        detalle: `Concepto: ${detectedConcept}`
      },
      detalles: [
        { etiqueta: 'Concepto', valor: detectedConcept },
        { etiqueta: 'Tareas aprobadas', valor: approvedTasks.length },
        { etiqueta: 'Sesiones distintas', valor: uniqueDates.length },
        { etiqueta: 'Último registro', valor: formattedUltima }
      ]
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO D: CONCEPTOS CON MAYOR / MENOR TIEMPO SIN REGISTRO
  // ─────────────────────────────────────────────────────────────
  if (qNorm.includes('mas tiempo') || qNorm.includes('olvidados') || qNorm.includes('sin aparecer') || qNorm.includes('tiempo sin registrar')) {
    const withDate = context.conceptMetrics
      .filter(m => m.ultimaVez && m.diasSinEstimulo !== null)
      .sort((a, b) => (b.diasSinEstimulo || 0) - (a.diasSinEstimulo || 0));

    const topAusentes = withDate.slice(0, 4).map(m => {
      const [, mes, d] = (m.ultimaVez || '').split('-');
      return `${m.concepto} (hace ${m.diasSinEstimulo} días · ${d}/${mes})`;
    });

    const sinRegistroTotal = context.conceptMetrics.filter(m => m.usosTotales === 0).length;

    const respuesta = `Los conceptos oficiales con mayor tiempo transcurrido desde su último registro son: ${topAusentes.join(', ')}. Adicionalmente, existen ${sinRegistroTotal} conceptos de los 63 que no cuentan con ningún registro documentado en toda la temporada.`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: 'Conceptos con mayor tiempo sin registrar',
      respuesta,
      trazabilidad: {
        sesionesCount: context.events.length > 0 ? new Set(context.events.map(e => e.fecha)).size : 0,
        tareasCount: context.events.length,
        docPdfCount: context.events.filter(e => e.source === 'historical').length,
        reuseCount: context.events.filter(e => e.source === 'reuse').length,
        detalle: 'Auditoría sobre los 63 conceptos canónicos'
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO E: CONCEPTOS SIN REGISTROS (EN PERIODO O EN TEMPORADA)
  // ─────────────────────────────────────────────────────────────
  if (qNorm.includes('sin registros') || qNorm.includes('no tienen registros') || qNorm.includes('no aparecen')) {
    if (detectedPeriod === '30d' || qNorm.includes('mes')) {
      // Conceptos sin aparición en los últimos 30 días
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const minDate = d.toISOString().slice(0, 10);
      const recentEvents = context.events.filter(e => e.fecha >= minDate);
      const recentConcepts = new Set<string>();
      recentEvents.forEach(e => {
        (context.taskConceptsMap.get(e.library_task_id) || []).forEach(c => recentConcepts.add(c.trim()));
      });

      const sinAparicion = ALL_CANONICAL_CONCEPTS.filter(c => !recentConcepts.has(c.trim()));
      const muestra = sinAparicion.slice(0, 5).join(', ');

      const respuesta = `En los últimos 30 días constan ${sinAparicion.length} conceptos de los 63 canónicos sin ningún nuevo registro, entre ellos: ${muestra}, entre otros.`;

      return {
        tipo: 'success',
        preguntaOriginal: query,
        intencionDetectada: 'Conceptos sin registro en los últimos 30 días',
        respuesta,
        trazabilidad: {
          sesionesCount: new Set(recentEvents.map(e => e.fecha)).size,
          tareasCount: recentEvents.length,
          docPdfCount: recentEvents.filter(e => e.source === 'historical').length,
          reuseCount: recentEvents.filter(e => e.source === 'reuse').length,
          detalle: 'Ventana temporal: últimos 30 días'
        }
      };
    }

    // Sin registros en toda la temporada
    const sinUso = context.conceptMetrics.filter(m => m.usosTotales === 0);
    const muestra = sinUso.slice(0, 5).map(m => m.concepto).join(', ');

    const respuesta = `Actualmente constan ${sinUso.length} conceptos de los 63 oficiales sin registros en toda la temporada: ${muestra}${sinUso.length > 5 ? '...' : ''}. 2 de ellos no tienen tareas aprobadas aún en la Biblioteca (Pase a Jugador Profundo y Estructura 1-4-2-3-1).`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: 'Conceptos sin registros en la temporada',
      respuesta,
      trazabilidad: {
        sesionesCount: 0,
        tareasCount: 0,
        docPdfCount: 0,
        reuseCount: 0,
        detalle: `${sinUso.length} conceptos sin registros en temporada`
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO F: RANKINGS Y PORCENTAJES DE PRESENCIA POR SESIÓN (MÁS Y MENOS / PORCENTAJES)
  // ─────────────────────────────────────────────────────────────
  const isAskingMoreAndLess = /(?:m[aá]s\s+y\s+menos|mayor\s+y\s+menor|m[aá]s\s+o\s+menos|extremos)/i.test(qNorm) ||
    (/(?:m[aá]s|mayor)/i.test(qNorm) && /(?:menos|menor)/i.test(qNorm));
  const isAskingPercentage = /(?:porcentaje|porcentajes|%)/i.test(qNorm);
  const isAskingRanking = /(?:ordenad[oa]|de\s+mayor\s+a\s+menor|ranking)/i.test(qNorm);

  if (isAskingMoreAndLess || isAskingPercentage || (isAskingRanking && (detectedPeriod !== null || qNorm.includes('conceptos')))) {
    return handleRankingAndPercentages(query, qNorm, context, detectedPeriod, isAskingMoreAndLess);
  }

  // ─────────────────────────────────────────────────────────────
  // CASO G: QUÉ HEMOS ENTRENADO EN UN PERIODO TEMPORAL (15D, 30D, TEMPORADA)
  // ─────────────────────────────────────────────────────────────
  if (detectedPeriod !== null || qNorm.includes('que hemos entrenado') || qNorm.includes('que se ha entrenado') || qNorm.includes('que llevamos')) {
    let periodEvents = context.events;
    let labelPeriodo = 'la temporada completa';

    if (detectedPeriod === '15d' || qNorm.includes('15 dias')) {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      const minDate = d.toISOString().slice(0, 10);
      periodEvents = periodEvents.filter(e => e.fecha >= minDate);
      labelPeriodo = 'los últimos 15 días';
    } else if (detectedPeriod === '30d' || qNorm.includes('30 dias') || qNorm.includes('mes')) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const minDate = d.toISOString().slice(0, 10);
      periodEvents = periodEvents.filter(e => e.fecha >= minDate);
      labelPeriodo = 'los últimos 30 días';
    }

    if (periodEvents.length === 0) {
      return {
        tipo: 'no_data',
        preguntaOriginal: query,
        intencionDetectada: `Resumen de entrenamiento en ${labelPeriodo}`,
        respuesta: `No hay registros documentados ni reutilizaciones en ${labelPeriodo} en Athletic IA.`
      };
    }

    const uniqueDates = Array.from(new Set(periodEvents.map(e => e.fecha)));
    const docCount = periodEvents.filter(e => e.source === 'historical').length;
    const reuseCount = periodEvents.filter(e => e.source === 'reuse').length;

    // Frecuencia de conceptos en el periodo
    const conceptFreq = new Map<string, { sesiones: Set<string>; tareas: number }>();
    periodEvents.forEach(ev => {
      const concepts = context.taskConceptsMap.get(ev.library_task_id) || [];
      concepts.forEach(c => {
        const clean = c.trim();
        if (!conceptFreq.has(clean)) {
          conceptFreq.set(clean, { sesiones: new Set(), tareas: 0 });
        }
        conceptFreq.get(clean)!.sesiones.add(ev.fecha);
        conceptFreq.get(clean)!.tareas += 1;
      });
    });

    const topConcepts = Array.from(conceptFreq.entries())
      .sort((a, b) => b[1].sesiones.size - a[1].sesiones.size || b[1].tareas - a[1].tareas)
      .slice(0, 4)
      .map(([name, data]) => `${name} (${data.sesiones.size} ${data.sesiones.size === 1 ? 'sesión' : 'sesiones'})`);

    const respuesta = `En ${labelPeriodo} constan ${uniqueDates.length} sesiones con registro y ${periodEvents.length} tareas registradas con impacto. Los conceptos con mayor presencia registrada son: ${topConcepts.join(', ')}.`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: `Resumen de entrenamiento en ${labelPeriodo}`,
      respuesta,
      trazabilidad: {
        sesionesCount: uniqueDates.length,
        tareasCount: periodEvents.length,
        docPdfCount: docCount,
        reuseCount: reuseCount,
        detalle: `Filtro temporal: ${labelPeriodo}`
      },
      detalles: [
        { etiqueta: 'Periodo', valor: labelPeriodo },
        { etiqueta: 'Sesiones distintas', valor: uniqueDates.length },
        { etiqueta: 'Tareas registradas', valor: periodEvents.length }
      ]
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CASO G: CONCEPTOS MÁS / MENOS FRECUENTES GENERAL
  // ─────────────────────────────────────────────────────────────
  if (qNorm.includes('mas presencia') || qNorm.includes('mas frecuentes') || qNorm.includes('mas trabajados')) {
    const sorted = [...context.conceptMetrics]
      .filter(m => m.usosTotales > 0)
      .sort((a, b) => b.diasDistintos - a.diasDistintos || b.usosTotales - a.usosTotales)
      .slice(0, 5);

    const list = sorted.map(m => `${m.concepto} (${m.diasDistintos} sesiones · ${m.usosTotales} tareas)`).join(', ');
    const respuesta = `Los conceptos con mayor presencia registrada en la temporada son: ${list}.`;

    return {
      tipo: 'success',
      preguntaOriginal: query,
      intencionDetectada: 'Conceptos con mayor presencia general',
      respuesta,
      trazabilidad: {
        sesionesCount: new Set(context.events.map(e => e.fecha)).size,
        tareasCount: context.events.length,
        docPdfCount: context.events.filter(e => e.source === 'historical').length,
        reuseCount: context.events.filter(e => e.source === 'reuse').length,
        detalle: 'Ranking global sobre 63 conceptos'
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // FALLBACK POR DEFECTO: NO HAY EVIDENCIA CLARA O AMBIGÜEDAD
  // ─────────────────────────────────────────────────────────────
  return {
    tipo: 'no_data',
    preguntaOriginal: query,
    intencionDetectada: 'Consulta no categorizada en catálogo estructurado',
    respuesta: 'No hay datos suficientes para responder con fiabilidad a esta consulta en Athletic IA. Prueba consultando por un concepto oficial, una jornada concreta (ej. J2 Santutxu), un día de microciclo (ej. MD-2) o un periodo temporal.',
    sugerencias: [
      '¿Qué hemos entrenado los últimos 15 días?',
      '¿Qué conceptos no aparecen en los últimos 30 días?',
      '¿Qué trabajamos antes de J2 Santutxu?',
      '¿Cuándo se registró por última vez Presión Tras Pérdida?',
      '¿Qué conceptos aparecen más en MD-2?'
    ]
  };
}
