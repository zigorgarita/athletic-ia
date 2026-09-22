import 'server-only';
import { fetchDieLigenDelivery, DHJ2_CONTEST_ID } from '@/lib/die-ligen/client';
import { isMatchingDieLigenTeam } from '@/lib/die-ligen/mapping';

export interface DieLiguePlayerStatRow {
  id: string; // player.id estable
  seasonRosterId?: string;
  dorsal: number;
  nombreCompleto: string;
  nombre: string;
  apellidos: string;
  demarcacion: string; // 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero'
  posicionTacticas: string[]; // Ej. ['GK'], ['LCB', 'LB']
  isPortero: boolean;
  minutosJugados: number;
  minutosPosibles: number;
  porcentajeMinutos: number;
  partidosJugados: number;
  titularidades: number;
  convocatorias: number;
  suplencias: number;
  entradasBanquillo: number;
  goles: number;
  golesEncajados?: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  doblesAmarillas: number;
  fotoUrl?: string | null;
}

export interface DieLigueStandingRow {
  posicion: number;
  equipoId: string;
  nombre: string;
  logoUrl?: string | null;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGoles: number;
  puntos: number;
  esIndautxu: boolean;
}

export interface DieLigueCalendarMatch {
  jornada: number;
  gameId?: string;
  fecha: string | null;
  hora: string | null;
  rival: string;
  rivalLogo?: string | null;
  esLocal: boolean;
  campo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  scoreHalftimeHome: number | null;
  scoreHalftimeAway: number | null;
  status: 'FINISHED' | 'TIMINGS_PENDING' | 'IN_PROGRESS' | 'OPEN' | 'NOT_PUBLISHED';
  statusLabel: string;
  disponible: boolean;
  mainVideoUrl?: string | null;
}

export interface DieLigueRivalPlayerRow {
  id: string;
  seasonRosterId?: string;
  dorsal: number;
  nombre: string;
  minutosJugados: number;
  minutosPosibles: number;
  porcentajeMinutos: number;
  partidosJugados: number;
  titularidades: number;
  convocatorias: number;
  suplencias: number;
  entradasBanquillo: number;
  goles: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  asistencias: number;
}

export interface DieLigueRivalInfo {
  id: string;
  nombre: string;
  logoUrl?: string | null;
  partidosContest: number;
  partidosFinished: number;
  players: DieLigueRivalPlayerRow[];
  matches: DieLigueCalendarMatch[];
}

export interface DieLigueTrayectoriaItem {
  jornada: number;
  posicion: number;
  puntos: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  partidosCompletadosJornada: number;
  totalPartidosJornada: number;
  esCompleta: boolean;
  esProvisional: boolean;
}

export interface DieLigueDatosLigaResponse {
  summary: {
    partidosDisputados: number;
    minutosPosibles: number;
    golesFavor: number;
    golesContra: number;
    totalPartidosProcesadosGrupo: number;
    totalPartidosGrupo: number;
    completitudGrupoLabel: string;
  };
  indautxuPlayers: DieLiguePlayerStatRow[];
  standings: DieLigueStandingRow[];
  standingsCompletitud: string;
  indautxuTrayectoria: DieLigueTrayectoriaItem[];
  calendar: DieLigueCalendarMatch[];
  rivals: Array<{
    id: string;
    nombre: string;
    logoUrl?: string | null;
    partidosDisputados: number;
  }>;
}

const INDAUTXU_TEAM_ID = '3f859a44-bb09-46d9-acd5-de7de0ba8aca';

// Helper para categorizar posición táctica
function mapearDemarcacion(posKey?: string): string {
  if (!posKey) return 'Centrocampista';
  const k = posKey.toUpperCase();
  if (k.includes('GK') || k.includes('GOAL') || k.includes('PORTERO')) return 'Portero';
  if (k.includes('CB') || k.includes('BACK') || k.includes('DEF') || k.includes('LB') || k.includes('RB')) return 'Defensa';
  if (k.includes('STRIKER') || k.includes('WING') || k.includes('DEL') || k.includes('EXT') || k.includes('FW')) return 'Delantero';
  return 'Centrocampista';
}

