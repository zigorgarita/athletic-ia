import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeLineupPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.id === 'string' && data.id.trim()) {
    payload.id = data.id.trim();
  }
  if (typeof data.nombre_sistema === 'string') {
    payload.nombre_sistema = data.nombre_sistema.trim();
  }
  if (data.nombre_pizarra !== undefined) {
    payload.nombre_pizarra = typeof data.nombre_pizarra === 'string' ? data.nombre_pizarra.trim() : null;
  }
  if (data.sistema_propio !== undefined) {
    payload.sistema_propio = typeof data.sistema_propio === 'string' ? data.sistema_propio.trim() : null;
  }
  if (data.sistema_rival !== undefined) {
    payload.sistema_rival = typeof data.sistema_rival === 'string' ? data.sistema_rival.trim() : null;
  }
  if (data.notas !== undefined) {
    payload.notas = typeof data.notas === 'string' ? data.notas : null;
  }
  if (data.posiciones !== undefined && typeof data.posiciones === 'object' && data.posiciones !== null) {
    payload.posiciones = data.posiciones;
  }
  if (data.match_id !== undefined) {
    payload.match_id = typeof data.match_id === 'string' && data.match_id.trim() ? data.match_id.trim() : null;
  }
  if (data.ventajas !== undefined) {
    payload.ventajas = typeof data.ventajas === 'string' ? data.ventajas : null;
  }
  if (data.desventajas !== undefined) {
    payload.desventajas = typeof data.desventajas === 'string' ? data.desventajas : null;
  }
  if (data.zona_conflicto !== undefined) {
    payload.zona_conflicto = typeof data.zona_conflicto === 'string' ? data.zona_conflicto : null;
  }
  if (data.duelo_clave !== undefined) {
    payload.duelo_clave = typeof data.duelo_clave === 'string' ? data.duelo_clave : null;
  }
  if (data.orientaciones_individuales !== undefined) {
    payload.orientaciones_individuales = typeof data.orientaciones_individuales === 'string' ? data.orientaciones_individuales : null;
  }
  if (data.analisis_modelo_juego !== undefined) {
    payload.analisis_modelo_juego = typeof data.analisis_modelo_juego === 'object' && data.analisis_modelo_juego !== null ? data.analisis_modelo_juego : null;
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

    if (!body.nombre_sistema || typeof body.nombre_sistema !== 'string') {
      return NextResponse.json({ error: 'nombre_sistema es obligatorio.' }, { status: 400 });
    }

    const sanitized = sanitizeLineupPayload(body);
    const supabaseServer = getSupabaseServerClient();

    let result;
    if (sanitized.id) {
      result = await supabaseServer
        .from('tactical_lineups')
        .upsert(sanitized, { onConflict: 'id' })
        .select('*')
        .single();
    } else {
      result = await supabaseServer
        .from('tactical_lineups')
        .insert(sanitized)
        .select('*')
        .single();
    }

    if (result.error) {
      console.error('[API /api/tactica/lineups POST] Error Supabase:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/tactica/lineups POST] Error inesperado:', err);
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
      return NextResponse.json({ error: 'id es obligatorio para eliminar una pizarra táctica.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('tactical_lineups')
      .delete()
      .eq('id', id.trim());

    if (error) {
      console.error('[API /api/tactica/lineups DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/tactica/lineups DELETE] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
