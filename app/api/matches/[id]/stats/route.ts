import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RawStatItem {
  match_id?: unknown;
  player_id?: unknown;
  titular?: unknown;
  minutos?: unknown;
  goles?: unknown;
  asistencias?: unknown;
  tarjeta_amarilla?: unknown;
  tarjeta_roja?: unknown;
  recuperaciones?: unknown;
  intercepciones?: unknown;
  duelos_ganados?: unknown;
  pases_completados?: unknown;
  pases_totales?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 1. Autorización server-side
    let authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      const staffPasskey = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
      const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
      if (staffPasskey && staffPasskey === expectedPasskey) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    // 2. Resolver y validar matchId de la ruta
    const resolvedParams = await params;
    const matchId = resolvedParams?.id?.trim();

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { success: false, error: `ID de partido inválido o no proporcionado: '${matchId}'` },
        { status: 400 }
      );
    }

    // 3. Extraer y parsear body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de petición inválido (se requiere JSON).' },
        { status: 400 }
      );
    }

    const rawList: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body.stats)
      ? body.stats
      : Array.isArray(body.playerStatsList)
      ? body.playerStatsList
      : null as unknown as unknown[];

    if (!Array.isArray(rawList)) {
      return NextResponse.json(
        { success: false, error: 'Se esperaba un array de estadísticas de jugadores (stats).' },
        { status: 400 }
      );
    }

    // 4. Sanitización y validaciones exhaustivas anti-manipulación
    const sanitizedStats = [];
    const seenPlayerIds = new Set<string>();

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i] as RawStatItem;
      if (!item || typeof item !== 'object') {
        return NextResponse.json(
          { success: false, error: `Elemento en índice ${i} no es un objeto válido.` },
          { status: 400 }
        );
      }

      // Blindaje Cross-Match: si se envía match_id, debe coincidir estrictamente con el de la URL
      if (item.match_id !== undefined && item.match_id !== null) {
        const itemMatchId = String(item.match_id).trim();
        if (itemMatchId !== matchId) {
          return NextResponse.json(
            {
              success: false,
              error: `Manipulación cross-match detectada en índice ${i}: match_id en payload ('${itemMatchId}') discrepa de la URL ('${matchId}').`
            },
            { status: 400 }
          );
        }
      }

      // Validar player_id
      const playerId = typeof item.player_id === 'string' ? item.player_id.trim() : '';
      if (!playerId || !UUID_REGEX.test(playerId)) {
        return NextResponse.json(
          { success: false, error: `player_id inválido o ausente en índice ${i}: '${item.player_id}'` },
          { status: 400 }
        );
      }

      // Validar duplicados dentro del payload
      if (seenPlayerIds.has(playerId)) {
        return NextResponse.json(
          { success: false, error: `Jugador duplicado en la convocatoria enviada: '${playerId}'.` },
          { status: 400 }
        );
      }
      seenPlayerIds.add(playerId);

      // Normalizar campos con rangos seguros
      const minutos = Math.max(0, Math.min(120, Number(item.minutos || 0)));
      const goles = Math.max(0, Math.floor(Number(item.goles || 0)));
      const asistencias = Math.max(0, Math.floor(Number(item.asistencias || 0)));
      const recuperaciones = Math.max(0, Math.floor(Number(item.recuperaciones || 0)));
      const intercepciones = Math.max(0, Math.floor(Number(item.intercepciones || 0)));
      const duelos_ganados = Math.max(0, Math.floor(Number(item.duelos_ganados || 0)));
      const pases_completados = Math.max(0, Math.floor(Number(item.pases_completados || 0)));
      const pases_totales = Math.max(0, Math.floor(Number(item.pases_totales || 0)));

      sanitizedStats.push({
        player_id: playerId,
        titular: Boolean(item.titular),
        minutos: isNaN(minutos) ? 0 : minutos,
        goles: isNaN(goles) ? 0 : goles,
        asistencias: isNaN(asistencias) ? 0 : asistencias,
        tarjeta_amarilla: Boolean(item.tarjeta_amarilla),
        tarjeta_roja: Boolean(item.tarjeta_roja),
        recuperaciones: isNaN(recuperaciones) ? 0 : recuperaciones,
        intercepciones: isNaN(intercepciones) ? 0 : intercepciones,
        duelos_ganados: isNaN(duelos_ganados) ? 0 : duelos_ganados,
        pases_completados: isNaN(pases_completados) ? 0 : pases_completados,
        pases_totales: isNaN(pases_totales) ? 0 : pases_totales,
      });
    }

    // 5. Invocación atómica a la función PostgreSQL
    const supabaseServer = getSupabaseServerClient();
    const { data: rpcResult, error: rpcError } = await supabaseServer
      .rpc('sync_match_player_stats', {
        p_match_id: matchId,
        p_stats: sanitizedStats
      });

    if (rpcError) {
      console.error('[API /api/matches/[id]/stats POST] Error en sync_match_player_stats:', rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message || 'Error al sincronizar estadísticas del partido en base de datos.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match_id: matchId,
      result: rpcResult
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/matches/[id]/stats POST] Excepción no controlada:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
