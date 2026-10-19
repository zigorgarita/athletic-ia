import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeGPSSession(session: Record<string, unknown>): Record<string, unknown> | null {
  if (!session || typeof session !== 'object') return null;

  const fecha = typeof session.fecha === 'string' ? session.fecha.trim() : '';
  if (!fecha) return null;

  const matchId = typeof session.match_id === 'string' && session.match_id.trim()
    ? session.match_id.trim()
    : null;

  const tournamentMatchId = typeof session.tournament_match_id === 'string' && session.tournament_match_id.trim()
    ? session.tournament_match_id.trim()
    : null;

  if (!matchId && !tournamentMatchId) return null;

  const sanitized: Record<string, unknown> = {
    fecha,
    match_id: matchId,
    tournament_match_id: tournamentMatchId,
    descripcion: typeof session.descripcion === 'string' && session.descripcion.trim()
      ? session.descripcion.trim()
      : null
  };

  const rawId = typeof session.id === 'string' ? session.id.trim() : '';
  if (rawId && !rawId.startsWith('temp-')) {
    sanitized.id = rawId;
  }

  return sanitized;
}

function sanitizeGPSRows(rows: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];

  const results: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;

    const gpsId = typeof r.gps_id === 'string' && r.gps_id.trim()
      ? r.gps_id.trim()
      : 'Jugador';

    const playerId = typeof r.player_id === 'string' && r.player_id.trim()
      ? r.player_id.trim()
      : null;

    const toNullableNum = (val: unknown): number | null => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = Number(val);
      return isNaN(parsed) ? null : parsed;
    };

    const toNullableInt = (val: unknown): number | null => {
      const num = toNullableNum(val);
      return num !== null ? Math.round(num) : null;
    };

    const dist = toNullableNum(r.distancia_total);
    if (dist === null) continue; // Distancia total es métrica obligatoria

    results.push({
      gps_id: gpsId,
      player_id: playerId,
      minutos: toNullableInt(r.minutos) ?? 0,
      distancia_total: dist,
      hsr: toNullableNum(r.hsr),
      sprint_distance: toNullableNum(r.sprint_distance),
      num_sprints: toNullableInt(r.num_sprints),
      velocidad_maxima: toNullableNum(r.velocidad_maxima),
      aceleraciones: toNullableInt(r.aceleraciones),
      aceleraciones_max: toNullableInt(r.aceleraciones_max),
      deceleraciones: toNullableInt(r.deceleraciones),
      deceleraciones_max: toNullableInt(r.deceleraciones_max),
      player_load: toNullableNum(r.player_load),
      raw_data: r.raw_data && typeof r.raw_data === 'object' ? r.raw_data : {}
    });
  }

  return results;
}

function sanitizeGPSMappings(mappings: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(mappings)) return [];

  const results: Record<string, unknown>[] = [];
  for (const m of mappings) {
    if (!m || typeof m !== 'object') continue;
    const mapObj = m as Record<string, unknown>;

    const sourceName = typeof mapObj.source_name === 'string' ? mapObj.source_name.trim() : '';
    const normName = typeof mapObj.source_name_normalized === 'string' ? mapObj.source_name_normalized.trim() : '';
    const playerId = typeof mapObj.player_id === 'string' ? mapObj.player_id.trim() : '';

    if (!normName || !playerId) continue;

    results.push({
      source_name: sourceName || normName,
      source_name_normalized: normName,
      player_id: playerId,
      updated_at: new Date().toISOString()
    });
  }

  return results;
}

