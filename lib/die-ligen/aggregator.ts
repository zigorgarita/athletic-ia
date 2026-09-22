/**
 * lib/die-ligen/aggregator.ts
 *
 * Motor de agregación estadística pura para múltiples partidos de Die Ligen.
 *
 * REGLAS ARQUITECTÓNICAS ESTRICTAS:
 * 1. parser.ts permanece 100% INTACTO. Cada partido se procesa previamente con extraerDatosPartidoDieLigen.
 * 2. Perspectiva centrada siempre en el rival analizado (targetClubName), sea local o visitante en cada jornada.
 * 3. Porcentajes acumulados siempre ponderados matemáticamente: (suma de casos / suma de totales) * 100.
 * 4. Autogoles tratados con el criterio de Fase 1 (se anotan al marcador pero se excluyen de remates del rival).
 * 5. Cero invención de datos: las formaciones y titularidades se extraen exclusivamente de los 11 iniciales reales.
 * 6. Cero texto de IA: métricas, frecuencias y tablas objetivas puras.
 */

import {
  DieLigenMatchReportData,
  DieLigenGoalItem,
  DieLigenFormationSide,
  DieLigenFormationPlayer,
} from './parser';
import { isMatchingDieLigenTeam } from './mapping';

export interface MultiMatchHeaderItem {
  gameIndex: number;
  jornada: number | string;
  fecha: string;
  campo: string;
  esLocal: boolean;
  rivalNombre: string;
  golesFavor: number;
  golesContra: number;
  resultado: string; // ej. "4 - 2"
  signo: 'V' | 'E' | 'D';
}

export interface PlayerStatsSummary {
  jugador: string;
  total: number;
  partidosDetalle?: string;
}

export interface PlayerStartingMatrixItem {
  nombreCompleto: string;
  apellido: string;
  dorsal: number | string;
  titularidades: number;
  totalPartidos: number;
  pctTitular: string;
  posiciones: string[];
}

export interface SystemUsageItem {
  sistema: string;
  partidosCount: number;
  pctUso: string;
  jornadas: string[];
}

export interface MatchTrendRow {
  jornada: string;
  rival: string;
  condicion: 'Local' | 'Visitante';
  resultado: string;
  signo: 'V' | 'E' | 'D';
  rematesTotal: number;
  rematesPuerta: number;
  centrosTotal: number;
  corneresTotal: number;
  saquesPuertaTotal: number;
  saquesBandaTotal: number;
}

export interface DieLigenMultiMatchReportData {
  targetClubName: string;
  temporada: string;
  competicion: string;
  totalPartidos: number;
  jornadasIncluidas: string;
  partidos: MultiMatchHeaderItem[];

  // 1. Resumen general y balance
  balance: {
    victorias: number;
    empates: number;
    derrotas: number;
    puntos: number;
    golesFavor: number;
    golesContra: number;
    diferenciaGoles: number;
    promedioGolesFavor: string;
    promedioGolesContra: string;
  };

  // 2. Goles y autogoles
  goles: {
    golesFavorLista: Array<DieLigenGoalItem & { jornadaBadge: string; rivalPartido: string }>;
    golesContraLista: Array<{ jornadaBadge: string; minuto: string; tiempoExacto: string; rivalPartido: string }>;
    goleadores: PlayerStatsSummary[];
    asistentes: PlayerStatsSummary[];
    autogolesFavor: number;
  };

  // 3. Tiros y remates
  tiros: {
    totalIntentos: number;
    aPuerta: number;
    parados: number;
    fuera: number;
    bloqueados: number;
    alPalo: number;
    dentroArea: number;
    fueraArea: number;
    contraataques: number;
    promedioTiros: string;
    promedioPuerta: string;
    pctPuerta: string;
    pctFuera: string;
    pctDentroArea: string;
    carriles: {
      izquierda: number;
      centro: number;
      derecha: number;
      pctIzq: string;
      pctCentro: string;
      pctDer: string;
    };
    rematadores: PlayerStatsSummary[];
  };

