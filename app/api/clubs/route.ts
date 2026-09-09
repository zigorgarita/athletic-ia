import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_CLUB_FIELDS = new Set([
  'nombre', 'nombre_corto', 'escudo_url', 'imagen_fondo_url', 'tipo',
  'ciudad', 'provincia', 'comunidad_autonoma', 'ano_fundacion',
  'colores', 'equipacion_local', 'equipacion_visitante',
  'presidente', 'director_deportivo', 'web', 'redes_sociales', 'cantera',
  'campo_nombre', 'campo_direccion', 'campo_google_maps', 'coordenadas_gps', 'tiempo_viaje',
  'campo_cesped', 'campo_dimensiones', 'campo_capacidad',
  'vestuarios', 'banquillos', 'zona_grabacion',
  'observaciones_campo', 'observaciones_generales'
]);

const ALLOWED_SEASON_FIELDS = new Set([
  'temporada', 'grupo', 'categoria', 'estado_scouting', 'nivel_dificultad', 'estadisticas'
]);

/**
 * PATCH /api/clubs
 * Actualización server-side protegida para clubs y club_seasons.
 */
export async function PATCH(req: Request) {
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

    const { target, id, data } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id es obligatorio.' }, { status: 400 });
    }
    if (!target || !['clubs', 'club_seasons'].includes(target)) {
      return NextResponse.json({ error: "target inválido. Debe ser 'clubs' o 'club_seasons'." }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'data debe ser un objeto con campos a actualizar.' }, { status: 400 });
    }

    const allowedSet = target === 'clubs' ? ALLOWED_CLUB_FIELDS : ALLOWED_SEASON_FIELDS;
    const sanitizedUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (allowedSet.has(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    const supabaseServer = getSupabaseServerClient();
    const { data: result, error } = await supabaseServer
      .from(target)
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[API/clubs] Error actualizando ${target}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs] Excepción interna en PATCH:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
