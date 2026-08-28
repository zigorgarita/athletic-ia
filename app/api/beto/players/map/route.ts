/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  try {
    const body = await req.json();
    const { player_id, oliver_player_id, beto_player_session_id } = body;

    if (!player_id) {
      return NextResponse.json({ error: 'Se requiere player_id' }, { status: 400 });
    }

    // 1. Si viene oliver_player_id, guardarlo en la ficha del jugador para mapeos automáticos futuros
    if (oliver_player_id) {
      const { error: updatePlayerErr } = await supabase
        .from('players')
        .update({ oliver_player_id: oliver_player_id })
        .eq('id', player_id);

      if (updatePlayerErr) {
        console.warn('Advertencia al vincular oliver_player_id en players:', updatePlayerErr.message);
      }
    }

    // 2. Si viene un beto_player_session_id específico, actualizar su player_id inmediatamente
    if (beto_player_session_id) {
      const { error: updateSessionErr } = await supabase
        .from('beto_player_sessions')
        .update({ player_id: player_id })
        .eq('id', beto_player_session_id);

      if (updateSessionErr) {
        return NextResponse.json({ error: updateSessionErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al vincular jugador' }, { status: 500 });
  }
}
