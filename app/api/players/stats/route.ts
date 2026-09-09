import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizePlayerStatsUpdates(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.titular === 'boolean') payload.titular = data.titular;
  if (typeof data.convocado === 'boolean') payload.convocado = data.convocado;
  if (typeof data.suplente === 'boolean') payload.suplente = data.suplente;
  if (typeof data.entro_banquillo === 'boolean') payload.entro_banquillo = data.entro_banquillo;

  if (data.minutos !== undefined && data.minutos !== null) payload.minutos = Number(data.minutos);
  if (data.goles !== undefined && data.goles !== null) payload.goles = Number(data.goles);
  if (data.asistencias !== undefined && data.asistencias !== null) payload.asistencias = Number(data.asistencias);
  if (data.tarjeta_amarilla !== undefined && data.tarjeta_amarilla !== null) payload.tarjeta_amarilla = Number(data.tarjeta_amarilla);
  if (data.tarjeta_roja !== undefined && data.tarjeta_roja !== null) payload.tarjeta_roja = Number(data.tarjeta_roja);
  if (data.recuperaciones !== undefined && data.recuperaciones !== null) payload.recuperaciones = Number(data.recuperaciones);
  if (data.intercepciones !== undefined && data.intercepciones !== null) payload.intercepciones = Number(data.intercepciones);
  if (data.duelos_ganados !== undefined && data.duelos_ganados !== null) payload.duelos_ganados = Number(data.duelos_ganados);
  if (data.pases_completados !== undefined && data.pases_completados !== null) payload.pases_completados = Number(data.pases_completados);
  if (data.pases_totales !== undefined && data.pases_totales !== null) payload.pases_totales = Number(data.pases_totales);
  if (data.goles_encajados !== undefined && data.goles_encajados !== null) payload.goles_encajados = Number(data.goles_encajados);
  if (data.minuto_entrada !== undefined) payload.minuto_entrada = data.minuto_entrada !== null && data.minuto_entrada !== '' ? Number(data.minuto_entrada) : null;
  if (data.minuto_salida !== undefined) payload.minuto_salida = data.minuto_salida !== null && data.minuto_salida !== '' ? Number(data.minuto_salida) : null;
  if (typeof data.doble_amarilla === 'boolean') payload.doble_amarilla = data.doble_amarilla;
  if (typeof data.roja_directa === 'boolean') payload.roja_directa = data.roja_directa;
  if (data.dorsal_partido !== undefined) payload.dorsal_partido = data.dorsal_partido !== null && data.dorsal_partido !== '' ? Number(data.dorsal_partido) : null;
  if (typeof data.origen === 'string') payload.origen = data.origen.trim();
  if (typeof data.rfef_acta_id === 'string') payload.rfef_acta_id = data.rfef_acta_id.trim();

  return payload;
}

export async function PUT(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const statId = (body.statId || body.id) as string;
    if (!statId || typeof statId !== 'string') {
      return NextResponse.json({ error: 'Se requiere ID de estadística de partido (statId).' }, { status: 400 });
    }

    const updates = (body.updates || body) as Record<string, unknown>;
    const sanitized = sanitizePlayerStatsUpdates(updates);

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('match_player_stats')
      .update(sanitized)
      .eq('id', statId.trim())
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/players/stats PUT] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    console.error('[API /api/players/stats PUT] Excepción:', err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || 'Error interno del servidor.' }, { status: 500 });
  }
}
