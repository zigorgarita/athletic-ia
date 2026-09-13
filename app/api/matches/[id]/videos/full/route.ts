import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TIPOS_VIDEO = ['Completo', 'Primera Parte', 'Segunda Parte'] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    // 2. Resolver y validar match_id desde URL
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: `ID de partido inválido (UUID requerido): '${matchId}'` },
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

    const { tipo_video, tipo_origen, video_url, nombre_descriptivo } = body;

    if (!tipo_video || !ALLOWED_TIPOS_VIDEO.includes(tipo_video)) {
      return NextResponse.json(
        { error: `tipo_video inválido. Valores permitidos: ${ALLOWED_TIPOS_VIDEO.join(', ')}` },
        { status: 400 }
      );
    }

    if (!video_url || typeof video_url !== 'string' || !video_url.trim()) {
      return NextResponse.json(
        { error: 'El campo video_url es obligatorio.' },
        { status: 400 }
      );
    }

    const validTipoOrigen = tipo_origen === 'Archivo' ? 'Archivo' : 'Enlace';

    const payload: {
      match_id: string;
      tipo_video: string;
      tipo_origen: 'Archivo' | 'Enlace';
      video_url: string;
      nombre_descriptivo?: string | null;
    } = {
      match_id: matchId,
      tipo_video,
      tipo_origen: validTipoOrigen,
      video_url: video_url.trim(),
      nombre_descriptivo: nombre_descriptivo && typeof nombre_descriptivo === 'string' && nombre_descriptivo.trim()
        ? nombre_descriptivo.trim()
        : null,
    };

    // 4. Inserción server-side con service_role
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_full_videos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[API /api/matches/[id]/videos/full POST] Error BD:', error);
      return NextResponse.json(
        { error: `Error al guardar vídeo completo en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/full POST] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el vídeo completo.' },
      { status: 500 }
    );
  }
}
