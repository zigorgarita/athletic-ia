import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NUMERIC_EVAL_FIELDS = [
  'velocidad', 'aceleracion', 'fuerza', 'resistencia', 'juego_aereo',
  'marcaje', 'entrada_defensiva', 'posicionamiento_defensivo', 'trabajo_defensivo',
  'pase_corto', 'pase_largo', 'control_orientado', 'regate', 'centros',
  'finalizacion', 'disparo_lejano', 'trabajo_ofensivo',
  'vision_juego', 'inteligencia_tactica', 'liderazgo',
  'valoracion_global'
] as const;

/**
 * Endpoint de mutación exclusivo para evaluaciones detalladas de jugadores (detailed_evaluations).
 * Protegido server-side por la cookie coach_staff_session.
 */

// POST /api/players/evaluations -> Crear o actualizar evaluación detallada
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

    const { player_id, fecha_evaluacion, evaluado_por, metricas, perfil_especifico, valoraciones_generales } = body;

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return NextResponse.json({ error: 'player_id es obligatorio.' }, { status: 400 });
    }
    if (!fecha_evaluacion || typeof fecha_evaluacion !== 'string' || fecha_evaluacion.trim().length === 0) {
      return NextResponse.json({ error: 'fecha_evaluacion es obligatoria.' }, { status: 400 });
    }

    const sanitizedPayload: Record<string, unknown> = {
      player_id: player_id.trim(),
      fecha_evaluacion: fecha_evaluacion.trim(),
      evaluado_por: typeof evaluado_por === 'string' && evaluado_por.trim().length > 0 ? evaluado_por.trim() : null,
      metricas: metricas && typeof metricas === 'object' && !Array.isArray(metricas) ? metricas : null,
      perfil_especifico: perfil_especifico && typeof perfil_especifico === 'object' && !Array.isArray(perfil_especifico) ? perfil_especifico : null,
      valoraciones_generales: valoraciones_generales && typeof valoraciones_generales === 'object' && !Array.isArray(valoraciones_generales) ? valoraciones_generales : null,
    };

    // Campos numéricos validados
    for (const field of NUMERIC_EVAL_FIELDS) {
      if (field in body && typeof body[field] === 'number' && !isNaN(body[field])) {
        sanitizedPayload[field] = body[field];
      }
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('detailed_evaluations')
      .upsert(sanitizedPayload, { onConflict: 'player_id,fecha_evaluacion' })
      .select()
      .single();

    if (error) {
      console.error('[API/evaluations] Error guardando evaluación:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API/evaluations] Excepción interna en POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
