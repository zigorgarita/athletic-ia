import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeMatchPlanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.id === 'string' && data.id.trim()) {
    payload.id = data.id.trim();
  }
  if (typeof data.match_id === 'string' && data.match_id.trim()) {
    payload.match_id = data.match_id.trim();
  }
  if (typeof data.abp_play_id === 'string' && data.abp_play_id.trim()) {
    payload.abp_play_id = data.abp_play_id.trim();
  }
  if (data.orden !== undefined) {
    payload.orden = typeof data.orden === 'number' ? data.orden : Number(data.orden);
  }
  if (data.observaciones !== undefined) {
    payload.observaciones = typeof data.observaciones === 'string' ? data.observaciones : null;
  }
  if (data.video_asociado !== undefined) {
    payload.video_asociado = typeof data.video_asociado === 'string' && data.video_asociado.trim() ? data.video_asociado.trim() : null;
  }
  if (data.imagenes !== undefined) {
    payload.imagenes = Array.isArray(data.imagenes) ? data.imagenes : null;
  }
  if (data.rival !== undefined) {
    payload.rival = typeof data.rival === 'string' ? data.rival.trim() : null;
  }
  if (data.categoria !== undefined) {
    payload.categoria = typeof data.categoria === 'string' ? data.categoria.trim() : null;
  }
  if (data.observaciones_cuerpo_tecnico !== undefined) {
    payload.observaciones_cuerpo_tecnico = typeof data.observaciones_cuerpo_tecnico === 'string' ? data.observaciones_cuerpo_tecnico : null;
  }
  if (data.recomendaciones_ia !== undefined) {
    payload.recomendaciones_ia = typeof data.recomendaciones_ia === 'string' ? data.recomendaciones_ia : null;
  }

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

    const supabaseServer = getSupabaseServerClient();

    // 1. Reordering operation
    if (Array.isArray(body.reorder)) {
      const updates = body.reorder as Array<{ id: string; orden: number }>;
      for (const item of updates) {
        if (!item.id) continue;
        await supabaseServer
          .from('match_abp_plans')
          .update({ orden: Number(item.orden) })
          .eq('id', item.id);
      }
      return NextResponse.json({ success: true });
    }

    // 2. Clone play for match customization
    if (body.action === 'customize_for_match' && body.plan_id && body.new_play_data) {
      const planId = body.plan_id as string;
      const newPlayData = body.new_play_data as Record<string, unknown>;
      const rolesToCopy = (body.roles_to_copy || []) as Array<Record<string, unknown>>;

      // Create new play
      const { data: newPlay, error: newPlayErr } = await supabaseServer
        .from('abp_plays')
        .insert({
          tipo: newPlayData.tipo,
          titulo: newPlayData.titulo,
          descripcion: newPlayData.descripcion || null,
          video_url: newPlayData.video_url || null,
          zona: newPlayData.zona || null
        })
        .select('*')
        .single();

      if (newPlayErr) throw newPlayErr;

      // Create cloned roles
      let insertedRoles: Array<Record<string, unknown>> = [];
      if (rolesToCopy.length > 0) {
        const rolesPayload = rolesToCopy.map((r, idx) => ({
          abp_play_id: newPlay.id,
          player_id: r.player_id || null,
          rol_asignado: r.rol_asignado || 'Jugador',
          posicion_x: r.posicion_x ?? 50,
          posicion_y: r.posicion_y ?? 50,
          etiqueta: r.etiqueta || null,
          comentario: r.comentario || null,
          orden: r.orden ?? (idx + 1),
          label_position: r.label_position || 'top'
        }));

        const { data: rData, error: rErr } = await supabaseServer
          .from('abp_player_roles')
          .insert(rolesPayload)
          .select('*');
        if (rErr) throw rErr;
        insertedRoles = rData || [];
      }

      // Re-link plan to the new play
      await supabaseServer
        .from('match_abp_plans')
        .update({ abp_play_id: newPlay.id })
        .eq('id', planId);

      // Recreate player assignments
      await supabaseServer
        .from('match_abp_player_assignments')
        .delete()
        .eq('match_abp_plan_id', planId);

      if (insertedRoles.length > 0) {
        const newAssignments = insertedRoles.map(role => {
          const original = rolesToCopy.find(r => r.rol_asignado === role.rol_asignado);
          return {
            match_abp_plan_id: planId,
            abp_player_role_id: role.id,
            player_id: original?.player_id || null
          };
        });

        await supabaseServer
          .from('match_abp_player_assignments')
          .insert(newAssignments);
      }

      return NextResponse.json({ success: true, newPlay, roles: insertedRoles });
    }

    // 3. Normal create or update
    const sanitized = sanitizeMatchPlanPayload(body);

    if (!sanitized.id) {
      if (!sanitized.match_id || !sanitized.abp_play_id) {
        return NextResponse.json({ error: 'match_id y abp_play_id son requeridos.' }, { status: 400 });
      }

      const { data: createdPlan, error: pErr } = await supabaseServer
        .from('match_abp_plans')
        .insert(sanitized)
        .select('*')
        .single();
      if (pErr) throw pErr;

      // Auto-create initial assignments from abp_player_roles
      const { data: roles } = await supabaseServer
        .from('abp_player_roles')
        .select('*')
        .eq('abp_play_id', sanitized.abp_play_id);

      if (roles && roles.length > 0) {
        const assignments = roles.map(role => ({
          match_abp_plan_id: createdPlan.id,
          abp_player_role_id: role.id,
          player_id: role.player_id || null
        }));

        await supabaseServer
          .from('match_abp_player_assignments')
          .insert(assignments);
      }

      return NextResponse.json({ success: true, data: createdPlan });
    } else {
      const { data: updatedPlan, error: uErr } = await supabaseServer
        .from('match_abp_plans')
        .update(sanitized)
        .eq('id', sanitized.id)
        .select('*')
        .single();
      if (uErr) throw uErr;

      return NextResponse.json({ success: true, data: updatedPlan });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/match-plans POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.id === 'string') id = body.id;
    }

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'id es obligatorio para eliminar un plan de ABP de partido.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();
    const planId = id.trim();

    // 1. Delete assignments
    await supabaseServer
      .from('match_abp_player_assignments')
      .delete()
      .eq('match_abp_plan_id', planId);

    // 2. Delete plan
    const { error } = await supabaseServer
      .from('match_abp_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/abp/match-plans DELETE] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
