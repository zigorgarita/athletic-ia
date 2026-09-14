import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * ============================================================================
 * CLIENTE OFICIAL RFEF (DIVISIÓN DE HONOR JUVENIL · GRUPO 2)
 * ============================================================================
 * Consulta en SOLO LECTURA los endpoints federativos oficiales de resultados,
 * actas y clasificaciones mediante curl y sesión de cookies para sortear el
 * cookie-gate de la federación.
 *
 * Parámetros oficiales 2026-27:
 * - CodPrimaria: 1000120
 * - CodTemporada: 22 (Temporada 2026-27)
 * - CodCompeticion: 33836116 (División de Honor Juvenil)
 * - CodGrupo: 33836118 (Grupo 2)
 * ============================================================================
 */

export const RFEF_CONSTANTS = {
  BASE_URL: 'https://resultados.rfef.es/pnfg/NPcd',
  COD_PRIMARIA: 1000120,
  COD_TEMPORADA: 22,
  COD_COMPETICION: 33836116,
  COD_GRUPO: 33836118,
};

function getCookiePath(): string {
  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  return path.join(scratchDir, 'cookies.txt');
}

/**
 * Ejecuta una petición HTTP a la RFEF utilizando curl.exe con gestión automática
 * de cookie jar y seguimiento de redirecciones (-L), devolviendo el HTML decodificado en latin1.
 */
export function fetchRFEFRaw(url: string, timeoutMs: number = 15000): string {
  const cookiePath = getCookiePath();

  try {
    const stdout = execFileSync(
      'curl.exe',
      [
        '-s',
        '-c',
        cookiePath,
        '-b',
        cookiePath,
        '-L',
        '--max-time',
        String(Math.round(timeoutMs / 1000)),
        url,
      ],
      {
        encoding: 'buffer',
        maxBuffer: 15 * 1024 * 1024,
      }
    );

    return stdout.toString('latin1');
  } catch (err: any) {
    throw new Error(`Error al consultar RFEF en ${url}: ${err.message || err}`);
  }
}

export type RFEFDataSource = 'live' | 'snapshot' | 'none';

export interface RFEFFetchResult {
  html: string;
  source: RFEFDataSource;
  bytes: number;
  url: string;
  snapshotPath?: string;
  liveError?: string;
}

/**
 * Consulta la página de calendario/partidos de una jornada específica detallando el origen (live vs snapshot).
 */
export function fetchRFEFCalendarPageDetailed(jornada: number): RFEFFetchResult {
  const url = `${RFEF_CONSTANTS.BASE_URL}/NFG_CmpJornada?cod_primaria=${RFEF_CONSTANTS.COD_PRIMARIA}&CodCompeticion=${RFEF_CONSTANTS.COD_COMPETICION}&CodGrupo=${RFEF_CONSTANTS.COD_GRUPO}&CodTemporada=${RFEF_CONSTANTS.COD_TEMPORADA}&CodJornada=${jornada}`;
  let liveHtml = '';
  let liveError: string | undefined;

  try {
    liveHtml = fetchRFEFRaw(url);
  } catch (err: any) {
    liveError = err.message || String(err);
  }

  if (liveHtml && liveHtml.length >= 500) {
    return {
      html: liveHtml,
      source: 'live',
      bytes: liveHtml.length,
      url,
    };
  }

  // Fallback a snapshot/fixture local si existe
  const candidatePaths = [
    path.join(process.cwd(), `scratch/live_jornada_${jornada}_raw.html`),
    path.join(process.cwd(), `scratch/live_jornada_${jornada}_fresh.html`),
    path.join(process.cwd(), `scratch/live_jornada_${jornada}_audit.html`),
    path.join(process.cwd(), `scratch/rfef_jornada_${jornada}.html`),
    path.join(process.cwd(), `scratch/rfef_j${jornada}_latest.html`),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 500) {
      const snapContent = fs.readFileSync(p, 'latin1');
      return {
        html: snapContent,
        source: 'snapshot',
        bytes: snapContent.length,
        url,
        snapshotPath: path.basename(p),
        liveError: liveError || 'RFEF devolvió respuesta vacía (0 bytes / cookie-gate)',
      };
    }
  }

  return {
    html: liveHtml || '',
    source: 'none',
    bytes: (liveHtml || '').length,
    url,
    liveError: liveError || 'RFEF devolvió respuesta vacía y no existe snapshot local',
  };
}

