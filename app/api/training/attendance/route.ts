import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeAttendanceItem(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;
  const sessionId = typeof item.session_id === 'string' ? item.session_id.trim() : '';
  const playerId = typeof item.player_id === 'string' ? item.player_id.trim() : '';
  if (!sessionId || !playerId) return null;

  const sanitized: Record<string, unknown> = {
    session_id: sessionId,
    player_id: playerId,
    attendance_status: typeof item.attendance_status === 'string' && item.attendance_status.trim()
      ? item.attendance_status.trim()
      : 'Asiste',
    absence_reason: typeof item.absence_reason === 'string' && item.absence_reason.trim()
      ? item.absence_reason.trim()
      : null,
    attendance_notes: typeof item.attendance_notes === 'string' && item.attendance_notes.trim()
      ? item.attendance_notes.trim()
      : null,
    player_full_name_backup: typeof item.player_full_name_backup === 'string' && item.player_full_name_backup.trim()
      ? item.player_full_name_backup.trim()
      : null,
    player_dorsal_backup: item.player_dorsal_backup !== undefined && item.player_dorsal_backup !== null && item.player_dorsal_backup !== ''
      ? Number(item.player_dorsal_backup)
      : null,
    recorded_by: typeof item.recorded_by === 'string' && item.recorded_by.trim()
      ? item.recorded_by.trim()
      : 'Cuerpo Técnico',
    updated_at: new Date().toISOString()
  };

  if (typeof item.id === 'string' && item.id.trim()) {
    sanitized.id = item.id.trim();
  }

  return sanitized;
}

function sanitizeEvaluationItem(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;
  const sessionId = typeof item.session_id === 'string' ? item.session_id.trim() : '';
  const playerId = typeof item.player_id === 'string' ? item.player_id.trim() : '';
  if (!sessionId || !playerId) return null;

  const toNullableNumber = (val: unknown): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const sanitized: Record<string, unknown> = {
    session_id: sessionId,
    player_id: playerId,
    actitud: toNullableNumber(item.actitud),
    intensidad: toNullableNumber(item.intensidad),
    comprension_tactica: toNullableNumber(item.comprension_tactica),
    ejecucion_tecnica: toNullableNumber(item.ejecucion_tecnica),
    compromiso_defensivo: toNullableNumber(item.compromiso_defensivo),
    compromiso_ofensivo: toNullableNumber(item.compromiso_ofensivo),
    valoracion_global: toNullableNumber(item.valoracion_global),
    observaciones: typeof item.observaciones === 'string' && item.observaciones.trim()
      ? item.observaciones.trim()
      : null,
    fecha_evaluacion: typeof item.fecha_evaluacion === 'string' && item.fecha_evaluacion.trim()
      ? item.fecha_evaluacion.trim()
      : null,
    player_full_name_backup: typeof item.player_full_name_backup === 'string' && item.player_full_name_backup.trim()
      ? item.player_full_name_backup.trim()
      : null,
    player_dorsal_backup: toNullableNumber(item.player_dorsal_backup),
    evaluated_by: typeof item.evaluated_by === 'string' && item.evaluated_by.trim()
      ? item.evaluated_by.trim()
      : 'Cuerpo Técnico',
    updated_at: new Date().toISOString()
  };

  if (typeof item.id === 'string' && item.id.trim()) {
    sanitized.id = item.id.trim();
  }

  return sanitized;
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

    const rawAttendance = Array.isArray(body.attendance) ? body.attendance : [];
    const rawEvaluations = Array.isArray(body.evaluations) ? body.evaluations : [];

    const sanitizedAttendance = rawAttendance
      .map((item: Record<string, unknown>) => sanitizeAttendanceItem(item))
      .filter((item: unknown): item is Record<string, unknown> => item !== null);

    const sanitizedEvaluations = rawEvaluations
      .map((item: Record<string, unknown>) => sanitizeEvaluationItem(item))
      .filter((item: unknown): item is Record<string, unknown> => item !== null);

    if (sanitizedAttendance.length === 0 && sanitizedEvaluations.length === 0) {
      return NextResponse.json({ error: 'No se enviaron registros válidos de asistencia o evaluación.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();

    if (sanitizedAttendance.length > 0) {
      const { error: attError } = await supabaseServer
        .from('training_attendance')
        .upsert(sanitizedAttendance, { onConflict: 'session_id,player_id' });

      if (attError) {
        console.error('[API /api/training/attendance POST] Error en training_attendance:', attError);
        return NextResponse.json({ error: `Error guardando asistencia: ${attError.message}` }, { status: 500 });
      }
    }

    if (sanitizedEvaluations.length > 0) {
      const { error: evalError } = await supabaseServer
        .from('training_evaluations')
        .upsert(sanitizedEvaluations, { onConflict: 'session_id,player_id' });

      if (evalError) {
        console.error('[API /api/training/attendance POST] Error en training_evaluations:', evalError);
        return NextResponse.json({ error: `Error guardando valoraciones: ${evalError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      savedAttendance: sanitizedAttendance.length,
      savedEvaluations: sanitizedEvaluations.length
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/training/attendance POST] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
