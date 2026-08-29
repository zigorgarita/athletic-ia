import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { createProvider } from '@/lib/ai/provider';
import { SYSTEM_PROMPT_BASE, generateRivalScoutingPlan, RivalScoutingPromptContext } from '@/lib/ai/prompts';

import { fetchRelevantKnowledge } from '@/lib/ai/knowledgeRetriever';

export const maxDuration = 120; // 120s timeout para análisis exhaustivo con Gemini

export async function POST(req: Request) {
  try {
    // 1. Validar autorización de cuerpo técnico
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Acceso no autorizado a generación de scouting IA.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clubId, seasonId, rivalName, season } = body;

    if (!clubId || !seasonId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (clubId, seasonId).' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServerClient();

    // 2. Obtener datos del Club Rival si no vienen en el body
    let resolvedRivalName = rivalName;
    if (!resolvedRivalName) {
      const { data: clubData } = await supabaseServer
        .from('clubs')
        .select('nombre')
        .eq('id', clubId)
        .maybeSingle();
      resolvedRivalName = clubData?.nombre || 'Rival';
    }

    // 3. RECUPERAR TODAS LAS OBSERVACIONES APROBADAS E INTEGRADAS DEL RIVAL
    // Localizar documentos analizados del rival (por club_id y/o club_season_id)
    let docQuery = supabaseServer
      .from('club_documents')
      .select('id, nombre, fecha, estado_analisis, club_id, club_season_id');

    if (clubId && seasonId) {
      docQuery = docQuery.or(`club_id.eq.${clubId},club_season_id.eq.${seasonId}`);
    } else if (clubId) {
      docQuery = docQuery.eq('club_id', clubId);
    } else if (seasonId) {
      docQuery = docQuery.eq('club_season_id', seasonId);
    }

    const { data: docs } = await docQuery;
    const analyzedDocs = (docs || []).filter(d => d.estado_analisis === 'analizado');
    const analyzedDocIds = analyzedDocs.map(d => d.id);

    let rawObs: Record<string, unknown>[] = [];

    // Fuente única de verdad: Consultar exclusivamente observaciones con status = 'aprobado' en club_report_observations
    if (analyzedDocIds.length > 0) {
      // Buscar observaciones aprobadas cuyos document_id pertenezcan a los documentos analizados del rival
      const { data: obsData, error: obsErr } = await supabaseServer
        .from('club_report_observations')
        .select('*')
        .eq('status', 'aprobado')
        .in('document_id', analyzedDocIds);

      if (!obsErr && obsData && obsData.length > 0) {
        rawObs = obsData as Record<string, unknown>[];
      }
    }

    // Respaldo por ámbito club/temporada para observaciones globales validadas (status = 'aprobado')
    if (rawObs.length === 0 && (clubId || seasonId)) {
      let scopeQuery = supabaseServer
        .from('club_report_observations')
        .select('*')
        .eq('status', 'aprobado');

      if (clubId && seasonId) {
        scopeQuery = scopeQuery.or(`club_id.eq.${clubId},club_season_id.eq.${seasonId}`);
      } else if (clubId) {
        scopeQuery = scopeQuery.eq('club_id', clubId);
      } else if (seasonId) {
        scopeQuery = scopeQuery.eq('club_season_id', seasonId);
      }

      const { data: scopeObs, error: scopeErr } = await scopeQuery;
      if (!scopeErr && scopeObs && scopeObs.length > 0) {
        // Filtrar para asegurar que si tienen document_id, este pertenezca a un documento analizado
        rawObs = (scopeObs as Record<string, unknown>[]).filter(o => {
          if (!o.document_id) return true;
          return analyzedDocIds.includes(o.document_id as string);
        });
      }
    }

    // Mapear observaciones al formato estructurado de scouting
    const approvedObservations = rawObs.map((r: Record<string, unknown>) => ({
      id: (r.id as string) || '',
      categoria: (r.category as string) || 'general',
      contenido: (r.content as string) || '',
      fuente: (r.source_type as string) || 'texto',
      pagina: (r.page as number) || 1,
      evidenciaOriginal: (r.original_evidence as string) || undefined,
      confianza: (r.confidence as string) || 'alta',
      prioridad: (r.priority as string) || 'normal',
      esPropuestaAnalista: Boolean(r.is_analyst_proposal),
      rivalPlayerName: (r.rival_player_name as string) || undefined,
      rivalPlayerDorsal: (r.rival_player_dorsal as string) || undefined,
      rivalPlayerPosition: (r.rival_player_position as string) || undefined,
      rivalPlayerThreatLevel: (r.rival_player_threat_level as string) || undefined,
      documentName: (r.document_name as string) || undefined,
      documentDate: (r.document_date as string) || undefined,
    }));

    // Obtener nombres únicos de los documentos fuente
    const reportSourcesLabels = Array.from(
      new Set(
        [
          ...(analyzedDocs || []).map(d => d.nombre),
          ...approvedObservations.map(o => o.documentName).filter(Boolean) as string[]
        ]
      )
    );

    // 4. RECUPERAR MODELO DE JUEGO DEL RIVAL (si existe en club_play_models)
    const { data: playModelData } = await supabaseServer
      .from('club_play_models')
      .select('*')
      .eq('club_season_id', seasonId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5. RECUPERAR INFORME DEL MÍSTER (si existe en club_reports)
    const { data: misterReportData } = await supabaseServer
      .from('club_reports')
      .select('*')
      .eq('club_season_id', seasonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Validar si existe al menos alguna fuente de conocimiento
    const totalSources = approvedObservations.length + (playModelData ? 1 : 0) + (misterReportData ? 1 : 0);
    if (totalSources === 0) {
      return NextResponse.json(
        {
          error: `No hay observaciones aprobadas, ni modelo de juego, ni informe del míster para ${resolvedRivalName}. Sube primero un PDF y aprueba observaciones en la pestaña Documentos.`
        },
        { status: 400 }
      );
    }

    // 7. RECUPERAR CONOCIMIENTO TÁCTICO RELEVANTE Y PRECEDENTES DE AITOR
    const relevantKnowledge = await fetchRelevantKnowledge(supabaseServer, {
      systemOwn: '1-4-2-3-1',
      systemRival: (playModelData?.sistema_principal as string) || undefined,
      includePrecedents: true,
      limit: 8
    });

    // 8. ENSAMBLAR CONTEXTO DEL SCOUTING
    const promptCtx: RivalScoutingPromptContext = {
      rivalName: resolvedRivalName,
      season: season || '2026-27',
      rivalSystem: (playModelData?.sistema_principal as string) || undefined,
      rivalPlayModel: playModelData || null,
      misterReport: misterReportData || null,
      approvedObservations,
      relevantKnowledge,
      reportSourcesLabels,
    };

    // 9. EJECUTAR LLAMADA A GEMINI MEDIANTE EL PROVEEDOR OFICIAL
    const provider = createProvider();
    const promptText = generateRivalScoutingPlan(promptCtx);

    const aiResponse = await provider.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT_BASE },
        { role: 'user', content: promptText },
      ],
      { temperature: 0.2 } // Baja temperatura para rigor analítico y cero alucinaciones
    );

    if (!aiResponse || !aiResponse.content) {
      throw new Error('La IA no devolvió ninguna respuesta.');
    }

    // 9. PARSEAR Y VALIDAR JSON DE RESPUESTA
    let cleanJson = aiResponse.content.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsedScouting: Record<string, unknown>;
    try {
      parsedScouting = JSON.parse(cleanJson);
    } catch {
      console.error('[generate-ai-scouting] Error parseando JSON de Gemini. Respuesta RAW:', cleanJson.slice(0, 500));
      throw new Error('La respuesta generada por la IA no tiene un formato JSON válido.');
    }

    // 10. GENERAR RESÚMENES PARA LAS COLUMNAS CLÁSICAS DE club_ai_reports
    const fortalezasStr = parsedScouting.comoAtacarles
      ? `Interpretación táctica: ${(parsedScouting.comoAtacarles as Record<string, unknown>)?.capaB_interpretacion || ''}\nPropuesta Indautxu: ${(parsedScouting.comoAtacarles as Record<string, unknown>)?.capaC_propuestaIndautxu || ''}`
      : null;

    const debilidadesStr = Array.isArray(parsedScouting.debilidadesExplotar)
      ? (parsedScouting.debilidadesExplotar as Record<string, unknown>[]).map(d => `- ${d.aspecto || 'Debilidad'}: ${d.capaA_evidencia || ''} ➔ Plan Indautxu: ${d.capaC_propuestaIndautxu || ''}`).join('\n')
      : null;

    const amenazasStr = Array.isArray(parsedScouting.amenazasPrincipales)
      ? (parsedScouting.amenazasPrincipales as Record<string, unknown>[]).map(a => `- [${a.peligro || 'alto'}] ${a.jugador || ''} (${a.posicion || ''}): ${a.capaA_evidencia || ''} ➔ Consigna: ${a.capaC_propuestaIndautxu || ''}`).join('\n')
      : null;

    const comoAtacarlesStr = parsedScouting.comoAtacarles
      ? `EVIDENCIA RIVAL: ${((parsedScouting.comoAtacarles as Record<string, unknown>)?.capaA_evidencias as string[] || []).join('; ')}\n\nPLAN INDAUTXU (3º Hombre / Cuadrado): ${(parsedScouting.comoAtacarles as Record<string, unknown>)?.capaC_propuestaIndautxu || ''}`
      : null;

    const comoDefenderlesStr = parsedScouting.comoDefenderles
      ? `EVIDENCIA RIVAL: ${((parsedScouting.comoDefenderles as Record<string, unknown>)?.capaA_evidencias as string[] || []).join('; ')}\n\nORGANIZACIÓN DEFENSIVA (Bloque Medio 1-4-1-3-2 / Bloque Bajo 1-4-4-2): ${(parsedScouting.comoDefenderles as Record<string, unknown>)?.capaC_propuestaIndautxu || ''}`
      : null;

    const riesgosStr = Array.isArray(parsedScouting.riesgosDelPlan)
      ? (parsedScouting.riesgosDelPlan as string[]).map(r => `- ${r}`).join('\n')
      : null;

    const alertasStr = parsedScouting.abpDefensivo
      ? `ABP RIVAL: ${((parsedScouting.abpDefensivo as Record<string, unknown>)?.capaA_evidencias as string[] || []).join('; ')}\nPlan defensivo Indautxu: ${(parsedScouting.abpDefensivo as Record<string, unknown>)?.capaC_propuestaIndautxu || ''}`
      : null;

    const planRecomendadoStr = (parsedScouting.resumenEjecutivo as string) || 'Plan táctico de partido ajustado contra el rival.';

    // 11. COMPROBAR SI YA EXISTEN INFORMES PREVIOS PARA ESTABLECER EL TIPO ('Informe inicial' vs 'Actualización')
    const { count: prevReportsCount } = await supabaseServer
      .from('club_ai_reports')
      .select('id', { count: 'exact', head: true })
      .eq('club_season_id', seasonId);

    const reportType = (prevReportsCount || 0) > 0 ? 'Actualización' : 'Informe inicial';

    // 12. GUARDAR EN SUPABASE VÍA EXEC_SECURE_UPSERT (ROL STAFF)
    const staffPasskey = process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

    const payload = {
      club_season_id: seasonId,
      tipo: reportType,
      fecha: new Date().toISOString().split('T')[0],
      informe_completo: JSON.stringify(parsedScouting), // Almacena el JSON estructurado completo con trazabilidad
      fortalezas: fortalezasStr,
      debilidades: debilidadesStr,
      jugadores_clave: amenazasStr,
      como_atacarles: comoAtacarlesStr,
      como_defenderles: comoDefenderlesStr,
      riesgos: riesgosStr,
      plan_recomendado: planRecomendadoStr,
      alertas: alertasStr,
      editado_por_mister: false,
    };

    const { data: upsertData, error: upsertErr } = await supabaseServer.rpc('exec_secure_upsert', {
      target_table: 'club_ai_reports',
      payload,
      conflict_columns: null, // Inserta un nuevo registro para conservar el historial de versiones
      staff_passkey: staffPasskey,
    });

    if (upsertErr) {
      console.error('[generate-ai-scouting] Error guardando informe en club_ai_reports:', upsertErr);
      return NextResponse.json(
        {
          success: true,
          scouting: parsedScouting,
          warning: `El análisis se generó pero no se pudo guardar en la base de datos: ${upsertErr.message}`,
        }
      );
    }

    return NextResponse.json({
      success: true,
      scouting: parsedScouting,
      reportId: (upsertData as Record<string, unknown>)?.id || null,
      tipo: reportType,
      totalObservacionesUsadas: approvedObservations.length,
      documentosFuentes: reportSourcesLabels,
    });
  } catch (error: unknown) {
    console.error('[generate-ai-scouting] Error general:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error procesando generación de scouting IA.' },
      { status: 500 }
    );
  }
}
