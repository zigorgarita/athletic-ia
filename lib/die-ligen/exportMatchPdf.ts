/**
 * lib/die-ligen/exportMatchPdf.ts
 *
 * Exportador a PDF vectorial A4 Portrait para informes de partido Die Ligen (Prototipo 2).
 * Reutiliza la arquitectura y estilo institucional de exportScoutingPdf.ts:
 * - jsPDF puro y vectorial (sin html2canvas)
 * - Fondo blanco (#FFFFFF), texto pizarra (#0F172A), rojo Indautxu (#CC0E21)
 * - Cabecera institucional
 * - Saltos de página inteligentes (ensureSpace) sin límite fijo de páginas
 * - Pie de página con numeración "Página X de Y"
 * - Descarga directa mediante doc.save(filename)
 */

import jsPDF from 'jspdf';
import { DieLigenMatchReportData } from './parser';

// ─── Constantes de Diseño y Geometría ─────────────────────────────────────────

const RED        = '#CC0E21'; // Rojo Indautxu institucional
const DARK_SLATE = '#0F172A'; // Texto principal
const MUTED_TEXT = '#475569'; // Texto secundario
const LIGHT_LINE = '#CBD5E1'; // Líneas divisorias
const BORDER_BOX = '#E2E8F0'; // Bordes de tarjetas y tablas
const BG_HEADER  = '#F8FAFC'; // Fondo tenue de cabeceras

// Geometría A4 Portrait (en mm)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const COL_W  = PAGE_W - MARGIN * 2; // 182 mm útiles

// Tamaños de fuente
const SZ_TITLE       = 15;
const SZ_SECTION_HDR = 10.5;
const SZ_BODY        = 8;
const SZ_SMALL       = 7.5;
const SZ_TINY        = 6.5;