function parseMinute(timeStr?: string, timeSec?: number): number {
  if (timeStr) {
    const clean = timeStr.replace(/[^0-9]/g, '');
    const p = parseInt(clean, 10);
    if (!isNaN(p)) return p;
  }
  if (typeof timeSec === 'number') return Math.floor(timeSec / 60);
  return 0;
}

/**
 * Normaliza de forma unificada y canónica un partido de Die Ligue al formato DieLigueCalendarMatch.
 * Reutilizada idénticamente para Indautxu y para todos los Rivales.
 */
export function mapDieLigueGameToCalendarMatch(
  g: {
    id: string;
    round?: { roundOrderNumber?: number };
    homeTeam?: { id?: string; name?: string; teamLogoUrl?: string };
    awayTeam?: { id?: string; name?: string; teamLogoUrl?: string };
    analysisStatus?: { i18NKey?: string };
    scoreHome?: number | null;
    scoreAway?: number | null;
    gameDate?: string;
    venue_name?: string;
  },
  targetTeamName: string,
  targetShortName?: string,
  venueOverride?: string | null
): DieLigueCalendarMatch {
  const isHome = isMatchingDieLigenTeam(g.homeTeam?.name, targetTeamName, targetShortName);
  const opp = isHome ? g.awayTeam : g.homeTeam;
  const statusKey = g.analysisStatus?.i18NKey || 'OPEN';

  let statusLabel = 'Programado/Pendiente';
  let statusEnum: DieLigueCalendarMatch['status'] = 'OPEN';
  if (statusKey === 'FINISHED') {
    statusLabel = 'Finalizado';
    statusEnum = 'FINISHED';
  } else if (statusKey === 'TIMINGS_PENDING') {
    statusLabel = 'Pendiente de sincronización';
    statusEnum = 'TIMINGS_PENDING';
  } else if (statusKey === 'IN_PROGRESS') {
    statusLabel = 'En proceso de análisis';
    statusEnum = 'IN_PROGRESS';
  }

  let horaStr: string | null = null;
  if (g.gameDate) {
    try {
      const d = new Date(g.gameDate);
      horaStr = d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      });
    } catch {
      horaStr = null;
    }
  }

  const campo =
    venueOverride ||
    g.venue_name ||
    (isHome ? 'Campo Municipal de Iparralde' : null);

  return {
    jornada: g.round?.roundOrderNumber || 0,
    gameId: g.id,
    fecha: g.gameDate || null,
    hora: horaStr,
    rival: opp?.name || 'Rival',
    rivalLogo: opp?.teamLogoUrl || null,
    esLocal: isHome,
    campo,
    scoreHome: g.scoreHome ?? null,
    scoreAway: g.scoreAway ?? null,
    scoreHalftimeHome: null,
    scoreHalftimeAway: null,
    status: statusEnum,
    statusLabel,
    disponible: true,
  };
}

