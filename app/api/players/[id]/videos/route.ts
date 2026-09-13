import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = ['Enlace', 'Archivo'] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    // 2. Validar ID de jugador principal desde la URL
    const resolvedParams = await params;
    const playerId = resolvedParams?.id?.trim();

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return NextResponse.json(
        { error: `ID de jugador principal inválido (UUID requerido): '${playerId}'` },
        { status: 400 }
      );
    }

    // 3. Validar cuerpo JSON
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    const {
      titulo,
      categoria,
      comentario_tecnico,
      video_url,
      drive_file_id,
      tipo_origen,
      tamano_bytes,
      secondary_player_ids,
    } = body;

    // 4. Validar título
    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      return NextResponse.json(
        { error: 'El campo titulo es obligatorio y debe ser un texto no vacío.' },
        { status: 400 }
      );
    }

    // 5. Validar tipo_origen
    if (!tipo_origen || !ALLOWED_ORIGINS.includes(tipo_origen)) {
      return NextResponse.json(
        { error: `tipo_origen inválido. Valores permitidos: ${ALLOWED_ORIGINS.join(', ')}` },
        { status: 400 }
      );
    }

    // 6. Validar presencia de video_url o drive_file_id
    const cleanUrl = typeof video_url === 'string' && video_url.trim() ? video_url.trim() : null;
    const cleanDriveId = typeof drive_file_id === 'string' && drive_file_id.trim() ? drive_file_id.trim() : null;

    if (!cleanUrl && !cleanDriveId) {
      return NextResponse.json(
        { error: 'Debe proporcionarse al menos un enlace (video_url) o un identificador de Google Drive (drive_file_id).' },
        { status: 400 }
      );
    }

    // 7. Validar secondary_player_ids si se proporciona
    let cleanSecondaries: string[] = [];
    if (secondary_player_ids !== undefined && secondary_player_ids !== null) {
      if (!Array.isArray(secondary_player_ids)) {
        return NextResponse.json(
          { error: 'secondary_player_ids debe ser un array de UUIDs.' },
          { status: 400 }
        );
      }

      for (const sId of secondary_player_ids) {
        if (typeof sId !== 'string' || !UUID_REGEX.test(sId.trim())) {
          return NextResponse.json(
            { error: `Elemento inválido en secondary_player_ids (UUID requerido): '${sId}'` },
            { status: 400 }
          );
        }
      }

      // Deduplicar y excluir al jugador principal
      cleanSecondaries = Array.from(
        new Set(secondary_player_ids.map((id: string) => id.trim()).filter((id: string) => id !== playerId))
      );
    }

    // 8. Llamar al RPC atómico en Supabase server-side
    const supabase = getSupabaseServerClient();
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_player_video_with_targets', {
      p_titulo: titulo.trim(),
      p_categoria: typeof categoria === 'string' && categoria.trim() ? categoria.trim() : 'Seguimiento Individual',
      p_comentario_tecnico: typeof comentario_tecnico === 'string' && comentario_tecnico.trim() ? comentario_tecnico.trim() : null,
      p_video_url: cleanUrl,
      p_drive_file_id: cleanDriveId,
      p_tipo_origen: tipo_origen,
      p_tamano_bytes: typeof tamano_bytes === 'number' && Number.isFinite(tamano_bytes) ? Math.floor(tamano_bytes) : null,
      p_primary_player_id: playerId,
      p_secondary_player_ids: cleanSecondaries,
    });

    if (rpcError) {
      console.error('Error invoking create_player_video_with_targets RPC:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Error al crear el vídeo individual y asociar jugadores.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: rpcResult,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Unexpected error in POST /api/players/[id]/videos:', err);
    return NextResponse.json(
      { error: `Error interno del servidor: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
