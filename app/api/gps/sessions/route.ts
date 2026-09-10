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

export async function POST(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
    const isPasskeyValid = Boolean(expectedPasskey && passkeyHeader && passkeyHeader === expectedPasskey);
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req) || isPasskeyValid;

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const sanitizedSession = sanitizeGPSSession(body.session as Record<string, unknown>);
    if (!sanitizedSession) {
      return NextResponse.json({ error: 'Datos de sesión GPS inválidos o incompletos (fecha y match_id / tournament_match_id requeridos).' }, { status: 400 });
    }

    const sanitizedRows = sanitizeGPSRows(body.rows as unknown[]);
    if (sanitizedRows.length === 0) {
      return NextResponse.json({ error: 'No se enviaron registros GPS válidos con distancia calculable.' }, { status: 400 });
    }

    const sanitizedMappings = sanitizeGPSMappings(body.mappings as unknown[]);

    const supabaseServer = getSupabaseServerClient();

    const { data: rpcResult, error: rpcError } = await supabaseServer.rpc('save_gps_session_atomic', {
      p_session: sanitizedSession,
      p_rows: sanitizedRows,
      p_mappings: sanitizedMappings
    });

    if (rpcError) {
      console.error('[API /api/gps/sessions POST] Error en save_gps_session_atomic:', rpcError);
      return NextResponse.json({ error: `Error guardando sesión GPS: ${rpcError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/gps/sessions POST] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
    const isPasskeyValid = Boolean(expectedPasskey && passkeyHeader && passkeyHeader === expectedPasskey);
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req) || isPasskeyValid;

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
