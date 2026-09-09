import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizePlayerPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.nombre === 'string') payload.nombre = data.nombre.trim();
  if (typeof data.apellidos === 'string') payload.apellidos = data.apellidos.trim();
  if (data.alias !== undefined) payload.alias = typeof data.alias === 'string' && data.alias.trim() ? data.alias.trim() : null;
  if (data.dorsal !== undefined && data.dorsal !== null && data.dorsal !== '') payload.dorsal = Number(data.dorsal);
  if (typeof data.demarcacion === 'string') payload.demarcacion = data.demarcacion.trim();
  if (data.posicion_secundaria !== undefined) payload.posicion_secundaria = typeof data.posicion_secundaria === 'string' && data.posicion_secundaria.trim() ? data.posicion_secundaria.trim() : null;
  if (typeof data.fecha_nacimiento === 'string') payload.fecha_nacimiento = data.fecha_nacimiento;
  if (data.altura !== undefined) payload.altura = data.altura !== null && data.altura !== '' ? Number(data.altura) : null;
  if (data.peso !== undefined) payload.peso = data.peso !== null && data.peso !== '' ? Number(data.peso) : null;
  if (typeof data.pierna_dominante === 'string') payload.pierna_dominante = data.pierna_dominante;
  if (typeof data.estado === 'string') payload.estado = data.estado;
  if (data.rol_abp !== undefined) payload.rol_abp = typeof data.rol_abp === 'string' && data.rol_abp.trim() ? data.rol_abp.trim() : null;
  if (data.foto_url !== undefined) payload.foto_url = typeof data.foto_url === 'string' && data.foto_url.trim() ? data.foto_url.trim() : null;
  if (data.equipo !== undefined) payload.equipo = typeof data.equipo === 'string' && data.equipo.trim() ? data.equipo.trim() : 'Juvenil A';
  if (data.oliver_player_id !== undefined) payload.oliver_player_id = typeof data.oliver_player_id === 'string' && data.oliver_player_id.trim() ? data.oliver_player_id.trim() : null;
  if (data.rfef_player_id !== undefined) payload.rfef_player_id = data.rfef_player_id !== null && data.rfef_player_id !== '' ? Number(data.rfef_player_id) : null;

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

    if (!body.nombre || !body.apellidos) {
      return NextResponse.json({ error: 'Nombre y apellidos son obligatorios.' }, { status: 400 });
    }

    const sanitized = sanitizePlayerPayload(body);
    if (body.id && typeof body.id === 'string') {
      sanitized.id = body.id.trim();
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('players')
      .insert(sanitized)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/players POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/players POST] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Se requiere ID de jugador válido.' }, { status: 400 });
    }

    const playerId = String(body.id).trim();
    const sanitized = sanitizePlayerPayload(body);
    sanitized.updated_at = new Date().toISOString();

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('players')
      .update(sanitized)
      .eq('id', playerId)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/players PUT] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/players PUT] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let playerId = searchParams.get('id');

    if (!playerId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        playerId = String(body.id);
      }
    }

    if (!playerId) {
      return NextResponse.json({ error: 'Se requiere ID del jugador a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('players')
      .delete()
      .eq('id', playerId.trim());

    if (error) {
      console.error('[API /api/players DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: playerId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/players DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
