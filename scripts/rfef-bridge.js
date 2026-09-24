/**
 * scripts/rfef-bridge.js
 * 
 * ATHLETIC IA — PUENTE LOCAL RFEF (P3.5 / P4.4)
 * 
 * Micro-servicio local para la adquisición segura de calendarios y actas oficiales RFEF
 * mediante la pila TLS nativa de Windows (curl.exe / Schannel).
 * 
 * RESTRICCIONES Y SEGURIDAD:
 * - Bind exclusivo a 127.0.0.1:41189 (loopback).
 * - Cero privilegios de administrador.
 * - Cero shell concatenation: child_process.execFile con array de argumentos.
 * - Validación estricta de parámetro 'jornada' (entero 1 a 30).
 * - URL canónica PascalCase inmutable: CodTemporada=22, CodCompeticion=33836116, CodGrupo=33836118.
 * - Validación estructural del HTML en memoria (CodCompeticion, CodGrupo, font_widgetL/V, Jornada).
 * - Presupuesto global duro de 12 segundos para toda la adquisición.
 * - Retry escalonado de 4 intentos (inmediato, +1.5s, +2.5s con sesión nueva de recuperación, +3.5s).
 * - Protección estricta de sesión válida entre calendario y actas.
 * - Cancelación limpia ante cierre de conexión HTTP del cliente.
 * - Cero persistencia en disco de HTML ni portapapeles.
 * - Cookies efímeras en os.tmpdir() eliminadas en bloque finally.
 * - CORS / Private Network Access (PNA) con allowlist estricta para Athletic IA.
 */

const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOST = '127.0.0.1';
const PORT = parseInt(process.env.PORT || '41189', 10);
const CURL_PATH = 'C:\\Windows\\System32\\curl.exe';
const MAX_GLOBAL_BUDGET_MS = 12000; // Presupuesto global duro de 12 segundos

