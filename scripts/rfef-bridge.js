/**
 * scripts/rfef-bridge.js
 * 
 * ATHLETIC IA — PUENTE LOCAL RFEF (P3.5)
 * 
 * Micro-servicio local para la adquisición segura de calendarios oficiales RFEF
 * mediante la pila TLS nativa de Windows (curl.exe / Schannel).
 * 
 * RESTRICCIONES Y SEGURIDAD:
 * - Bind exclusivo a 127.0.0.1:41189 (loopback).
 * - Cero privilegios de administrador.
 * - Cero shell concatenation: child_process.execFile con array de argumentos.
 * - Validación estricta de parámetro 'jornada' (entero 1 a 30).
 * - URL canónica PascalCase inmutable: CodTemporada=22, CodCompeticion=33836116, CodGrupo=33836118.
 * - Validación estructural del HTML en memoria (CodCompeticion, CodGrupo, font_widgetL/V, Jornada).
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

function fetchRfefJornada(jornada, sessionCookiePath) {
  return new Promise((resolve, reject) => {
    const ownsCookie = !sessionCookiePath;
    const cookieFile = sessionCookiePath || path.join(os.tmpdir(), `rfef_cookie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);

    if (ownsCookie) {
      try {
        fs.writeFileSync(cookieFile, '');
      } catch (e) {
        // Ignorar si falla la creación vacía inicial
      }
    }

    const url = `https://resultados.rfef.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=22&CodCompeticion=33836116&CodGrupo=33836118&CodJornada=${jornada}`;

    const args = [
      '-s',
      '--http1.1',
      '-L',
      '--cookie-jar', cookieFile,
      '--cookie', cookieFile,
      url
    ];

    const runCurl = (attempt) => {
      execFile(CURL_PATH, args, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
        const html = stdout || '';

        // Si la RFEF devuelve respuesta vacía por negociación de cookies o silenciamiento, reintentar hasta 3 veces (P4.4)
        if (html.length < 1000 && attempt < 3) {
          console.log(`[RFEF] Intento ${attempt} vacío (${html.length} bytes) para Jornada ${jornada}. Reintentando con cookie establecida...`);
          setTimeout(() => runCurl(attempt + 1), 500);
          return;
        }

        // Limpieza obligatoria del archivo temporal de cookies en finally si es dueño
        if (ownsCookie) {
          try {
            if (fs.existsSync(cookieFile)) {
              fs.unlinkSync(cookieFile);
            }
          } catch (cleanupErr) {
            // Fallback silencioso de limpieza
          }
        }

        if (error) {
          return reject({ type: 'CURL_ERROR', message: 'Error de conexión curl con la RFEF.' });
        }

        // Validaciones estructurales idénticas a rfef-fetch.bat
        if (html.length < 10000) {
          return reject({ type: 'INVALID_HTML', message: 'Respuesta de la RFEF insuficiente o vacía.' });
        }

        if (!html.includes('NFG_CmpJornada')) {
          return reject({ type: 'INVALID_HTML', message: 'El contenido recibido no contiene la estructura oficial de la RFEF.' });
        }

        if (!html.includes('CodCompeticion=33836116')) {
          return reject({ type: 'INVALID_HTML', message: 'La respuesta de la RFEF no contiene la competición oficial (CodCompeticion=33836116).' });
        }

        if (!html.includes('CodGrupo=33836118')) {
          return reject({ type: 'INVALID_HTML', message: 'La respuesta de la RFEF no contiene el grupo oficial (CodGrupo=33836118).' });
        }

        if (!html.includes('class=font_widgetL') || !html.includes('class=font_widgetV')) {
          return reject({ type: 'INVALID_HTML', message: 'La página de la RFEF no contiene partidos oficiales (tabla de resultados vacía).' });
        }

        const hasJornada =
          html.includes(`<strong>Jornada</strong> ${jornada}`) ||
          html.includes(`CodJornada=${jornada}&`) ||
          html.includes(`Jornada ${jornada}`);

        if (!hasJornada) {
          return reject({ type: 'INVALID_HTML', message: `El contenido recibido no parece corresponder a la Jornada ${jornada}.` });
        }

        resolve(html);
      });
    };

    runCurl(1);
  });
}

function fetchRfefActa(codActa, sessionCookiePath) {
  return new Promise((resolve, reject) => {
    const ownsCookie = !sessionCookiePath;
    const cookieFile = sessionCookiePath || path.join(os.tmpdir(), `rfef_cookie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);

    if (ownsCookie) {
      try {
        fs.writeFileSync(cookieFile, '');
      } catch (e) {
        // Ignorar si falla la creación vacía inicial
      }
    }

    const url = `https://resultados.rfef.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${codActa}&cod_acta=${codActa}`;

    const args = [
      '-s',
      '--http1.1',
      '-L',
      '--cookie-jar', cookieFile,
      '--cookie', cookieFile,
      url
    ];

    const runCurl = (attempt) => {
      execFile(CURL_PATH, args, { maxBuffer: 15 * 1024 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
        const html = stdout || '';

        // Si la RFEF devuelve respuesta vacía por negociación de cookies o silenciamiento, reintentar hasta 3 veces
        if (html.length < 1000 && attempt < 3) {
          console.log(`[RFEF] Intento ${attempt} vacío (${html.length} bytes) para Acta ${codActa}. Reintentando con cookie establecida...`);
          setTimeout(() => runCurl(attempt + 1), 500);
          return;
        }

        // Limpieza obligatoria del archivo temporal de cookies en finally si es dueño
        if (ownsCookie) {
          try {
            if (fs.existsSync(cookieFile)) {
              fs.unlinkSync(cookieFile);
            }
          } catch (cleanupErr) {
            // Fallback silencioso de limpieza
          }
        }

        if (error) {
          return reject({ type: 'CURL_ERROR', message: 'Error de conexión curl con la RFEF.' });
        }

        // Validaciones estructurales robustas del acta oficial RFEF
        if (html.length < 10000) {
          return reject({ type: 'INVALID_HTML', message: 'Respuesta del acta RFEF insuficiente o vacía.' });
        }

        if (!html.includes('font_widgetL') && !html.includes('font_widgetV') && !html.includes('font_widget')) {
          return reject({ type: 'INVALID_HTML', message: 'El acta oficial de la RFEF no contiene datos de equipos o no está disponible.' });
        }

        if (!/titulares/i.test(html) && !/alineaci/i.test(html)) {
          return reject({ type: 'INVALID_HTML', message: 'La respuesta de la RFEF no contiene las alineaciones oficiales del acta.' });
        }

        resolve(html);
      });
    };

    runCurl(1);
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

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

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

    try {
      const html = await fetchRfefJornada(jornada);
      const byteLength = Buffer.byteLength(html, 'utf8');

      sendJsonResponse(res, 200, {
        ok: true,
        jornada,
        bytes: byteLength,
        calendarHtml: html
      }, origin);
    } catch (err) {
      if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, { ok: false, error: err.message }, origin);
      } else {
        sendJsonResponse(res, 502, { ok: false, error: err.message || 'Error de adquisición RFEF.' }, origin);
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

    try {
      const html = await fetchRfefActa(codActa);
      const byteLength = Buffer.byteLength(html, 'utf8');

      sendJsonResponse(res, 200, {
        ok: true,
        codActa,
        bytes: byteLength,
        actaHtml: html
      }, origin);
    } catch (err) {
      if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, { ok: false, error: err.message }, origin);
      } else {
        sendJsonResponse(res, 502, { ok: false, error: err.message || 'Error de adquisición del acta RFEF.' }, origin);
      }
    }
    return;
  }

  // Endpoint oficial /jornada-completa (P4.1 / P4.4 Jornada Parcial)
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

    const uniqueSessionId = `rfef_session_j${jornada}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`;
    const sessionCookiePath = path.join(os.tmpdir(), uniqueSessionId);
    try {
      fs.writeFileSync(sessionCookiePath, '');
    } catch (e) {
      // Ignorar si falla la creación vacía inicial
    }

    try {
      const calendarHtml = await fetchRfefJornada(jornada, sessionCookiePath);
      const calendarBytes = Buffer.byteLength(calendarHtml, 'utf8');
      const codActas = extractCodActas(calendarHtml);
      const codActasPendientes = extractPendingCodActas(calendarHtml);
      const actasEncontradas = codActas.length;

      const actas = [];
      const actasNoDisponibles = [];

      // Procesar cada acta oficial de forma estrictamente aislada reutilizando la sesión del calendario (P4.4)
      for (const codActa of codActas) {
        try {
          const actaHtml = await fetchRfefActa(codActa, sessionCookiePath);
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
        codActasPendientes
      }, origin);
    } catch (err) {
      if (err.type === 'INVALID_HTML') {
        sendJsonResponse(res, 422, { ok: false, error: err.message }, origin);
      } else {
        sendJsonResponse(res, 502, { ok: false, error: err.message || 'Error de adquisición RFEF.' }, origin);
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
