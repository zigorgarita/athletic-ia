/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ============================================================================
 * LIB/RFEF/APPLIER.TS — MOTOR DE PERSISTENCIA RFEF
 * ============================================================================
 * Aplica una jornada completa (8 actas) a Supabase de forma idempotente.
 * REGLAS ABSOLUTAS:
 * - Solo escribe en tablas RFEF: official_matches, club_match_player_stats,
 *   club_players (altas rivales), public.matches (UPDATE), match_player_stats.
 * - Requiere service_role (official_matches tiene REVOKE para anon/authenticated).
 * - Idempotencia por constraints de BD + prechecks explícitos.
 * - 70692442 ya existente → YA_EXISTENTE_NO_DUPLICADA, nunca error.
 * - Si faltan actas, ABORTAR TODO antes de escribir nada.
 * ============================================================================
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { parseCalendarPage, parseActaPage, ParsedActa } from './parser';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface ActaInput {
  codActa: number;
  actaHtml: string;
}

export type ActaApplyStatus =
  | 'CREADA'
  | 'YA_EXISTENTE_NO_DUPLICADA'
  | 'ERROR';

export interface ActaApplyResult {
  codActa: number;
  status: ActaApplyStatus;
  message: string;
  localTeam?: string;
  visitorTeam?: string;
  resultado?: string;
  officialMatchId?: string | null;
  statsInserted?: number;
  playersCreated?: number;
}

