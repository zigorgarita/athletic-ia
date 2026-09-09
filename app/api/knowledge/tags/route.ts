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
    const tag = typeof body.tag === 'string' ? body.tag.trim() : null;

    if (!entryId || !tag) {
      return NextResponse.json({ error: 'knowledge_entry_id y tag son obligatorios.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('knowledge_tags')
      .upsert(
        { knowledge_entry_id: entryId, tag },
        { onConflict: 'knowledge_entry_id,tag' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/knowledge/tags POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/tags POST] Excepción:', err);
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
    let tagId = searchParams.get('id');

    if (!tagId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        tagId = String(body.id);
      }
    }

    if (!tagId) {
      return NextResponse.json({ error: 'Se requiere ID de la etiqueta a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('knowledge_tags')
      .delete()
      .eq('id', tagId.trim());

    if (error) {
      console.error('[API /api/knowledge/tags DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: tagId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/tags DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
