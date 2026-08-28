import { getGoogleDriveAccessToken } from '@/lib/google-drive';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getActiveSeason } from '@/lib/season';

export interface DriveUploadContext {
  season?: string; // Por defecto: getActiveSeason()
  module: 'PARTIDOS' | 'RIVALES' | 'ENTRENAMIENTOS' | 'ABP' | 'BIBLIOTECA' | 'SCOUTING' | 'BETO';
  entityName?: string; // Ej: "2026-09-06_J01_Real_Sociedad"
  subCategory?: string; // Ej: "Cortes"
}

// Mapeo seguro en servidor para nombres de carpetas fijas de módulo
const MODULE_MAP: Record<string, string> = {
  PARTIDOS: '01_PARTIDOS',
  RIVALES: '02_RIVALES',
  ENTRENAMIENTOS: '03_ENTRENAMIENTOS',
  ABP: '04_ABP',
  BIBLIOTECA: '05_BIBLIOTECA',
  SCOUTING: '06_SCOUTING',
  BETO: '07_BETO',
};

// Caché en memoria durante la ejecución del proceso Node.js (vía singleton)
const memoryFolderCache = new Map<string, string>();
// Locks en memoria para peticiones simultáneas sobre la misma ruta en la misma instancia
const inFlightLocks = new Map<string, Promise<string>>();

/**
 * Sanitiza nombres de carpetas para asegurar validez en Google Drive y URLs.
 */
export function sanitizeFolderName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes/acentos
    .replace(/[^a-zA-Z0-9_-]+/g, '_') // Reemplazar caracteres especiales por guión bajo
    .replace(/^_+|_+$/g, '') // Eliminar guiones bajos al inicio/final
    .replace(/_{2,}/g, '_'); // Colapsar guiones bajos dobles
}

/**
 * Construye la lista de segmentos sanitizados a partir del contexto del cliente.
 */
export function buildPathSegments(context: DriveUploadContext): { segments: string[]; pathKey: string } {
  const currentSeason = getActiveSeason();
  const season = sanitizeFolderName(context.season || currentSeason) || currentSeason;
  
  const rawModule = (context.module || '').toUpperCase();
  const mappedModule = MODULE_MAP[rawModule];
  if (!mappedModule) {
    throw new Error(`Módulo no válido: '${context.module}'. Módulos permitidos: ${Object.keys(MODULE_MAP).join(', ')}`);
  }

  const segments: string[] = [season, mappedModule];

  if (context.entityName) {
    const cleanEntity = sanitizeFolderName(context.entityName);
    if (cleanEntity) segments.push(cleanEntity);
  }

  if (context.subCategory) {
    const rawSubCats = Array.isArray(context.subCategory)
      ? context.subCategory
      : context.subCategory.split('/');

    for (const subCat of rawSubCats) {
      const cleanSubCat = sanitizeFolderName(subCat);
      if (cleanSubCat) segments.push(cleanSubCat);
    }
  }

  const pathKey = segments.join('/');
  return { segments, pathKey };
}

/**
 * Obtiene o crea de forma idempotente y atómica (First-Wins) la estructura de carpetas en Google Drive.
 * Garantiza: 1 path_key = 1 registro DB = 1 carpeta física en Drive
 */
