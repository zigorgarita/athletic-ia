import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { isEditorSessionAuthorized, isEditorSessionAuthorizedFromRequest } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
    const isPasskeyValid = Boolean(expectedPasskey && passkeyHeader && passkeyHeader === expectedPasskey);
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req) ||
      isPasskeyValid;

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id')?.trim();

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object' && typeof body.id === 'string') {
        id = body.id.trim();
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido para eliminación.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();

    const { error: deleteError } = await supabaseServer
      .from('planning_task_library')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API /api/planificacion/library DELETE] Error:', deleteError);
      return NextResponse.json({ error: `Error eliminando tarea de biblioteca: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/planificacion/library DELETE] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
