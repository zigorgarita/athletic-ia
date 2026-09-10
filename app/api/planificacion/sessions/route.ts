import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeSession(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;

  const fecha = typeof item.fecha === 'string' ? item.fecha.trim() : '';
  if (!fecha) return null;

  const sanitized: Record<string, unknown> = {
    fecha,
    tipo_sesion: typeof item.tipo_sesion === 'string' && item.tipo_sesion.trim()
      ? item.tipo_sesion.trim()
      : 'Entrenamiento',
    hora_inicio: typeof item.hora_inicio === 'string' && item.hora_inicio.trim()
      ? item.hora_inicio.trim()
      : null,
    hora_fin: typeof item.hora_fin === 'string' && item.hora_fin.trim()
      ? item.hora_fin.trim()
      : null,
    duracion_total: item.duracion_total !== undefined && item.duracion_total !== null && item.duracion_total !== ''
      ? Number(item.duracion_total) || 0
      : 0,
    campo_instalacion: typeof item.campo_instalacion === 'string' && item.campo_instalacion.trim()
      ? item.campo_instalacion.trim()
      : null,
    objetivo_principal: typeof item.objetivo_principal === 'string' && item.objetivo_principal.trim()
      ? item.objetivo_principal.trim()
      : null,
    carga: typeof item.carga === 'string' && item.carga.trim()
      ? item.carga.trim()
      : 'Media',
    num_jugadores_previstos: item.num_jugadores_previstos !== undefined && item.num_jugadores_previstos !== null && item.num_jugadores_previstos !== ''
      ? Number(item.num_jugadores_previstos) || 0
      : null,
    num_porteros_previstos: item.num_porteros_previstos !== undefined && item.num_porteros_previstos !== null && item.num_porteros_previstos !== ''
      ? Number(item.num_porteros_previstos) || 0
      : null,
    jornada_id: typeof item.jornada_id === 'string' && item.jornada_id.trim()
      ? item.jornada_id.trim()
      : null,
    objetivo_semanal: typeof item.objetivo_semanal === 'string' && item.objetivo_semanal.trim()
      ? item.objetivo_semanal.trim()
      : null,
    estado: typeof item.estado === 'string' && item.estado.trim()
      ? item.estado.trim()
      : 'Planificada',
    evaluacion_completada: Boolean(item.evaluacion_completada),
    evaluacion_duracion_real: item.evaluacion_duracion_real !== undefined && item.evaluacion_duracion_real !== null && item.evaluacion_duracion_real !== ''
      ? Number(item.evaluacion_duracion_real) || null
      : null,
    evaluacion_observaciones: typeof item.evaluacion_observaciones === 'string' && item.evaluacion_observaciones.trim()
      ? item.evaluacion_observaciones.trim()
      : null,
    evaluacion_intensidad_media: item.evaluacion_intensidad_media !== undefined && item.evaluacion_intensidad_media !== null && item.evaluacion_intensidad_media !== ''
      ? Number(item.evaluacion_intensidad_media) || null
      : null,
    hora_convocatoria: typeof item.hora_convocatoria === 'string' && item.hora_convocatoria.trim()
      ? item.hora_convocatoria.trim()
      : null,
    observaciones_convocatoria: typeof item.observaciones_convocatoria === 'string' && item.observaciones_convocatoria.trim()
      ? item.observaciones_convocatoria.trim()
      : null,
    checklist_material: item.checklist_material && typeof item.checklist_material === 'object'
      ? item.checklist_material
      : {},
    microciclo_semana: typeof item.microciclo_semana === 'string' && item.microciclo_semana.trim()
      ? item.microciclo_semana.trim()
      : null,
    dia_semana: typeof item.dia_semana === 'string' && item.dia_semana.trim()
      ? item.dia_semana.trim()
      : null,
    rpe_medio: item.rpe_medio !== undefined && item.rpe_medio !== null && item.rpe_medio !== ''
      ? Number(item.rpe_medio) || null
      : null,
    team_id: typeof item.team_id === 'string' && item.team_id.trim()
      ? item.team_id.trim()
      : null,
    season_id: typeof item.season_id === 'string' && item.season_id.trim()
      ? item.season_id.trim()
      : null,
    valoracion_entrenador: item.valoracion_entrenador !== undefined && item.valoracion_entrenador !== null && item.valoracion_entrenador !== ''
      ? Number(item.valoracion_entrenador) || null
      : null,
    valoracion_media_jugadores: item.valoracion_media_jugadores !== undefined && item.valoracion_media_jugadores !== null && item.valoracion_media_jugadores !== ''
      ? Number(item.valoracion_media_jugadores) || null
      : null,
    rival: typeof item.rival === 'string' && item.rival.trim()
      ? item.rival.trim()
      : null
  };

  const rawId = typeof item.id === 'string' ? item.id.trim() : '';
  if (rawId && !rawId.startsWith('temp-')) {
    sanitized.id = rawId;
  }

  return sanitized;
}

