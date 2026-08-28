/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export interface ParsedOliverPlayerRow {
  oliver_player_id: string | null;
  source_player_name: string;
  dorsal: number | null;
  posicion: string | null;
  minutos: number | null;
  distancia_metros: number | null;
  metros_minuto: number | null;
  velocidad_maxima: number | null;
  distancia_sprint: number | null;
  distancia_alta_intensidad: number | null;
  sprints_count: number | null;
  aceleraciones_count: number | null;
  deceleraciones_count: number | null;
  aceleraciones_max: number | null;
  deceleraciones_max: number | null;
  impactos_count: number | null;
  golpes_balon: number | null;
  carga_total: number | null;
  raw_metrics: Record<string, any>;
}

export interface ParsedOliverSession {
  oliver_session_id: string | null;
  session_name: string;
  session_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  session_type: 'ENTRENAMIENTO' | 'PARTIDO' | 'OTRO';
  raw_header_data: Record<string, any>;
  players: ParsedOliverPlayerRow[];
}

function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).replace(',', '.').replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseInteger(val: any): number | null {
  const num = parseNumber(val);
  return num !== null ? Math.round(num) : null;
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Parsea un buffer de archivo Excel (.xlsx, .xls) o CSV exportado por OLIVER.
 */
export function parseOliverFile(
  buffer: Buffer,
  fallbackOptions?: {
    defaultDate?: string;
    defaultName?: string;
    defaultType?: 'ENTRENAMIENTO' | 'PARTIDO' | 'OTRO';
  }
): ParsedOliverSession {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no contiene ninguna hoja válida.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('La hoja está vacía.');
  }

  // 1. Detectar fila de cabecera buscando columnas típicas de OLIVER
  let headerRowIndex = -1;
  const playerKeywords = ['jugador', 'athlete', 'player', 'nombre', 'name', 'futbolista', 'apellidos'];
  const metricKeywords = ['distancia', 'distance', 'vel', 'speed', 'minutos', 'minutes', 'sprint', 'vmax', 'oliver', 'm/min'];

  for (let i = 0; i < Math.min(rawMatrix.length, 25); i++) {
    const row = rawMatrix[i].map((cell) => normalizeKey(String(cell)));
    const hasPlayer = row.some((k) => playerKeywords.some((pk) => k.includes(pk)));
    const hasMetric = row.some((k) => metricKeywords.some((mk) => k.includes(mk)));

    if (hasPlayer && (hasMetric || row.length >= 3)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Si no encuentra una fila explícita, asume la fila 0 si tiene columnas
    headerRowIndex = 0;
  }

  // 2. Extraer metadatos superiores si existen
  const rawHeaderData: Record<string, any> = {};
  for (let i = 0; i < headerRowIndex; i++) {
    const row = rawMatrix[i];
    if (row && row.length >= 2 && cleanText(row[0])) {
      rawHeaderData[cleanText(row[0])] = row.slice(1).filter((c) => cleanText(c)).join(' - ');
    }
  }

  const headers = rawMatrix[headerRowIndex].map((h, colIdx) => {
    const text = cleanText(h);
    return text || `columna_${colIdx + 1}`;
  });

  let detectedSessionId: string | null = null;
  let detectedSessionName: string | null = null;
  let detectedDate: string | null = null;
  const detectedStartTime: string | null = null;
  const detectedEndTime: string | null = null;
  const detectedDuration: number | null = null;
  let detectedType: 'ENTRENAMIENTO' | 'PARTIDO' | 'OTRO' = fallbackOptions?.defaultType || 'ENTRENAMIENTO';

  // Buscar en los metadatos de cabecera
  for (const [key, val] of Object.entries(rawHeaderData)) {
    const norm = normalizeKey(key);
    const valStr = cleanText(val);
    if (norm.includes('session_id') || norm.includes('id_sesion') || norm.includes('activity_id')) {
      detectedSessionId = valStr;
    }
    if (norm.includes('nombre') || norm.includes('session_name') || norm.includes('actividad')) {
      detectedSessionName = valStr;
    }
    if (norm.includes('fecha') || norm.includes('date')) {
      detectedDate = valStr;
    }
    if (norm.includes('tipo') || norm.includes('type')) {
      if (valStr.toLowerCase().includes('partido') || valStr.toLowerCase().includes('match')) {
        detectedType = 'PARTIDO';
      }
    }
  }

  // 3. Procesar filas de jugadores
  const players: ParsedOliverPlayerRow[] = [];

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rowCells = rawMatrix[r];
    if (!rowCells || rowCells.length === 0) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = rowCells[colIdx] !== undefined ? rowCells[colIdx] : '';
    });

    // Identificar columnas clave por nombres normalizados
    let oliverPlayerId: string | null = null;
    let sourcePlayerName: string = '';
    let dorsal: number | null = null;
    let posicion: string | null = null;
    let minutos: number | null = null;
    let distanciaMetros: number | null = null;
    let metrosMinuto: number | null = null;
    let velocidadMaxima: number | null = null;
    let distanciaSprint: number | null = null;
    let distanciaAltaIntensidad: number | null = null;
    let sprintsCount: number | null = null;
    let aceleracionesCount: number | null = null;
    let deceleracionesCount: number | null = null;
    let aceleracionesMax: number | null = null;
    let deceleracionesMax: number | null = null;
    let impactosCount: number | null = null;
    let golpesBalon: number | null = null;
    let cargaTotal: number | null = null;

    for (const [colName, val] of Object.entries(rowObj)) {
      const norm = normalizeKey(colName);
      const strVal = cleanText(val);

      // Session info en fila si estuviera ahí
      if (!detectedSessionId && (norm === 'session_id' || norm === 'id_sesion' || norm === 'oliver_session_id')) {
        detectedSessionId = strVal;
      }
      if (!detectedSessionName && (norm === 'session_name' || norm === 'nombre_sesion' || norm === 'actividad')) {
        detectedSessionName = strVal;
      }
      if (!detectedDate && (norm === 'date' || norm === 'fecha')) {
        detectedDate = strVal;
      }

      // Player identifiers
      if (norm === 'oliver_player_id' || norm === 'athlete_id' || norm === 'player_id' || norm === 'user_id' || norm === 'id_jugador' || norm === 'external_id') {
        oliverPlayerId = strVal || null;
      } else if (norm === 'athlete' || norm === 'jugador' || norm === 'player' || norm === 'nombre' || norm === 'name' || norm === 'full_name' || norm === 'futbolista') {
        if (!sourcePlayerName && strVal) sourcePlayerName = strVal;
      } else if (norm === 'dorsal' || norm === 'numero' || norm === 'number' || norm === 'jersey') {
        dorsal = parseInteger(val);
      } else if (norm === 'posicion' || norm === 'position' || norm === 'demarcacion') {
        posicion = strVal || null;
      }

      // Métricas de tiempo y distancia
      else if (norm.includes('minuto') || norm === 'minutes' || norm === 'duration' || norm === 'duracion' || norm === 'time_min' || norm === 'tiempo_min') {
        minutos = parseNumber(val);
      } else if (norm.includes('distancia_total') || norm.includes('total_distance') || norm === 'distancia' || norm === 'distance' || norm === 'distancia_m' || norm === 'distancia_metros') {
        distanciaMetros = parseNumber(val);
      } else if (norm.includes('m_min') || norm.includes('metros_min') || norm.includes('meters_min') || norm.includes('distancia_min')) {
        metrosMinuto = parseNumber(val);
      } else if (norm.includes('vel_max') || norm.includes('velocidad_max') || norm.includes('max_speed') || norm.includes('vmax') || norm.includes('top_speed')) {
        velocidadMaxima = parseNumber(val);
      } else if (norm.includes('distancia_sprint') || norm.includes('sprint_distance') || norm.includes('sprint_dist') || norm === 'sprint_m') {
        distanciaSprint = parseNumber(val);
      } else if (norm.includes('alta_intensidad') || norm.includes('high_speed') || norm.includes('hsr') || norm.includes('distancia_hi')) {
        distanciaAltaIntensidad = parseNumber(val);
      } else if (norm.includes('sprint') && !norm.includes('dist')) {
        sprintsCount = parseInteger(val);
      } else if (norm.includes('aceleracion') || norm.includes('accel')) {
        if (norm.includes('max')) {
          aceleracionesMax = parseNumber(val);
        } else {
          aceleracionesCount = parseInteger(val);
        }
      } else if (norm.includes('deceleracion') || norm.includes('decel')) {
        if (norm.includes('max')) {
          deceleracionesMax = parseNumber(val);
        } else {
          deceleracionesCount = parseInteger(val);
        }
      } else if (norm.includes('impacto') || norm.includes('impact')) {
        impactosCount = parseInteger(val);
      } else if (norm.includes('golpe') || norm.includes('kick') || norm.includes('disparo')) {
        golpesBalon = parseInteger(val);
      } else if (norm.includes('carga') || norm.includes('load') || norm.includes('rpe') || norm.includes('player_load')) {
        cargaTotal = parseNumber(val);
      }
    }

    // Si no se encontró un nombre explícito pero la primera celda es texto, usarla
    if (!sourcePlayerName && rowCells[0]) {
      sourcePlayerName = cleanText(rowCells[0]);
    }

    // Saltar filas sin nombre de jugador o filas de totales
    if (!sourcePlayerName || sourcePlayerName.toLowerCase().startsWith('total') || sourcePlayerName.toLowerCase().startsWith('promedio') || sourcePlayerName.toLowerCase().startsWith('media')) {
      continue;
    }

    // Calcular metros/minuto si no vino explícito o como fórmula: distancia / minutos
    if (distanciaMetros && minutos && minutos > 0) {
      metrosMinuto = Math.round((distanciaMetros / minutos) * 100) / 100;
    }

    players.push({
      oliver_player_id: oliverPlayerId,
      source_player_name: sourcePlayerName,
      dorsal,
      posicion,
      minutos,
      distancia_metros: distanciaMetros,
      metros_minuto: metrosMinuto,
      velocidad_maxima: velocidadMaxima,
      distancia_sprint: distanciaSprint,
      distancia_alta_intensidad: distanciaAltaIntensidad,
      sprints_count: sprintsCount,
      aceleraciones_count: aceleracionesCount,
      deceleraciones_count: deceleracionesCount,
      aceleraciones_max: aceleracionesMax,
      deceleraciones_max: deceleracionesMax,
      impactos_count: impactosCount,
      golpes_balon: golpesBalon,
      carga_total: cargaTotal,
      raw_metrics: rowObj,
    });
  }

  // Formatear o extraer fecha
  let finalDate = fallbackOptions?.defaultDate || new Date().toISOString().split('T')[0];
  if (detectedDate) {
    const d = new Date(detectedDate);
    if (!isNaN(d.getTime())) {
      finalDate = d.toISOString().split('T')[0];
    } else {
      // Probar formatos DD/MM/YYYY
      const parts = detectedDate.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          finalDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          finalDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
  }

  const finalName = fallbackOptions?.defaultName || detectedSessionName || `Sesión OLIVER ${finalDate}`;

  return {
    oliver_session_id: detectedSessionId,
    session_name: finalName,
    session_date: finalDate,
    start_time: detectedStartTime,
    end_time: detectedEndTime,
    duration_minutes: detectedDuration, // Se mantiene null si OLIVER no lo da claramente
    session_type: detectedType,
    raw_header_data: rawHeaderData,
    players,
  };
}
