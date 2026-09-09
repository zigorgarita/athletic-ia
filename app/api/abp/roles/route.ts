import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeRolePayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.id === 'string' && data.id.trim()) {
    payload.id = data.id.trim();
  }
  if (typeof data.abp_play_id === 'string' && data.abp_play_id.trim()) {
    payload.abp_play_id = data.abp_play_id.trim();
  }
  if (data.player_id !== undefined) {
    payload.player_id = typeof data.player_id === 'string' && data.player_id.trim() ? data.player_id.trim() : null;
  }
  if (data.rol_asignado !== undefined) {
    payload.rol_asignado = typeof data.rol_asignado === 'string' ? data.rol_asignado.trim() : 'Jugador';
  }
  if (data.posicion_x !== undefined) {
    payload.posicion_x = typeof data.posicion_x === 'number' ? data.posicion_x : Number(data.posicion_x);
  }
  if (data.posicion_y !== undefined) {
    payload.posicion_y = typeof data.posicion_y === 'number' ? data.posicion_y : Number(data.posicion_y);
  }
  if (data.etiqueta !== undefined) {
    payload.etiqueta = typeof data.etiqueta === 'string' ? data.etiqueta.trim() : null;
  }
  if (data.comentario !== undefined) {
    payload.comentario = typeof data.comentario === 'string' ? data.comentario : (data.comentario ? JSON.stringify(data.comentario) : null);
  }
  if (data.orden !== undefined) {
    payload.orden = typeof data.orden === 'number' ? data.orden : Number(data.orden);
  }
  if (data.label_position !== undefined) {
    payload.label_position = typeof data.label_position === 'string' ? data.label_position.trim() : 'top';
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
    // 1) Single role: { id?, abp_play_id, rol_asignado?, ... }
    // 2) Bulk roles: { roles: [...] } or direct array [...]
    const rawRoles: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>).roles)
      ? ((body as Record<string, unknown>).roles as unknown[])
      : [body];

    if (rawRoles.length === 0) {
      return NextResponse.json({ error: 'No se enviaron roles para guardar.' }, { status: 400 });
    }

    const sanitizedRoles = rawRoles.map(r => sanitizeRolePayload(r as Record<string, unknown>));

    // For updates or upserts:
    const results = [];
    for (const role of sanitizedRoles) {
      if (role.id) {
        const { data, error } = await supabaseServer
          .from('abp_player_roles')
          .upsert(role, { onConflict: 'id' })
          .select('*')
          .single();
        if (error) throw error;
        results.push(data);
      } else {
        const { data, error } = await supabaseServer
          .from('abp_player_roles')
          .insert(role)
          .select('*')
          .single();
        if (error) throw error;
        results.push(data);
      }
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/roles POST] Error inesperado:', err);
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
    const playId = url.searchParams.get('abp_play_id');

    if (!id && !playId) {
      const body = await req.json().catch(() => null);
      if (body) {
        if (typeof body.id === 'string') id = body.id;
        if (typeof body.abp_play_id === 'string') id = body.abp_play_id;
      }
    }

    const supabaseServer = getSupabaseServerClient();

    if (id) {
      const { error } = await supabaseServer
        .from('abp_player_roles')
        .delete()
        .eq('id', id.trim());
      if (error) throw error;
    } else if (playId) {
      const { error } = await supabaseServer
        .from('abp_player_roles')
        .delete()
        .eq('abp_play_id', playId.trim());
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'id o abp_play_id es requerido para borrar roles.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/roles DELETE] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
