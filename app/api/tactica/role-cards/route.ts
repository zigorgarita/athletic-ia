import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeRoleCardPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof data.id === 'string' && data.id.trim()) {
    payload.id = data.id.trim();
  }
  if (data.matchup_id !== undefined) {
    payload.matchup_id = typeof data.matchup_id === 'string' && data.matchup_id.trim() ? data.matchup_id.trim() : null;
  }
  if (data.match_plan_id !== undefined) {
    payload.match_plan_id = typeof data.match_plan_id === 'string' && data.match_plan_id.trim() ? data.match_plan_id.trim() : null;
  }
  if (typeof data.linea === 'string') {
    payload.linea = data.linea.trim();
  }
  if (typeof data.posicion_label === 'string') {
    payload.posicion_label = data.posicion_label.trim();
  }
  if (data.fase_ofensiva !== undefined) {
    payload.fase_ofensiva = typeof data.fase_ofensiva === 'string' ? data.fase_ofensiva : null;
  }
  if (data.fase_defensiva !== undefined) {
    payload.fase_defensiva = typeof data.fase_defensiva === 'string' ? data.fase_defensiva : null;
  }
  if (data.transiciones !== undefined) {
    payload.transiciones = typeof data.transiciones === 'string' ? data.transiciones : null;
  }
  if (data.instrucciones_especificas !== undefined) {
    payload.instrucciones_especificas = typeof data.instrucciones_especificas === 'string' ? data.instrucciones_especificas : null;
  }
  if (data.referencia_visual !== undefined) {
    payload.referencia_visual = typeof data.referencia_visual === 'string' ? data.referencia_visual : null;
  }
  if (data.ai_context !== undefined) {
    payload.ai_context = typeof data.ai_context === 'object' && data.ai_context !== null ? data.ai_context : null;
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

    // Check if body is an array or has a `cards` array
    const rawCards: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>).cards)
      ? ((body as Record<string, unknown>).cards as unknown[])
      : [body];

    if (rawCards.length === 0) {
      return NextResponse.json({ error: 'No se enviaron fichas de rol para guardar.' }, { status: 400 });
    }

    const results = [];
    for (const raw of rawCards) {
      if (!raw || typeof raw !== 'object') continue;
      const card = raw as Record<string, unknown>;
      if (!card.posicion_label || typeof card.posicion_label !== 'string') {
        return NextResponse.json({ error: 'posicion_label es obligatorio en cada ficha.' }, { status: 400 });
      }

      const sanitized = sanitizeRoleCardPayload(card);
      let onConflict: string;
      if (sanitized.id) {
        onConflict = 'id';
      } else if (sanitized.match_plan_id) {
        onConflict = 'match_plan_id,posicion_label';
      } else {
        onConflict = 'matchup_id,posicion_label';
      }

      const { data, error } = await supabaseServer
        .from('tactical_role_cards')
        .upsert(sanitized, { onConflict })
        .select('*')
        .single();

      if (error) {
        console.error('[API /api/tactica/role-cards POST] Error Supabase:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      results.push(data);
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/tactica/role-cards POST] Error inesperado:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
