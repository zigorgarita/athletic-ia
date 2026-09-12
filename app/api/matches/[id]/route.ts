import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 1. Autorización mediante sesión central de staff
    let authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      const staffPasskey = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
      const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
      if (staffPasskey && staffPasskey === expectedPasskey) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Resolver y validar matchId (UUID requerido)
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { success: false, error: `ID de partido inválido (UUID requerido): '${matchId}'` },
        { status: 400 }
      );
    }

    // 3. Extraer y validar cuerpo de la petición
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    // 4. Regla RFEF estricta: official_match_id NO puede modificarse ni anularse
    if ('official_match_id' in body && body.official_match_id !== undefined) {
      return NextResponse.json(
        { success: false, error: 'No está permitido modificar el vínculo oficial RFEF (official_match_id).' },
        { status: 400 }
      );
    }

    // 5. Construcción parcial y atómica del payload con whitelist estricta
    const updatePayload: Record<string, unknown> = {};

    // A. Campos deportivos generales (MatchForm)
    if ('jornada' in body && body.jornada !== undefined) {
      const rawJornada = Number(body.jornada);
      if (isNaN(rawJornada) || !Number.isInteger(rawJornada) || rawJornada < 1) {
        return NextResponse.json(
          { success: false, error: 'El campo "jornada" debe ser un número entero mayor o igual a 1.' },
          { status: 400 }
        );
      }
      updatePayload.jornada = rawJornada;
    }

    if ('rival' in body && body.rival !== undefined) {
      const rawRival = typeof body.rival === 'string' ? body.rival.trim() : '';
      if (rawRival.length < 2) {
        return NextResponse.json(
          { success: false, error: 'El campo "rival" debe tener al menos 2 caracteres.' },
          { status: 400 }
        );
      }
      updatePayload.rival = rawRival;
    }

    if ('fecha' in body && body.fecha !== undefined) {
      const rawFecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
      if (!rawFecha || isNaN(Date.parse(rawFecha))) {
        return NextResponse.json(
          { success: false, error: 'El campo "fecha" debe tener un formato de fecha válido.' },
          { status: 400 }
        );
      }
      updatePayload.fecha = rawFecha;
    }

    if ('es_local' in body && body.es_local !== undefined) {
      updatePayload.es_local = Boolean(body.es_local);
    }

    if ('jugado' in body && body.jugado !== undefined) {
      updatePayload.jugado = Boolean(body.jugado);
    }

    if ('goles_favor' in body) {
      if (body.goles_favor === null || body.goles_favor === '') {
        updatePayload.goles_favor = null;
      } else if (body.goles_favor !== undefined) {
        const gf = Number(body.goles_favor);
        if (isNaN(gf) || gf < 0 || !Number.isInteger(gf)) {
          return NextResponse.json(
            { success: false, error: 'El campo "goles_favor" debe ser un número entero mayor o igual a 0 o null.' },
            { status: 400 }
          );
        }
        updatePayload.goles_favor = gf;
      }
    }

    if ('goles_contra' in body) {
      if (body.goles_contra === null || body.goles_contra === '') {
        updatePayload.goles_contra = null;
      } else if (body.goles_contra !== undefined) {
        const gc = Number(body.goles_contra);
        if (isNaN(gc) || gc < 0 || !Number.isInteger(gc)) {
          return NextResponse.json(
            { success: false, error: 'El campo "goles_contra" debe ser un número entero mayor o igual a 0 o null.' },
            { status: 400 }
          );
        }
        updatePayload.goles_contra = gc;
      }
    }

    if ('tipo_partido' in body && body.tipo_partido !== undefined) {
      updatePayload.tipo_partido = body.tipo_partido === 'AMISTOSO' ? 'AMISTOSO' : 'LIGA';
    }

    if ('competicion' in body && body.competicion !== undefined) {
      updatePayload.competicion = typeof body.competicion === 'string' && body.competicion.trim()
        ? body.competicion.trim()
        : null;
    }

    // B. Metadatos de campo y horario (handleSaveGeneralInfo)
    if ('hora' in body) {
      updatePayload.hora = typeof body.hora === 'string' && body.hora.trim() ? body.hora.trim() : null;
    }

    if ('campo' in body) {
      updatePayload.campo = typeof body.campo === 'string' && body.campo.trim() ? body.campo.trim() : null;
    }

    if ('clasificacion_nota' in body) {
      updatePayload.clasificacion_nota = typeof body.clasificacion_nota === 'string' && body.clasificacion_nota.trim()
        ? body.clasificacion_nota.trim()
        : null;
    }

    // C. Informe del analista (handleSaveReport)
    if ('analisis_resumen' in body) {
      updatePayload.analisis_resumen = typeof body.analisis_resumen === 'string' && body.analisis_resumen.trim()
        ? body.analisis_resumen.trim()
        : null;
    }

    if ('analisis_positivos' in body) {
      updatePayload.analisis_positivos = typeof body.analisis_positivos === 'string' && body.analisis_positivos.trim()
        ? body.analisis_positivos.trim()
        : null;
    }

    if ('analisis_mejorar' in body) {
      updatePayload.analisis_mejorar = typeof body.analisis_mejorar === 'string' && body.analisis_mejorar.trim()
        ? body.analisis_mejorar.trim()
        : null;
    }

    if ('analisis_claves' in body) {
      updatePayload.analisis_claves = typeof body.analisis_claves === 'string' && body.analisis_claves.trim()
        ? body.analisis_claves.trim()
        : null;
    }

    if ('analisis_conclusiones' in body) {
      updatePayload.analisis_conclusiones = typeof body.analisis_conclusiones === 'string' && body.analisis_conclusiones.trim()
        ? body.analisis_conclusiones.trim()
        : null;
    }

    // 6. Verificar que existe al menos un campo válido a actualizar
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se enviaron campos válidos para actualizar.' },
        { status: 400 }
      );
    }

    // 7. Actualización atómica en Supabase Server
    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: `No se encontró ningún partido con id '${matchId}'.` },
          { status: 404 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'El número de jornada ya está en uso por otro partido.' },
          { status: 409 }
        );
      }
      console.error('[API /api/matches/[id] PATCH] Error en update:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error('[API /api/matches/[id] PATCH] Excepción interna:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
