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

    // 2. Resolver y validar match_id desde los parámetros de la URL
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: `ID de partido inválido (UUID requerido): '${matchId}'` },
        { status: 400 }
      );
    }

    // 3. Extraer y validar cuerpo de la petición
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Cuerpo de petición inválido (debe ser un objeto JSON).' },
        { status: 400 }
      );
    }

    const {
      nombre_documento,
      tipo_documento,
      tipo_origen,
      url_storage,
      fecha,
      comentario,
    } = body;

    // 4. Validar campos requeridos y tipos permitidos
    if (!nombre_documento || typeof nombre_documento !== 'string' || !nombre_documento.trim()) {
      return NextResponse.json(
        { error: 'El campo nombre_documento es obligatorio.' },
        { status: 400 }
      );
    }

    if (!tipo_documento || typeof tipo_documento !== 'string' || !tipo_documento.trim()) {
      return NextResponse.json(
        { error: 'El campo tipo_documento es obligatorio.' },
        { status: 400 }
      );
    }

    if (!url_storage || typeof url_storage !== 'string' || !url_storage.trim()) {
      return NextResponse.json(
        { error: 'El campo url_storage es obligatorio.' },
        { status: 400 }
      );
    }

    const validTipoOrigen = tipo_origen === 'Enlace' ? 'Enlace' : 'Archivo';

    // 5. Construir payload para inserción en match_documents
    const payload: {
      match_id: string;
      nombre_documento: string;
      tipo_documento: string;
      tipo_origen: 'Archivo' | 'Enlace';
      url_storage: string;
      comentario: string | null;
      fecha?: string;
    } = {
      match_id: matchId,
      nombre_documento: nombre_documento.trim(),
      tipo_documento: tipo_documento.trim(),
      tipo_origen: validTipoOrigen,
      url_storage: url_storage.trim(),
      comentario: comentario && typeof comentario === 'string' && comentario.trim() ? comentario.trim() : null,
    };

    if (fecha && typeof fecha === 'string' && fecha.trim()) {
      payload.fecha = fecha.trim();
    }

    // 6. Inserción mediante cliente server-side con rol de servicio
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_documents')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[API /api/matches/[id]/documents POST] Error en BD:', error);
      return NextResponse.json(
        { error: `Error al guardar documento en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/documents POST] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el documento.' },
      { status: 500 }
    );
  }
}