interface PdfContext {
  doc: jsPDF;
  y: number;
  matchTitle: string;
  matchDate: string;
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

function ensureSpace(ctx: PdfContext, needed: number): void {
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

function renderSectionHeader(ctx: PdfContext, title: string): void {
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

function renderFooter(doc: jsPDF, pageNum: number, totalPages: number, matchTitle: string, matchDate: string): void {
  const footerY = PAGE_H - MARGIN + 6;

  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('SD INDAUTXU JUVENIL DH  ·  INFORME DIE LIGEN', MARGIN, footerY);

  const centerText = `${matchTitle.toUpperCase()}  ·  ${matchDate}`;
  const centerW = doc.getTextWidth(centerText);
  doc.setFont('helvetica', 'normal');
  doc.text(centerText, (PAGE_W - centerW) / 2, footerY);

  const pageText = `Página ${pageNum} de ${totalPages}`;
  const pageW = doc.getTextWidth(pageText);
  doc.setFont('helvetica', 'bold');
  doc.text(pageText, PAGE_W - MARGIN - pageW, footerY);
}

// ─── Componentes de Tablas para jsPDF ──────────────────────────────────────────

function renderComparisonRow(
  ctx: PdfContext,
  valLocal: string | number,
  label: string,
  valAway: string | number,
  isEven = false
): void {
  ensureSpace(ctx, 5.5);
  const { doc } = ctx;

  if (isEven) {
    doc.setFillColor('#F8FAFC');
    doc.rect(MARGIN, ctx.y - 3.2, COL_W, 5.2, 'F');
  }

  // Local
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(RED);
  doc.text(String(valLocal), MARGIN + 18, ctx.y, { align: 'center' });

  // Label Central
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_SLATE);
  doc.text(label, MARGIN + 35, ctx.y);

  // Visitante
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#2563EB');
  doc.text(String(valAway), PAGE_W - MARGIN - 18, ctx.y, { align: 'center' });

  ctx.y += 5.2;
}

function renderComparisonHeader(ctx: PdfContext, localName: string, awayName: string): void {
  ensureSpace(ctx, 7);
  const { doc } = ctx;

  doc.setFillColor('#EDE9FE');
  doc.roundedRect(MARGIN, ctx.y - 3.5, COL_W, 6, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(RED);
  doc.text(clean(localName).toUpperCase(), MARGIN + 18, ctx.y, { align: 'center' });

  doc.setTextColor(DARK_SLATE);
  doc.text('CONCEPTO ANALIZADO', MARGIN + 35, ctx.y);

  doc.setTextColor('#2563EB');
  doc.text(clean(awayName).toUpperCase(), PAGE_W - MARGIN - 18, ctx.y, { align: 'center' });

  ctx.y += 6.5;
}

// ─── Exportador Principal ─────────────────────────────────────────────────────

export async function exportMatchToPdf(data: DieLigenMatchReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const c = data.cabecera;
  const matchTitle = `${c.local.nombre} vs ${c.visitante.nombre}`;
  const matchDate = c.fecha || 'Fecha N/D';

  const ctx: PdfContext = {
    doc,
    y: MARGIN,
    matchTitle,
    matchDate,
  };

  drawTopBar(doc);

  // ═════════════════════════════════════════════════════════════════════════════
  // CABECERA INSTITUCIONAL DEL PARTIDO
  // ═════════════════════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(RED);
  doc.text('INFORME TÁCTICO DE PARTIDO — DIE LIGEN', MARGIN, ctx.y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text('SD INDAUTXU JUVENIL A  ·  DIVISIÓN DE HONOR  ·  ATHLETIC CLUB IA', MARGIN, ctx.y + 11);

  ctx.y += 16;

  // Caja de Partido y Marcador
  doc.setFillColor(BG_HEADER);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(BORDER_BOX);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, ctx.y, COL_W, 28, 1.5, 1.5, 'S');

  // Metadatos superiores de la caja
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`${c.competicion.toUpperCase()}  ·  ${c.jornada}  ·  ${c.temporada}`, MARGIN + 5, ctx.y + 5);
  doc.text(`CAMPO: ${c.campo.toUpperCase()}`, PAGE_W - MARGIN - 5, ctx.y + 5, { align: 'right' });

  // Equipos y Marcador
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(DARK_SLATE);
  doc.text(c.local.nombre, MARGIN + 8, ctx.y + 14);

  // Marcador Central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(RED);
  const scoreText = `${c.golesLocal}  -  ${c.golesVisitante}`;
  doc.text(scoreText, PAGE_W / 2, ctx.y + 15, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(DARK_SLATE);
  doc.text(c.visitante.nombre, PAGE_W - MARGIN - 8, ctx.y + 14, { align: 'right' });

  // Descanso y Fecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Descanso: ${c.descansoLocal} - ${c.descansoVisitante}`, PAGE_W / 2, ctx.y + 20, { align: 'center' });
  doc.text(`Fecha del partido: ${c.fecha}`, MARGIN + 5, ctx.y + 25);

  ctx.y += 33;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: GOLES DEL PARTIDO
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '1. Goles del partido');

  if (data.goles.length === 0) {
    ensureSpace(ctx, 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED_TEXT);
    doc.text('Sin goles registrados en este partido (0 - 0).', MARGIN + 4, ctx.y + 3);
    ctx.y += 8;
  } else {
    data.goles.forEach((g) => {
      ensureSpace(ctx, 15);
      doc.setFillColor('#F8FAFC');
      doc.roundedRect(MARGIN, ctx.y, COL_W, 13.5, 1, 1, 'F');
      doc.setDrawColor(g.esLocal ? RED : '#2563EB');
      doc.setLineWidth(0.8);
      doc.line(MARGIN, ctx.y, MARGIN, ctx.y + 13.5);

      // Línea 1: Minuto, Goleador, Equipo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(g.esLocal ? RED : '#2563EB');
      doc.text(`${g.minutoFutbolistico} (${g.tiempoExacto})`, MARGIN + 4, ctx.y + 4.5);

      doc.setTextColor(DARK_SLATE);
      doc.text(g.goleador, MARGIN + 32, ctx.y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(MUTED_TEXT);
      doc.text(g.equipoNombre.toUpperCase(), PAGE_W - MARGIN - 4, ctx.y + 4.5, { align: 'right' });

      // Línea 2: Detalles
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(MUTED_TEXT);
      const det1 = `Asistencia: ${g.asistente || 'Sin asistencia'}  |  Zona: ${g.zona}  |  Carril: ${g.carril}`;
      const det2 = `Tipo: ${g.tipoJugada}  |  Situación: ${g.situacionPrevia}  |  Contraataque: ${g.contraataque ? 'Sí' : 'No'}`;
      doc.text(det1, MARGIN + 4, ctx.y + 8.2);
      doc.text(det2, MARGIN + 4, ctx.y + 11.5);

      ctx.y += 15.5;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: TIROS Y REMATES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '2. Tiros y remates');

  const tL = data.tiros.local;
  const tA = data.tiros.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, tL.totalIntentos, 'Intentos totales', tA.totalIntentos, true);
  renderComparisonRow(ctx, tL.rematesSinGol, 'Remates sin gol', tA.rematesSinGol, false);
  renderComparisonRow(ctx, tL.goles, 'Goles marcados', tA.goles, true);
  renderComparisonRow(ctx, `${tL.aPuerta} (${tL.pctPuerta})`, 'Tiros a puerta (parados + goles)', `${tA.aPuerta} (${tA.pctPuerta})`, false);
  renderComparisonRow(ctx, tL.parados, 'Parados por el portero', tA.parados, true);
  renderComparisonRow(ctx, `${tL.fuera} (${tL.pctFuera})`, 'Remates fuera', `${tA.fuera} (${tA.pctFuera})`, false);
  renderComparisonRow(ctx, tL.bloqueados, 'Bloqueados por la defensa', tA.bloqueados, true);
  renderComparisonRow(ctx, tL.alPalo, 'Al palo / travesaño', tA.alPalo, false);
  renderComparisonRow(ctx, tL.dentroArea, 'Desde dentro del área', tA.dentroArea, true);
  renderComparisonRow(ctx, tL.fueraArea, 'Desde fuera del área', tA.fueraArea, false);
  renderComparisonRow(ctx, tL.contraataques, 'Desde contraataque', tA.contraataques, true);

  // Distribución por carril
  ensureSpace(ctx, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`DISTRIBUCIÓN DE TIROS POR CARRIL:`, MARGIN, ctx.y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(`${c.local.nombre}: Izq ${tL.carriles.izquierda} (${tL.carriles.pctIzq}) | Centro ${tL.carriles.centro} (${tL.carriles.pctCentro}) | Der ${tL.carriles.derecha} (${tL.carriles.pctDer})`, MARGIN, ctx.y + 6.5);
  doc.text(`${c.visitante.nombre}: Izq ${tA.carriles.izquierda} (${tA.carriles.pctIzq}) | Centro ${tA.carriles.centro} (${tA.carriles.pctCentro}) | Der ${tA.carriles.derecha} (${tA.carriles.pctDer})`, MARGIN, ctx.y + 9.5);
  ctx.y += 12;

  // Cronología detallada de tiros
  if (data.tiros.cronologia.length > 0) {
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`DETALLE INDIVIDUAL DE TODOS LOS TIROS (${data.tiros.cronologia.length}):`, MARGIN, ctx.y + 2);
    ctx.y += 4.5;

    data.tiros.cronologia.forEach((s, idx) => {
      ensureSpace(ctx, 4.5);
      if (idx % 2 === 0) {
        doc.setFillColor('#F8FAFC');
        doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4.2, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(s.esLocal ? RED : '#2563EB');
      doc.text(`${s.minutoFutbolistico}`, MARGIN + 2, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_SLATE);
      doc.text(`${s.equipoNombre.slice(0, 16)}`, MARGIN + 14, ctx.y);
      doc.text(`${s.jugador.slice(0, 24)}`, MARGIN + 50, ctx.y);
      doc.text(`${s.zona}`, MARGIN + 100, ctx.y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(s.resultadoBadge === 'Gol' ? '#16A34A' : s.resultadoBadge === 'Remate parado' ? '#2563EB' : DARK_SLATE);
      doc.text(`${s.resultadoBadge}`, MARGIN + 140, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED_TEXT);
      doc.text(`${s.contraataque}`, PAGE_W - MARGIN - 2, ctx.y, { align: 'right' });

      ctx.y += 4.2;
    });
    ctx.y += 4;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CENTROS AL ÁREA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '3. Centros al área');

  const cL = data.centros.local;
  const cA = data.centros.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, cL.total, 'Centros totales', cA.total, true);
  renderComparisonRow(ctx, cL.altos, 'Centros altos', cA.altos, false);
  renderComparisonRow(ctx, cL.bajos, 'Centros bajos', cA.bajos, true);
  renderComparisonRow(ctx, cL.derecha, 'Desde banda derecha', cA.derecha, false);
  renderComparisonRow(ctx, cL.izquierda, 'Desde banda izquierda', cA.izquierda, true);
  renderComparisonRow(ctx, cL.conRemate, 'Terminan en remate', cA.conRemate, false);
  renderComparisonRow(ctx, cL.sinOcasion, 'Sin ocasión registrada', cA.sinOcasion, true);
  renderComparisonRow(ctx, cL.contraataques, 'Desde contraataque', cA.contraataques, false);

  if (data.centros.cronologia.length > 0) {
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`DETALLE DE CENTROS AL ÁREA (${data.centros.cronologia.length}):`, MARGIN, ctx.y + 2);
    ctx.y += 4.5;

    data.centros.cronologia.forEach((cr, idx) => {
      ensureSpace(ctx, 4.5);
      if (idx % 2 === 0) {
        doc.setFillColor('#F8FAFC');
        doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4.2, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(cr.esLocal ? RED : '#2563EB');
      doc.text(`${cr.minutoFutbolistico}`, MARGIN + 2, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_SLATE);
      doc.text(`${cr.equipoNombre.slice(0, 16)}`, MARGIN + 14, ctx.y);
      doc.text(`${cr.jugador.slice(0, 24)}`, MARGIN + 50, ctx.y);
      doc.text(`${cr.banda} · ${cr.tipo}`, MARGIN + 105, ctx.y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cr.resultado.includes('remate') ? '#16A34A' : MUTED_TEXT);
      doc.text(`${cr.resultado}`, PAGE_W - MARGIN - 2, ctx.y, { align: 'right' });

      ctx.y += 4.2;
    });
    ctx.y += 4;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: CÓRNERES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '4. Córneres');

  const kL = data.corneres.local;
  const kA = data.corneres.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, kL.total, 'Córneres totales', kA.total, true);
  renderComparisonRow(ctx, kL.derecha, 'Desde la derecha', kA.derecha, false);
  renderComparisonRow(ctx, kL.izquierda, 'Desde la izquierda', kA.izquierda, true);
  renderComparisonRow(ctx, kL.gol, 'Terminan en gol', kA.gol, false);
  renderComparisonRow(ctx, kL.remate, 'Terminan en otro remate', kA.remate, true);
  renderComparisonRow(ctx, kL.sinOcasion, 'Sin ocasión generada', kA.sinOcasion, false);

  if (data.corneres.cronologia.length > 0) {
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`DETALLE DE CÓRNERES (${data.corneres.cronologia.length}):`, MARGIN, ctx.y + 2);
    ctx.y += 4.5;

    data.corneres.cronologia.forEach((k, idx) => {
      ensureSpace(ctx, 4.5);
      if (idx % 2 === 0) {
        doc.setFillColor('#F8FAFC');
        doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4.2, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(k.esLocal ? RED : '#2563EB');
      doc.text(`${k.minutoFutbolistico}`, MARGIN + 2, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_SLATE);
      doc.text(`${k.equipoNombre.slice(0, 16)}`, MARGIN + 14, ctx.y);
      doc.text(`${k.lanzador.slice(0, 24)}`, MARGIN + 50, ctx.y);
      doc.text(`${k.lado} · ${k.trayectoria} · ${k.zona}`, MARGIN + 105, ctx.y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(k.resultado === 'Gol' ? '#16A34A' : k.resultado.includes('remate') ? '#2563EB' : MUTED_TEXT);
      doc.text(`${k.resultado}`, PAGE_W - MARGIN - 2, ctx.y, { align: 'right' });

      ctx.y += 4.2;
    });
    ctx.y += 4;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: GOLPES FRANCOS ANALIZADOS
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '5. Golpes francos analizados');

  const fL = data.faltas.local;
  const fA = data.faltas.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, fL.total, 'Golpes francos analizados', fA.total, true);
  renderComparisonRow(ctx, fL.centros, 'Ejecutados mediante centro', fA.centros, false);
  renderComparisonRow(ctx, fL.tiros, 'Ejecutados con tiro directo', fA.tiros, true);
  renderComparisonRow(ctx, fL.pases, 'Ejecutados mediante pase', fA.pases, false);

  if (data.faltas.cronologia.length > 0) {
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`DETALLE DE GOLPES FRANCOS (${data.faltas.cronologia.length}):`, MARGIN, ctx.y + 2);
    ctx.y += 4.5;

    data.faltas.cronologia.forEach((f, idx) => {
      ensureSpace(ctx, 4.5);
      if (idx % 2 === 0) {
        doc.setFillColor('#F8FAFC');
        doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4.2, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_TINY);
      doc.setTextColor(f.esLocal ? RED : '#2563EB');
      doc.text(`${f.minutoFutbolistico}`, MARGIN + 2, ctx.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_SLATE);
      doc.text(`${f.equipoNombre.slice(0, 16)}`, MARGIN + 14, ctx.y);
      doc.text(`${f.lanzador.slice(0, 24)}`, MARGIN + 50, ctx.y);
      doc.text(`${f.ejecucion} · ${f.zona}`, MARGIN + 105, ctx.y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(f.resultado === 'Gol' ? '#16A34A' : MUTED_TEXT);
      doc.text(`${f.resultado}`, PAGE_W - MARGIN - 2, ctx.y, { align: 'right' });

      ctx.y += 4.2;
    });
    ctx.y += 4;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: SAQUES DE PUERTA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '6. Saques de puerta');

  const gL = data.saquesPuerta.local;
  const gA = data.saquesPuerta.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, gL.total, 'Saques de puerta totales', gA.total, true);
  renderComparisonRow(ctx, `${gL.cortos} (${gL.pctCortos})`, 'Cortos en salida de balón', `${gA.cortos} (${gA.pctCortos})`, false);
  renderComparisonRow(ctx, `${gL.medios} (${gL.pctMedios})`, 'Medios', `${gA.medios} (${gA.pctMedios})`, true);
  renderComparisonRow(ctx, `${gL.largos} (${gL.pctLargos})`, 'Largos / envío directo', `${gA.largos} (${gA.pctLargos})`, false);
  ctx.y += 4;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: SAQUES DE BANDA
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '7. Saques de banda');

  const bL = data.saquesBanda.local;
  const bA = data.saquesBanda.visitante;

  renderComparisonHeader(ctx, c.local.nombre, c.visitante.nombre);
  renderComparisonRow(ctx, bL.total, 'Saques de banda totales', bA.total, true);
  renderComparisonRow(ctx, `${bL.campoPropio} (${bL.pctPropio})`, 'En campo propio', `${bA.campoPropio} (${bA.pctPropio})`, false);
  renderComparisonRow(ctx, `${bL.campoRival} (${bL.pctRival})`, 'En campo rival', `${bA.campoRival} (${bA.pctRival})`, true);
  renderComparisonRow(ctx, bL.generaCentro, 'Generan un centro directo', bA.generaCentro, false);
  renderComparisonRow(ctx, bL.sinOcasion, 'Sin ocasión registrada', bA.sinOcasion, true);
  ctx.y += 4;

  // ═════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 8: FORMACIONES TÁCTICAS Y ALINEACIONES
  // ═════════════════════════════════════════════════════════════════════════════
  renderSectionHeader(ctx, '8. Formaciones tácticas y alineaciones');

  const formHome = data.formaciones.local;
  const formAway = data.formaciones.visitante;

  // Local
  ensureSpace(ctx, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(RED);
  doc.text(`${c.local.nombre.toUpperCase()} — SISTEMA: ${formHome.ofensiva.sistemaOfensivo}`, MARGIN, ctx.y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Sistema defensivo: ${formHome.defensiva.sistemaOfensivo} · Transición: ${formHome.transicion.hayCambioEstructural ? formHome.transicion.cambiosPosicion.join(', ') : 'Misma estructura'}`, MARGIN, ctx.y + 6);
  ctx.y += 8.5;

  formHome.ofensiva.jugadores.forEach((pl, idx) => {
    ensureSpace(ctx, 4.2);
    if (idx % 2 === 0) {
      doc.setFillColor('#F8FAFC');
      doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`Dorsal ${pl.dorsal}`, MARGIN + 4, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.text(pl.nombreCompleto, MARGIN + 28, ctx.y);
    doc.setTextColor(MUTED_TEXT);
    doc.text(`${pl.posicionEsp} (${pl.posicionCodigo})`, PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });
    ctx.y += 4;
  });
  ctx.y += 6;

  // Visitante
  ensureSpace(ctx, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor('#2563EB');
  doc.text(`${c.visitante.nombre.toUpperCase()} — SISTEMA: ${formAway.ofensiva.sistemaOfensivo}`, MARGIN, ctx.y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Sistema defensivo: ${formAway.defensiva.sistemaOfensivo} · Transición: ${formAway.transicion.hayCambioEstructural ? formAway.transicion.cambiosPosicion.join(', ') : 'Misma estructura'}`, MARGIN, ctx.y + 6);
  ctx.y += 8.5;

  formAway.ofensiva.jugadores.forEach((pl, idx) => {
    ensureSpace(ctx, 4.2);
    if (idx % 2 === 0) {
      doc.setFillColor('#F8FAFC');
      doc.rect(MARGIN, ctx.y - 2.8, COL_W, 4, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ_TINY);
    doc.setTextColor(DARK_SLATE);
    doc.text(`Dorsal ${pl.dorsal}`, MARGIN + 4, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.text(pl.nombreCompleto, MARGIN + 28, ctx.y);
    doc.setTextColor(MUTED_TEXT);
    doc.text(`${pl.posicionEsp} (${pl.posicionCodigo})`, PAGE_W - MARGIN - 4, ctx.y, { align: 'right' });
    ctx.y += 4;
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // NUMERACIÓN DE PÁGINAS Y GUARDADO FINAL
  // ═════════════════════════════════════════════════════════════════════════════
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(doc, p, totalPages, matchTitle, matchDate);
  }

  const cleanFilename = `DieLigen_${c.jornada}_${c.local.nombre}_vs_${c.visitante.nombre}.pdf`
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_');

  doc.save(cleanFilename);
}
