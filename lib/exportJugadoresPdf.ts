/**
 * lib/exportJugadoresPdf.ts
 *
 * PDF JUGADORES V2 — Módulo de exportación optimizado para vestuario.
 *
 * Principios V2:
 *  - Estrictamente 2 páginas A4:
 *      Página 1: Plan de Equipo (Pizarra + Dónde hacer daño / Qué evitar / Con/Sin balón / Transiciones).
 *      Página 2: Tu Trabajo (Consignas por Líneas + Consignas Individuales de los 11 titulares).
 *  - Lenguaje directo de vestuario: sin razonamientos teóricos, sin coordenadas internas (Y:40, etc.).
 *  - Eliminación de metatexto redundante del Modelo Indautxu (Premisas, Subprincipios, Doctrina).
 *  - Corrección de caracteres corruptos: sin emojis ni iconos que rompan fuentes de jsPDF (texto puro: PORTERÍA, DEFENSA, etc.).
 *  - Corrección de residuo de parsing "ón Específica:": se limpian prefijos y se muestra la consigna directa.
 *  - Eliminación de frases truncadas (Duelo Clave roto en "para"): solo frases completas y validadas; de lo contrario se omiten.
 *  - Reutilización intacta de TacticalFieldExport vía html2canvas sin alterar componentes existentes.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  GameModelAnalysis,
  Observation,
  TacticalRoleCard,
  Player,
  PositionNode,
} from '@/types';

// ─── Constantes de diseño ────────────────────────────────────────────────────

const RED       = '#CC0E21';
const BLACK     = '#0F172A';
const MUTED     = '#64748B';
const LIGHT     = '#CBD5E1';
const BORDER_COL= '#E2E8F0';
const BG_CARD   = '#F8FAFC';
const WHITE     = '#FFFFFF';

// A4 portrait
const PAGE_W   = 210;
const PAGE_H   = 297;
const MARGIN   = 12;
const COL_GAP  = 6;
const COL_W    = (PAGE_W - MARGIN * 2 - COL_GAP) / 2; // 90mm cada columna

// Tamaños de fuente (legibles, nunca minúsculos)
const SZ_TITLE   = 15;
const SZ_SUB     = 8;
const SZ_SEC_HDR = 7.5;
const SZ_BODY    = 8;
const SZ_SMALL   = 7;
const SZ_TINY    = 6.5;

// Colores semánticos para secciones
const SECTION_COLORS: Record<string, string> = {
  attack:   '#16A34A', // verde
  defend:   '#2563EB', // azul
  warning:  '#D97706', // ámbar
  neutral:  '#334155', // pizarra oscuro
};

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface JugadoresPdfConfig {
  fieldElementId: string;      // ID del contenedor DOM a capturar con html2canvas

  // Datos del partido
  jornada?: number | string;
  rival?: string;
  fecha?: string;
  esLocal?: boolean;
  tipoPartido?: string;

  // Sistemas
  sistemaPropio: string;
  sistemaRival: string;

  // Nombre pizarra
  lineupName?: string;

  // Análisis táctico estructural
  ventajas?: string;
  desventajas?: string;
  zonaConflicto?: string;
  dueloClave?: string;
  tareasLineas?: string;

  // Análisis Modelo de Juego
  analisisModeloJuego?: GameModelAnalysis;

  // Once inicial
  nodesPropio?: PositionNode[];
  players?: Player[];

  // Fichas de rol (prioridad 1 para consignas individuales)
  roleCards?: TacticalRoleCard[];

  // Observaciones aprobadas (alertas del rival)
  approvedObservations?: Observation[];
}

// ─── Limpieza y transformación de lenguaje para vestuario ────────────────────

/** Elimina emojis y caracteres incompatibles con codificación Latin-1 de jsPDF */
function sanitizeTextForPdf(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    // Eliminar emojis y caracteres no Latin-1
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '')
    // Eliminar secuencias corruptas conocidas producidas en V1
    .replace(/Ø=[Þáß]/g, '')
    .replace(/&[™¡]/g, '')
    .trim();
}

