import { FlexibleReportExtraction, Observation, RivalPlayerThreat } from '@/types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Convierte enlaces compartidos de Google Drive / Docs a URLs de descarga directa de bytes.
 */
export function transformGoogleDriveUrl(url: string): string {
  if (!url) return url;

  // 1. URLs de archivos de Google Drive:
  //    https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  //    https://drive.google.com/open?id=FILE_ID
  //    https://drive.google.com/uc?id=FILE_ID
  const driveFileRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i;
  const match = url.match(driveFileRegex);
  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // 2. URLs de Google Docs / Presentations / Spreadsheets:
  const docsFileRegex = /docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/i;
  const docsMatch = url.match(docsFileRegex);
  if (docsMatch && docsMatch[1]) {
    const fileId = docsMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

/**
 * Descarga los bytes del archivo desde una URL y maneja reintentos de confirmación en Google Drive.
 */
export async function downloadFileFromUrl(rawUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const targetUrl = transformGoogleDriveUrl(rawUrl);

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo descargar el documento desde la URL especificada (Status HTTP ${response.status}).`);
  }

  let contentType = response.headers.get('content-type') || '';
  const arrayBuf = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuf);

  // Manejo de la página de confirmación de aviso de virus para archivos grandes en Google Drive
  if (contentType.includes('text/html') && targetUrl.includes('drive.google.com')) {
    const htmlText = buffer.toString('utf-8');
    const confirmMatch = htmlText.match(/href="(\/uc\?export=download[^"]+confirm=[^"&]+[^"]*)"/i) ||
                         htmlText.match(/confirm=([a-zA-Z0-9_-]+)/i);

    if (confirmMatch) {
      const confirmUrl = confirmMatch[1].startsWith('/')
        ? `https://drive.google.com${confirmMatch[1]}`
        : `${targetUrl}&confirm=${confirmMatch[1]}`;

      const retryRes = await fetch(confirmUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      if (retryRes.ok) {
        contentType = retryRes.headers.get('content-type') || contentType;
        buffer = Buffer.from(await retryRes.arrayBuffer());
      }
    }
  }

  return { buffer, contentType };
}

/**
 * Valida la integridad del buffer descargado mediante inspección de firma de bytes (Magic Bytes).
 */
export function validateDocumentBuffer(buffer: Buffer, requestedMime?: string): { mimeType: string } {
  if (!buffer || buffer.length === 0) {
    throw new Error('El archivo descargado está vacío (0 bytes).');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(`El archivo supera el tamaño máximo permitido (25 MB). Tamaño recibido: ${sizeMb} MB.`);
  }

  const headerAscii = buffer.slice(0, 200).toString('utf-8').toLowerCase();

  // Detección de páginas HTML (devueltas cuando el enlace de Drive no es público o requiere visibilidad)
  if (headerAscii.includes('<!doctype html') || headerAscii.includes('<html') || headerAscii.includes('<head')) {
    throw new Error('La URL no proporciona acceso directo al archivo PDF (devuelve una página HTML de vista previa). Comprueba que los permisos del enlace en Google Drive estén configurados como "Cualquier persona con el enlace".');
  }

  // Detección de firma PDF (%PDF-)
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('utf-8') === '%PDF') {
    return { mimeType: 'application/pdf' };
  }

  // Detección de imágenes JPEG
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg' };
  }

  // Detección de imágenes PNG
  if (buffer.length >= 8 && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { mimeType: 'image/png' };
  }

  // Detección de imágenes WEBP
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('utf-8') === 'RIFF') {
    return { mimeType: 'image/webp' };
  }

  if (requestedMime === 'application/pdf' || !requestedMime) {
    throw new Error('El contenido descargado no es un archivo PDF válido (la cabecera de bytes no contiene la firma %PDF-).');
  }

  if (!ALLOWED_MIME_TYPES.includes(requestedMime) && !requestedMime.startsWith('image/')) {
    throw new Error(`El formato del documento (${requestedMime}) no está soportado.`);
  }

  return { mimeType: requestedMime };
}

/**
 * Normaliza y sanea de forma flexible la estructura JSON devuelta por la IA.
 * Garantiza que estado = 'pendiente' para toda extracción RAW.
 */
