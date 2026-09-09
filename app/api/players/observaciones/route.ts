import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de mutación exclusivo para observaciones de jugadores (observaciones).
 * Protegido server-side por la cookie coach_staff_session.
 */

// POST /api/players/observaciones -> Crear nueva observación
export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const {
      player_id,
      fecha,
      rival,
      competicion,
      minutos_jugados,
      observacion_tecnica,
      observacion_tactica,
      observacion_fisica,
      observacion_mental,
      valoracion_global,
    } = body;

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return NextResponse.json({ error: 'player_id es obligatorio.' }, { status: 400 });
    }
    if (!fecha || typeof fecha !== 'string' || fecha.trim().length === 0) {
      return NextResponse.json({ error: 'fecha es obligatoria.' }, { status: 400 });
    }
    if (!rival || typeof rival !== 'string' || rival.trim().length === 0) {
      return NextResponse.json({ error: 'rival es obligatorio.' }, { status: 400 });
    }
    if (!competicion || typeof competicion !== 'string' || competicion.trim().length === 0) {
      return NextResponse.json({ error: 'competicion es obligatoria.' }, { status: 400 });
    }

    const sanitizedPayload: Record<string, unknown> = {
      player_id: player_id.trim(),
      fecha: fecha.trim(),
      rival: rival.trim(),
      competicion: competicion.trim(),
      minutos_jugados: typeof minutos_jugados === 'number' && !isNaN(minutos_jugados) ? minutos_jugados : 0,
      observacion_tecnica: typeof observacion_tecnica === 'string' && observacion_tecnica.trim().length > 0 ? observacion_tecnica.trim() : null,
      observacion_tactica: typeof observacion_tactica === 'string' && observacion_tactica.trim().length > 0 ? observacion_tactica.trim() : null,
      observacion_fisica: typeof observacion_fisica === 'string' && observacion_fisica.trim().length > 0 ? observacion_fisica.trim() : null,
      observacion_mental: typeof observacion_mental === 'string' && observacion_mental.trim().length > 0 ? observacion_mental.trim() : null,
      valoracion_global: typeof valoracion_global === 'number' && !isNaN(valoracion_global) ? valoracion_global : 3.0,
    };

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('observaciones')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (error) {
      console.error('[API/observaciones] Error insertando observación:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API/observaciones] Excepción interna en POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