/** Elimina coordenadas técnicas internas de la IA (ej. Y:40, Y:44, (X:10, Y:50)) */
function stripCoordinates(str: string): string {
  if (!str) return '';
  return str
    .replace(/\([XY]:\s*\d+[^)]*\)/gi, '')
    .replace(/\b[XY]:\s*\d+\b/gi, '')
    .replace(/\bposici[oó]n\s+[XY]\s*\d+\b/gi, '')
    .trim();
}

/** Transforma el lenguaje de informe técnico en consignas operativas para jugadores */
function cleanPlayerLanguage(str: string): string {
  if (!str) return '';
  let s = sanitizeTextForPdf(str);
  s = stripCoordinates(s);

  // 1. Eliminar residuo de parsing corrupto "ón Específica:" o variantes
  s = s.replace(/^(?:(?:instrucci[oó]n\s+)?espec[íi]fica:?|ón\s+espec[íi]fica:?|instrucci[oó]n:?|tarea:?|rol:?|consigna:?)\s*/i, '');

  // 2. Limpiar metatexto redundante del Modelo Indautxu
  s = s.replace(/MODELO\s+INDAUTXU\s*:?/gi, '');
  s = s.replace(/\b(?:Premisas?|Subprincipios?|Doctrina)\s*:?/gi, '');
  // Si hay VETO, convertir en llamada de atención clara
  s = s.replace(/\bVetos?\s*:?\s*/gi, 'VETO: ');

  // 3. Limpiar lenguaje de informe académico y sintetizar
  s = s.replace(/superioridad\s+t[áa]ctica\s+que\s+podemos\s+generar/gi, 'superioridad para');
  s = s.replace(/riesgo\s+significativo\s+de\s+inferioridad\s+num[ée]rica/gi, 'riesgo de inferioridad');
  s = s.replace(/lo\s+que\s+nos\s+permite\s+generar/gi, 'para generar');
  s = s.replace(/lo\s+que\s+nos\s+permite/gi, 'para');
  s = s.replace(/es\s+importante\s+tener\s+en\s+cuenta\s+que\s*/gi, '');
  s = s.replace(/cabe\s+destacar\s+que\s*/gi, '');
  s = s.replace(/se\s+observa\s+que\s*/gi, '');

  // 4. Limpieza de Markdown y espacios
  s = s.replace(/\*\*(.*?)\*\*/g, '$1')
       .replace(/\*(.*?)\*/g, '$1')
       .replace(/#{1,6}\s?/g, '')
       .replace(/`/g, '')
       .replace(/^[-*•\d.]+\s*/, '')
       .replace(/\s{2,}/g, ' ')
       .trim();

  return s;
}

function hasContent(text?: string | null): boolean {
  if (!text) return false;
  return cleanPlayerLanguage(text).length > 3;
}

/** Extrae consignas cortas, directas y terminadas en punto para vestuario */
function extractConsignas(rawText: string, maxItems = 2): string[] {
  if (!rawText) return [];
  const text = cleanPlayerLanguage(rawText);
  if (!text) return [];

  // Dividir por saltos de línea, viñetas o puntos seguidos de mayúscula
  const rawParts = text
    .split(/\n|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])|(?:\.\s{2,})|(?:;\s+)/)
    .map(p => cleanPlayerLanguage(p))
    .filter(p => p.length >= 6);

  const results: string[] = [];
  for (const part of rawParts) {
    if (results.length >= maxItems) break;
    let s = part;
    // Si la frase es excesivamente larga (> 130 caracteres), acortar a la primera oración
    if (s.length > 130) {
      const firstSentence = s.split(/\.(?:\s|$)/)[0];
      if (firstSentence && firstSentence.length >= 10) s = firstSentence;
    }
    // Asegurar mayúscula inicial y punto final
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += '.';
    if (!results.includes(s)) {
      results.push(s);
    }
  }

  if (results.length === 0 && text.length >= 6) {
    const single = text.charAt(0).toUpperCase() + text.slice(1);
    return [single.endsWith('.') ? single : single + '.'];
  }

  return results;
}

/** Extrae una frase completa sin truncar para el Duelo Clave. Si está rota o incompleta, retorna null */
function getCleanSentence(raw?: string | null, maxChars = 140): string | null {
  if (!raw) return null;
  const cleaned = cleanPlayerLanguage(raw);
  if (cleaned.length < 15) return null;

  // Si termina abruptamente en preposición o conjunción ("para", "de", "con", "en", "el", "la", "y", "a"), recortar
  const brokenEndings = /\b(?:para|por|con|sin|de|en|el|la|los|las|un|una|que|y|o|a)\s*$/i;
  if (brokenEndings.test(cleaned)) {
    // Intentar buscar la última frase completa antes del conector roto
    const parts = cleaned.match(/[^.!?]+[.!?]+/g);
    if (parts && parts.length > 0) {
      const valid = parts[0].trim();
      if (valid.length >= 15 && valid.length <= maxChars && !brokenEndings.test(valid)) {
        return valid;
      }
    }
    return null; // Omitir antes de imprimir una frase rota
  }

  // Buscar frases completas que quepan
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let combined = '';
    for (const s of sentences) {
      if ((combined + s).length <= maxChars) {
        combined += (combined ? ' ' : '') + s.trim();
      } else {
        break;
      }
    }
    if (combined.length >= 15) return combined;
  }

  // Si no tiene punto pero no termina en palabra rota y cabe
  if (cleaned.length <= maxChars && /[a-zA-Z0-9]$/.test(cleaned)) {
    return cleaned.endsWith('.') ? cleaned : cleaned + '.';
  }

  return null;
}

// ─── parseLineBriefing — sin dependencias externas ───────────────────────────

interface LineBriefing {
  porteria: string[];
  defensa: string[];
  mediocampo: string[];
  delantera: string[];
}

function parseLineBriefing(text: string): LineBriefing {
  const result: LineBriefing = {
    porteria: [], defensa: [], mediocampo: [], delantera: []
  };
  if (!text) return result;

  const getKey = (s: string): keyof LineBriefing | null => {
    const t = s.trim().toLowerCase();
    if (t.startsWith('portería') || t.startsWith('porteria') || t.startsWith('por')) return 'porteria';
    if (t.startsWith('defensa') || t.startsWith('def')) return 'defensa';
    if (t.startsWith('mediocampo') || t.startsWith('medios') || t.startsWith('med') || t.startsWith('centrocampistas')) return 'mediocampo';
    if (t.startsWith('delantera') || t.startsWith('delanteros') || t.startsWith('del') || t.startsWith('ataque')) return 'delantera';
    return null;
  };

  let cur: keyof LineBriefing | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const ci = line.indexOf(':');
    if (ci !== -1) {
      const prefix = line.substring(0, ci).trim();
      const k = getKey(prefix);
      if (k) {
        cur = k;
        const rem = line.substring(ci + 1);
        if (rem) {
          extractConsignas(rem, 2).forEach(c => result[cur!].push(c));
        }
        continue;
      }
    }
    if (cur) {
      extractConsignas(line, 2).forEach(c => result[cur!].push(c));
    }
  }

  // Deduplicar y limitar a máx 2 consignas directas por línea
  for (const k of (Object.keys(result) as (keyof LineBriefing)[])) {
    result[k] = Array.from(new Set(result[k])).slice(0, 2);
  }

  return result;
}

// ─── Mapa de posición label → clave instruccionesPorPuesto ───────────────────

type RoleKey = keyof NonNullable<GameModelAnalysis['instruccionesPorPuesto']>;

const LABEL_TO_ROLE_KEY: Record<string, RoleKey> = {
  POR: 'portero',
  LD: 'lateralDerecho',
  LI: 'lateralIzquierdo',
  DFC: 'centralIzquierdo',
  DCI: 'centralIzquierdo',
  DCD: 'centralDerecho',
  MCD: 'pivoteDefensivo',
  MC:  'pivoteOfensivo',
  MCO: 'mediapunta',
  ED:  'extremoDerecho',
  EI:  'extremoIzquierdo',
  DC:  'delantero',
  SD:  'delantero',
};

// ─── Renderizado de pie de página ────────────────────────────────────────────

function renderFooter(doc: jsPDF, page: number, total = 2): void {
  const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(LIGHT);
  doc.line(MARGIN, PAGE_H - 7.5, PAGE_W - MARGIN, PAGE_H - 7.5);
  doc.text(`S.D. Indautxu Juvenil A  ·  Temporada 2026/27  ·  ${dateStr}`, MARGIN, PAGE_H - 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MUTED);
  doc.text(`Página ${page} de ${total}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: 'right' });
}