export async function getDieLigueDatosLiga(): Promise<DieLigueDatosLigaResponse> {
  // 1. Obtener calendario del torneo DHJ2
  const contest = await fetchDieLigenDelivery<{
    games?: Array<{
      id: string;
      round?: { roundOrderNumber?: number };
      homeTeam?: { id?: string; name?: string; teamLogoUrl?: string };
      awayTeam?: { id?: string; name?: string; teamLogoUrl?: string };
      analysisStatus?: { i18NKey?: string };
      scoreHome?: number | null;
      scoreAway?: number | null;
      gameDate?: string;
      venue_name?: string;
    }>;
  }>(`/analysis/contest/${DHJ2_CONTEST_ID}`);

  const allGames = contest?.games || [];

  // 2. Partidos del SD Indautxu (usando resolución canónica unificada)
  const indautxuGames = allGames.filter((g) => {
    return (
      g.homeTeam?.id === INDAUTXU_TEAM_ID ||
      g.awayTeam?.id === INDAUTXU_TEAM_ID ||
      isMatchingDieLigenTeam(g.homeTeam?.name, 'SD Indautxu', 'Indautxu') ||
      isMatchingDieLigenTeam(g.awayTeam?.name, 'SD Indautxu', 'Indautxu')
    );
  });

  const indautxuFinishedGames = indautxuGames.filter(
    (g) => g.analysisStatus?.i18NKey === 'FINISHED'
  );

  // 3. Descargar análisis de partidos terminados del Indautxu para estadísticas acumuladas
  interface FullGamePayload {
    gameInfo?: {
      id: string;
      gameDate?: string;
      venue_name?: string;
      scoreHome?: number | null;
      scoreAway?: number | null;
      homeScoreHalftime?: number | null;
      awayScoreHalftime?: number | null;
      mainVideoUrl?: string | null;
      homeTeam?: {
        id: string;
        name: string;
        teamLogoUrl?: string | null;
        players?: Array<{
          id: string;
          playerName: string;
          playerFirstName?: string;
          playerLastName?: string;
          shirtNumber: number;
          starting: boolean;
          seasonRosterId?: string;
        }>;
      };
      awayTeam?: {
        id: string;
        name: string;
        teamLogoUrl?: string | null;
        players?: Array<{
          id: string;
          playerName: string;
          playerFirstName?: string;
          playerLastName?: string;
          shirtNumber: number;
          starting: boolean;
          seasonRosterId?: string;
        }>;
      };
    };
    events?: Array<{
      id: string;
      categoryName: string;
      defensiveEvent: boolean;
      gameTime: number;
      eventTime: number;
      gameTimeString?: string;
      team?: { id: string; name: string };
      teamType?: string;
      selectedPlayers?: Array<{
        tag?: { i18NKey: string };
        player?: { id: string; playerName: string; shirtNumber: number };
      }>;
      selectedLabels?: Array<{
        tag?: { i18NKey: string };
        i18NKey: string;
      }>;
      videos?: Array<{ videoUrl?: string }>;
    }>;
    homeDefensiveGameFormation?: {
      formation?: { formationGroup?: { i18NKey: string } };
      gameFormationPositions?: Array<{
        player?: { id: string };
        position?: { i18NKey: string; shortI18NKey: string; fieldX: number; fieldY: number };
      }>;
    };
    awayDefensiveGameFormation?: {
      formation?: { formationGroup?: { i18NKey: string } };
      gameFormationPositions?: Array<{
        player?: { id: string };
        position?: { i18NKey: string; shortI18NKey: string; fieldX: number; fieldY: number };
      }>;
    };
  }

  const indautxuAnalyses: FullGamePayload[] = [];
  const venueMap = new Map<string, string>();
  for (const g of indautxuFinishedGames) {
    try {
      const full = await fetchDieLigenDelivery<FullGamePayload>(`/analysis/game/${g.id}`);
      if (full) {
        indautxuAnalyses.push(full);
        if (full.gameInfo?.id && full.gameInfo?.venue_name) {
          venueMap.set(full.gameInfo.id, full.gameInfo.venue_name);
        }
      }
    } catch (e) {
      console.warn(`No se pudo descargar análisis de ${g.id}:`, e);
    }
  }

  // 4. Acumular estadísticas individuales de jugadores de Indautxu
  const playersMap = new Map<string, DieLiguePlayerStatRow>();
  const totalMinutosPosiblesIndautxu = indautxuFinishedGames.length * 90;
  let totalGolesFavor = 0;
  let totalGolesContra = 0;

  for (const match of indautxuAnalyses) {
    const gi = match.gameInfo;
    if (!gi) continue;

    const isHome = gi.homeTeam?.id === INDAUTXU_TEAM_ID || gi.homeTeam?.name?.includes('Indautxu');
    const myTeam = isHome ? gi.homeTeam : gi.awayTeam;
    const myFormation = isHome ? match.homeDefensiveGameFormation : match.awayDefensiveGameFormation;

    const myScore = (isHome ? gi.scoreHome : gi.scoreAway) ?? 0;
    const oppScore = (isHome ? gi.scoreAway : gi.scoreHome) ?? 0;
    totalGolesFavor += myScore;
    totalGolesContra += oppScore;

    const myPlayers = myTeam?.players || [];
    const events = match.events || [];

    // Sustituciones del partido
    const subEvents = events.filter((e) => !e.defensiveEvent && e.categoryName === 'SUBSTITUTION');

    for (const p of myPlayers) {
      const pId = p.id;
      let row = playersMap.get(pId);
      if (!row) {
        row = {
          id: pId,
          seasonRosterId: p.seasonRosterId,
          dorsal: p.shirtNumber,
          nombreCompleto: p.playerName,
          nombre: p.playerFirstName || p.playerName.split(' ')[0] || p.playerName,
          apellidos: p.playerLastName || p.playerName.split(' ').slice(1).join(' ') || '',
          demarcacion: 'Centrocampista',
          posicionTacticas: [],
          isPortero: false,
          minutosJugados: 0,
          minutosPosibles: totalMinutosPosiblesIndautxu,
          porcentajeMinutos: 0,
          partidosJugados: 0,
          titularidades: 0,
          convocatorias: 0,
          suplencias: 0,
          entradasBanquillo: 0,
          goles: 0,
          golesEncajados: 0,
          asistencias: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0,
          doblesAmarillas: 0,
          fotoUrl: null,
        };
        playersMap.set(pId, row);
      }

      // Convocatoria
      row.convocatorias += 1;
      row.dorsal = p.shirtNumber; // Mantener dorsal más reciente

      // Posición táctica en este partido
      const posObj = myFormation?.gameFormationPositions?.find((fp) => fp.player?.id === p.id)?.position;
      if (posObj?.shortI18NKey && !row.posicionTacticas.includes(posObj.shortI18NKey)) {
        row.posicionTacticas.push(posObj.shortI18NKey);
      }
      if (posObj?.i18NKey) {
        const dem = mapearDemarcacion(posObj.i18NKey);
        row.demarcacion = dem;
        if (dem === 'Portero') row.isPortero = true;
      }

      // Minutaje
      const isStarter = Boolean(p.starting);
      const subOut = subEvents.find((e) => e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'PLAYER_OUT' && sp.player?.id === p.id));
      const subIn = subEvents.find((e) => e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'PLAYER_IN' && sp.player?.id === p.id));

      const minSalida = subOut ? parseMinute(subOut.gameTimeString, subOut.gameTime) : null;
      const minEntrada = isStarter ? 0 : subIn ? parseMinute(subIn.gameTimeString, subIn.gameTime) : null;

      if (isStarter) {
        row.titularidades += 1;
        row.partidosJugados += 1;
        row.minutosJugados += minSalida !== null ? minSalida : 90;
      } else {
        row.suplencias += 1;
        if (minEntrada !== null) {
          row.entradasBanquillo += 1;
          row.partidosJugados += 1;
          row.minutosJugados += minSalida !== null ? minSalida - minEntrada : 90 - minEntrada;
        }
      }

      // Goles del jugador
      const myGoals = events.filter((e) => {
        const isGoal = !e.defensiveEvent && e.categoryName === 'GOAL';
        const isMe = e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'SCORER' && sp.player?.id === p.id);
        const isOwn = e.selectedLabels?.some((l) => l.i18NKey === 'OWN_GOAL');
        return isGoal && isMe && !isOwn;
      });
      row.goles += myGoals.length;

      // Asistencias del jugador
      const myAssists = events.filter((e) => {
        const isGoal = !e.defensiveEvent && e.categoryName === 'GOAL';
        const isAssist = e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'ASSIST_PROVIDER' && sp.player?.id === p.id);
        return isGoal && isAssist;
      });
      row.asistencias += myAssists.length;

      // Tarjetas del jugador
      const myCards = events.filter((e) => {
        const isCard = e.categoryName === 'CARD';
        const isOffender = e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'OFFENDING_PLAYER' && sp.player?.id === p.id);
        return isCard && isOffender;
      });
      for (const c of myCards) {
        const isRed = c.selectedLabels?.some((l) => l.i18NKey === 'RED');
        const isDY = c.selectedLabels?.some((l) => l.i18NKey === 'DOUBLE_YELLOW');
        if (isRed) row.tarjetasRojas += 1;
        else if (isDY) row.doblesAmarillas += 1;
        else row.tarjetasAmarillas += 1;
      }

      // Goles encajados (si es portero)
      if (row.isPortero) {
        const encajados = events.filter((e) => {
          return e.categoryName === 'GOAL' && e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'DEF_GOALKEEPER' && sp.player?.id === p.id);
        });
        row.golesEncajados = (row.golesEncajados || 0) + encajados.length;
      }
    }
  }

  // Recalcular porcentajes de minutos
  const indautxuPlayersList = Array.from(playersMap.values()).map((p) => {
    p.minutosPosibles = totalMinutosPosiblesIndautxu;
    p.porcentajeMinutos = totalMinutosPosiblesIndautxu > 0 ? Math.round((p.minutosJugados / totalMinutosPosiblesIndautxu) * 100) : 0;
    return p;
  });

  // 5. Calendario de partidos del SD Indautxu usando la misma lógica/normalización canónica que Rivales
  const calendar: DieLigueCalendarMatch[] = indautxuGames
    .map((g) => mapDieLigueGameToCalendarMatch(g, 'SD Indautxu', 'Indautxu', venueMap.get(g.id)))
    .sort((a, b) => a.jornada - b.jornada);

  // 6. Clasificación calculada a partir de los marcadores FINISHED del grupo
  const groupFinishedGames = allGames.filter((g) => g.analysisStatus?.i18NKey === 'FINISHED');
  const teamStandingsMap = new Map<string, DieLigueStandingRow>();

  for (const g of groupFinishedGames) {
    const hTeam = g.homeTeam;
    const aTeam = g.awayTeam;
    if (
      !hTeam ||
      !aTeam ||
      g.scoreHome === null ||
      g.scoreHome === undefined ||
      g.scoreAway === null ||
      g.scoreAway === undefined
    ) {
      continue;
    }

    const sHome: number = g.scoreHome;
    const sAway: number = g.scoreAway;

    // Local
    let rowH = teamStandingsMap.get(hTeam.name || hTeam.id || '');
    if (!rowH) {
      rowH = {
        posicion: 0,
        equipoId: hTeam.id || '',
        nombre: hTeam.name || 'Equipo Local',
        logoUrl: hTeam.teamLogoUrl || null,
        partidosJugados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        golesFavor: 0,
        golesContra: 0,
        diferenciaGoles: 0,
        puntos: 0,
        esIndautxu: Boolean(hTeam.name?.includes('Indautxu') || hTeam.id === INDAUTXU_TEAM_ID),
      };
      teamStandingsMap.set(hTeam.name || hTeam.id || '', rowH);
    }

    // Visitante
    let rowA = teamStandingsMap.get(aTeam.name || aTeam.id || '');
    if (!rowA) {
      rowA = {
        posicion: 0,
        equipoId: aTeam.id || '',
        nombre: aTeam.name || 'Equipo Visitante',
        logoUrl: aTeam.teamLogoUrl || null,
        partidosJugados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        golesFavor: 0,
        golesContra: 0,
        diferenciaGoles: 0,
        puntos: 0,
        esIndautxu: Boolean(aTeam.name?.includes('Indautxu') || aTeam.id === INDAUTXU_TEAM_ID),
      };
      teamStandingsMap.set(aTeam.name || aTeam.id || '', rowA);
    }

    rowH.partidosJugados += 1;
    rowA.partidosJugados += 1;

    rowH.golesFavor += sHome;
    rowH.golesContra += sAway;
    rowA.golesFavor += sAway;
    rowA.golesContra += sHome;

    if (sHome > sAway) {
      rowH.ganados += 1;
      rowH.puntos += 3;
      rowA.perdidos += 1;
    } else if (sHome < sAway) {
      rowA.ganados += 1;
      rowA.puntos += 3;
      rowH.perdidos += 1;
    } else {
      rowH.empatados += 1;
      rowA.empatados += 1;
      rowH.puntos += 1;
      rowA.puntos += 1;
    }
  }

  // Ordenar clasificación
  const sortedStandings = Array.from(teamStandingsMap.values())
    .map((row) => {
      row.diferenciaGoles = row.golesFavor - row.golesContra;
      return row;
    })
    .sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
      return b.golesFavor - a.golesFavor;
    })
    .map((row, index) => {
      row.posicion = index + 1;
      return row;
    });

  // 6.b Trayectoria del SD Indautxu calculada jornada a jornada
  const indautxuTrayectoria: DieLigueTrayectoriaItem[] = [];
  const maxRoundsDiscovered = Math.max(
    ...allGames.map((g) => g.round?.roundOrderNumber || 0),
    0
  );

  for (let j = 1; j <= maxRoundsDiscovered; j++) {
    const roundGames = allGames.filter((g) => (g.round?.roundOrderNumber || 0) === j);
    if (roundGames.length === 0) continue;

    const roundFinished = roundGames.filter(
      (g) => g.analysisStatus?.i18NKey === 'FINISHED' && g.scoreHome !== null && g.scoreHome !== undefined && g.scoreAway !== null && g.scoreAway !== undefined
    );
    const esCompleta = roundGames.length > 0 && roundFinished.length === roundGames.length;

    // Verificar si Indautxu ha disputado su encuentro en esta jornada
    const indautxuMatchInRound = roundGames.find(
      (g) => g.homeTeam?.id === INDAUTXU_TEAM_ID || g.awayTeam?.id === INDAUTXU_TEAM_ID || g.homeTeam?.name?.includes('Indautxu') || g.awayTeam?.name?.includes('Indautxu')
    );
    const indautxuJugado = Boolean(
      indautxuMatchInRound &&
      indautxuMatchInRound.analysisStatus?.i18NKey === 'FINISHED' &&
      indautxuMatchInRound.scoreHome !== null &&
      indautxuMatchInRound.scoreHome !== undefined &&
      indautxuMatchInRound.scoreAway !== null &&
      indautxuMatchInRound.scoreAway !== undefined
    );

    if (!indautxuJugado) {
      // Si Indautxu no ha jugado esta jornada todavía, omitirla
      continue;
    }

    // Calcular la clasificación acumulada exclusivamente con partidos FINISHED hasta la jornada j
    const gamesUpToJ = allGames.filter(
      (g) => (g.round?.roundOrderNumber || 0) <= j &&
             g.analysisStatus?.i18NKey === 'FINISHED' &&
             g.scoreHome !== null && g.scoreHome !== undefined &&
             g.scoreAway !== null && g.scoreAway !== undefined
    );

    const standingsMapJ = new Map<string, {
      equipoId: string;
      nombre: string;
      partidosJugados: number;
      ganados: number;
      empatados: number;
      perdidos: number;
      golesFavor: number;
      golesContra: number;
      diferenciaGoles: number;
      puntos: number;
      esIndautxu: boolean;
    }>();

    for (const gm of gamesUpToJ) {
      const hT = gm.homeTeam;
      const aT = gm.awayTeam;
      if (!hT || !aT) continue;

      const sH: number = gm.scoreHome!;
      const sA: number = gm.scoreAway!;

      const getOrInit = (t: { id?: string; name?: string }) => {
        const key = t.name || t.id || '';
        let row = standingsMapJ.get(key);
        if (!row) {
          row = {
            equipoId: t.id || '',
            nombre: t.name || '',
            partidosJugados: 0,
            ganados: 0,
            empatados: 0,
            perdidos: 0,
            golesFavor: 0,
            golesContra: 0,
            diferenciaGoles: 0,
            puntos: 0,
            esIndautxu: Boolean(t.name?.includes('Indautxu') || t.id === INDAUTXU_TEAM_ID),
          };
          standingsMapJ.set(key, row);
        }
        return row;
      };

      const rH = getOrInit(hT);
      const rA = getOrInit(aT);

      rH.partidosJugados += 1;
      rA.partidosJugados += 1;
      rH.golesFavor += sH;
      rH.golesContra += sA;
      rA.golesFavor += sA;
      rA.golesContra += sH;

      if (sH > sA) {
        rH.ganados += 1;
        rH.puntos += 3;
        rA.perdidos += 1;
      } else if (sH < sA) {
        rA.ganados += 1;
        rA.puntos += 3;
        rH.perdidos += 1;
      } else {
        rH.empatados += 1;
        rA.empatados += 1;
        rH.puntos += 1;
        rA.puntos += 1;
      }
    }

    const sortedJ = Array.from(standingsMapJ.values())
      .map((r) => {
        r.diferenciaGoles = r.golesFavor - r.golesContra;
        return r;
      })
      .sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
        return b.golesFavor - a.golesFavor;
      });

    const indautxuIdx = sortedJ.findIndex((r) => r.esIndautxu);
    if (indautxuIdx >= 0) {
      const indRow = sortedJ[indautxuIdx];
      indautxuTrayectoria.push({
        jornada: j,
        posicion: indautxuIdx + 1,
        puntos: indRow.puntos,
        partidosJugados: indRow.partidosJugados,
        ganados: indRow.ganados,
        empatados: indRow.empatados,
        perdidos: indRow.perdidos,
        golesFavor: indRow.golesFavor,
        golesContra: indRow.golesContra,
        partidosCompletadosJornada: roundFinished.length,
        totalPartidosJornada: roundGames.length,
        esCompleta,
        esProvisional: !esCompleta,
      });
    }
  }

  // 7. Lista de Rivales únicos
  const rivalsMap = new Map<string, { id: string; nombre: string; logoUrl?: string | null; partidosDisputados: number }>();
  for (const g of allGames) {
    [g.homeTeam, g.awayTeam].forEach((t) => {
      if (t && t.name && !t.name.includes('Indautxu') && t.id !== INDAUTXU_TEAM_ID) {
        if (!rivalsMap.has(t.name)) {
          const finishedForTeam = allGames.filter(
            (gm) =>
              gm.analysisStatus?.i18NKey === 'FINISHED' &&
              (gm.homeTeam?.name === t.name || gm.awayTeam?.name === t.name)
          ).length;

          rivalsMap.set(t.name, {
            id: t.id || t.name,
            nombre: t.name,
            logoUrl: t.teamLogoUrl || null,
            partidosDisputados: finishedForTeam,
          });
        }
      }
    });
  }

  const rivalsList = Array.from(rivalsMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    summary: {
      partidosDisputados: indautxuFinishedGames.length,
      minutosPosibles: totalMinutosPosiblesIndautxu,
      golesFavor: totalGolesFavor,
      golesContra: totalGolesContra,
      totalPartidosProcesadosGrupo: groupFinishedGames.length,
      totalPartidosGrupo: 24, // 3 jornadas x 8 partidos
      completitudGrupoLabel: `${groupFinishedGames.length}/24 partidos procesados`,
    },
    indautxuPlayers: indautxuPlayersList,
    standings: sortedStandings,
    standingsCompletitud: `${groupFinishedGames.length}/24 partidos procesados (provisional hasta sincronización completa)`,
    indautxuTrayectoria,
    calendar,
    rivals: rivalsList,
  };
}

