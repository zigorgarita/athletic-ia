/**
 * ============================================================================
 * PARSER OFICIAL RFEF (DIVISIÓN DE HONOR JUVENIL · GRUPO 2)
 * ============================================================================
 * Generalización robusta y reutilizable de los parsers validados en J2.
 * Analiza en SOLO LECTURA el HTML oficial de:
 * 1. Calendario y emparejamientos de la jornada (NFG_CmpJornada)
 * 2. Actas federativas detalladas (NFG_CmpPartido)
 * 3. Clasificación oficial de la jornada (NFG_VisClasificacion)
 * ============================================================================
 */

export interface ParsedRFEFCalendarMatch {
  localTeam: string;
  visitorTeam: string;
  fecha: string | null;       // YYYY-MM-DD
  fechaOriginal: string | null; // DD-MM-YYYY
  hora: string | null;        // HH:MM:SS
  campo: string | null;
  superficie: string | null;
  arbitro: string | null;
  codActa: string | null;
  hasActa: boolean;
  isIndautxuMatch: boolean;
  indautxuEsLocal?: boolean;
  rivalName?: string;
  rawScoreText?: string;
}

export interface ParsedRFEFCalendar {
  jornada: number | null;
  calendarAvailable: boolean;
  actasAvailableCount: number;
  totalMatches: number;
  matches: ParsedRFEFCalendarMatch[];
  indautxuMatch: ParsedRFEFCalendarMatch | null;
}

export interface ParsedActaPlayer {
  rfefPlayerId: number;
  dorsal: number | null;
  nombre: string;
  rol: 'Titular' | 'Suplente';
  isLocal: boolean;
  clubNombre: string;
  minutos: number;
  minutoEntrada?: number | null;
  minutoSalida?: number | null;
  expulsado?: boolean;
  minutoExpulsion?: number | null;
  tipoExpulsion?: 'doble_amarilla' | 'roja_directa' | null;
  hasOfficialPhoto: boolean;
  photoType: 'base64_real' | 'silueta_placeholder' | 'url_externa' | 'none';
  photoDataUrl?: string | null;
  photoSize?: number;
}

export interface ParsedActaGoal {
  minuto: number;
  minutoDisplay: string;
  autor: string;
  isPropia: boolean;
  isPenalti: boolean;
  esLocal: boolean;          // true si suma al equipo local, false si suma al visitante
  scoringClub: string;
}

export interface ParsedActaCard {
  minuto: number;
  nombre: string;
  tipo: 'Amarilla' | 'Roja Directa' | 'Doble Amarilla' | 'Otra';
  esLocal: boolean;
}

export interface ParsedActaExpulsion {
  minuto: number;
  dorsal?: number | null;
  nombre: string;
  motivo: string;
  tipo: 'doble_amarilla' | 'roja_directa';
  esLocal: boolean;
}

export interface ParsedActaSubstitution {
  minuto: number;
  entraDorsal: number;
  entraNombre: string;
  saleDorsal: number;
  saleNombre: string;
  esLocal: boolean;
}

export interface ParsedActa {
  codActa: string;
  fecha: string | null;
  hora: string | null;
  campo: string | null;
  superficie: string | null;
  arbitro: string | null;
  asistentes: string | null;
  localClubNombre: string;
  visitorClubNombre: string;
  golesLocal: number;
  golesVisitante: number;
  goals: ParsedActaGoal[];
  cards: ParsedActaCard[];
  expulsions?: ParsedActaExpulsion[];
  substitutions: ParsedActaSubstitution[];
  localTitulares: ParsedActaPlayer[];
  localSuplentes: ParsedActaPlayer[];
  visitTitulares: ParsedActaPlayer[];
  visitSuplentes: ParsedActaPlayer[];
  allPlayers: ParsedActaPlayer[];
  minLocal: number;
  minVisit: number;
  sumMinutosIndautxu?: number;
}

export interface ParsedStandingRow {
  pos: number;
  nombre: string;
  clubId: string | null;
  pts: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  casa?: string;
  fuera?: string;
}

export interface ParsedStandings {
  jornada: number | null;
  standingsAvailable: boolean;
  totalTeams: number;
  rows: ParsedStandingRow[];
  reasonIfNotAvailable?: string;
}

/**
 * Limpia tags HTML y entidades comunes
 */
export function stripHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza nombres de clubes para comparaciones
 */
export function normalizeClubName(str: string | null | undefined): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, '')
    .replace(/\b(de|del|el|la|los|las|cf|fc|cd|sd|ud|sad|ke)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte fecha de formato DD-MM-YYYY a YYYY-MM-DD
 */
export function parseRFEFDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}

/**
 * ----------------------------------------------------------------------------
 * 1. PARSER DEL CALENDARIO DE LA JORNADA (NFG_CmpJornada)
 * ----------------------------------------------------------------------------
 */
