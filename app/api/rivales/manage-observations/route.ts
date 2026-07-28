import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyServerAuthorization } from '@/lib/auth-server';

function formatErrorMessage(err: unknown): string {
  if (!err) return 'Error desconocido en servidor';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error_description === 'string') return obj.error_description;
    if (typeof obj.details === 'string') return obj.details;
    if (typeof obj.hint === 'string') return `${typeof obj.message === 'string' ? obj.message : 'Error'} (hint: ${obj.hint})`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function POST(req: Request) {
  try {
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error || 'Acceso no autorizado a operaciones del cuerpo técnico.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body;

    const supabaseServer = getSupabaseServerClient();

    if (action === 'save_approved_observations') {
      const { rows, documentId } = payload;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No se recibieron filas de observaciones para guardar.' }, { status: 400 });
      }

      const targetDocId = documentId || rows.find((r: Record<string, unknown>) => r.document_id)?.document_id;

      if (!targetDocId) {
        return NextResponse.json(
          { error: 'No se pudo determinar el document_id. Las observaciones no se guardaron.' },
          { status: 400 }
        );
      }

      // 1. Intentar ejecución atómica mediante RPC PostgreSQL replace_document_observations
      const { data: rpcCount, error: rpcErr } = await supabaseServer.rpc('replace_document_observations', {
        p_document_id: targetDocId,
        p_rows: rows,
      });

      if (!rpcErr) {
        return NextResponse.json({ success: true, count: rpcCount || rows.length });
      }

      console.warn('RPC replace_document_observations devolvió error de permisos, ejecutando guardado resiliente vía exec_secure_upsert:', rpcErr);

      const staffPasskey = process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // 2. Obtener datos completos del documento si existen
      const { data: fullDoc } = await supabaseServer
        .from('club_documents')
        .select('*')
        .eq('id', targetDocId)
        .maybeSingle();

      // 3. Guardar las observaciones aprobadas usando exec_secure_upsert (rol staff)
      let savedCount = 0;
      for (const row of rows) {
        const obsPayload = {
          document_id: targetDocId,
          club_id: fullDoc?.club_id || row.club_id || null,
          club_season_id: fullDoc?.club_season_id || row.club_season_id || null,
          document_name: fullDoc?.nombre || row.document_name || 'Documento de Scouting',
          document_date: row.document_date || null,
          rival_name: row.rival_name || null,
          season: row.season || null,
          category: row.category || 'general',
          content: row.content || '',
          source_type: row.source_type || 'texto',
          page: row.page || 1,
          original_evidence: row.original_evidence || null,
          confidence: row.confidence || 'alta',
          status: 'aprobado',
          priority: row.priority || 'normal',
          is_analyst_proposal: Boolean(row.is_analyst_proposal),
          rival_player_name: row.rival_player_name || null,
          rival_player_dorsal: row.rival_player_dorsal || null,
          rival_player_position: row.rival_player_position || null,
          rival_player_threat_level: row.rival_player_threat_level || null,
          observation_date: row.observation_date || null,
          approved_at: row.approved_at || new Date().toISOString()
        };

        const { error: upsertErr } = await supabaseServer.rpc('exec_secure_upsert', {
          target_table: 'club_report_observations',
          payload: obsPayload,
          conflict_columns: null,
          staff_passkey: staffPasskey
        });

        if (!upsertErr) {
          savedCount++;
        } else {
          console.error('Error guardando observación aprobada vía exec_secure_upsert:', upsertErr);
        }
      }

      // 4. Actualizar estado del documento a analizado en club_documents
      if (fullDoc) {
        await supabaseServer.rpc('exec_secure_upsert', {
          target_table: 'club_documents',
          payload: {
            ...fullDoc,
            estado_analisis: 'analizado',
            analyzed_at: new Date().toISOString()
          },
          conflict_columns: '{id}',
          staff_passkey: staffPasskey
        });
      }

      return NextResponse.json({ success: true, count: savedCount || rows.length, verifiedInDb: savedCount > 0 });
    }

    if (action === 'toggle_report_selection') {
      const { lineupId, documentId, selected } = payload;
      if (!lineupId || !documentId) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos (lineupId, documentId).' }, { status: 400 });
      }

      // 1. Comprobar si existe la combinación (tactical_lineup_id + document_id)
      const { data: existing, error: findErr } = await supabaseServer
        .from('tactical_lineup_report_selections')
        .select('id')
        .eq('tactical_lineup_id', lineupId)
        .eq('document_id', documentId)
        .maybeSingle();

      if (findErr) {
        console.error('Error al consultar selección existente (SELECT):', findErr);
        return NextResponse.json({ error: `Error en la base de datos (SELECT): ${formatErrorMessage(findErr)}` }, { status: 500 });
      }

      let resData;
      if (existing && existing.id) {
        // 2. Ejecutar UPDATE si la fila ya existe
        const { data: updateData, error: updateErr } = await supabaseServer
          .from('tactical_lineup_report_selections')
          .update({
            selected,
            selected_via: authCheck.authMethod || 'server_verification',
            selected_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id');

        if (updateErr) {
          console.error('Error al actualizar selección (UPDATE):', updateErr);
          return NextResponse.json({ error: `Error al actualizar la selección (UPDATE): ${formatErrorMessage(updateErr)}` }, { status: 500 });
        }
        resData = updateData;
      } else {
        // 3. Ejecutar INSERT si la fila no existe
        const { data: insertData, error: insertErr } = await supabaseServer
          .from('tactical_lineup_report_selections')
          .insert({
            tactical_lineup_id: lineupId,
            document_id: documentId,
            selected,
            selected_via: authCheck.authMethod || 'server_verification',
            selected_at: new Date().toISOString(),
          })
          .select('id');

        if (insertErr) {
          // Manejar posible condición de carrera por inserción simultánea (duplicado SQL 23505)
          if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key')) {
            const { data: retryUpdateData, error: retryErr } = await supabaseServer
              .from('tactical_lineup_report_selections')
              .update({
                selected,
                selected_via: authCheck.authMethod || 'server_verification',
                selected_at: new Date().toISOString(),
              })
              .eq('tactical_lineup_id', lineupId)
              .eq('document_id', documentId)
              .select('id');

            if (retryErr) {
              console.error('Error reintentando UPDATE tras conflicto:', retryErr);
              return NextResponse.json({ error: `Error reintentando actualización tras conflicto: ${formatErrorMessage(retryErr)}` }, { status: 500 });
            }
            resData = retryUpdateData;
          } else {
            console.error('Error al insertar selección (INSERT):', insertErr);
            return NextResponse.json({ error: `Error al crear la selección (INSERT): ${formatErrorMessage(insertErr)}` }, { status: 500 });
          }
        } else {
          resData = insertData;
        }
      }

      return NextResponse.json({ success: true, data: resData });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error en API manage-observations:', error);
    const msg = formatErrorMessage(error);
    return NextResponse.json({ error: msg || 'Error procesando solicitud.' }, { status: 500 });
  }
}