// ─── FUNCIÓN PRINCIPAL DE EXPORTACIÓN ────────────────────────────────────────

export async function exportJugadoresToPDF(config: JugadoresPdfConfig): Promise<void> {
  // 1. Capturar el campo con html2canvas sobre el contenedor existente
  let fieldImgData: string | null = null;
  const fieldEl = document.getElementById(config.fieldElementId);
  if (fieldEl) {
    const noExportEls = fieldEl.querySelectorAll<HTMLElement>('.no-export');
    noExportEls.forEach(el => { el.style.visibility = 'hidden'; });
    try {
      const canvas = await html2canvas(fieldEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#F0FDF4',
        logging: false,
      });
      fieldImgData = canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.warn('[PDF Jugadores] html2canvas error:', err);
    } finally {
      noExportEls.forEach(el => { el.style.visibility = ''; });
    }
  }

  // 2. Inicializar documento A4 portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  const gm = config.analisisModeloJuego || {};

  // ===========================================================================
  // PÁGINA 1 — PLAN DE EQUIPO
  // ===========================================================================

  // Barra superior roja institucional
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  let curY = MARGIN + 1;

  // Cabecera principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(BLACK);
  const rivalStr = config.rival ? sanitizeTextForPdf(config.rival).toUpperCase() : 'PARTIDO';
  const vsStr = config.esLocal ? `vs ${rivalStr}` : `@ ${rivalStr}`;
  doc.text(vsStr, MARGIN, curY + 5);

  // Badge PDF JUGADORES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(WHITE);
  const badgeText = 'PDF JUGADORES';
  const badgeW = doc.getTextWidth(badgeText) + 8;
  doc.setFillColor(RED);
  doc.roundedRect(PAGE_W - MARGIN - badgeW, curY, badgeW, 6.5, 1, 1, 'F');
  doc.text(badgeText, PAGE_W - MARGIN - badgeW / 2, curY + 4.5, { align: 'center' });

  curY += 9;

  // Metadatos compactos
  const meta: string[] = [];
  if (config.jornada) meta.push(`Jornada ${config.jornada}`);
  if (config.fecha) meta.push(config.fecha);
  meta.push(`${config.sistemaPropio} vs ${config.sistemaRival}`);
  if (config.tipoPartido) meta.push(config.tipoPartido);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_SUB);
  doc.setTextColor(MUTED);
  doc.text(meta.join('   ·   '), MARGIN, curY);

  curY += 4;

  // Línea divisora
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, curY, PAGE_W - MARGIN, curY);
  curY += 4;

  // Campo táctico (Pizarra)
  if (fieldImgData) {
    const fieldH = 56;          // Altura óptima
    const fieldW = fieldH * 1.5; // 84mm ancho (relación 3:2)
    const fieldX = (PAGE_W - fieldW) / 2;

    doc.setDrawColor('#166534');
    doc.setLineWidth(0.4);
    doc.roundedRect(fieldX - 0.4, curY - 0.4, fieldW + 0.8, fieldH + 0.8, 1.5, 1.5, 'S');
    doc.addImage(fieldImgData, 'JPEG', fieldX, curY, fieldW, fieldH);
    curY += fieldH + 4;
  }

  // Divisor bajo el campo
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, curY, PAGE_W - MARGIN, curY);
  curY += 4;

  // Secciones de Plan de Equipo en 2 Columnas
  const planAtaque = hasContent(gm.planAtaque) ? gm.planAtaque : gm.ataque_posicional;
  const planDefensivo = hasContent(gm.planDefensivo) ? gm.planDefensivo : gm.defensa_posicional;
  const transAtaque = hasContent(gm.transicionDefensaAtaque) ? gm.transicionDefensaAtaque : gm.transicion_recuperacion;
  const transDefensa = hasContent(gm.transicionAtaqueDefensa) ? gm.transicionAtaqueDefensa : gm.transicion_perdida;

  interface ColSectionData {
    title: string;
    rawText: string | undefined;
    color: string;
  }

  // Columna Izquierda: Ofensivo / Daño
  const leftSections: ColSectionData[] = [];
  if (hasContent(config.ventajas)) {
    leftSections.push({ title: 'Dónde Hacer Daño', rawText: config.ventajas, color: SECTION_COLORS.attack });
  }
  if (hasContent(planAtaque)) {
    leftSections.push({ title: 'Con Balón', rawText: planAtaque, color: SECTION_COLORS.attack });
  }
  if (hasContent(transAtaque)) {
    leftSections.push({ title: 'Tras Recuperación', rawText: transAtaque, color: SECTION_COLORS.attack });
  }

  // Columna Derecha: Defensivo / Riesgos
  const rightSections: ColSectionData[] = [];
  if (hasContent(config.desventajas)) {
    rightSections.push({ title: 'Qué Evitar', rawText: config.desventajas, color: SECTION_COLORS.warning });
  }
  if (hasContent(planDefensivo)) {
    rightSections.push({ title: 'Sin Balón', rawText: planDefensivo, color: SECTION_COLORS.defend });
  }
  if (hasContent(transDefensa)) {
    rightSections.push({ title: 'Tras Pérdida', rawText: transDefensa, color: SECTION_COLORS.defend });
  }

  // Helper para renderizar un bloque de sección dentro de una columna
  const renderColSection = (x: number, startY: number, sec: ColSectionData): number => {
    let y = startY;

    // Pastilla del título (texto puro, sin emojis)
    const titleText = sec.title.toUpperCase();
    const titleW = doc.getTextWidth(titleText) + 6;
    doc.setFillColor(sec.color);
    doc.roundedRect(x, y - 1, titleW, 5.2, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SEC_HDR);
    doc.setTextColor(WHITE);
    doc.text(titleText, x + 3, y + 2.8);

    y += 7.5;

    // Consignas directas
    const bullets = extractConsignas(sec.rawText || '', 2);
    for (const b of bullets) {
      doc.setFillColor(sec.color);
      doc.circle(x + 1.5, y - 0.7, 0.9, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(BLACK);

      const lines = doc.splitTextToSize(b, COL_W - 5);
      lines.forEach((l: string) => {
        doc.text(l, x + 4.5, y);
        y += 3.8;
      });
      y += 1;
    }
    y += 2;
    return y;
  };

  const col1X = MARGIN;
  const col2X = MARGIN + COL_W + COL_GAP;
  const colStartY = curY;

  let yLeft = colStartY;
  for (const sec of leftSections) {
    yLeft = renderColSection(col1X, yLeft, sec);
  }

  let yRight = colStartY;
  for (const sec of rightSections) {
    yRight = renderColSection(col2X, yRight, sec);
  }

  curY = Math.max(yLeft, yRight);

  // Duelo Clave — solo si existe frase completa y válida (evita truncados tipo "para")
  const cleanDuelo = getCleanSentence(config.dueloClave, 130);
  if (cleanDuelo && curY < PAGE_H - 30) {
    curY += 2;
    doc.setFillColor('#F1F5F9');
    doc.roundedRect(MARGIN, curY, PAGE_W - MARGIN * 2, 11, 1.5, 1.5, 'F');
    // Acento lateral rojo
    doc.setFillColor(RED);
    doc.rect(MARGIN, curY, 2.5, 11, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(RED);
    doc.text('DUELO CLAVE:', MARGIN + 5, curY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(BLACK);
    const duelLines = doc.splitTextToSize(cleanDuelo, PAGE_W - MARGIN * 2 - 10);
    doc.text(duelLines[0] || '', MARGIN + 28, curY + 4.2);
    if (duelLines[1]) {
      doc.text(duelLines[1], MARGIN + 5, curY + 8.5);
    }
  }

  // Pie de Página 1
  renderFooter(doc, 1, 2);

  // ===========================================================================
  // PÁGINA 2 — TU TRABAJO (LÍNEAS + JUGADORES)
  // ===========================================================================

  doc.addPage();

  // Barra superior roja
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  curY = MARGIN + 1;

  // Cabecera Página 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(BLACK);
  doc.text('TU TRABAJO · LÍNEAS Y JUGADORES', MARGIN, curY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(WHITE);
  const badgeP2 = 'VESTUARIO';
  const badgeP2W = doc.getTextWidth(badgeP2) + 8;
  doc.setFillColor(SECTION_COLORS.neutral);
  doc.roundedRect(PAGE_W - MARGIN - badgeP2W, curY, badgeP2W, 6.5, 1, 1, 'F');
  doc.text(badgeP2, PAGE_W - MARGIN - badgeP2W / 2, curY + 4.5, { align: 'center' });

  curY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_SUB);
  doc.setTextColor(MUTED);
  doc.text('Consignas operativas por líneas y roles individuales para vestuario', MARGIN, curY);

  curY += 4;
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, curY, PAGE_W - MARGIN, curY);
  curY += 4;

  // ── SECCIÓN 1: CONSIGNAS POR LÍNEAS (Compacto en 2 columnas, texto limpio) ──
  const lineBriefing = parseLineBriefing(config.tareasLineas || '');
  const hasLines =
    lineBriefing.porteria.length > 0 ||
    lineBriefing.defensa.length > 0 ||
    lineBriefing.mediocampo.length > 0 ||
    lineBriefing.delantera.length > 0;

  if (hasLines) {
    // Título de bloque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SEC_HDR);
    doc.setTextColor(RED);
    doc.text('CONSIGNAS POR LÍNEAS', MARGIN, curY + 3);
    curY += 5.5;

    // Definición de líneas con texto limpio y seguro (sin emojis)
    const lineDefsLeft = [
      { key: 'porteria' as const, label: 'PORTERÍA', color: SECTION_COLORS.neutral },
      { key: 'defensa' as const,  label: 'DEFENSA',  color: SECTION_COLORS.defend },
    ];
    const lineDefsRight = [
      { key: 'mediocampo' as const, label: 'MEDIOCAMPO', color: SECTION_COLORS.neutral },
      { key: 'delantera' as const,  label: 'DELANTERA',  color: SECTION_COLORS.attack },
    ];

    const renderLineCol = (x: number, startY: number, defs: Array<{ key: keyof LineBriefing; label: string; color: string }>): number => {
      let y = startY;
      for (const ld of defs) {
        const items = lineBriefing[ld.key];
        if (!items.length) continue;

        // Badge de línea
        doc.setFillColor(ld.color);
        const lw = doc.getTextWidth(ld.label) + 6;
        doc.roundedRect(x, y - 0.8, lw, 4.8, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(WHITE);
        doc.text(ld.label, x + 3, y + 2.6);

        y += 6.5;

        for (const item of items) {
          doc.setFillColor(ld.color);
          doc.circle(x + 1.5, y - 0.7, 0.8, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(BLACK);

          const lines = doc.splitTextToSize(item, COL_W - 5);
          lines.forEach((l: string) => {
            doc.text(l, x + 4, y);
            y += 3.7;
          });
          y += 0.8;
        }
        y += 1.5;
      }
      return y;
    };

    const linesStartY = curY;
    const yLinesLeft = renderLineCol(col1X, linesStartY, lineDefsLeft);
    const yLinesRight = renderLineCol(col2X, linesStartY, lineDefsRight);

    curY = Math.max(yLinesLeft, yLinesRight);

    doc.setDrawColor(LIGHT);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, curY, PAGE_W - MARGIN, curY);
    curY += 4;
  }

  // ── SECCIÓN 2: CONSIGNAS INDIVIDUALES (ONCE INICIAL EN 2 COLUMNAS) ────────
  if (config.nodesPropio && config.players) {
    const assignedNodes = config.nodesPropio.filter(n => !!n.player_id);
    const roleCards = config.roleCards || [];
    const roles = gm.instruccionesPorPuesto;

    interface PlayerCardItem {
      dorsal: number | string;
      nombre: string;
      label: string;
      consignas: string[];
    }

    const orderMap: Record<string, number> = {
      POR: 1, LD: 2, DCD: 3, DFC: 4, DCI: 5, LI: 6,
      MCD: 7, MC: 8, MCO: 9, ED: 10, EI: 11, DC: 12, SD: 13
    };

    const sortedNodes = [...assignedNodes].sort((a, b) => {
      const ordA = orderMap[a.label] || 99;
      const ordB = orderMap[b.label] || 99;
      return ordA - ordB;
    });

    const playerCards: PlayerCardItem[] = [];

    for (const node of sortedNodes) {
      const player = config.players.find(p => p.id === node.player_id);
      if (!player) continue;

      const card = roleCards.find(rc => rc.posicion_label === node.label);

      // Prioridad 1: TacticalRoleCard (instrucciones_especificas > defensiva/ofensiva)
      let playerConsignas: string[] = [];

      if (card) {
        if (hasContent(card.instrucciones_especificas)) {
          playerConsignas = extractConsignas(card.instrucciones_especificas!, 2);
        } else {
          const defC = hasContent(card.fase_defensiva) ? extractConsignas(card.fase_defensiva!, 1) : [];
          const ofC = hasContent(card.fase_ofensiva) ? extractConsignas(card.fase_ofensiva!, 1) : [];
          playerConsignas = [...defC, ...ofC].slice(0, 2);
        }
      }

      // Prioridad 2: Fallback a instruccionesPorPuesto del Modelo de Juego
      if (playerConsignas.length === 0 && roles) {
        const roleKey = LABEL_TO_ROLE_KEY[node.label];
        if (roleKey && hasContent(roles[roleKey])) {
          playerConsignas = extractConsignas(roles[roleKey], 2);
        }
      }

      // Si aún no tiene consigna, generar una consigna funcional genérica
      if (playerConsignas.length === 0) {
        playerConsignas = [`Cumplir tareas posicionales de ${node.label} según plan de juego.`];
      }

      const displayName = player.apellidos
        ? `${player.nombre.charAt(0)}. ${player.apellidos}`
        : player.nombre;

      playerCards.push({
        dorsal: player.dorsal,
        nombre: sanitizeTextForPdf(displayName).toUpperCase(),
        label: node.label,
        consignas: playerConsignas,
      });
    }

    if (playerCards.length > 0) {
      // Título de bloque
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SEC_HDR);
      doc.setTextColor(RED);
      doc.text('CONSIGNAS INDIVIDUALES', MARGIN, curY + 3);
      curY += 5;

      // Distribuir en 2 columnas equilibradas
      const midPoint = Math.ceil(playerCards.length / 2);
      const colLeftPlayers = playerCards.slice(0, midPoint);
      const colRightPlayers = playerCards.slice(midPoint);

      const renderPlayerCol = (x: number, startY: number, list: PlayerCardItem[]): number => {
        let y = startY;

        for (const p of list) {
          // Pre-calcular altura de la ficha
          let cardH = 6; // Cabecera dorsal + nombre
          for (const c of p.consignas) {
            const lines = doc.splitTextToSize(c, COL_W - 8);
            cardH += lines.length * 3.5 + 1.2;
          }
          cardH += 1.5; // Margen inferior interior

          // Fondo y borde sutil
          doc.setFillColor(BG_CARD);
          doc.setDrawColor(BORDER_COL);
          doc.setLineWidth(0.25);
          doc.roundedRect(x, y, COL_W, cardH, 1, 1, 'FD');

          // Badge dorsal rojo
          const dorsalText = `#${p.dorsal}`;
          const dW = doc.getTextWidth(dorsalText) + 4;
          doc.setFillColor(RED);
          doc.roundedRect(x + 2, y + 1.5, dW, 4.2, 0.8, 0.8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_TINY);
          doc.setTextColor(WHITE);
          doc.text(dorsalText, x + 2 + dW / 2, y + 4.5, { align: 'center' });

          // Posición
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_TINY);
          doc.setTextColor(RED);
          doc.text(p.label, x + dW + 4, y + 4.5);

          // Nombre del jugador
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(BLACK);
          const nameX = x + dW + doc.getTextWidth(p.label) + 6;
          const maxNameW = COL_W - (nameX - x) - 2;
          const nameLines = doc.splitTextToSize(p.nombre, maxNameW);
          doc.text(nameLines[0] || p.nombre, nameX, y + 4.5);

          // Consignas individuales
          let lineY = y + 8.5;
          for (const c of p.consignas) {
            doc.setFillColor(RED);
            doc.circle(x + 3.5, lineY - 0.7, 0.7, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(SZ_BODY);
            doc.setTextColor(BLACK);

            const cLines = doc.splitTextToSize(c, COL_W - 9);
            cLines.forEach((cl: string) => {
              doc.text(cl, x + 6, lineY);
              lineY += 3.5;
            });
            lineY += 0.8;
          }

          y += cardH + 2.5; // Espacio entre fichas
        }

        return y;
      };

      const pStartY = curY;
      const yPLeft = renderPlayerCol(col1X, pStartY, colLeftPlayers);
      const yPRight = renderPlayerCol(col2X, pStartY, colRightPlayers);

      curY = Math.max(yPLeft, yPRight);
    }
  }

  // ── SECCIÓN 3: ALERTAS CLAVE DEL RIVAL (si existen y cabe al final de P2) ──
  const alertasClave = (config.approvedObservations || []).filter(
    o => o.prioridad === 'clave' && hasContent(o.contenido)
  );

  if (alertasClave.length > 0 && curY < PAGE_H - 26) {
    curY += 1;
    doc.setFillColor('#FEF3C7'); // Ámbar muy suave
    doc.setDrawColor('#F59E0B');
    doc.setLineWidth(0.25);
    const alertBoxH = Math.min(PAGE_H - curY - 10, 16);
    doc.roundedRect(MARGIN, curY, PAGE_W - MARGIN * 2, alertBoxH, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor('#B45309');
    doc.text('ALERTAS DEL RIVAL:', MARGIN + 4, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(BLACK);
    const obsText = cleanPlayerLanguage(alertasClave[0].contenido);
    const obsLines = doc.splitTextToSize(obsText, PAGE_W - MARGIN * 2 - 40);
    doc.text(obsLines[0] || '', MARGIN + 34, curY + 4.5);
    if (obsLines[1] && alertBoxH > 10) {
      doc.text(obsLines[1], MARGIN + 4, curY + 9);
    }
  }

  // Pie de Página 2
  renderFooter(doc, 2, 2);

  // 3. Guardar documento con nombre limpio
  doc.save(buildJugadoresFilename(config));
}

// ─── Filename helper ──────────────────────────────────────────────────────────

function sanitizeFilename(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export function buildJugadoresFilename(config: Pick<JugadoresPdfConfig, 'jornada' | 'rival'>): string {
  const parts: string[] = [];
  if (config.jornada) parts.push(`J${config.jornada}`);
  if (config.rival)   parts.push(sanitizeFilename(config.rival));
  parts.push('PDF_Jugadores');
  return parts.join('_') + '.pdf';
}