export function fetchRFEFCalendarPage(jornada: number): string {
  return fetchRFEFCalendarPageDetailed(jornada).html;
}

/**
 * Consulta el acta oficial completa de un partido por su CodActa detallando el origen (live vs snapshot).
 */
export function fetchRFEFActaPageDetailed(codActa: string | number): RFEFFetchResult {
  const url = `${RFEF_CONSTANTS.BASE_URL}/NFG_CmpPartido?cod_primaria=${RFEF_CONSTANTS.COD_PRIMARIA}&CodActa=${codActa}&cod_acta=${codActa}`;
  let liveHtml = '';
  let liveError: string | undefined;

  try {
    liveHtml = fetchRFEFRaw(url);
  } catch (err: any) {
    liveError = err.message || String(err);
  }

  if (liveHtml && liveHtml.length >= 500) {
    return {
      html: liveHtml,
      source: 'live',
      bytes: liveHtml.length,
      url,
    };
  }

  // Fallback a snapshot/fixture local si existe
  const candidatePaths = [
    path.join(process.cwd(), `scratch/live_acta_${codActa}_j2.html`),
    path.join(process.cwd(), `scratch/live_acta_${codActa}_fresh.html`),
    path.join(process.cwd(), `scratch/live_acta_${codActa}_audit.html`),
    path.join(process.cwd(), `scratch/rfef_acta_${codActa}.html`),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 500) {
      const snapContent = fs.readFileSync(p, 'latin1');
      return {
        html: snapContent,
        source: 'snapshot',
        bytes: snapContent.length,
        url,
        snapshotPath: path.basename(p),
        liveError: liveError || 'RFEF devolvió respuesta vacía (0 bytes / cookie-gate)',
      };
    }
  }

  return {
    html: liveHtml || '',
    source: 'none',
    bytes: (liveHtml || '').length,
    url,
    liveError: liveError || 'RFEF devolvió respuesta vacía y no existe snapshot local',
  };
}

export function fetchRFEFActaPage(codActa: string | number): string {
  return fetchRFEFActaPageDetailed(codActa).html;
}

/**
 * Consulta la clasificación oficial de una jornada específica detallando el origen (live vs snapshot).
 */
export function fetchRFEFStandingsPageDetailed(jornada: number): RFEFFetchResult {
  const url = `${RFEF_CONSTANTS.BASE_URL}/NFG_VisClasificacion?cod_primaria=${RFEF_CONSTANTS.COD_PRIMARIA}&codtemporada=${RFEF_CONSTANTS.COD_TEMPORADA}&codcompeticion=${RFEF_CONSTANTS.COD_COMPETICION}&codgrupo=${RFEF_CONSTANTS.COD_GRUPO}&codjornada=${jornada}`;
  let liveHtml = '';
  let liveError: string | undefined;

  try {
    liveHtml = fetchRFEFRaw(url);
  } catch (err: any) {
    liveError = err.message || String(err);
  }

  if (liveHtml && liveHtml.length >= 500) {
    return {
      html: liveHtml,
      source: 'live',
      bytes: liveHtml.length,
      url,
    };
  }

  // Fallback a snapshot/fixture local si existe
  const candidatePaths = [
    path.join(process.cwd(), `scratch/live_clasificacion_j${jornada}_raw.html`),
    path.join(process.cwd(), `scratch/live_clasificacion_j${jornada}_audit.html`),
    path.join(process.cwd(), `scratch/rfef_clasificacion_j${jornada}.html`),
    path.join(process.cwd(), `scratch/rfef_clasif_j${jornada}_test.html`),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 500) {
      const snapContent = fs.readFileSync(p, 'latin1');
      return {
        html: snapContent,
        source: 'snapshot',
        bytes: snapContent.length,
        url,
        snapshotPath: path.basename(p),
        liveError: liveError || 'RFEF devolvió respuesta vacía (0 bytes / cookie-gate)',
      };
    }
  }

  return {
    html: liveHtml || '',
    source: 'none',
    bytes: (liveHtml || '').length,
    url,
    liveError: liveError || 'RFEF devolvió respuesta vacía y no existe snapshot local',
  };
}

export function fetchRFEFStandingsPage(jornada: number): string {
  return fetchRFEFStandingsPageDetailed(jornada).html;
}


