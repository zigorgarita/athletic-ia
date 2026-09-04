/**
 * lib/exportJugadoresPdf.ts
 *
 * PDF JUGADORES — Módulo de exportación aislado para Pizarra Táctica.
 *
 * Principios:
 *  - Destinado al vestuario: visual, compacto, lenguaje directo.
 *  - A4 portrait, fondo blanco. Rojo (#CC0E21) como acento.
 *  - Captura del campo: html2canvas sobre el DOM de TacticalFieldExport
 *    (mismo mecanismo que el PDF visual existente — sin tocar ese componente).
 *  - Sin nueva llamada a IA. Sin inventar contenido.
 *  - Prioridad de consignas individuales:
 *      1. TacticalRoleCard (específica del matchup, editada por Aitor)
 *      2. instruccionesPorPuesto del Modelo de Juego (fallback)
 *      Sin mezcla ni duplicados.
 *  - parseLineBriefing: función local duplicada de BriefingView (no importada de allí).
 *
 * Archivo NUEVO. No modifica ningún archivo existente del proyecto.
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
const WHITE     = '#FFFFFF';

// A4 portrait
const PAGE_W   = 210;
const PAGE_H   = 297;
const MARGIN   = 13;
const COL_W    = PAGE_W - MARGIN * 2;

// Tamaños de fuente
const SZ_TITLE   = 17;
const SZ_BODY    = 8.5;
const SZ_SMALL   = 7.5;
const SZ_TINY    = 6.5;

// Colores semánticos para secciones
const SECTION_COLORS: Record<string, string> = {
  attack:   '#16A34A', // verde
  defend:   '#2563EB', // azul
  warning:  '#D97706', // ámbar
  neutral:  BLACK,
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

// ─── parseLineBriefing — copia local, no importada de BriefingView ────────────

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
    if (t.startsWith('mediocampo') || t.startsWith('medios') || t.startsWith('med')) return 'mediocampo';
    if (t.startsWith('delantera') || t.startsWith('delanteros') || t.startsWith('del') || t.startsWith('ataque')) return 'delantera';
    return null;
  };
  let cur: keyof LineBriefing | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const ci = line.indexOf(':');
    if (ci !== -1) {
      const k = getKey(line.substring(0, ci));
      if (k) {
        cur = k;
        const rem = line.substring(ci + 1).replace(/^[-*•\d.]+\s*/, '').trim();
        if (rem) result[cur].push(rem);
        continue;
      }
    }
    if (cur) {
      const b = line.replace(/^[-*•\d.]+\s*/, '').trim();
      if (b) result[cur].push(b);
    }
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clean(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/#{1,6}\s?/g, '').replace(/`/g, '').trim();
}

function hasContent(text?: string | null): boolean {
  return clean(text).length > 3;
}

function toBullets(text: string): string[] {
  const raw = clean(text);
  if (!raw) return [];
  return raw
    .split(/\n|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])|(?:\.\s{2,})|(?:;\s+)/)
    .map(p => p.trim())
    .filter(p => p.length > 3)
    .slice(0, 5); // Máximo 5 bullets por sección en vestuario
}

// ─── Motor de render ──────────────────────────────────────────────────────────

interface Ctx { doc: jsPDF; y: number }

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PAGE_H - MARGIN - 8) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 4;
  }
}

