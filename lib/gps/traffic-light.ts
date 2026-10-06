import { GPSData, TrafficLightColor, TrafficLightMetricKey, MetricTrafficLightResult, PlayerTrafficLightRow, Player } from '@/types';

/**
 * Constantes y umbrales funcionales del Modo C
 */
export const MIN_MINUTES_VALID = 45;
export const MIN_VALID_MATCHES_FOR_HISTORY = 3;

export interface NormalizedMetrics {
  m_min: number | null;
  hsr_min: number | null;
  sprint_min: number | null;
  sprints_90: number | null;
  velocidad_maxima: number | null;
  acc_min: number | null;
  dec_min: number | null;
}

/**
 * Normaliza las métricas de un registro GPS según los minutos jugados
 */
export function extractNormalizedMetrics(data: GPSData): NormalizedMetrics {
  const min = data.minutos;
  const hasMin = typeof min === 'number' && min > 0;

  return {
    m_min: hasMin && data.distancia_total !== null && data.distancia_total !== undefined
      ? data.distancia_total / min
      : null,
    hsr_min: hasMin && data.hsr !== null && data.hsr !== undefined
      ? data.hsr / min
      : null,
    sprint_min: hasMin && data.sprint_distance !== null && data.sprint_distance !== undefined
      ? data.sprint_distance / min
      : null,
    sprints_90: hasMin && data.num_sprints !== null && data.num_sprints !== undefined
      ? (data.num_sprints / min) * 90
      : null,
    velocidad_maxima: typeof data.velocidad_maxima === 'number' && data.velocidad_maxima > 0
      ? data.velocidad_maxima
      : null,
    acc_min: hasMin && data.aceleraciones !== null && data.aceleraciones !== undefined
      ? data.aceleraciones / min
      : null,
    dec_min: hasMin && data.deceleraciones !== null && data.deceleraciones !== undefined
      ? data.deceleraciones / min
      : null,
  };
}

/**
 * Evalúa el semáforo individual para una métrica según los umbrales exactos del proyecto
 */
export function evaluateMetricThreshold(key: TrafficLightMetricKey, ratio: number | null): TrafficLightColor {
  if (ratio === null || isNaN(ratio)) return 'gray';

  // Porcentaje con respecto a la media: e.g. 0.90 -> 90%
  switch (key) {
    case 'm_min':
      if (ratio >= 0.90) return 'green';
      if (ratio >= 0.80) return 'yellow';
      return 'red';

    case 'hsr_min':
      if (ratio >= 0.85) return 'green';
      if (ratio >= 0.70) return 'yellow';
      return 'red';

    case 'sprint_min':
      if (ratio >= 0.80) return 'green';
      if (ratio >= 0.60) return 'yellow';
      return 'red';

    case 'sprints_90':
      if (ratio >= 0.80) return 'green';
      if (ratio >= 0.60) return 'yellow';
      return 'red';

    case 'velocidad_maxima':
      if (ratio >= 0.95) return 'green';
      if (ratio >= 0.90) return 'yellow';
      return 'red';

    case 'acc_min':
      if (ratio >= 0.85) return 'green';
      if (ratio >= 0.70) return 'yellow';
      return 'red';

    case 'dec_min':
      if (ratio >= 0.85) return 'green';
      if (ratio >= 0.70) return 'yellow';
      return 'red';

    default:
      return 'gray';
  }
}

export const METRIC_LABELS: Record<TrafficLightMetricKey, { label: string; unit: string; isCore: boolean }> = {
  m_min: { label: 'm/min', unit: 'm/min', isCore: true },
  hsr_min: { label: 'HSR/min', unit: 'm/min', isCore: true },
  sprint_min: { label: 'Sprint/min', unit: 'm/min', isCore: true },
  sprints_90: { label: 'Sprints/90', unit: 'sprints', isCore: false },
  velocidad_maxima: { label: 'Vel. Máx', unit: 'km/h', isCore: false },
  acc_min: { label: 'Acc/min', unit: 'acc/min', isCore: false },
  dec_min: { label: 'Dec/min', unit: 'dec/min', isCore: false },
};

/**
 * Calcula el Estado Global de un jugador en la jornada aplicando el árbol jerárquico estricto
 */