// Allowlist estricta de orígenes autorizados
const ALLOWED_STATIC_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://athletic-ia.vercel.app',
  'https://indautxu2026.vercel.app'
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_STATIC_ORIGINS.has(origin)) return true;
  // Dominios de Preview de Vercel para Athletic IA (zigorgaritas-projects o subdominios vercel.app)
  if (/^https:\/\/athletic(-ia)?(-[a-z0-9]+)*(-zigorgaritas-projects)?\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Request-Private-Network',
    'Access-Control-Allow-Private-Network': 'true',
    'Vary': 'Origin, Access-Control-Request-Private-Network'
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function sendJsonResponse(res, statusCode, data, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(origin)
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

function calculateRemainingMs(startTime) {
  const elapsed = Date.now() - startTime;
  return Math.max(0, MAX_GLOBAL_BUDGET_MS - elapsed);
}

function calculateCurlTimeoutSec(remainingMs) {
  return Math.max(1, Math.min(4, Math.floor(remainingMs / 1000)));
}

/**
 * Adquisición de calendario oficial RFEF con gestión de sesión y retry escalonado.
 * Respeta el presupuesto global duro de 12 segundos.
 */
function fetchRfefJornada(jornada, sessionCookiePath, globalStartTime, cancelToken) {
  return new Promise((resolve, reject) => {
    const startTime = globalStartTime || Date.now();
    const ownsCookie = !sessionCookiePath;
    let cookieFile = sessionCookiePath || path.join(os.tmpdir(), `rfef_cookie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);

    if (ownsCookie) {
      try {
        fs.writeFileSync(cookieFile, '');
      } catch (e) {
        // Ignorar si falla la creación vacía inicial
      }
    }

    const delays = [0, 1500, 2500, 3500]; // Retardos entre intentos: Intento 1 (0ms), Intento 2 (+1.5s), Intento 3 (+2.5s), Intento 4 (+3.5s)
    let currentChild = null;
    let activeTimer = null;

    if (cancelToken) {
      cancelToken.onCancel(() => {
        if (activeTimer) clearTimeout(activeTimer);
        if (currentChild) {
          try { currentChild.kill(); } catch (e) {}
        }
      });
    }

    const cleanup = () => {
      if (ownsCookie) {
        try {
          if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
        } catch (cleanupErr) {
          // Fallback silencioso de limpieza
        }
      }
    };

    const runAttempt = (attempt) => {
      if (cancelToken && cancelToken.isCancelled) {
        cleanup();
        return reject({ type: 'ABORTED', message: 'Petición cancelada por el cliente.' });
      }

      const remainingMs = calculateRemainingMs(startTime);
      if (remainingMs < 500) {
        cleanup();
        return reject({
          type: 'RFEF_TEMPORARILY_UNAVAILABLE',
          message: 'La federación (RFEF) no ha devuelto datos tras agotar el tiempo máximo de espera. Por favor, inténtalo de nuevo en unos segundos pulsando "Actualizar desde RFEF".',
          retriesExhausted: attempt - 1,
          elapsedMs: Date.now() - startTime
        });
      }

      // En el intento 3: Si la sesión existente continúa devolviendo cuerpo vacío, se abre una sesión nueva como estrategia de recuperación.
      if (attempt === 3 && ownsCookie) {
        console.log(`[RFEF] Intento ${attempt}: Si la sesión existente continúa devolviendo cuerpo vacío, se abre una sesión nueva como estrategia de recuperación.`);
        try {
          if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
        } catch (e) {}
        cookieFile = path.join(os.tmpdir(), `rfef_cookie_recov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);
        try {
          fs.writeFileSync(cookieFile, '');
        } catch (e) {}
      }

      const curlTimeoutSec = calculateCurlTimeoutSec(remainingMs);
      const url = `https://resultados.rfef.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=33836116&CodGrupo=33836118&CodTemporada=22&CodJornada=${jornada}&Sch_Codigo_Delegacion=&Sch_Tipo_Juego=`;

      const args = [
        '-s',
        '--http1.1',
        '-L',
        '--max-time', String(curlTimeoutSec),
        '--cookie-jar', cookieFile,
        '--cookie', cookieFile,
        url
      ];

      currentChild = execFile(CURL_PATH, args, { maxBuffer: 10 * 1024 * 1024, encoding: 'latin1' }, (error, stdout) => {
        currentChild = null;
        const html = stdout || '';

        // Si la respuesta es vacía o insuficiente (< 1000 bytes) y quedan intentos
        if (html.length < 1000 && attempt < 4) {
          const nextDelay = delays[attempt]; // attempt 1 -> delays[1] (1500ms), attempt 2 -> delays[2] (2500ms), attempt 3 -> delays[3] (3500ms)
          const newRemainingMs = calculateRemainingMs(startTime);

          if (newRemainingMs > nextDelay + 500) {
            console.log(`[RFEF] Intento ${attempt} vacío (${html.length} bytes) para Jornada ${jornada}. Reintentando en ${nextDelay} ms (quedan ${newRemainingMs} ms)...`);
            activeTimer = setTimeout(() => {
              activeTimer = null;
              runAttempt(attempt + 1);
            }, nextDelay);
            return;
          }
        }

        cleanup();

        if (html.length < 1000) {
          return reject({
            type: 'RFEF_TEMPORARILY_UNAVAILABLE',
            message: 'La federación (RFEF) no ha devuelto datos tras varios intentos de conexión. Por favor, inténtalo de nuevo en unos segundos pulsando "Actualizar desde RFEF".',
            retriesExhausted: attempt,
            elapsedMs: Date.now() - startTime
          });
        }

        if (error) {
          return reject({ type: 'CURL_ERROR', message: 'Error de conexión curl con la RFEF.', elapsedMs: Date.now() - startTime });
        }

        // Validaciones estructurales oficiales
        if (!html.includes('NFG_CmpJornada') || !html.includes('CodCompeticion=33836116') || !html.includes('CodGrupo=33836118')) {
          return reject({ type: 'INVALID_HTML', message: 'El contenido recibido no contiene la estructura oficial de la RFEF.', elapsedMs: Date.now() - startTime });
        }

        if (!html.includes('class=font_widgetL') || !html.includes('class=font_widgetV')) {
          return reject({ type: 'INVALID_HTML', message: 'La página de la RFEF no contiene partidos oficiales (tabla de resultados vacía).', elapsedMs: Date.now() - startTime });
        }

        const hasJornada =
          html.includes(`<strong>Jornada</strong> ${jornada}`) ||
          html.includes(`CodJornada=${jornada}&`) ||
          html.includes(`Jornada ${jornada}`);

        if (!hasJornada) {
          return reject({ type: 'INVALID_HTML', message: `El contenido recibido no parece corresponder a la Jornada ${jornada}.`, elapsedMs: Date.now() - startTime });
        }

        resolve({ html, sessionCookiePath: cookieFile, elapsedMs: Date.now() - startTime });
      });
    };

    runAttempt(1);
  });
}

