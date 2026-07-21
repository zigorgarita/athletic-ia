import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { TacticalLineupReportSelection } from '@/types';

export async function POST(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-staff-passkey');
    const validPasskey = process.env.COACH_STAFF_PASSKEY;

    if (!validPasskey || passkeyHeader !== validPasskey) {
      return NextResponse.json({ error: 'Acceso no autorizado a informes de scouting.' }, { status: 401 });
    }

    const body = await req.json();
    const { lineupId, clubId, seasonId } = body;

    const supabaseServer = getSupabaseServerClient();

    // 1. Cargar selecciones relacionales de la pizarra si existe lineupId
    let selections: TacticalLineupReportSelection[] = [];
    if (lineupId) {
      const { data: selData, error: selErr } = await supabaseServer
        .from('tactical_lineup_report_selections')
        .select('*')
        .eq('tactical_lineup_id', lineupId);

      if (!selErr && selData) {
        selections = selData as TacticalLineupReportSelection[];
      }
    }

    // 2. Cargar observaciones aprobadas para el club / season
    let obsQuery = supabaseServer
      .from('club_report_observations')
      .select('*')
      .eq('status', 'aprobado');

    if (clubId) {
      obsQuery = obsQuery.eq('club_id', clubId);
    } else if (seasonId) {
      obsQuery = obsQuery.eq('club_season_id', seasonId);
    }

    const { data: obsData, error: obsErr } = await obsQuery.order('created_at', { ascending: false });

    if (obsErr) {
      throw obsErr;
    }

    const rawObsList = obsData || [];

    // 3. Filtrar según selecciones de la pizarra si existen
    const selectedDocIds = new Set(
      selections.filter(s => s.selected && s.document_id).map(s => s.document_id)
    );

    let finalObsList = rawObsList;
    if (selections.length > 0) {
      finalObsList = rawObsList.filter(obs => obs.document_id && selectedDocIds.has(obs.document_id));
    }

    // 4. Mapear observaciones aprobadas y etiquetas de fuentes (sin exponer RAW)
    const approvedObservations = finalObsList.map(item => ({
      id: item.id,
      contenido: item.content,
      fuente: item.source_type,
      pagina: item.page || 1,
      evidenciaOriginal: item.original_evidence || undefined,
      confianza: item.confidence,
      estado: item.status,
      prioridad: item.priority,
      categoria: item.category,
      fechaObservacion: item.observation_date || undefined,
      esPropuestaAnalista: item.is_analyst_proposal,
      rivalPlayerName: item.rival_player_name || undefined,
      rivalPlayerDorsal: item.rival_player_dorsal || undefined,
      rivalPlayerPosition: item.rival_player_position || undefined,
      rivalPlayerThreatLevel: item.rival_player_threat_level || undefined,
      documentId: item.document_id || undefined,
      documentName: item.document_name,
      documentDate: item.document_date || undefined,
    }));

    const sourcesSet = new Set<string>();
    approvedObservations.forEach(o => {
      if (o.documentName) {
        sourcesSet.add(o.documentDate ? `${o.documentName} (${o.documentDate})` : o.documentName);
      }
    });

    return NextResponse.json({
      success: true,
      selections,
      approvedObservations,
      reportSourcesLabels: Array.from(sourcesSet),
    });
  } catch (error: unknown) {
    console.error('Error en API report-context:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error al obtener contexto seguro de informes.' },
      { status: 500 }
    );
  }
}
