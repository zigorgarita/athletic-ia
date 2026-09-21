/**
 * lib/die-ligen/exportMultiMatchPdf.ts
 *
 * Exportador a PDF vectorial A4 Portrait para informes acumulados multi-partido Die Ligen.
 * Mismo estilo visual institucional que exportMatchPdf.ts:
 * - jsPDF puro y vectorial (sin html2canvas)
 * - Fondo blanco (#FFFFFF), texto pizarra (#0F172A), rojo Indautxu (#CC0E21)
 * - Perspectiva centrada en el rival analizado
 * - Porcentajes matemáticamente ponderados y promedios por partido
 * - Saltos de página inteligentes (ensureSpace) sin desbordamiento
 * - Matriz de titulares objetiva (sin datos inventados)
 * - Pie de página institucional "Página X de Y"
 */

import jsPDF from 'jspdf';
import { DieLigenMultiMatchReportData } from './aggregator';

const RED        = '#CC0E21'; // Rojo Indautxu institucional
const DARK_SLATE = '#0F172A'; // Texto principal
const MUTED_TEXT = '#475569'; // Texto secundario
const LIGHT_LINE = '#CBD5E1'; // Líneas divisorias
const BORDER_BOX = '#E2E8F0'; // Bordes de tarjetas y tablas
const BG_HEADER  = '#F8FAFC'; // Fondo tenue

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const COL_W  = PAGE_W - MARGIN * 2; // 182 mm

const SZ_TITLE       = 14;
const SZ_SECTION_HDR = 10;
const SZ_SMALL       = 7.5;
const SZ_TINY        = 6.5;

interface MultiPdfContext {
  doc: jsPDF;
  y: number;
  reportTitle: string;
  reportSub: string;
  currentSectionTitle?: string | null;
}

function clean(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[↳➔➜→]/g, '->')
    .replace(/[•●▪]/g, '-')
    .trim();
}

function drawTopBar(doc: jsPDF): void {
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 2.5, 'F');
}

function ensureSpace(ctx: MultiPdfContext, needed: number): void {
  if (ctx.y + needed > PAGE_H - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 4;
    drawTopBar(ctx.doc);

    if (ctx.currentSectionTitle) {
      const { doc } = ctx;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(SZ_TINY + 1);
      doc.setTextColor(MUTED_TEXT);
      doc.text(`${ctx.currentSectionTitle} (continuación)`, MARGIN + 2, ctx.y + 2.5);

      doc.setDrawColor(LIGHT_LINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, ctx.y + 4.5, PAGE_W - MARGIN, ctx.y + 4.5);
      ctx.y += 8;
    }
  }
}

function renderSectionHeader(ctx: MultiPdfContext, title: string): void {
  ensureSpace(ctx, 16);
  const { doc } = ctx;

  doc.setFillColor(RED);
  doc.rect(MARGIN, ctx.y, 3, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SECTION_HDR);
  doc.setTextColor(DARK_SLATE);
  doc.text(title.toUpperCase(), MARGIN + 5, ctx.y + 4.2);
  ctx.y += 7.5;

  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 4;

  ctx.currentSectionTitle = title;
}

function renderFooter(doc: jsPDF, pageNum: number, totalPages: number, reportTitle: string): void {
  const footerY = PAGE_H - MARGIN + 6;

  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('SD INDAUTXU JUVENIL DH  ·  INFORME ACUMULADO DIE LIGEN', MARGIN, footerY);

  const centerText = reportTitle.toUpperCase();
  const centerW = doc.getTextWidth(centerText);
  doc.setFont('helvetica', 'normal');
  doc.text(centerText, (PAGE_W - centerW) / 2, footerY);

  const pageText = `Página ${pageNum} de ${totalPages}`;
  const pageW = doc.getTextWidth(pageText);
  doc.setFont('helvetica', 'bold');
  doc.text(pageText, PAGE_W - MARGIN - pageW, footerY);
}

