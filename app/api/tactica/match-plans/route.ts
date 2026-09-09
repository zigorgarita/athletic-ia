import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeMatchPlanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.match_id === 'string' && data.match_id.trim()) {
    payload.match_id = data.match_id.trim();
  }
  if (data.system_own_id !== undefined) {
    payload.system_own_id = typeof data.system_own_id === 'string' && data.system_own_id.trim() ? data.system_own_id.trim() : null;
  }
  if (data.system_rival_id !== undefined) {
    payload.system_rival_id = typeof data.system_rival_id === 'string' && data.system_rival_id.trim() ? data.system_rival_id.trim() : null;
  }
  if (data.matchup_id !== undefined) {
    payload.matchup_id = typeof data.matchup_id === 'string' && data.matchup_id.trim() ? data.matchup_id.trim() : null;
  }
  if (data.notas_entrenador !== undefined) {
    payload.notas_entrenador = typeof data.notas_entrenador === 'string' ? data.notas_entrenador : null;
  }
  if (data.conclusiones_post !== undefined) {
    payload.conclusiones_post = typeof data.conclusiones_post === 'string' ? data.conclusiones_post : null;
  }
  if (data.estado !== undefined) {
    payload.estado = typeof data.estado === 'string' ? data.estado.trim() : 'borrador';
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

    if (!body.match_id || typeof body.match_id !== 'string') {
      return NextResponse.json({ error: 'match_id es obligatorio.' }, { status: 400 });
    }

    const sanitized = sanitizeMatchPlanPayload(body);
    sanitized.updated_at = new Date().toISOString();

    const supabaseServer = getSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('tactical_match_plans')
      .upsert(sanitized, { onConflict: 'match_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[API /api/tactica/match-plans POST] Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/tactica/match-plans POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
