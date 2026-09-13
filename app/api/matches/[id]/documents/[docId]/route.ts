import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> | { id: string; docId: string } }
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

    // 2. Resolver y validar UUIDs de partido y documento
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();
    const docId = resolvedParams?.docId?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: `ID de partido inválido (UUID requerido): '${matchId}'` },
        { status: 400 }
      );
    }

    if (!docId || !UUID_REGEX.test(docId)) {
      return NextResponse.json(
        { error: `ID de documento inválido (UUID requerido): '${docId}'` },
        { status: 400 }
      );
    }

    // 3. Eliminar exclusivamente de match_documents cuando coincidan id = docId Y match_id = matchId
    // NOTA: No se elimina el archivo físico en Google Drive ni Supabase Storage (comportamiento conservador existente)
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('match_documents')
      .delete()
      .eq('id', docId)
      .eq('match_id', matchId)
      .select('id');

    if (error) {
      console.error('[API /api/matches/[id]/documents/[docId] DELETE] Error en BD:', error);
      return NextResponse.json(
        { error: `Error al eliminar documento en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado o no pertenece al partido especificado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: docId });
  } catch (err: unknown) {
    console.error('[API /api/matches/[id]/documents/[docId] DELETE] Error inesperado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el documento.' },
      { status: 500 }
    );
  }
}