/**
 * Adquisición de un acta oficial RFEF.
 * Si recibe una sesión principal válida del calendario, la usa sin destruirla.
 * Si un acta requiere sesión de recuperación, usa un jar secundario aislado.
 */
function fetchRfefActa(codActa, mainSessionCookiePath, globalStartTime, cancelToken) {
  return new Promise((resolve, reject) => {
    const startTime = globalStartTime || Date.now();
    const delays = [0, 1500, 2500, 3500];
    let currentChild = null;
    let activeTimer = null;
    let isolatedRecoveryJar = null;

    if (cancelToken) {
      cancelToken.onCancel(() => {
        if (activeTimer) clearTimeout(activeTimer);
        if (currentChild) {
          try { currentChild.kill(); } catch (e) {}
        }
      });
    }

    const cleanup = () => {
      if (isolatedRecoveryJar) {
        try {
          if (fs.existsSync(isolatedRecoveryJar)) fs.unlinkSync(isolatedRecoveryJar);
        } catch (e) {}
      }
    };

    const runAttempt = (attempt) => {
      if (cancelToken && cancelToken.isCancelled) {
        cleanup();
        return reject({ type: 'ABORTED', message: 'Petición cancelada por el cliente.' });
      }

      const remainingMs = calculateRemainingMs(startTime);
      if (remainingMs < 500) {
        cleanup();
        return reject({
          type: 'RFEF_TEMPORARILY_UNAVAILABLE',
          message: `Tiempo límite agotado para el acta ${codActa}.`,
          retriesExhausted: attempt - 1,
          elapsedMs: Date.now() - startTime
        });
      }

      // En intento 3 y 4: Si la sesión existente continúa devolviendo cuerpo vacío, se abre una sesión nueva aislada de recuperación para este acta
      let activeCookieJar = mainSessionCookiePath;
      if (attempt >= 3) {
        if (!isolatedRecoveryJar) {
          console.log(`[RFEF] Acta ${codActa} intento ${attempt}: Si la sesión existente continúa devolviendo cuerpo vacío, se abre una sesión nueva como estrategia de recuperación aislada.`);
          isolatedRecoveryJar = path.join(os.tmpdir(), `rfef_acta_${codActa}_recov_${Date.now()}.txt`);
          try { fs.writeFileSync(isolatedRecoveryJar, ''); } catch (e) {}
        }
        activeCookieJar = isolatedRecoveryJar;
      } else if (!activeCookieJar) {
        if (!isolatedRecoveryJar) {
          isolatedRecoveryJar = path.join(os.tmpdir(), `rfef_acta_${codActa}_init_${Date.now()}.txt`);
          try { fs.writeFileSync(isolatedRecoveryJar, ''); } catch (e) {}
        }
        activeCookieJar = isolatedRecoveryJar;
      }

      const curlTimeoutSec = calculateCurlTimeoutSec(remainingMs);
      const url = `https://resultados.rfef.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${codActa}&cod_acta=${codActa}`;

      const args = [
        '-s',
        '--http1.1',
        '-L',
        '--max-time', String(curlTimeoutSec),
        '--cookie-jar', activeCookieJar,
        '--cookie', activeCookieJar,
        url
      ];

      currentChild = execFile(CURL_PATH, args, { maxBuffer: 15 * 1024 * 1024, encoding: 'latin1' }, (error, stdout) => {
        currentChild = null;
        const html = stdout || '';

        // Si la respuesta del acta es vacía o insuficiente (< 1000 bytes) y quedan intentos
        if (html.length < 1000 && attempt < 4) {
          const nextDelay = delays[attempt];
          const newRemainingMs = calculateRemainingMs(startTime);

          if (newRemainingMs > nextDelay + 500) {
            console.log(`[RFEF] Intento ${attempt} vacío (${html.length} bytes) para Acta ${codActa}. Reintentando en ${nextDelay} ms...`);
            activeTimer = setTimeout(() => {
              activeTimer = null;
              runAttempt(attempt + 1);
            }, nextDelay);
            return;
          }
        }

        cleanup();

        if (html.length < 1000) {
          return reject({
            type: 'RFEF_TEMPORARILY_UNAVAILABLE',
            message: `Acta ${codActa} no disponible o no publicada aún tras ${attempt} intentos.`,
            retriesExhausted: attempt,
            elapsedMs: Date.now() - startTime
          });
        }

        if (error) {
          return reject({ type: 'CURL_ERROR', message: `Error de conexión curl para el acta ${codActa}.` });
        }

        // Validaciones estructurales robustas del acta oficial RFEF
        if (html.length < 10000) {
          return reject({ type: 'INVALID_HTML', message: `Respuesta del acta ${codActa} insuficiente o vacía.` });
        }

        if (!html.includes('font_widgetL') && !html.includes('font_widgetV') && !html.includes('font_widget')) {
          return reject({ type: 'INVALID_HTML', message: `El acta ${codActa} no contiene datos de equipos o no está disponible.` });
        }

        if (!/titulares/i.test(html) && !/alineaci/i.test(html)) {
          return reject({ type: 'INVALID_HTML', message: `La respuesta no contiene las alineaciones oficiales del acta ${codActa}.` });
        }

        resolve(html);
      });
    };

    runAttempt(1);
  });
}

