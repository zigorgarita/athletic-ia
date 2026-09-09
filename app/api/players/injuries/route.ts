import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_INFORMADO_POR = ['Entrenador', 'Segundo entrenador', 'Preparador físico', 'Fisio', 'Jugador'] as const;
const VALID_ESTADOS = ['Activa', 'En recuperación', 'Alta médica', 'Recaída'] as const;

/**
 * Endpoint de mutación exclusivo para lesiones de jugadores (player_injuries).
 * Protegido server-side por la cookie coach_staff_session.
 */

// POST /api/players/injuries -> Registrar nueva lesión
export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const {
      player_id,
      fecha_lesion,
      tipo_lesion,
      diagnostico,
      informado_por,
      estado,
      fecha_prevista_recuperacion,
      fecha_real_recuperacion,
      observaciones,
      zona_afectada,
      tratamiento
    } = body;

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return NextResponse.json({ error: 'player_id es obligatorio.' }, { status: 400 });
    }
    if (!fecha_lesion || typeof fecha_lesion !== 'string' || fecha_lesion.trim().length === 0) {
      return NextResponse.json({ error: 'fecha_lesion es obligatoria.' }, { status: 400 });
    }
    if (!tipo_lesion || typeof tipo_lesion !== 'string' || tipo_lesion.trim().length === 0) {
      return NextResponse.json({ error: 'tipo_lesion es obligatorio.' }, { status: 400 });
    }
    if (!diagnostico || typeof diagnostico !== 'string' || diagnostico.trim().length === 0) {
      return NextResponse.json({ error: 'diagnostico es obligatorio.' }, { status: 400 });
    }
    if (!informado_por || !(VALID_INFORMADO_POR as readonly string[]).includes(informado_por)) {
      return NextResponse.json(
        { error: `informado_por inválido. Debe ser uno de: ${VALID_INFORMADO_POR.join(', ')}` },
        { status: 400 }
      );
    }
    if (!estado || !(VALID_ESTADOS as readonly string[]).includes(estado)) {
      return NextResponse.json(
        { error: `estado inválido. Debe ser uno de: ${VALID_ESTADOS.join(', ')}` },
        { status: 400 }
      );
    }

    const sanitizedPayload: Record<string, unknown> = {
      player_id: player_id.trim(),
      fecha_lesion: fecha_lesion.trim(),
      tipo_lesion: tipo_lesion.trim(),
      diagnostico: diagnostico.trim(),
      informado_por,
      estado,
      fecha_prevista_recuperacion: typeof fecha_prevista_recuperacion === 'string' && fecha_prevista_recuperacion.trim().length > 0 ? fecha_prevista_recuperacion.trim() : null,
      fecha_real_recuperacion: typeof fecha_real_recuperacion === 'string' && fecha_real_recuperacion.trim().length > 0 ? fecha_real_recuperacion.trim() : null,
      observaciones: typeof observaciones === 'string' && observaciones.trim().length > 0 ? observaciones.trim() : null,
      zona_afectada: typeof zona_afectada === 'string' && zona_afectada.trim().length > 0 ? zona_afectada.trim() : null,
      tratamiento: typeof tratamiento === 'string' && tratamiento.trim().length > 0 ? tratamiento.trim() : null,
    };

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_injuries')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (error) {
      console.error('[API/injuries] Error insertando lesión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API/injuries] Excepción interna en POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/injuries -> Actualizar lesión existente (alta médica, fechas, estado)
export async function PATCH(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'id de la lesión es obligatorio.' }, { status: 400 });
    }

    const targetId = typeof body.id === 'string' ? body.id.trim() : null;
    if (!targetId) {
      return NextResponse.json({ error: 'id inválido.' }, { status: 400 });
    }

    const updatesObj = ((body.updates && typeof body.updates === 'object') ? body.updates : body) as Record<string, unknown>;
    const allowedUpdates: Record<string, unknown> = {};

    if (typeof updatesObj.fecha_lesion === 'string' && updatesObj.fecha_lesion.trim().length > 0) {
      allowedUpdates.fecha_lesion = updatesObj.fecha_lesion.trim();
    }
    if (typeof updatesObj.tipo_lesion === 'string' && updatesObj.tipo_lesion.trim().length > 0) {
      allowedUpdates.tipo_lesion = updatesObj.tipo_lesion.trim();
    }
    if (typeof updatesObj.diagnostico === 'string' && updatesObj.diagnostico.trim().length > 0) {
      allowedUpdates.diagnostico = updatesObj.diagnostico.trim();
    }
    if (typeof updatesObj.informado_por === 'string' && (VALID_INFORMADO_POR as readonly string[]).includes(updatesObj.informado_por)) {
      allowedUpdates.informado_por = updatesObj.informado_por;
    }
    if (typeof updatesObj.estado === 'string' && (VALID_ESTADOS as readonly string[]).includes(updatesObj.estado)) {
      allowedUpdates.estado = updatesObj.estado;
    }
    if ('fecha_prevista_recuperacion' in updatesObj) {
      allowedUpdates.fecha_prevista_recuperacion = typeof updatesObj.fecha_prevista_recuperacion === 'string' && updatesObj.fecha_prevista_recuperacion.trim().length > 0 ? updatesObj.fecha_prevista_recuperacion.trim() : null;
    }
    if ('fecha_real_recuperacion' in updatesObj) {
      allowedUpdates.fecha_real_recuperacion = typeof updatesObj.fecha_real_recuperacion === 'string' && updatesObj.fecha_real_recuperacion.trim().length > 0 ? updatesObj.fecha_real_recuperacion.trim() : null;
    }
    if ('observaciones' in updatesObj) {
      allowedUpdates.observaciones = typeof updatesObj.observaciones === 'string' && updatesObj.observaciones.trim().length > 0 ? updatesObj.observaciones.trim() : null;
    }
    if ('zona_afectada' in updatesObj) {
      allowedUpdates.zona_afectada = typeof updatesObj.zona_afectada === 'string' && updatesObj.zona_afectada.trim().length > 0 ? updatesObj.zona_afectada.trim() : null;
    }
    if ('tratamiento' in updatesObj) {
      allowedUpdates.tratamiento = typeof updatesObj.tratamiento === 'string' && updatesObj.tratamiento.trim().length > 0 ? updatesObj.tratamiento.trim() : null;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_injuries')
      .update(allowedUpdates)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      console.error('[API/injuries] Error actualizando lesión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error('[API/injuries] Excepción interna en PATCH:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/injuries -> Eliminar lesión existente
export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    let targetId = url.searchParams.get('id');

    if (!targetId) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object' && body.id) {
        targetId = String(body.id).trim();
      }
    }

    if (!targetId || targetId.trim().length === 0) {
      return NextResponse.json({ error: 'id es obligatorio para eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('player_injuries')
      .delete()
      .eq('id', targetId.trim());

    if (error) {
      console.error('[API/injuries] Error eliminando lesión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[API/injuries] Excepción interna en DELETE:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
