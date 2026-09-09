import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeKnowledgeMediaPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.knowledge_entry_id === 'string') payload.knowledge_entry_id = data.knowledge_entry_id.trim();
  if (typeof data.tipo_media === 'string') payload.tipo_media = data.tipo_media.trim();
  if (data.titulo !== undefined) payload.titulo = typeof data.titulo === 'string' && data.titulo.trim() ? data.titulo.trim() : null;
  if (typeof data.url === 'string') payload.url = data.url.trim();
  if (typeof data.tipo_origen === 'string') payload.tipo_origen = data.tipo_origen.trim();
  if (data.descripcion !== undefined) payload.descripcion = typeof data.descripcion === 'string' && data.descripcion.trim() ? data.descripcion.trim() : null;
  if (data.orden !== undefined && data.orden !== null) payload.orden = Number(data.orden);
  if (data.metadata !== undefined && typeof data.metadata === 'object' && data.metadata !== null) payload.metadata = data.metadata;

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

    if (!body.knowledge_entry_id || !body.url || !body.tipo_media) {
      return NextResponse.json({ error: 'knowledge_entry_id, url y tipo_media son obligatorios.' }, { status: 400 });
    }

    const sanitized = sanitizeKnowledgeMediaPayload(body);
    if (body.id && typeof body.id === 'string') {
      sanitized.id = body.id.trim();
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('knowledge_media')
      .insert(sanitized)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/knowledge/media POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/media POST] Excepción:', err);
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
    let mediaId = searchParams.get('id');

    if (!mediaId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        mediaId = String(body.id);
      }
    }

    if (!mediaId) {
      return NextResponse.json({ error: 'Se requiere ID del recurso multimedia a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('knowledge_media')
      .delete()
      .eq('id', mediaId.trim());

    if (error) {
      console.error('[API /api/knowledge/media DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: mediaId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/media DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
