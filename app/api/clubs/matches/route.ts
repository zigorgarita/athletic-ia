import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint server-side para club_scouting_matches.
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
      our_match_id,
      fecha,
      hora,
      competicion,
      jornada,
      rival_en_ese_partido,
      local_visitante,
      campo,
      arbitro,
      resultado,
      goles_favor,
      goles_contra,
      sistema_rival,
      sistema_nuestro,
      alineacion_rival,
      estadisticas,
      informe_analista,
      informe_ia,
      observaciones_mister,
      valoracion,
      distancia_km,
      tiempo_viaje_min
    } = body;

    if (!club_season_id || typeof club_season_id !== 'string') {
      return NextResponse.json({ error: 'club_season_id es obligatorio.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      club_season_id: club_season_id.trim(),
      our_match_id: our_match_id || null,
      fecha: fecha || null,
      hora: hora || null,
      competicion: competicion || null,
      jornada: jornada || null,
      rival_en_ese_partido: rival_en_ese_partido || null,
      local_visitante: local_visitante || null,
      campo: campo || null,
      arbitro: arbitro || null,
      resultado: resultado || null,
      goles_favor: goles_favor !== undefined && goles_favor !== null ? Number(goles_favor) : null,
      goles_contra: goles_contra !== undefined && goles_contra !== null ? Number(goles_contra) : null,
      sistema_rival: sistema_rival || null,
      sistema_nuestro: sistema_nuestro || null,
      alineacion_rival: alineacion_rival || null,
      estadisticas: estadisticas && typeof estadisticas === 'object' ? estadisticas : {},
      informe_analista: informe_analista || null,
      informe_ia: informe_ia || null,
      observaciones_mister: observaciones_mister || null,
      valoracion: valoracion !== undefined && valoracion !== null ? Number(valoracion) : null,
      distancia_km: distancia_km !== undefined && distancia_km !== null ? Number(distancia_km) : null,
      tiempo_viaje_min: tiempo_viaje_min !== undefined && tiempo_viaje_min !== null ? Number(tiempo_viaje_min) : null,
    };

    const supabaseServer = getSupabaseServerClient();

    if (id && typeof id === 'string') {
      payload.id = id.trim();
      const { data, error } = await supabaseServer
        .from('club_scouting_matches')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/matches] Error en upsert scouting match:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_scouting_matches')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/matches] Error en insert scouting match:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/matches] Excepción interna en POST:', err);
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
      return NextResponse.json({ error: 'id es obligatorio para eliminar partido de scouting.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_scouting_matches')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/matches] Error borrando match:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/matches] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
