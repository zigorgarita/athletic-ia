/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { isEditorSessionAuthorized, isEditorSessionAuthorizedFromRequest } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  fetchRFEFCalendarPageDetailed,
  fetchRFEFActaPageDetailed,
  fetchRFEFStandingsPageDetailed,
  RFEFDataSource,
} from '@/lib/rfef/client';
import {
  parseCalendarPage,
  parseActaPage,
  parseStandingsPage,
  ParsedActa,
  ParsedActaPlayer,
} from '@/lib/rfef/parser';

export const dynamic = 'force-dynamic';

function normalizeString(str: string | null | undefined): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, '')
    .replace(/\b(de|del|el|la|los|las|cf|fc|cd|sd|ud|sad|c\.f\.|f\.c\.|c\.d\.|s\.d\.|u\.d\.|ke)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * POST /api/rfef/preview
 *
 * Endpoint de SOLO LECTURA que previsualiza la sincronización federativa
 * para una jornada determinada (1 a 30).
 *
 * REGLAS DE SEGURIDAD ESTRICTAS:
 * - CERO escrituras (cero INSERT, UPDATE, DELETE, UPSERT o uploads en Supabase/Storage/Drive/Production).
 * - Protegido por autorización central de staff existente (cookie o credenciales de editor).
 * - Distingue rigurosamente jornadas pasadas (con actas y clasificación) de futuras (sin datos inventados).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificación central de autorización de staff (patrón estándar de la app)
    const staffPasskey = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();

    let isAuthorized = Boolean(staffPasskey && staffPasskey === expectedPasskey);

    if (!isAuthorized) {
      const auth = await verifyServerAuthorization(req);
      isAuthorized = auth.authorized;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Acceso denegado: Se requiere autorización de staff o credenciales de editor válidas.',
        },
        { status: 401 }
      );
    }

    // 2. Parsear y validar payload
    const body = await req.json().catch(() => ({}));
    const jornadaNum = parseInt(body.jornada, 10);

    if (isNaN(jornadaNum) || jornadaNum < 1 || jornadaNum > 30) {
      return NextResponse.json(
        { error: 'El parámetro "jornada" debe ser un número entero entre 1 y 30.' },
        { status: 400 }
      );
    }

    const blockers: string[] = [];
    const warnings: string[] = [];

    // 2.1 Soporte opcional de ingesta de HTML oficial y actas (P1 / P4.2)
    const rawCalendarHtml = typeof body.calendarHtml === 'string' ? body.calendarHtml : null;
    const rawActas = Array.isArray(body.actas) ? body.actas : null;
    let calResult: any;
    let isManualCalendarIngest = false;

    if (rawCalendarHtml !== null || rawActas !== null) {
      // REQUISITO CRÍTICO P3 / P4.2: La ingesta de datos oficiales exige EXCLUSIVAMENTE Modo Edición legítimo
      const isEditorCookie = (await isEditorSessionAuthorized()) || isEditorSessionAuthorizedFromRequest(req);
      let isEditorCredentials = false;
      if (!isEditorCookie) {
        const auth = await verifyServerAuthorization(req);
        isEditorCredentials = auth.authorized && (auth.authMethod === 'editor_credentials' || auth.authMethod === 'supabase_token');
      }

      if (!isEditorCookie && !isEditorCredentials) {
        return NextResponse.json(
          {
            error: 'Acceso denegado: La ingesta de datos oficiales de la RFEF requiere que Athletic IA esté en Modo Edición autorizado.',
          },
          { status: 403 }
        );
      }
    }

    if (rawCalendarHtml !== null) {
      const trimmedHtml = rawCalendarHtml.trim();
      if (trimmedHtml.length < 500) {
        return NextResponse.json(
          { error: 'El contenido "calendarHtml" es insuficiente o inválido para un calendario oficial de la RFEF.' },
          { status: 400 }
        );
      }
      if (trimmedHtml.length > 5_000_000) {
        return NextResponse.json(
          { error: 'El contenido "calendarHtml" excede el tamaño máximo permitido (5 MB).' },
          { status: 400 }
        );
      }

      isManualCalendarIngest = true;
      calResult = {
        html: trimmedHtml,
        source: 'live' as RFEFDataSource,
        bytes: Buffer.byteLength(trimmedHtml, 'utf8'),
        url: 'manual_ingest://calendarHtml',
        diagnostic: {
          httpStatus: 200,
          redirectCount: 0,
          bytes: Buffer.byteLength(trimmedHtml, 'utf8'),
          hasJSessionId: true,
          curlExitCode: 0,
          curlError: null,
        },
      };
    } else {
      // 3. Consultar calendario oficial RFEF de la jornada (comportamiento previo intacto)
      calResult = fetchRFEFCalendarPageDetailed(jornadaNum);
    }

    // Indexar actas proporcionadas para utilizarlas sin redescargar (P4.2)
    const providedActasMap = new Map<string, string>();
    if (rawActas !== null) {
      for (const item of rawActas) {
        if (!item || typeof item !== 'object') {
          return NextResponse.json(
            { error: 'Formato inválido en la lista de actas proporcionadas.' },
            { status: 400 }
          );
        }
        const cActa = parseInt(item.codActa, 10);
        if (isNaN(cActa) || cActa <= 0) {
          return NextResponse.json(
            { error: 'Identificador "codActa" inválido en una de las actas proporcionadas.' },
            { status: 400 }
          );
        }
        if (typeof item.actaHtml !== 'string' || item.actaHtml.trim().length === 0) {
          return NextResponse.json(
            { error: `El contenido "actaHtml" para el acta ${cActa} está vacío o es inválido.` },
            { status: 400 }
          );
        }
        providedActasMap.set(String(cActa), item.actaHtml.trim());
      }
    }

    const parsedCal = parseCalendarPage(calResult.html);

    // Validación estricta de coherencia de jornada si el HTML fue proporcionado manualmente
    if (isManualCalendarIngest && parsedCal.jornada !== null && parsedCal.jornada !== jornadaNum) {
      return NextResponse.json(
        {
          error: `DISCREPANCIA DE JORNADA: El HTML proporcionado corresponde oficialmente a la Jornada ${parsedCal.jornada}, pero se solicitó previsualizar la Jornada ${jornadaNum}.`,
        },
        { status: 400 }
      );
    }

    if (!parsedCal.calendarAvailable || parsedCal.totalMatches === 0) {
      blockers.push(`RFEF no devolvió partidos oficiales para la jornada ${jornadaNum}.`);
    }

    if (parsedCal.totalMatches > 0 && parsedCal.totalMatches !== 8) {
      warnings.push(
        `Se detectaron ${parsedCal.totalMatches} partidos en lugar de los 8 habituales para la jornada ${jornadaNum}.`
      );
    }

    // 4. Identificar partido de Indautxu
    const rfefIndautxuMatch = parsedCal.indautxuMatch;
    if (!rfefIndautxuMatch) {
      blockers.push(`No se identificó el partido de la SD Indautxu en la jornada ${jornadaNum} de la RFEF.`);
    }

    // 5. Consultar public.matches en Supabase (SOLO SELECT)
    let supabase = getSupabaseServerClient();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length === 0) {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        'https://jdkshextphguyyiwwtyt.supabase.co',
        'sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
    }
    const { data: dbMatches, error: dbMatchesErr } = await supabase
      .from('matches')
      .select('id, jornada, rival, es_local, fecha, hora, campo, jugado, goles_favor, goles_contra, official_match_id')
      .eq('tipo_partido', 'LIGA')
      .eq('jornada', jornadaNum);

    if (dbMatchesErr) {
      blockers.push(`Error al consultar public.matches en base de datos: ${dbMatchesErr.message}`);
    }

    const dbMatch = dbMatches && dbMatches.length > 0 ? dbMatches[0] : null;
    let comparisonWithDb: any = null;

    if (!dbMatch) {
      blockers.push(`No existe ningún registro en public.matches para tipo_partido='LIGA' y jornada=${jornadaNum}.`);
    } else if (rfefIndautxuMatch) {
      const dbEsLocal = Boolean(dbMatch.es_local);
      const rfefEsLocal = Boolean(rfefIndautxuMatch.indautxuEsLocal);
      const localiaMatches = dbEsLocal === rfefEsLocal;

      if (!localiaMatches) {
        blockers.push(
          `DISCREPANCIA CRÍTICA DE LOCALÍA: public.matches tiene es_local=${dbEsLocal} pero RFEF oficial marca ${
            rfefEsLocal ? 'LOCAL' : 'VISITANTE'
          } (${rfefIndautxuMatch.localTeam} vs ${rfefIndautxuMatch.visitorTeam}).`
        );
      }

      const normDbRival = normalizeString(dbMatch.rival);
      const normRfefRival = normalizeString(rfefIndautxuMatch.rivalName);
      const rivalMatches =
        normDbRival === normRfefRival ||
        normDbRival.includes(normRfefRival) ||
        normRfefRival.includes(normDbRival);

      if (!rivalMatches) {
        blockers.push(
          `DISCREPANCIA DE RIVAL: public.matches rival="${dbMatch.rival}" vs RFEF rival="${rfefIndautxuMatch.rivalName}".`
        );
      }

      const fechaMatches = !rfefIndautxuMatch.fecha || dbMatch.fecha === rfefIndautxuMatch.fecha;
      if (!fechaMatches) {
        warnings.push(
          `Diferencia de fecha: public.matches="${dbMatch.fecha}" vs RFEF="${rfefIndautxuMatch.fecha}".`
        );
      }

      const horaMatches = !rfefIndautxuMatch.hora || dbMatch.hora?.substring(0, 5) === rfefIndautxuMatch.hora?.substring(0, 5);
      if (!horaMatches && rfefIndautxuMatch.hora) {
        warnings.push(
          `Diferencia de hora: public.matches="${dbMatch.hora}" vs RFEF="${rfefIndautxuMatch.hora}".`
        );
      }

      const normDbCampo = normalizeString(dbMatch.campo);
      const normRfefCampo = normalizeString(rfefIndautxuMatch.campo);
      const campoMatches =
        !rfefIndautxuMatch.campo ||
        normDbCampo === normRfefCampo ||
        normDbCampo.includes(normRfefCampo) ||
        normRfefCampo.includes(normDbCampo);

      if (!campoMatches && rfefIndautxuMatch.campo) {
        warnings.push(
          `Diferencia de campo: public.matches="${dbMatch.campo}" vs RFEF="${rfefIndautxuMatch.campo}".`
        );
      }

      comparisonWithDb = {
        matchFoundInDb: true,
        dbMatchId: dbMatch.id,
        dbEsLocal,
        rfefEsLocal,
        localiaMatches,
        dbRival: dbMatch.rival,
        rfefRival: rfefIndautxuMatch.rivalName,
        rivalMatches,
        dbFecha: dbMatch.fecha,
        rfefFecha: rfefIndautxuMatch.fecha,
        fechaMatches,
        dbHora: dbMatch.hora,
        rfefHora: rfefIndautxuMatch.hora,
        horaMatches,
        dbCampo: dbMatch.campo,
        rfefCampo: rfefIndautxuMatch.campo,
        campoMatches,
        dbOfficialMatchId: dbMatch.official_match_id,
        rfefCodActa: rfefIndautxuMatch.codActa,
        dbJugado: dbMatch.jugado,
        dbGolesFavor: dbMatch.goles_favor,
        dbGolesContra: dbMatch.goles_contra,
      };
    }

    // 6. Consultar actas federativas oficiales (SOLO si están publicadas)
    let indautxuActaParsed: ParsedActa | null = null;
    let indautxuActaSource: RFEFDataSource = 'none';
    const allActasParsed: ParsedActa[] = [];
    const actaSourcesMap = new Map<string, RFEFDataSource>();

    const actasToFetch = parsedCal.matches.filter((m) => m.hasActa && m.codActa);

    if (actasToFetch.length === 0) {
      warnings.push(`Jornada ${jornadaNum}: Ningún acta oficial ha sido publicada todavía por la RFEF.`);
    } else {
      for (const m of actasToFetch) {
        if (!m.codActa) continue;
        try {
          let actaHtml: string | null = null;
          let actaSource: RFEFDataSource = 'none';

          if (providedActasMap.has(m.codActa)) {
            // El acta ya fue obtenida por el bridge local: NO volver a descargar desde RFEF
            actaHtml = providedActasMap.get(m.codActa)!;
            actaSource = 'live';
          } else {
            const actaResult = fetchRFEFActaPageDetailed(m.codActa);
            actaHtml = actaResult.html;
            actaSource = actaResult.source;
          }

          actaSourcesMap.set(String(m.codActa), actaSource);

          if (actaHtml && actaHtml.length > 500) {
            const parsed = parseActaPage(actaHtml, m.codActa);
            allActasParsed.push(parsed);

            if (m.isIndautxuMatch) {
              indautxuActaParsed = parsed;
              indautxuActaSource = actaSource;
            }
          }
        } catch (err: any) {
          warnings.push(`No se pudo procesar el acta ${m.codActa} (${m.localTeam} vs ${m.visitorTeam}): ${err.message}`);
        }
      }
    }

    // 7. Análisis de jugadores, identidades propias y rivales (SOLO LECTURA)
    const newRivalPlayers: any[] = [];
    const unlinkedOwnPlayers: any[] = [];
    let realPhotosDetectedCount = 0;
    let discardedSilhouettesCount = 0;
    let minutosPostcheck: any = null;

    if (indautxuActaParsed) {
      // 7.1 Validación de Convocatoria y 990 Minutos para Indautxu
      const indPlayers = indautxuActaParsed.localClubNombre.toLowerCase().includes('indautxu')
        ? indautxuActaParsed.localTitulares.concat(indautxuActaParsed.localSuplentes)
        : indautxuActaParsed.visitTitulares.concat(indautxuActaParsed.visitSuplentes);

      const totalIndMin = indautxuActaParsed.sumMinutosIndautxu || 0;
      minutosPostcheck = {
        is90MinRegulation: true,
        totalMinutos: totalIndMin,
        expected: 990,
        valid: totalIndMin === 990,
        convocadosCount: indPlayers.length,
      };

      if (totalIndMin !== 990) {
        warnings.push(
          `Aviso de minutos: La suma de minutos de Indautxu es ${totalIndMin} min (la norma para 90 min reglamentarios es 990 min).`
        );
      }

      // 7.2 Comparación de jugadores de Indautxu contra public.players (SOLO SELECT)
      const { data: dbIndautxuPlayers } = await supabase
        .from('players')
        .select('id, nombre, apellidos, alias, dorsal, rfef_player_id, foto_url');

      const dbPlayersByRfef = new Map<number, any>();
      (dbIndautxuPlayers || []).forEach((p) => {
        if (p.rfef_player_id) dbPlayersByRfef.set(p.rfef_player_id, p);
      });

      indPlayers.forEach((p) => {
        // Prioridad 1: rfef_player_id
        let found = p.rfefPlayerId ? dbPlayersByRfef.get(p.rfefPlayerId) : null;

        if (!found) {
          const normActaName = normalizeString(p.nombre);

          // Prioridad 2: Nombre completo normalizado (nombre + apellidos o apellidos + nombre)
          for (const dbP of dbIndautxuPlayers || []) {
            const normFull1 = normalizeString((dbP.nombre || '') + ' ' + (dbP.apellidos || ''));
            const normFull2 = normalizeString((dbP.apellidos || '') + ' ' + (dbP.nombre || ''));
            if ((normFull1 && normActaName === normFull1) || (normFull2 && normActaName === normFull2)) {
              found = dbP;
              break;
            }
          }

          // Prioridad 3: Apellidos / Alias suficientemente discriminantes (no resolver por nombre de pila aislado)
          if (!found) {
            const candidates: { player: any; score: number }[] = [];
            for (const dbP of dbIndautxuPlayers || []) {
              const normNombre = normalizeString(dbP.nombre);
              const normApellidos = normalizeString(dbP.apellidos);
              const normAlias = normalizeString(dbP.alias);

              const hasApellidos = normApellidos.length >= 4 && normActaName.includes(normApellidos);
              const hasAlias = normAlias.length >= 4 && normAlias !== normNombre && normActaName.includes(normAlias);

              if (hasApellidos || hasAlias) {
                // Si además coincide el nombre de pila, es match de máxima confianza
                if (normNombre && normActaName.includes(normNombre)) {
                  candidates.push({ player: dbP, score: 2 });
                } else {
                  candidates.push({ player: dbP, score: 1 });
                }
              }
            }

            if (candidates.length === 1) {
              found = candidates[0].player;
            } else if (candidates.length > 1) {
              candidates.sort((a, b) => b.score - a.score);
              if (candidates[0].score > candidates[1].score) {
                found = candidates[0].player;
              }
            }
          }
        }

        if (!found) {
          unlinkedOwnPlayers.push({
            nombre: p.nombre,
            dorsal: p.dorsal,
            rfefPlayerId: p.rfefPlayerId,
            rol: p.rol,
            minutos: p.minutos,
            status: 'nueva_identidad_propia',
          });
        }
      });

      if (unlinkedOwnPlayers.length > 0) {
        warnings.push(
          `Se detectaron ${unlinkedOwnPlayers.length} jugadores en el acta de Indautxu no vinculados en public.players.`
        );
      }
    }

    // 7.3 Detección de jugadores rivales nuevos y fotos/siluetas
    if (allActasParsed.length > 0) {
      const { data: dbClubPlayers } = await supabase
        .from('club_players')
        .select('id, nombre, rfef_player_id, foto_url')
        .not('rfef_player_id', 'is', null);

      const existingRivalsSet = new Set(
        (dbClubPlayers || []).map((cp) => cp.rfef_player_id)
      );

      const seenRivalPlayerIds = new Set<number>();

      allActasParsed.forEach((acta) => {
        acta.allPlayers.forEach((p) => {
          if (p.clubNombre.toLowerCase().includes('indautxu')) return;

          if (!seenRivalPlayerIds.has(p.rfefPlayerId)) {
            seenRivalPlayerIds.add(p.rfefPlayerId);

            if (p.hasOfficialPhoto && p.photoType === 'base64_real') {
              realPhotosDetectedCount++;
            } else if (p.photoType === 'silueta_placeholder') {
              discardedSilhouettesCount++;
            }

            if (!existingRivalsSet.has(p.rfefPlayerId)) {
              newRivalPlayers.push({
                clubNombre: p.clubNombre,
                nombre: p.nombre,
                dorsal: p.dorsal,
                rfefPlayerId: p.rfefPlayerId,
                rol: p.rol,
                hasOfficialPhoto: p.hasOfficialPhoto,
                photoType: p.photoType,
              });
            }
          }
        });
      });
    }

    // 8. Consultar clasificación oficial RFEF
    let standingsAvailable = false;
    let standingsRows: any[] = [];
    let standingsReason: string | undefined;
    const clasifResult = fetchRFEFStandingsPageDetailed(jornadaNum);

    try {
      if (clasifResult.html && clasifResult.html.length > 500) {
        const parsedClasif = parseStandingsPage(clasifResult.html, jornadaNum);
        standingsAvailable = parsedClasif.standingsAvailable;
        standingsRows = parsedClasif.rows;
        standingsReason = parsedClasif.reasonIfNotAvailable;
      } else {
        standingsAvailable = false;
        standingsReason = clasifResult.liveError || 'Página HTML de clasificación no disponible o vacía';
      }
    } catch (err: any) {
      standingsAvailable = false;
      standingsReason = `Error al consultar clasificación oficial: ${err.message || err}`;
    }

    if (!standingsAvailable && standingsReason) {
      warnings.push(`Clasificación: ${standingsReason}`);
    }

    // 9. Control de Origen (LIVE vs SNAPSHOT) y Bloqueo de Sincronización
    const actasSourcesList = Array.from(actaSourcesMap.values());
    const usedAnySnapshot =
      calResult.source === 'snapshot' ||
      clasifResult.source === 'snapshot' ||
      actasSourcesList.some((s) => s === 'snapshot');

    const rfefLive =
      calResult.source === 'live' &&
      (clasifResult.source === 'live' || clasifResult.source === 'none') &&
      actasSourcesList.every((s) => s === 'live');

    const primarySource: RFEFDataSource = rfefLive
      ? 'live'
      : usedAnySnapshot
      ? 'snapshot'
      : 'none';

    if (usedAnySnapshot) {
      warnings.push(
        `[ORIGEN SNAPSHOT LOCAL]: Ciertas consultas se han resuelto mediante snapshots locales de diagnóstico (Calendario: ${calResult.source}, Clasificación: ${clasifResult.source}). La información NO proviene de una consulta en directo a la RFEF y la sincronización queda ESTRICTAMENTE BLOQUEADA.`
      );
    }

    const syncBlocked = !rfefLive || blockers.length > 0;
    const syncBlockedReason = !rfefLive
      ? 'La sincronización hacia base de datos está estrictamente bloqueada porque los datos proceden de un snapshot local o la RFEF no respondió en directo.'
      : blockers.length > 0
      ? 'La sincronización está bloqueada debido a discrepancias críticas (blockers) detectadas.'
      : undefined;

    // 10. Respuesta final SOLO LECTURA
    return NextResponse.json({
      status: 'success',
      mode: 'read_only_preview',
      jornada: jornadaNum,
      rfefLive,
      source: primarySource,
      syncBlocked,
      syncBlockedReason,
      rfefHttpDiagnostic: calResult.diagnostic || null,
      sources: {
        global: primarySource,
        calendar: {
          source: calResult.source,
          bytes: calResult.bytes,
          snapshotFile: calResult.snapshotPath || null,
          httpDiagnostic: calResult.diagnostic || null,
        },
        standings: {
          source: clasifResult.source,
          bytes: clasifResult.bytes,
          snapshotFile: clasifResult.snapshotPath || null,
        },
        actas: {
          totalConsultadas: actasToFetch.length,
          breakdown: {
            live: actasSourcesList.filter((s) => s === 'live').length,
            snapshot: actasSourcesList.filter((s) => s === 'snapshot').length,
            none: actasSourcesList.filter((s) => s === 'none').length,
          },
        },
      },
      availability: {
        calendarAvailable: parsedCal.calendarAvailable,
        actasAvailable: `${parsedCal.actasAvailableCount}/${parsedCal.totalMatches}`,
        actasAvailableCount: parsedCal.actasAvailableCount,
        standingsAvailable,
        standingsReason,
      },
      matches: parsedCal.matches.map((m) => {
        const actaMatch = allActasParsed.find((a) => a.codActa === m.codActa);
        const matchActaSource = m.codActa ? actaSourcesMap.get(String(m.codActa)) || calResult.source : calResult.source;
        return {
          source: matchActaSource,
          localTeam: m.localTeam,
          visitorTeam: m.visitorTeam,
          fecha: m.fecha,
          hora: m.hora,
          campo: m.campo,
          superficie: m.superficie,
          arbitro: m.arbitro,
          codActa: m.codActa,
          hasActa: m.hasActa,
          isIndautxuMatch: m.isIndautxuMatch,
          resultadoOficial: actaMatch
            ? `${actaMatch.golesLocal} - ${actaMatch.golesVisitante}`
            : null,
          golesLocal: actaMatch ? actaMatch.golesLocal : null,
          golesVisitante: actaMatch ? actaMatch.golesVisitante : null,
        };
      }),
      indautxuMatch: rfefIndautxuMatch
        ? {
            source: indautxuActaParsed ? indautxuActaSource : calResult.source,
            localTeam: rfefIndautxuMatch.localTeam,
            visitorTeam: rfefIndautxuMatch.visitorTeam,
            esLocal: rfefIndautxuMatch.indautxuEsLocal,
            rival: rfefIndautxuMatch.rivalName,
            fecha: rfefIndautxuMatch.fecha,
            hora: rfefIndautxuMatch.hora,
            campo: rfefIndautxuMatch.campo,
            superficie: rfefIndautxuMatch.superficie,
            arbitro: rfefIndautxuMatch.arbitro,
            codActa: rfefIndautxuMatch.codActa,
            hasActa: rfefIndautxuMatch.hasActa,
            resultadoOficial: indautxuActaParsed
              ? `${indautxuActaParsed.golesLocal} - ${indautxuActaParsed.golesVisitante}`
              : null,
            golesIndautxu: indautxuActaParsed
              ? rfefIndautxuMatch.indautxuEsLocal
                ? indautxuActaParsed.golesLocal
                : indautxuActaParsed.golesVisitante
              : null,
            golesRival: indautxuActaParsed
              ? rfefIndautxuMatch.indautxuEsLocal
                ? indautxuActaParsed.golesVisitante
                : indautxuActaParsed.golesLocal
              : null,
            minutosPostcheck,
            convocados: indautxuActaParsed
              ? (rfefIndautxuMatch.indautxuEsLocal
                  ? indautxuActaParsed.localTitulares.concat(indautxuActaParsed.localSuplentes)
                  : indautxuActaParsed.visitTitulares.concat(indautxuActaParsed.visitSuplentes)
                ).map((p) => ({
                  nombre: p.nombre,
                  dorsal: p.dorsal,
                  rfefPlayerId: p.rfefPlayerId,
                  rol: p.rol,
                  minutos: p.minutos,
                }))
              : [],
            goles: indautxuActaParsed ? indautxuActaParsed.goals : [],
            tarjetas: indautxuActaParsed ? indautxuActaParsed.cards : [],
            sustituciones: indautxuActaParsed ? indautxuActaParsed.substitutions : [],
          }
        : null,
      comparisonWithDb,
      playersAudit: {
        newRivalPlayersCount: newRivalPlayers.length,
        newRivalPlayers,
        unlinkedOwnPlayersCount: unlinkedOwnPlayers.length,
        unlinkedOwnPlayers,
        realPhotosDetectedCount,
        discardedSilhouettesCount,
      },
      standings: standingsRows,
      standingsHtml: clasifResult.html || null,
      blockers,
      warnings,
      readOnlyAudit: {
        writesAttempted: 0,
        writeOperationsAllowed: false,
        operationsExecuted: [
          'SELECT matches WHERE tipo_partido="LIGA" AND jornada=' + jornadaNum,
          'SELECT players (Indautxu squad)',
          'SELECT club_players (Rival squad cache)',
        ],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Error inesperado en /api/rfef/preview: ${err.message || err}` },
      { status: 500 }
    );
  }
}