// Función para obtener la ficha y plantilla acumulada de un rival específico
export async function getDieLigueRivalData(rivalName: string): Promise<DieLigueRivalInfo> {
  const contest = await fetchDieLigenDelivery<{
    games?: Array<{
      id: string;
      round?: { roundOrderNumber?: number };
      homeTeam?: { id?: string; name?: string; teamLogoUrl?: string };
      awayTeam?: { id?: string; name?: string; teamLogoUrl?: string };
      analysisStatus?: { i18NKey?: string };
      scoreHome?: number | null;
      scoreAway?: number | null;
      gameDate?: string;
      venue_name?: string;
    }>;
  }>(`/analysis/contest/${DHJ2_CONTEST_ID}`);

  const allGames = contest?.games || [];
  const rivalGames = allGames.filter(
    (g) => g.homeTeam?.name === rivalName || g.awayTeam?.name === rivalName
  );

  const finishedGames = rivalGames.filter((g) => g.analysisStatus?.i18NKey === 'FINISHED');
  const rivalLogo = rivalGames[0]?.homeTeam?.name === rivalName ? rivalGames[0]?.homeTeam?.teamLogoUrl : rivalGames[0]?.awayTeam?.teamLogoUrl;

  const playerRowsMap = new Map<string, DieLigueRivalPlayerRow>();
  const totalMinutosPosibles = finishedGames.length * 90;

  const rivalVenueMap = new Map<string, string>();
  for (const g of finishedGames) {
    try {
      const match = await fetchDieLigenDelivery<{
        gameInfo?: {
          id?: string;
          venue_name?: string;
          homeTeam?: { id: string; name: string; players?: Array<{ id: string; playerName: string; shirtNumber: number; starting: boolean; seasonRosterId?: string }> };
          awayTeam?: { id: string; name: string; players?: Array<{ id: string; playerName: string; shirtNumber: number; starting: boolean; seasonRosterId?: string }> };
        };
        events?: Array<{
          categoryName: string;
          defensiveEvent: boolean;
          gameTime: number;
          eventTime: number;
          gameTimeString?: string;
          selectedPlayers?: Array<{ tag?: { i18NKey: string }; player?: { id: string; playerName: string } }>;
          selectedLabels?: Array<{ i18NKey: string }>;
        }>;
      }>(`/analysis/game/${g.id}`);

      const gi = match.gameInfo;
      if (gi?.id && gi?.venue_name) {
        rivalVenueMap.set(gi.id, gi.venue_name);
      }
      const isHome = gi?.homeTeam?.name === rivalName;
      const rTeam = isHome ? gi?.homeTeam : gi?.awayTeam;
      const rPlayers = rTeam?.players || [];
      const events = match.events || [];
      const subEvents = events.filter((e) => !e.defensiveEvent && e.categoryName === 'SUBSTITUTION');

      for (const p of rPlayers) {
        let row = playerRowsMap.get(p.id);
        if (!row) {
          row = {
            id: p.id,
            seasonRosterId: p.seasonRosterId,
            dorsal: p.shirtNumber,
            nombre: p.playerName,
            minutosJugados: 0,
            minutosPosibles: totalMinutosPosibles,
            porcentajeMinutos: 0,
            partidosJugados: 0,
            titularidades: 0,
            convocatorias: 0,
            suplencias: 0,
            entradasBanquillo: 0,
            goles: 0,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            asistencias: 0,
          };
          playerRowsMap.set(p.id, row);
        }

        row.convocatorias += 1;
        row.dorsal = p.shirtNumber;

        const isStarter = Boolean(p.starting);
        const subOut = subEvents.find((e) => e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'PLAYER_OUT' && sp.player?.id === p.id));
        const subIn = subEvents.find((e) => e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'PLAYER_IN' && sp.player?.id === p.id));

        const minSalida = subOut ? parseMinute(subOut.gameTimeString, subOut.gameTime) : null;
        const minEntrada = isStarter ? 0 : subIn ? parseMinute(subIn.gameTimeString, subIn.gameTime) : null;

        if (isStarter) {
          row.titularidades += 1;
          row.partidosJugados += 1;
          row.minutosJugados += minSalida !== null ? minSalida : 90;
        } else {
          row.suplencias += 1;
          if (minEntrada !== null) {
            row.entradasBanquillo += 1;
            row.partidosJugados += 1;
            row.minutosJugados += minSalida !== null ? minSalida - minEntrada : 90 - minEntrada;
          }
        }

        // Goles
        const myGoals = events.filter((e) => !e.defensiveEvent && e.categoryName === 'GOAL' && e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'SCORER' && sp.player?.id === p.id));
        row.goles += myGoals.length;

        // Tarjetas
        const myCards = events.filter((e) => e.categoryName === 'CARD' && e.selectedPlayers?.some((sp) => sp.tag?.i18NKey === 'OFFENDING_PLAYER' && sp.player?.id === p.id));
        for (const c of myCards) {
          if (c.selectedLabels?.some((l) => l.i18NKey === 'RED' || l.i18NKey === 'DOUBLE_YELLOW')) {
            row.tarjetasRojas += 1;
          } else {
            row.tarjetasAmarillas += 1;
          }
        }
      }
    } catch (e) {
      console.warn(`Error procesando partido rival ${g.id}:`, e);
    }
  }

  const players = Array.from(playerRowsMap.values()).map((p) => {
    p.minutosPosibles = totalMinutosPosibles;
    p.porcentajeMinutos = totalMinutosPosibles > 0 ? Math.round((p.minutosJugados / totalMinutosPosibles) * 100) : 0;
    return p;
  }).sort((a, b) => b.minutosJugados - a.minutosJugados);

  // Calendario del rival usando la misma normalización canónica
  const matches: DieLigueCalendarMatch[] = rivalGames
    .map((g) => mapDieLigueGameToCalendarMatch(g, rivalName, undefined, rivalVenueMap.get(g.id)))
    .sort((a, b) => a.jornada - b.jornada);

  return {
    id: rivalName,
    nombre: rivalName,
    logoUrl: rivalLogo || null,
    partidosContest: rivalGames.length,
    partidosFinished: finishedGames.length,
    players,
    matches,
  };
}