function extractCodActas(calendarHtml) {
  if (!calendarHtml || typeof calendarHtml !== 'string') return [];
  const codActas = new Set();

  // Extraer EXCLUSIVAMENTE enlaces a NFG_CmpPartido que contengan CodActa o cod_acta (actas oficiales publicadas)
  const linkRegex = /NFG_CmpPartido[^"'>\s]+/gi;
  let match;
  while ((match = linkRegex.exec(calendarHtml)) !== null) {
    const urlString = match[0];
    const idMatch = urlString.match(/[?&](?:CodActa|cod_acta)=(\d+)/i);
    if (idMatch && idMatch[1]) {
      const val = parseInt(idMatch[1], 10);
      if (val > 0) {
        codActas.add(val);
      }
    }
  }

  return Array.from(codActas);
}

function extractPendingCodActas(calendarHtml) {
  if (!calendarHtml || typeof calendarHtml !== 'string') return [];
  const pendingActas = new Set();

  // Extraer enlaces a NFG_CmpPrevio (partidos no disputados o en previa sin acta oficial publicada aún)
  const linkRegex = /NFG_CmpPrevio[^"'>\s]+/gi;
  let match;
  while ((match = linkRegex.exec(calendarHtml)) !== null) {
    const urlString = match[0];
    const idMatch = urlString.match(/[?&](?:CodActa|cod_acta)=(\d+)/i);
    if (idMatch && idMatch[1]) {
      const val = parseInt(idMatch[1], 10);
      if (val > 0) {
        pendingActas.add(val);
      }
    }
  }

  return Array.from(pendingActas);
}

function createCancelToken(req) {
  let isCancelled = false;
  const listeners = [];
  req.on('close', () => {
    isCancelled = true;
    for (const fn of listeners) {
      try { fn(); } catch (e) {}
    }
  });
  return {
    get isCancelled() { return isCancelled; },
    onCancel(fn) { listeners.push(fn); }
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;
  const cancelToken = createCancelToken(req);

  // Validación estricta de Origin si la petición viene desde navegador
  if (origin && !isAllowedOrigin(origin)) {
    sendJsonResponse(res, 403, { ok: false, error: 'Origin no autorizado' }, origin);
    return;
  }

  // Manejo de Preflight OPTIONS (CORS / PNA)
  if (req.method === 'OPTIONS') {
    if (pathname !== '/rfef' && pathname !== '/acta' && pathname !== '/jornada-completa' && pathname !== '/health') {
      sendJsonResponse(res, 404, { ok: false, error: 'Ruta no encontrada' }, origin);
      return;
    }
    res.writeHead(204, getCorsHeaders(origin));
    res.end();
    return;
  }

  // Método no permitido si no es GET
  if (req.method !== 'GET') {
    sendJsonResponse(res, 405, { ok: false, error: 'Método no permitido' }, origin);
    return;
  }

  // Endpoint diagnóstico /health
  if (pathname === '/health') {
    sendJsonResponse(res, 200, { ok: true, service: 'athletic-ia-rfef-bridge' }, origin);
    return;
  }

  // Endpoint oficial /rfef
  if (pathname === '/rfef') {
    const jornadaParam = url.searchParams.get('jornada');

    if (!jornadaParam || !/^[0-9]+$/.test(jornadaParam)) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: "Parámetro 'jornada' inválido. Debe ser un número entero."
      }, origin);
      return;
    }

    const jornada = parseInt(jornadaParam, 10);

    if (jornada < 1 || jornada > 30) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: `Jornada inválida: ${jornada}. Solo se admiten jornadas de 1 a 30.`
      }, origin);
      return;
    }

    const startTime = Date.now();

    try {
      const { html, elapsedMs } = await fetchRfefJornada(jornada, null, startTime, cancelToken);
      const byteLength = Buffer.byteLength(html, 'utf8');

      sendJsonResponse(res, 200, {
        ok: true,
        jornada,
        bytes: byteLength,
        calendarHtml: html,
        elapsedMs
      }, origin);
    } catch (err) {
      if (err.type === 'RFEF_TEMPORARILY_UNAVAILABLE') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'RFEF_TEMPORARILY_UNAVAILABLE',
          error: err.message,
          retriesExhausted: err.retriesExhausted || 4,
          elapsedMs: err.elapsedMs || (Date.now() - startTime)
        }, origin);
      } else if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'INVALID_HTML',
          error: err.message,
          elapsedMs: Date.now() - startTime
        }, origin);
      } else {
        sendJsonResponse(res, 502, {
          ok: false,
          code: 'FETCH_ERROR',
          error: err.message || 'Error de adquisición RFEF.',
          elapsedMs: Date.now() - startTime
        }, origin);
      }
    }
    return;
  }

  // Endpoint oficial /acta (P4.0)
  if (pathname === '/acta') {
    const codActaParam = url.searchParams.get('codActa');

    if (!codActaParam || !/^[0-9]+$/.test(codActaParam)) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: "Parámetro 'codActa' inválido. Debe ser un número entero positivo."
      }, origin);
      return;
    }

    const codActa = parseInt(codActaParam, 10);
    if (codActa <= 0) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: "Parámetro 'codActa' inválido. Debe ser un número entero positivo."
      }, origin);
      return;
    }

    const startTime = Date.now();

    try {
      const html = await fetchRfefActa(codActa, null, startTime, cancelToken);
      const byteLength = Buffer.byteLength(html, 'utf8');

      sendJsonResponse(res, 200, {
        ok: true,
        codActa,
        bytes: byteLength,
        actaHtml: html,
        elapsedMs: Date.now() - startTime
      }, origin);
    } catch (err) {
      if (err.type === 'RFEF_TEMPORARILY_UNAVAILABLE') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'RFEF_TEMPORARILY_UNAVAILABLE',
          error: err.message,
          retriesExhausted: err.retriesExhausted || 4,
          elapsedMs: err.elapsedMs || (Date.now() - startTime)
        }, origin);
      } else if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'INVALID_HTML',
          error: err.message,
          elapsedMs: Date.now() - startTime
        }, origin);
      } else {
        sendJsonResponse(res, 502, {
          ok: false,
          code: 'FETCH_ERROR',
          error: err.message || 'Error de adquisición del acta RFEF.',
          elapsedMs: Date.now() - startTime
        }, origin);
      }
    }
    return;
  }

  // Endpoint oficial /jornada-completa (P4.1 / P4.4 Jornada Parcial con Presupuesto Global Duro)
  if (pathname === '/jornada-completa') {
    const jornadaParam = url.searchParams.get('jornada');

    if (!jornadaParam || !/^[0-9]+$/.test(jornadaParam)) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: "Parámetro 'jornada' inválido. Debe ser un número entero."
      }, origin);
      return;
    }

    const jornada = parseInt(jornadaParam, 10);

    if (jornada < 1 || jornada > 30) {
      sendJsonResponse(res, 400, {
        ok: false,
        error: `Jornada inválida: ${jornada}. Solo se admiten jornadas de 1 a 30.`
      }, origin);
      return;
    }

    const startTime = Date.now();
    const uniqueSessionId = `rfef_session_j${jornada}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`;
    const sessionCookiePath = path.join(os.tmpdir(), uniqueSessionId);
    try {
      fs.writeFileSync(sessionCookiePath, '');
    } catch (e) {}

    try {
      // 1. Adquirir calendario de la jornada compartiendo la sesión base
      const { html: calendarHtml } = await fetchRfefJornada(jornada, sessionCookiePath, startTime, cancelToken);
      const calendarBytes = Buffer.byteLength(calendarHtml, 'utf8');
      const codActas = extractCodActas(calendarHtml);
      const codActasPendientes = extractPendingCodActas(calendarHtml);
      const actasEncontradas = codActas.length;

      const actas = [];
      const actasNoDisponibles = [];

      // 2. Procesar cada acta oficial de forma estrictamente aislada reutilizando la sesión del calendario protegida (P4.4)
      for (const codActa of codActas) {
        // Comprobar presupuesto antes de lanzar cada acta
        if (calculateRemainingMs(startTime) < 500) {
          actasNoDisponibles.push({
            codActa,
            error: 'Tiempo límite global agotado antes de procesar este acta.'
          });
          continue;
        }

        try {
          // Se pasa la sesión válida principal; si necesita reintentos avanzados usará un jar aislado sin tocar la principal
          const actaHtml = await fetchRfefActa(codActa, sessionCookiePath, startTime, cancelToken);
          const actaBytes = Buffer.byteLength(actaHtml, 'utf8');
          actas.push({
            codActa,
            bytes: actaBytes,
            actaHtml
          });
        } catch (actaErr) {
          actasNoDisponibles.push({
            codActa,
            error: (actaErr && actaErr.message) ? actaErr.message : 'Acta no disponible o no publicada aún.'
          });
        }
      }

      sendJsonResponse(res, 200, {
        ok: true,
        jornada,
        bytes: calendarBytes,
        calendarHtml,
        actasEncontradas,
        actasDisponibles: actas.length,
        actas,
        actasNoDisponibles,
        codActasPendientes,
        elapsedMs: Date.now() - startTime
      }, origin);
    } catch (err) {
      if (err.type === 'RFEF_TEMPORARILY_UNAVAILABLE') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'RFEF_TEMPORARILY_UNAVAILABLE',
          error: err.message,
          retriesExhausted: err.retriesExhausted || 4,
          elapsedMs: err.elapsedMs || (Date.now() - startTime)
        }, origin);
      } else if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, {
          ok: false,
          code: 'INVALID_HTML',
          error: err.message,
          elapsedMs: Date.now() - startTime
        }, origin);
      } else {
        sendJsonResponse(res, 502, {
          ok: false,
          code: 'FETCH_ERROR',
          error: err.message || 'Error de adquisición RFEF.',
          elapsedMs: Date.now() - startTime
        }, origin);
      }
    } finally {
      try {
        if (fs.existsSync(sessionCookiePath)) {
          fs.unlinkSync(sessionCookiePath);
        }
      } catch (cleanupErr) {
        // Fallback silencioso de limpieza
      }
    }
    return;
  }

  // Cualquier otra ruta no autorizada
  sendJsonResponse(res, 404, { ok: false, error: 'Ruta no encontrada' }, origin);
});

server.listen(PORT, HOST, () => {
  console.log(`[OK] athletic-ia-rfef-bridge escuchando en http://${HOST}:${PORT}`);
  console.log(`[INFO] Endpoints:`);
  console.log(`       GET http://${HOST}:${PORT}/rfef?jornada=3`);
  console.log(`       GET http://${HOST}:${PORT}/acta?codActa=70692435`);
  console.log(`       GET http://${HOST}:${PORT}/jornada-completa?jornada=3`);
  console.log(`       GET http://${HOST}:${PORT}/health`);
  console.log(`[INFO] Presiona Ctrl+C para detener el servicio.`);
});
