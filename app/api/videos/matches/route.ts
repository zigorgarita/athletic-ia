import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeMatchVideoPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.titulo === 'string') payload.titulo = data.titulo.trim();
  if (data.descripcion !== undefined) payload.descripcion = typeof data.descripcion === 'string' && data.descripcion.trim() ? data.descripcion.trim() : null;
  if (typeof data.video_url === 'string') payload.video_url = data.video_url.trim();
  if (typeof data.fecha_partido === 'string') payload.fecha_partido = data.fecha_partido.trim();
  if (data.drive_file_id !== undefined) payload.drive_file_id = typeof data.drive_file_id === 'string' && data.drive_file_id.trim() ? data.drive_file_id.trim() : null;
  if (data.tamano_bytes !== undefined) payload.tamano_bytes = data.tamano_bytes !== null && data.tamano_bytes !== '' ? Number(data.tamano_bytes) : null;
  if (typeof data.tipo_origen === 'string') payload.tipo_origen = data.tipo_origen.trim();
  if (typeof data.estado === 'string') payload.estado = data.estado.trim();

  return payload;
}

export async function POST(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    if (!body.titulo || !body.video_url || !body.fecha_partido) {
      return NextResponse.json({ error: 'Título, URL del vídeo y fecha del partido son obligatorios.' }, { status: 400 });
    }

    const sanitized = sanitizeMatchVideoPayload(body);
    if (body.id && typeof body.id === 'string') {
      sanitized.id = body.id.trim();
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('match_videos')
      .insert(sanitized)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/videos/matches POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('[API /api/videos/matches POST] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Se requiere ID del vídeo válido.' }, { status: 400 });
    }

    const videoId = String(body.id).trim();
    const sanitized = sanitizeMatchVideoPayload(body);

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('match_videos')
      .update(sanitized)
      .eq('id', videoId)
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/videos/matches PUT] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/videos/matches PUT] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let videoId = searchParams.get('id');

    if (!videoId) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        videoId = String(body.id);
      }
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Se requiere ID del vídeo a eliminar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { error } = await supabaseServer
      .from('match_videos')
      .delete()
      .eq('id', videoId.trim());

    if (error) {
      console.error('[API /api/videos/matches DELETE] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: videoId.trim() }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/videos/matches DELETE] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
