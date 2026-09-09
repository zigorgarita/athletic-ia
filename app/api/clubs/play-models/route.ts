import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint server-side para club_play_models.
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
      version,
      fecha,
      sistema_principal,
      sistemas_alternativos,
      salida_balon,
      construccion,
      ataque_organizado,
      ataque_bandas,
      ataque_interior,
      transicion_ofensiva,
      transicion_defensiva,
      presion,
      bloque_defensivo,
      defensa_area,
      abp_ofensiva,
      abp_defensiva,
      createNewVersion
    } = body;

    if (!club_season_id || typeof club_season_id !== 'string') {
      return NextResponse.json({ error: 'club_season_id es obligatorio.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      club_season_id: club_season_id.trim(),
      version: version !== undefined && version !== null ? Number(version) : 1,
      fecha: fecha || new Date().toISOString().split('T')[0],
      sistema_principal: sistema_principal || null,
      sistemas_alternativos: sistemas_alternativos || null,
      salida_balon: salida_balon || null,
      construccion: construccion || null,
      ataque_organizado: ataque_organizado || null,
      ataque_bandas: ataque_bandas || null,
      ataque_interior: ataque_interior || null,
      transicion_ofensiva: transicion_ofensiva || null,
      transicion_defensiva: transicion_defensiva || null,
      presion: presion || null,
      bloque_defensivo: bloque_defensivo || null,
      defensa_area: defensa_area || null,
      abp_ofensiva: abp_ofensiva || null,
      abp_defensiva: abp_defensiva || null,
    };

    const supabaseServer = getSupabaseServerClient();

    if (id && typeof id === 'string' && !createNewVersion) {
      payload.id = id.trim();
      const { data, error } = await supabaseServer
        .from('club_play_models')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/play-models] Error en upsert modelo:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 200 });
    } else {
      const { data, error } = await supabaseServer
        .from('club_play_models')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[API/clubs/play-models] Error en insert modelo:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (err) {
    console.error('[API/clubs/play-models] Excepción interna en POST:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
