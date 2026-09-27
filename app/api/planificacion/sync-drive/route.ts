import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getGoogleDriveAccessToken, uploadGenericBufferToDrive } from '@/lib/google-drive';
import { downloadFileFromUrl } from '@/lib/ai/document-parser';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { isEditorSessionAuthorized, isEditorSessionAuthorizedFromRequest } from '@/lib/auth/session';
import { exportPlanificacionDesglosePdf } from '@/lib/exportPlanificacionDesglosePdf';
import type { PdfAnalysisResult } from '@/app/api/planificacion/analyze-pdf/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos de timeout para descarga y subida a Drive

interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  description?: string;
  appProperties?: Record<string, string>;
}

/**
 * Busca una carpeta por nombre exacto dentro de un padre en Google Drive.
 * Si no existe, la crea físicamente.
 */
async function getOrCreateDriveFolder(accessToken: string, name: string, parentId: string): Promise<string> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and '${parentId}' in parents and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id as string;
    }
  }

  // Si no existe, crear
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error creando carpeta '${name}' en Google Drive: ${errText}`);
  }

  const created = await createRes.json();
  return created.id as string;
}

/**
 * Lista todos los archivos activos dentro de una carpeta en Google Drive.
 */
async function listFilesInFolder(accessToken: string, folderId: string): Promise<DriveFileInfo[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,description,appProperties)`;

  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error consultando archivos en Drive: ${err}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileInfo[];
}

/**
 * Obtiene el hash SHA-256 de un archivo en Drive:
 * 1) Desde appProperties o description si fue registrado previamente.
 * 2) Descargando sus bytes por API como fallback.
 */
async function getDriveFileSha256(accessToken: string, file: DriveFileInfo): Promise<string> {
  if (file.appProperties?.sha256) {
    return file.appProperties.sha256;
  }
  if (file.description && file.description.startsWith('SHA256:')) {
    return file.description.replace('SHA256:', '').trim();
  }

  try {
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!dlRes.ok) return '';
    const ab = await dlRes.arrayBuffer();
    return createHash('sha256').update(Buffer.from(ab)).digest('hex');
  } catch (err) {
    console.warn(`[sync-drive] No se pudo calcular hash para archivo previo ${file.id}:`, err);
    return '';
  }
}

/**
 * Convierte cualquier estructura u objeto en JSON canónico determinista con claves ordenadas alfabéticamente.
 */
function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Guarda los metadatos de hash SHA-256 binario en Drive (para PDF original de Aitor).
 */
async function attachSha256Metadata(accessToken: string, fileId: string, hash: string): Promise<void> {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        description: `SHA256: ${hash}`,
        appProperties: { sha256: hash },
      }),
    });
  } catch (err) {
    console.warn(`[sync-drive] Advertencia al adjuntar metadata de hash al archivo ${fileId}:`, err);
  }
}

/**
 * Guarda los metadatos de hash lógico estable en Drive (para Desglose Athletic IA).
 */
async function attachDesgloseMetadata(accessToken: string, fileId: string, logicalHash: string): Promise<void> {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        description: `DESGLOSE_HASH: ${logicalHash}`,
        appProperties: { desglose_hash: logicalHash },
      }),
    });
  } catch (err) {
    console.warn(`[sync-drive] Advertencia al adjuntar metadata de desglose a ${fileId}:`, err);
  }
}

/**
 * Calcula un nombre con sufijo incremental (_v2, _v3...) si el nombre base ya existe con contenido distinto.
 */
function resolveVersionedName(desiredName: string, existingNames: string[]): string {
  if (!existingNames.includes(desiredName)) {
    return desiredName;
  }

  const lastDot = desiredName.lastIndexOf('.');
  const base = lastDot !== -1 ? desiredName.slice(0, lastDot) : desiredName;
  const ext = lastDot !== -1 ? desiredName.slice(lastDot) : '';

  let v = 2;
  while (true) {
    const candidate = `${base}_v${v}${ext}`;
    if (!existingNames.includes(candidate)) {
      return candidate;
    }
    v++;
  }
}

