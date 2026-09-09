import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint server-side para club_reports.
 * Protegido por coach_staff_session.
 */
export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const {
      id,
      club_season_id,
      scouting_match_id,
      tipo,
      estado,
      adjuntos,
      enlaces,
      titulo,
      fecha,
      plan_partido,
      objetivos,
      que_atacar,
      que_proteger,
      consignas,
      mensaje_equipo,
      contenido_libre
    } = body;

    if (!club_season_id || typeof club_season_id !== 'string') {
      return NextResponse.json({ error: 'club_season_id es obligatorio.' }, { status: 400 });
    }
    if (!tipo || typeof tipo !== 'string') {
      return NextResponse.json({ error: 'tipo de informe es obligatorio.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      club_season_id: club_season_id.trim(),
      scouting_match_id: scouting_match_id || null,
      tipo: tipo.trim(),
      estado: estado || 'Borrador',
      adjuntos: Array.isArray(adjuntos) ? adjuntos : [],
      enlaces: enlaces && typeof enlaces === 'object' ? enlaces : {},
      titulo: titulo || null,
      fecha: fecha || new Date().toISOString().split('T')[0],
      plan_partido: plan_partido || null,
      objetivos: objetivos || null,
      que_atacar: que_atacar || null,
      que_proteger: que_proteger || null,
      consignas: consignas || null,
      mensaje_equipo: mensaje_equipo || null,
      contenido_libre: contenido_libre || null,
    };

    const supabaseServer = getSupabaseServerClient();

    if (id && typeof id === 'string') {
      payload.id = id.trim();
      const { data, error } = await supabaseServer
        .from('club_reports')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/reports] Error en upsert report:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_reports')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/reports] Error en insert report:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/reports] Excepción interna en POST:', err);
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
      return NextResponse.json({ error: 'id es obligatorio para eliminar informe.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_reports')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/reports] Error borrando report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/reports] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
