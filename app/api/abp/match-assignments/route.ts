import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AssignmentItem {
  id?: unknown;
  match_abp_plan_id?: unknown;
  abp_player_role_id?: unknown;
  player_id?: unknown;
  notas_especificas?: unknown;
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

    const rawUpdates: unknown[] = Array.isArray(body.updates)
      ? body.updates
      : Array.isArray(body)
      ? body
      : [body];

    if (rawUpdates.length === 0) {
      return NextResponse.json({ error: 'No se enviaron asignaciones para actualizar.' }, { status: 400 });
    }

    if (rawUpdates.length > 100) {
      return NextResponse.json({ error: 'Límite de asignaciones por petición excedido (máximo 100).' }, { status: 400 });
    }

    // 1. Sanitización sintáctica preliminar
    const sanitizedItems: Array<{
      id?: string;
      match_abp_plan_id?: string;
      abp_player_role_id?: string;
      player_id: string | null;
      hasExplicitPlayer: boolean;
      notas_especificas?: string | null;
    }> = [];

    const assignmentIdsToCheck = new Set<string>();
    const planIdsToCheck = new Set<string>();
    const roleIdsToCheck = new Set<string>();
    const playerIdsToCheck = new Set<string>();

    for (let i = 0; i < rawUpdates.length; i++) {
      const raw = rawUpdates[i] as AssignmentItem;
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: `Elemento en índice ${i} no es un objeto válido.` }, { status: 400 });
      }

      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined;
      const planId = typeof raw.match_abp_plan_id === 'string' && raw.match_abp_plan_id.trim() ? raw.match_abp_plan_id.trim() : undefined;
      const roleId = typeof raw.abp_player_role_id === 'string' && raw.abp_player_role_id.trim() ? raw.abp_player_role_id.trim() : undefined;

      // Validación de identificadores obligatorios
      if (!id && (!planId || !roleId)) {
        return NextResponse.json({
          error: `Índice ${i}: Se requiere 'id' de asignación o el par ('match_abp_plan_id', 'abp_player_role_id').`
        }, { status: 400 });
      }

      if (id) {
        if (!UUID_REGEX.test(id)) {
          return NextResponse.json({ error: `Índice ${i}: 'id' no es un UUID válido: '${id}'` }, { status: 400 });
        }
        assignmentIdsToCheck.add(id);
      }

      if (planId) {
        if (!UUID_REGEX.test(planId)) {
          return NextResponse.json({ error: `Índice ${i}: 'match_abp_plan_id' no es un UUID válido: '${planId}'` }, { status: 400 });
        }
        planIdsToCheck.add(planId);
      }

      if (roleId) {
        if (!UUID_REGEX.test(roleId)) {
          return NextResponse.json({ error: `Índice ${i}: 'abp_player_role_id' no es un UUID válido: '${roleId}'` }, { status: 400 });
        }
        roleIdsToCheck.add(roleId);
      }

      // Tratamiento de player_id (null es válido para desasignar)
      let playerId: string | null = null;
      let hasExplicitPlayer = false;

      if (raw.player_id !== undefined) {
        hasExplicitPlayer = true;
        if (raw.player_id !== null && raw.player_id !== '') {
          const pIdStr = String(raw.player_id).trim();
          if (!UUID_REGEX.test(pIdStr)) {
            return NextResponse.json({ error: `Índice ${i}: 'player_id' no es un UUID válido: '${raw.player_id}'` }, { status: 400 });
          }
          playerId = pIdStr;
          playerIdsToCheck.add(pIdStr);
        }
      }

      const notas = raw.notas_especificas !== undefined
        ? (raw.notas_especificas === null ? null : String(raw.notas_especificas))
        : undefined;

      sanitizedItems.push({
        id,
        match_abp_plan_id: planId,
        abp_player_role_id: roleId,
        player_id: playerId,
        hasExplicitPlayer,
        notas_especificas: notas,
      });
    }

    const supabaseServer = getSupabaseServerClient();

    // 2. Validación de integridad referencial de jugadores
    if (playerIdsToCheck.size > 0) {
      const playerIdsArray = Array.from(playerIdsToCheck);
      const { data: validPlayers, error: playersErr } = await supabaseServer
        .from('players')
        .select('id')
        .in('id', playerIdsArray);

      if (playersErr) throw playersErr;
      const validPlayerSet = new Set(validPlayers?.map(p => p.id));
      for (const pId of playerIdsArray) {
        if (!validPlayerSet.has(pId)) {
          return NextResponse.json({ error: `El jugador con ID '${pId}' no existe en la plantilla.` }, { status: 400 });
        }
      }
    }

    // 3. Validación de asignaciones por PK directa (cuando se envía id)
    const existingAssignmentsMap = new Map<string, { id: string; match_abp_plan_id: string; abp_player_role_id: string }>();
    if (assignmentIdsToCheck.size > 0) {
      const assignmentIdsArray = Array.from(assignmentIdsToCheck);
      const { data: existingAsgs, error: asgsErr } = await supabaseServer
        .from('match_abp_player_assignments')
        .select('id, match_abp_plan_id, abp_player_role_id')
        .in('id', assignmentIdsArray);

      if (asgsErr) throw asgsErr;
      existingAsgs?.forEach(a => existingAssignmentsMap.set(a.id, a));

      for (const id of assignmentIdsArray) {
        if (!existingAssignmentsMap.has(id)) {
          return NextResponse.json({ error: `La asignación con ID '${id}' no existe en la base de datos.` }, { status: 400 });
        }
      }
    }

    // 4. Validación cruzada de Planes y Roles (relación táctica coherente)
    const plansMap = new Map<string, { id: string; abp_play_id: string }>();
    if (planIdsToCheck.size > 0) {
      const planIdsArray = Array.from(planIdsToCheck);
      const { data: plansData, error: plansErr } = await supabaseServer
        .from('match_abp_plans')
        .select('id, abp_play_id')
        .in('id', planIdsArray);

      if (plansErr) throw plansErr;
      plansData?.forEach(p => plansMap.set(p.id, p));

      for (const pId of planIdsArray) {
        if (!plansMap.has(pId)) {
          return NextResponse.json({ error: `El plan ABP con ID '${pId}' no existe.` }, { status: 400 });
        }
      }
    }

    const rolesMap = new Map<string, { id: string; abp_play_id: string }>();
    if (roleIdsToCheck.size > 0) {
      const roleIdsArray = Array.from(roleIdsToCheck);
      const { data: rolesData, error: rolesErr } = await supabaseServer
        .from('abp_player_roles')
        .select('id, abp_play_id')
        .in('id', roleIdsArray);

      if (rolesErr) throw rolesErr;
      rolesData?.forEach(r => rolesMap.set(r.id, r));

      for (const rId of roleIdsArray) {
        if (!rolesMap.has(rId)) {
          return NextResponse.json({ error: `El rol ABP con ID '${rId}' no existe.` }, { status: 400 });
        }
      }
    }

    // 5. Blindaje Anti-Tampering Cross-Plan / Cross-Role
    for (let i = 0; i < sanitizedItems.length; i++) {
      const item = sanitizedItems[i];

      // A) Si se proporcionó assignment id, verificar que coincida con plan y rol si se enviaron
      if (item.id) {
        const existing = existingAssignmentsMap.get(item.id)!;
        if (item.match_abp_plan_id && existing.match_abp_plan_id !== item.match_abp_plan_id) {
          return NextResponse.json({
            error: `Inconsistencia cross-plan en índice ${i}: la asignación '${item.id}' pertenece al plan '${existing.match_abp_plan_id}', no a '${item.match_abp_plan_id}'.`
          }, { status: 400 });
        }
        if (item.abp_player_role_id && existing.abp_player_role_id !== item.abp_player_role_id) {
          return NextResponse.json({
            error: `Inconsistencia cross-role en índice ${i}: la asignación '${item.id}' corresponde al rol '${existing.abp_player_role_id}', no a '${item.abp_player_role_id}'.`
          }, { status: 400 });
        }
      }

      // B) Si se proporcionó el par (planId, roleId), verificar que el rol pertenece a la jugada del plan
      if (item.match_abp_plan_id && item.abp_player_role_id) {
        const plan = plansMap.get(item.match_abp_plan_id);
        const role = rolesMap.get(item.abp_player_role_id);
        if (plan && role && plan.abp_play_id !== role.abp_play_id) {
          return NextResponse.json({
            error: `Inconsistencia táctica en índice ${i}: El rol '${item.abp_player_role_id}' pertenece a la jugada '${role.abp_play_id}', pero el plan '${item.match_abp_plan_id}' utiliza la jugada '${plan.abp_play_id}'.`
          }, { status: 400 });
        }
      }
    }

    // 6. Aplicación de las actualizaciones verificadas
    for (const item of sanitizedItems) {
      if (item.id) {
        const updatePayload: Record<string, unknown> = {};
        if (item.hasExplicitPlayer) updatePayload.player_id = item.player_id;
        if (item.notas_especificas !== undefined) updatePayload.notas_especificas = item.notas_especificas;

        const { error } = await supabaseServer
          .from('match_abp_player_assignments')
          .update(updatePayload)
          .eq('id', item.id);

        if (error) throw error;
      } else if (item.match_abp_plan_id && item.abp_player_role_id) {
        // Buscar si ya existe la fila para (match_abp_plan_id, abp_player_role_id)
        const { data: existing } = await supabaseServer
          .from('match_abp_player_assignments')
          .select('id')
          .eq('match_abp_plan_id', item.match_abp_plan_id)
          .eq('abp_player_role_id', item.abp_player_role_id)
          .maybeSingle();

        if (existing) {
          const updatePayload: Record<string, unknown> = {};
          if (item.hasExplicitPlayer) updatePayload.player_id = item.player_id;
          if (item.notas_especificas !== undefined) updatePayload.notas_especificas = item.notas_especificas;

          const { error } = await supabaseServer
            .from('match_abp_player_assignments')
            .update(updatePayload)
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabaseServer
            .from('match_abp_player_assignments')
            .insert({
              match_abp_plan_id: item.match_abp_plan_id,
              abp_player_role_id: item.abp_player_role_id,
              player_id: item.player_id,
              notas_especificas: item.notas_especificas ?? null
            });

          if (error) throw error;
        }
      }
    }

    return NextResponse.json({ success: true, count: sanitizedItems.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/match-assignments POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
