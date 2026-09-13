import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación de staff mediante sesión central
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Extraer y validar cuerpo de la petición
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    const {
      match_id,
      categoria,
      titulo,
      video_url,
      drive_file_id,
      tipo_origen,
      tamano_bytes,
    } = body;

    // 3. Validar campos requeridos
    if (!match_id || typeof match_id !== 'string' || !UUID_REGEX.test(match_id)) {
      return NextResponse.json(
        { error: 'match_id inválido o ausente (se requiere UUID válido).' },
        { status: 400 }
      );
    }

    if (!categoria || typeof categoria !== 'string' || !categoria.trim()) {
      return NextResponse.json(
        { error: 'categoria es obligatoria.' },
        { status: 400 }
      );
    }

    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      return NextResponse.json(
        { error: 'titulo es obligatorio.' },
        { status: 400 }
      );
    }

    if (!video_url && !drive_file_id) {
      return NextResponse.json(
        { error: 'Se requiere al menos video_url o drive_file_id.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 4. Verificar existencia del partido
    const { data: matchData, error: matchErr } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match_id)
      .maybeSingle();

    if (!matchErr && !matchData) {
      return NextResponse.json(
        { error: `Partido con id '${match_id}' no encontrado.` },
        { status: 404 }
      );
    }

    // 5. Whitelist e inserción estricta en match_own_analysis_videos
    // Columnas exactas en base de datos: match_id, categoria, titulo, video_url, drive_file_id, tipo_origen, tamano_bytes
    const payload = {
      match_id,
      categoria: categoria.trim(),
      titulo: titulo.trim(),
      video_url: typeof video_url === 'string' && video_url.trim() ? video_url.trim() : null,
      drive_file_id: typeof drive_file_id === 'string' && drive_file_id.trim() ? drive_file_id.trim() : null,
      tipo_origen: tipo_origen === 'Archivo' ? 'Archivo' : 'Enlace',
      tamano_bytes: typeof tamano_bytes === 'number' ? tamano_bytes : null,
    };

    const { data, error } = await supabase
      .from('match_own_analysis_videos')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Error al crear vídeo de análisis propio: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
