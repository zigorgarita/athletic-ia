import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getOrCreateDriveFolderPath } from '@/lib/drive-folders';
import { uploadGenericBufferToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    // 1. Verificación de Autorización de Staff
    const passkeyHeader = req.headers.get('x-staff-passkey');
    const validPasskey = process.env.COACH_STAFF_PASSKEY;
    const isPasskeyMatch = Boolean(passkeyHeader && validPasskey && passkeyHeader === validPasskey);

    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      isPasskeyMatch;

    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida para adjuntar archivos a sesiones GPS.' },
        { status: 401 }
      );
    }

    // 2. Extraer archivo y session_id desde FormData
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Formato de petición inválido. Se requiere multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const rawSessionId = formData.get('session_id');

    if (!rawSessionId || typeof rawSessionId !== 'string' || !rawSessionId.trim()) {
      return NextResponse.json(
        { error: 'ID de sesión GPS (session_id) no proporcionado.' },
        { status: 400 }
      );
    }
    const sessionId = rawSessionId.trim();

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json(
        { error: 'Archivo original no suministrado o vacío.' },
        { status: 400 }
      );
    }

    const fileName = fileEntry.name || 'archivo_gps.xlsx';
    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Formato de archivo no admitido. Únicamente se aceptan ficheros brutos .xlsx y .csv.' },
        { status: 400 }
      );
    }

    const mimeType =
      fileEntry.type ||
      (lowerName.endsWith('.csv')
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const supabaseServer = getSupabaseServerClient();

    // 3. Obtener sesión GPS existente (SIN TOCAR NI LEER gps_data)
    const { data: session, error: sessionError } = await supabaseServer
      .from('gps_sessions')
      .select('id, fecha, match_id, tournament_match_id, descripcion, drive_file_id, drive_file_url, file_name, file_hash')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('[API /api/gps/sessions/attach-file] Error recuperando sesión:', sessionError);
      return NextResponse.json(
        { error: `Error en base de datos al buscar la sesión: ${sessionError.message}` },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: `No se encontró la sesión GPS con ID "${sessionId}".` },
        { status: 404 }
      );
    }

    // 4. REGLA ESTRICTA DE SEGURIDAD: Si ya tiene archivo enlazado, BLOQUEAR
    if (session.drive_file_id || session.drive_file_url) {
      return NextResponse.json(
        {
          error: `Esta sesión GPS ya tiene un archivo original enlazado en Google Drive (${session.file_name || session.drive_file_id}). Por directriz estricta de seguridad, no se permite sobrescribir ni sustituir archivos existentes.`,
          already_attached: true,
          drive_file_id: session.drive_file_id,
          drive_file_url: session.drive_file_url,
          file_name: session.file_name,
        },
        { status: 409 }
      );
    }

    // 5. Calcular Hash SHA-256 del contenido del archivo
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

    // 6. REGLA DEFENSIVA: Comprobar si el hash ya está usado en otra sesión
    const { data: existingDuplicate, error: hashCheckError } = await supabaseServer
      .from('gps_sessions')
      .select('id, fecha, descripcion, file_name')
      .eq('file_hash', fileHash)
      .maybeSingle();

    if (hashCheckError) {
      console.error('[API /api/gps/sessions/attach-file] Error comprobando hash duplicado:', hashCheckError);
    }

    if (existingDuplicate) {
      return NextResponse.json(
        {
          error: `Este archivo ya fue enlazado previamente en la sesión "${existingDuplicate.descripcion || existingDuplicate.fecha}" (${existingDuplicate.file_name || fileName}). Operación bloqueada para prevenir duplicados.`,
          duplicate_found: true,
          existing_session_id: existingDuplicate.id,
          file_hash: fileHash,
        },
        { status: 409 }
      );
    }

    // 7. Resolver carpeta canónica en Google Drive: 01_PARTIDOS/<Partido>/GPS
    let entityName = `${session.fecha}_PARTIDO`;
    if (session.match_id) {
      const { data: matchData } = await supabaseServer
        .from('matches')
        .select('id, fecha, jornada, rival')
        .eq('id', session.match_id)
        .maybeSingle();

      if (matchData) {
        const matchDate = matchData.fecha || session.fecha;
        const jLabel = matchData.jornada ? `J${String(matchData.jornada).padStart(2, '0')}` : 'PARTIDO';
        const rivalStr = matchData.rival ? matchData.rival.replace(/\s+/g, '_') : 'Rival';
        entityName = `${matchDate}_${jLabel}_${rivalStr}`;
      }
    } else if (session.tournament_match_id) {
      const { data: tmData } = await supabaseServer
        .from('tournament_matches')
        .select('id, fecha, rival')
        .eq('id', session.tournament_match_id)
        .maybeSingle();

      if (tmData) {
        const tmDate = tmData.fecha || session.fecha;
        const rivalStr = tmData.rival ? tmData.rival.replace(/\s+/g, '_') : 'Torneo';
        entityName = `${tmDate}_Torneo_${rivalStr}`;
      }
    }

    let driveFolderId: string;
    try {
      driveFolderId = await getOrCreateDriveFolderPath({
        module: 'PARTIDOS',
        entityName,
        subCategory: 'GPS',
      });
    } catch (folderErr: unknown) {
      const msg = folderErr instanceof Error ? folderErr.message : String(folderErr);
      console.error('[API /api/gps/sessions/attach-file] Error resolviendo carpeta en Drive:', msg);
      return NextResponse.json(
        { error: `Error al preparar la carpeta canónica en Google Drive: ${msg}. La subida fue abortada.` },
        { status: 500 }
      );
    }

    // 8. Subir archivo bruto a Google Drive
    let driveUpload: { driveFileId: string; url: string };
    try {
      driveUpload = await uploadGenericBufferToDrive(
        fileBuffer,
        fileName,
        mimeType,
        driveFolderId
      );
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.error('[API /api/gps/sessions/attach-file] Error al subir a Drive:', msg);
      return NextResponse.json(
        { error: `Error al subir el archivo original a Google Drive: ${msg}. La sesión no fue modificada.` },
        { status: 500 }
      );
    }

    // 9. Actualizar ÚNICAMENTE las 4 columnas de trazabilidad documental en la sesión existente
    // IMPORTANTE: NO se toca gps_data, NO se llama a save_gps_session_atomic, NO se recalcula nada
    const { error: updateError } = await supabaseServer
      .from('gps_sessions')
      .update({
        drive_file_id: driveUpload.driveFileId,
        drive_file_url: driveUpload.url,
        file_name: fileName,
        file_hash: fileHash,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[API /api/gps/sessions/attach-file] Error vinculando metadatos en gps_sessions:', updateError);
      return NextResponse.json(
        {
          error: `El archivo se subió a Google Drive (${driveUpload.driveFileId}), pero ocurrió un error al vincularlo a la sesión: ${updateError.message}`,
          drive_file_id: driveUpload.driveFileId,
          drive_file_url: driveUpload.url,
        },
        { status: 500 }
      );
    }

    // 10. Respuesta exitosa garantizando cero impacto en métricas
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      drive_file_id: driveUpload.driveFileId,
      drive_file_url: driveUpload.url,
      file_name: fileName,
      file_hash: fileHash,
      message: 'Archivo bruto original archivado en Google Drive y vinculado a la sesión histórica con éxito.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/gps/sessions/attach-file] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