import { createHash } from 'crypto';
import { getOrCreateDriveFolderPath } from '@/lib/drive-folders';
import { uploadGenericBufferToDrive } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let rawFile: File | null = null;
    let sessionObj: unknown = null;
    let rowsArr: unknown[] = [];
    let mappingsArr: unknown[] = [];
    let allowReimport = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const fileEntry = formData.get('file');
      if (fileEntry instanceof File && fileEntry.size > 0) {
        rawFile = fileEntry;
      }

      const sessionRaw = formData.get('session');
      if (typeof sessionRaw === 'string') {
        try { sessionObj = JSON.parse(sessionRaw); } catch { sessionObj = null; }
      }

      const rowsRaw = formData.get('rows');
      if (typeof rowsRaw === 'string') {
        try { rowsArr = JSON.parse(rowsRaw); } catch { rowsArr = []; }
      }

      const mappingsRaw = formData.get('mappings');
      if (typeof mappingsRaw === 'string') {
        try { mappingsArr = JSON.parse(mappingsRaw); } catch { mappingsArr = []; }
      }

      allowReimport = formData.get('allow_reimport') === 'true';
    } else {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object') {
        sessionObj = body.session;
        rowsArr = (body.rows as unknown[]) || [];
        mappingsArr = (body.mappings as unknown[]) || [];
        allowReimport = body.allow_reimport === true;
      }
    }

    const sanitizedSession = sanitizeGPSSession(sessionObj as Record<string, unknown>);
    if (!sanitizedSession) {
      return NextResponse.json({ error: 'Datos de sesión GPS inválidos o incompletos (fecha y match_id / tournament_match_id requeridos).' }, { status: 400 });
    }

    const sanitizedRows = sanitizeGPSRows(rowsArr);
    if (sanitizedRows.length === 0) {
      return NextResponse.json({ error: 'No se enviaron registros GPS válidos con distancia calculable.' }, { status: 400 });
    }

    const sanitizedMappings = sanitizeGPSMappings(mappingsArr);
    const supabaseServer = getSupabaseServerClient();

    // 1. GESTIÓN DEL ARCHIVO ORIGINAL Y DETECCIÓN DEFENSIVA DE DUPLICADOS
    let driveMetadata: {
      driveFileId: string;
      driveFileUrl: string;
      fileName: string;
      fileHash: string;
    } | null = null;

    if (rawFile) {
      const fileBuffer = Buffer.from(await rawFile.arrayBuffer());
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
      const fileName = rawFile.name || `gps_${sanitizedSession.fecha}.xlsx`;
      const mimeType = rawFile.type || (fileName.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // 1.1 Comprobar duplicado por hash ANTES de tocar Google Drive
      const { data: existingDuplicate } = await supabaseServer
        .from('gps_sessions')
        .select('id, fecha, descripcion, file_name')
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existingDuplicate && !allowReimport) {
        return NextResponse.json({
          error: `Este archivo GPS ya fue importado previamente en la sesión "${existingDuplicate.descripcion || existingDuplicate.fecha}" (${existingDuplicate.file_name || fileName}). Operación bloqueada para evitar duplicados.`,
          duplicate_found: true,
          existing_session_id: existingDuplicate.id,
          file_hash: fileHash,
        }, { status: 409 });
      }

      // 1.2 Resolver carpeta canónica en Google Drive: 01_PARTIDOS/<Partido>/GPS
      let entityName = `${sanitizedSession.fecha}_PARTIDO`;
      if (sanitizedSession.match_id) {
        const { data: matchData } = await supabaseServer
          .from('matches')
          .select('id, fecha, jornada, rival')
          .eq('id', sanitizedSession.match_id)
          .maybeSingle();

        if (matchData) {
          const matchDate = matchData.fecha || sanitizedSession.fecha;
          const jLabel = matchData.jornada ? `J${String(matchData.jornada).padStart(2, '0')}` : 'PARTIDO';
          const rivalStr = matchData.rival ? matchData.rival.replace(/\s+/g, '_') : 'Rival';
          entityName = `${matchDate}_${jLabel}_${rivalStr}`;
        }
      } else if (sanitizedSession.tournament_match_id) {
        const { data: tmData } = await supabaseServer
          .from('tournament_matches')
          .select('id, fecha, rival')
          .eq('id', sanitizedSession.tournament_match_id)
          .maybeSingle();

        if (tmData) {
          const tmDate = tmData.fecha || sanitizedSession.fecha;
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
        console.error('[API /api/gps/sessions POST] Error resolviendo carpeta en Google Drive:', msg);
        return NextResponse.json({
          error: `Error al preparar la carpeta en Google Drive: ${msg}. La importación ha sido abortada para preservar la consistencia.`,
        }, { status: 500 });
      }

      // 1.3 Subir archivo bruto a Google Drive
      try {
        const driveUpload = await uploadGenericBufferToDrive(
          fileBuffer,
          fileName,
          mimeType,
          driveFolderId
        );

        driveMetadata = {
          driveFileId: driveUpload.driveFileId,
          driveFileUrl: driveUpload.url,
          fileName,
          fileHash,
        };
      } catch (driveUploadErr: unknown) {
        const msg = driveUploadErr instanceof Error ? driveUploadErr.message : String(driveUploadErr);
        console.error('[API /api/gps/sessions POST] Error al subir archivo a Google Drive:', msg);
        return NextResponse.json({
          error: `Error al archivar el archivo en Google Drive: ${msg}. La importación ha sido abortada.`,
        }, { status: 500 });
      }
    }

    // 2. EJECUCIÓN INTACTA DE LA RPC ACTUAL save_gps_session_atomic
    const { data: rpcResult, error: rpcError } = await supabaseServer.rpc('save_gps_session_atomic', {
      p_session: sanitizedSession,
      p_rows: sanitizedRows,
      p_mappings: sanitizedMappings
    });

    if (rpcError) {
      console.error('[API /api/gps/sessions POST] Error en save_gps_session_atomic:', rpcError);
      return NextResponse.json({
        error: `Error guardando métricas en base de datos: ${rpcError.message}.${driveMetadata ? ` El archivo original fue preservado en Google Drive con ID: ${driveMetadata.driveFileId}.` : ''}`,
        drive_file_id: driveMetadata?.driveFileId || null,
        metrics_saved: false,
      }, { status: 500 });
    }

    // 3. VINCULAR METADATOS DOCUMENTALES CON VERIFICACIÓN OBLIGATORIA
    const savedSessionId = (rpcResult as { session_id?: string })?.session_id;
    let metadataLinked = false;
    let metadataWarning: string | null = null;

    if (driveMetadata && savedSessionId) {
      const { error: updateMetaError } = await supabaseServer
        .from('gps_sessions')
        .update({
          drive_file_id: driveMetadata.driveFileId,
          drive_file_url: driveMetadata.driveFileUrl,
          file_name: driveMetadata.fileName,
          file_hash: driveMetadata.fileHash,
        })
        .eq('id', savedSessionId);

      if (updateMetaError) {
        console.error('[API /api/gps/sessions POST] Error vinculando metadatos en gps_sessions:', updateMetaError);
        metadataWarning = `Las métricas se guardaron en la sesión ${savedSessionId} y el archivo se archivó en Drive (${driveMetadata.driveFileId}), pero falló el registro del enlace en la sesión: ${updateMetaError.message}`;
      } else {
        metadataLinked = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      session_id: savedSessionId,
      drive_file_id: driveMetadata?.driveFileId || null,
      drive_file_url: driveMetadata?.driveFileUrl || null,
      metadata_linked: metadataLinked,
      warning: metadataWarning,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/gps/sessions POST] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id')?.trim();

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object' && typeof body.id === 'string') {
        id = body.id.trim();
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID de sesión GPS requerido para eliminación.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();

    // Eliminar la sesión (la FK cascade eliminará automáticamente las filas dependientes en gps_data)
    const { error: deleteError } = await supabaseServer
      .from('gps_sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API /api/gps/sessions DELETE] Error:', deleteError);
      return NextResponse.json({ error: `Error eliminando sesión GPS: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/gps/sessions DELETE] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
