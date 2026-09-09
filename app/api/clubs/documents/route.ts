import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint server-side para eliminación segura de club_documents.
 * Protegido por coach_staff_session.
 */
export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión requerida.' }, { status: 401 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.id === 'string') {
        id = body.id;
      }
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'id es obligatorio para eliminar documento.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('club_documents')
      .delete()
      .eq('id', id.trim())
      .select('id');

    if (error) {
      console.error('[API/clubs/documents] Error borrando documento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id.trim() }, { status: 200 });
  } catch (err) {
    console.error('[API/clubs/documents] Excepción interna en DELETE:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno.' }, { status: 500 });
  }
}