  // 4. Centros al área
  centros: {
    total: number;
    altos: number;
    bajos: number;
    derecha: number;
    izquierda: number;
    conRemate: number;
    sinOcasion: number;
    contraataques: number;
    promedioCentros: string;
    pctDerecha: string;
    pctIzquierda: string;
    pctConRemate: string;
    centradores: PlayerStatsSummary[];
  };

  // 5. Córneres
  corneres: {
    total: number;
    derecha: number;
    izquierda: number;
    gol: number;
    remate: number;
    sinOcasion: number;
    promedioCorneres: string;
    pctDerecha: string;
    pctIzquierda: string;
    pctPeligro: string; // (remate + gol) / total
    lanzadores: PlayerStatsSummary[];
  };

  // 6. Golpes francos
  faltas: {
    total: number;
    centros: number;
    tiros: number;
    pases: number;
    promedioFaltas: string;
    pctTiros: string;
    pctCentros: string;
    pctPases: string;
    lanzadores: PlayerStatsSummary[];
  };

  // 7. Saques de puerta
  saquesPuerta: {
    total: number;
    cortos: number;
    medios: number;
    largos: number;
    pctCortos: string;
    pctMedios: string;
    pctLargos: string;
  };

  // 8. Saques de banda
  saquesBanda: {
    total: number;
    campoPropio: number;
    campoRival: number;
    generaCentro: number;
    sinOcasion: number;
    pctPropio: string;
    pctRival: string;
    pctGeneraCentro: string;
  };

  // 9. Formaciones y sistemas
  formaciones: {
    sistemasUsados: SystemUsageItem[];
    sistemaPrincipal: string;
    partidosDetalle: Array<{
      jornada: string;
      rival: string;
      esLocal: boolean;
      sistemaNombre: string;
      formacionCompleta: DieLigenFormationSide;
    }>;
    matrizTitulares: PlayerStartingMatrixItem[];
  };

  // 10. Evolución comparativa jornada a jornada
  tendenciasPorJornada: MatchTrendRow[];
}

function toPct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function toAvg(total: number, count: number): string {
  if (!count || count <= 0) return '0.0';
  return (total / count).toFixed(1);
}

/**
 * Agrega estadísticamente un conjunto de partidos procesados de Die Ligen
 * situando la perspectiva siempre en el equipo rival targetClubName.
 */
