import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; videoId: string }> | { id: string; videoId: string } }
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
    const videoId = resolvedParams?.videoId?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: `ID de partido inválido (UUID requerido): '${matchId}'` },
        { status: 400 }
      );
    }

    if (!videoId || !UUID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: `ID de vídeo inválido (UUID requerido): '${videoId}'` },
        { status: 400 }
      );
    }

    // 3. Eliminar registro verificando match_id y id simultáneamente
    // NOTA: NO elimina archivos físicos en Drive/Storage (comportamiento conservador existente)
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_custom_videos')
      .delete()
      .eq('id', videoId)
      .eq('match_id', matchId)
      .select('id');

    if (error) {
      console.error('[API /api/matches/[id]/videos/custom/[videoId] DELETE] Error BD:', error);
      return NextResponse.json(
        { error: `Error al eliminar vídeo de staff en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Vídeo de staff no encontrado o no pertenece a este partido.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: videoId });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/custom/[videoId] DELETE] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el vídeo de staff.' },
      { status: 500 }
    );
  }
}
