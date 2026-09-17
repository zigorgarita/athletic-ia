/**
 * scripts/rfef-bridge-probe.js
 * 
 * Sonda diagnóstica local (P3.4) para validar la comunicación
 * desde Athletic IA (Preview HTTPS en Vercel) hacia localhost en Chrome/Windows.
 *
 * RESTRICCIONES ESTRICTAS:
 * - Escucha exclusivamente en 127.0.0.1:41189 (loopback).
 * - Cero acceso a RFEF, curl o comandos del sistema operativo.
 * - Cero acceso a archivos o bases de datos (Supabase/SQL).
 * - Cero secretos o credenciales.
 * - CORS / PNA con allowlist estricta de Origins legítimos.
 */

const http = require('http');

const HOST = '127.0.0.1';
const PORT = 41189;

// Allowlist estricta de orígenes permitidos
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

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  // Si se recibe cabecera Origin (petición desde navegador), validar allowlist
  if (origin && !isAllowedOrigin(origin)) {
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({
      ok: false,
      error: 'Origin no autorizado'
    }));
    return;
  }

  // Preflight CORS / Private Network Access (OPTIONS)
  if (req.method === 'OPTIONS') {
    if (pathname !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Ruta no encontrada' }));
      return;
    }
    const headers = getCorsHeaders(origin);
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // Endpoint de salud: GET /health
  if (req.method === 'GET') {
    if (pathname !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Ruta no encontrada' }));
      return;
    }

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(origin)
    };

    res.writeHead(200, headers);
    res.end(JSON.stringify({
      ok: true,
      service: 'athletic-ia-rfef-bridge-probe'
    }));
    return;
  }

  // Métodos no permitidos
  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'Metodo no permitido' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[OK] athletic-ia-rfef-bridge-probe escuchando en http://${HOST}:${PORT}`);
  console.log(`[INFO] Endpoint: GET http://${HOST}:${PORT}/health`);
  console.log(`[INFO] Presiona Ctrl+C para detener el servicio.`);
});
