import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizePlayPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.id === 'string' && data.id.trim()) {
    payload.id = data.id.trim();
  }
  if (typeof data.tipo === 'string') {
    payload.tipo = data.tipo.trim();
  }
  if (typeof data.titulo === 'string') {
    payload.titulo = data.titulo.trim();
  }
  if (data.descripcion !== undefined) {
    payload.descripcion = typeof data.descripcion === 'string' ? data.descripcion : null;
  }
  if (data.video_url !== undefined) {
    payload.video_url = typeof data.video_url === 'string' && data.video_url.trim() ? data.video_url.trim() : null;
  }
  if (data.zona !== undefined) {
    payload.zona = typeof data.zona === 'string' && data.zona.trim() ? data.zona.trim() : null;
  }

  return payload;
}

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

    const supabaseServer = getSupabaseServerClient();

    // Supports:
    // 1) Direct play upsert: { id?, tipo, titulo, descripcion, video_url, zona }
    // 2) Play + roles creation: { play: { ... }, roles?: [...] }
    const playData = (body.play && typeof body.play === 'object' ? body.play : body) as Record<string, unknown>;
    const rolesData = (Array.isArray(body.roles) ? body.roles : []) as Record<string, unknown>[];

    if (!playData.tipo || typeof playData.tipo !== 'string' || !playData.titulo || typeof playData.titulo !== 'string') {
      return NextResponse.json({ error: 'tipo y titulo son obligatorios para una jugada ABP.' }, { status: 400 });
    }

    const sanitizedPlay = sanitizePlayPayload(playData);

    let savedPlay;
    if (sanitizedPlay.id) {
      const { data, error } = await supabaseServer
        .from('abp_plays')
        .upsert(sanitizedPlay, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw error;
      savedPlay = data;
    } else {
      const { data, error } = await supabaseServer
        .from('abp_plays')
        .insert(sanitizedPlay)
        .select('*')
        .single();
      if (error) throw error;
      savedPlay = data;
    }

    let savedRoles = [];
    if (rolesData.length > 0 && savedPlay) {
      const rolesToInsert = rolesData.map((r, idx) => ({
        abp_play_id: savedPlay.id,
        player_id: typeof r.player_id === 'string' && r.player_id.trim() ? r.player_id.trim() : null,
        rol_asignado: typeof r.rol_asignado === 'string' ? r.rol_asignado.trim() : 'Jugador',
        posicion_x: typeof r.posicion_x === 'number' ? r.posicion_x : 50,
        posicion_y: typeof r.posicion_y === 'number' ? r.posicion_y : 50,
        etiqueta: typeof r.etiqueta === 'string' ? r.etiqueta.trim() : null,
        comentario: r.comentario ? (typeof r.comentario === 'string' ? r.comentario : JSON.stringify(r.comentario)) : null,
        orden: typeof r.orden === 'number' ? r.orden : idx + 1,
        label_position: typeof r.label_position === 'string' ? r.label_position : 'top'
      }));

      const { data: rData, error: rErr } = await supabaseServer
        .from('abp_player_roles')
        .insert(rolesToInsert)
        .select('*');
      if (rErr) {
        console.error('[API /api/abp/plays POST] Error inserting roles:', rErr);
      } else {
        savedRoles = rData || [];
      }
    }

    return NextResponse.json({ success: true, data: savedPlay, roles: savedRoles });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/plays POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.id === 'string') {
        id = body.id;
      }
    }

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'id es obligatorio para eliminar una jugada ABP.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const playId = id.trim();

    // 1. Encontrar todos los planes asociados
    const { data: plans } = await supabaseServer
      .from('match_abp_plans')
      .select('id')
      .eq('abp_play_id', playId);

    const planIds = (plans || []).map(p => p.id);

    // 2. Borrar asignaciones de jugadores de esos planes
    if (planIds.length > 0) {
      await supabaseServer
        .from('match_abp_player_assignments')
        .delete()
        .in('match_abp_plan_id', planIds);

      // 3. Borrar planes de partido asociados
      await supabaseServer
        .from('match_abp_plans')
        .delete()
        .in('id', planIds);
    }

    // 4. Borrar roles de la jugada
    await supabaseServer
      .from('abp_player_roles')
      .delete()
      .eq('abp_play_id', playId);

    // 5. Borrar la jugada
    const { error } = await supabaseServer
      .from('abp_plays')
      .delete()
      .eq('id', playId);

    if (error) {
      console.error('[API /api/abp/plays DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/plays DELETE] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