function sanitizeTasks(tasks: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .map((task, idx) => {
      if (!task || typeof task !== 'object') return null;
      const t = task as Record<string, unknown>;
      const nombre = typeof t.nombre_tarea === 'string' && t.nombre_tarea.trim()
        ? t.nombre_tarea.trim()
        : 'Tarea';

      const sanitized: Record<string, unknown> = {
        nombre_tarea: nombre,
        tipo_tarea: typeof t.tipo_tarea === 'string' && t.tipo_tarea.trim()
          ? t.tipo_tarea.trim()
          : 'Principal',
        minutos: t.minutos !== undefined && t.minutos !== null && t.minutos !== ''
          ? Number(t.minutos) || 0
          : 0,
        jugadores: t.jugadores !== undefined && t.jugadores !== null && t.jugadores !== ''
          ? Number(t.jugadores) || null
          : null,
        espacio: typeof t.espacio === 'string' && t.espacio.trim()
          ? t.espacio.trim()
          : null,
        objetivo: typeof t.objetivo === 'string' && t.objetivo.trim()
          ? t.objetivo.trim()
          : null,
        descripcion: typeof t.descripcion === 'string' && t.descripcion.trim()
          ? t.descripcion.trim()
          : null,
        observaciones: typeof t.observaciones === 'string' && t.observaciones.trim()
          ? t.observaciones.trim()
          : null,
        orden: t.orden !== undefined && t.orden !== null ? Number(t.orden) : idx,
        responsable_staff: typeof t.responsable_staff === 'string' && t.responsable_staff.trim()
          ? t.responsable_staff.trim()
          : null
      };

      const rawId = typeof t.id === 'string' ? t.id.trim() : '';
      if (rawId && !rawId.startsWith('temp-') && !rawId.startsWith('t-')) {
        sanitized.id = rawId;
      }

      return sanitized;
    })
    .filter((item): item is Record<string, unknown> => item !== null);
}

function sanitizePlayers(players: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(players)) return [];

  const results: Record<string, unknown>[] = [];
  for (const player of players) {
    if (!player || typeof player !== 'object') continue;
    const p = player as Record<string, unknown>;
    const playerId = typeof p.player_id === 'string' ? p.player_id.trim() : '';
    if (!playerId) continue;

    results.push({
      player_id: playerId,
      convocado: Boolean(p.convocado),
      estado_sesion: typeof p.estado_sesion === 'string' && p.estado_sesion.trim()
        ? p.estado_sesion.trim()
        : 'Disponible'
    });
  }
  return results;
}

function sanitizeConcepts(concepts: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(concepts)) return [];

  const results: Record<string, unknown>[] = [];
  for (const concept of concepts) {
    if (!concept || typeof concept !== 'object') continue;
    const c = concept as Record<string, unknown>;
    const categoria = typeof c.categoria === 'string' ? c.categoria.trim() : '';
    const concepto = typeof c.concepto === 'string' ? c.concepto.trim() : '';
    if (!categoria || !concepto) continue;

    results.push({
      categoria,
      concepto
    });
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();
    const isPasskeyValid = Boolean(expectedPasskey && passkeyHeader && passkeyHeader === expectedPasskey);
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req) || isPasskeyValid;

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de petición inválido.' }, { status: 400 });
    }

    const sanitizedSession = sanitizeSession(body.session as Record<string, unknown>);
    if (!sanitizedSession) {
      return NextResponse.json({ error: 'Datos de sesión incompletos o inválidos (fecha requerida).' }, { status: 400 });
    }

    const sanitizedTasks = sanitizeTasks(body.tasks as unknown[]);
    const sanitizedPlayers = sanitizePlayers(body.players as unknown[]);
    const sanitizedConcepts = sanitizeConcepts(body.concepts as unknown[]);

    const supabaseServer = getSupabaseServerClient();

    const { data: rpcResult, error: rpcError } = await supabaseServer.rpc('save_planning_session_atomic', {
      p_session: sanitizedSession,
      p_tasks: sanitizedTasks,
      p_players: sanitizedPlayers,
      p_concepts: sanitizedConcepts
    });

    if (rpcError) {
      console.error('[API /api/planificacion/sessions POST] Error en save_planning_session_atomic:', rpcError);
      return NextResponse.json({ error: `Error guardando sesión: ${rpcError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/planificacion/sessions POST] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
