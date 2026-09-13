import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; clipId: string }> | { id: string; clipId: string } }
) {
  try {
    // 1. Autorización mediante sesión central staff
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Validar UUIDs
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();
    const clipId = resolvedParams?.clipId?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: `ID de partido inválido (UUID requerido): '${matchId}'` },
        { status: 400 }
      );
    }

    if (!clipId || !UUID_REGEX.test(clipId)) {
      return NextResponse.json(
        { error: `ID de corte inválido (UUID requerido): '${clipId}'` },
        { status: 400 }
      );
    }

    // 3. Eliminar registro verificando match_id y id simultáneamente
    // NOTA: NO elimina archivos físicos en Drive/Storage (comportamiento conservador existente)
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_video_clips')
      .delete()
      .eq('id', clipId)
      .eq('match_id', matchId)
      .select('id');

    if (error) {
      console.error('[API /api/matches/[id]/videos/clips/[clipId] DELETE] Error BD:', error);
      return NextResponse.json(
        { error: `Error al eliminar corte de vídeo en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Corte de vídeo no encontrado o no pertenece a este partido.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: clipId });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/clips/[clipId] DELETE] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el corte de vídeo.' },
      { status: 500 }
    );
  }
}
