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
  season_year_id?: string | number;
  name?: string;
  year?: string;
  season?: string;
  currentSeasonYear?: boolean;
  [key: string]: unknown;
}

export interface DieLigenContest {
  id?: string | number;
  name?: string;
  contest_name?: string;
  title?: string;
  group?: string;
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

    const seasonYearId = currentSeason?.season_year_id ?? currentSeason?.id;
    let competiciones: string[] = [];

    // 4. Obtener competiciones suscritas para esa temporada
    if (seasonYearId !== undefined && seasonYearId !== null) {
      const contests = await fetchDieLigen<DieLigenContest[]>(`/subscribed-contests/${seasonYearId}`);
      if (Array.isArray(contests)) {
        competiciones = contests
          .map((c) => {
            if (typeof c === 'string') return c;
            const name = c.name || c.contest_name || c.title || '';
            const group = c.group ? ` (Grupo ${c.group})` : '';
            return `${name}${group}`.trim();
          })
          .filter(Boolean);
      }
    }

    const temporadaNombre = currentSeason
      ? String(currentSeason.name || currentSeason.season || currentSeason.year || currentSeason.id || '')
      : null;

    return {
      connected: true,
      errorCode: null,
      temporadaActual: temporadaNombre || null,
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
