/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getActiveSeason } from '@/lib/season';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');
  const season = searchParams.get('season') || getActiveSeason();

  try {
    if (sessionId) {
      // 1. Obtener datos detallados de una sesión
      const { data: session, error: sessionErr } = await supabase
        .from('beto_sessions')
        .select(`
          *,
          beto_imports (
            id, file_name, file_size_bytes, drive_file_url, drive_path, created_at, status
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionErr || !session) {
        return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
      }

      // 2. Obtener métricas de jugadores asociadas
      const { data: playerSessions, error: playersErr } = await supabase
        .from('beto_player_sessions')
        .select(`
          *,
          players:player_id (
            id, nombre, apellidos, alias, dorsal, foto_url, demarcacion, estado
          )
        `)
        .eq('session_id', sessionId)
        .order('minutos', { ascending: false });

      if (playersErr) {
        return NextResponse.json({ error: playersErr.message }, { status: 500 });
      }

      return NextResponse.json({
        session,
        player_sessions: playerSessions || [],
      });
    }

    // Listar todas las sesiones de la temporada
    const { data: sessions, error: listErr } = await supabase
      .from('beto_sessions')
      .select(`
        *,
        beto_imports (
          id, file_name, drive_file_url, status
        )
      `)
      .eq('season', season)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    // Listar historial de importaciones recientes
    const { data: imports } = await supabase
      .from('beto_imports')
      .select('*')
      .eq('season', season)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      sessions: sessions || [],
      recent_imports: imports || [],
    });
  } catch (err: any) {
    console.error('Error en GET /api/beto/sessions:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 });
  }

  try {
    const { error } = await supabase.from('beto_sessions').delete().eq('id', sessionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
