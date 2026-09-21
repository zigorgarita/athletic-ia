/**
 * lib/die-ligen/parser.ts
 *
 * Motor de extracción y tipado para el informe de partido de Die Ligen (Prototipo 2).
 * Traslación exacta y fiel de ABRIR_PROTOTIPO_2_COMPLETO_CON_PDF.html.
 *
 * Conserva estrictamente las 8 secciones del prototipo sin inventar ni añadir campos:
 * 1. Goles del partido
 * 2. Tiros y remates
 * 3. Centros
 * 4. Córneres
 * 5. Golpes francos analizados
 * 6. Saques de puerta
 * 7. Saques de banda
 * 8. Formaciones tácticas y alineaciones
 *
 * Incluye corrección obligatoria para autogoles (ej. Joel Chacón en J-3):
 * - El marcador se mantiene íntegro.
 * - El autogol NO se cuenta como remate ni tiro a puerta del equipo beneficiado.
 * - Se cataloga correctamente como autogol en la ficha del gol.
 */

export interface DieLigenPlayerRef {
  id?: string;
  nombre: string;
  apellido: string;
  dorsal: number | string;
}

export interface DieLigenGoalItem {
  minutoFutbolistico: string;
  tiempoExacto: string;
  equipoNombre: string;
  esLocal: boolean;
  esAutogol: boolean;
  goleador: string;
  asistente: string | null;
  recuperador: string | null;
  carril: string;
  zona: string;
  situacionPrevia: string;
  tipoJugada: string;
  contraataque: boolean;
}

export interface DieLigenShotItem {
  minutoFutbolistico: string;
  tiempoExacto: string;
  equipoNombre: string;
  esLocal: boolean;
  jugador: string;
  zona: string;
  resultadoBadge: string;
  contraataque: string;
}

export interface DieLigenTeamShots {
  rematesSinGol: number;
  goles: number;
  autogolesBeneficiados: number;
  totalIntentos: number;
  aPuerta: number;
  parados: number;
  fuera: number;
  bloqueados: number;
  alPalo: number;
  dentroArea: number;
  fueraArea: number;
  contraataques: number;
  pctPuerta: string;
  pctFuera: string;
  carriles: {
    izquierda: number;
    centro: number;
    derecha: number;
    pctIzq: string;
    pctCentro: string;
    pctDer: string;
  };
  jugadores: Array<{ jugador: string; total: number }>;
}

export interface DieLigenCrossItem {
  minutoFutbolistico: string;
  tiempoExacto: string;
  equipoNombre: string;
  esLocal: boolean;
  jugador: string;
  banda: string;
  tipo: string;
  contraataque: string;
  resultado: string;
}

export interface DieLigenTeamCrosses {
  total: number;
  altos: number;
  bajos: number;
  derecha: number;
  izquierda: number;
  conRemate: number;
  sinOcasion: number;
  contraataques: number;
  jugadores: Array<{ jugador: string; total: number }>;
}

export interface DieLigenCornerItem {
  minutoFutbolistico: string;
  tiempoExacto: string;
  equipoNombre: string;
  esLocal: boolean;
  lanzador: string;
  lado: string;
  trayectoria: string;
  zona: string;
  resultado: string;
}

export interface DieLigenTeamCorners {
  total: number;
  derecha: number;
  izquierda: number;
  gol: number;
  remate: number;
  sinOcasion: number;
  jugadores: Array<{ jugador: string; total: number }>;
}

export interface DieLigenFreeKickItem {
  minutoFutbolistico: string;
  tiempoExacto: string;
  equipoNombre: string;
  esLocal: boolean;
  lanzador: string;
  ejecucion: string;
  zona: string;
  resultado: string;
}

export interface DieLigenTeamFreeKicks {
  total: number;
  centros: number;
  tiros: number;
  pases: number;
  jugadores: Array<{ jugador: string; total: number }>;
}

export interface DieLigenTeamGoalKicks {
  total: number;
  cortos: number;
  medios: number;
  largos: number;
  pctCortos: string;
  pctMedios: string;
  pctLargos: string;
}

export interface DieLigenTeamThrowIns {
  total: number;
  campoPropio: number;
  campoRival: number;
  pctPropio: string;
  pctRival: string;
  generaCentro: number;
  sinOcasion: number;
}

export interface DieLigenFormationPlayer {
  id?: string;
  dorsal: number | string;
  nombreCompleto: string;
  apellido: string;
  posicionCodigo: string;
  posicionEsp: string;
  cx: number;
  cy: number;
  fieldX: number;
  fieldY: number;
}

export interface DieLigenFormationSide {
  ofensiva: {
    sistemaOfensivo: string;
    sistemaNombreCorto: string;
    jugadores: DieLigenFormationPlayer[];
  };
  defensiva: {
    sistemaOfensivo: string;
    sistemaNombreCorto: string;
    jugadores: DieLigenFormationPlayer[];
  };
  transicion: {
    sistemaDefensivo: string;
    hayCambioEstructural: boolean;
    cambiosPosicion: string[];
  };
}