function renderMetricRow(
  ctx: MultiPdfContext,
  label: string,
  totalVal: string | number,
  avgVal: string | number,
  pctVal?: string,
  isEven = false
): void {
  ensureSpace(ctx, 5.2);
  const { doc } = ctx;

  if (isEven) {
    doc.setFillColor('#F8FAFC');
    doc.rect(MARGIN, ctx.y - 3.2, COL_W, 5, 'F');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(DARK_SLATE);
  doc.text(label, MARGIN + 4, ctx.y);

  // Total acumulado
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(RED);
  doc.text(String(totalVal), MARGIN + 105, ctx.y, { align: 'right' });

  // Promedio por partido
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_SLATE);
  doc.text(String(avgVal), MARGIN + 140, ctx.y, { align: 'right' });

  // Porcentaje ponderado
  if (pctVal !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#2563EB');
    doc.text(pctVal, PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });
  }

  ctx.y += 5;
}

export async function exportMultiMatchToPdf(data: DieLigenMultiMatchReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const reportTitle = `${data.targetClubName} — ACUMULADO ${data.totalPartidos} PARTIDOS`;
  const reportSub = `${data.competicion} · ${data.temporada}`;

  const ctx: MultiPdfContext = {
    doc,
    y: MARGIN,
    reportTitle,
    reportSub,
  };

  drawTopBar(doc);

  // ═════════════════════════════════════════════════════════════════════════════
  // CABECERA INSTITUCIONAL
  // ═════════════════════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(RED);
  doc.text('INFORME ACUMULADO MULTI-PARTIDO — DIE LIGEN', MARGIN, ctx.y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('SD INDAUTXU JUVENIL A  ·  DIVISIÓN DE HONOR  ·  ATHLETIC CLUB IA', MARGIN, ctx.y + 11);

  ctx.y += 15;

  // Caja del Rival y Balance
  doc.setFillColor(BG_HEADER);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 26, 1.5, 1.5, 'F');
  doc.setDrawColor(BORDER_BOX);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 26, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`${data.competicion.toUpperCase()}  ·  ${data.temporada}`, MARGIN + 5, ctx.y + 5);
  doc.text(`JORNADAS ANALIZADAS: ${data.jornadasIncluidas}`, PAGE_W - MARGIN - 5, ctx.y + 5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(RED);
  doc.text(data.targetClubName.toUpperCase(), MARGIN + 5, ctx.y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(DARK_SLATE);
  const bal = data.balance;
  const balanceText = `${data.totalPartidos} partidos  ·  ${bal.victorias}V - ${bal.empates}E - ${bal.derrotas}D  ·  ${bal.puntos} pts  ·  Goles: ${bal.golesFavor} a favor (${bal.promedioGolesFavor}/p), ${bal.golesContra} en contra (${bal.promedioGolesContra}/p)`;
  doc.text(balanceText, MARGIN + 5, ctx.y + 20);

  ctx.y += 30;

  // ═════════════════════════════════════════════════════════════════════════════
  // PARTIDOS INCLUIDOS EN EL ACUMULADO
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, 'Partidos analizados en la muestra');

  ensureSpace(ctx, 7);
  doc.setFillColor('#EDE9FE');
  doc.roundedRect(MARGIN, ctx.y - 3.5, COL_W, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(DARK_SLATE);
  doc.text('JORNADA', MARGIN + 4, ctx.y);
  doc.text('FECHA', MARGIN + 26, ctx.y);
  doc.text('RIVAL', MARGIN + 54, ctx.y);
  doc.text('CAMPO / CONDICIÓN', MARGIN + 105, ctx.y);
  doc.text('RESULTADO', PAGE_W - MARGIN - 26, ctx.y);
  doc.text('SIGNO', PAGE_W - MARGIN - 6, ctx.y, { align: 'right' });
  ctx.y += 5.5;

  data.partidos.forEach((p, idx) => {
    ensureSpace(ctx, 5.2);
    if (idx % 2 === 0) {
      doc.setFillColor('#F8FAFC');
      doc.rect(MARGIN, ctx.y - 3.2, COL_W, 5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(DARK_SLATE);
    doc.text(`J-${p.jornada}`, MARGIN + 4, ctx.y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED_TEXT);
    doc.text(p.fecha, MARGIN + 26, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_SLATE);
    doc.text(clean(p.rivalNombre), MARGIN + 54, ctx.y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED_TEXT);
    doc.text(p.esLocal ? 'Local' : 'Visitante', MARGIN + 105, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RED);
    doc.text(p.resultado, PAGE_W - MARGIN - 26, ctx.y);

    const signoColor = p.signo === 'V' ? '#16A34A' : p.signo === 'E' ? '#D97706' : '#DC2626';
    doc.setTextColor(signoColor);
    doc.text(p.signo, PAGE_W - MARGIN - 6, ctx.y, { align: 'right' });

    ctx.y += 5;
  });
  ctx.y += 4;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: GOLES Y EFICACIA OFENSIVA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '1. Goles y eficacia ofensiva');

  // Goleadores y asistentes en 2 columnas
  ensureSpace(ctx, 24);
  const startColY = ctx.y;

  // Columna Izquierda: Goleadores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(RED);
  doc.text('Goleadores acumulados', MARGIN + 4, ctx.y);
  let gY = ctx.y + 4.5;

  if (data.goles.goleadores.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin goleadores propios registrados', MARGIN + 4, gY);
    gY += 4.5;
  } else {
    data.goles.goleadores.slice(0, 6).forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(DARK_SLATE);
      doc.text(clean(item.jugador), MARGIN + 4, gY);
      doc.setTextColor(RED);
      doc.text(`${item.total} gol(es)`, MARGIN + 75, gY, { align: 'right' });
      gY += 4.2;
    });
  }

  // Columna Derecha: Asistentes
  const colRightX = MARGIN + 94;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor('#2563EB');
  doc.text('Asistentes acumulados', colRightX, startColY);
  let aY = startColY + 4.5;

  if (data.goles.asistentes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin asistencias registradas', colRightX, aY);
    aY += 4.5;
  } else {
    data.goles.asistentes.slice(0, 6).forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(DARK_SLATE);
      doc.text(clean(item.jugador), colRightX, aY);
      doc.setTextColor('#2563EB');
      doc.text(`${item.total} asist.`, PAGE_W - MARGIN - 4, aY, { align: 'right' });
      aY += 4.2;
    });
  }

  ctx.y = Math.max(gY, aY) + 3;

  // Lista detallada de goles a favor
  if (data.goles.golesFavorLista.length > 0) {
    ensureSpace(ctx, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('DETALLE DE GOLES A FAVOR REGISTRADOS:', MARGIN + 4, ctx.y);
    ctx.y += 4.5;

    data.goles.golesFavorLista.forEach((g) => {
      ensureSpace(ctx, 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(RED);
      doc.text(`[${g.jornadaBadge}]`, MARGIN + 4, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_SLATE);
      const desc = `${g.minutoFutbolistico} - ${g.goleador}${g.esAutogol ? ' (Autogol)' : ''} · vs ${clean(g.rivalPartido)}${g.asistente && g.asistente !== 'Sin asistencia' ? ` (Asist: ${clean(g.asistente)})` : ''}`;
      doc.text(desc, MARGIN + 20, ctx.y);
      ctx.y += 4.2;
    });
  }
  ctx.y += 4;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: TIROS Y REMATES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '2. Tiros y remates acumulados');

  ensureSpace(ctx, 6);
  doc.setFillColor('#EDE9FE');
  doc.roundedRect(MARGIN, ctx.y - 3.5, COL_W, 5.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(DARK_SLATE);
  doc.text('CONCEPTO', MARGIN + 4, ctx.y);
  doc.text('TOTAL', MARGIN + 105, ctx.y, { align: 'right' });
  doc.text('PROM./PARTIDO', MARGIN + 140, ctx.y, { align: 'right' });
  doc.text('% PONDERADO', PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });
  ctx.y += 5.2;

  const t = data.tiros;
  renderMetricRow(ctx, 'Total intentos de remate', t.totalIntentos, t.promedioTiros, '100%', true);
  renderMetricRow(ctx, 'Remates a puerta', t.aPuerta, t.promedioPuerta, t.pctPuerta, false);
  renderMetricRow(ctx, 'Remates fuera', t.fuera, (t.fuera / data.totalPartidos).toFixed(1), t.pctFuera, true);
  renderMetricRow(ctx, 'Remates bloqueados', t.bloqueados, (t.bloqueados / data.totalPartidos).toFixed(1), `${((t.bloqueados / (t.totalIntentos || 1)) * 100).toFixed(1)}%`, false);
  renderMetricRow(ctx, 'Remates al palo', t.alPalo, (t.alPalo / data.totalPartidos).toFixed(1), `${((t.alPalo / (t.totalIntentos || 1)) * 100).toFixed(1)}%`, true);
  renderMetricRow(ctx, 'Dentro del área', t.dentroArea, (t.dentroArea / data.totalPartidos).toFixed(1), t.pctDentroArea, false);
  renderMetricRow(ctx, 'Fuera del área', t.fueraArea, (t.fueraArea / data.totalPartidos).toFixed(1), `${((t.fueraArea / (t.totalIntentos || 1)) * 100).toFixed(1)}%`, true);
  renderMetricRow(ctx, 'Tras contraataque', t.contraataques, (t.contraataques / data.totalPartidos).toFixed(1), `${((t.contraataques / (t.totalIntentos || 1)) * 100).toFixed(1)}%`, false);

  // Carriles y rematadores
  ensureSpace(ctx, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Distribución por carriles: Izquierda ${t.carriles.izquierda} (${t.carriles.pctIzq})  ·  Centro ${t.carriles.centro} (${t.carriles.pctCentro})  ·  Derecha ${t.carriles.derecha} (${t.carriles.pctDer})`, MARGIN + 4, ctx.y + 3);
  ctx.y += 6.5;

  if (t.rematadores.length > 0) {
    const remStr = t.rematadores.slice(0, 6).map((r) => `${clean(r.jugador)} (${r.total})`).join(', ');
    doc.text(`Principales rematadores: ${remStr}`, MARGIN + 4, ctx.y);
    ctx.y += 5.5;
  }
  ctx.y += 2;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CENTROS AL ÁREA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '3. Centros al área acumulados');

  const c = data.centros;
  renderMetricRow(ctx, 'Centros totales', c.total, c.promedioCentros, '100%', true);
  renderMetricRow(ctx, 'Por banda derecha', c.derecha, (c.derecha / data.totalPartidos).toFixed(1), c.pctDerecha, false);
  renderMetricRow(ctx, 'Por banda izquierda', c.izquierda, (c.izquierda / data.totalPartidos).toFixed(1), c.pctIzquierda, true);
  renderMetricRow(ctx, 'Con remate generado', c.conRemate, (c.conRemate / data.totalPartidos).toFixed(1), c.pctConRemate, false);
  renderMetricRow(ctx, 'Altos / Bajos', `${c.altos} / ${c.bajos}`, '-', `${((c.altos / (c.total || 1)) * 100).toFixed(1)}% altos`, true);
  renderMetricRow(ctx, 'Centros tras contraataque', c.contraataques, (c.contraataques / data.totalPartidos).toFixed(1), `${((c.contraataques / (c.total || 1)) * 100).toFixed(1)}%`, false);

  if (c.centradores.length > 0) {
    ensureSpace(ctx, 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    const cenStr = c.centradores.slice(0, 6).map((cr) => `${clean(cr.jugador)} (${cr.total})`).join(', ');
    doc.text(`Principales centradores: ${cenStr}`, MARGIN + 4, ctx.y + 2);
    ctx.y += 6;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: CÓRNERES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '4. Córneres acumulados');

  const cr = data.corneres;
  renderMetricRow(ctx, 'Córneres totales a favor', cr.total, cr.promedioCorneres, '100%', true);
  renderMetricRow(ctx, 'Lado derecho', cr.derecha, (cr.derecha / data.totalPartidos).toFixed(1), cr.pctDerecha, false);
  renderMetricRow(ctx, 'Lado izquierdo', cr.izquierda, (cr.izquierda / data.totalPartidos).toFixed(1), cr.pctIzquierda, true);
  renderMetricRow(ctx, 'Peligro generado (remate + gol)', cr.remate + cr.gol, ((cr.remate + cr.gol) / data.totalPartidos).toFixed(1), cr.pctPeligro, false);
  renderMetricRow(ctx, 'Terminados en gol', cr.gol, (cr.gol / data.totalPartidos).toFixed(1), `${((cr.gol / (cr.total || 1)) * 100).toFixed(1)}%`, true);

  if (cr.lanzadores.length > 0) {
    ensureSpace(ctx, 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    const lanzStr = cr.lanzadores.slice(0, 5).map((l) => `${clean(l.jugador)} (${l.total})`).join(', ');
    doc.text(`Principales lanzadores de córner: ${lanzStr}`, MARGIN + 4, ctx.y + 2);
    ctx.y += 6;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: FALTAS Y GOLPES FRANCOS
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '5. Faltas y golpes francos acumulados');

  const f = data.faltas;
  renderMetricRow(ctx, 'Faltas / golpes francos totales', f.total, f.promedioFaltas, '100%', true);
  renderMetricRow(ctx, 'Tiro directo a portería', f.tiros, (f.tiros / data.totalPartidos).toFixed(1), f.pctTiros, false);
  renderMetricRow(ctx, 'Centro / servicio al área', f.centros, (f.centros / data.totalPartidos).toFixed(1), f.pctCentros, true);
  renderMetricRow(ctx, 'Pase en corto / elaboración', f.pases, (f.pases / data.totalPartidos).toFixed(1), f.pctPases, false);

  if (f.lanzadores.length > 0) {
    ensureSpace(ctx, 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(MUTED_TEXT);
    const fStr = f.lanzadores.slice(0, 5).map((l) => `${clean(l.jugador)} (${l.total})`).join(', ');
    doc.text(`Principales ejecutores de falta: ${fStr}`, MARGIN + 4, ctx.y + 2);
    ctx.y += 6;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: SAQUES DE PUERTA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '6. Saques de puerta acumulados');

  const sp = data.saquesPuerta;
  renderMetricRow(ctx, 'Saques de puerta totales', sp.total, (sp.total / data.totalPartidos).toFixed(1), '100%', true);
  renderMetricRow(ctx, 'Saques cortos (<30m)', sp.cortos, (sp.cortos / data.totalPartidos).toFixed(1), sp.pctCortos, false);
  renderMetricRow(ctx, 'Saques medios (30m - 50m)', sp.medios, (sp.medios / data.totalPartidos).toFixed(1), sp.pctMedios, true);
  renderMetricRow(ctx, 'Saques largos (>50m)', sp.largos, (sp.largos / data.totalPartidos).toFixed(1), sp.pctLargos, false);

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: SAQUES DE BANDA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '7. Saques de banda acumulados');

  const sb = data.saquesBanda;
  renderMetricRow(ctx, 'Saques de banda totales', sb.total, (sb.total / data.totalPartidos).toFixed(1), '100%', true);
  renderMetricRow(ctx, 'En campo propio', sb.campoPropio, (sb.campoPropio / data.totalPartidos).toFixed(1), sb.pctPropio, false);
  renderMetricRow(ctx, 'En campo rival', sb.campoRival, (sb.campoRival / data.totalPartidos).toFixed(1), sb.pctRival, true);
  renderMetricRow(ctx, 'Generan centro directo', sb.generaCentro, (sb.generaCentro / data.totalPartidos).toFixed(1), sb.pctGeneraCentro, false);
  renderMetricRow(ctx, 'Sin ocasión registrada', sb.sinOcasion, (sb.sinOcasion / data.totalPartidos).toFixed(1), `${((sb.sinOcasion / (sb.total || 1)) * 100).toFixed(1)}%`, true);

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 8: FORMACIONES Y MATRIZ DE TITULARES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '8. Formaciones, sistemas y matriz de titulares');

  // Sistemas utilizados
  ensureSpace(ctx, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(RED);
  doc.text('Sistemas tácticos utilizados en la muestra:', MARGIN + 4, ctx.y);
  ctx.y += 4.5;

  data.formaciones.sistemasUsados.forEach((sys) => {
    ensureSpace(ctx, 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`Sistema ${sys.sistema}:`, MARGIN + 6, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED_TEXT);
    doc.text(`${sys.partidosCount} de ${data.totalPartidos} partidos (${sys.pctUso}) · Jornadas: ${sys.jornadas.join(', ')}`, MARGIN + 38, ctx.y);
    ctx.y += 4.5;
  });
  ctx.y += 3;

  // Matriz de Titulares
  ensureSpace(ctx, 10);
  doc.setFillColor('#EDE9FE');
  doc.roundedRect(MARGIN, ctx.y - 3.5, COL_W, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(DARK_SLATE);
  doc.text('DORSAL', MARGIN + 4, ctx.y);
  doc.text('JUGADOR (TITULAR)', MARGIN + 22, ctx.y);
  doc.text('TITULARIDADES', MARGIN + 95, ctx.y, { align: 'right' });
  doc.text('% TITULAR', MARGIN + 125, ctx.y, { align: 'right' });
  doc.text('POSICIONES REGISTRADAS', MARGIN + 135, ctx.y);
  ctx.y += 5.5;

  data.formaciones.matrizTitulares.forEach((pl, idx) => {
    ensureSpace(ctx, 4.5);
    if (idx % 2 === 0) {
      doc.setFillColor('#F8FAFC');
      doc.rect(MARGIN, ctx.y - 3, COL_W, 4.2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(RED);
    doc.text(String(pl.dorsal), MARGIN + 4, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_SLATE);
    doc.text(clean(pl.nombreCompleto), MARGIN + 22, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_SLATE);
    doc.text(`${pl.titularidades} / ${pl.totalPartidos}`, MARGIN + 95, ctx.y, { align: 'right' });

    doc.setTextColor('#2563EB');
    doc.text(pl.pctTitular, MARGIN + 125, ctx.y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED_TEXT);
    doc.text(pl.posiciones.join(', ') || 'N/D', MARGIN + 135, ctx.y);

    ctx.y += 4.5;
  });
  ctx.y += 4;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 9: TABLA DE TENDENCIAS EVOLUTIVAS
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '9. Evolución comparativa por jornada');

  ensureSpace(ctx, 8);
  doc.setFillColor('#EDE9FE');
  doc.roundedRect(MARGIN, ctx.y - 3.5, COL_W, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(DARK_SLATE);
  doc.text('JORNADA', MARGIN + 4, ctx.y);
  doc.text('RIVAL', MARGIN + 22, ctx.y);
  doc.text('COND.', MARGIN + 62, ctx.y);
  doc.text('RES.', MARGIN + 82, ctx.y);
  doc.text('TIROS (PTA)', MARGIN + 110, ctx.y, { align: 'right' });
  doc.text('CENTROS', MARGIN + 134, ctx.y, { align: 'right' });
  doc.text('CÓRNERES', MARGIN + 158, ctx.y, { align: 'right' });
  doc.text('S.PTA', PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });
  ctx.y += 5.5;

  data.tendenciasPorJornada.forEach((row, idx) => {
    ensureSpace(ctx, 4.8);
    if (idx % 2 === 0) {
      doc.setFillColor('#F8FAFC');
      doc.rect(MARGIN, ctx.y - 3, COL_W, 4.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(row.jornada, MARGIN + 4, ctx.y);

    doc.setFont('helvetica', 'normal');
    doc.text(clean(row.rival), MARGIN + 22, ctx.y);
    doc.text(row.condicion === 'Local' ? 'Loc' : 'Vis', MARGIN + 62, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RED);
    doc.text(row.resultado, MARGIN + 82, ctx.y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_SLATE);
    doc.text(`${row.rematesTotal} (${row.rematesPuerta})`, MARGIN + 110, ctx.y, { align: 'right' });
    doc.text(String(row.centrosTotal), MARGIN + 134, ctx.y, { align: 'right' });
    doc.text(String(row.corneresTotal), MARGIN + 158, ctx.y, { align: 'right' });
    doc.text(String(row.saquesPuertaTotal), PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });

    ctx.y += 4.5;
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // NUMERACIÓN DE PÁGINAS Y GUARDADO FINAL
  // ═════════════════════════════════════════════════════════════════════════════
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(doc, p, totalPages, reportTitle);
  }

  const cleanClub = data.targetClubName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
  const filename = `DieLigen_Acumulado_${cleanClub}_${data.totalPartidos}_partidos.pdf`;

  doc.save(filename);
}