export function computeGlobalStatus(
  isValidMatchParticipation: boolean,
  hasEnoughHistory: boolean,
  metricResults: Record<TrafficLightMetricKey, MetricTrafficLightResult>
): { status: TrafficLightColor; reason: string } {
  // 1. Condición GRIS: partido evaluado <45 min o referencia histórica <3 partidos válidos
  if (!isValidMatchParticipation) {
    return {
      status: 'gray',
      reason: 'Participación corta (<45 min en este partido). No se emite semáforo global.',
    };
  }

  if (!hasEnoughHistory) {
    return {
      status: 'gray',
      reason: 'Muestra histórica insuficiente (<3 partidos de ≥45 min). Requiere más partidos para referencia fiable.',
    };
  }

  // Contar colores por tipo de métrica
  let coreRedCount = 0;
  let coreYellowCount = 0;
  let secondaryRedCount = 0;
  let totalRedCount = 0;
  let totalYellowCount = 0;

  const coreKeys: TrafficLightMetricKey[] = ['m_min', 'hsr_min', 'sprint_min'];
  const secondaryKeys: TrafficLightMetricKey[] = ['sprints_90', 'velocidad_maxima', 'acc_min', 'dec_min'];

  coreKeys.forEach((key) => {
    const color = metricResults[key]?.color;
    if (color === 'red') {
      coreRedCount++;
      totalRedCount++;
    } else if (color === 'yellow') {
      coreYellowCount++;
      totalYellowCount++;
    }
  });

  secondaryKeys.forEach((key) => {
    const color = metricResults[key]?.color;
    if (color === 'red') {
      secondaryRedCount++;
      totalRedCount++;
    } else if (color === 'yellow') {
      totalYellowCount++;
    }
  });

  const hsrRatio = metricResults['hsr_min']?.ratio;

  // 2. Condición ROJO
  // - 2 o más métricas Core en rojo
  // - o 1 métrica Core en rojo + 2 o más secundarias en rojo
  // - o HSR/min <55% de su media histórica
  if (coreRedCount >= 2) {
    return {
      status: 'red',
      reason: `Desviación física clara: ${coreRedCount} métricas Core en rojo.`,
    };
  }

  if (coreRedCount >= 1 && secondaryRedCount >= 2) {
    return {
      status: 'red',
      reason: `Desviación física clara: 1 métrica Core en rojo y ${secondaryRedCount} métricas secundarias en rojo.`,
    };
  }

  if (hsrRatio !== null && hsrRatio < 0.55) {
    return {
      status: 'red',
      reason: `Desviación física clara: HSR/min al ${Math.round(hsrRatio * 100)}% de su media (<55%).`,
    };
  }

  // 3. Condición AMARILLO
  // Si no es rojo y:
  // - 1 métrica Core en rojo
  // - o 2 o más métricas Core en amarillo
  // - o 3 o más métricas totales entre amarillos y rojos
  if (coreRedCount >= 1) {
    return {
      status: 'yellow',
      reason: 'Desviación moderada: 1 métrica Core en rojo.',
    };
  }

  if (coreYellowCount >= 2) {
    return {
      status: 'yellow',
      reason: `Desviación moderada: ${coreYellowCount} métricas Core en amarillo.`,
    };
  }

  const totalDeviations = totalRedCount + totalYellowCount;
  if (totalDeviations >= 3) {
    return {
      status: 'yellow',
      reason: `Desviación moderada: ${totalDeviations} métricas desviadas entre amarillo y rojo.`,
    };
  }

  // 4. Condición VERDE
  return {
    status: 'green',
    reason: 'Rendimiento habitual: métricas dentro o por encima de su rango de referencia.',
  };
}

/**
 * Calcula la fila de Semáforo de Rendimiento para todos los jugadores con GPS en un partido seleccionado.
 * La referencia personal de cada jugador se calcula a partir de los partidos válidos de >=45 min
 * disputados cronológicamente con anterioridad al partido evaluado (excluyendo el propio partido y posteriores).
 */