export interface DieLigenMatchReportData {
  cabecera: {
    tipo: string;
    local: { id?: string; nombre: string };
    visitante: { id?: string; nombre: string };
    golesLocal: number;
    golesVisitante: number;
    descansoLocal: number;
    descansoVisitante: number;
    jornada: string;
    numeroJornada: number | string;
    fecha: string;
    campo: string;
    competicion: string;
    temporada: string;
  };
  goles: DieLigenGoalItem[];
  tiros: {
    local: DieLigenTeamShots;
    visitante: DieLigenTeamShots;
    totalPartido: number;
    cronologia: DieLigenShotItem[];
  };
  centros: {
    local: DieLigenTeamCrosses;
    visitante: DieLigenTeamCrosses;
    totalPartido: number;
    cronologia: DieLigenCrossItem[];
  };
  corneres: {
    local: DieLigenTeamCorners;
    visitante: DieLigenTeamCorners;
    totalPartido: number;
    cronologia: DieLigenCornerItem[];
  };
  faltas: {
    local: DieLigenTeamFreeKicks;
    visitante: DieLigenTeamFreeKicks;
    totalPartido: number;
    cronologia: DieLigenFreeKickItem[];
  };
  saquesPuerta: {
    local: DieLigenTeamGoalKicks;
    visitante: DieLigenTeamGoalKicks;
    totalPartido: number;
  };
  saquesBanda: {
    local: DieLigenTeamThrowIns;
    visitante: DieLigenTeamThrowIns;
    totalPartido: number;
  };
  formaciones: {
    local: DieLigenFormationSide;
    visitante: DieLigenFormationSide;
  };
}

// ─── Helpers de formateo del Prototipo ─────────────────────────────────────────

function safeStr(val: unknown, def = 'N/D'): string {
  if (val === undefined || val === null || String(val).trim() === '') return def;
  return String(val).trim();
}

function calcPct(part: number, total: number): string {
  if (!total || total === 0) return '0%';
  return Math.round((part / total) * 100) + '%';
}

function formatFootballMinute(gameTimeString?: string, gameTimeSec?: number, minute?: number): string {
  if (gameTimeString && typeof gameTimeString === 'string' && gameTimeString.trim().length > 0) {
    var s = gameTimeString.trim();
    return s.endsWith("'") ? s : (s + "'");
  }
  var sec = gameTimeSec !== undefined ? gameTimeSec : (minute !== undefined ? minute * 60 : 0);
  var m = Math.floor(sec / 60);
  return (m + 1) + "'";
}

function formatExactTime(detailedString?: string, gameTimeSec?: number): string {
  if (detailedString && typeof detailedString === 'string' && detailedString.trim().length > 0) {
    return detailedString.trim();
  }
  var totalSec = gameTimeSec || 0;
  var min = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  var minStr = min < 10 ? '0' + min : String(min);
  var secStr = sec < 10 ? '0' + sec : String(sec);
  return minStr + ':' + secStr;
}

function translatePosition(code?: string): string {
  var c = (code || '').toUpperCase();
  if (c === 'GK') return 'Portero';
  if (c === 'RB') return 'Lateral derecho';
  if (c === 'LB') return 'Lateral izquierdo';
  if (c === 'CB') return 'Central';
  if (c === 'RCB') return 'Central derecho';
  if (c === 'LCB') return 'Central izquierdo';
  if (c === 'DM' || c === 'CDM') return 'Pivote defensivo';
  if (c === 'CM') return 'Mediocentro';
  if (c === 'RCM') return 'Interior derecho';
  if (c === 'LCM') return 'Interior izquierdo';
  if (c === 'AM' || c === 'CAM') return 'Mediapunta';
  if (c === 'RW') return 'Extremo derecho';
  if (c === 'LW') return 'Extremo izquierdo';
  if (c === 'CF' || c === 'ST') return 'Delantero centro';
  return code || 'Posición';
}

function translateResult(code?: string): string {
  var c = (code || '').toUpperCase();
  if (c === 'SAVED_SHOT') return 'Remate parado';
  if (c === 'GOAL') return 'Gol';
  if (c === 'OFF_TARGET') return 'Remate fuera';
  if (c === 'BLOCKED') return 'Remate bloqueado';
  if (c === 'WOODWORK') return 'Remate al palo';
  if (c === 'PENALTY') return 'Penalti';
  return code || '';
}

function translateTrajectory(labels: string[]): string {
  if (labels.indexOf('CROSS_TOWARDS_GOAL') !== -1) return 'Cerrado (hacia portería)';
  if (labels.indexOf('CROSS_AWAY_FROM_GOAL') !== -1) return 'Abierto (alejándose de portería)';
  return 'No especificada';
}

function translateZone(labels: string[]): string {
  if (labels.indexOf('NEAR_POST') !== -1) return 'Primer palo';
  if (labels.indexOf('FAR_POST') !== -1) return 'Segundo palo';
  if (labels.indexOf('CENTRAL_ZONE') !== -1 || labels.indexOf('CENTRAL') !== -1) return 'Zona central';
  if (labels.indexOf('SHORT_CORNER_ZONE') !== -1) return 'En corto';
  if (labels.indexOf('PENALTY_BOX') !== -1) return 'Dentro del área';
  if (labels.indexOf('OUTSIDE_PENALTY_BOX') !== -1) return 'Fuera del área';
  return 'Zona central';
}

function getTagValue(event: any, tagKey: string): string {
  if (Array.isArray(event.selectedLabels)) {
    var found = event.selectedLabels.find(function(l: any) {
      return l.tag && (l.tag.i18NKey === tagKey || l.tag.tag === tagKey);
    });
    if (found) {
      return found.i18NKey || '';
    }
  }
  return '';
}

function isCounterAttack(event: any): boolean {
  var tagVal = getTagValue(event, 'RESULTING_FROM_COUNTER_ATTACK');
  if (tagVal === 'YES') return true;
  if (tagVal === 'NO') return false;
  if (event.resultingFromCounterAttack === 'YES') return true;
  if (event.phaseOrigin === 'COUNTER') return true;
  return false;
}

function getEventLabels(e: any): string[] {
  var list: string[] = [];
  if (Array.isArray(e.selectedLabels)) {
    e.selectedLabels.forEach(function(l: any) {
      if (l.i18NKey) list.push(l.i18NKey);
      else if (l.tag && l.tag.i18NKey) list.push(l.tag.i18NKey);
    });
  }
  if (Array.isArray(e.tags)) {
    e.tags.forEach(function(t: any) {
      if (typeof t === 'string' && list.indexOf(t) === -1) list.push(t);
    });
  }
  return list;
}