function renderFooter(doc: jsPDF, page: number, total: number): void {
  const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(LIGHT);
  doc.line(MARGIN, PAGE_H - 7.5, PAGE_W - MARGIN, PAGE_H - 7.5);
  doc.text(`Generado: ${dateStr}`, MARGIN, PAGE_H - 5);
  doc.text(`Athletic Club Indautxu · Temporada 26/27 · Pág. ${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
}

/** Cabecera de sección con pastilla coloreada */
function renderSectionHeader(ctx: Ctx, title: string, color = RED): void {
  ensureSpace(ctx, 10);
  const { doc } = ctx;
  const labelW = doc.getTextWidth(title.toUpperCase()) + 10;
  doc.setFillColor(color);
  doc.roundedRect(MARGIN, ctx.y - 1, labelW, 6.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(WHITE);
  doc.text(title.toUpperCase(), MARGIN + 5, ctx.y + 4);
  ctx.y += 9;
}

/** Bullet compacto */
function renderBullet(ctx: Ctx, text: string, accentColor = RED): void {
  if (!hasContent(text)) return;
  const { doc } = ctx;
  ensureSpace(ctx, 5);
  doc.setFillColor(accentColor);
  doc.circle(MARGIN + 1.5, ctx.y - 0.8, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(BLACK);
  const lines = doc.splitTextToSize(clean(text), COL_W - 6);
  lines.forEach((line: string, i: number) => {
    ensureSpace(ctx, 4.5);
    doc.text(line, MARGIN + 5, ctx.y);
    if (i === 0) ctx.y += 4.2;
    else ctx.y += 4.2;
  });
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

// ─── Función principal ────────────────────────────────────────────────────────

export async function exportJugadoresToPDF(config: JugadoresPdfConfig): Promise<void> {
  // 1. Capturar el campo con html2canvas (idéntico al mecanismo del PDF visual)
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
      console.warn('[PDF Jugadores] html2canvas error, PDF sin imagen del campo:', err);
    } finally {
      noExportEls.forEach(el => { el.style.visibility = ''; });
    }
  }

  // 2. Inicializar jsPDF A4 portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  const ctx: Ctx = { doc, y: MARGIN + 2 };
  const gm = config.analisisModeloJuego || {};

  // ── BARRA ROJA SUPERIOR ──────────────────────────────────────────────────
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // ── CABECERA ─────────────────────────────────────────────────────────────
  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(BLACK);
  const rivalStr = config.rival ? config.rival.toUpperCase() : 'PARTIDO';
  const vsStr = config.esLocal ? `vs ${rivalStr}` : `@ ${rivalStr}`;
  doc.text(vsStr, MARGIN, ctx.y + 7);

  // Badge PDF JUGADORES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(WHITE);
  const badgeText = 'PDF JUGADORES';
  const bw = doc.getTextWidth(badgeText) + 8;
  doc.setFillColor(RED);
  doc.roundedRect(PAGE_W - MARGIN - bw, ctx.y + 1, bw, 7, 1.5, 1.5, 'F');
  doc.text(badgeText, PAGE_W - MARGIN - bw / 2, ctx.y + 5.8, { align: 'center' });

  ctx.y += 12;

  // Metadatos compactos en una línea
  const meta: string[] = [];
  if (config.jornada) meta.push(`Jornada ${config.jornada}`);
  if (config.fecha) meta.push(config.fecha);
  if (config.tipoPartido) meta.push(config.tipoPartido);
  meta.push(`${config.sistemaPropio} vs ${config.sistemaRival}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(MUTED);
  doc.text(meta.join('  ·  '), MARGIN, ctx.y);
  ctx.y += 5;

  // Línea divisora
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 5;

  // ── CAMPO TÁCTICO ─────────────────────────────────────────────────────────
  if (fieldImgData) {
    // El campo export es landscape 3:2. Lo insertamos a ancho completo, centrado.
    // Ancho disponible: COL_W (184mm). Alto proporcional: 184/1.5 ≈ 123mm → demasiado.
    // Limitamos a 80mm de alto → ancho: 120mm. Centrado.
    const fieldH = 80;
    const fieldW = fieldH * 1.5; // 120mm
    const fieldX = (PAGE_W - fieldW) / 2;

    // Marco verde sutil
    doc.setDrawColor('#166534');
    doc.setLineWidth(0.5);
    doc.roundedRect(fieldX - 0.5, ctx.y - 0.5, fieldW + 1, fieldH + 1, 2, 2, 'S');
    doc.addImage(fieldImgData, 'JPEG', fieldX, ctx.y, fieldW, fieldH);
    ctx.y += fieldH + 5;
  } else {
    // Placeholder si no hay imagen
    doc.setFillColor('#F1F5F9');
    doc.roundedRect(MARGIN, ctx.y, COL_W, 30, 2, 2, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(MUTED);
    doc.text('Campo táctico no disponible', PAGE_W / 2, ctx.y + 15, { align: 'center' });
    ctx.y += 35;
  }

  // ── CONSIGNAS COLECTIVAS — 2 columnas bajo el campo ──────────────────────
  // Tenemos: QUÉ QUEREMOS HACER / DÓNDE HACER DAÑO / QUÉ EVITAR
  //          CON BALÓN / SIN BALÓN / TRAS RECUPERACIÓN / TRAS PÉRDIDA
  // Usaremos 2 columnas para compactar en la primera página.

  const halfW = (COL_W - 4) / 2;
  const col1X = MARGIN;
  const col2X = MARGIN + halfW + 4;

  // Función helper para columna izquierda/derecha
  const renderColSection = (
    xOffset: number,
    title: string,
    text: string | undefined,
    color: string
  ): number => {
    if (!hasContent(text)) return 0;
    const savedY = ctx.y;
    // Section header
    const labelW = doc.getTextWidth(title.toUpperCase()) + 8;
    doc.setFillColor(color);
    doc.roundedRect(xOffset, ctx.y - 1, labelW, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(WHITE);
    doc.text(title.toUpperCase(), xOffset + 4, ctx.y + 3.5);
    ctx.y += 8;

    const bullets = toBullets(text || '');
    bullets.forEach(b => {
      if (!hasContent(b)) return;
      ensureSpace(ctx, 4.5);
      doc.setFillColor(color);
      doc.circle(xOffset + 1.5, ctx.y - 0.8, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(BLACK);
      const lines = doc.splitTextToSize(clean(b), halfW - 6);
      lines.forEach((line: string) => {
        doc.text(line, xOffset + 5, ctx.y);
        ctx.y += 4.2;
      });
    });
    ctx.y += 2;
    return ctx.y - savedY;
  };

  // Verificar qué secciones tienen contenido
  const planAtaque = hasContent(gm.planAtaque) ? gm.planAtaque : gm.ataque_posicional;
  const planDefensivo = hasContent(gm.planDefensivo) ? gm.planDefensivo : gm.defensa_posicional;
  const transAtaque = hasContent(gm.transicionDefensaAtaque) ? gm.transicionDefensaAtaque : gm.transicion_recuperacion;
  const transDefensa = hasContent(gm.transicionAtaqueDefensa) ? gm.transicionAtaqueDefensa : gm.transicion_perdida;

  // Secciones a renderizar en 2 columnas
  interface ColSec { title: string; text: string | undefined; color: string }
  const sections: ColSec[] = [];

  if (hasContent(config.ventajas))    sections.push({ title: 'Dónde hacer daño',    text: config.ventajas,    color: SECTION_COLORS.attack });
  if (hasContent(planAtaque))         sections.push({ title: 'Con balón',            text: planAtaque,         color: SECTION_COLORS.attack });
  if (hasContent(config.desventajas)) sections.push({ title: 'Qué evitar',          text: config.desventajas, color: SECTION_COLORS.warning });
  if (hasContent(planDefensivo))      sections.push({ title: 'Sin balón',            text: planDefensivo,      color: SECTION_COLORS.defend });
  if (hasContent(transAtaque))        sections.push({ title: 'Tras recuperación',   text: transAtaque,        color: SECTION_COLORS.attack });
  if (hasContent(transDefensa))       sections.push({ title: 'Tras pérdida',         text: transDefensa,       color: SECTION_COLORS.defend });

  // Añadir "Qué queremos hacer" si solo hay planAtaque (para no repetir)
  if (!hasContent(config.ventajas) && !hasContent(planAtaque) && hasContent(config.dueloClave)) {
    sections.unshift({ title: 'Qué queremos hacer', text: config.dueloClave, color: RED });
  }

  // Renderizar en 2 columnas intercaladas
  if (sections.length > 0) {
    const leftSecs = sections.filter((_, i) => i % 2 === 0);
    const rightSecs = sections.filter((_, i) => i % 2 === 1);
    const maxLen = Math.max(leftSecs.length, rightSecs.length);

    for (let i = 0; i < maxLen; i++) {
      let leftEndY = ctx.y;
      let rightEndY = ctx.y;

      if (leftSecs[i]) {
        const savedY = ctx.y;
        renderColSection(col1X, leftSecs[i].title, leftSecs[i].text, leftSecs[i].color);
        leftEndY = ctx.y;
        ctx.y = savedY;
      }
      if (rightSecs[i]) {
        const savedY = ctx.y;
        renderColSection(col2X, rightSecs[i].title, rightSecs[i].text, rightSecs[i].color);
        rightEndY = ctx.y;
        ctx.y = savedY;
      }

      // Avanzar al mayor de los dos
      ctx.y = Math.max(leftEndY, rightEndY);

      // Separador sutil entre filas
      if (i < maxLen - 1) {
        doc.setDrawColor(LIGHT);
        doc.setLineWidth(0.15);
        doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
        ctx.y += 3;
      }
    }
  }

  // ── DUELO CLAVE (si no se usó ya) ────────────────────────────────────────
  if (hasContent(config.dueloClave) && sections.length > 0) {
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(MUTED);
    doc.text('DUELO CLAVE:', MARGIN, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BLACK);
    const dc = doc.splitTextToSize(clean(config.dueloClave), COL_W - 30);
    doc.text(dc[0] || '', MARGIN + 28, ctx.y);
    ctx.y += 5;
  }

  // ── LÍNEA DIVISORA ANTES DE SEGUNDA SECCIÓN ──────────────────────────────
  ensureSpace(ctx, 8);
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 5;

  // ── CONSIGNAS POR LÍNEAS ─────────────────────────────────────────────────
  const lineBriefing = parseLineBriefing(config.tareasLineas || '');
  const hasLines =
    lineBriefing.porteria.some(s => s.trim()) ||
    lineBriefing.defensa.some(s => s.trim()) ||
    lineBriefing.mediocampo.some(s => s.trim()) ||
    lineBriefing.delantera.some(s => s.trim());

  if (hasLines) {
    renderSectionHeader(ctx, 'Consignas por Líneas', RED);

    const LINE_DEFS: { key: keyof LineBriefing; label: string; color: string }[] = [
      { key: 'porteria',   label: '🧤 Portería',    color: SECTION_COLORS.neutral },
      { key: 'defensa',    label: '🛡 Defensa',     color: SECTION_COLORS.defend },
      { key: 'mediocampo', label: '⚙ Mediocampo',  color: SECTION_COLORS.neutral },
      { key: 'delantera',  label: '⚡ Delantera',   color: SECTION_COLORS.attack },
    ];

    for (const ld of LINE_DEFS) {
      const items = lineBriefing[ld.key].filter(s => s.trim().length > 1);
      if (!items.length) continue;

      ensureSpace(ctx, 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(BLACK);
      doc.text(ld.label, MARGIN, ctx.y);
      ctx.y += 4.5;

      items.slice(0, 3).forEach(item => {
        ensureSpace(ctx, 4.5);
        doc.setFillColor(ld.color);
        doc.circle(MARGIN + 2, ctx.y - 0.8, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(BLACK);
        const ls = doc.splitTextToSize(clean(item), COL_W - 8);
        ls.forEach((line: string) => {
          doc.text(line, MARGIN + 6, ctx.y);
          ctx.y += 4.2;
        });
      });
      ctx.y += 1;
    }
  }

  // ── CONSIGNAS INDIVIDUALES ───────────────────────────────────────────────
  if (config.nodesPropio && config.players) {
    const assignedNodes = config.nodesPropio.filter(n => !!n.player_id);
    const roleCards = config.roleCards || [];
    const roles = gm.instruccionesPorPuesto;

    // Construir lista de jugadores con su consigna individual
    interface PlayerConsigna {
      dorsal: number | string;
      nombre: string;
      label: string;
      linea: string;
      consigna: string;
      tipoConsigna: string; // 'ataque' | 'defensa' | 'especifica' | 'modelo'
    }

    const getLinea = (label: string): string => {
      if (label === 'POR') return 'Portería';
      if (['LD', 'LI', 'DFC', 'DCI', 'DCD'].includes(label)) return 'Defensa';
      if (['MCD', 'MC', 'MCO'].includes(label)) return 'Mediocampo';
      return 'Delantera';
    };

    const playerConsignas: PlayerConsigna[] = [];

    for (const node of assignedNodes) {
      const player = config.players.find(p => p.id === node.player_id);
      if (!player) continue;

      const card = roleCards.find(rc => rc.posicion_label === node.label);

      // Prioridad 1: TacticalRoleCard
      let consigna = '';
      let tipoConsigna = '';

      if (card) {
        // Preferir instrucciones_especificas si existe, sino concatenar las más cortas
        if (hasContent(card.instrucciones_especificas)) {
          consigna = clean(card.instrucciones_especificas!);
          tipoConsigna = 'especifica';
        } else if (hasContent(card.fase_ofensiva)) {
          consigna = clean(card.fase_ofensiva!);
          tipoConsigna = 'ataque';
        } else if (hasContent(card.fase_defensiva)) {
          consigna = clean(card.fase_defensiva!);
          tipoConsigna = 'defensa';
        }
      }

      // Prioridad 2: instruccionesPorPuesto del Modelo de Juego (fallback, sin mezcla)
      if (!consigna && roles) {
        const roleKey = LABEL_TO_ROLE_KEY[node.label];
        if (roleKey && hasContent(roles[roleKey])) {
          consigna = clean(roles[roleKey]);
          tipoConsigna = 'modelo';
        }
      }

      if (!consigna) continue;

      // Truncar a 2 frases para que sea consigna de vestuario
      const sentences = consigna.split(/\.(?=\s)/).slice(0, 2);
      const shortConsigna = sentences.join('. ').trim();

      playerConsignas.push({
        dorsal: player.dorsal,
        nombre: `${player.nombre} ${player.apellidos}`.trim(),
        label: node.label,
        linea: getLinea(node.label),
        consigna: shortConsigna,
        tipoConsigna,
      });
    }

    if (playerConsignas.length > 0) {
      ensureSpace(ctx, 8);
      doc.setDrawColor(LIGHT);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
      ctx.y += 5;
      renderSectionHeader(ctx, 'Consignas Individuales', RED);

      // Agrupar por línea para mejor lectura
      const lineas = ['Portería', 'Defensa', 'Mediocampo', 'Delantera'];
      for (const linea of lineas) {
        const lineaPlayers = playerConsignas.filter(p => p.linea === linea);
        if (!lineaPlayers.length) continue;

        ensureSpace(ctx, 6);
        // Subtítulo de línea
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(MUTED);
        doc.text(linea.toUpperCase(), MARGIN, ctx.y);
        ctx.y += 4;

        for (const pc of lineaPlayers) {
          ensureSpace(ctx, 10);

          // Badge dorsal rojo + nombre
          const dorsalStr = `#${pc.dorsal}`;
          const dorsalW = doc.getTextWidth(dorsalStr) + 6;
          doc.setFillColor(RED);
          doc.roundedRect(MARGIN, ctx.y - 3.5, dorsalW, 6, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(WHITE);
          doc.text(dorsalStr, MARGIN + 3, ctx.y + 0.5);

          // Label posición
          const posX = MARGIN + dorsalW + 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_TINY);
          doc.setTextColor(RED);
          doc.text(pc.label, posX, ctx.y - 0.5);

          // Nombre
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(BLACK);
          const nameStr = pc.nombre.length > 22 ? pc.nombre.split(' ')[0] : pc.nombre;
          doc.text(nameStr, posX, ctx.y + 3.2);

          ctx.y += 6;

          // Consigna
          const consLines = doc.splitTextToSize(clean(pc.consigna), COL_W - 8);
          consLines.slice(0, 3).forEach((line: string) => {
            ensureSpace(ctx, 4.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(SZ_BODY);
            doc.setTextColor(BLACK);
            doc.text(line, MARGIN + 4, ctx.y);
            ctx.y += 4.2;
          });
          ctx.y += 1.5;
        }
        ctx.y += 1;
      }
    }
  }

  // ── ALERTAS DEL RIVAL (si hay observaciones aprobadas clave) ─────────────
  const alertasClave = (config.approvedObservations || []).filter(o => o.prioridad === 'clave' && hasContent(o.contenido));
  if (alertasClave.length > 0) {
    ensureSpace(ctx, 8);
    doc.setDrawColor(LIGHT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
    ctx.y += 5;
    renderSectionHeader(ctx, '⚑ Alertas del Rival', SECTION_COLORS.warning);
    alertasClave.slice(0, 4).forEach(obs => {
      renderBullet(ctx, obs.contenido, SECTION_COLORS.warning);
    });
  }

  // ── PIES DE PÁGINA ────────────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(doc, p, totalPages);
  }

  // ── GUARDAR ───────────────────────────────────────────────────────────────
  doc.save(buildJugadoresFilename(config));
}

// ─── Filename helper ──────────────────────────────────────────────────────────

function sanitize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export function buildJugadoresFilename(config: Pick<JugadoresPdfConfig, 'jornada' | 'rival'>): string {
  const parts: string[] = [];
  if (config.jornada) parts.push(`J${config.jornada}`);
  if (config.rival)   parts.push(sanitize(config.rival));
  parts.push('PDF_Jugadores');
  return parts.join('_') + '.pdf';
}
