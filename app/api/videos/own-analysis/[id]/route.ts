import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
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

    const supabase = getSupabaseServerClient();

    // 3. Eliminar registro del vídeo de Análisis Propio
    // Las asociaciones en match_own_analysis_video_players se eliminan automáticamente mediante ON DELETE CASCADE
    const { error } = await supabase
      .from('match_own_analysis_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      return NextResponse.json(
        { error: `Error al eliminar el vídeo de análisis propio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Vídeo eliminado correctamente.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
