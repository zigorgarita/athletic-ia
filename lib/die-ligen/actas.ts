import 'server-only';
import { fetchDieLigenDelivery, DHJ2_CONTEST_ID } from '@/lib/die-ligen/client';

export interface DieLiguePlayerActa {
  id: string;
  seasonRosterId?: string;
  playerName: string;
  playerFirstName?: string;
  playerLastName?: string;
  shirtNumber: number;
  starting: boolean;
  positionName?: string;
  positionKey?: string;
  fieldX?: number;
  fieldY?: number;
  minutoEntrada: number | null;
  minutoSalida: number | null;
  minutosJugados: number;
  jugo: boolean;
  goles: number;
  asistencias: number;
  autogoles: number;
  tarjetaAmarilla: boolean;
  tarjetaRoja: boolean;
  minutosGoles?: number[];
  minutosTarjetas?: { tipo: 'AMARILLA' | 'ROJA' | 'DOBLE_AMARILLA'; minuto: number }[];
}

export interface DieLigueEventActa {
  id: string;
  tipo: 'GOL' | 'TARJETA' | 'SUSTITUCION';
  minuto: number;
  minutoTexto: string;
  equipoId: string;
  equipoNombre: string;
  esLocal: boolean;
  jugadorPrincipal?: {
    id: string;
    nombre: string;
    dorsal: number;
  };
  jugadorSecundario?: {
    id: string;
    nombre: string;
    dorsal: number;
  };
  detalle?: string;
  esAutogol?: boolean;
  tipoTarjeta?: 'AMARILLA' | 'ROJA' | 'DOBLE_AMARILLA';
  videoUrl?: string | null;
  start?: number | null;
  end?: number | null;
}

export interface DieLigueMatchActa {
  id: string;
  jornada: number;
  status: string;
  isFinished: boolean;
  fecha: string | null;
  hora: string | null;
  campo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  scoreHalftimeHome: number | null;
  scoreHalftimeAway: number | null;
  homeTeam: {
    id: string;
    name: string;
    logoUrl?: string | null;
    coach?: string | null;
    formation?: string | null;
    players: DieLiguePlayerActa[];
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl?: string | null;
    coach?: string | null;
    formation?: string | null;
    players: DieLiguePlayerActa[];
  };
  events: DieLigueEventActa[];
  mainVideoUrl: string | null;
}

export interface DieLigueJornadaResponse {
  jornada: number;
  totalPartidos: number;
  finalizadosCount: number;
  pendientesCount: number;
  matches: DieLigueMatchActa[];
}

function parseMinute(timeStr?: string, timeSec?: number): number {
  if (timeStr) {
    const clean = timeStr.replace(/[^0-9]/g, '');
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof timeSec === 'number') {
    return Math.floor(timeSec / 60);
  }
  return 0;
}

