import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeKnowledgeEntryPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.titulo === 'string') payload.titulo = data.titulo.trim();
  if (typeof data.categoria === 'string') payload.categoria = data.categoria.trim();
  if (data.fase_juego !== undefined) payload.fase_juego = typeof data.fase_juego === 'string' && data.fase_juego.trim() ? data.fase_juego.trim() : null;
  if (data.sistema_asociado !== undefined) payload.sistema_asociado = typeof data.sistema_asociado === 'string' && data.sistema_asociado.trim() ? data.sistema_asociado.trim() : null;
  if (data.posicion_asociada !== undefined) payload.posicion_asociada = typeof data.posicion_asociada === 'string' && data.posicion_asociada.trim() ? data.posicion_asociada.trim() : null;
  if (data.principio_clave !== undefined) payload.principio_clave = typeof data.principio_clave === 'string' && data.principio_clave.trim() ? data.principio_clave.trim() : null;
  if (typeof data.descripcion === 'string') payload.descripcion = data.descripcion;
  if (data.instrucciones_linea !== undefined) payload.instrucciones_linea = data.instrucciones_linea && typeof data.instrucciones_linea === 'object' ? data.instrucciones_linea : null;
  if (data.variantes !== undefined) payload.variantes = typeof data.variantes === 'string' && data.variantes.trim() ? data.variantes.trim() : null;
  if (data.consignas !== undefined) payload.consignas = Array.isArray(data.consignas) ? data.consignas : null;
  if (data.metadata !== undefined) payload.metadata = typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {};
  if (typeof data.creado_por === 'string') payload.creado_por = data.creado_por.trim();
  if (typeof data.temporada === 'string') payload.temporada = data.temporada.trim();
  if (typeof data.activo === 'boolean') payload.activo = data.activo;

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

    if (!body.titulo || !body.categoria) {
      return NextResponse.json({ error: 'Título y categoría son obligatorios.' }, { status: 400 });
    }

    const sanitized = sanitizeKnowledgeEntryPayload(body);
    if (body.id && typeof body.id === 'string') {
      sanitized.id = body.id.trim();
    }
    sanitized.updated_at = new Date().toISOString();

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('knowledge_entries')
      .insert(sanitized)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/knowledge/entries POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/entries POST] Excepción:', err);
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
      return NextResponse.json({ error: 'Se requiere ID de la entrada válido.' }, { status: 400 });
    }

    const entryId = String(body.id).trim();
    const sanitized = sanitizeKnowledgeEntryPayload(body);
    sanitized.updated_at = new Date().toISOString();

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('knowledge_entries')
      .update(sanitized)
      .eq('id', entryId)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/knowledge/entries PUT] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/entries PUT] Excepción:', err);
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
    let entryId = searchParams.get('id');

    if (!entryId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        entryId = String(body.id);
      }
    }

    if (!entryId) {
      return NextResponse.json({ error: 'Se requiere ID de la entrada a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('knowledge_entries')
      .delete()
      .eq('id', entryId.trim());

    if (error) {
      console.error('[API /api/knowledge/entries DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: entryId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/entries DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