export function parseCalendarPage(html: string): ParsedRFEFCalendar {
  if (!html || html.length < 500) {
    return {
      jornada: null,
      calendarAvailable: false,
      actasAvailableCount: 0,
      totalMatches: 0,
      matches: [],
      indautxuMatch: null,
    };
  }

  // Detectar jornada en la cabecera, script de preselección o select
  let jornada: number | null = null;
  const h3JornadaMatch = html.match(/<h3[^>]*class=["']?jornada["']?[^>]*>[\s\S]*?<strong>\s*Jornada\s*<\/strong>\s*(\d+)/i);
  if (h3JornadaMatch) {
    jornada = parseInt(h3JornadaMatch[1], 10);
  } else {
    const scriptPreMatch = html.match(/Select_Preselecciona\([^,]+,\s*["']?(\d+)["']?\)/i);
    if (scriptPreMatch) {
      jornada = parseInt(scriptPreMatch[1], 10);
    } else {
      const selMatch = html.match(/<select[^>]*name=["']?(?:cod)?jornada["']?[^>]*>([\s\S]*?)<\/select>/i);
      if (selMatch) {
        const optMatch = selMatch[1].match(/<option[^>]*selected[^>]*value=["']?(\d+)["']?[^>]*>/i);
        if (optMatch) {
          jornada = parseInt(optMatch[1], 10);
        }
      }
    }
  }

  // Extraer las tablas de partidos (<table width="100%">)
  const matches: ParsedRFEFCalendarMatch[] = [];

  // Cada partido oficial de la RFEF se presenta en una tabla con clase o estructura característica
  const tableRegex = /<table width="100%"[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;

  while ((tm = tableRegex.exec(html)) !== null) {
    const block = tm[1];

    // Comprobar si contiene equipos (div_widget / font_widgetL)
    const localMatch = block.match(/<div class=font_widgetL>\s*<h4>\s*(?:&nbsp;)?\s*([^<]+)<\/h4>/i);
    const visitMatch = block.match(/<div class=font_widgetV>\s*<h4>\s*([^<]+)<\/h4>/i);

    if (!localMatch || !visitMatch) {
      continue;
    }

    const localTeam = stripHtml(localMatch[1]);
    const visitorTeam = stripHtml(visitMatch[1]);

    // CodActa
    const codActaMatch =
      block.match(/CodActa=(\d+)/i) ||
      block.match(/cod_acta=(\d+)/i) ||
      block.match(/NFG_CmpPartido\?[^"']*(?:CodActa|cod_acta)=(\d+)/i);
    const codActa = codActaMatch ? codActaMatch[1] : null;
    const hasActa = Boolean(codActa && block.includes('Acta del partido'));

    // Fecha y hora
    const dateMatch = block.match(/(\d{2}-\d{2}-\d{4})/);
    const timeMatch = block.match(/(\d{2}:\d{2})/);
    const fechaOriginal = dateMatch ? dateMatch[1] : null;
    const fecha = parseRFEFDate(fechaOriginal);
    const hora = timeMatch ? `${timeMatch[1]}:00` : null;

    // Campo y Superficie
    let campo: string | null = null;
    let superficie: string | null = null;

    // Buscamos el contenedor del campo
    const campoContainerMatch = block.match(
      /<div class="col-sm-6 font_widgetL"[^>]*style="display:block">([\s\S]*?)<\/div>/i
    ) || block.match(/<span[^>]*style="font-size:12px;"[^>]*>([^<]+)<\/span>/i);

    if (campoContainerMatch) {
      const fullText = campoContainerMatch[1];
      const brIdx = fullText.indexOf('<br>');
      if (brIdx !== -1) {
        campo = stripHtml(fullText.substring(0, brIdx));
        const sub = fullText.substring(brIdx);
        superficie = stripHtml(sub);
      } else {
        campo = stripHtml(fullText);
      }
    }

    if (!superficie) {
      if (block.includes('Hierba Natural')) {
        superficie = 'Hierba Natural';
      } else if (block.includes('Hierba Artificial')) {
        superficie = 'Hierba Artificial';
      }
    }

    // Árbitro
    const arbMatch =
      block.match(/(?:&Aacute;|Á)rbitro:\s*<\/strong>\s*(?:&nbsp;)?\s*([^<]+)/i) ||
      block.match(/(?:&Aacute;|Á)rbitro[^:]*:\s*<\/strong>&nbsp;\s*([^<&]+)/i);
    const arbitro = arbMatch ? stripHtml(arbMatch[1]) : null;

    // Es partido de Indautxu
    const normLocal = localTeam.toLowerCase();
    const normVisit = visitorTeam.toLowerCase();
    const isIndautxuLocal = normLocal.includes('indautxu');
    const isIndautxuVisit = normVisit.includes('indautxu');
    const isIndautxuMatch = isIndautxuLocal || isIndautxuVisit;

    const indautxuEsLocal = isIndautxuMatch ? isIndautxuLocal : undefined;
    const rivalName = isIndautxuMatch
      ? isIndautxuLocal
        ? visitorTeam
        : localTeam
      : undefined;

    matches.push({
      localTeam,
      visitorTeam,
      fecha,
      fechaOriginal,
      hora,
      campo: campo && campo !== 'N/D' ? campo : null,
      superficie,
      arbitro: arbitro && arbitro !== 'N/D' ? arbitro : null,
      codActa,
      hasActa,
      isIndautxuMatch,
      indautxuEsLocal,
      rivalName,
    });
  }

  const indautxuMatch = matches.find((m) => m.isIndautxuMatch) || null;
  const actasAvailableCount = matches.filter((m) => m.hasActa).length;

  return {
    jornada,
    calendarAvailable: matches.length > 0,
    actasAvailableCount,
    totalMatches: matches.length,
    matches,
    indautxuMatch,
  };
}

/**
 * ----------------------------------------------------------------------------
 * 2. PARSER DEL ACTA FEDERATIVA (NFG_CmpPartido)
 * ----------------------------------------------------------------------------
 */
export function parseActaPage(html: string, codActa: string): ParsedActa {
  if (!html || html.length < 500) {
    throw new Error(`Acta vacía o inválida para CodActa ${codActa}`);
  }

  // Fecha y hora
  const dateMatch = html.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})\s*h/i);
  const fecha = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
  const hora = dateMatch ? `${dateMatch[4]}:00` : null;

  // Campo y Superficie
  const campoMatch =
    html.match(/<strong>Estadio:<\/strong>\s*([^<]+)/i) ||
    html.match(/Estadio:\s*<\/strong>\s*([^<]+)/i) ||
    html.match(/Campo:\s*<\/strong>\s*([^<]+)/i) ||
    html.match(/Campo:[^<]*<font[^>]*>([^<]+)<\/font>/i);
  const campo = campoMatch ? stripHtml(campoMatch[1]) : null;
  const superficie = html.includes('Hierba Natural') ? 'Hierba Natural' : 'Hierba Artificial';

  // Árbitro y Asistentes
  const arbMatch =
    html.match(/<strong>(?:&Aacute;|Á)rbitro<\/strong>&nbsp;&nbsp;&nbsp;([^<]+)<\/h5>/i) ||
    html.match(/Principal:<\/strong>([^<]+)/i) ||
    html.match(/(?:&Aacute;|Á)rbitro[^:]*:<\/strong>([^<]+)/i) ||
    html.match(/(?:&Aacute;|Á)rbitro:\s*&nbsp;&nbsp;&nbsp;([^<&]+)/i);
  const arbitro = arbMatch ? stripHtml(arbMatch[1]) : null;

  const asisArray: string[] = [];
  const asisRegex =
    /<strong>(?:&Aacute;|Á)rbitro Asistente<\/strong>&nbsp;&nbsp;&nbsp;([^<]+)<\/h5>/gi;
  let am;
  while ((am = asisRegex.exec(html)) !== null) {
    asisArray.push(stripHtml(am[1]));
  }
  const asistentes = asisArray.length > 0 ? asisArray.join(' / ') : null;

  // Equipos en el acta
  const teamMatches: string[] = [];
  const teamRegex = /<div class=["']?font_widget[LV]?["']?[^>]*>([\s\S]*?)<\/div>/gi;
  let trm;
  while ((trm = teamRegex.exec(html)) !== null) {
    teamMatches.push(stripHtml(trm[1]));
  }
  const localClubNombre = teamMatches[0] || 'Local';
  const visitorClubNombre = teamMatches[1] || 'Visitante';

  // Secciones de jugadores:
  // Local: Titulares #1 -> Suplentes #1
  // Local Suplentes: Suplentes #1 -> Titulares #2
  // Visitante Titulares: Titulares #2 -> Suplentes #2
  // Visitante Suplentes: Suplentes #2 -> Sustituciones #2 o Tarjetas
  const posTit1 = html.indexOf('Titulares');
  const posSup1 = html.indexOf('Suplentes');
  const posTit2 = html.indexOf('Titulares', posSup1 + 1);
  const posSup2 = html.indexOf('Suplentes', posTit2 + 1);

  // Secciones de sustituciones
  const posSubs1 = html.indexOf('Sustituciones');
  const posTarj1 = html.indexOf('Tarjetas');
  const posSubs2 = html.indexOf('Sustituciones', posSubs1 + 1);
  const posTarj2 = html.indexOf('Tarjetas', posTarj1 + 1);

  function parseSubsFromBlock(subsHtml: string, isLocal: boolean): ParsedActaSubstitution[] {
    const subs: ParsedActaSubstitution[] = [];
    const tblRegex = /<table class="table table-striped table-hover">([\s\S]*?)<\/table>/gi;
    let tm;
    while ((tm = tblRegex.exec(subsHtml)) !== null) {
      const tableHtml = tm[1];
      const entraMatch = tableHtml.match(
        /<td[^>]*class=font_responsive>(\d+)<\/td>\s*<td[^>]*class=font_responsive>([^<]+)<\/td>\s*<td[^>]*><i class="fa fa-arrow-left/i
      );
      const saleMatch = tableHtml.match(
        /<td[^>]*class=font_responsive>(\d+)<\/td>\s*<td[^>]*class=font_responsive><p[^>]*><span class=font-blue>\((\d+)(?:'\+?(\d+)?)?'?\)\s*<\/span>\s*([^<]+)<\/p><\/td>\s*<td[^>]*><i class="fa fa-arrow-right/i
      );
      if (entraMatch && saleMatch) {
        subs.push({
          minuto: parseInt(saleMatch[2], 10),
          entraDorsal: parseInt(entraMatch[1], 10),
          entraNombre: stripHtml(entraMatch[2]),
          saleDorsal: parseInt(saleMatch[1], 10),
          saleNombre: stripHtml(saleMatch[4]),
          esLocal: isLocal,
        });
      }
    }
    return subs;
  }

  const localSubs =
    posSubs1 !== -1 && posTarj1 !== -1
      ? parseSubsFromBlock(html.substring(posSubs1, posTarj1), true)
      : [];
  const visitSubs =
    posSubs2 !== -1 && posTarj2 !== -1
      ? parseSubsFromBlock(html.substring(posSubs2, posTarj2), false)
      : [];
  const substitutions = [...localSubs, ...visitSubs];

  // Parsear jugadores de ambos equipos
  const trPlayerRegex =
    /<tr[^>]*location\.href=['"][^'"]*jugador=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/tr>/gi;
  let pm;

  interface RawParsedPlayer {
    rfefPlayerId: number;
    dorsal: number | null;
    nombre: string;
    pIndex: number;
    hasOfficialPhoto: boolean;
    photoType: 'base64_real' | 'silueta_placeholder' | 'url_externa' | 'none';
    photoDataUrl: string | null;
    photoSize: number;
  }

  const rawPlayers: RawParsedPlayer[] = [];

  while ((pm = trPlayerRegex.exec(html)) !== null) {
    const rfefPlayerId = parseInt(pm[1], 10);
    const rowHtml = pm[2];
    const tds: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdm;
    while ((tdm = tdRegex.exec(rowHtml)) !== null) {
      tds.push(stripHtml(tdm[1]));
    }

    const dorsal = parseInt(tds[0], 10) || null;
    const nombre = tds[2] || tds[1] || `Jugador ${rfefPlayerId}`;
    const pIndex = pm.index;

    // Foto / Silueta federativa
    const imgMatch = rowHtml.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
    const imgSrc = imgMatch ? imgMatch[1] : null;

    let hasOfficialPhoto = false;
    let photoType: 'base64_real' | 'silueta_placeholder' | 'url_externa' | 'none' = 'none';
    let photoDataUrl: string | null = null;
    let photoSize = 0;

    if (imgSrc) {
      if (imgSrc.startsWith('data:image')) {
        hasOfficialPhoto = true;
        photoType = 'base64_real';
        photoDataUrl = imgSrc;
        const commaIdx = imgSrc.indexOf(',');
        photoSize = Math.round((imgSrc.length - commaIdx) * 0.75);
      } else if (
        imgSrc.includes('retrato_licencia.jpg') ||
        imgSrc.includes('silueta') ||
        imgSrc.includes('sin_foto')
      ) {
        hasOfficialPhoto = false;
        photoType = 'silueta_placeholder';
      } else {
        hasOfficialPhoto = true;
        photoType = 'url_externa';
      }
    }

    rawPlayers.push({
      rfefPlayerId,
      dorsal,
      nombre,
      pIndex,
      hasOfficialPhoto,
      photoType,
      photoDataUrl,
      photoSize,
    });
  }

  // Separar titulares y suplentes por rangos de HTML
  const localTitularesRaw = rawPlayers.filter((p) => p.pIndex > posTit1 && p.pIndex < posSup1);
  const localSuplentesRaw = rawPlayers.filter(
    (p) => p.pIndex > posSup1 && (posTit2 === -1 || p.pIndex < posTit2)
  );
  const visitTitularesRaw = rawPlayers.filter(
    (p) => p.pIndex > posTit2 && (posSup2 === -1 || p.pIndex < posSup2)
  );
  const visitSuplentesRaw = rawPlayers.filter((p) => posSup2 !== -1 && p.pIndex > posSup2);

  // Tarjetas
  function parseCardsFromSection(sectionHtml: string, isLocal: boolean): ParsedActaCard[] {
    const cards: ParsedActaCard[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRegex.exec(sectionHtml)) !== null) {
      const row = tr[1];
      const isAmarilla = row.includes('tarj_amar.gif') || row.includes('Amarilla');
      const isRoja = row.includes('tarj_roja.gif') || row.includes('Roja');
      const match = row.match(
        /<span class=["']?font-blue["']?>\((\d+)(?:'\+?(\d+)?)?'?\)\s*<\/span>\s*([^<]+)/i
      );
      if (match) {
        cards.push({
          minuto: parseInt(match[1], 10),
          nombre: stripHtml(match[3]),
          tipo: isRoja ? 'Roja Directa' : isAmarilla ? 'Amarilla' : 'Otra',
          esLocal: isLocal,
        });
      }
    }
    // Consolidar 2 amarillas al mismo jugador como Doble Amarilla
    const yellowCounts = new Map<string, number>();
    for (const c of cards) {
      const fn = c.nombre.split(',')[0].trim().toLowerCase();
      if (c.tipo === 'Amarilla') {
        const cnt = (yellowCounts.get(fn) || 0) + 1;
        yellowCounts.set(fn, cnt);
        if (cnt >= 2) {
          c.tipo = 'Doble Amarilla';
        }
      }
    }
    return cards;
  }

  const cardsLocal =
    posTarj1 !== -1
      ? parseCardsFromSection(
          html.substring(posTarj1, posSubs2 !== -1 ? posSubs2 : posTarj1 + 3500),
          true
        )
      : [];
  const cardsVisit =
    posTarj2 !== -1
      ? parseCardsFromSection(html.substring(posTarj2, posTarj2 + 4000), false)
      : [];
  const cards = [...cardsLocal, ...cardsVisit];

  // Expulsiones desde el bloque textual del acta
  function parseExpulsionsFromHtml(
    htmlContent: string,
    localClub: string,
    visitClub: string
  ): { localExpulsions: ParsedActaExpulsion[]; visitExpulsions: ParsedActaExpulsion[] } {
    const localExpulsions: ParsedActaExpulsion[] = [];
    const visitExpulsions: ParsedActaExpulsion[] = [];

    const idxExp = htmlContent.indexOf('EXPULSIONES');
    if (idxExp === -1) return { localExpulsions, visitExpulsions };

    const idxOtras = htmlContent.indexOf('OTRAS INCIDENCIAS', idxExp);
    const expBlock = htmlContent.substring(idxExp, idxOtras !== -1 ? idxOtras : idxExp + 3000);
    const cleanExp = expBlock.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

    const expRegex = /-\s*([^:]+)\s*:\s*En el minuto\s*(\d+)[\s\S]*?el jugador\s*\((\d+)\)\s*([^f]+?)\s*fue expulsado por el siguiente motivo:\s*([^.]+)/gi;
    let m;
    while ((m = expRegex.exec(cleanExp)) !== null) {
      const clubName = m[1].trim();
      const minuto = parseInt(m[2], 10);
      const dorsal = parseInt(m[3], 10);
      const nombre = m[4].trim();
      const motivo = m[5].trim();
      const isDobleAmarilla =
        motivo.toLowerCase().includes('doble') || motivo.toLowerCase().includes('amarilla');
      const tipo: 'doble_amarilla' | 'roja_directa' = isDobleAmarilla
        ? 'doble_amarilla'
        : 'roja_directa';

      const normClub = normalizeClubName(clubName);
      const normLocal = normalizeClubName(localClub);
      const isLocal = normLocal.includes(normClub) || normClub.includes(normLocal);

      const expObj: ParsedActaExpulsion = {
        minuto,
        dorsal,
        nombre,
        motivo,
        tipo,
        esLocal: isLocal,
      };

      if (isLocal) {
        localExpulsions.push(expObj);
      } else {
        visitExpulsions.push(expObj);
      }
    }

    return { localExpulsions, visitExpulsions };
  }

  const { localExpulsions, visitExpulsions } = parseExpulsionsFromHtml(
    html,
    localClubNombre,
    visitorClubNombre
  );
  const expulsions = [...localExpulsions, ...visitExpulsions];

  // Calcular minutos para cada jugador (con corte estricto por expulsión)
  function buildPlayersWithMinutes(
    players: RawParsedPlayer[],
    rol: 'Titular' | 'Suplente',
    isLocal: boolean,
    clubNombre: string,
    teamSubs: ParsedActaSubstitution[],
    teamCards: ParsedActaCard[],
    teamExpulsions: ParsedActaExpulsion[]
  ): ParsedActaPlayer[] {
    return players.map((p) => {
      let minutos = 0;
      let minutoEntrada: number | null = null;
      let minutoSalida: number | null = null;

      if (rol === 'Titular') {
        minutoEntrada = 0;
        const subOut = teamSubs.find((s) => s.saleDorsal === p.dorsal);
        if (subOut) {
          minutoSalida = subOut.minuto;
          minutos = subOut.minuto;
        } else {
          minutoSalida = 90;
          minutos = 90;
        }
      } else {
        const subIn = teamSubs.find((s) => s.entraDorsal === p.dorsal);
        if (subIn) {
          minutoEntrada = subIn.minuto;
          const subOut = teamSubs.find((s) => s.saleDorsal === p.dorsal);
          if (subOut) {
            minutoSalida = subOut.minuto;
            minutos = Math.max(0, subOut.minuto - subIn.minuto);
          } else {
            minutoSalida = 90;
            minutos = Math.max(0, 90 - subIn.minuto);
          }
        } else {
          minutos = 0;
        }
      }

      // Comprobar si el futbolista sufrió expulsión (por texto de incidencias o por tarjetas)
      const firstName = (p.nombre || '').split(' ')[0];
      const expFromText = teamExpulsions.find(
        (e) => (p.dorsal && e.dorsal === p.dorsal) || (firstName && e.nombre.includes(firstName))
      );

      const pCards = teamCards.filter(
        (c) => firstName && c.nombre.includes(firstName)
      );
      const hasDirectRed = pCards.some((c) => c.tipo === 'Roja Directa');
      const yellowCount = pCards.filter((c) => c.tipo === 'Amarilla').length;
      const hasDoubleYellow = yellowCount >= 2 || pCards.some((c) => c.tipo === 'Doble Amarilla');

      let expulsado = false;
      let minutoExpulsion: number | null = null;
      let tipoExpulsion: 'doble_amarilla' | 'roja_directa' | null = null;

      if (expFromText) {
        expulsado = true;
        minutoExpulsion = expFromText.minuto;
        tipoExpulsion = expFromText.tipo;
      } else if (hasDirectRed) {
        expulsado = true;
        const redCard = pCards.find((c) => c.tipo === 'Roja Directa');
        minutoExpulsion = redCard ? redCard.minuto : 90;
        tipoExpulsion = 'roja_directa';
      } else if (hasDoubleYellow) {
        expulsado = true;
        const yellows = pCards.filter((c) => c.tipo === 'Amarilla' || c.tipo === 'Doble Amarilla');
        minutoExpulsion = yellows[yellows.length - 1]?.minuto ?? 90;
        tipoExpulsion = 'doble_amarilla';
      }

      // Corte de minutos estricto por expulsión (nunca más de 90', nunca negativo)
      if (expulsado && minutoExpulsion !== null) {
        if (rol === 'Titular') {
          minutoSalida = Math.min(minutoSalida ?? 90, minutoExpulsion);
          minutos = minutoSalida;
        } else if (minutoEntrada !== null) {
          minutoSalida = Math.min(minutoSalida ?? 90, minutoExpulsion);
          minutos = Math.max(0, minutoSalida - minutoEntrada);
        }
      }

      minutos = Math.max(0, Math.min(90, minutos));

      return {
        rfefPlayerId: p.rfefPlayerId,
        dorsal: p.dorsal,
        nombre: p.nombre,
        rol,
        isLocal,
        clubNombre,
        minutos,
        minutoEntrada,
        minutoSalida,
        expulsado,
        minutoExpulsion,
        tipoExpulsion,
        hasOfficialPhoto: p.hasOfficialPhoto,
        photoType: p.photoType,
        photoDataUrl: p.photoDataUrl,
        photoSize: p.photoSize,
      };
    });
  }

  const localTitulares = buildPlayersWithMinutes(
    localTitularesRaw,
    'Titular',
    true,
    localClubNombre,
    localSubs,
    cardsLocal,
    localExpulsions
  );
  const localSuplentes = buildPlayersWithMinutes(
    localSuplentesRaw,
    'Suplente',
    true,
    localClubNombre,
    localSubs,
    cardsLocal,
    localExpulsions
  );
  const visitTitulares = buildPlayersWithMinutes(
    visitTitularesRaw,
    'Titular',
    false,
    visitorClubNombre,
    visitSubs,
    cardsVisit,
    visitExpulsions
  );
  const visitSuplentes = buildPlayersWithMinutes(
    visitSuplentesRaw,
    'Suplente',
    false,
    visitorClubNombre,
    visitSubs,
    cardsVisit,
    visitExpulsions
  );

  const allPlayers = [
    ...localTitulares,
    ...localSuplentes,
    ...visitTitulares,
    ...visitSuplentes,
  ];

  const minLocal = [...localTitulares, ...localSuplentes].reduce((sum, p) => sum + p.minutos, 0);
  const minVisit = [...visitTitulares, ...visitSuplentes].reduce((sum, p) => sum + p.minutos, 0);

  // Goles
  const golBlockMatch =
    html.match(/<div class=number[^>]*>Goles<\/div>[\s\S]*?<table class=table>([\s\S]*?)<\/table>/i) ||
    html.match(/<div class=["']?number["']?[^>]*>Goles<\/div>[\s\S]*?<table class=["']?table["']?>([\s\S]*?)<\/table>/i);

  const localNames = new Set(localTitulares.concat(localSuplentes).map((p) => p.nombre));
  const visitNames = new Set(visitTitulares.concat(visitSuplentes).map((p) => p.nombre));

  const goals: ParsedActaGoal[] = [];
  let golesLocal = 0;
  let golesVisitante = 0;

  if (golBlockMatch) {
    const textBlock = golBlockMatch[1];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRegex.exec(textBlock)) !== null) {
      const row = tr[1];
      const match = row.match(
        /<span class=["']?font-blue["']?>\((\d+)(?:'\+?(\d+)?)?'?\)\s*<\/span>\s*([^<]+)/i
      );
      const isPropia = row.includes('Propia') || row.includes('propia puerta') || row.includes('autogol');
      const isPenalti = row.includes('Penalti') || row.includes('penalti');

      if (match) {
        const min = parseInt(match[1], 10);
        const autor = stripHtml(match[3]);

        // Determinar si es local o visitante
        let esLocalAuthor = localNames.has(autor);
        if (!esLocalAuthor && !visitNames.has(autor)) {
          // Búsqueda por subcadena
          const lSub = Array.from(localNames).some((n) => n.includes(autor) || autor.includes(n));
          if (lSub) esLocalAuthor = true;
        }

        // Si es propia puerta, el gol suma al equipo contrario
        let esLocal = esLocalAuthor;
        if (isPropia) {
          esLocal = !esLocalAuthor;
        }

        if (esLocal) {
          golesLocal++;
        } else {
          golesVisitante++;
        }

        goals.push({
          minuto: min,
          minutoDisplay: match[2] ? `${min}'+${match[2]}` : `${min}'`,
          autor,
          isPropia,
          isPenalti,
          esLocal,
          scoringClub: esLocal ? localClubNombre : visitorClubNombre,
        });
      }
    }
  }

  const isIndautxuMatch =
    localClubNombre.toLowerCase().includes('indautxu') ||
    visitorClubNombre.toLowerCase().includes('indautxu');
  const sumMinutosIndautxu = isIndautxuMatch
    ? localClubNombre.toLowerCase().includes('indautxu')
      ? minLocal
      : minVisit
    : undefined;

  return {
    codActa,
    fecha,
    hora,
    campo,
    superficie,
    arbitro,
    asistentes,
    localClubNombre,
    visitorClubNombre,
    golesLocal,
    golesVisitante,
    goals,
    cards,
    expulsions,
    substitutions,
    localTitulares,
    localSuplentes,
    visitTitulares,
    visitSuplentes,
    allPlayers,
    minLocal,
    minVisit,
    sumMinutosIndautxu,
  };
}

/**
 * ----------------------------------------------------------------------------
 * 3. PARSER DE LA CLASIFICACIÓN OFICIAL (NFG_VisClasificacion)
 * ----------------------------------------------------------------------------
 */
export function parseStandingsPage(html: string, requestedJornada?: number): ParsedStandings {
  if (!html || html.length < 500) {
    return {
      jornada: null,
      standingsAvailable: false,
      totalTeams: 0,
      rows: [],
      reasonIfNotAvailable: 'Página HTML de clasificación no disponible o vacía',
    };
  }

  // Detectar jornada en la cabecera (h3 class=la_roja_regular_titulo2), parámetro o select
  let selectedJornada: number | null = null;
  const hJornadaMatch = html.match(/<h\d[^>]*>[\s\S]*?Jornada\s+(\d+)/i);
  if (hJornadaMatch) {
    selectedJornada = parseInt(hJornadaMatch[1], 10);
  } else {
    const codJornadaMatch = html.match(/codjornada=(\d+)/i);
    if (codJornadaMatch) {
      selectedJornada = parseInt(codJornadaMatch[1], 10);
    } else {
      const selectMatch = html.match(/<select[^>]*name=["']?(?:cod)?jornada["']?[^>]*>([\s\S]*?)<\/select>/i);
      if (selectMatch) {
        const selectedOpt = selectMatch[1].match(
          /<option[^>]*selected[^>]*value=["']?(\d+)["']?[^>]*>(.*?)<\/option>/i
        );
        if (selectedOpt) {
          selectedJornada = parseInt(selectedOpt[1], 10);
        }
      }
    }
  }

  // Localizar tabla que contenga 'Puntos' o 'Pts'
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let t;
  let clasifTable: string | null = null;
  while ((t = tableRegex.exec(html)) !== null) {
    if (t[1].includes('Puntos') || t[1].includes('Pts')) {
      clasifTable = t[1];
      break;
    }
  }

  if (!clasifTable) {
    return {
      jornada: selectedJornada,
      standingsAvailable: false,
      totalTeams: 0,
      rows: [],
      reasonIfNotAvailable: 'Tabla de clasificación no encontrada en el HTML',
    };
  }

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  const rawRows: { text: string; clubId: string | null }[][] = [];

  while ((tr = trRegex.exec(clasifTable)) !== null) {
    const rowHtml = tr[1];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let c;
    const cells: { text: string; clubId: string | null }[] = [];
    while ((c = cellRegex.exec(rowHtml)) !== null) {
      const raw = c[1];
      const text = stripHtml(raw);
      const clubIdMatch =
        raw.match(/id_club=(\d+)/i) ||
        raw.match(/equipo=(\d+)/i) ||
        raw.match(/club=(\d+)/i) ||
        raw.match(/codigo_equipo=(\d+)/i);
      cells.push({ text, clubId: clubIdMatch ? clubIdMatch[1] : null });
    }
    if (cells.length >= 10) {
      rawRows.push(cells);
    }
  }

  // Las dos primeras filas suelen ser cabeceras (general, casa/fuera)
  const dataRows = rawRows.filter((r) => {
    const posNum = parseInt(r[1]?.text || r[0]?.text, 10);
    return !isNaN(posNum) && posNum >= 1 && posNum <= 20;
  });

  const rows: ParsedStandingRow[] = dataRows.map((r) => {
    // Si la celda 0 es la posición o la celda 1
    const offset = isNaN(parseInt(r[0]?.text, 10)) ? 1 : 0;
    const pos = parseInt(r[offset]?.text, 10);
    const nombre = r[offset + 1]?.text;
    const clubId = r[offset + 1]?.clubId || r[offset]?.clubId || r.find((c) => c.clubId)?.clubId || null;
    const pts = parseInt(r[offset + 2]?.text, 10) || 0;

    const casaPj = parseInt(r[offset + 3]?.text, 10) || 0;
    const casaPg = parseInt(r[offset + 4]?.text, 10) || 0;
    const casaPe = parseInt(r[offset + 5]?.text, 10) || 0;
    const casaPp = parseInt(r[offset + 6]?.text, 10) || 0;

    const fueraPj = parseInt(r[offset + 7]?.text, 10) || 0;
    const fueraPg = parseInt(r[offset + 8]?.text, 10) || 0;
    const fueraPe = parseInt(r[offset + 9]?.text, 10) || 0;
    const fueraPp = parseInt(r[offset + 10]?.text, 10) || 0;

    const gf = parseInt(r[offset + 11]?.text, 10) || 0;
    const gc = parseInt(r[offset + 12]?.text, 10) || 0;
    const dg = gf - gc;

    return {
      pos,
      nombre,
      clubId,
      pts,
      pj: casaPj + fueraPj,
      pg: casaPg + fueraPg,
      pe: casaPe + fueraPe,
      pp: casaPp + fueraPp,
      gf,
      gc,
      dg,
      casa: `${casaPj}J ${casaPg}G ${casaPe}E ${casaPp}P`,
      fuera: `${fueraPj}J ${fueraPg}G ${fueraPe}E ${fueraPp}P`,
    };
  });

  // Si se solicitó una jornada específica, comprobar si la clasificación ya fue computada
  if (requestedJornada !== undefined && requestedJornada !== null && requestedJornada > 0) {
    if (selectedJornada !== null && selectedJornada < requestedJornada) {
      return {
        jornada: selectedJornada,
        standingsAvailable: false,
        totalTeams: rows.length,
        rows: [],
        reasonIfNotAvailable: `La RFEF no ha publicado la clasificación para la jornada ${requestedJornada} (la última publicada es jornada ${selectedJornada})`,
      };
    }

    // Comprobar si los equipos ya han jugado la jornada solicitada
    // Si todos los equipos tienen PJ < requestedJornada (ej. J3 futura donde los equipos tienen PJ=2 de J2)
    const maxPJ = Math.max(...rows.map((r) => r.pj));
    if (maxPJ < requestedJornada) {
      return {
        jornada: selectedJornada,
        standingsAvailable: false,
        totalTeams: rows.length,
        rows: [],
        reasonIfNotAvailable: `La clasificación para la jornada ${requestedJornada} aún no ha sido computada por la RFEF (los equipos registran un máximo de ${maxPJ} partidos jugados).`,
      };
    }
  }

  const standingsAvailable = rows.length === 16;

  return {
    jornada: selectedJornada,
    standingsAvailable,
    totalTeams: rows.length,
    rows: standingsAvailable ? rows : [],
    reasonIfNotAvailable: !standingsAvailable
      ? `Número de equipos insuficiente (${rows.length}/16)`
      : undefined,
  };
}