export function buildMatchTrafficLightRows(
  currentMatchGpsData: (GPSData & { player?: Player })[],
  allHistoricalGpsData: (GPSData & { player?: Player })[],
  players: Player[],
  currentSessionId?: string
): PlayerTrafficLightRow[] {
  // 1. Filtrar registros históricos válidos para cada jugador (SOLO partidos de >= 45 min y excluyendo el propio partido)
  const validHistoryByPlayer = new Map<string, NormalizedMetrics[]>();

  allHistoricalGpsData.forEach((row) => {
    if (!row.player_id) return;
    if (currentSessionId && row.session_id === currentSessionId) return;
    if (row.minutos && row.minutos >= MIN_MINUTES_VALID) {
      const normalized = extractNormalizedMetrics(row);
      const existing = validHistoryByPlayer.get(row.player_id) || [];
      existing.push(normalized);
      validHistoryByPlayer.set(row.player_id, existing);
    }
  });

  // 2. Procesar cada jugador presente en el partido evaluado
  const rows: PlayerTrafficLightRow[] = currentMatchGpsData.map((gpsRow) => {
    const playerId = gpsRow.player_id || '';
    const playerObj = gpsRow.player || players.find((p) => p.id === playerId) || null;
    const minutos = gpsRow.minutos || 0;
    const isValidMatchParticipation = minutos >= MIN_MINUTES_VALID;

    // Detectar si hay información de titularidad en raw_data o similar
    let esTitular: boolean | undefined = undefined;
    if (gpsRow.raw_data && typeof gpsRow.raw_data === 'object') {
      const rd = gpsRow.raw_data as Record<string, unknown>;
      if (typeof rd.titular === 'boolean') {
        esTitular = rd.titular;
      } else if (typeof rd.start === 'boolean') {
        esTitular = rd.start;
      } else if (typeof rd.es_titular === 'boolean') {
        esTitular = rd.es_titular;
      }
    }

    const currentNormalized = extractNormalizedMetrics(gpsRow);
    const validHistory = validHistoryByPlayer.get(playerId) || [];
    const validMatchesCount = validHistory.length;
    const hasEnoughHistory = validMatchesCount >= MIN_VALID_MATCHES_FOR_HISTORY;

    // Calcular medias históricas individuales (solo si hay partidos válidos)
    const historicalAverages: Record<TrafficLightMetricKey, number | null> = {
      m_min: null,
      hsr_min: null,
      sprint_min: null,
      sprints_90: null,
      velocidad_maxima: null,
      acc_min: null,
      dec_min: null,
    };

    if (validMatchesCount > 0) {
      const keys: TrafficLightMetricKey[] = [
        'm_min',
        'hsr_min',
        'sprint_min',
        'sprints_90',
        'velocidad_maxima',
        'acc_min',
        'dec_min',
      ];

      keys.forEach((key) => {
        const values = validHistory.map((h) => h[key]).filter((v): v is number => v !== null && !isNaN(v));
        if (values.length > 0) {
          historicalAverages[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
      });
    }

    // Calcular semáforo para cada una de las 7 métricas
    const metricsResult = {} as Record<TrafficLightMetricKey, MetricTrafficLightResult>;
    const allKeys: TrafficLightMetricKey[] = [
      'm_min',
      'hsr_min',
      'sprint_min',
      'sprints_90',
      'velocidad_maxima',
      'acc_min',
      'dec_min',
    ];

    allKeys.forEach((key) => {
      const val = currentNormalized[key];
      const avg = historicalAverages[key];
      const meta = METRIC_LABELS[key];

      let ratio: number | null = null;
      if (val !== null && avg !== null && avg > 0) {
        ratio = val / avg;
      }

      let color: TrafficLightColor = 'gray';

      // Solo colorear si cumple ambos requisitos: partido evaluado >=45 min Y referencia histórica >=3 partidos
      if (isValidMatchParticipation && hasEnoughHistory && ratio !== null) {
        color = evaluateMetricThreshold(key, ratio);
      } else {
        color = 'gray';
      }

      metricsResult[key] = {
        value: val,
        historicalAvg: avg,
        ratio,
        color,
        isCore: meta.isCore,
        label: meta.label,
        unit: meta.unit,
      };
    });

    const { status: globalStatus, reason: globalReason } = computeGlobalStatus(
      isValidMatchParticipation,
      hasEnoughHistory,
      metricsResult
    );

    return {
      playerId,
      player: playerObj,
      minutos,
      esTitular,
      validMatchesCount,
      hasEnoughHistory,
      isValidMatchParticipation,
      metrics: metricsResult,
      globalStatus,
      globalReason,
    };
  });

  // Ordenar por dorsal (o minutos si dorsal no está disponible)
  return rows.sort((a, b) => {
    const dorsalA = a.player?.dorsal ?? 99;
    const dorsalB = b.player?.dorsal ?? 99;
    if (dorsalA !== dorsalB) return dorsalA - dorsalB;
    return b.minutos - a.minutos;
  });
}
