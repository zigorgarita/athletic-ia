import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ETIQUETAS = ['Delanteros', 'Centrales', 'Pivotes', 'Individual', 'Otros'] as const;

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

    // 2. Validar matchId desde URL
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

    const {
      etiqueta,
      titulo,
      tipo_origen,
      video_url,
    } = body;

    if (!etiqueta || !ALLOWED_ETIQUETAS.includes(etiqueta)) {
      return NextResponse.json(
        { error: `etiqueta inválida. Valores permitidos: ${ALLOWED_ETIQUETAS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      return NextResponse.json(
        { error: 'El campo titulo es obligatorio.' },
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

    const payload = {
      match_id: matchId,
      etiqueta,
      titulo: titulo.trim(),
      tipo_origen: validTipoOrigen,
      video_url: video_url.trim(),
    };

    // 4. Inserción server-side con service_role
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_custom_videos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[API /api/matches/[id]/videos/custom POST] Error BD:', error);
      return NextResponse.json(
        { error: `Error al guardar vídeo de staff en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/videos/custom POST] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el vídeo de staff.' },
      { status: 500 }
    );
  }
}