export async function getDieLigueJornadaActas(jornada: number): Promise<DieLigueJornadaResponse> {
  // 1. Obtener calendario del torneo DHJ2
  const contestData = await fetchDieLigenDelivery<{
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

  const allGames = contestData?.games || [];
  const targetGames = allGames.filter((g) => g.round?.roundOrderNumber === jornada);

  const matches: DieLigueMatchActa[] = [];

  for (const g of targetGames) {
    const statusKey = g.analysisStatus?.i18NKey || 'UNKNOWN';
    const isFinished = statusKey === 'FINISHED';

    let dateIso: string | null = null;
    let timeStr: string | null = null;
    if (g.gameDate) {
      dateIso = g.gameDate;
      try {
        const d = new Date(g.gameDate);
        timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
      } catch {
        timeStr = null;
      }
    }

    if (!isFinished) {
      // Partido pendiente en Die Ligue
      matches.push({
        id: g.id,
        jornada,
        status: statusKey,
        isFinished: false,
        fecha: dateIso,
        hora: timeStr,
        campo: g.venue_name || null,
        scoreHome: g.scoreHome ?? null,
        scoreAway: g.scoreAway ?? null,
        scoreHalftimeHome: null,
        scoreHalftimeAway: null,
        homeTeam: {
          id: g.homeTeam?.id || '',
          name: g.homeTeam?.name || 'Local',
          logoUrl: g.homeTeam?.teamLogoUrl || null,
          players: [],
        },
        awayTeam: {
          id: g.awayTeam?.id || '',
          name: g.awayTeam?.name || 'Visitante',
          logoUrl: g.awayTeam?.teamLogoUrl || null,
          players: [],
        },
        events: [],
        mainVideoUrl: null,
      });
      continue;
    }

    // Partido FINISHED: Descargar análisis completo
    try {
      const fullGame = await fetchDieLigenDelivery<{
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
          homeTeamCoach?: { coachFirstName?: string; coachLastName?: string };
          awayTeamCoach?: { coachFirstName?: string; coachLastName?: string };
        };
        events?: Array<{
          id: string;
          categoryName: string;
          defensiveEvent: boolean;
          start?: number;
          end?: number;
          gameTime: number;
          eventTime: number;
          gameTimeString?: string;
          gameTimeDetailedString?: string;
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
      }>(`/analysis/game/${g.id}`);

      if (!fullGame.gameInfo) {
        throw new Error('Información de partido no disponible');
      }
      const gameInfo = fullGame.gameInfo;
      const rawEvents = fullGame.events || [];

      // Mapear eventos nucleares
      const nuclearEvents = rawEvents.filter(
        (e) => !e.defensiveEvent && ['GOAL', 'CARD', 'SUBSTITUTION'].includes(e.categoryName)
      );

      const parsedEvents: DieLigueEventActa[] = [];
      for (const e of nuclearEvents) {
        const minuto = parseMinute(e.gameTimeString, e.gameTime ?? e.eventTime);
        const isHome = e.teamType === 'HOME' || e.team?.id === gameInfo.homeTeam?.id;
        const videoClip = e.videos?.[0]?.videoUrl || gameInfo.mainVideoUrl || null;
        const start = typeof e.start === 'number' ? e.start : null;
        const end = typeof e.end === 'number' ? e.end : null;

        if (e.categoryName === 'GOAL') {
          const scorer = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'SCORER')?.player;
          const assist = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'ASSIST_PROVIDER')?.player;
          const isOwnGoal = e.selectedLabels?.some((l) => l.i18NKey === 'OWN_GOAL') || false;

          parsedEvents.push({
            id: e.id,
            tipo: 'GOL',
            minuto,
            minutoTexto: e.gameTimeString || `${minuto}'`,
            equipoId: e.team?.id || '',
            equipoNombre: e.team?.name || (isHome ? gameInfo.homeTeam?.name || '' : gameInfo.awayTeam?.name || ''),
            esLocal: isHome,
            jugadorPrincipal: scorer ? { id: scorer.id, nombre: scorer.playerName, dorsal: scorer.shirtNumber } : undefined,
            jugadorSecundario: assist ? { id: assist.id, nombre: assist.playerName, dorsal: assist.shirtNumber } : undefined,
            esAutogol: isOwnGoal,
            videoUrl: videoClip,
            start,
            end,
          });
        } else if (e.categoryName === 'CARD') {
          const offender = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'OFFENDING_PLAYER')?.player;
          const isRed = e.selectedLabels?.some((l) => l.i18NKey === 'RED');
          const isDoubleYellow = e.selectedLabels?.some((l) => l.i18NKey === 'DOUBLE_YELLOW');

          parsedEvents.push({
            id: e.id,
            tipo: 'TARJETA',
            minuto,
            minutoTexto: e.gameTimeString || `${minuto}'`,
            equipoId: e.team?.id || '',
            equipoNombre: e.team?.name || (isHome ? gameInfo.homeTeam?.name || '' : gameInfo.awayTeam?.name || ''),
            esLocal: isHome,
            jugadorPrincipal: offender ? { id: offender.id, nombre: offender.playerName, dorsal: offender.shirtNumber } : undefined,
            tipoTarjeta: isRed ? 'ROJA' : isDoubleYellow ? 'DOBLE_AMARILLA' : 'AMARILLA',
            videoUrl: videoClip,
            start,
            end,
          });
        } else if (e.categoryName === 'SUBSTITUTION') {
          const pIn = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'PLAYER_IN')?.player;
          const pOut = e.selectedPlayers?.find((p) => p.tag?.i18NKey === 'PLAYER_OUT')?.player;

          parsedEvents.push({
            id: e.id,
            tipo: 'SUSTITUCION',
            minuto,
            minutoTexto: e.gameTimeString || `${minuto}'`,
            equipoId: e.team?.id || '',
            equipoNombre: e.team?.name || (isHome ? gameInfo.homeTeam?.name || '' : gameInfo.awayTeam?.name || ''),
            esLocal: isHome,
            jugadorPrincipal: pIn ? { id: pIn.id, nombre: pIn.playerName, dorsal: pIn.shirtNumber } : undefined,
            jugadorSecundario: pOut ? { id: pOut.id, nombre: pOut.playerName, dorsal: pOut.shirtNumber } : undefined,
            videoUrl: videoClip,
            start,
            end,
          });
        }
      }

      parsedEvents.sort((a, b) => a.minuto - b.minuto);

      // Función para procesar jugadores y minutaje de cada equipo
      const buildTeamPlayers = (
        rawPlayers: Array<{
          id: string;
          playerName: string;
          playerFirstName?: string;
          playerLastName?: string;
          shirtNumber: number;
          starting: boolean;
          seasonRosterId?: string;
        }> = [],
        formationData?: {
          formation?: { formationGroup?: { i18NKey: string } };
          gameFormationPositions?: Array<{
            player?: { id: string };
            position?: { i18NKey: string; shortI18NKey: string; fieldX: number; fieldY: number };
          }>;
        }
      ): DieLiguePlayerActa[] => {
        return rawPlayers.map((p) => {
          const isStarter = Boolean(p.starting);

          // Buscar eventos de sustitución relacionados con este jugador
          const subOutEvent = parsedEvents.find(
            (ev) => ev.tipo === 'SUSTITUCION' && ev.jugadorSecundario?.id === p.id
          );
          const subInEvent = parsedEvents.find(
            (ev) => ev.tipo === 'SUSTITUCION' && ev.jugadorPrincipal?.id === p.id
          );

          const minSalida = subOutEvent ? subOutEvent.minuto : null;
          const minEntrada = isStarter ? 0 : subInEvent ? subInEvent.minuto : null;

          let minutosJugados = 0;
          let jugo = false;

          if (isStarter) {
            jugo = true;
            minutosJugados = minSalida !== null ? Math.max(0, minSalida) : 90;
          } else if (minEntrada !== null) {
            jugo = true;
            minutosJugados = minSalida !== null ? Math.max(0, minSalida - minEntrada) : Math.max(0, 90 - minEntrada);
          }

          // Goles del jugador
          const golesEventos = parsedEvents.filter(
            (ev) => ev.tipo === 'GOL' && ev.jugadorPrincipal?.id === p.id && !ev.esAutogol
          );
          const autogolesEventos = parsedEvents.filter(
            (ev) => ev.tipo === 'GOL' && ev.jugadorPrincipal?.id === p.id && ev.esAutogol
          );
          const asistenciasEventos = parsedEvents.filter(
            (ev) => ev.tipo === 'GOL' && ev.jugadorSecundario?.id === p.id
          );

          // Tarjetas del jugador
          const tarjetasEventos = parsedEvents.filter(
            (ev) => ev.tipo === 'TARJETA' && ev.jugadorPrincipal?.id === p.id
          );
          const tieneAmarilla = tarjetasEventos.some(
            (t) => t.tipoTarjeta === 'AMARILLA' || t.tipoTarjeta === 'DOBLE_AMARILLA'
          );
          const tieneRoja = tarjetasEventos.some(
            (t) => t.tipoTarjeta === 'ROJA' || t.tipoTarjeta === 'DOBLE_AMARILLA'
          );

          // Buscar posición táctica en la formación
          const formPos = formationData?.gameFormationPositions?.find((fp) => fp.player?.id === p.id)?.position;

          return {
            id: p.id,
            seasonRosterId: p.seasonRosterId,
            playerName: p.playerName,
            playerFirstName: p.playerFirstName,
            playerLastName: p.playerLastName,
            shirtNumber: p.shirtNumber,
            starting: isStarter,
            positionName: formPos?.i18NKey,
            positionKey: formPos?.shortI18NKey,
            fieldX: formPos?.fieldX,
            fieldY: formPos?.fieldY,
            minutoEntrada: minEntrada,
            minutoSalida: minSalida,
            minutosJugados,
            jugo,
            goles: golesEventos.length,
            asistencias: asistenciasEventos.length,
            autogoles: autogolesEventos.length,
            tarjetaAmarilla: tieneAmarilla,
            tarjetaRoja: tieneRoja,
            minutosGoles: golesEventos.map((g) => g.minuto),
            minutosTarjetas: tarjetasEventos.map((t) => ({
              tipo: t.tipoTarjeta || 'AMARILLA',
              minuto: t.minuto,
            })),
          };
        });
      };

      const homePlayers = buildTeamPlayers(
        gameInfo.homeTeam?.players,
        fullGame.homeDefensiveGameFormation
      );
      const awayPlayers = buildTeamPlayers(
        gameInfo.awayTeam?.players,
        fullGame.awayDefensiveGameFormation
      );

      matches.push({
        id: g.id,
        jornada,
        status: 'FINISHED',
        isFinished: true,
        fecha: dateIso,
        hora: timeStr,
        campo: gameInfo.venue_name || g.venue_name || null,
        scoreHome: gameInfo.scoreHome ?? g.scoreHome ?? null,
        scoreAway: gameInfo.scoreAway ?? g.scoreAway ?? null,
        scoreHalftimeHome: gameInfo.homeScoreHalftime ?? null,
        scoreHalftimeAway: gameInfo.awayScoreHalftime ?? null,
        homeTeam: {
          id: gameInfo.homeTeam?.id || g.homeTeam?.id || '',
          name: gameInfo.homeTeam?.name || g.homeTeam?.name || 'Local',
          logoUrl: gameInfo.homeTeam?.teamLogoUrl || g.homeTeam?.teamLogoUrl || null,
          coach: gameInfo.homeTeamCoach
            ? `${gameInfo.homeTeamCoach.coachFirstName || ''} ${gameInfo.homeTeamCoach.coachLastName || ''}`.trim()
            : null,
          formation: fullGame.homeDefensiveGameFormation?.formation?.formationGroup?.i18NKey || null,
          players: homePlayers,
        },
        awayTeam: {
          id: gameInfo.awayTeam?.id || g.awayTeam?.id || '',
          name: gameInfo.awayTeam?.name || g.awayTeam?.name || 'Visitante',
          logoUrl: gameInfo.awayTeam?.teamLogoUrl || g.awayTeam?.teamLogoUrl || null,
          coach: gameInfo.awayTeamCoach
            ? `${gameInfo.awayTeamCoach.coachFirstName || ''} ${gameInfo.awayTeamCoach.coachLastName || ''}`.trim()
            : null,
          formation: fullGame.awayDefensiveGameFormation?.formation?.formationGroup?.i18NKey || null,
          players: awayPlayers,
        },
        events: parsedEvents,
        mainVideoUrl: gameInfo.mainVideoUrl || null,
      });
    } catch (err: unknown) {
      // Si falla la descarga de un partido en concreto, incluirlo como error sin tumbar la jornada
      const msg = err instanceof Error ? err.message : 'Error al consultar análisis';
      matches.push({
        id: g.id,
        jornada,
        status: `ERROR (${msg})`,
        isFinished: false,
        fecha: dateIso,
        hora: timeStr,
        campo: g.venue_name || null,
        scoreHome: g.scoreHome ?? null,
        scoreAway: g.scoreAway ?? null,
        scoreHalftimeHome: null,
        scoreHalftimeAway: null,
        homeTeam: {
          id: g.homeTeam?.id || '',
          name: g.homeTeam?.name || 'Local',
          logoUrl: g.homeTeam?.teamLogoUrl || null,
          players: [],
        },
        awayTeam: {
          id: g.awayTeam?.id || '',
          name: g.awayTeam?.name || 'Visitante',
          logoUrl: g.awayTeam?.teamLogoUrl || null,
          players: [],
        },
        events: [],
        mainVideoUrl: null,
      });
    }
  }

  const finalizadosCount = matches.filter((m) => m.isFinished).length;
  const pendientesCount = matches.length - finalizadosCount;

  return {
    jornada,
    totalPartidos: matches.length,
    finalizadosCount,
    pendientesCount,
    matches,
  };
}
