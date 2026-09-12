import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function POST(req: Request) {
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

    // 2. Extraer y validar cuerpo de la petición
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    // 3. Regla RFEF estricta: Rechazar intento de asignación manual de official_match_id
    if ('official_match_id' in body && body.official_match_id !== undefined) {
      return NextResponse.json(
        { success: false, error: 'No está permitido asignar o modificar official_match_id manualmente.' },
        { status: 400 }
      );
    }

    // 4. Validar campos obligatorios
    const rawJornada = Number(body.jornada);
    if (body.jornada === undefined || isNaN(rawJornada) || !Number.isInteger(rawJornada) || rawJornada < 1) {
      return NextResponse.json(
        { success: false, error: 'El campo "jornada" debe ser un número entero mayor o igual a 1.' },
        { status: 400 }
      );
    }

    const rawRival = typeof body.rival === 'string' ? body.rival.trim() : '';
    if (rawRival.length < 2) {
      return NextResponse.json(
        { success: false, error: 'El campo "rival" debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const rawFecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
    if (!rawFecha || isNaN(Date.parse(rawFecha))) {
      return NextResponse.json(
        { success: false, error: 'El campo "fecha" es requerido y debe tener un formato de fecha válido.' },
        { status: 400 }
      );
    }

    // 5. Normalizar y sanitizar campos opcionales whitelisted
    const jugado = Boolean(body.jugado);
    const esLocal = body.es_local !== undefined ? Boolean(body.es_local) : true;
    const tipoPartido: 'LIGA' | 'AMISTOSO' = body.tipo_partido === 'AMISTOSO' ? 'AMISTOSO' : 'LIGA';

    let golesFavor: number | null = null;
    let golesContra: number | null = null;

    if (jugado) {
      if (body.goles_favor !== undefined && body.goles_favor !== null && body.goles_favor !== '') {
        const gf = Number(body.goles_favor);
        if (isNaN(gf) || gf < 0 || !Number.isInteger(gf)) {
          return NextResponse.json(
            { success: false, error: 'El campo "goles_favor" debe ser un número entero mayor o igual a 0.' },
            { status: 400 }
          );
        }
        golesFavor = gf;
      }

      if (body.goles_contra !== undefined && body.goles_contra !== null && body.goles_contra !== '') {
        const gc = Number(body.goles_contra);
        if (isNaN(gc) || gc < 0 || !Number.isInteger(gc)) {
          return NextResponse.json(
            { success: false, error: 'El campo "goles_contra" debe ser un número entero mayor o igual a 0.' },
            { status: 400 }
          );
        }
        golesContra = gc;
      }
    }

    const payload: Record<string, unknown> = {
      jornada: rawJornada,
      rival: rawRival,
      fecha: rawFecha,
      es_local: esLocal,
      jugado,
      goles_favor: golesFavor,
      goles_contra: golesContra,
      tipo_partido: tipoPartido,
      competicion: typeof body.competicion === 'string' && body.competicion.trim()
        ? body.competicion.trim()
        : (tipoPartido === 'AMISTOSO' ? 'Amistoso' : 'Liga'),
      hora: typeof body.hora === 'string' && body.hora.trim() ? body.hora.trim() : null,
      campo: typeof body.campo === 'string' && body.campo.trim() ? body.campo.trim() : null,
      clasificacion_nota: typeof body.clasificacion_nota === 'string' && body.clasificacion_nota.trim()
        ? body.clasificacion_nota.trim()
        : null,
      analisis_resumen: typeof body.analisis_resumen === 'string' && body.analisis_resumen.trim()
        ? body.analisis_resumen.trim()
        : null,
      analisis_positivos: typeof body.analisis_positivos === 'string' && body.analisis_positivos.trim()
        ? body.analisis_positivos.trim()
        : null,
      analisis_mejorar: typeof body.analisis_mejorar === 'string' && body.analisis_mejorar.trim()
        ? body.analisis_mejorar.trim()
        : null,
      analisis_claves: typeof body.analisis_claves === 'string' && body.analisis_claves.trim()
        ? body.analisis_claves.trim()
        : null,
      analisis_conclusiones: typeof body.analisis_conclusiones === 'string' && body.analisis_conclusiones.trim()
        ? body.analisis_conclusiones.trim()
        : null,
    };

    // 6. Inserción en Supabase Server
    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('matches')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: `El número de jornada ${rawJornada} ya está en uso.` },
          { status: 409 }
        );
      }
      console.error('[API /api/matches POST] Error en inserción:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API /api/matches POST] Excepción interna:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
