import 'server-only';

/**
 * Cliente exclusivo de servidor para la API de Die Ligen (coaches.ligen.football).
 *
 * REGLAS DE SEGURIDAD ESTRICTAS:
 * 1. Ejecución 100% en Node/Servidor ('server-only').
 * 2. Jamás expone usuario, contraseña ni token JWT hacia el navegador ni logs.
 * 3. Jamás almacena credenciales ni tokens en base de datos ni persistencia externa.
 * 4. Token en memoria volátil únicamente durante la sesión del servidor.
 */

export type DieLigenErrorCode =
  | 'APP_AUTH_UNAUTHORIZED'
  | 'DIE_LIGEN_CONFIG_MISSING'
  | 'DIE_LIGEN_TOKEN_FAILED'
  | 'DIE_LIGEN_UPSTREAM_UNAUTHORIZED'
  | 'DIE_LIGEN_UPSTREAM_ERROR';

export interface DieLigenSeasonYear {
  id: string | number;
  seasonYearLabel?: string;
  startYear?: number | string;
  endYear?: number | string;
  currentSeasonYear?: boolean;
  [key: string]: unknown;
}

export interface DieLigenContestItem {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

export interface DieLigenSubscribedContestsResponse {
  subscribedContests?: DieLigenContestItem[];
  recommendedContests?: DieLigenContestItem[];
  [key: string]: unknown;
}

export interface DieLigenStatusResult {
  connected: boolean;
  errorCode: DieLigenErrorCode | null;
  error: string | null;
  temporadaActual: string | null;
  competiciones: string[];
}

class DieLigenError extends Error {
  code: DieLigenErrorCode;
  constructor(message: string, code: DieLigenErrorCode) {
    super(message);
    this.code = code;
    this.name = 'DieLigenError';
  }
}

const DEFAULT_BASE_URL = 'https://coaches.ligen.football/external-api/v1/analysis';

function getBaseUrl(): string {
  const custom = process.env.DIE_LIGEN_BASE_URL?.trim();
  if (custom) {
    return custom.replace(/\/+$/, '');
  }
  return DEFAULT_BASE_URL;
}

// Token en memoria volátil del servidor
let memoryToken: string | null = null;

/**
 * Obtiene el token de autenticación de Die Ligen mediante POST /oauth/token.
 * El endpoint devuelve el token en texto plano (plain text).
 */
export async function getDieLigenToken(forceRefresh = false): Promise<string> {
  if (memoryToken && !forceRefresh) {
    return memoryToken;
  }

  const username = process.env.DIE_LIGEN_USERNAME?.trim();
  const password = process.env.DIE_LIGEN_PASSWORD?.trim();

  if (!username || !password) {
    throw new DieLigenError(
      'Variables de entorno DIE_LIGEN_USERNAME o DIE_LIGEN_PASSWORD no configuradas en el servidor.',
      'DIE_LIGEN_CONFIG_MISSING'
    );
  }

  const baseUrl = getBaseUrl();
  const tokenUrl = `${baseUrl}/oauth/token`;

  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de red';
    throw new DieLigenError(`No se pudo contactar con el endpoint de token de Die Ligen: ${msg}`, 'DIE_LIGEN_TOKEN_FAILED');
  }

  if (!res.ok) {
    throw new DieLigenError(
      `Fallo de autenticación en Die Ligen (código HTTP ${res.status}). Credenciales rechazadas.`,
      'DIE_LIGEN_TOKEN_FAILED'
    );
  }

  // La API devuelve el token en texto plano, no como JSON
  const rawToken = await res.text();
  const token = rawToken.trim();

  if (!token) {
    throw new DieLigenError('Respuesta de token vacía recibida de Die Ligen.', 'DIE_LIGEN_TOKEN_FAILED');
  }

  memoryToken = token;
  return token;
}

/**
 * Realiza una petición autenticada a la API de Die Ligen.
 * Si recibe 401, obtiene un token nuevo y reintenta exactamente una sola vez.
 */
