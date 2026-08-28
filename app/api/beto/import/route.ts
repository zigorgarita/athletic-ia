import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getOrCreateDriveFolderPath } from '@/lib/drive-folders';
import { uploadGenericBufferToDrive, deleteDriveFile } from '@/lib/google-drive';
import { parseOliverFile } from '@/lib/beto/parser';
import { getActiveSeason } from '@/lib/season';

function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  let importId: string | null = null;
  let createdSessionId: string | null = null;
  let uploadedDriveFileId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedSeason = (formData.get('season') as string) || '';
    const activeSeason = requestedSeason.trim() || getActiveSeason();

    const overrideName = (formData.get('session_name') as string) || undefined;
    const overrideDate = (formData.get('session_date') as string) || undefined;
    const overrideType = (formData.get('session_type') as 'ENTRENAMIENTO' | 'PARTIDO' | 'OTRO') || undefined;
    const overwrite = formData.get('overwrite') === 'true';
    const replaceSessionId = (formData.get('replace_session_id') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No se ha adjuntado ningún archivo.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = file.name;
    const mimeType = file.type || (fileName.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // 1. Parsear archivo con parser especializado OLIVER
    const parsedData = parseOliverFile(buffer, {
      defaultName: overrideName,
      defaultDate: overrideDate,
      defaultType: overrideType,
    });

    if (!parsedData.players || parsedData.players.length === 0) {
      return NextResponse.json(
        { error: 'No se detectaron registros de jugadores o datos de rendimiento en el archivo proporcionado.' },
        { status: 422 }
      );
    }

    // 2. Comprobación de duplicados (file_hash y oliver_session_id)
    // NOTA: Si una importación previa falló ('failed'), permitimos reintentar sin bloquear
    if (!overwrite) {
      // 2a. Por Hash exacto de archivo COMPLETADO
      const { data: existingHash } = await supabase
        .from('beto_imports')
        .select('id, file_name, session_name, session_date, created_at, status')
        .eq('file_hash', fileHash)
        .eq('status', 'completed')
        .maybeSingle();

      if (existingHash) {
        return NextResponse.json({
          duplicate_found: true,
          duplicate_type: 'file_hash',
          existing_session: existingHash,
          message: `Este archivo ya fue importado exitosamente el ${new Date(existingHash.created_at).toLocaleDateString()} (${existingHash.session_name || existingHash.file_name}).`,
        });
      }

      // 2b. Por Oliver Session ID si está presente
      if (parsedData.oliver_session_id) {
        const { data: existingOliverSession } = await supabase
          .from('beto_sessions')
          .select('id, session_name, session_date, oliver_session_id, version, created_at')
          .eq('oliver_session_id', parsedData.oliver_session_id)
          .maybeSingle();

        if (existingOliverSession) {
          return NextResponse.json({
            duplicate_found: true,
            duplicate_type: 'oliver_session_id',
            existing_session: existingOliverSession,
            message: `Ya existe una sesión registrada con el identificador de OLIVER '${parsedData.oliver_session_id}' (${existingOliverSession.session_name} - ${existingOliverSession.session_date}).`,
          });
        }
      }
    }

    // Si existían importaciones previas fallidas con este mismo hash, limpiarlas
    await supabase
      .from('beto_imports')
      .delete()
      .eq('file_hash', fileHash)
      .eq('status', 'failed');

    // 3. Crear registro inicial de importación con estado 'processing'
    const { data: importRecord, error: importError } = await supabase
      .from('beto_imports')
      .insert({
        file_name: fileName,
        file_hash: fileHash,
        file_size_bytes: file.size,
        mime_type: mimeType,
        season: activeSeason,
        session_name: parsedData.session_name,
        session_date: parsedData.session_date,
        oliver_session_id: parsedData.oliver_session_id,
        status: 'processing',
        metadata: {
          total_raw_rows: parsedData.players.length,
          header_data: parsedData.raw_header_data,
        },
      })
      .select()
      .single();

    if (importError || !importRecord) {
      throw new Error(`Error al crear registro de importación en base de datos: ${importError?.message || 'Fallo desconocido'}`);
    }

    importId = importRecord.id;

    // 4. Subir archivo original a Google Drive en la jerarquía canónica de BETO
    let driveFileId: string | null = null;
    let driveFileUrl: string | null = null;
    let driveFolderId: string | null = null;
    let drivePath: string = `${activeSeason}/07_BETO/${parsedData.session_date}_${parsedData.session_name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    try {
      driveFolderId = await getOrCreateDriveFolderPath({
        season: activeSeason,
        module: 'BETO',
        entityName: `${parsedData.session_date}_${parsedData.session_name}`,
      });

      const driveUpload = await uploadGenericBufferToDrive(
        buffer,
        `${parsedData.session_date}_${fileName}`,
        mimeType,
        driveFolderId
      );

      driveFileId = driveUpload.driveFileId;
      driveFileUrl = driveUpload.url;
      uploadedDriveFileId = driveFileId;
    } catch (driveErr: any) {
      console.error('Error al subir archivo a Google Drive:', driveErr);
      throw new Error(`Fallo en el almacenamiento de Google Drive: ${driveErr.message || 'No se pudo subir el archivo original.'}`);
    }

    // 5. Cargar lista actual de jugadores para hacer matching prioritario
    const { data: dbPlayers, error: playersFetchErr } = await supabase
      .from('players')
      .select('id, nombre, apellidos, alias, dorsal, oliver_player_id');

    if (playersFetchErr) {
      throw new Error(`Error al consultar la plantilla de jugadores: ${playersFetchErr.message}`);
    }

    const playersList = dbPlayers || [];

    // 6. Si se solicita reemplazo de sesión previa, limpiar registros antiguos
    if (replaceSessionId) {
      await supabase.from('beto_sessions').delete().eq('id', replaceSessionId);
    } else if (overwrite && parsedData.oliver_session_id) {
      await supabase.from('beto_sessions').delete().eq('oliver_session_id', parsedData.oliver_session_id);
    }

    // 7. Crear la sesión en beto_sessions
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('beto_sessions')
      .insert({
        import_id: importId,
        oliver_session_id: parsedData.oliver_session_id,
        session_name: parsedData.session_name,
        session_date: parsedData.session_date,
        start_time: parsedData.start_time,
        end_time: parsedData.end_time,
        duration_minutes: parsedData.duration_minutes,
        session_type: parsedData.session_type,
        season: activeSeason,
        total_players: parsedData.players.length,
        raw_header_data: parsedData.raw_header_data,
      })
      .select()
      .single();

    if (sessionError || !sessionRecord) {
      throw new Error(`Error al registrar la sesión en base de datos: ${sessionError?.message}`);
    }

    createdSessionId = sessionRecord.id;

    // 8. Mapear y preparar registros de jugadores con raw_metrics intacto
    let mappedCount = 0;
    const playerSessionRows = parsedData.players.map((p) => {
      let matchedPlayerId: string | null = null;

      // Prioridad 1: oliver_player_id
      if (p.oliver_player_id) {
        const found = playersList.find((dbP) => dbP.oliver_player_id && dbP.oliver_player_id === p.oliver_player_id);
        if (found) matchedPlayerId = found.id;
      }

      // Prioridad 2: dorsal
      if (!matchedPlayerId && p.dorsal !== null && p.dorsal !== undefined) {
        const found = playersList.find((dbP) => dbP.dorsal === p.dorsal);
        if (found) matchedPlayerId = found.id;
      }

      // Prioridad 3: nombre / alias normalizado
      if (!matchedPlayerId && p.source_player_name) {
        const normSource = normalizeString(p.source_player_name);
        const found = playersList.find((dbP) => {
          const fullName = normalizeString(`${dbP.nombre} ${dbP.apellidos}`);
          const reversedFullName = normalizeString(`${dbP.apellidos} ${dbP.nombre}`);
          const alias = normalizeString(dbP.alias || '');
          return (
            fullName === normSource ||
            reversedFullName === normSource ||
            (alias && alias === normSource) ||
            normSource.includes(normalizeString(dbP.nombre)) && normSource.includes(normalizeString(dbP.apellidos))
          );
        });
        if (found) matchedPlayerId = found.id;
      }

      if (matchedPlayerId) mappedCount++;

      return {
        session_id: sessionRecord.id,
        import_id: importId,
        player_id: matchedPlayerId,
        oliver_player_id: p.oliver_player_id,
        source_player_name: p.source_player_name,
        dorsal: p.dorsal,
        posicion: p.posicion,
        minutos: p.minutos,
        distancia_metros: p.distancia_metros,
        metros_minuto: p.metros_minuto,
        velocidad_maxima: p.velocidad_maxima,
        distancia_sprint: p.distancia_sprint,
        distancia_alta_intensidad: p.distancia_alta_intensidad,
        sprints_count: p.sprints_count,
        aceleraciones_count: p.aceleraciones_count,
        deceleraciones_count: p.deceleraciones_count,
        aceleraciones_max: p.aceleraciones_max,
        deceleraciones_max: p.deceleraciones_max,
        impactos_count: p.impactos_count,
        golpes_balon: p.golpes_balon,
        carga_total: p.carga_total,
        raw_metrics: p.raw_metrics,
      };
    });

    const { error: insertPlayersError } = await supabase
      .from('beto_player_sessions')
      .insert(playerSessionRows);

    if (insertPlayersError) {
      throw new Error(`Error al insertar métricas de jugadores: ${insertPlayersError.message}`);
    }

    // 9. Actualizar estado de importación a 'completed'
    await supabase
      .from('beto_imports')
      .update({
        status: 'completed',
        drive_file_id: driveFileId,
        drive_file_url: driveFileUrl,
        drive_folder_id: driveFolderId,
        drive_path: drivePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId);

    return NextResponse.json({
      success: true,
      import_id: importId,
      session: sessionRecord,
      total_players: parsedData.players.length,
      mapped_players: mappedCount,
      drive_file_url: driveFileUrl,
    });
  } catch (err: any) {
    console.error('Error durante la importación BETO:', err);

    // Rollback de Supabase: Si se había creado la sesión antes del fallo, eliminarla para evitar datos parciales
    if (createdSessionId) {
      try {
        await supabase.from('beto_sessions').delete().eq('id', createdSessionId);
      } catch (cleanupErr) {
        console.error('Error al limpiar sesión tras fallo:', cleanupErr);
      }
    }

    // Rollback de Drive si Supabase falló tras la subida
    if (uploadedDriveFileId) {
      try {
        await deleteDriveFile(uploadedDriveFileId);
      } catch (driveCleanupErr) {
        console.warn('Error al limpiar archivo en Drive tras fallo:', driveCleanupErr);
      }
    }

    // Registrar estado failed en beto_imports
    if (importId) {
      try {
        await supabase
          .from('beto_imports')
          .update({
            status: 'failed',
            error_message: err.message || 'Error inesperado durante la importación.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', importId);
      } catch (importFailErr) {
        console.error('Error al marcar import como failed:', importFailErr);
      }
    }

    return NextResponse.json(
      {
        error: err.message || 'Error al procesar e importar el archivo de OLIVER.',
      },
      { status: 500 }
    );
  }
}
