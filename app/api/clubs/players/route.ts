import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface IncomingPlayerRaw {
  nombre?: unknown;
  dorsal?: unknown;
  posicion?: unknown;
  origen?: unknown;
}

function sanitizePlayerPayload(data: Record<string, unknown>, seasonId?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    club_season_id: data.club_season_id || seasonId,
    nombre: typeof data.nombre === 'string' ? data.nombre.trim() : '',
    foto_url: typeof data.foto_url === 'string' && data.foto_url.trim().length > 0 ? data.foto_url.trim() : null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    altura: data.altura !== undefined && data.altura !== null && data.altura !== '' ? Number(data.altura) : null,
    peso: data.peso !== undefined && data.peso !== null && data.peso !== '' ? Number(data.peso) : null,
    pierna_dominante: data.pierna_dominante || null,
    posicion: data.posicion || null,
    dorsal: data.dorsal !== undefined && data.dorsal !== null && data.dorsal !== '' ? Number(data.dorsal) : null,
    minutos_jugados: data.minutos_jugados !== undefined && data.minutos_jugados !== null ? Number(data.minutos_jugados) : 0,
    caracteristicas: data.caracteristicas || null,
    fortalezas: data.fortalezas || null,
    debilidades: data.debilidades || null,
    observaciones: data.observaciones || null,
    origen: data.origen || 'manual',
  };

  if (data.id && typeof data.id === 'string') {
    payload.id = data.id.trim();
  }

  return payload;
}

/**
 * Endpoint server-side para club_players.
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

    const supabaseServer = getSupabaseServerClient();

    // Caso A: Bulk insert
    if (body.bulk === true && Array.isArray(body.players)) {
      const seasonId = body.club_season_id;
      if (!seasonId) {
        return NextResponse.json({ error: 'club_season_id es obligatorio para inserción múltiple.' }, { status: 400 });
      }

      const rawPlayers = body.players as IncomingPlayerRaw[];
      const payloads = rawPlayers.map((p) => ({
        club_season_id: seasonId,
        nombre: typeof p.nombre === 'string' ? p.nombre.trim() : '',
        dorsal: p.dorsal !== undefined && p.dorsal !== null && p.dorsal !== '' ? Number(p.dorsal) : null,
        posicion: typeof p.posicion === 'string' ? p.posicion : null,
        origen: typeof p.origen === 'string' ? p.origen : 'documento',
        minutos_jugados: 0,
      })).filter((p) => p.nombre.length > 0);

      if (payloads.length === 0) {
        return NextResponse.json({ success: true, count: 0 }, { status: 200 });
      }

      const { data, error } = await supabaseServer
        .from('club_players')
        .insert(payloads)
        .select();

      if (error) {
        console.error('[API/clubs/players] Error en bulk insert:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length || payloads.length }, { status: 201 });
    }

    // Caso B: Upsert individual
    const sanitized = sanitizePlayerPayload(body);
    if (!sanitized.club_season_id) {
      return NextResponse.json({ error: 'club_season_id es obligatorio.' }, { status: 400 });
    }
    if (!sanitized.nombre) {
      return NextResponse.json({ error: 'nombre es obligatorio.' }, { status: 400 });
    }

    if (sanitized.id) {
      const { data, error } = await supabaseServer
        .from('club_players')
        .upsert(sanitized, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/players] Error en upsert player:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_players')
        .insert(sanitized)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/players] Error en insert player:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/players] Excepción interna en POST:', err);
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
      return NextResponse.json({ error: 'id es obligatorio para eliminar jugador.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_players')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/players] Error borrando jugador:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/players] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
