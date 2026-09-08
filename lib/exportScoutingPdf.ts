/**
 * lib/exportScoutingPdf.ts
 *
 * Módulo de exportación a PDF para IA SCOUTING de Rivales.
 *
 * Principios:
 *  - jsPDF puro y vectorial (sin html2canvas): máximo rendimiento, tipografía 100% nítida y peso ultra ligero.
 *  - A4 portrait (210 × 297 mm), fondo blanco institucional para máxima legibilidad e impresión.
 *  - Paleta institucional: Rojo Indautxu (#CC0E21) de acento, Pizarra (#0F172A), Índigo (#4338CA), Esmeralda (#047857) y Ámbar (#D97706).
 *  - 5 Grandes Bloques requeridos:
 *      1. Resumen del Partido (escudo, metadatos, sistemas, fuentes y resumen ejecutivo).
 *      2. Plan Táctico (8 fases completas con separación estricta Capa A / Capa B / Capa C).
 *      3. Jugadores Clave / Amenazas Individuales.
 *      4. Vulnerabilidades + Consignas Específicas por Líneas.
 *      5. Riesgos Asumidos y Puntos Críticos del Plan.
 *  - Saltos de página inteligentes:
 *      - No títulos huérfanos.
 *      - Encabezados siempre acompañados de su contenido.
 *      - Bloques largos continúan limpiamente en la página siguiente sin cortes arbitrarios ni reducción de fuente.
 *  - Sistema Indautxu dinámico: prioriza el sistema asociado al informe con fallback doctrinal documentado.
 *  - Reutilización directa del parser estructurado de Capa C (parseCapaCText).
 *  - Cero llamadas a IA ni a APIs de backend.
 */

import jsPDF from 'jspdf';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { ClubAIReport, StructuredScoutingPlan, ScoutingBlock, ThreatItem, WeaknessItem, LineInstructions } from '@/hooks/useClubAIReports';
import { parseCapaCText, CapaCBlock } from '@/components/rivales/scouting/CapaCStructuredView';

// ─── Constantes de Diseño y Paleta ─────────────────────────────────────────────

const RED        = '#CC0E21'; // Rojo Indautxu / Athletic Club
const DARK_SLATE = '#0F172A'; // Texto principal
const MUTED_TEXT = '#475569'; // Texto secundario
const LIGHT_LINE = '#CBD5E1'; // Líneas divisoras
const BORDER_BOX = '#E2E8F0'; // Bordes de tarjetas

// Colores semánticos de Capas
const CAPA_A_TXT = '#334155';
const CAPA_B_TXT = '#3730A3';
const CAPA_C_TXT = '#065F46';

const AMBER_BG   = '#FFFBEB';
const AMBER_BOR  = '#FBBF24';
const AMBER_TXT  = '#92400E';

// Dimensiones A4 Portrait (en mm)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const COL_W  = PAGE_W - MARGIN * 2; // 182 mm útiles

// Tamaños de fuente
const SZ_HEADER_TITLE = 15;
const SZ_BLOCK_TITLE  = 11;
const SZ_PHASE_TITLE  = 9.5;
const SZ_SUBTITLE     = 8.5;
const SZ_BODY         = 8;
const SZ_SMALL        = 7.5;
const SZ_TINY         = 6.5;

// ─── Interfaz de Configuración del Exportador ──────────────────────────────────

export interface ScoutingPdfConfig {
  club: Club;
  season?: ClubSeason | null;
  report: ClubAIReport;
  parsedPlan?: StructuredScoutingPlan | null;
  versionIndex?: number;
  totalVersions?: number;
}

// ─── Contexto de Renderizado ───────────────────────────────────────────────────

interface RenderCtx {
  doc: jsPDF;
  y: number; // cursor vertical en mm
  clubName: string;
  reportDate: string;
  reportType: string;
  currentBlockTitle?: string | null; // Título del bloque o fase activa para encabezado de continuación
  isBlockActive?: boolean; // Solo true tras haberse renderizado la cabecera del bloque en la página actual
}

// ─── Helpers de Limpieza y Formato ─────────────────────────────────────────────

/**
 * Limpia marcas Markdown residuales y convierte símbolos no compatibles con fuentes estándar jsPDF
 */
