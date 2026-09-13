import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> | { id: string; playerId: string } }
) {
  try {
    // 1. Validar autenticación de staff mediante sesión central
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Resolver y validar UUIDs
    const resolvedParams = await params;
    const videoId = resolvedParams?.id?.trim();
    const playerId = resolvedParams?.playerId?.trim();

    if (!videoId || !UUID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: `ID de vídeo inválido: '${videoId}'` },
        { status: 400 }
      );
    }

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return NextResponse.json(
        { error: `ID de jugador inválido: '${playerId}'` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 3. Obtener jugadores actualmente asignados a este vídeo
    const { data: currentRows, error: fetchErr } = await supabase
      .from('match_own_analysis_video_players')
      .select('player_id')
      .eq('video_id', videoId);

    if (fetchErr) {
      return NextResponse.json(
        { error: `Error al consultar asignaciones actuales: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    const remainingPlayerIds = (currentRows || [])
      .map((r) => r.player_id)
      .filter((pid) => pid !== playerId);

    // 4. Sincronizar atómicamente mediante el RPC oficial
    const { data, error } = await supabase.rpc('sync_match_own_analysis_video_players', {
      p_video_id: videoId,
      p_player_ids: remainingPlayerIds,
    });

    if (error) {
      return NextResponse.json(
        { error: `Error al desvincular jugador del vídeo: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