export async function POST(req: Request) {
  // 1. Autorización
  try {
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Error al verificar autorización.' }, { status: 500 });
  }

  // 2. Parseo y validación de entrada
  let fecha: string;
  let pdfUrl: string;
  let analysisResult: PdfAnalysisResult;
  let originalFileName: string | undefined;

  try {
    const body = await req.json();
    fecha = typeof body?.fecha === 'string' ? body.fecha.trim() : '';
    pdfUrl = typeof body?.pdfUrl === 'string' ? body.pdfUrl.trim() : '';
    analysisResult = body?.analysisResult as PdfAnalysisResult;
    originalFileName = typeof body?.originalFileName === 'string' ? body.originalFileName.trim() : undefined;

    if (!fecha || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ error: 'Fecha inválida o requerida (formato YYYY-MM-DD).' }, { status: 400 });
    }
    if (!pdfUrl) {
      return NextResponse.json({ error: 'pdfUrl es requerido.' }, { status: 400 });
    }
    if (!analysisResult || !Array.isArray(analysisResult.tareas)) {
      return NextResponse.json({ error: 'analysisResult inválido o sin tareas.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    return NextResponse.json(
      { error: 'GOOGLE_DRIVE_FOLDER_ID no está configurado en las variables de entorno.' },
      { status: 500 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleDriveAccessToken();
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    return NextResponse.json({ error: `Fallo de autenticación con Google Drive: ${msg}` }, { status: 502 });
  }

  // 3. Resolver/crear estructura de carpetas: TAREAS 26-27 / YYYY-MM-DD - Sesión Aitor
  let tareasFolderId: string;
  let sessionFolderId: string;
  const sessionFolderName = `${fecha} - Sesión Aitor`;

  try {
    tareasFolderId = await getOrCreateDriveFolder(accessToken, 'TAREAS 26-27', rootFolderId.trim());
    sessionFolderId = await getOrCreateDriveFolder(accessToken, sessionFolderName, tareasFolderId);
  } catch (folderErr: unknown) {
    const msg = folderErr instanceof Error ? folderErr.message : String(folderErr);
    return NextResponse.json({ error: `Error resolviendo carpetas en Google Drive: ${msg}` }, { status: 502 });
  }

  // 4. Consultar archivos existentes en la carpeta de sesión para deduplicación por hash SHA-256
  let existingFiles: DriveFileInfo[] = [];
  try {
    existingFiles = await listFilesInFolder(accessToken, sessionFolderId);
  } catch (listErr: unknown) {
    console.warn('[sync-drive] Advertencia listando archivos:', listErr);
  }

  const existingFileHashes: { file: DriveFileInfo; hash: string }[] = [];
  for (const f of existingFiles) {
    const hash = await getDriveFileSha256(accessToken, f);
    if (hash) {
      existingFileHashes.push({ file: f, hash });
    }
  }

  const existingFileNames = existingFiles.map(f => f.name);

  // 5. Procesamiento del PDF ORIGINAL de Aitor
  let originalResult: {
    status: 'uploaded' | 'already_exists' | 'failed';
    fileName: string;
    fileId?: string;
    hash?: string;
    driveUrl?: string;
    error?: string;
  };

  try {
    const { buffer: origBuffer } = await downloadFileFromUrl(pdfUrl);
    const origHash = createHash('sha256').update(origBuffer).digest('hex');

    // Determinar nombre del original
    let baseOrigName = originalFileName;
    if (!baseOrigName) {
      try {
        const urlObj = new URL(pdfUrl);
        const pathParts = urlObj.pathname.split('/');
        baseOrigName = pathParts[pathParts.length - 1];
      } catch {
        baseOrigName = `${fecha} - Sesion Aitor - Original.pdf`;
      }
    }
    if (!baseOrigName || !baseOrigName.toLowerCase().endsWith('.pdf')) {
      baseOrigName = `${baseOrigName || 'sesion'}.pdf`;
    }

    // Comprobar si ya existe archivo con idéntico SHA-256
    const identicalOrig = existingFileHashes.find(item => item.hash === origHash);

    if (identicalOrig) {
      originalResult = {
        status: 'already_exists',
        fileName: identicalOrig.file.name,
        fileId: identicalOrig.file.id,
        hash: origHash,
        driveUrl: `https://drive.google.com/file/d/${identicalOrig.file.id}/view`,
      };
    } else {
      // Si el nombre ya existe pero con contenido distinto, versionar (_v2, _v3)
      const finalOrigName = resolveVersionedName(baseOrigName, existingFileNames);
      const uploadRes = await uploadGenericBufferToDrive(origBuffer, finalOrigName, 'application/pdf', sessionFolderId);
      await attachSha256Metadata(accessToken, uploadRes.driveFileId, origHash);

      // Añadir a listas locales para que el siguiente paso conozca este archivo
      existingFileNames.push(finalOrigName);
      existingFileHashes.push({
        file: { id: uploadRes.driveFileId, name: finalOrigName, mimeType: 'application/pdf' },
        hash: origHash,
      });

      originalResult = {
        status: 'uploaded',
        fileName: finalOrigName,
        fileId: uploadRes.driveFileId,
        hash: origHash,
        driveUrl: uploadRes.url,
      };
    }
  } catch (origErr: unknown) {
    const msg = origErr instanceof Error ? origErr.message : String(origErr);
    console.error('[sync-drive] Error procesando PDF original:', msg);
    originalResult = {
      status: 'failed',
      fileName: originalFileName || `${fecha} - Original.pdf`,
      error: msg,
    };
  }

  // 6. Procesamiento del DESGLOSE ATHLETIC IA con HASH LÓGICO ESTABLE DETERMINISTA
  let desgloseResult: {
    status: 'uploaded' | 'already_exists' | 'failed';
    fileName: string;
    fileId?: string;
    hash?: string;
    driveUrl?: string;
    error?: string;
  };

  try {
    // A. Calcular SHA-256 lógico determinista sobre fecha, pdfUrl y analysisResult normalizado con orden estable de claves
    const desglosePayload = {
      fecha,
      pdfUrl,
      analysisResult,
    };
    const desgloseLogicalHash = createHash('sha256')
      .update(stableStringify(desglosePayload))
      .digest('hex');

    const baseDesgloseName = `${fecha} - Desglose Athletic IA.pdf`;

    // B. Comprobar si ya existe un archivo con exactamente este desglose_hash
    const identicalByHash = existingFiles.find(f => {
      const propHash = f.appProperties?.desglose_hash;
      const descHash = f.description && f.description.startsWith('DESGLOSE_HASH:')
        ? f.description.replace('DESGLOSE_HASH:', '').trim()
        : null;
      return propHash === desgloseLogicalHash || descHash === desgloseLogicalHash;
    });

    if (identicalByHash) {
      desgloseResult = {
        status: 'already_exists',
        fileName: identicalByHash.name,
        fileId: identicalByHash.id,
        hash: desgloseLogicalHash,
        driveUrl: `https://drive.google.com/file/d/${identicalByHash.id}/view`,
      };
    } else {
      // C. Reconocimiento de archivos previos sin metadatos de hash (de la prueba inicial):
      // Si ya existe un archivo de desglose para esta sesión y aún no tenía desglose_hash grabado,
      // adoptamos el archivo asociándole el hash lógico mediante PATCH, evitando crear un duplicado superfluo.
      const candidateLegacy = existingFiles
        .filter(f => f.name.includes(`${fecha} - Desglose Athletic IA`))
        .sort((a, b) => b.name.localeCompare(a.name))[0];

      const legacyHasDifferentHash =
        candidateLegacy?.appProperties?.desglose_hash &&
        candidateLegacy.appProperties.desglose_hash !== desgloseLogicalHash;

      if (candidateLegacy && !legacyHasDifferentHash) {
        await attachDesgloseMetadata(accessToken, candidateLegacy.id, desgloseLogicalHash);
        desgloseResult = {
          status: 'already_exists',
          fileName: candidateLegacy.name,
          fileId: candidateLegacy.id,
          hash: desgloseLogicalHash,
          driveUrl: `https://drive.google.com/file/d/${candidateLegacy.id}/view`,
        };
      } else {
        // D. Si es un desglose con contenido nuevo o modificado respecto a los anteriores:
        // Generar PDF vectorial usando exportPlanificacionDesglosePdf con action: 'none'
        const doc = exportPlanificacionDesglosePdf({
          fecha,
          tituloSesion: analysisResult.titulo_sesion,
          pdfUrl,
          result: analysisResult,
          action: 'none',
        });

        const arrayBuffer = doc.output('arraybuffer');
        const desgloseBuffer = Buffer.from(arrayBuffer);

        // Versionar (_v2, _v3, etc.) si el nombre ya existe
        const finalDesgloseName = resolveVersionedName(baseDesgloseName, existingFileNames);
        const uploadRes = await uploadGenericBufferToDrive(desgloseBuffer, finalDesgloseName, 'application/pdf', sessionFolderId);
        await attachDesgloseMetadata(accessToken, uploadRes.driveFileId, desgloseLogicalHash);

        desgloseResult = {
          status: 'uploaded',
          fileName: finalDesgloseName,
          fileId: uploadRes.driveFileId,
          hash: desgloseLogicalHash,
          driveUrl: uploadRes.url,
        };
      }
    }
  } catch (desgloseErr: unknown) {
    const msg = desgloseErr instanceof Error ? desgloseErr.message : String(desgloseErr);
    console.error('[sync-drive] Error procesando Desglose Athletic IA:', msg);
    desgloseResult = {
      status: 'failed',
      fileName: `${fecha} - Desglose Athletic IA.pdf`,
      error: msg,
    };
  }

  // 7. Respuesta con estados independientes por archivo y carpeta
  const overallSuccess = originalResult.status !== 'failed' || desgloseResult.status !== 'failed';

  return NextResponse.json({
    success: overallSuccess,
    folder: {
      id: sessionFolderId,
      name: sessionFolderName,
      path: `TAREAS 26-27 / ${sessionFolderName}`,
      driveUrl: `https://drive.google.com/drive/folders/${sessionFolderId}`,
    },
    original: originalResult,
    desglose: desgloseResult,
  });
}