function clean(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`/g, '')
    .replace(/[↳➔➜→]/g, '->')
    .replace(/[⚠️⚠]/g, '[!]')
    .replace(/[•●▪]/g, '-')
    .trim();
}

function hasContent(text?: string | null): boolean {
  return !!text && clean(text).length > 2;
}

function wrapLines(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(clean(text), maxWidth);
}

/**
 * Carga asíncrona segura de una imagen (escudo del club) convertida a Base64
 */
async function loadBase64Image(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Motor de Páginas y Saltos ─────────────────────────────────────────────────

/**
 * Comprueba si quedan al menos `needed` mm disponibles en la página.
 * Si no caben, añade página nueva e inicializa la cabecera/cursor.
 * Si un bloque ya ha comenzado previamente, añade un encabezado discreto de continuación.
 */
function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > PAGE_H - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 4;
    drawTopBar(ctx.doc);

    // Encabezado discreto de continuación ÚNICAMENTE cuando el bloque ya comenzó en una página anterior
    if (ctx.isBlockActive && ctx.currentBlockTitle) {
      const { doc } = ctx;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(SZ_TINY + 1);
      doc.setTextColor(MUTED_TEXT);
      doc.text(`${clean(ctx.currentBlockTitle)} — continuación`, MARGIN + 2, ctx.y + 2.5);

      doc.setDrawColor(LIGHT_LINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, ctx.y + 4.5, PAGE_W - MARGIN, ctx.y + 4.5);
      ctx.y += 8;
    }
  }
}

/**
 * Dibuja la barra de acento roja superior institucional
 */
function drawTopBar(doc: jsPDF): void {
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 2.5, 'F');
}

/**
 * Cabecera de Bloque Principal (Bloques 1 a 5)
 */
function renderBlockHeader(ctx: RenderCtx, num: number, title: string): void {
  // Desactivar flag antes de pintar la cabecera para que si salta de página no imprima continuación falsa
  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;

  // Evitar encabezados huérfanos: asegurar espacio para el encabezado + al menos 18 mm de contenido posterior
  ensureSpace(ctx, 24);
  const { doc } = ctx;

  doc.setFillColor(RED);
  doc.rect(MARGIN, ctx.y, 3, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_BLOCK_TITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text(`${num}. ${title.toUpperCase()}`, MARGIN + 5, ctx.y + 4.5);
  ctx.y += 8;

  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 4;

  // Cabecera ya dibujada en la página: activar seguimiento de continuación para contenidos internos
  ctx.currentBlockTitle = `${num}. ${title}`;
  ctx.isBlockActive = true;
}

/**
 * Cabecera de Fase Táctica dentro del Bloque 2
 */
function renderPhaseHeader(ctx: RenderCtx, title: string, badgeText: string): void {
  // Asegurar que el título de fase no quede huérfano (mínimo 22 mm para fase + Capa A inicial)
  ensureSpace(ctx, 22);
  const { doc } = ctx;

  // Fondo tenue de cabecera de fase
  doc.setFillColor('#F8FAFC');
  doc.roundedRect(MARGIN, ctx.y, COL_W, 7, 1, 1, 'F');
  doc.setDrawColor(BORDER_BOX);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 7, 1, 1, 'S');

  // Título de la fase
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_PHASE_TITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text(title, MARGIN + 3, ctx.y + 4.8);

  // Badge derecho
  if (badgeText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    const badgeW = doc.getTextWidth(badgeText.toUpperCase()) + 4;
    const badgeX = PAGE_W - MARGIN - badgeW - 2;
    doc.setFillColor(DARK_SLATE);
    doc.roundedRect(badgeX, ctx.y + 1.2, badgeW, 4.6, 0.8, 0.8, 'F');
    doc.setTextColor('#FFFFFF');
    doc.text(badgeText.toUpperCase(), badgeX + 2, ctx.y + 4.2);
  }

  ctx.y += 9;
}

// ─── Renderizado de las 3 Capas Tácticas ────────────────────────────────────────

/**
 * CAPA A — Evidencia del Rival (Informes Validados)
 */
function renderCapaA(ctx: RenderCtx, evidencias?: string[] | null, fallbackText?: string | null): void {
  const items = evidencias && evidencias.length > 0 ? evidencias : (fallbackText ? [fallbackText] : []);
  const { doc } = ctx;

  ensureSpace(ctx, 12);

  // Título de la Capa A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(CAPA_A_TXT);
  doc.text('CAPA A — Evidencia del Rival (Informes Validados)', MARGIN + 2, ctx.y + 3);
  ctx.y += 5;

  if (items.length === 0) {
    ensureSpace(ctx, 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin evidencias específicas registradas.', MARGIN + 4, ctx.y + 3);
    ctx.y += 5;
    return;
  }

  items.forEach(ev => {
    const lines = wrapLines(doc, ev, COL_W - 6, SZ_BODY);
    lines.forEach((line, idx) => {
      ensureSpace(ctx, 4.2);
      if (idx === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(RED);
        doc.text('-', MARGIN + 3, ctx.y);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(DARK_SLATE);
      doc.text(line, MARGIN + 7, ctx.y);
      ctx.y += 3.8;
    });
  });

  ctx.y += 2;
}

/**
 * CAPA B — Interpretación Táctica IA
 */
function renderCapaB(ctx: RenderCtx, interpretacion?: string | null): void {
  if (!hasContent(interpretacion)) return;
  const { doc } = ctx;

  ensureSpace(ctx, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(CAPA_B_TXT);
  doc.text('CAPA B — Interpretación Táctica IA', MARGIN + 2, ctx.y + 3);
  ctx.y += 5;

  const lines = wrapLines(doc, interpretacion!, COL_W - 6, SZ_BODY);
  lines.forEach(line => {
    ensureSpace(ctx, 4.2);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(DARK_SLATE);
    doc.text(line, MARGIN + 4, ctx.y);
    ctx.y += 3.8;
  });

  ctx.y += 2;
}

/**
 * CAPA C — Propuesta SD Indautxu (Renderizado Estructurado con parseCapaCText)
 */
function renderCapaC(ctx: RenderCtx, propuesta?: string | null, sistemaIndautxu = '1-4-2-3-1'): void {
  const { doc } = ctx;
  ensureSpace(ctx, 14);

  // Título de la Capa C
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(CAPA_C_TXT);
  doc.text(`CAPA C — Propuesta SD Indautxu (${sistemaIndautxu})`, MARGIN + 2, ctx.y + 3);
  ctx.y += 5.5;

  if (!hasContent(propuesta)) {
    ensureSpace(ctx, 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Mantener principios del modelo de juego Indautxu.', MARGIN + 4, ctx.y + 3);
    ctx.y += 5;
    return;
  }

  // Parseo determinista sin pérdida de información
  const blocks: CapaCBlock[] = parseCapaCText(propuesta);

  if (blocks.length === 0) {
    const lines = wrapLines(doc, propuesta!, COL_W - 6, SZ_BODY);
    lines.forEach(line => {
      ensureSpace(ctx, 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(DARK_SLATE);
      doc.text(line, MARGIN + 4, ctx.y);
      ctx.y += 3.8;
    });
    ctx.y += 2;
    return;
  }

  blocks.forEach(b => {
    // Título de bloque si existe (ej. [ORGANIZACIÓN], [PRESIÓN])
    if (b.title) {
      ensureSpace(ctx, 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SMALL);
      doc.setTextColor(CAPA_C_TXT);
      doc.text(`> ${clean(b.title)}`, MARGIN + 3, ctx.y);
      ctx.y += 4;
    }

    b.items.forEach(item => {
      // Concepto destacado en negrita si existe
      if (item.concept) {
        ensureSpace(ctx, 4.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(DARK_SLATE);
        doc.text(`* ${clean(item.concept)}:`, MARGIN + 4, ctx.y);
        ctx.y += 3.8;
      }

      // Texto de la consigna
      if (item.text) {
        const lines = wrapLines(doc, item.text, COL_W - (item.concept ? 8 : 6), SZ_BODY);
        lines.forEach(line => {
          ensureSpace(ctx, 4.2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(DARK_SLATE);
          doc.text(line, MARGIN + (item.concept ? 7 : 5), ctx.y);
          ctx.y += 3.8;
        });
      }

      // Sub-ítems por rol (ej. Laterales -> ..., Extremos -> ...)
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach(sub => {
          const subPrefix = sub.role ? `${clean(sub.role)}: ` : '- ';
          const fullSubText = `${subPrefix}${clean(sub.text)}`;
          const subLines = wrapLines(doc, fullSubText, COL_W - 12, SZ_SMALL);

          subLines.forEach((sLine, sIdx) => {
            ensureSpace(ctx, 3.8);
            if (sIdx === 0 && sub.role) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(SZ_SMALL);
              doc.setTextColor(CAPA_C_TXT);
              doc.text(`  -> ${clean(sub.role)}:`, MARGIN + 7, ctx.y);
              
              const roleWidth = doc.getTextWidth(`  -> ${clean(sub.role)}: `);
              const remainingText = clean(sub.text);
              const remLines = wrapLines(doc, remainingText, COL_W - 12 - roleWidth, SZ_SMALL);
              if (remLines.length > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(DARK_SLATE);
                doc.text(remLines[0], MARGIN + 7 + roleWidth, ctx.y);
                ctx.y += 3.5;
                remLines.slice(1).forEach(rLine => {
                  ensureSpace(ctx, 3.5);
                  doc.text(rLine, MARGIN + 12, ctx.y);
                  ctx.y += 3.5;
                });
              } else {
                ctx.y += 3.5;
              }
            } else {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(SZ_SMALL);
              doc.setTextColor(DARK_SLATE);
              doc.text(sLine, MARGIN + 10, ctx.y);
              ctx.y += 3.5;
            }
          });
        });
      }
    });
  });

  ctx.y += 3;
}

/**
 * Renderiza una fase táctica completa con sus 3 Capas A/B/C
 */
function renderTacticalPhase(
  ctx: RenderCtx,
  title: string,
  badgeText: string,
  block?: ScoutingBlock | null,
  fallbackText?: string | null,
  sistemaIndautxu?: string
): void {
  // Desactivar flag antes de pintar la cabecera de la fase
  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;

  renderPhaseHeader(ctx, title, badgeText);

  // La cabecera de la fase ya está dibujada en la página; activar flag para si se divide más adelante
  ctx.currentBlockTitle = title;
  ctx.isBlockActive = true;

  if (block) {
    renderCapaA(ctx, block.capaA_evidencias);
    renderCapaB(ctx, block.capaB_interpretacion);
    renderCapaC(ctx, block.capaC_propuestaIndautxu, sistemaIndautxu);
  } else {
    renderCapaA(ctx, null, fallbackText);
    renderCapaC(ctx, null, sistemaIndautxu);
  }

  // Separador sutil entre fases
  ensureSpace(ctx, 4);
  ctx.doc.setDrawColor(BORDER_BOX);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 4;

  // Fase finalizada: desactivar flag
  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;
}

// ─── Pie de Página (Footer) ───────────────────────────────────────────────────

function renderFooter(doc: jsPDF, pageNum: number, totalPages: number, clubName: string, reportDate: string): void {
  const footerY = PAGE_H - MARGIN + 6;

  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('SD INDAUTXU JUVENIL DH  ·  ATHLETIC CLUB IA', MARGIN, footerY);

  const centerText = `RIVAL: ${clubName.toUpperCase()} · ${reportDate}`;
  const centerW = doc.getTextWidth(centerText);
  doc.setFont('helvetica', 'normal');
  doc.text(centerText, (PAGE_W - centerW) / 2, footerY);

  const pageText = `Página ${pageNum} de ${totalPages}`;
  const pageW = doc.getTextWidth(pageText);
  doc.setFont('helvetica', 'bold');
  doc.text(pageText, PAGE_W - MARGIN - pageW, footerY);
}

// ─── Generador Principal del Documento ─────────────────────────────────────────

export async function exportScoutingToPdf(config: ScoutingPdfConfig): Promise<void> {
  const { club, report, parsedPlan, versionIndex, totalVersions } = config;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const reportDate = report.fecha || report.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const reportType = report.tipo || 'Informe táctico';

  const ctx: RenderCtx = {
    doc,
    y: MARGIN,
    clubName: club.nombre || 'Rival',
    reportDate,
    reportType,
  };

  drawTopBar(doc);

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOQUE 1: RESUMEN DEL PARTIDO
  // ═════════════════════════════════════════════════════════════════════════════

  // Determinar Sistema SD Indautxu dinámicamente con fallback doctrinal documentado
  // Fallback Doctrinal: "1-4-2-3-1 (SD Indautxu Juvenil DH)"
  const DOCTRINAL_SYSTEM_FALLBACK = '1-4-2-3-1 (SD Indautxu Juvenil DH)';
  const planObj = parsedPlan as Record<string, unknown> | null | undefined;
  const reportObj = report as unknown as Record<string, unknown>;
  const sistemaIndautxu =
    (typeof planObj?.sistemaIndautxu === 'string' && planObj.sistemaIndautxu) ||
    (typeof planObj?.sistemaPropio === 'string' && planObj.sistemaPropio) ||
    (typeof reportObj?.sistema_propio === 'string' && reportObj.sistema_propio) ||
    DOCTRINAL_SYSTEM_FALLBACK;

  const sistemaRival = parsedPlan?.sistemaRivalIdentificado || 'No identificado en informe';

  // Carga del escudo del club si está disponible
  const escudoBase64 = await loadBase64Image(club.escudo_url);

  // Cabecera institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_HEADER_TITLE);
  doc.setTextColor(RED);
  doc.text('SD INDAUTXU — PLAN DE PARTIDO', MARGIN, ctx.y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('DIVISIÓN DE HONOR JUVENIL  ·  ATHLETIC CLUB IA  ·  CUERPO TÉCNICO', MARGIN, ctx.y + 11);

  // Escudo del rival en la esquina superior derecha si se cargó con éxito
  const logoSize = 16;
  if (escudoBase64) {
    try {
      doc.addImage(escudoBase64, 'PNG', PAGE_W - MARGIN - logoSize, ctx.y, logoSize, logoSize);
    } catch {
      // Fallback si falla el renderizado binario del logo
    }
  }

  ctx.y += 16;

  // Título del Rival y Versión
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_BLOCK_TITLE + 2);
  doc.setTextColor(DARK_SLATE);
  doc.text(`RIVAL: ${club.nombre.toUpperCase()}`, MARGIN, ctx.y);

  // Badge de Versión
  const verText = totalVersions && totalVersions > 1 && versionIndex !== undefined
    ? `Versión ${totalVersions - versionIndex} · ${reportType}`
    : reportType;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  const verBadgeW = doc.getTextWidth(verText.toUpperCase()) + 5;
  const verBadgeX = PAGE_W - MARGIN - (escudoBase64 ? logoSize + 4 : 0) - verBadgeW;
  doc.setFillColor(RED);
  doc.roundedRect(verBadgeX, ctx.y - 4, verBadgeW, 5, 0.8, 0.8, 'F');
  doc.setTextColor('#FFFFFF');
  doc.text(verText.toUpperCase(), verBadgeX + 2.5, ctx.y - 0.5);

  ctx.y += 5;

  // Caja de Metadatos del Encuentro y Sistemas
  doc.setFillColor('#F8FAFC');
  doc.roundedRect(MARGIN, ctx.y, COL_W, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(BORDER_BOX);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 18, 1.5, 1.5, 'S');

  // Fila 1 de Metadatos: Sistemas tácticos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(MUTED_TEXT);
  doc.text('Sistema Rival:', MARGIN + 4, ctx.y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DARK_SLATE);
  doc.text(sistemaRival, MARGIN + 28, ctx.y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MUTED_TEXT);
  doc.text('Sistema Indautxu:', MARGIN + 85, ctx.y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(RED);
  doc.text(sistemaIndautxu, MARGIN + 115, ctx.y + 5);

  // Fila 2 de Metadatos: Fecha, fuentes y observaciones
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Fecha informe: ${reportDate}`, MARGIN + 4, ctx.y + 10);

  const totalObs = parsedPlan?.metadatosAnalisis?.totalObservacionesUsadas ?? 0;
  doc.text(`Observaciones aprobadas procesadas: ${totalObs}`, MARGIN + 85, ctx.y + 10);

  const fuentes = parsedPlan?.metadatosAnalisis?.documentosFuentes || [];
  const fuentesStr = fuentes.length > 0 ? fuentes.join(', ') : 'Documentos de scouting de rival';
  const fuentesLines = wrapLines(doc, `Fuentes: ${fuentesStr}`, COL_W - 8, SZ_TINY);
  doc.text(fuentesLines[0] || 'Fuentes: Informes de scouting del rival', MARGIN + 4, ctx.y + 15);

  ctx.y += 22;

  // Resumen Ejecutivo del Choque
  const resumenEjecutivo = parsedPlan?.resumenEjecutivo || report.plan_recomendado || 'Plan táctico de partido ajustado contra el rival.';
  ensureSpace(ctx, 20);

  doc.setFillColor('#F1F5F9');
  doc.setDrawColor('#94A3B8');
  doc.setLineWidth(0.25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text('RESUMEN EJECUTIVO DEL CHOQUE', MARGIN, ctx.y);
  ctx.y += 4.5;

  const resLines = wrapLines(doc, resumenEjecutivo, COL_W, SZ_BODY);
  resLines.forEach(line => {
    ensureSpace(ctx, 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(DARK_SLATE);
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 3.8;
  });

  ctx.y += 6;

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOQUE 2: PLAN TÁCTICO COMPLETO (8 FASES Y CAPAS A / B / C)
  // ═════════════════════════════════════════════════════════════════════════════

  renderBlockHeader(ctx, 2, 'Plan Táctico Estructurado (8 Fases en 3 Capas)');

  // 1. Cómo Defenderles
  renderTacticalPhase(
    ctx,
    '1. Cómo Defenderles',
    'Fase Defensiva',
    parsedPlan?.comoDefenderles,
    report.como_defenderles,
    sistemaIndautxu
  );

  // 2. Cómo Atacarles
  renderTacticalPhase(
    ctx,
    '2. Cómo Atacarles',
    'Fase Ofensiva',
    parsedPlan?.comoAtacarles,
    report.como_atacarles,
    sistemaIndautxu
  );

  // 3. Presión y Activadores
  renderTacticalPhase(
    ctx,
    '3. Presión y Activadores',
    'Acoso y Saltos',
    parsedPlan?.presionYActivadores,
    report.fortalezas,
    sistemaIndautxu
  );

  // 4. Salida de Balón
  renderTacticalPhase(
    ctx,
    '4. Salida de Balón',
    'Iniciación Indautxu',
    parsedPlan?.salidaBalon,
    'Salida mediante Cuadrado de Superioridad (Centrales + Pivotes) y reconocimiento de 3º Hombre.',
    sistemaIndautxu
  );

  // 5. Transición Ofensiva
  renderTacticalPhase(
    ctx,
    '5. Transición Ofensiva (Robo -> Ataque)',
    'Explotar Desajuste',
    parsedPlan?.transicionOfensiva,
    report.debilidades,
    sistemaIndautxu
  );

  // 6. Transición Defensiva
  renderTacticalPhase(
    ctx,
    '6. Transición Defensiva (Pérdida -> Repliegue)',
    'Presión 6-8s o Repliegue',
    parsedPlan?.transicionDefensiva,
    report.riesgos,
    sistemaIndautxu
  );

  // 7. ABP Ofensivo
  renderTacticalPhase(
    ctx,
    '7. ABP Ofensivo (Córneres y Faltas a Favor)',
    'Balón Parado a Favor',
    parsedPlan?.abpOfensivo,
    'Cargar zonas de debilidad detectadas en la defensa zonal/mixta del rival.',
    sistemaIndautxu
  );

  // 8. ABP Defensivo
  renderTacticalPhase(
    ctx,
    '8. ABP Defensivo (Neutralización ABP Rival)',
    'Vigilancia ABP Rival',
    parsedPlan?.abpDefensivo,
    report.alertas,
    sistemaIndautxu
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOQUE 3: JUGADORES CLAVE / AMENAZAS INDIVIDUALES
  // ═════════════════════════════════════════════════════════════════════════════

  renderBlockHeader(ctx, 3, 'Jugadores Clave y Amenazas Individuales del Rival');

  const amenazas: ThreatItem[] = parsedPlan?.amenazasPrincipales || [];

  if (amenazas.length === 0) {
    ensureSpace(ctx, 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin amenazas individuales específicas desglosadas en este informe.', MARGIN + 2, ctx.y);
    ctx.y += 8;
  } else {
    amenazas.forEach((threat, idx) => {
      const playerName = threat.jugador || `Jugador Rival #${idx + 1}`;

      // Desactivar flag antes de comenzar la ficha para que un salto de página inicial empiece limpio
      ctx.isBlockActive = false;
      ctx.currentBlockTitle = null;

      // Cabecera de la ficha del jugador (asegurar espacio para encabezado + evidencia inicial)
      ensureSpace(ctx, 22);

      const dangerLevel = (threat.peligro || 'alto').toUpperCase();
      const dangerColor = dangerLevel === 'CRITICO' ? RED : dangerLevel === 'ALTO' ? '#EA580C' : '#CA8A04';

      // Badge de Nivel de Peligro alineado a la derecha
      const badgeText = `AMENAZA ${dangerLevel}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      const bW = doc.getTextWidth(badgeText) + 5;
      const bH = 5;
      const badgeX = PAGE_W - MARGIN - bW;
      doc.setFillColor(dangerColor);
      doc.roundedRect(badgeX, ctx.y, bW, bH, 0.8, 0.8, 'F');
      doc.setTextColor('#FFFFFF');
      doc.text(badgeText, badgeX + 2.5, ctx.y + 3.5);

      // Nombre del jugador a la izquierda con ancho restringido para no tocar el badge
      const maxNameW = COL_W - bW - 6;
      const dorsalText = threat.dorsal ? `[#${threat.dorsal}] ` : '';
      const fullPlayerName = `${dorsalText}${playerName}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SUBTITLE + 1);
      doc.setTextColor(DARK_SLATE);
      const nameLines = wrapLines(doc, fullPlayerName, maxNameW, SZ_SUBTITLE + 1);
      nameLines.forEach(nLine => {
        doc.text(nLine, MARGIN + 2, ctx.y + 4);
        ctx.y += 4.5;
      });

      // Posición en línea propia debajo del nombre (robusto: nunca se solapa con el nombre ni con el badge)
      if (threat.posicion) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(MUTED_TEXT);
        doc.text(`Posición: ${clean(threat.posicion)}`, MARGIN + 2, ctx.y + 2.5);
        ctx.y += 6;
      } else {
        ctx.y += 2;
      }

      // La cabecera de la amenaza ya está dibujada en la página actual; activar seguimiento de continuación
      ctx.currentBlockTitle = `Amenaza: ${playerName}`;
      ctx.isBlockActive = true;

      // Evidencia del jugador
      if (threat.capaA_evidencia) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(CAPA_A_TXT);
        doc.text('Evidencia observada:', MARGIN + 3, ctx.y);
        ctx.y += 3.8;

        const evLines = wrapLines(doc, threat.capaA_evidencia, COL_W - 6, SZ_BODY);
        evLines.forEach(line => {
          ensureSpace(ctx, 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(DARK_SLATE);
          doc.text(line, MARGIN + 5, ctx.y);
          ctx.y += 3.8;
        });
      }

      // Interpretación IA si existe
      if (threat.capaB_interpretacion) {
        ensureSpace(ctx, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(CAPA_B_TXT);
        doc.text('Interpretación táctica:', MARGIN + 3, ctx.y);
        ctx.y += 3.8;

        const bLines = wrapLines(doc, threat.capaB_interpretacion, COL_W - 6, SZ_BODY);
        bLines.forEach(line => {
          ensureSpace(ctx, 4);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(DARK_SLATE);
          doc.text(line, MARGIN + 5, ctx.y);
          ctx.y += 3.8;
        });
      }

      // Consigna SD Indautxu / Marcaje
      if (threat.capaC_propuestaIndautxu) {
        ensureSpace(ctx, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(CAPA_C_TXT);
        doc.text('Consigna SD Indautxu / Comportamiento de Marcaje:', MARGIN + 3, ctx.y);
        ctx.y += 4;

        renderCapaC(ctx, threat.capaC_propuestaIndautxu, sistemaIndautxu);
      }

      // Separador entre jugadores
      ensureSpace(ctx, 4);
      doc.setDrawColor(BORDER_BOX);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 4, ctx.y, PAGE_W - MARGIN - 4, ctx.y);
      ctx.y += 5;

      // Finalizada la ficha: desactivar flag
      ctx.isBlockActive = false;
      ctx.currentBlockTitle = null;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOQUE 4: VULNERABILIDADES + CONSIGNAS POR LÍNEAS
  // ═════════════════════════════════════════════════════════════════════════════

  renderBlockHeader(ctx, 4, 'Vulnerabilidades del Rival y Consignas por Líneas');

  // 4.1 Vulnerabilidades a explotar
  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;
  ensureSpace(ctx, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text('4.1 VULNERABILIDADES Y DEBILIDADES A EXPLOTAR', MARGIN, ctx.y);
  ctx.y += 5;

  ctx.currentBlockTitle = '4.1 Vulnerabilidades y Debilidades a Explotar';
  ctx.isBlockActive = true;

  const debilidades: WeaknessItem[] = parsedPlan?.debilidadesExplotar || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text('4.1 VULNERABILIDADES Y DEBILIDADES A EXPLOTAR', MARGIN, ctx.y);
  ctx.y += 5;

  if (debilidades.length === 0) {
    ensureSpace(ctx, 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin debilidades explícitas registradas.', MARGIN + 3, ctx.y);
    ctx.y += 6;
  } else {
    debilidades.forEach((deb, idx) => {
      ensureSpace(ctx, 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SMALL);
      doc.setTextColor(CAPA_C_TXT);
      doc.text(`• ${clean(deb.aspecto || `Vulnerabilidad #${idx + 1}`)}`, MARGIN + 2, ctx.y);
      ctx.y += 4;

      if (deb.capaA_evidencia) {
        const evLines = wrapLines(doc, `Dato observado: ${deb.capaA_evidencia}`, COL_W - 6, SZ_BODY);
        evLines.forEach(line => {
          ensureSpace(ctx, 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(DARK_SLATE);
          doc.text(line, MARGIN + 6, ctx.y);
          ctx.y += 3.8;
        });
      }

      if (deb.capaC_propuestaIndautxu) {
        ensureSpace(ctx, 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_SMALL);
        doc.setTextColor(CAPA_C_TXT);
        doc.text('Plan de explotación Indautxu:', MARGIN + 6, ctx.y);
        ctx.y += 3.8;

        const propLines = wrapLines(doc, deb.capaC_propuestaIndautxu, COL_W - 10, SZ_BODY);
        propLines.forEach(line => {
          ensureSpace(ctx, 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(SZ_BODY);
          doc.setTextColor(DARK_SLATE);
          doc.text(line, MARGIN + 8, ctx.y);
          ctx.y += 3.8;
        });
      }

      ctx.y += 3;
    });
  }

  ctx.y += 4;
  ctx.currentBlockTitle = null;

  // 4.2 Consignas Específicas por Líneas
  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;

  ensureSpace(ctx, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE);
  doc.setTextColor(DARK_SLATE);
  doc.text(`4.2 CONSIGNAS POR LÍNEAS (SD INDAUTXU ${sistemaIndautxu})`, MARGIN, ctx.y);
  ctx.y += 5.5;

  ctx.currentBlockTitle = `4.2 Consignas por Líneas (SD Indautxu ${sistemaIndautxu})`;
  ctx.isBlockActive = true;
  const lineas: LineInstructions | undefined = parsedPlan?.consignasPorLineas;

  const renderLineaCard = (nombreLinea: string, contenido?: string | null, acentoColor = DARK_SLATE) => {
    if (!hasContent(contenido)) return;
    ensureSpace(ctx, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(acentoColor);
    doc.text(`[${nombreLinea.toUpperCase()}]`, MARGIN + 2, ctx.y);
    ctx.y += 4;

    const lines = wrapLines(doc, contenido!, COL_W - 6, SZ_BODY);
    lines.forEach(line => {
      ensureSpace(ctx, 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(DARK_SLATE);
      doc.text(line, MARGIN + 5, ctx.y);
      ctx.y += 3.8;
    });
    ctx.y += 2.5;
  };

  if (lineas) {
    renderLineaCard('Portería', lineas.porteria, '#D97706');
    renderLineaCard('Defensa (Centrales y Laterales)', lineas.defensa, '#2563EB');
    renderLineaCard('Mediocampo (Doble Pivote y Mediapunta)', lineas.mediocampo, '#4F46E5');
    renderLineaCard('Delantera (Extremos y Delantero Centro)', lineas.delantera, '#059669');
  } else {
    ensureSpace(ctx, 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin consignas específicas por líneas registradas en este informe.', MARGIN + 3, ctx.y);
    ctx.y += 6;
  }
  ctx.currentBlockTitle = null;

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOQUE 5: RIESGOS Y PUNTOS CRÍTICOS
  // ═════════════════════════════════════════════════════════════════════════════

  renderBlockHeader(ctx, 5, 'Riesgos Asumidos y Puntos Críticos del Plan');

  const riesgos: string[] = parsedPlan?.riesgosDelPlan || (report.riesgos ? [report.riesgos] : []);

  if (riesgos.length === 0) {
    ensureSpace(ctx, 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('No se han registrado riesgos críticos específicos para este emparejamiento.', MARGIN + 2, ctx.y);
    ctx.y += 8;
  } else {
    riesgos.forEach(r => {
      ensureSpace(ctx, 10);

      // Caja con acento ámbar/rojo
      doc.setFillColor(AMBER_BG);
      doc.setDrawColor(AMBER_BOR);
      doc.setLineWidth(0.25);

      const rLines = wrapLines(doc, r, COL_W - 12, SZ_BODY);
      const cardHeight = Math.max(8, rLines.length * 4 + 4);

      ensureSpace(ctx, cardHeight + 2);
      doc.roundedRect(MARGIN, ctx.y, COL_W, cardHeight, 1, 1, 'F');
      doc.roundedRect(MARGIN, ctx.y, COL_W, cardHeight, 1, 1, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(AMBER_TXT);
      doc.text('[!]', MARGIN + 3, ctx.y + 4.5);

      rLines.forEach((line, rIdx) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(DARK_SLATE);
        doc.text(line, MARGIN + 9, ctx.y + 4.5 + rIdx * 4);
      });

      ctx.y += cardHeight + 3;
    });
  }

  ctx.isBlockActive = false;
  ctx.currentBlockTitle = null;

  // ═════════════════════════════════════════════════════════════════════════════
  // NUMERACIÓN DE PÁGINAS Y PIES DE PÁGINA GLOBALES
  // ═════════════════════════════════════════════════════════════════════════════

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(doc, p, totalPages, club.nombre || 'Rival', reportDate);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DESCARGA DEL ARCHIVO
  // ═════════════════════════════════════════════════════════════════════════════

  const filename = buildScoutingFilename(club.nombre, reportDate, versionIndex, totalVersions);
  doc.save(filename);
}

// ─── Generación de Nombre de Archivo ──────────────────────────────────────────

function sanitizeName(str: string): string {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildScoutingFilename(
  rivalName?: string,
  dateStr?: string,
  versionIndex?: number,
  totalVersions?: number
): string {
  const parts: string[] = ['IA_Scouting'];
  if (rivalName) parts.push(sanitizeName(rivalName));
  if (totalVersions && totalVersions > 1 && versionIndex !== undefined) {
    parts.push(`V${totalVersions - versionIndex}`);
  }
  if (dateStr) parts.push(dateStr.replace(/[^0-9\-]/g, ''));
  return parts.join('_') + '.pdf';
}
