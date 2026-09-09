import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const supabaseServer = getSupabaseServerClient();

    // Supports:
    // 1) Bulk assignments update: { updates: [ { id?, match_abp_plan_id, abp_player_role_id, player_id } ] }
    // 2) Single assignment update: { id?, match_abp_plan_id, abp_player_role_id, player_id }
    // 3) Set single role assignment: { match_abp_plan_id, abp_player_role_id, player_id }
    const updates: Array<Record<string, unknown>> = Array.isArray(body.updates)
      ? body.updates
      : Array.isArray(body)
      ? body
      : [body];

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No se enviaron asignaciones para actualizar.' }, { status: 400 });
    }

    for (const item of updates) {
      const planId = item.match_abp_plan_id as string | undefined;
      const roleId = item.abp_player_role_id as string | undefined;
      const playerId = item.player_id !== undefined
        ? (typeof item.player_id === 'string' && item.player_id.trim() ? item.player_id.trim() : null)
        : undefined;
      const assignmentId = item.id as string | undefined;

      if (assignmentId) {
        // Direct update by assignment PK
        const updateData: Record<string, unknown> = {};
        if (playerId !== undefined) updateData.player_id = playerId;
        if (item.notas_especificas !== undefined) updateData.notas_especificas = item.notas_especificas;

        const { error } = await supabaseServer
          .from('match_abp_player_assignments')
          .update(updateData)
          .eq('id', assignmentId);
        if (error) throw error;
      } else if (planId && roleId) {
        // Find or upsert assignment for this plan + role
        const { data: existing } = await supabaseServer
          .from('match_abp_player_assignments')
          .select('id')
          .eq('match_abp_plan_id', planId)
          .eq('abp_player_role_id', roleId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseServer
            .from('match_abp_player_assignments')
            .update({ player_id: playerId ?? null })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseServer
            .from('match_abp_player_assignments')
            .insert({
              match_abp_plan_id: planId,
              abp_player_role_id: roleId,
              player_id: playerId ?? null
            });
          if (error) throw error;
        }
      }
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/match-assignments POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