function getPlayerFromEvent(e: any, tagKey?: string): DieLigenPlayerRef | null {
  if (Array.isArray(e.selectedPlayers)) {
    var found = e.selectedPlayers.find(function(p: any) {
      if (!tagKey) return true;
      return p.tag && (p.tag.i18NKey === tagKey || p.tag.tag === tagKey);
    });
    if (found && found.player) {
      var pl = found.player;
      var name = pl.playerName || ((pl.playerFirstName || '') + ' ' + (pl.playerLastName || '')).trim() || ('Dorsal ' + (pl.shirtNumber || '?'));
      return {
        id: pl.id,
        nombre: name,
        apellido: pl.playerLastName || pl.playerFirstName || name,
        dorsal: pl.shirtNumber !== undefined ? pl.shirtNumber : '?'
      };
    }
  }
  if (Array.isArray(e.playerTags)) {
    var pTag = e.playerTags.find(function(pt: any) {
      if (!tagKey) return true;
      return pt.tag === tagKey;
    });
    if (pTag) {
      return {
        id: pTag.playerId,
        nombre: pTag.playerName || ('Jugador #' + (pTag.shirtNumber || '?')),
        apellido: pTag.playerLastName || 'Jugador',
        dorsal: pTag.shirtNumber !== undefined ? pTag.shirtNumber : '?'
      };
    }
  }
  return null;
}

// ─── Extractor Principal ──────────────────────────────────────────────────────

