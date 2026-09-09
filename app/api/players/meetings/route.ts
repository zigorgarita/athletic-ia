import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SOLICITADA_POR = ['Jugador', 'Staff'] as const;
const VALID_ESTADOS = ['Pendiente', 'En seguimiento', 'Resuelta'] as const;

/**
 * Endpoint de mutación exclusivo para reuniones de jugadores (player_meetings).
 * Protegido server-side por la cookie coach_staff_session.
 */

// POST /api/players/meetings -> Crear nueva reunión
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
      fecha,
      solicitada_por,
      motivo,
      desarrollo,
      resolucion,
      estado,
      participantes,
      adjuntos,
      firma_url,
      seguimiento_notas,
      recordatorio_fecha,
      metadata
    } = body;

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return NextResponse.json({ error: 'player_id es obligatorio.' }, { status: 400 });
    }
    if (!fecha || typeof fecha !== 'string' || fecha.trim().length === 0) {
      return NextResponse.json({ error: 'fecha es obligatoria.' }, { status: 400 });
    }
    if (!solicitada_por || !(VALID_SOLICITADA_POR as readonly string[]).includes(solicitada_por)) {
      return NextResponse.json(
        { error: `solicitada_por inválido. Debe ser uno de: ${VALID_SOLICITADA_POR.join(', ')}` },
        { status: 400 }
      );
    }
    if (!motivo || typeof motivo !== 'string' || motivo.trim().length === 0) {
      return NextResponse.json({ error: 'motivo es obligatorio.' }, { status: 400 });
    }

    const sanitizedPayload: Record<string, unknown> = {
      player_id: player_id.trim(),
      fecha: fecha.trim(),
      solicitada_por,
      motivo: motivo.trim(),
      desarrollo: typeof desarrollo === 'string' && desarrollo.trim().length > 0 ? desarrollo.trim() : null,
      resolucion: typeof resolucion === 'string' && resolucion.trim().length > 0 ? resolucion.trim() : null,
      estado: estado && (VALID_ESTADOS as readonly string[]).includes(estado) ? estado : 'Pendiente',
      participantes: Array.isArray(participantes) ? participantes : [],
      adjuntos: Array.isArray(adjuntos) ? adjuntos : [],
      firma_url: typeof firma_url === 'string' && firma_url.trim().length > 0 ? firma_url.trim() : null,
      seguimiento_notas: typeof seguimiento_notas === 'string' && seguimiento_notas.trim().length > 0 ? seguimiento_notas.trim() : null,
      recordatorio_fecha: typeof recordatorio_fecha === 'string' && recordatorio_fecha.trim().length > 0 ? recordatorio_fecha.trim() : null,
      metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    };

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_meetings')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (error) {
      console.error('[API/meetings] Error insertando reunión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API/meetings] Excepción interna en POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/meetings -> Actualizar reunión existente
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
      return NextResponse.json({ error: 'id de la reunión es obligatorio.' }, { status: 400 });
    }

    const targetId = typeof body.id === 'string' ? body.id.trim() : null;
    if (!targetId) {
      return NextResponse.json({ error: 'id inválido.' }, { status: 400 });
    }

    const updatesObj = ((body.updates && typeof body.updates === 'object') ? body.updates : body) as Record<string, unknown>;
    const allowedUpdates: Record<string, unknown> = {};

    if (typeof updatesObj.fecha === 'string' && updatesObj.fecha.trim().length > 0) {
      allowedUpdates.fecha = updatesObj.fecha.trim();
    }
    if (typeof updatesObj.solicitada_por === 'string' && (VALID_SOLICITADA_POR as readonly string[]).includes(updatesObj.solicitada_por)) {
      allowedUpdates.solicitada_por = updatesObj.solicitada_por;
    }
    if (typeof updatesObj.motivo === 'string' && updatesObj.motivo.trim().length > 0) {
      allowedUpdates.motivo = updatesObj.motivo.trim();
    }
    if ('desarrollo' in updatesObj) {
      allowedUpdates.desarrollo = typeof updatesObj.desarrollo === 'string' && updatesObj.desarrollo.trim().length > 0 ? updatesObj.desarrollo.trim() : null;
    }
    if ('resolucion' in updatesObj) {
      allowedUpdates.resolucion = typeof updatesObj.resolucion === 'string' && updatesObj.resolucion.trim().length > 0 ? updatesObj.resolucion.trim() : null;
    }
    if (typeof updatesObj.estado === 'string' && (VALID_ESTADOS as readonly string[]).includes(updatesObj.estado)) {
      allowedUpdates.estado = updatesObj.estado;
    }
    if ('participantes' in updatesObj && Array.isArray(updatesObj.participantes)) {
      allowedUpdates.participantes = updatesObj.participantes;
    }
    if ('adjuntos' in updatesObj && Array.isArray(updatesObj.adjuntos)) {
      allowedUpdates.adjuntos = updatesObj.adjuntos;
    }
    if ('firma_url' in updatesObj) {
      allowedUpdates.firma_url = typeof updatesObj.firma_url === 'string' && updatesObj.firma_url.trim().length > 0 ? updatesObj.firma_url.trim() : null;
    }
    if ('seguimiento_notas' in updatesObj) {
      allowedUpdates.seguimiento_notas = typeof updatesObj.seguimiento_notas === 'string' && updatesObj.seguimiento_notas.trim().length > 0 ? updatesObj.seguimiento_notas.trim() : null;
    }
    if ('recordatorio_fecha' in updatesObj) {
      allowedUpdates.recordatorio_fecha = typeof updatesObj.recordatorio_fecha === 'string' && updatesObj.recordatorio_fecha.trim().length > 0 ? updatesObj.recordatorio_fecha.trim() : null;
    }
    if ('metadata' in updatesObj && updatesObj.metadata && typeof updatesObj.metadata === 'object' && !Array.isArray(updatesObj.metadata)) {
      allowedUpdates.metadata = updatesObj.metadata;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_meetings')
      .update(allowedUpdates)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      console.error('[API/meetings] Error actualizando reunión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error('[API/meetings] Excepción interna en PATCH:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/meetings -> Eliminar reunión existente
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
      .from('player_meetings')
      .delete()
      .eq('id', targetId.trim());

    if (error) {
      console.error('[API/meetings] Error eliminando reunión:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[API/meetings] Excepción interna en DELETE:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
