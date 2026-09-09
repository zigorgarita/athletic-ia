import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_ROLES = [
  'Entrenador', 'Segundo entrenador', 'Preparador físico',
  'Entrenador de porteros', 'Analista', 'Delegado', 'Otro'
] as const;

/**
 * Endpoint server-side para club_staff.
 * Protegido por coach_staff_session.
 */
export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const { id, club_season_id, nombre, rol, foto_url, observaciones } = body;

    if (!club_season_id || typeof club_season_id !== 'string') {
      return NextResponse.json({ error: 'club_season_id es obligatorio.' }, { status: 400 });
    }
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return NextResponse.json({ error: 'nombre es obligatorio.' }, { status: 400 });
    }
    if (!rol || !(VALID_ROLES as readonly string[]).includes(rol)) {
      return NextResponse.json({ error: `rol inválido. Debe ser uno de: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      club_season_id: club_season_id.trim(),
      nombre: nombre.trim(),
      rol,
      foto_url: typeof foto_url === 'string' && foto_url.trim().length > 0 ? foto_url.trim() : null,
      observaciones: typeof observaciones === 'string' && observaciones.trim().length > 0 ? observaciones.trim() : null,
    };

    const supabaseServer = getSupabaseServerClient();

    if (id && typeof id === 'string') {
      payload.id = id.trim();
      const { data, error } = await supabaseServer
        .from('club_staff')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/staff] Error en upsert staff:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_staff')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/staff] Error en insert staff:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/staff] Excepción interna en POST:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión requerida.' }, { status: 401 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.id === 'string') {
        id = body.id;
      }
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'id es obligatorio para eliminar staff.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_staff')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/staff] Error borrando staff:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/staff] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
