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
    // 1. Autorización central staff
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Validar parámetros desde la URL
    const resolvedParams = await params;
    const playerId = resolvedParams?.id?.trim();
    const videoId = resolvedParams?.videoId?.trim();

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return NextResponse.json(
        { error: `ID de jugador inválido (UUID requerido): '${playerId}'` },
        { status: 400 }
      );
    }

    if (!videoId || !UUID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: `ID de vídeo inválido (UUID requerido): '${videoId}'` },
        { status: 400 }
      );
    }

    // 3. Eliminar EXCLUSIVAMENTE la asociación de ese jugador en player_video_targets
    // NO se borra player_videos, ni el archivo en Drive, ni asociaciones de otros jugadores
    const supabase = getSupabaseServerClient();
    const { error: deleteError } = await supabase
      .from('player_video_targets')
      .delete()
      .eq('video_id', videoId)
      .eq('player_id', playerId);

    if (deleteError) {
      console.error('Error deleting from player_video_targets:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Error al desvincular el vídeo del jugador.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('Unexpected error in DELETE /api/players/[id]/videos/[videoId]:', err);
    return NextResponse.json(
      { error: `Error interno del servidor: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
