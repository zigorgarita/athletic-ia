import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint server-side para club_videos.
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
      club_id,
      club_season_id,
      scouting_match_id,
      club_player_id,
      titulo,
      descripcion,
      url,
      tipo_origen,
      tipo,
      categoria,
      etiquetas,
      fecha,
      drive_file_id,
      tamano_bytes,
      estado
    } = body;

    if (!club_id || typeof club_id !== 'string') {
      return NextResponse.json({ error: 'club_id es obligatorio.' }, { status: 400 });
    }
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      return NextResponse.json({ error: 'titulo es obligatorio.' }, { status: 400 });
    }
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'url es obligatoria.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      club_id: club_id.trim(),
      club_season_id: club_season_id || null,
      scouting_match_id: scouting_match_id || null,
      club_player_id: club_player_id || null,
      titulo: titulo.trim(),
      descripcion: descripcion || null,
      url: url.trim(),
      tipo_origen: tipo_origen || 'Enlace',
      tipo: tipo || null,
      categoria: categoria || null,
      etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
      fecha: fecha || null,
      drive_file_id: drive_file_id || null,
      tamano_bytes: tamano_bytes !== undefined && tamano_bytes !== null ? Number(tamano_bytes) : null,
      estado: estado || null,
    };

    const supabaseServer = getSupabaseServerClient();

    if (id && typeof id === 'string') {
      payload.id = id.trim();
      const { data, error } = await supabaseServer
        .from('club_videos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/videos] Error en upsert video:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_videos')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/videos] Error en insert video:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/videos] Excepción interna en POST:', err);
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
      return NextResponse.json({ error: 'id es obligatorio para eliminar video.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_videos')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/videos] Error borrando video:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/videos] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
