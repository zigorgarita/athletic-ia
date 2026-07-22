import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyServerAuthorization } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error || 'Acceso no autorizado a operaciones del cuerpo técnico.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body;

    const supabaseServer = getSupabaseServerClient();

    if (action === 'save_approved_observations') {
      const { rows } = payload;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No se recibieron filas de observaciones para guardar.' }, { status: 400 });
      }

      // Inserción en servidor mediante Supabase Service Client
      const { data, error } = await supabaseServer
        .from('club_report_observations')
        .insert(rows)
        .select('id');

      if (error) throw error;

      return NextResponse.json({ success: true, count: data?.length || 0 });
    }

    if (action === 'toggle_report_selection') {
      const { lineupId, documentId, selected } = payload;
      if (!lineupId || !documentId) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos (lineupId, documentId).' }, { status: 400 });
      }

      // 1. Comprobar si existe la combinación tactical_lineup_id + document_id
      const { data: existing, error: findErr } = await supabaseServer
        .from('tactical_lineup_report_selections')
        .select('id')
        .eq('tactical_lineup_id', lineupId)
        .eq('document_id', documentId)
        .maybeSingle();

      if (findErr) throw findErr;

      let resData;
      if (existing && existing.id) {
        // 2. Hacer update si existe
        const { data: updateData, error: updateErr } = await supabaseServer
          .from('tactical_lineup_report_selections')
          .update({
            selected,
            selected_via: 'staff_passkey_server',
            selected_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id');

        if (updateErr) throw updateErr;
        resData = updateData;
      } else {
        // 3. Hacer insert si no existe
        const { data: insertData, error: insertErr } = await supabaseServer
          .from('tactical_lineup_report_selections')
          .insert({
            tactical_lineup_id: lineupId,
            document_id: documentId,
            selected,
            selected_via: 'staff_passkey_server',
            selected_at: new Date().toISOString(),
          })
          .select('id');

        if (insertErr) throw insertErr;
        resData = insertData;
      }

      return NextResponse.json({ success: true, data: resData });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error en API manage-observations:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || 'Error procesando solicitud.' }, { status: 500 });
  }
}