export function extraerDatosPartidoDieLigen(json: any): DieLigenMatchReportData {
  if (!json || typeof json !== 'object') {
    throw new Error('El archivo proporcionado no es un JSON válido.');
  }

  var gi = json.gameInfo || {};
  var rawHome = gi.homeTeam || {};
  var rawAway = gi.awayTeam || {};

  var homeId = rawHome.id;
  var awayId = rawAway.id;

  var homeName = safeStr(rawHome.name, 'Equipo Local');
  var awayName = safeStr(rawAway.name, 'Equipo Visitante');

  var roundOrder = (gi.round && gi.round.roundOrderNumber) || gi.roundOrderNumber || '';
  var roundLabel = roundOrder ? ('J-' + roundOrder) : 'Jornada N/D';

  var dateStr = safeStr(gi.gameDate);
  var fechaFormateada = dateStr;
  if (dateStr) {
    try {
      var dObj = new Date(dateStr);
      if (!isNaN(dObj.getTime())) {
        fechaFormateada = dObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch (err) {}
  }

  var cabecera = {
    tipo: 'DIRECTO',
    local: { id: homeId, nombre: homeName },
    visitante: { id: awayId, nombre: awayName },
    golesLocal: gi.scoreHome !== undefined ? gi.scoreHome : (gi.goalsHomeTeam !== undefined ? gi.goalsHomeTeam : 0),
    golesVisitante: gi.scoreAway !== undefined ? gi.scoreAway : (gi.goalsAwayTeam !== undefined ? gi.goalsAwayTeam : 0),
    descansoLocal: gi.homeScoreHalftime !== undefined ? gi.homeScoreHalftime : (gi.firstHalfGoalsHomeTeam !== undefined ? gi.firstHalfGoalsHomeTeam : 0),
    descansoVisitante: gi.awayScoreHalftime !== undefined ? gi.awayScoreHalftime : (gi.firstHalfGoalsAwayTeam !== undefined ? gi.firstHalfGoalsAwayTeam : 0),
    jornada: roundLabel,
    numeroJornada: roundOrder,
    fecha: fechaFormateada,
    campo: safeStr(gi.venue_name || gi.venueName, 'Campo Municipal'),
    competicion: safeStr((gi.contest && gi.contest.name) || gi.contestName, 'Competición oficial'),
    temporada: safeStr((gi.contest && gi.contest.seasonYear) || gi.seasonName, 'Temporada oficial')
  };

  // Filtro obligatorio: descartar eventos defensivos para evitar duplicados
  var events = (json.events || []).filter(function(e: any) {
    return !e.defensiveEvent;
  });

  function isHomeEvent(e: any): boolean {
    if (e.teamType) return e.teamType === 'HOME';
    if (e.team && e.team.id) return e.team.id === homeId;
    return false;
  }

  var homeEvents = events.filter(isHomeEvent);
  var awayEvents = events.filter(function(e: any) { return !isHomeEvent(e); });

  // 1. GOLES
  var goalEvents = events.filter(function(e: any) {
    return e.categoryName === 'GOAL' || e.category === 'GOAL';
  }).sort(function(a: any, b: any) {
    var ta = a.gameTime !== undefined ? a.gameTime : (a.minute || 0) * 60;
    var tb = b.gameTime !== undefined ? b.gameTime : (b.minute || 0) * 60;
    return ta - tb;
  });

  var goles: DieLigenGoalItem[] = goalEvents.map(function(g: any) {
    var isHome = isHomeEvent(g);
    var lbls = getEventLabels(g);

    // Detección precisa de autogol (SCORER_OWN_GOAL o GOAL_TYPE == 'OWN_GOAL')
    var ownGoalPlayer = getPlayerFromEvent(g, 'SCORER_OWN_GOAL');
    var isOwnGoal = Boolean(ownGoalPlayer) || lbls.indexOf('OWN_GOAL') !== -1;

    var scorer = isOwnGoal ? ownGoalPlayer : getPlayerFromEvent(g, 'SCORER');
    var assist = getPlayerFromEvent(g, 'ASSIST_PROVIDER');
    var recov = getPlayerFromEvent(g, 'BALL_RECOVERER');

    var lane = 'Centro';
    if (lbls.indexOf('HALF_RIGHT') !== -1 || lbls.indexOf('RIGHT_CROSS_ZONE') !== -1 || lbls.indexOf('RIGHT') !== -1) lane = 'Carril derecho';
    else if (lbls.indexOf('HALF_LEFT') !== -1 || lbls.indexOf('LEFT_CROSS_ZONE') !== -1 || lbls.indexOf('LEFT') !== -1) lane = 'Carril izquierdo';

    var shotZone = 'Dentro del área';
    if (lbls.indexOf('OUTSIDE_PENALTY_BOX') !== -1) shotZone = 'Fuera del área';
    else if (lbls.indexOf('NEAR_POST') !== -1) shotZone = 'Primer palo';
    else if (lbls.indexOf('FAR_POST') !== -1) shotZone = 'Segundo palo';

    var sitPrev = 'Jugada colectiva';
    if (lbls.indexOf('CORNER') !== -1) sitPrev = 'Córner';
    else if (lbls.indexOf('FREEKICK') !== -1 || lbls.indexOf('FREE_KICK') !== -1) sitPrev = 'Golpe franco';
    else if (lbls.indexOf('PASS_FROM_OPEN_PLAY') !== -1) sitPrev = 'Pase en juego';
    else if (lbls.indexOf('THROW_IN') !== -1) sitPrev = 'Saque de banda';

    var tipoJug = 'Remate en juego';
    if (isOwnGoal) tipoJug = 'Autogol (en propia puerta)';
    else if (lbls.indexOf('HIGH_CROSS_FROM_OPEN_PLAY') !== -1 || lbls.indexOf('HIGH_CROSS') !== -1) tipoJug = 'Centro alto al área';
    else if (lbls.indexOf('LOW_CROSS_FROM_OPEN_PLAY') !== -1 || lbls.indexOf('LOW_CROSS') !== -1) tipoJug = 'Centro raso al área';
    else if (lbls.indexOf('LONG') !== -1) tipoJug = 'Pase en profundidad';
    else if (lbls.indexOf('COMBINATION') !== -1) tipoJug = 'Combinación';

    var isCtr = isCounterAttack(g);
    var minFutbol = formatFootballMinute(g.gameTimeString, g.gameTime, g.minute);
    var tExacto = formatExactTime(g.gameTimeDetailedString, g.gameTime);

    var scorerLabel = 'Jugador no identificado';
    if (scorer) {
      scorerLabel = scorer.nombre + ' (' + scorer.dorsal + ')' + (isOwnGoal ? ' [en propia puerta]' : '');
    } else if (isOwnGoal) {
      scorerLabel = 'En propia puerta';
    }

    return {
      minutoFutbolistico: minFutbol,
      tiempoExacto: tExacto,
      equipoNombre: isHome ? homeName : awayName,
      esLocal: isHome,
      esAutogol: isOwnGoal,
      goleador: scorerLabel,
      asistente: assist ? (assist.nombre + ' (' + assist.dorsal + ')') : null,
      recuperador: recov ? (recov.nombre + ' (' + recov.dorsal + ')') : null,
      carril: lane,
      zona: shotZone,
      situacionPrevia: sitPrev,
      tipoJugada: tipoJug,
      contraataque: isCtr
    };
  });

  // 2. TIROS Y REMATES
  function procesarTiros(teamEvents: any[], teamGoalsCount: number): DieLigenTeamShots {
    var shotEvents = teamEvents.filter(function(e: any) {
      return e.categoryName === 'SHOT' || e.category === 'SHOT';
    });

    var saved = 0;
    var offTarget = 0;
    var blocked = 0;
    var woodwork = 0;
    var insideBox = 0;
    var outsideBox = 0;
    var contras = 0;
    var lanes = { izq: 0, centro: 0, der: 0 };
    var players: Record<string, number> = {};

    shotEvents.forEach(function(s: any) {
      var lbls = getEventLabels(s);
      if (lbls.indexOf('SAVED_SHOT') !== -1) saved++;
      else if (lbls.indexOf('WOODWORK') !== -1) woodwork++;
      else if (lbls.indexOf('BLOCKED') !== -1) blocked++;
      else offTarget++;

      if (lbls.indexOf('OUTSIDE_PENALTY_BOX') !== -1) outsideBox++;
      else insideBox++;

      if (isCounterAttack(s)) contras++;

      if (lbls.indexOf('HALF_LEFT') !== -1 || lbls.indexOf('LEFT') !== -1 || lbls.indexOf('LEFT_CROSS_ZONE') !== -1) lanes.izq++;
      else if (lbls.indexOf('HALF_RIGHT') !== -1 || lbls.indexOf('RIGHT') !== -1 || lbls.indexOf('RIGHT_CROSS_ZONE') !== -1) lanes.der++;
      else lanes.centro++;

      var pl = getPlayerFromEvent(s, 'SHOT_TAKER');
      if (pl) {
        var pKey = pl.nombre + ' (' + pl.dorsal + ')';
        players[pKey] = (players[pKey] || 0) + 1;
      }
    });

    // Separar los goles normales de los autogoles de los que se beneficia el equipo
    var isHomeTeam = isHomeEvent(teamEvents[0] || {});
    var goalsThisTeam = goalEvents.filter(function(g: any) {
      return isHomeEvent(g) === isHomeTeam;
    });

    var ownGoalsBenefited = 0;
    goalsThisTeam.forEach(function(g: any) {
      var lbls = getEventLabels(g);
      var ownGoalPlayer = getPlayerFromEvent(g, 'SCORER_OWN_GOAL');
      var isOwnGoal = Boolean(ownGoalPlayer) || lbls.indexOf('OWN_GOAL') !== -1;

      if (isOwnGoal) {
        // Corrección: El autogol NO se cuenta como tiro propio del equipo beneficiado
        ownGoalsBenefited++;
        return;
      }

      if (lbls.indexOf('OUTSIDE_PENALTY_BOX') !== -1) outsideBox++;
      else insideBox++;

      if (isCounterAttack(g)) contras++;

      if (lbls.indexOf('HALF_LEFT') !== -1 || lbls.indexOf('LEFT') !== -1 || lbls.indexOf('LEFT_CROSS_ZONE') !== -1) lanes.izq++;
      else if (lbls.indexOf('HALF_RIGHT') !== -1 || lbls.indexOf('RIGHT') !== -1 || lbls.indexOf('RIGHT_CROSS_ZONE') !== -1) lanes.der++;
      else lanes.centro++;

      var pl = getPlayerFromEvent(g, 'SCORER');
      if (pl) {
        var pKey = pl.nombre + ' (' + pl.dorsal + ')';
        players[pKey] = (players[pKey] || 0) + 1;
      }
    });

    // Goles reales derivados de remates propios (excluye autogoles del rival)
    var earnedGoalsCount = Math.max(0, teamGoalsCount - ownGoalsBenefited);
    var rematesSinGol = shotEvents.length;
    var totalIntentos = rematesSinGol + earnedGoalsCount;
    var aPuerta = saved + earnedGoalsCount;

    var ranking = Object.keys(players).map(function(k) {
      return { jugador: k, total: players[k] };
    }).sort(function(a, b) { return b.total - a.total; });

    return {
      rematesSinGol: rematesSinGol,
      goles: teamGoalsCount,
      autogolesBeneficiados: ownGoalsBenefited,
      totalIntentos: totalIntentos,
      aPuerta: aPuerta,
      parados: saved,
      fuera: offTarget,
      bloqueados: blocked,
      alPalo: woodwork,
      dentroArea: insideBox,
      fueraArea: outsideBox,
      contraataques: contras,
      pctPuerta: calcPct(aPuerta, totalIntentos),
      pctFuera: calcPct(offTarget, totalIntentos),
      carriles: {
        izquierda: lanes.izq,
        centro: lanes.centro,
        derecha: lanes.der,
        pctIzq: calcPct(lanes.izq, totalIntentos),
        pctCentro: calcPct(lanes.centro, totalIntentos),
        pctDer: calcPct(lanes.der, totalIntentos)
      },
      jugadores: ranking
    };
  }

  var tirosHome = procesarTiros(homeEvents, cabecera.golesLocal);
  var tirosAway = procesarTiros(awayEvents, cabecera.golesVisitante);
  var totalIntentos = tirosHome.totalIntentos + tirosAway.totalIntentos;

  var cronologiaTiros: DieLigenShotItem[] = events.filter(function(e: any) {
    var cat = e.categoryName || e.category;
    return cat === 'SHOT' || cat === 'GOAL';
  }).sort(function(a: any, b: any) {
    var ta = a.gameTime !== undefined ? a.gameTime : (a.minute || 0) * 60;
    var tb = b.gameTime !== undefined ? b.gameTime : (b.minute || 0) * 60;
    return ta - tb;
  }).map(function(s: any) {
    var isH = isHomeEvent(s);
    var cat = s.categoryName || s.category;
    var lbls = getEventLabels(s);

    var ownGoalPlayer = getPlayerFromEvent(s, 'SCORER_OWN_GOAL');
    var isOwnGoal = Boolean(ownGoalPlayer) || lbls.indexOf('OWN_GOAL') !== -1;

    var pl = isOwnGoal ? ownGoalPlayer : getPlayerFromEvent(s, cat === 'GOAL' ? 'SCORER' : 'SHOT_TAKER');

    var res = 'OFF_TARGET';
    if (isOwnGoal) res = 'AUTOGOL';
    else if (cat === 'GOAL') res = 'GOAL';
    else if (lbls.indexOf('SAVED_SHOT') !== -1) res = 'SAVED_SHOT';
    else if (lbls.indexOf('WOODWORK') !== -1) res = 'WOODWORK';
    else if (lbls.indexOf('BLOCKED') !== -1) res = 'BLOCKED';

    var isCtr = isCounterAttack(s);
    var isInside = lbls.indexOf('OUTSIDE_PENALTY_BOX') === -1;
    var minFutbol = formatFootballMinute(s.gameTimeString, s.gameTime, s.minute);
    var tExacto = formatExactTime(s.gameTimeDetailedString, s.gameTime);

    var playerName = pl ? (pl.nombre + ' (' + pl.dorsal + ')') : 'Jugador no identificado';
    if (isOwnGoal) {
      playerName = (pl ? (pl.nombre + ' (' + pl.dorsal + ')') : 'Jugador') + ' [en propia puerta]';
    }

    return {
      minutoFutbolistico: minFutbol,
      tiempoExacto: tExacto,
      equipoNombre: isH ? homeName : awayName,
      esLocal: isH,
      jugador: playerName,
      zona: isInside ? 'Dentro del área' : 'Fuera del área',
      resultadoBadge: isOwnGoal ? 'Autogol' : translateResult(res),
      contraataque: isCtr ? 'Contraataque' : 'Ataque organizado'
    };
  });

  // 3. CENTROS
  function procesarCentros(teamEvents: any[]): DieLigenTeamCrosses {
    var crossEvents = teamEvents.filter(function(e: any) {
      var c = e.categoryName || e.category;
      return c === 'CROSS_HIGH_AND_LOW' || c === 'CROSS';
    });

    var total = crossEvents.length;
    var altos = 0;
    var bajos = 0;
    var der = 0;
    var izq = 0;
    var conRemate = 0;
    var sinOcasion = 0;
    var contras = 0;
    var players: Record<string, number> = {};

    crossEvents.forEach(function(c: any) {
      var lbls = getEventLabels(c);
      if (lbls.indexOf('LOW_CROSS') !== -1 || lbls.indexOf('LOW_CROSS_FROM_OPEN_PLAY') !== -1) bajos++;
      else altos++;

      if (lbls.indexOf('RIGHT_CROSS_ZONE') !== -1 || lbls.indexOf('RIGHT') !== -1) der++;
      else izq++;

      if (lbls.indexOf('SHOT') !== -1 || lbls.indexOf('GOAL') !== -1) conRemate++;
      else sinOcasion++;

      if (isCounterAttack(c)) {
        contras++;
      }

      var pl = getPlayerFromEvent(c, 'CROSS_TAKER');
      if (pl) {
        var pKey = pl.nombre + ' (' + pl.dorsal + ')';
        players[pKey] = (players[pKey] || 0) + 1;
      }
    });

    var ranking = Object.keys(players).map(function(k) {
      return { jugador: k, total: players[k] };
    }).sort(function(a, b) { return b.total - a.total; });

    return {
      total: total,
      altos: altos,
      bajos: bajos,
      derecha: der,
      izquierda: izq,
      conRemate: conRemate,
      sinOcasion: sinOcasion,
      contraataques: contras,
      jugadores: ranking
    };
  }

  var centrosHome = procesarCentros(homeEvents);
  var centrosAway = procesarCentros(awayEvents);
  var totalCentros = centrosHome.total + centrosAway.total;

  var cronologiaCentros: DieLigenCrossItem[] = events.filter(function(e: any) {
    var c = e.categoryName || e.category;
    return c === 'CROSS_HIGH_AND_LOW' || c === 'CROSS';
  }).sort(function(a: any, b: any) {
    return (a.gameTime || 0) - (b.gameTime || 0);
  }).map(function(c: any) {
    var isH = isHomeEvent(c);
    var pl = getPlayerFromEvent(c, 'CROSS_TAKER');
    var lbls = getEventLabels(c);
    var band = (lbls.indexOf('RIGHT_CROSS_ZONE') !== -1 || lbls.indexOf('RIGHT') !== -1) ? 'Banda derecha' : 'Banda izquierda';
    var height = (lbls.indexOf('LOW_CROSS') !== -1 || lbls.indexOf('LOW_CROSS_FROM_OPEN_PLAY') !== -1) ? 'Bajo' : 'Alto';
    var isCtr = isCounterAttack(c);
    var res = (lbls.indexOf('SHOT') !== -1 || lbls.indexOf('GOAL') !== -1) ? 'Termina en remate' : 'Sin ocasión';
    var minFutbol = formatFootballMinute(c.gameTimeString, c.gameTime, c.minute);
    var tExacto = formatExactTime(c.gameTimeDetailedString, c.gameTime);

    return {
      minutoFutbolistico: minFutbol,
      tiempoExacto: tExacto,
      equipoNombre: isH ? homeName : awayName,
      esLocal: isH,
      jugador: pl ? (pl.nombre + ' (' + pl.dorsal + ')') : 'No identificado',
      banda: band,
      tipo: height,
      contraataque: isCtr ? 'Contraataque' : 'Ataque organizado',
      resultado: res
    };
  });

  // 4. CÓRNERES
  function procesarCorneres(teamEvents: any[]): DieLigenTeamCorners {
    var cornerEvents = teamEvents.filter(function(e: any) {
      var c = e.categoryName || e.category;
      return c === 'CORNER';
    });

    var total = cornerEvents.length;
    var der = 0;
    var izq = 0;
    var gol = 0;
    var remate = 0;
    var sinOcasion = 0;
    var players: Record<string, number> = {};

    cornerEvents.forEach(function(c: any) {
      var lbls = getEventLabels(c);
      if (lbls.indexOf('RIGHT_CORNER') !== -1) der++;
      else izq++;

      if (lbls.indexOf('GOAL') !== -1) gol++;
      else if (lbls.indexOf('SHOT') !== -1) remate++;
      else sinOcasion++;

      var pl = getPlayerFromEvent(c, 'CORNER_TAKER');
      if (pl) {
        var pKey = pl.nombre + ' (' + pl.dorsal + ')';
        players[pKey] = (players[pKey] || 0) + 1;
      }
    });

    var ranking = Object.keys(players).map(function(k) {
      return { jugador: k, total: players[k] };
    }).sort(function(a, b) { return b.total - a.total; });

    return {
      total: total,
      derecha: der,
      izquierda: izq,
      gol: gol,
      remate: remate,
      sinOcasion: sinOcasion,
      jugadores: ranking
    };
  }

  var cornersHome = procesarCorneres(homeEvents);
  var cornersAway = procesarCorneres(awayEvents);
  var totalCorners = cornersHome.total + cornersAway.total;

  var cronologiaCorners: DieLigenCornerItem[] = events.filter(function(e: any) {
    var c = e.categoryName || e.category;
    return c === 'CORNER';
  }).sort(function(a: any, b: any) {
    return (a.gameTime || 0) - (b.gameTime || 0);
  }).map(function(c: any) {
    var isH = isHomeEvent(c);
    var pl = getPlayerFromEvent(c, 'CORNER_TAKER');
    var lbls = getEventLabels(c);

    var lado = (lbls.indexOf('RIGHT_CORNER') !== -1) ? 'Esquina derecha' : 'Esquina izquierda';
    var tray = translateTrajectory(lbls);
    var zona = translateZone(lbls);

    var res = 'Sin ocasión';
    if (lbls.indexOf('GOAL') !== -1) res = 'Gol';
    else if (lbls.indexOf('SHOT') !== -1) res = 'Termina en remate';

    var minFutbol = formatFootballMinute(c.gameTimeString, c.gameTime, c.minute);
    var tExacto = formatExactTime(c.gameTimeDetailedString, c.gameTime);

    return {
      minutoFutbolistico: minFutbol,
      tiempoExacto: tExacto,
      equipoNombre: isH ? homeName : awayName,
      esLocal: isH,
      lanzador: pl ? (pl.nombre + ' (' + pl.dorsal + ')') : 'No identificado',
      lado: lado,
      trayectoria: tray,
      zona: zona,
      resultado: res
    };
  });

  // 5. GOLPES FRANCOS ANALIZADOS
  function procesarGolpesFrancos(teamEvents: any[]): DieLigenTeamFreeKicks {
    var fkEvents = teamEvents.filter(function(e: any) {
      var c = e.categoryName || e.category;
      return c === 'FREEKICK';
    });

    var total = fkEvents.length;
    var centros = 0;
    var tiros = 0;
    var pases = 0;
    var players: Record<string, number> = {};

    fkEvents.forEach(function(f: any) {
      var execVal = getTagValue(f, 'FREEKICK_EXECUTION');
      if (execVal === 'CROSS') centros++;
      else if (execVal === 'SHOT') tiros++;
      else if (execVal === 'PASS') pases++;
      else centros++;

      var pl = getPlayerFromEvent(f, 'FREEKICK_TAKER');
      if (pl) {
        var pKey = pl.nombre + ' (' + pl.dorsal + ')';
        players[pKey] = (players[pKey] || 0) + 1;
      }
    });

    var ranking = Object.keys(players).map(function(k) {
      return { jugador: k, total: players[k] };
    }).sort(function(a, b) { return b.total - a.total; });

    return {
      total: total,
      centros: centros,
      tiros: tiros,
      pases: pases,
      jugadores: ranking
    };
  }

  var faltasHome = procesarGolpesFrancos(homeEvents);
  var faltasAway = procesarGolpesFrancos(awayEvents);
  var totalFaltas = faltasHome.total + faltasAway.total;

  var cronologiaFaltas: DieLigenFreeKickItem[] = events.filter(function(e: any) {
    var c = e.categoryName || e.category;
    return c === 'FREEKICK';
  }).sort(function(a: any, b: any) {
    return (a.gameTime || 0) - (b.gameTime || 0);
  }).map(function(f: any) {
    var isH = isHomeEvent(f);
    var pl = getPlayerFromEvent(f, 'FREEKICK_TAKER');
    var lbls = getEventLabels(f);

    var execVal = getTagValue(f, 'FREEKICK_EXECUTION');
    var exec = 'Centro';
    if (execVal === 'SHOT') exec = 'Tiro';
    else if (execVal === 'PASS') exec = 'Pase';

    var zona = 'Zona central';
    if (lbls.indexOf('RIGHT') !== -1 || lbls.indexOf('HALF_RIGHT') !== -1) zona = 'Banda derecha';
    else if (lbls.indexOf('LEFT') !== -1 || lbls.indexOf('HALF_LEFT') !== -1) zona = 'Banda izquierda';

    var res = null;
    if (lbls.indexOf('GOAL') !== -1) res = 'Gol';
    else if (lbls.indexOf('SHOT') !== -1) res = 'Termina en remate';
    else if (lbls.indexOf('NO_CHANCE') !== -1) res = 'Sin ocasión';

    var minFutbol = formatFootballMinute(f.gameTimeString, f.gameTime, f.minute);
    var tExacto = formatExactTime(f.gameTimeDetailedString, f.gameTime);

    return {
      minutoFutbolistico: minFutbol,
      tiempoExacto: tExacto,
      equipoNombre: isH ? homeName : awayName,
      esLocal: isH,
      lanzador: pl ? (pl.nombre + ' (' + pl.dorsal + ')') : 'No identificado',
      ejecucion: exec,
      zona: zona,
      resultado: res || 'Acción registrada'
    };
  });

  // 6. SAQUES DE PUERTA
  function procesarSaquesPuerta(teamEvents: any[]): DieLigenTeamGoalKicks {
    var gkEvents = teamEvents.filter(function(e: any) {
      var c = e.categoryName || e.category;
      return c === 'GOAL_KICK';
    });

    var total = gkEvents.length;
    var cortos = 0;
    var medios = 0;
    var largos = 0;

    gkEvents.forEach(function(g: any) {
      var lbls = getEventLabels(g);
      if (lbls.indexOf('SHORT') !== -1) cortos++;
      else if (lbls.indexOf('MID') !== -1) medios++;
      else if (lbls.indexOf('LONG') !== -1) largos++;
      else largos++;
    });

    return {
      total: total,
      cortos: cortos,
      medios: medios,
      largos: largos,
      pctCortos: calcPct(cortos, total),
      pctMedios: calcPct(medios, total),
      pctLargos: calcPct(largos, total)
    };
  }

  var saquesPuertaHome = procesarSaquesPuerta(homeEvents);
  var saquesPuertaAway = procesarSaquesPuerta(awayEvents);
  var totalSaquesPuerta = saquesPuertaHome.total + saquesPuertaAway.total;

  // 7. SAQUES DE BANDA
  function procesarSaquesBanda(teamEvents: any[]): DieLigenTeamThrowIns {
    var tiEvents = teamEvents.filter(function(e: any) {
      var c = e.categoryName || e.category;
      return c === 'THROW_IN';
    });

    var total = tiEvents.length;
    var propio = 0;
    var rival = 0;
    var generaCentro = 0;
    var sinOcasion = 0;

    tiEvents.forEach(function(t: any) {
      var lbls = getEventLabels(t);
      if (lbls.indexOf('OWN_HALF') !== -1) propio++;
      else rival++;

      if (lbls.indexOf('CROSS_HIGH_AND_LOW') !== -1 || lbls.indexOf('CROSS') !== -1) generaCentro++;
      else sinOcasion++;
    });

    return {
      total: total,
      campoPropio: propio,
      campoRival: rival,
      pctPropio: calcPct(propio, total),
      pctRival: calcPct(rival, total),
      generaCentro: generaCentro,
      sinOcasion: sinOcasion
    };
  }

  var saquesBandaHome = procesarSaquesBanda(homeEvents);
  var saquesBandaAway = procesarSaquesBanda(awayEvents);
  var totalSaquesBanda = saquesBandaHome.total + saquesBandaAway.total;

  // 8. FORMACIONES TÁCTICAS
  function procesarFormacion(formationObj: any, teamName: string, isLocal: boolean): {
    sistemaOfensivo: string;
    sistemaNombreCorto: string;
    jugadores: DieLigenFormationPlayer[];
  } {
    if (!formationObj) {
      return {
        sistemaOfensivo: '4-4-2',
        sistemaNombreCorto: '4-4-2',
        jugadores: []
      };
    }

    var formGroup = (formationObj.formation && formationObj.formation.formationGroup && formationObj.formation.formationGroup.i18NKey) || '';
    var formKey = (formationObj.formation && formationObj.formation.i18NKey) || '';

    var sysName = formKey || formGroup || '4-4-2';
    var sysTitle = sysName;
    if (formGroup && formKey && formGroup !== formKey) {
      sysTitle = formKey + ' (anunciada ' + formGroup + ')';
    }

    var positions = formationObj.gameFormationPositions || [];
    var jugadores: DieLigenFormationPlayer[] = positions.map(function(posItem: any) {
      var pl = posItem.player || {};
      var pos = posItem.position || {};

      var fullName = pl.playerName || ((pl.playerFirstName || '') + ' ' + (pl.playerLastName || '')).trim() || ('Dorsal ' + (pl.shirtNumber || '?'));
      var lastName = pl.playerLastName || pl.playerFirstName || fullName;
      var dorsal = pl.shirtNumber !== undefined ? pl.shirtNumber : '?';
      var posCode = pos.shortI18NKey || pos.i18NKey || 'CM';
      var posEsp = translatePosition(posCode);

      var fx = (pos.fieldX !== undefined && pos.fieldX !== null) ? pos.fieldX : 50;
      var fy = (pos.fieldY !== undefined && pos.fieldY !== null) ? pos.fieldY : 50;

      var cx = Math.round(12 + (fx / 100) * 196);
      var cy = Math.round(298 - (fy / 100) * 260);

      return {
        id: pl.id,
        dorsal: dorsal,
        nombreCompleto: fullName,
        apellido: lastName,
        posicionCodigo: posCode,
        posicionEsp: posEsp,
        cx: cx,
        cy: cy,
        fieldX: fx,
        fieldY: fy
      };
    });

    return {
      sistemaOfensivo: sysTitle,
      sistemaNombreCorto: sysName,
      jugadores: jugadores
    };
  }

  var formHomeOff = procesarFormacion(json.homeOffensiveGameFormation, homeName, true);
  var formHomeDef = procesarFormacion(json.homeDefensiveGameFormation, homeName, true);

  var formAwayOff = procesarFormacion(json.awayOffensiveGameFormation, awayName, false);
  var formAwayDef = procesarFormacion(json.awayDefensiveGameFormation, awayName, false);

  function analizarTransicionDefensiva(offObj: any, defObj: any) {
    var sysDefName = defObj.sistemaNombreCorto || '4-4-2';
    var cambios: string[] = [];

    var offMap: Record<string, DieLigenFormationPlayer> = {};
    offObj.jugadores.forEach(function(j: DieLigenFormationPlayer) { offMap[String(j.dorsal)] = j; });

    defObj.jugadores.forEach(function(dj: DieLigenFormationPlayer) {
      var oj = offMap[String(dj.dorsal)];
      if (oj && oj.posicionCodigo !== dj.posicionCodigo) {
        cambios.push(dj.nombreCompleto + ' pasa de ' + oj.posicionEsp + ' a ' + dj.posicionEsp);
      }
    });

    return {
      sistemaDefensivo: sysDefName,
      hayCambioEstructural: offObj.sistemaNombreCorto !== sysDefName || cambios.length > 0,
      cambiosPosicion: cambios
    };
  }

  var transicionHome = analizarTransicionDefensiva(formHomeOff, formHomeDef);
  var transicionAway = analizarTransicionDefensiva(formAwayOff, formAwayDef);

  return {
    cabecera: cabecera,
    goles: goles,
    tiros: {
      local: tirosHome,
      visitante: tirosAway,
      totalPartido: totalIntentos,
      cronologia: cronologiaTiros
    },
    centros: {
      local: centrosHome,
      visitante: centrosAway,
      totalPartido: totalCentros,
      cronologia: cronologiaCentros
    },
    corneres: {
      local: cornersHome,
      visitante: cornersAway,
      totalPartido: totalCorners,
      cronologia: cronologiaCorners
    },
    faltas: {
      local: faltasHome,
      visitante: faltasAway,
      totalPartido: totalFaltas,
      cronologia: cronologiaFaltas
    },
    saquesPuerta: {
      local: saquesPuertaHome,
      visitante: saquesPuertaAway,
      totalPartido: totalSaquesPuerta
    },
    saquesBanda: {
      local: saquesBandaHome,
      visitante: saquesBandaAway,
      totalPartido: totalSaquesBanda
    },
    formaciones: {
      local: {
        ofensiva: formHomeOff,
        defensiva: formHomeDef,
        transicion: transicionHome
      },
      visitante: {
        ofensiva: formAwayOff,
        defensiva: formAwayDef,
        transicion: transicionAway
      }
    }
  };
}