export async function getOrCreateDriveFolderPath(context: DriveUploadContext): Promise<string> {
  let rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado en las variables de entorno.');
  }
  rootFolderId = rootFolderId.replace(/^["']|["']$/g, '').trim();

  const { segments, pathKey } = buildPathSegments(context);

  // 1. Optimización en memoria local para peticiones simultáneas dentro de la misma instancia
  if (inFlightLocks.has(pathKey)) {
    return await inFlightLocks.get(pathKey)!;
  }

  // 2. Lock de instancia + Ejecución con Reconciliación Persistente Cross-Instance (First-Wins)
  const lockPromise = (async () => {
    try {
      const accessToken = await getGoogleDriveAccessToken();
      const supabase = getSupabaseServerClient();

      let currentParentId = rootFolderId;
      let currentPath = '';

      for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

        // A. Verificar caché local en memoria
        if (memoryFolderCache.has(currentPath)) {
          currentParentId = memoryFolderCache.get(currentPath)!;
          continue;
        }

        // B. Verificar registro canónico persistente en Supabase (drive_folders)
        let existingFolderId: string | null = null;
        try {
          const { data: dbFolder } = await supabase
            .from('drive_folders')
            .select('drive_folder_id')
            .eq('path_key', currentPath)
            .maybeSingle();

          if (dbFolder?.drive_folder_id) {
            existingFolderId = dbFolder.drive_folder_id;
          }
        } catch {
          // Ignorar si la tabla aún no existe
        }

        if (existingFolderId) {
          memoryFolderCache.set(currentPath, existingFolderId);
          currentParentId = existingFolderId;
          continue;
        }

        // C. Consultar Google Drive API si existe la carpeta física
        const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${segment}' and '${currentParentId}' in parents and trashed = false`;
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
        
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let targetFolderId: string | null = null;

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            targetFolderId = searchData.files[0].id;
          }
        }

        let wasNewlyCreatedInDrive = false;

        // D. Si no existe en Drive, crear la carpeta físicamente
        if (!targetFolderId) {
          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              name: segment,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParentId],
            }),
          });

          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Error creando carpeta '${segment}' en Drive: ${errText}`);
          }

          const createdData = await createRes.json();
          targetFolderId = createdData.id as string;
          wasNewlyCreatedInDrive = true;
        }

        // E. Reconciliación Persistente Atómica "First-Wins" (ON CONFLICT DO NOTHING)
        // Nunca se usa UPSERT con UPDATE; la primera petición que inserta su ID es el CANÓNICO INMUTABLE.
        let canonicalFolderId = targetFolderId;

        try {
          // Intentar registro atómico en DB usando RPC register_drive_folder (ON CONFLICT DO NOTHING + SELECT)
          const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';
          const { data: rpcCanonicalId, error: rpcErr } = await supabase.rpc('register_drive_folder', {
            p_path_key: currentPath,
            p_drive_folder_id: targetFolderId,
            p_parent_folder_id: currentParentId,
            p_staff_passkey: passkey,
          });

          if (!rpcErr && rpcCanonicalId) {
            canonicalFolderId = rpcCanonicalId;
          } else {
            // Fallback con inserción y captura de error de duplicado (First-Wins)
            await supabase
              .from('drive_folders')
              .insert({
                path_key: currentPath,
                drive_folder_id: targetFolderId,
                parent_folder_id: currentParentId,
              });

            const { data: dbCheck } = await supabase
              .from('drive_folders')
              .select('drive_folder_id')
              .eq('path_key', currentPath)
              .maybeSingle();

            if (dbCheck?.drive_folder_id) {
              canonicalFolderId = dbCheck.drive_folder_id;
            }
          }
        } catch {
          // Ignorar fallback si la tabla no está creada aún
        }

        // F. Si la carpeta fue creada físicamente por ESTA petición pero PERDIÓ la carrera en DB:
        if (wasNewlyCreatedInDrive && canonicalFolderId !== targetFolderId) {
          // 1. Eliminar de Google Drive únicamente la carpeta duplicada vacía que creó ESTA petición
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${targetFolderId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            });
          } catch (delErr) {
            console.warn(`[Drive Reconciliation] Advertencia: No se pudo eliminar la carpeta duplicada vacía '${targetFolderId}' de Drive:`, delErr);
          }

          // 2. Retornar obligatoriamente la carpeta canónica que ganó el primer INSERT
          targetFolderId = canonicalFolderId;
        } else {
          targetFolderId = canonicalFolderId;
        }

        // G. Guardar en caché en memoria local y continuar con el siguiente nivel de la ruta
        memoryFolderCache.set(currentPath, targetFolderId);
        currentParentId = targetFolderId;
      }

      return currentParentId;
    } finally {
      inFlightLocks.delete(pathKey);
    }
  })();

  inFlightLocks.set(pathKey, lockPromise);
  return await lockPromise;
}
