import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_CONTEXTOS = ['Entrenamiento', 'Partido', 'Otro'] as const;
const VALID_ESTADOS = ['Pendiente', 'Pagado'] as const;

/**
 * Endpoint de mutación exclusivo para multas de jugadores.
 * Protegido server-side por la cookie de sesión coach_staff_session.
 */

// POST /api/players/fines -> Crear nueva multa
export async function POST(req: Request) {
  try {
    const authorized = await isCoachSessionAuthorized();
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Cuerpo de petición inválido.' },
        { status: 400 }
      );
    }

    const {
      player_id,
      motivo,
      fecha,
      contexto,
      importe,
      cantidad,
      estado,
      evento_id,
      evento_nombre,
      observaciones
    } = body;

    // Validaciones estrictas de campos obligatorios
    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return NextResponse.json({ error: 'player_id es obligatorio.' }, { status: 400 });
    }
    if (!motivo || typeof motivo !== 'string' || motivo.trim().length === 0) {
      return NextResponse.json({ error: 'motivo es obligatorio.' }, { status: 400 });
    }
    if (!fecha || typeof fecha !== 'string' || isNaN(Date.parse(fecha))) {
      return NextResponse.json({ error: 'fecha válida es obligatoria.' }, { status: 400 });
    }
    if (!contexto || !VALID_CONTEXTOS.includes(contexto)) {
      return NextResponse.json(
        { error: `contexto inválido. Debe ser uno de: ${VALID_CONTEXTOS.join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof importe !== 'number' || isNaN(importe) || importe < 0) {
      return NextResponse.json({ error: 'importe debe ser un número mayor o igual a 0.' }, { status: 400 });
    }

    // Sanitización estricta: solo se admiten columnas de public.player_fines
    const sanitizedPayload: Record<string, string | number | null> = {
      player_id: player_id.trim(),
      motivo: motivo.trim(),
      fecha: fecha.trim(),
      contexto,
      importe,
      cantidad: typeof cantidad === 'number' && cantidad > 0 ? cantidad : 1,
      estado: estado && VALID_ESTADOS.includes(estado) ? estado : 'Pendiente',
      evento_id: typeof evento_id === 'string' && evento_id.trim().length > 0 ? evento_id.trim() : null,
      evento_nombre: typeof evento_nombre === 'string' && evento_nombre.trim().length > 0 ? evento_nombre.trim() : null,
      observaciones: typeof observaciones === 'string' && observaciones.trim().length > 0 ? observaciones.trim() : null,
    };

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_fines')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (error) {
      console.error('[API/fines] Error insertando multa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('[API/fines] Excepción interna en POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/fines -> Actualizar multa existente (estado pagada, importe, etc.)
export async function PATCH(req: Request) {
  try {
    const authorized = await isCoachSessionAuthorized();
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Sesión de cuerpo técnico requerida.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json(
        { error: 'id de la multa es obligatorio para actualizar.' },
        { status: 400 }
      );
    }

    const { id, updates } = body;
    const targetId = typeof id === 'string' ? id.trim() : null;
    if (!targetId) {
      return NextResponse.json({ error: 'id inválido.' }, { status: 400 });
    }

    const updatesObj = ((updates && typeof updates === 'object') ? updates : body) as Record<string, unknown>;
    const allowedUpdates: Record<string, string | number | null> = {};

    if (typeof updatesObj.motivo === 'string' && updatesObj.motivo.trim().length > 0) {
      allowedUpdates.motivo = updatesObj.motivo.trim();
    }
    if (typeof updatesObj.fecha === 'string' && !isNaN(Date.parse(updatesObj.fecha))) {
      allowedUpdates.fecha = updatesObj.fecha.trim();
    }
    if (typeof updatesObj.contexto === 'string' && (VALID_CONTEXTOS as readonly string[]).includes(updatesObj.contexto)) {
      allowedUpdates.contexto = updatesObj.contexto;
    }
    if (typeof updatesObj.importe === 'number' && !isNaN(updatesObj.importe) && updatesObj.importe >= 0) {
      allowedUpdates.importe = updatesObj.importe;
    }
    if (typeof updatesObj.cantidad === 'number' && updatesObj.cantidad > 0) {
      allowedUpdates.cantidad = updatesObj.cantidad;
    }
    if (typeof updatesObj.estado === 'string' && (VALID_ESTADOS as readonly string[]).includes(updatesObj.estado)) {
      allowedUpdates.estado = updatesObj.estado;
    }
    if ('evento_id' in updatesObj) {
      allowedUpdates.evento_id = typeof updatesObj.evento_id === 'string' ? updatesObj.evento_id : null;
    }
    if ('evento_nombre' in updatesObj) {
      allowedUpdates.evento_nombre = typeof updatesObj.evento_nombre === 'string' ? updatesObj.evento_nombre : null;
    }
    if ('observaciones' in updatesObj) {
      allowedUpdates.observaciones = typeof updatesObj.observaciones === 'string' ? updatesObj.observaciones : null;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('player_fines')
      .update(allowedUpdates)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      console.error('[API/fines] Error actualizando multa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error('[API/fines] Excepción interna en PATCH:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/fines -> Eliminar multa existente
export async function DELETE(req: Request) {
  try {
    const authorized = await isCoachSessionAuthorized();
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
      .from('player_fines')
      .delete()
      .eq('id', targetId.trim());

    if (error) {
      console.error('[API/fines] Error eliminando multa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[API/fines] Excepción interna en DELETE:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