export interface ApplyJornadaResult {
  ok: boolean;
  jornada: number;
  abortReason?: string;
  actas: ActaApplyResult[];
  totalStatsInserted: number;
  totalPlayersCreated: number;
  indautxuMatchUpdated: boolean;
  indautxuStatsUpserted: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

function normalizeClubName(str: string | null | undefined): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, '')
    .replace(/\b(de|del|el|la|los|las|cf|fc|cd|sd|ud|sad|ke)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function abortResult(jornada: number, reason: string): ApplyJornadaResult {
  return {
    ok: false,
    jornada,
    abortReason: reason,
    actas: [],
    totalStatsInserted: 0,
    totalPlayersCreated: 0,
    indautxuMatchUpdated: false,
    indautxuStatsUpserted: 0,
    errors: [reason],
  };
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export async function applyJornadaRFEF(params: {
  supabase: SupabaseClient;
  jornada: number;
  calendarHtml: string;
  actas: ActaInput[];
  dbMatchId: string;
}): Promise<ApplyJornadaResult> {
  const { supabase, jornada, calendarHtml, actas, dbMatchId } = params;

  // PASO 1: Exactamente 8 actas — ley absoluta
  if (!actas || actas.length !== 8) {
    return abortResult(
      jornada,
      `J${jornada} = las 8 actas o ninguna. Recibidas: ${actas?.length ?? 0}. ABORTADO.`
    );
  }

  // PASO 2: Parsear calendario
  const parsedCal = parseCalendarPage(calendarHtml);
  if (!parsedCal.calendarAvailable || parsedCal.totalMatches < 8) {
    return abortResult(
      jornada,
      `Calendario no devolvió 8 partidos (devolvió ${parsedCal.totalMatches}). ABORTADO.`
    );
  }

  // PASO 3: Parsear las 8 actas
  const parsedActasMap = new Map<number, ParsedActa>();
  for (const input of actas) {
    try {
      const parsed = parseActaPage(input.actaHtml, String(input.codActa));
      parsedActasMap.set(input.codActa, parsed);
    } catch (e: any) {
      return abortResult(
        jornada,
        `Error parseando acta ${input.codActa}: ${e?.message || 'Error desconocido'}. ABORTADO.`
      );
    }
  }

  // PASO 4: Verificar coincidencia de codActas con el calendario
  const calCodActas = parsedCal.matches
    .filter((m) => m.codActa)
    .map((m) => parseInt(m.codActa!, 10));
  const inputCodActas = new Set(actas.map((a) => a.codActa));
  for (const calCod of calCodActas) {
    if (!inputCodActas.has(calCod)) {
      return abortResult(
        jornada,
        `Acta ${calCod} está en el calendario RFEF pero no fue proporcionada. ABORTADO.`
      );
    }
  }

  // PASO 5: Precheck de duplicados en official_matches
  const allCodActas = actas.map((a) => a.codActa);
  const { data: existingMatches, error: existingErr } = await supabase
    .from('official_matches')
    .select('id, rfef_cod_acta')
    .in('rfef_cod_acta', allCodActas);
  if (existingErr) {
    return abortResult(
      jornada,
      `Error precheck official_matches: ${existingErr.message}. ABORTADO.`
    );
  }
  const existingByCodeActa = new Map<number, string>();
  for (const em of existingMatches || []) {
    existingByCodeActa.set(em.rfef_cod_acta, em.id);
  }

  // PASO 6: Resolver los 16 clubes por rfef_club_id
  const { data: allClubs, error: clubsErr } = await supabase
    .from('clubs')
    .select('id, nombre, rfef_club_id');
  if (clubsErr || !allClubs) {
    return abortResult(jornada, `Error cargando clubs: ${clubsErr?.message || 'Sin datos'}. ABORTADO.`);
  }

  // Mapeo canónico RFEF: Nombre / patrón -> rfef_club_id (DHJ Grupo 2)
  const RFEF_CLUB_ID_PATTERNS: Array<{ regex: RegExp; rfefClubId: number }> = [
    { regex: /indautxu/i, rfefClubId: 33836524 },
    { regex: /leioa/i, rfefClubId: 23289700 },
    { regex: /cultural|leonesa/i, rfefClubId: 33836521 },
    { regex: /alav[eé]s/i, rfefClubId: 205484 },
    { regex: /arratia/i, rfefClubId: 33836523 },
    { regex: /santutxu/i, rfefClubId: 205567 },
    { regex: /danok/i, rfefClubId: 900361152 },
    { regex: /mareo/i, rfefClubId: 33836522 },
    { regex: /valladolid/i, rfefClubId: 205459 },
    { regex: /beto[nñ]o/i, rfefClubId: 23289793 },
    { regex: /eibar/i, rfefClubId: 205540 },
    { regex: /unionistas/i, rfefClubId: 207449 },
    { regex: /antiguoko/i, rfefClubId: 205603 },
    { regex: /sociedad/i, rfefClubId: 205597 },
    { regex: /athletic/i, rfefClubId: 205514 },
    { regex: /logro[nñ][eé]s/i, rfefClubId: 205744 },
  ];

  const clubByRfefClubId = new Map<number, { id: string; nombre: string; rfef_club_id: number }>();
  const clubByNormName = new Map<string, { id: string; nombre: string; rfef_club_id: number | null }>();

  for (const c of allClubs) {
    if (c.rfef_club_id) {
      clubByRfefClubId.set(Number(c.rfef_club_id), { id: c.id, nombre: c.nombre, rfef_club_id: Number(c.rfef_club_id) });
    }
    clubByNormName.set(normalizeClubName(c.nombre), { id: c.id, nombre: c.nombre, rfef_club_id: c.rfef_club_id ? Number(c.rfef_club_id) : null });
  }

  function resolveClub(nombre: string): { id: string; nombre: string; rfef_club_id?: number | null } | null {
    // 1. Intentar resolver directamente por rfef_club_id mediante patrón canónico
    for (const pat of RFEF_CLUB_ID_PATTERNS) {
      if (pat.regex.test(nombre)) {
        const found = clubByRfefClubId.get(pat.rfefClubId);
        if (found) return found;
      }
    }

    // 2. Fallback: normalización de nombre
    const norm = normalizeClubName(nombre);
    if (clubByNormName.has(norm)) {
      const match = clubByNormName.get(norm)!;
      if (match.rfef_club_id && clubByRfefClubId.has(match.rfef_club_id)) {
        return clubByRfefClubId.get(match.rfef_club_id)!;
      }
      return match;
    }

    const tokens = norm.split(' ').filter((t) => t.length >= 4);
    for (const entry of Array.from(clubByNormName.entries())) {
      if (tokens.length > 0 && tokens.every((t) => entry[0].includes(t))) {
        const match = entry[1];
        if (match.rfef_club_id && clubByRfefClubId.has(match.rfef_club_id)) {
          return clubByRfefClubId.get(match.rfef_club_id)!;
        }
        return match;
      }
    }
    return null;
  }

  // Verificar que todos los equipos de los 8 partidos se resuelven
  for (const entry of Array.from(parsedActasMap.entries())) {
    const codActa = entry[0];
    const parsedActa = entry[1];
    const resolvedLocal = resolveClub(parsedActa.localClubNombre);
    if (!resolvedLocal) {
      return abortResult(jornada, `Club local "${parsedActa.localClubNombre}" (acta ${codActa}) no resuelto por rfef_club_id. ABORTADO.`);
    }
    const resolvedVisitor = resolveClub(parsedActa.visitorClubNombre);
    if (!resolvedVisitor) {
      return abortResult(jornada, `Club visitante "${parsedActa.visitorClubNombre}" (acta ${codActa}) no resuelto por rfef_club_id. ABORTADO.`);
    }
  }

  // PASO 7: Cargar club_seasons
  const { data: allSeasons, error: seasonsErr } = await supabase
    .from('club_seasons')
    .select('id, club_id');
  if (seasonsErr) {
    return abortResult(jornada, `Error cargando club_seasons: ${seasonsErr.message}. ABORTADO.`);
  }
  const seasonByClubId = new Map<string, string>();
  for (const s of allSeasons || []) {
    if (!seasonByClubId.has(s.club_id)) seasonByClubId.set(s.club_id, s.id);
  }

  // PASO 8: Cargar rfef_player_id existentes en club_players
  const { data: existingPlayers, error: playersErr } = await supabase
    .from('club_players')
    .select('id, rfef_player_id');
  if (playersErr) {
    return abortResult(jornada, `Error cargando club_players: ${playersErr.message}. ABORTADO.`);
  }
  const clubPlayerByRfefId = new Map<number, string>();
  for (const p of existingPlayers || []) {
    if (p.rfef_player_id) clubPlayerByRfefId.set(p.rfef_player_id, p.id);
  }

  // ===== TODOS LOS PRECHECKS SUPERADOS — INICIO DE ESCRITURAS =====

  const actaResults: ActaApplyResult[] = [];
  let totalStatsInserted = 0;
  let totalPlayersCreated = 0;
  const globalErrors: string[] = [];

  const indautxuCalMatch = parsedCal.matches.find((m) => m.isIndautxuMatch);
  const indautxuCodActa = indautxuCalMatch?.codActa
    ? parseInt(indautxuCalMatch.codActa, 10)
    : null;

  // PASO 9: Procesar cada una de las 8 actas
  for (const actaInput of actas) {
    const { codActa } = actaInput;
    const parsedActa = parsedActasMap.get(codActa)!;
    const calMatch = parsedCal.matches.find((m) => m.codActa && parseInt(m.codActa, 10) === codActa);
    const localClub = resolveClub(parsedActa.localClubNombre)!;
    const visitClub = resolveClub(parsedActa.visitorClubNombre)!;
    const resultado = `${parsedActa.golesLocal}-${parsedActa.golesVisitante}`;

    // ¿Ya existía?
    if (existingByCodeActa.has(codActa)) {
      const existingId = existingByCodeActa.get(codActa)!;
      actaResults.push({
        codActa,
        status: 'YA_EXISTENTE_NO_DUPLICADA',
        message: `${codActa} — YA EXISTENTE — NO DUPLICADO — official_matches.id = ${existingId}`,
        localTeam: parsedActa.localClubNombre,
        visitorTeam: parsedActa.visitorClubNombre,
        resultado,
        officialMatchId: existingId,
        statsInserted: 0,
        playersCreated: 0,
      });
      continue;
    }

    // INSERT en official_matches
    let officialMatchId: string | null = null;
    const { data: newMatch, error: matchInsertErr } = await supabase
      .from('official_matches')
      .insert({
        rfef_cod_acta: codActa,
        temporada: '2026-27',
        competicion: 'División de Honor Juvenil',
        grupo: 'Grupo 2',
        jornada,
        fecha: parsedActa.fecha || calMatch?.fecha || null,
        hora: parsedActa.hora || calMatch?.hora || null,
        local_club_id: localClub.id,
        visitor_club_id: visitClub.id,
        goles_local: parsedActa.golesLocal,
        goles_visitante: parsedActa.golesVisitante,
        jugado: true,
        campo: parsedActa.campo || calMatch?.campo || null,
        superficie: parsedActa.superficie || null,
        arbitro: parsedActa.arbitro || calMatch?.arbitro || null,
        asistentes: parsedActa.asistentes || null,
        oficiales: null,
        source: 'rfef',
        last_synced_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (matchInsertErr || !newMatch) {
      const errMsg = matchInsertErr?.message || 'Sin respuesta';
      // ¿Race condition — ya existe?
      if (errMsg.includes('uq_official_matches_acta') || errMsg.includes('duplicate key')) {
        const { data: recMatch } = await supabase
          .from('official_matches').select('id').eq('rfef_cod_acta', codActa).single();
        actaResults.push({
          codActa, status: 'YA_EXISTENTE_NO_DUPLICADA',
          message: `${codActa} — YA EXISTENTE (race condition) — NO DUPLICADO — id = ${recMatch?.id || 'N/D'}`,
          localTeam: parsedActa.localClubNombre, visitorTeam: parsedActa.visitorClubNombre,
          resultado, officialMatchId: recMatch?.id || null, statsInserted: 0, playersCreated: 0,
        });
        continue;
      }
      const errFull = `Acta ${codActa}: Error INSERT official_matches: ${errMsg}`;
      globalErrors.push(errFull);
      actaResults.push({ codActa, status: 'ERROR', message: errFull,
        localTeam: parsedActa.localClubNombre, visitorTeam: parsedActa.visitorClubNombre,
        resultado, statsInserted: 0, playersCreated: 0 });
      continue;
    }

    officialMatchId = newMatch.id;
    let actaStatsInserted = 0;
    let actaPlayersCreated = 0;
    let actaWarning: string | null = null;

    // Procesar ambos equipos para club_match_player_stats
    const teamsToProcess = [
      { players: [...parsedActa.localTitulares, ...parsedActa.localSuplentes], clubId: localClub.id, clubNombre: localClub.nombre, isLocal: true },
      { players: [...parsedActa.visitTitulares, ...parsedActa.visitSuplentes], clubId: visitClub.id, clubNombre: visitClub.nombre, isLocal: false },
    ];

    for (const team of teamsToProcess) {
      // Excluir Indautxu (sus stats van a match_player_stats)
      if (team.clubNombre.toLowerCase().includes('indautxu')) continue;

      const clubSeasonId = seasonByClubId.get(team.clubId);
      if (!clubSeasonId) {
        const w = `Sin club_season para ${team.clubNombre}. Stats omitidas.`;
        actaWarning = w;
        globalErrors.push(`Acta ${codActa}: ${w}`);
        continue;
      }

      // Insertar jugadores nuevos en club_players
      const newPlayerInserts: any[] = [];
      for (const p of team.players) {
        if (!clubPlayerByRfefId.has(p.rfefPlayerId)) {
          newPlayerInserts.push({
            club_season_id: clubSeasonId,
            rfef_player_id: p.rfefPlayerId,
            nombre: p.nombre,
            dorsal: null,
            origen: 'rfef',
          });
        }
      }
      if (newPlayerInserts.length > 0) {
        const { data: insertedPlayers, error: insertPlayersErr } = await supabase
          .from('club_players').insert(newPlayerInserts).select('id, rfef_player_id');
        if (insertPlayersErr) {
          globalErrors.push(`Acta ${codActa} ${team.clubNombre}: Warning insert jugadores: ${insertPlayersErr.message}`);
        } else {
          for (const ip of insertedPlayers || []) {
            clubPlayerByRfefId.set(ip.rfef_player_id, ip.id);
            actaPlayersCreated++;
          }
        }
      }

      // Insertar stats
      const statsToInsert: any[] = [];
      for (const p of team.players) {
        const clubPlayerId = clubPlayerByRfefId.get(p.rfefPlayerId);
        if (!clubPlayerId) {
          globalErrors.push(`Acta ${codActa}: rfef_player_id=${p.rfefPlayerId} (${p.nombre}) sin club_player_id. Stat omitida.`);
          continue;
        }
        const teamSubs = parsedActa.substitutions.filter((s) => s.esLocal === team.isLocal);
        let minutoEntrada: number | null = null;
        let minutoSalida: number | null = null;
        if (p.rol === 'Titular') {
          const subOut = teamSubs.find((s) => s.saleDorsal === p.dorsal);
          if (subOut) minutoSalida = subOut.minuto;
        } else {
          const subIn = teamSubs.find((s) => s.entraDorsal === p.dorsal);
          if (subIn) minutoEntrada = subIn.minuto;
        }
        const firstName = (p.nombre || '').split(' ')[0];
        const playerCards = parsedActa.cards.filter(
          (c) => c.esLocal === team.isLocal && firstName && c.nombre?.includes(firstName)
        );
        const amarillas = Math.min(playerCards.filter((c) => c.tipo === 'Amarilla' || c.tipo === 'Doble Amarilla').length, 2);
        const dobleAmarilla = playerCards.some((c) => c.tipo === 'Doble Amarilla');
        const roja = !dobleAmarilla && playerCards.some((c) => c.tipo === 'Roja Directa');
        const playerGoals = parsedActa.goals.filter(
          (g) => g.esLocal === team.isLocal && !g.isPropia && firstName && g.autor?.includes(firstName)
        ).length;

        statsToInsert.push({
          official_match_id: officialMatchId,
          club_player_id: clubPlayerId,
          club_id: team.clubId,
          dorsal_partido: p.dorsal,
          convocado: true,
          titular: p.rol === 'Titular',
          minuto_entrada: minutoEntrada,
          minuto_salida: minutoSalida,
          minutos: p.minutos,
          goles: playerGoals,
          amarillas,
          doble_amarilla: dobleAmarilla,
          roja,
          motivo_sancion: null,
          source: 'rfef',
          last_synced_at: new Date().toISOString(),
        });
      }

      if (statsToInsert.length > 0) {
        const { error: statsErr } = await supabase.from('club_match_player_stats').insert(statsToInsert);
        if (statsErr) {
          globalErrors.push(`Acta ${codActa} ${team.clubNombre}: Error INSERT stats: ${statsErr.message}`);
        } else {
          actaStatsInserted += statsToInsert.length;
        }
      }
    }

    totalStatsInserted += actaStatsInserted;
    totalPlayersCreated += actaPlayersCreated;
    actaResults.push({
      codActa,
      status: actaWarning ? 'ERROR' : 'CREADA',
      message: actaWarning
        ? `${codActa} — CREADA CON ADVERTENCIAS — ${actaWarning}`
        : `${codActa} — CREADA — id=${officialMatchId} — ${actaStatsInserted} stats — ${actaPlayersCreated} jugadores nuevos`,
      localTeam: parsedActa.localClubNombre,
      visitorTeam: parsedActa.visitorClubNombre,
      resultado,
      officialMatchId,
      statsInserted: actaStatsInserted,
      playersCreated: actaPlayersCreated,
    });
  }

  // PASO 10: UPDATE public.matches (partido Indautxu)
  let indautxuMatchUpdated = false;
  if (indautxuCodActa && dbMatchId) {
    const indautxuOfficialMatchId =
      existingByCodeActa.get(indautxuCodActa) ||
      actaResults.find((r) => r.codActa === indautxuCodActa)?.officialMatchId ||
      null;
    const indautxuActa = parsedActasMap.get(indautxuCodActa);
    if (indautxuOfficialMatchId && indautxuActa) {
      const isLocal = indautxuActa.localClubNombre.toLowerCase().includes('indautxu');
      const golesFavor = isLocal ? indautxuActa.golesLocal : indautxuActa.golesVisitante;
      const golesContra = isLocal ? indautxuActa.golesVisitante : indautxuActa.golesLocal;
      const { error: matchUpdateErr } = await supabase
        .from('matches')
        .update({ jugado: true, goles_favor: golesFavor, goles_contra: golesContra, official_match_id: indautxuOfficialMatchId })
        .eq('id', dbMatchId);
      if (matchUpdateErr) {
        globalErrors.push(`Error UPDATE public.matches (${dbMatchId}): ${matchUpdateErr.message}`);
      } else {
        indautxuMatchUpdated = true;
      }
    }
  }

  // PASO 11: Upsert match_player_stats (18 jugadores Indautxu)
  let indautxuStatsUpserted = 0;
  if (indautxuCodActa && dbMatchId) {
    const indautxuActa = parsedActasMap.get(indautxuCodActa);
    if (indautxuActa) {
      const indIsLocal = indautxuActa.localClubNombre.toLowerCase().includes('indautxu');
      const indPlayers = indIsLocal
        ? [...indautxuActa.localTitulares, ...indautxuActa.localSuplentes]
        : [...indautxuActa.visitTitulares, ...indautxuActa.visitSuplentes];
      const { data: ownPlayers, error: ownErr } = await supabase
        .from('players')
        .select('id, nombre, apellidos, alias, rfef_player_id');
      if (ownErr) {
        globalErrors.push(`Error cargando public.players: ${ownErr.message}`);
      } else {
        const ownPlayerByRfefId = new Map<number, string>();
        for (const op of ownPlayers || []) {
          if (op.rfef_player_id) ownPlayerByRfefId.set(Number(op.rfef_player_id), op.id);
        }
        const statsUpserts: any[] = [];
        for (const p of indPlayers) {
          let playerId = ownPlayerByRfefId.get(p.rfefPlayerId);

          // Fallback de identidad cuando rfef_player_id aún no está vinculado
          if (!playerId) {
            const normActaName = normalizeClubName(p.nombre);
            const candidates: { id: string; fullName: string; score: number }[] = [];

            for (const op of ownPlayers || []) {
              const fullName = `${op.nombre || ''} ${op.apellidos || ''}`.trim();
              const normFull1 = normalizeClubName(fullName);
              const normFull2 = normalizeClubName(`${op.apellidos || ''} ${op.nombre || ''}`);
              const normAlias = normalizeClubName(op.alias || '');

              if (normFull1 === normActaName || normFull2 === normActaName) {
                candidates.push({ id: op.id, fullName, score: 3 });
              } else if (normAlias && normAlias.length >= 4 && normActaName.includes(normAlias)) {
                candidates.push({ id: op.id, fullName, score: 2 });
              }
            }

            if (candidates.length === 1 && candidates[0].score >= 2) {
              // Coincidencia ÚNICA e INEQUÍVOCA -> Asignar y vincular rfef_player_id
              playerId = candidates[0].id;
              await supabase
                .from('players')
                .update({ rfef_player_id: p.rfefPlayerId })
                .eq('id', playerId)
                .is('rfef_player_id', null);
              ownPlayerByRfefId.set(p.rfefPlayerId, playerId);
            } else if (candidates.length > 1) {
              // Ambigüedad: NO asignar automáticamente, reportar bloqueo y pedir revisión
              globalErrors.push(
                `BLOQUEO AMBIGÜEDAD: Jugador RFEF "${p.nombre}" (rfef_id=${p.rfefPlayerId}) coincide con múltiples jugadores (${candidates.map((c) => c.fullName).join(', ')}). No se asigna automáticamente. Revisión requerida.`
              );
              continue;
            } else {
              globalErrors.push(
                `Stats Indautxu: Jugador RFEF "${p.nombre}" (rfef_id=${p.rfefPlayerId}) no encontrado en public.players. Stat omitida.`
              );
              continue;
            }
          }

          const firstName = (p.nombre || '').split(' ')[0];
          const playerCards = indautxuActa.cards.filter(
            (c) => c.esLocal === indIsLocal && firstName && c.nombre?.includes(firstName)
          );
          const tieneAmarilla = playerCards.some((c) => c.tipo === 'Amarilla' || c.tipo === 'Doble Amarilla');
          const tieneRoja = playerCards.some((c) => c.tipo === 'Roja Directa' || c.tipo === 'Doble Amarilla');
          const playerGoals = indautxuActa.goals.filter(
            (g) => g.esLocal === indIsLocal && !g.isPropia && firstName && g.autor?.includes(firstName)
          ).length;
          statsUpserts.push({
            match_id: dbMatchId,
            player_id: playerId,
            titular: p.rol === 'Titular',
            minutos: p.minutos,
            goles: playerGoals,
            asistencias: 0,
            tarjeta_amarilla: tieneAmarilla,
            tarjeta_roja: tieneRoja,
            origen: 'rfef',
          });
        }
        if (statsUpserts.length > 0) {
          const { error: upsertErr } = await supabase
            .from('match_player_stats')
            .upsert(statsUpserts, { onConflict: 'match_id,player_id' });
          if (upsertErr) {
            globalErrors.push(`Error upsert match_player_stats Indautxu: ${upsertErr.message}`);
          } else {
            indautxuStatsUpserted = statsUpserts.length;
          }
        }
      }
    }
  }

  const allActasOk = actaResults.every(
    (r) => r.status === 'CREADA' || r.status === 'YA_EXISTENTE_NO_DUPLICADA'
  );

  return {
    ok: allActasOk && globalErrors.length === 0,
    jornada,
    actas: actaResults,
    totalStatsInserted,
    totalPlayersCreated,
    indautxuMatchUpdated,
    indautxuStatsUpserted,
    errors: globalErrors,
  };
}
