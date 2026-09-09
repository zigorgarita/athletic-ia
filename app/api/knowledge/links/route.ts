import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const entryId = typeof body.knowledge_entry_id === 'string' ? body.knowledge_entry_id.trim() : null;
    const entityType = typeof body.linked_entity_type === 'string' ? body.linked_entity_type.trim() : null;
    const entityId = typeof body.linked_entity_id === 'string' ? body.linked_entity_id.trim() : null;
    const relacion = typeof body.relacion === 'string' ? body.relacion.trim() : 'relacionado';
    const notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim() : null;

    if (!entryId || !entityType || !entityId) {
      return NextResponse.json({ error: 'knowledge_entry_id, linked_entity_type y linked_entity_id son obligatorios.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('knowledge_links')
      .upsert(
        {
          knowledge_entry_id: entryId,
          linked_entity_type: entityType,
          linked_entity_id: entityId,
          relacion,
          notas
        },
        { onConflict: 'knowledge_entry_id,linked_entity_type,linked_entity_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/knowledge/links POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/links POST] Excepción:', err);
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
    let linkId = searchParams.get('id');

    if (!linkId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        linkId = String(body.id);
      }
    }

    if (!linkId) {
      return NextResponse.json({ error: 'Se requiere ID del vínculo a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('knowledge_links')
      .delete()
      .eq('id', linkId.trim());

    if (error) {
      console.error('[API /api/knowledge/links DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: linkId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/links DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