export function aggregateDieLigenMatches(
  matches: DieLigenMatchReportData[],
  targetClubName: string
): DieLigenMultiMatchReportData {
  if (!matches || matches.length === 0) {
    throw new Error('Se requiere al menos un partido para generar el informe acumulado.');
  }

  const totalPartidos = matches.length;
  const firstHeader = matches[0].cabecera;
  const temporada = firstHeader.temporada || '2026/27';
  const competicion = firstHeader.competicion || 'Competición Oficial';

  const partidos: MultiMatchHeaderItem[] = [];
  const tendenciasPorJornada: MatchTrendRow[] = [];

  let victorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golesFavor = 0;
  let golesContra = 0;

  // Goles
  const golesFavorLista: Array<DieLigenGoalItem & { jornadaBadge: string; rivalPartido: string }> = [];
  const golesContraLista: Array<{ jornadaBadge: string; minuto: string; tiempoExacto: string; rivalPartido: string }> = [];
  const goleadoresMap = new Map<string, number>();
  const asistentesMap = new Map<string, number>();
  let autogolesFavor = 0;

  // Tiros
  let tIntentos = 0;
  let tPuerta = 0;
  let tParados = 0;
  let tFuera = 0;
  let tBloqueados = 0;
  let tPalo = 0;
  let tDentroArea = 0;
  let tFueraArea = 0;
  let tContraataques = 0;
  let tCarrilIzq = 0;
  let tCarrilCentro = 0;
  let tCarrilDer = 0;
  const rematadoresMap = new Map<string, number>();

  // Centros
  let cTotal = 0;
  let cAltos = 0;
  let cBajos = 0;
  let cDerecha = 0;
  let cIzquierda = 0;
  let cConRemate = 0;
  let cSinOcasion = 0;
  let cContraataques = 0;
  const centradoresMap = new Map<string, number>();

  // Córneres
  let crTotal = 0;
  let crDerecha = 0;
  let crIzquierda = 0;
  let crGol = 0;
  let crRemate = 0;
  let crSinOcasion = 0;
  const lanzadoresCornerMap = new Map<string, number>();

  // Faltas
  let fTotal = 0;
  let fCentros = 0;
  let fTiros = 0;
  let fPases = 0;
  const lanzadoresFaltaMap = new Map<string, number>();

  // Saques puerta
  let spTotal = 0;
  let spCortos = 0;
  let spMedios = 0;
  let spLargos = 0;

  // Saques banda
  let sbTotal = 0;
  let sbPropio = 0;
  let sbRival = 0;
  let sbGeneraCentro = 0;
  let sbSinOcasion = 0;

  // Formaciones y sistemas
  const sistemasCountMap = new Map<string, { count: number; jornadas: string[] }>();
  const formacionesDetalle: Array<{
    jornada: string;
    rival: string;
    esLocal: boolean;
    sistemaNombre: string;
    formacionCompleta: DieLigenFormationSide;
  }> = [];

  // Matriz de titulares (clave: nombreCompleto o dorsal)
  const titularesMap = new Map<string, {
    nombreCompleto: string;
    apellido: string;
    dorsal: number | string;
    titularidades: number;
    posiciones: Set<string>;
  }>();

  // ─── PROCESADO PARTIDO A PARTIDO ───────────────────────────────────────────
  matches.forEach((m, idx) => {
    const cab = m.cabecera;
    const isTargetLocal = isMatchingDieLigenTeam(cab.local.nombre, targetClubName);
    const rivalNombre = isTargetLocal ? cab.visitante.nombre : cab.local.nombre;
    const gFavor = isTargetLocal ? cab.golesLocal : cab.golesVisitante;
    const gContra = isTargetLocal ? cab.golesVisitante : cab.golesLocal;

    golesFavor += gFavor;
    golesContra += gContra;

    let signo: 'V' | 'E' | 'D' = 'E';
    if (gFavor > gContra) {
      victorias++;
      signo = 'V';
    } else if (gFavor < gContra) {
      derrotas++;
      signo = 'D';
    } else {
      empates++;
      signo = 'E';
    }

    const jStr = String(cab.numeroJornada || cab.jornada || (idx + 1));
    const jBadge = `J-${jStr}`;

    partidos.push({
      gameIndex: idx,
      jornada: jStr,
      fecha: cab.fecha || 'N/D',
      campo: cab.campo || 'N/D',
      esLocal: isTargetLocal,
      rivalNombre,
      golesFavor: gFavor,
      golesContra: gContra,
      resultado: `${gFavor} - ${gContra}`,
      signo,
    });

    // 1. Goles
    (m.goles || []).forEach((g) => {
      const isTargetGoal = (isTargetLocal && g.esLocal) || (!isTargetLocal && !g.esLocal);
      if (isTargetGoal) {
        golesFavorLista.push({
          ...g,
          jornadaBadge: jBadge,
          rivalPartido: rivalNombre,
        });

        if (g.esAutogol) {
          autogolesFavor++;
        } else if (g.goleador) {
          goleadoresMap.set(g.goleador, (goleadoresMap.get(g.goleador) || 0) + 1);
        }

        if (g.asistente && g.asistente !== 'N/D' && g.asistente !== 'Sin asistencia') {
          asistentesMap.set(g.asistente, (asistentesMap.get(g.asistente) || 0) + 1);
        }
      } else {
        golesContraLista.push({
          jornadaBadge: jBadge,
          minuto: g.minutoFutbolistico || 'N/D',
          tiempoExacto: g.tiempoExacto || '',
          rivalPartido: rivalNombre,
        });
      }
    });

    // 2. Tiros y remates
    const sideShots = isTargetLocal ? m.tiros.local : m.tiros.visitante;
    tIntentos += sideShots.totalIntentos;
    tPuerta += sideShots.aPuerta;
    tParados += sideShots.parados;
    tFuera += sideShots.fuera;
    tBloqueados += sideShots.bloqueados;
    tPalo += sideShots.alPalo;
    tDentroArea += sideShots.dentroArea;
    tFueraArea += sideShots.fueraArea;
    tContraataques += sideShots.contraataques;

    tCarrilIzq += sideShots.carriles.izquierda;
    tCarrilCentro += sideShots.carriles.centro;
    tCarrilDer += sideShots.carriles.derecha;

    (sideShots.jugadores || []).forEach((item) => {
      if (item.jugador && item.total > 0) {
        rematadoresMap.set(item.jugador, (rematadoresMap.get(item.jugador) || 0) + item.total);
      }
    });

    // 3. Centros
    const sideCrosses = isTargetLocal ? m.centros.local : m.centros.visitante;
    cTotal += sideCrosses.total;
    cAltos += sideCrosses.altos;
    cBajos += sideCrosses.bajos;
    cDerecha += sideCrosses.derecha;
    cIzquierda += sideCrosses.izquierda;
    cConRemate += sideCrosses.conRemate;
    cSinOcasion += sideCrosses.sinOcasion;
    cContraataques += sideCrosses.contraataques;

    (sideCrosses.jugadores || []).forEach((item) => {
      if (item.jugador && item.total > 0) {
        centradoresMap.set(item.jugador, (centradoresMap.get(item.jugador) || 0) + item.total);
      }
    });

    // 4. Córneres
    const sideCorners = isTargetLocal ? m.corneres.local : m.corneres.visitante;
    crTotal += sideCorners.total;
    crDerecha += sideCorners.derecha;
    crIzquierda += sideCorners.izquierda;
    crGol += sideCorners.gol;
    crRemate += sideCorners.remate;
    crSinOcasion += sideCorners.sinOcasion;

    (sideCorners.jugadores || []).forEach((item) => {
      if (item.jugador && item.total > 0) {
        lanzadoresCornerMap.set(item.jugador, (lanzadoresCornerMap.get(item.jugador) || 0) + item.total);
      }
    });

    // 5. Faltas
    const sideFreeKicks = isTargetLocal ? m.faltas.local : m.faltas.visitante;
    fTotal += sideFreeKicks.total;
    fCentros += sideFreeKicks.centros;
    fTiros += sideFreeKicks.tiros;
    fPases += sideFreeKicks.pases;

    (sideFreeKicks.jugadores || []).forEach((item) => {
      if (item.jugador && item.total > 0) {
        lanzadoresFaltaMap.set(item.jugador, (lanzadoresFaltaMap.get(item.jugador) || 0) + item.total);
      }
    });

    // 6. Saques de puerta
    const sideGK = isTargetLocal ? m.saquesPuerta.local : m.saquesPuerta.visitante;
    spTotal += sideGK.total;
    spCortos += sideGK.cortos;
    spMedios += sideGK.medios;
    spLargos += sideGK.largos;

    // 7. Saques de banda
    const sideTI = isTargetLocal ? m.saquesBanda.local : m.saquesBanda.visitante;
    sbTotal += sideTI.total;
    sbPropio += sideTI.campoPropio;
    sbRival += sideTI.campoRival;
    sbGeneraCentro += sideTI.generaCentro;
    sbSinOcasion += sideTI.sinOcasion;

    // 8. Formaciones
    const sideFormation = isTargetLocal ? m.formaciones.local : m.formaciones.visitante;
    const sysName = sideFormation?.ofensiva?.sistemaNombreCorto || sideFormation?.ofensiva?.sistemaOfensivo || 'N/D';

    const existingSys = sistemasCountMap.get(sysName) || { count: 0, jornadas: [] };
    existingSys.count++;
    existingSys.jornadas.push(jBadge);
    sistemasCountMap.set(sysName, existingSys);

    formacionesDetalle.push({
      jornada: jBadge,
      rival: rivalNombre,
      esLocal: isTargetLocal,
      sistemaNombre: sysName,
      formacionCompleta: sideFormation,
    });

    // Registrar titulares objetivos de la alineación inicial
    (sideFormation?.ofensiva?.jugadores || []).forEach((p: DieLigenFormationPlayer) => {
      const key = (p.nombreCompleto || p.apellido || `Dorsal ${p.dorsal}`).trim();
      const existing = titularesMap.get(key) || {
        nombreCompleto: p.nombreCompleto || p.apellido || `Dorsal ${p.dorsal}`,
        apellido: p.apellido || '',
        dorsal: p.dorsal || 'N/D',
        titularidades: 0,
        posiciones: new Set<string>(),
      };
      existing.titularidades++;
      if (p.posicionEsp) {
        existing.posiciones.add(p.posicionEsp);
      } else if (p.posicionCodigo) {
        existing.posiciones.add(p.posicionCodigo);
      }
      titularesMap.set(key, existing);
    });

    // Fila evolutiva
    tendenciasPorJornada.push({
      jornada: jBadge,
      rival: rivalNombre,
      condicion: isTargetLocal ? 'Local' : 'Visitante',
      resultado: `${gFavor} - ${gContra}`,
      signo,
      rematesTotal: sideShots.totalIntentos,
      rematesPuerta: sideShots.aPuerta,
      centrosTotal: sideCrosses.total,
      corneresTotal: sideCorners.total,
      saquesPuertaTotal: sideGK.total,
      saquesBandaTotal: sideTI.total,
    });
  });

  // ─── CONSOLIDACIÓN DE MAPAS Y ORDENACIONES ─────────────────────────────────
  const mapToSortedList = (map: Map<string, number>): PlayerStatsSummary[] => {
    return Array.from(map.entries())
      .map(([jugador, total]) => ({ jugador, total }))
      .sort((a, b) => b.total - a.total);
  };

  const goleadores = mapToSortedList(goleadoresMap);
  const asistentes = mapToSortedList(asistentesMap);
  const rematadores = mapToSortedList(rematadoresMap);
  const centradores = mapToSortedList(centradoresMap);
  const lanzadoresCorners = mapToSortedList(lanzadoresCornerMap);
  const lanzadoresFaltas = mapToSortedList(lanzadoresFaltaMap);

  // Sistemas ordenados por frecuencia
  const sistemasUsados: SystemUsageItem[] = Array.from(sistemasCountMap.entries())
    .map(([sistema, data]) => ({
      sistema,
      partidosCount: data.count,
      pctUso: toPct(data.count, totalPartidos),
      jornadas: data.jornadas,
    }))
    .sort((a, b) => b.partidosCount - a.partidosCount);

  const sistemaPrincipal = sistemasUsados[0]?.sistema || 'N/D';

  // Matriz de titulares ordenada por número de titularidades desc
  const matrizTitulares: PlayerStartingMatrixItem[] = Array.from(titularesMap.values())
    .map((item) => ({
      nombreCompleto: item.nombreCompleto,
      apellido: item.apellido,
      dorsal: item.dorsal,
      titularidades: item.titularidades,
      totalPartidos,
      pctTitular: toPct(item.titularidades, totalPartidos),
      posiciones: Array.from(item.posiciones),
    }))
    .sort((a, b) => {
      if (b.titularidades !== a.titularidades) return b.titularidades - a.titularidades;
      const dA = Number(a.dorsal) || 99;
      const dB = Number(b.dorsal) || 99;
      return dA - dB;
    });

  const jornadasIncluidas = partidos.map((p) => `J-${p.jornada}`).join(', ');

  return {
    targetClubName,
    temporada,
    competicion,
    totalPartidos,
    jornadasIncluidas,
    partidos,

    balance: {
      victorias,
      empates,
      derrotas,
      puntos: victorias * 3 + empates,
      golesFavor,
      golesContra,
      diferenciaGoles: golesFavor - golesContra,
      promedioGolesFavor: toAvg(golesFavor, totalPartidos),
      promedioGolesContra: toAvg(golesContra, totalPartidos),
    },

    goles: {
      golesFavorLista,
      golesContraLista,
      goleadores,
      asistentes,
      autogolesFavor,
    },

    tiros: {
      totalIntentos: tIntentos,
      aPuerta: tPuerta,
      parados: tParados,
      fuera: tFuera,
      bloqueados: tBloqueados,
      alPalo: tPalo,
      dentroArea: tDentroArea,
      fueraArea: tFueraArea,
      contraataques: tContraataques,
      promedioTiros: toAvg(tIntentos, totalPartidos),
      promedioPuerta: toAvg(tPuerta, totalPartidos),
      pctPuerta: toPct(tPuerta, tIntentos),
      pctFuera: toPct(tFuera, tIntentos),
      pctDentroArea: toPct(tDentroArea, tIntentos),
      carriles: {
        izquierda: tCarrilIzq,
        centro: tCarrilCentro,
        derecha: tCarrilDer,
        pctIzq: toPct(tCarrilIzq, tIntentos),
        pctCentro: toPct(tCarrilCentro, tIntentos),
        pctDer: toPct(tCarrilDer, tIntentos),
      },
      rematadores,
    },

    centros: {
      total: cTotal,
      altos: cAltos,
      bajos: cBajos,
      derecha: cDerecha,
      izquierda: cIzquierda,
      conRemate: cConRemate,
      sinOcasion: cSinOcasion,
      contraataques: cContraataques,
      promedioCentros: toAvg(cTotal, totalPartidos),
      pctDerecha: toPct(cDerecha, cTotal),
      pctIzquierda: toPct(cIzquierda, cTotal),
      pctConRemate: toPct(cConRemate, cTotal),
      centradores,
    },

    corneres: {
      total: crTotal,
      derecha: crDerecha,
      izquierda: crIzquierda,
      gol: crGol,
      remate: crRemate,
      sinOcasion: crSinOcasion,
      promedioCorneres: toAvg(crTotal, totalPartidos),
      pctDerecha: toPct(crDerecha, crTotal),
      pctIzquierda: toPct(crIzquierda, crTotal),
      pctPeligro: toPct(crRemate + crGol, crTotal),
      lanzadores: lanzadoresCorners,
    },

    faltas: {
      total: fTotal,
      centros: fCentros,
      tiros: fTiros,
      pases: fPases,
      promedioFaltas: toAvg(fTotal, totalPartidos),
      pctTiros: toPct(fTiros, fTotal),
      pctCentros: toPct(fCentros, fTotal),
      pctPases: toPct(fPases, fTotal),
      lanzadores: lanzadoresFaltas,
    },

    saquesPuerta: {
      total: spTotal,
      cortos: spCortos,
      medios: spMedios,
      largos: spLargos,
      pctCortos: toPct(spCortos, spTotal),
      pctMedios: toPct(spMedios, spTotal),
      pctLargos: toPct(spLargos, spTotal),
    },

    saquesBanda: {
      total: sbTotal,
      campoPropio: sbPropio,
      campoRival: sbRival,
      generaCentro: sbGeneraCentro,
      sinOcasion: sbSinOcasion,
      pctPropio: toPct(sbPropio, sbTotal),
      pctRival: toPct(sbRival, sbTotal),
      pctGeneraCentro: toPct(sbGeneraCentro, sbTotal),
    },

    formaciones: {
      sistemasUsados,
      sistemaPrincipal,
      partidosDetalle: formacionesDetalle,
      matrizTitulares,
    },

    tendenciasPorJornada,
  };
}
