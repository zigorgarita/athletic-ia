import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-coach-staff-passkey') || req.headers.get('x-staff-passkey');
    const validPasskey = process.env.COACH_STAFF_PASSKEY;

    if (!validPasskey || passkeyHeader !== validPasskey) {
      return NextResponse.json({ error: 'Acceso no autorizado a operaciones del cuerpo técnico.' }, { status: 401 });
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

      const { data, error } = await supabaseServer
        .from('tactical_lineup_report_selections')
        .upsert(
          {
            tactical_lineup_id: lineupId,
            document_id: documentId,
            selected,
            selected_via: 'staff_passkey_server',
            selected_at: new Date().toISOString(),
          },
          { onConflict: 'tactical_lineup_id,document_id' }
        )
        .select('id');

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error en API manage-observations:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || 'Error procesando solicitud.' }, { status: 500 });
  }
}