export async function fetchDieLigen<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  let token = await getDieLigenToken(false);

  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, text/plain, */*',
    },
    cache: 'no-store',
  });

  // Si devuelve 401 Unauthorized, reintentar una sola vez con token renovado
  if (res.status === 401) {
    token = await getDieLigenToken(true);
    res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      throw new DieLigenError(
        'La API de Die Ligen rechazó el token de acceso tras el reintento de autenticación (401).',
        'DIE_LIGEN_UPSTREAM_UNAUTHORIZED'
      );
    }
  }

  if (!res.ok) {
    throw new DieLigenError(
      `Error en respuesta externa de Die Ligen en ${cleanEndpoint} (HTTP ${res.status}).`,
      'DIE_LIGEN_UPSTREAM_ERROR'
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

/**
 * Consulta el estado y la configuración de suscripción actual de Die Ligen:
 * 1. GET /authenticated
 * 2. GET /season-years -> filtra currentSeasonYear === true
 * 3. GET /subscribed-contests/{season_year_id}
 *
 * Devuelve únicamente información segura y sanitizada.
 */
export async function getDieLigenStatus(): Promise<DieLigenStatusResult> {
  const username = process.env.DIE_LIGEN_USERNAME?.trim();
  const password = process.env.DIE_LIGEN_PASSWORD?.trim();

  if (!username || !password) {
    return {
      connected: false,
      errorCode: 'DIE_LIGEN_CONFIG_MISSING',
      error: 'Variables DIE_LIGEN_USERNAME o DIE_LIGEN_PASSWORD no configuradas en el servidor.',
      temporadaActual: null,
      competiciones: [],
    };
  }

  try {
    // 1. Verificar autenticación
    await fetchDieLigen('/authenticated');

    // 2. Obtener temporadas registradas
    const seasonYears = await fetchDieLigen<DieLigenSeasonYear[]>('/season-years');

    // 3. Seleccionar la temporada actual (currentSeasonYear === true)
    let currentSeason: DieLigenSeasonYear | null = null;
    if (Array.isArray(seasonYears)) {
      currentSeason = seasonYears.find((sy) => sy.currentSeasonYear === true) || seasonYears[0] || null;
    }

    const seasonYearId = currentSeason?.id;
    let competiciones: string[] = [];

    // 4. Obtener competiciones suscritas para esa temporada
    if (seasonYearId !== undefined && seasonYearId !== null) {
      const response = await fetchDieLigen<DieLigenSubscribedContestsResponse | DieLigenContestItem[]>(
        `/subscribed-contests/${seasonYearId}`
      );

      const contestList = Array.isArray(response)
        ? response
        : Array.isArray((response as DieLigenSubscribedContestsResponse)?.subscribedContests)
        ? (response as DieLigenSubscribedContestsResponse).subscribedContests || []
        : [];

      competiciones = contestList
        .map((c) => {
          if (typeof c === 'string') return (c as string).trim();
          return (c?.name || '').trim();
        })
        .filter(Boolean);
    }

    // temporadaActual debe devolver seasonYearLabel, nunca id
    const temporadaNombre = currentSeason?.seasonYearLabel?.trim() || null;

    return {
      connected: true,
      errorCode: null,
      temporadaActual: temporadaNombre,
      competiciones,
      error: null,
    };
  } catch (err: unknown) {
    let errorCode: DieLigenErrorCode = 'DIE_LIGEN_UPSTREAM_ERROR';
    let safeMessage = 'Error de comunicación con la API externa de Die Ligen.';

    if (err instanceof DieLigenError) {
      errorCode = err.code;
      safeMessage = err.message;
    } else if (err instanceof Error) {
      safeMessage = err.message
        .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer ***')
        .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '***');
    }

    return {
      connected: false,
      errorCode,
      error: safeMessage,
      temporadaActual: null,
      competiciones: [],
    };
  }
}

// ============================================================================
// FASE 2B: LÍNEA TEMPORAL DINÁMICA DE EVENTOS (DIE LIGEN)
// ============================================================================

export const INDAUTXU_DIE_LIGEN_TEAM_ID = '3f859a44-bb09-46d9-acd5-de7de0ba8aca';
export const DHJ2_CONTEST_ID = '75bfb443-8fe9-4bdc-ae28-d42b3e1d19cf';
const DELIVERY_BASE_URL = 'https://coaches.ligen.football/api/delivery';

/**
 * Consulta endpoints internos de delivery de Die Ligen (coaching cockpit).
 */
