import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    // 2. Resolver y validar UUID del vídeo
    const resolvedParams = await params;
    const videoId = resolvedParams?.id?.trim();

    if (!videoId || !UUID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: `ID de vídeo inválido (UUID requerido): '${videoId}'` },
        { status: 400 }
      );
    }

    // 3. Extraer y validar el cuerpo de la petición
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('player_ids' in body) || !Array.isArray(body.player_ids)) {
      return NextResponse.json(
        { error: 'Parámetro player_ids inválido (debe ser un array de UUIDs).' },
        { status: 400 }
      );
    }

    const playerIds = body.player_ids as unknown[];

    // 4. Validar fail-closed estricto para cada elemento del array
    for (const pid of playerIds) {
      if (typeof pid !== 'string' || !UUID_REGEX.test(pid.trim())) {
        return NextResponse.json(
          { error: `Elemento de player_ids inválido o nulo: '${pid}' (se requiere UUID válido).` },
          { status: 400 }
        );
      }
    }

    const cleanPlayerIds = playerIds.map((p) => (p as string).trim());

    // 5. Invocación atómica al RPC sync_match_own_analysis_video_players mediante service_role
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('sync_match_own_analysis_video_players', {
      p_video_id: videoId,
      p_player_ids: cleanPlayerIds,
    });

    if (error) {
      return NextResponse.json(
        { error: `Error en la sincronización de jugadores: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