export function normalizeExtractionJson(rawJson: Record<string, unknown>): {
  extraction: FlexibleReportExtraction;
  totalObs: number;
  countRival: number;
  countAnalyst: number;
  countThreats: number;
} {
  if (!rawJson || typeof rawJson !== 'object') {
    return {
      extraction: {
        metadatos: { tituloDocumento: 'Informe' },
        observacionesRival: {},
        propuestasDelAnalista: {},
        amenazasJugadores: [],
      },
      totalObs: 0,
      countRival: 0,
      countAnalyst: 0,
      countThreats: 0,
    };
  }

  const metadatos = (rawJson.metadatos || rawJson.metadata || {}) as Record<string, unknown>;

  // Helper de saneamiento de cada observación (estado SIEMPRE 'pendiente')
  const sanitizeObsItem = (item: Record<string, unknown>, defaultCat: string, isAnalyst: boolean): Observation => {
    return {
      ...(item as unknown as Observation),
      categoria: (item.categoria as string) || defaultCat,
      contenido: (item.contenido as string) || (item.observacion as string) || (item.datoLiteral as string) || '',
      deduccionIA: (item.deduccionIA as string) || (item.deduccion as string) || (item.analisisIA as string) || undefined,
      propuestaIndautxu: (item.propuestaIndautxu as string) || (item.propuesta_indautxu as string) || undefined,
      fuente: ((item.fuente as string) || 'texto') as Observation['fuente'],
      pagina: (item.pagina as number) || 1,
      evidenciaOriginal: (item.evidenciaOriginal as string) || (item.evidencia as string) || undefined,
      evidencias: item.evidencias as Observation['evidencias'],
      confianza: ((item.confianza as string) || 'alta') as Observation['confianza'],
      estado: 'pendiente', // OBLIGATORIO: Ningún dato llega aprobado automáticamente
      prioridad: ((item.prioridad as string) || 'normal') as Observation['prioridad'],
      esPropuestaAnalista: isAnalyst,
    };
  };

  // 1. Extraer Observaciones del Rival
  const rawRival =
    rawJson.observacionesRival ||
    rawJson.observaciones_rival ||
    rawJson.hechosRival ||
    rawJson.hechos_rival ||
    rawJson.observaciones ||
    rawJson.observaciones_del_rival;

  const observacionesRival: Record<string, Observation[]> = {};
  let countRival = 0;

  if (rawRival && typeof rawRival === 'object' && !Array.isArray(rawRival)) {
    Object.entries(rawRival as Record<string, unknown>).forEach(([cat, items]) => {
      if (Array.isArray(items)) {
        observacionesRival[cat] = items.map(item => sanitizeObsItem(item as Record<string, unknown>, cat, false));
        countRival += items.length;
      }
    });
  } else if (Array.isArray(rawRival)) {
    rawRival.forEach(item => {
      const rec = item as Record<string, unknown>;
      const cat = (rec.categoria as string) || 'salidaBalon';
      if (!observacionesRival[cat]) observacionesRival[cat] = [];
      observacionesRival[cat].push(sanitizeObsItem(rec, cat, false));
      countRival++;
    });
  }

  // 2. Extraer Propuestas del Analista
  const rawAnalyst =
    rawJson.propuestasDelAnalista ||
    rawJson.propuestas_del_analista ||
    rawJson.propuestasAnalista ||
    rawJson.propuestas_analista ||
    rawJson.recomendaciones ||
    rawJson.recomendacionesAnalista;

  const propuestasDelAnalista: Record<string, Observation[]> = {};
  let countAnalyst = 0;

  if (rawAnalyst && typeof rawAnalyst === 'object' && !Array.isArray(rawAnalyst)) {
    Object.entries(rawAnalyst as Record<string, unknown>).forEach(([cat, items]) => {
      if (Array.isArray(items)) {
        propuestasDelAnalista[cat] = items.map(item => sanitizeObsItem(item as Record<string, unknown>, cat, true));
        countAnalyst += items.length;
      }
    });
  } else if (Array.isArray(rawAnalyst)) {
    rawAnalyst.forEach(item => {
      const rec = item as Record<string, unknown>;
      const cat = (rec.categoria as string) || 'planAtaque';
      if (!propuestasDelAnalista[cat]) propuestasDelAnalista[cat] = [];
      propuestasDelAnalista[cat].push(sanitizeObsItem(rec, cat, true));
      countAnalyst++;
    });
  }

  // 3. Extraer Amenazas de Jugadores
  const rawThreats =
    rawJson.amenazasJugadores ||
    rawJson.amenazas_jugadores ||
    rawJson.jugadoresPeligrosos ||
    rawJson.amenazas_individuales ||
    rawJson.amenazas ||
    rawJson.jugadoresPeligros ||
    rawJson.jugadoresDestacados;

  let rawThreatList: Record<string, unknown>[] = [];
  if (Array.isArray(rawThreats)) {
    rawThreatList = rawThreats as Record<string, unknown>[];
  } else if (rawThreats && typeof rawThreats === 'object') {
    Object.values(rawThreats as Record<string, unknown>).forEach(val => {
      if (Array.isArray(val)) rawThreatList.push(...(val as Record<string, unknown>[]));
      else if (val && typeof val === 'object') rawThreatList.push(val as Record<string, unknown>);
    });
  }

  const amenazasJugadores: RivalPlayerThreat[] = rawThreatList.map((t) => ({
    ...(t as unknown as RivalPlayerThreat),
    observaciones: (t.observaciones as string) || (t.contenido as string) || (t.datoLiteral as string) || '',
    deduccionIA: (t.deduccionIA as string) || (t.deduccion as string) || undefined,
    propuestaIndautxu: (t.propuestaIndautxu as string) || (t.consignaEspecifica as string) || undefined,
    nivelPeligro: ((t.nivelPeligro as string) || 'alto') as RivalPlayerThreat['nivelPeligro'],
    pagina: (t.pagina as number) || 11,
  }));

  const countThreats = amenazasJugadores.length;
  const totalObs = countRival + countAnalyst + countThreats;

  return {
    extraction: {
      metadatos: metadatos as FlexibleReportExtraction['metadatos'],
      observacionesRival,
      propuestasDelAnalista,
      amenazasJugadores,
    },
    totalObs,
    countRival,
    countAnalyst,
    countThreats,
  };
}