export async function fetchDieLigenDelivery<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${DELIVERY_BASE_URL}${cleanEndpoint}`;

  let token = await getDieLigenToken(false);

  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, text/plain, */*',
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    token = await getDieLigenToken(true);
    res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      throw new DieLigenError(
        'La API de Die Ligen rechazó el token de acceso tras el reintento de autenticación (401).',
        'DIE_LIGEN_UPSTREAM_UNAUTHORIZED'
      );
    }
  }

  if (!res.ok) {
    throw new DieLigenError(
      `Error en respuesta delivery de Die Ligen en ${cleanEndpoint} (HTTP ${res.status}).`,
      'DIE_LIGEN_UPSTREAM_ERROR'
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

export interface DieLigenTimelineEvent {
  id: string;
  category: 'GOAL' | 'CARD' | 'SUBSTITUTION';
  gameTime: number;
  minuteString: string;
  detailedTimeString?: string;
  period: '1T' | '2T';
  teamName: string;
  isIndautxu: boolean;
  scorerName?: string;
  scorerDorsal?: number;
  assistName?: string;
  assistDorsal?: number;
  scoreHome?: number;
  scoreAway?: number;
  goalDetail?: string;
  cardType?: 'YELLOW' | 'RED';
  offendingPlayerName?: string;
  offendingPlayerDorsal?: number;
  playerInName?: string;
  playerInDorsal?: number;
  playerOutName?: string;
  playerOutDorsal?: number;
}

export interface DieLigenTimelineResult {
  available: boolean;
  gameId?: string;
  jornada: number;
  status?: string;
  reason?: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  homeTeamName?: string;
  awayTeamName?: string;
  eventsCount?: number;
  events?: DieLigenTimelineEvent[];
}

/**
 * Resuelve dinámicamente el partido del SD Indautxu en la jornada dada
 * y devuelve los eventos nucleares (GOAL, CARD, SUBSTITUTION) ordenados cronológicamente.
 */
export async function getDieLigenTimelineForJornada(jornada: number): Promise<DieLigenTimelineResult> {
  try {
    // 1. Obtener calendario del torneo oficial
    const contest = await fetchDieLigenDelivery<{
      games?: Array<{
        id: string;
        round?: { roundOrderNumber?: number };
        homeTeam?: { id?: string; name?: string };
        awayTeam?: { id?: string; name?: string };
        analysisStatus?: { i18NKey?: string };
        scoreHome?: number | null;
        scoreAway?: number | null;
      }>;
    }>(`/analysis/contest/${DHJ2_CONTEST_ID}`);

    if (!contest?.games || !Array.isArray(contest.games)) {
      return {
        available: false,
        jornada,
        reason: 'No se pudo obtener el calendario del torneo en Die Ligen.',
      };
    }

    // 2. Localizar el partido oficial donde participe SD Indautxu en esta jornada
    const matchGame = contest.games.find((g) => {
      const isIndautxu =
        g.homeTeam?.id === INDAUTXU_DIE_LIGEN_TEAM_ID ||
        g.awayTeam?.id === INDAUTXU_DIE_LIGEN_TEAM_ID;
      return isIndautxu && g.round?.roundOrderNumber === jornada;
    });

    if (!matchGame) {
      return {
        available: false,
        jornada,
        reason: `No se encontró ningún partido oficial del SD Indautxu para la Jornada ${jornada} en Die Ligen.`,
      };
    }

    const statusKey = matchGame.analysisStatus?.i18NKey || 'OPEN';
    if (statusKey !== 'FINISHED') {
      return {
        available: false,
        gameId: matchGame.id,
        jornada,
        status: statusKey,
        reason: 'Partido pendiente de análisis en Die Ligen.',
        homeTeamName: matchGame.homeTeam?.name,
        awayTeamName: matchGame.awayTeam?.name,
      };
    }

    // 3. Descargar análisis completo del partido
    const gameData = await fetchDieLigenDelivery<{
      gameInfo?: {
        id: string;
        scoreHome: number | null;
        scoreAway: number | null;
        homeTeam?: { id: string; name: string };
        awayTeam?: { id: string; name: string };
      };
      events?: Array<{
        id: string;
        categoryName: string;
        defensiveEvent: boolean;
        gameTime: number;
        eventTime: number;
        gameTimeString: string;
        gameTimeDetailedString?: string;
        halftimeCode: string;
        team?: { id: string; name: string };
        teamType?: string;
        teamScore?: number;
        opponentScore?: number;
        selectedPlayers?: Array<{
          tag?: { i18NKey: string };
          player?: { id: string; playerName: string; shirtNumber: number };
        }>;
        selectedLabels?: Array<{
          tag?: { i18NKey: string };
          i18NKey: string;
        }>;
      }>;
    }>(`/analysis/game/${matchGame.id}`);

    const rawEvents = gameData?.events || [];
    if (rawEvents.length === 0) {
      return {
        available: false,
        gameId: matchGame.id,
        jornada,
        status: 'NO_EVENTS',
        reason: 'El partido no contiene eventos registrados en Die Ligen.',
      };
    }

    // 4. Filtrar únicamente eventos nucleares válidos (defensiveEvent === false y GOAL, CARD, SUBSTITUTION)
    const filtered = rawEvents
      .filter(
        (e) =>
          !e.defensiveEvent &&
          ['GOAL', 'CARD', 'SUBSTITUTION'].includes(e.categoryName)
      )
      .sort((a, b) => (a.gameTime ?? a.eventTime) - (b.gameTime ?? b.eventTime));

    const events: DieLigenTimelineEvent[] = filtered.map((e) => {
      const isIndautxu =
        e.team?.id === INDAUTXU_DIE_LIGEN_TEAM_ID || e.teamType === 'AWAY';
      const period: '1T' | '2T' =
        e.halftimeCode === 'HALFTIME_ONE' ? '1T' : '2T';

      const ev: DieLigenTimelineEvent = {
        id: e.id,
        category: e.categoryName as 'GOAL' | 'CARD' | 'SUBSTITUTION',
        gameTime: e.gameTime ?? e.eventTime,
        minuteString: e.gameTimeString || `${Math.floor((e.gameTime ?? e.eventTime) / 60)}'`,
        detailedTimeString: e.gameTimeDetailedString,
        period,
        teamName: e.team?.name || (isIndautxu ? 'SD Indautxu' : 'Rival'),
        isIndautxu,
      };

      if (e.categoryName === 'GOAL') {
        const scorer = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'SCORER')?.player;
        const assist = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'ASSIST_PROVIDER')?.player;
        const situation = e.selectedLabels?.find((l) => l.tag?.i18NKey === 'SITUATION_LEADING_TO')?.i18NKey;
        const location = e.selectedLabels?.find((l) => l.tag?.i18NKey === 'SHOT_LOCATION')?.i18NKey;

        ev.scorerName = scorer?.playerName;
        ev.scorerDorsal = scorer?.shirtNumber;
        ev.assistName = assist?.playerName;
        ev.assistDorsal = assist?.shirtNumber;
        ev.scoreHome = gameData.gameInfo?.scoreHome ?? undefined;
        ev.scoreAway = gameData.gameInfo?.scoreAway ?? undefined;
        ev.goalDetail = situation || location || undefined;
      } else if (e.categoryName === 'CARD') {
        const offender = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'OFFENDING_PLAYER')?.player;
        const cardType = e.selectedLabels?.find((l) => l.tag?.i18NKey === 'CARD_TYPE')?.i18NKey;

        ev.offendingPlayerName = offender?.playerName;
        ev.offendingPlayerDorsal = offender?.shirtNumber;
        ev.cardType = cardType === 'RED' ? 'RED' : 'YELLOW';
      } else if (e.categoryName === 'SUBSTITUTION') {
        const pIn = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'PLAYER_IN')?.player;
        const pOut = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'PLAYER_OUT')?.player;

        ev.playerInName = pIn?.playerName;
        ev.playerInDorsal = pIn?.shirtNumber;
        ev.playerOutName = pOut?.playerName;
        ev.playerOutDorsal = pOut?.shirtNumber;
      }

      return ev;
    });

    return {
      available: true,
      gameId: matchGame.id,
      jornada,
      scoreHome: gameData.gameInfo?.scoreHome,
      scoreAway: gameData.gameInfo?.scoreAway,
      homeTeamName: gameData.gameInfo?.homeTeam?.name,
      awayTeamName: gameData.gameInfo?.awayTeam?.name,
      eventsCount: events.length,
      events,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar Die Ligen';
    return {
      available: false,
      jornada,
      reason: msg,
    };
  }
}
