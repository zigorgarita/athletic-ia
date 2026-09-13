import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
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

    // 3. Validar cuerpo
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    const { video_url, tipo_origen, nombre_descriptivo } = body;

    if (!video_url || typeof video_url !== 'string' || !video_url.trim()) {
      return NextResponse.json(
        { error: 'El campo video_url es obligatorio para actualizar el vídeo.' },
        { status: 400 }
      );
    }

    const updates: {
      video_url: string;
      tipo_origen?: 'Archivo' | 'Enlace';
      nombre_descriptivo?: string | null;
    } = {
      video_url: video_url.trim(),
    };

    if (tipo_origen === 'Archivo' || tipo_origen === 'Enlace') {
      updates.tipo_origen = tipo_origen;
    }

    if (nombre_descriptivo !== undefined) {
      updates.nombre_descriptivo = typeof nombre_descriptivo === 'string' && nombre_descriptivo.trim()
        ? nombre_descriptivo.trim()
        : null;
    }

    // 4. Actualizar registro verificando match_id y id simultáneamente
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_full_videos')
      .update(updates)
      .eq('id', videoId)
      .eq('match_id', matchId)
      .select()
      .single();

    if (error) {
      console.error('[API /api/matches/[id]/videos/full/[videoId] PATCH] Error BD:', error);
      return NextResponse.json(
        { error: `Error al actualizar vídeo completo en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Vídeo no encontrado o no pertenece a este partido.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/full/[videoId] PATCH] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar el vídeo completo.' },
      { status: 500 }
    );
  }
}

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
      .from('match_full_videos')
      .delete()
      .eq('id', videoId)
      .eq('match_id', matchId)
      .select('id');

    if (error) {
      console.error('[API /api/matches/[id]/videos/full/[videoId] DELETE] Error BD:', error);
      return NextResponse.json(
        { error: `Error al eliminar vídeo completo en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Vídeo no encontrado o no pertenece a este partido.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: videoId });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/full/[videoId] DELETE] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el vídeo completo.' },
      { status: 500 }
    );
  }
}
