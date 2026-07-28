import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { TacticalLineupReportSelection } from '@/types';
import { verifyServerAuthorization } from '@/lib/auth-server';

function normalizeClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const isGuid = (val?: string) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export async function POST(req: Request) {
  try {
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error || 'Acceso no autorizado a informes de scouting.' }, { status: 401 });
    }

    const body = await req.json();
    const { lineupId, clubId, seasonId, rivalName } = body;

    const supabaseServer = getSupabaseServerClient();

    let targetClubId: string | null = isGuid(clubId) ? (clubId as string) : null;
    let resolutionWarning: string | null = null;

    // 1. Si vienen juntos clubId y rivalName, verificar incongruencias entre ambos
    if (targetClubId && rivalName && typeof rivalName === 'string' && rivalName.trim()) {
      const { data: targetClub, error: targetClubErr } = await supabaseServer
        .from('clubs')
        .select('id, nombre')
        .eq('id', targetClubId)
        .maybeSingle();

      if (targetClubErr) {
        console.error('Error al verificar clubId en servidor:', targetClubErr);
        resolutionWarning = `Error verificando clubId: ${targetClubErr.message}`;
      } else if (targetClub) {
        const normTarget = normalizeClubName(targetClub.nombre);
        const normRivalInput = normalizeClubName(rivalName);
        if (normTarget !== normRivalInput) {
          console.warn(`[AUTH/SCOUTING] Incongruencia detectada: clubId '${targetClubId}' es '${targetClub.nombre}' pero rivalName es '${rivalName}'.`);
          targetClubId = null;
          resolutionWarning = `Incongruencia entre clubId ('${targetClub.nombre}') y rivalName ('${rivalName}') suministrados.`;
        }
      } else {
        targetClubId = null;
        resolutionWarning = `El clubId '${clubId}' no existe en el catálogo de clubes.`;
      }
    }

    // 2. Si no tenemos un targetClubId válido pero viene rivalName, realizar resolución exacta normalizada
    if (!targetClubId && rivalName && typeof rivalName === 'string' && rivalName.trim()) {
      const { data: allClubs, error: clubsErr } = await supabaseServer
        .from('clubs')
        .select('id, nombre');

      if (clubsErr) {
        console.error('Error al consultar catálogo de clubes en servidor:', clubsErr);
        resolutionWarning = `Error al consultar catálogo de clubes: ${clubsErr.message}`;
      } else {
        const normRivalInput = normalizeClubName(rivalName);
        const exactMatches = (allClubs || []).filter(c => normalizeClubName(c.nombre) === normRivalInput);

        if (exactMatches.length === 1) {
          targetClubId = exactMatches[0].id;
        } else if (exactMatches.length > 1) {
          resolutionWarning = `Múltiples coincidencias exactas (${exactMatches.length}) en catálogo de clubes para '${rivalName}'. Se omitió vinculación automática.`;
        } else {
          resolutionWarning = `No se encontró coincidencia exacta en el catálogo de clubes para el rival '${rivalName}'.`;
        }
      }
    }

    // 3. Confirmar que seasonId corresponde realmente a club_season_id del rival si ambos están presentes
    let validSeasonId: string | null = isGuid(seasonId) ? (seasonId as string) : null;
    if (validSeasonId && targetClubId) {
      const { data: seasonCheck, error: seasonErr } = await supabaseServer
        .from('club_seasons')
        .select('id')
        .eq('id', validSeasonId)
        .eq('club_id', targetClubId)
        .maybeSingle();

      if (seasonErr) {
        console.warn('Error al verificar temporada del club:', seasonErr);
      } else if (!seasonCheck) {
        console.warn(`[SCOUTING] La temporada '${validSeasonId}' no pertenece al club '${targetClubId}'. Se ignoró filtro por temporada.`);
        validSeasonId = null;
      }
    }

    // 4. Cargar selecciones relacionales de la pizarra si existe lineupId
    let selections: TacticalLineupReportSelection[] = [];
    if (lineupId && isGuid(lineupId)) {
      const { data: selData, error: selErr } = await supabaseServer
        .from('tactical_lineup_report_selections')
        .select('*')
        .eq('tactical_lineup_id', lineupId);

      if (!selErr && selData) {
        selections = selData as TacticalLineupReportSelection[];
      }
    }

    // 5. Cargar observaciones aprobadas únicamente de documentos cuyo estado_analisis sea 'analizado'
    let rawObs: Record<string, unknown>[] = [];
    if (targetClubId || validSeasonId) {
      // Obtenemos los documentos analizados para este club / temporada con su extraccion_json
      let docQuery = supabaseServer
        .from('club_documents')
        .select('id, estado_analisis, extraccion_json, club_id, club_season_id, nombre, fecha');

      if (targetClubId) docQuery = docQuery.eq('club_id', targetClubId);
      if (validSeasonId) docQuery = docQuery.eq('club_season_id', validSeasonId);

      const { data: docs } = await docQuery;

      // Documentos válidos analizados (o legacy donde estado_analisis aún sea NULL tras migración inicial)
      const analyzedDocs = (docs || []).filter(d => d.estado_analisis === 'analizado' || d.estado_analisis === null);
      const analyzedDocIds = analyzedDocs.map(d => d.id);

      if (analyzedDocIds.length > 0 || (docs || []).length === 0) {
        let obsQuery = supabaseServer
          .from('club_report_observations')
          .select('*')
          .eq('status', 'aprobado');

        if (targetClubId) {
          obsQuery = obsQuery.eq('club_id', targetClubId);
        }
        if (validSeasonId) {
          obsQuery = obsQuery.eq('club_season_id', validSeasonId);
        }
        if (analyzedDocIds.length > 0) {
          obsQuery = obsQuery.in('document_id', analyzedDocIds);
        }

        const { data: obsData, error: obsErr } = await obsQuery;
        if (!obsErr && obsData && obsData.length > 0) {
          rawObs = obsData as Record<string, unknown>[];
        } else if (analyzedDocs.length > 0) {
          // Fallback resiliente: Extraer las observaciones aprobadas del extraccion_json de los documentos analizados
          analyzedDocs.forEach(doc => {
            if (doc.extraccion_json) {
              const ext = doc.extraccion_json as Record<string, unknown>;
              const docName = doc.nombre || 'Documento de Scouting';
              const metadatos = ext.metadatos as Record<string, unknown> | undefined;
              const docDate = (metadatos?.fechaInforme as string) || doc.fecha || null;

              const obsRival = ext.observacionesRival as Record<string, Record<string, unknown>[]> | undefined;
              if (obsRival) {
                Object.keys(obsRival).forEach(cat => {
                  (obsRival[cat] || []).forEach((item: Record<string, unknown>) => {
                    rawObs.push({
                      id: item.id || `obs_${rawObs.length+1}`,
                      document_id: doc.id,
                      club_id: doc.club_id,
                      club_season_id: doc.club_season_id,
                      document_name: docName,
                      document_date: docDate,
                      category: cat,
                      content: item.contenido,
                      source_type: item.fuente || 'texto',
                      page: item.pagina || 1,
                      original_evidence: item.evidenciaOriginal || null,
                      confidence: item.confianza || 'alta',
                      status: 'aprobado',
                      priority: item.prioridad || 'normal',
                      is_analyst_proposal: false
                    });
                  });
                });
              }

              const propsAnalista = ext.propuestasDelAnalista as Record<string, Record<string, unknown>[]> | undefined;
              if (propsAnalista) {
                Object.keys(propsAnalista).forEach(cat => {
                  (propsAnalista[cat] || []).forEach((item: Record<string, unknown>) => {
                    rawObs.push({
                      id: item.id || `prop_${rawObs.length+1}`,
                      document_id: doc.id,
                      club_id: doc.club_id,
                      club_season_id: doc.club_season_id,
                      document_name: docName,
                      document_date: docDate,
                      category: cat,
                      content: item.contenido,
                      source_type: item.fuente || 'texto',
                      page: item.pagina || 1,
                      original_evidence: item.evidenciaOriginal || null,
                      confidence: item.confianza || 'alta',
                      status: 'aprobado',
                      priority: item.prioridad || 'normal',
                      is_analyst_proposal: true
                    });
                  });
                });
              }

              const amenazas = ext.amenazasJugadores as Record<string, unknown>[] | undefined;
              if (amenazas) {
                amenazas.forEach((t: Record<string, unknown>) => {
                  const fortalezasStr = Array.isArray(t.fortalezas) ? t.fortalezas.join(', ') : (t.fortalezas as string || '');
                  rawObs.push({
                    id: `threat_${t.dorsal || rawObs.length+1}`,
                    document_id: doc.id,
                    club_id: doc.club_id,
                    club_season_id: doc.club_season_id,
                    document_name: docName,
                    document_date: docDate,
                    category: 'jugadorRival',
                    content: `[Dorsal ${t.dorsal || 'S/N'}] ${t.nombre || 'Jugador Rival'} (${t.posicionHabitual || 'Posición'}): ${t.observaciones}. Fortalezas: ${fortalezasStr}. ${t.consignaEspecifica || ''}`,
                    source_type: 'texto',
                    page: t.pagina || 11,
                    original_evidence: t.evidenciaOriginal || null,
                    confidence: 'alta',
                    status: 'aprobado',
                    priority: t.nivelPeligro === 'critico' || t.nivelPeligro === 'alto' ? 'clave' : 'alta',
                    is_analyst_proposal: false,
                    rival_player_name: t.nombre || null,
                    rival_player_dorsal: t.dorsal || null,
                    rival_player_position: t.posicionHabitual || null,
                    rival_player_threat_level: t.nivelPeligro || 'alto'
                  });
                });
              }
            }
          });
        }
      }
    }

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
      targetClubId,
      resolutionWarning,
    });
  } catch (error: unknown) {
    console.error('Error en API report-context:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || 'Error procesando consulta de informe.' }, { status: 500 });
  }
}
