import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { TacticalLineupReportSelection } from '@/types';

export async function POST(req: Request) {
  try {
    const passkeyHeader = req.headers.get('x-coach-staff-passkey') || req.headers.get('x-staff-passkey');
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

    const { data: obsData, error: obsErr } = await obsQuery;
    if (obsErr) {
      console.warn('Advertencia consultando observaciones aprobadas:', obsErr);
    }

    const rawObs = obsData || [];

    // Mapear observaciones al tipo Observation para el frontend
    const approvedObservations = rawObs.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      contenido: r.content as string,
      deduccionIA: undefined,
      propuestaIndautxu: undefined,
      fuente: (r.source_type as 'texto' | 'imagen' | 'tabla' | 'nota') || 'texto',
      pagina: (r.page as number) || 1,
      evidenciaOriginal: (r.original_evidence as string) || undefined,
      confianza: (r.confidence as 'alta' | 'media' | 'baja') || 'alta',
      estado: 'aprobado' as const,
      prioridad: (r.priority as 'baja' | 'normal' | 'alta' | 'clave') || 'normal',
      categoria: (r.category as string) || 'general',
      esPropuestaAnalista: Boolean(r.is_analyst_proposal),
      rivalPlayerName: (r.rival_player_name as string) || undefined,
      rivalPlayerDorsal: (r.rival_player_dorsal as string) || undefined,
      rivalPlayerPosition: (r.rival_player_position as string) || undefined,
      rivalPlayerThreatLevel: (r.rival_player_threat_level as 'bajo' | 'medio' | 'alto' | 'critico') || undefined,
      documentId: (r.document_id as string) || undefined,
      documentName: (r.document_name as string) || undefined,
      documentDate: (r.document_date as string) || undefined,
    }));

    // Obtener nombres de documentos fuente para etiquetas
    const documentNames = Array.from(
      new Set(rawObs.map((r: Record<string, unknown>) => r.document_name as string).filter(Boolean))
    );

    return NextResponse.json({
      success: true,
      selections,
      approvedObservations,
      reportSourcesLabels: documentNames,
    });
  } catch (error: unknown) {
    console.error('Error en API report-context:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || 'Error procesando consulta de informe.' }, { status: 500 });
  }
}
