/**
 * lib/exportPdf.ts
 * Shared PDF export engine for Pizarra Táctica and Estrategia ABP.
 *
 * Strategy:
 *  - jsPDF renders all text (header, metadata, notes, legend) natively → max quality
 *  - html2canvas captures only the field DOM element at scale 3× → ~216 DPI on A4
 *  - No dependency on screenshots of the full page
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TacticaExportConfig {
  mode: 'tactica';
  fieldElementId: string;    // DOM id of the field container to capture
  filename: string;          // e.g. "J31_SD_Eibar_Once_Inicial.pdf"
  lineupName: string;
  partido: string;           // e.g. "Jornada 31 vs SD EIBAR" or "Sin partido vinculado"
  sistemaPropio: string;
  sistemaRival: string;
  notas: string;
}

export interface ABPExportConfig {
  mode: 'abp';
  fieldElementId: string;
  filename: string;
  playName: string;
  tipoABP: string;
  instrucciones: string;
  leyenda: Record<string, string>; // abbr → full name, e.g. { LAN: 'Lanzador', ... }
}

export type ExportConfig = TacticaExportConfig | ABPExportConfig;

// ─── Constants ────────────────────────────────────────────────────────────────

const RED = '#CC0E21';
const WHITE = '#FFFFFF';
const DARK = '#1E1E2E';
const GRAY = '#94A3B8';
const LIGHT_GRAY = '#334155';

// A4 landscape in mm
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawDivider(doc: jsPDF, y: number): void {
  doc.setDrawColor(LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export async function exportToPDF(config: ExportConfig): Promise<void> {
  // 1. Capture field element with html2canvas at 3× scale
  const fieldEl = document.getElementById(config.fieldElementId);
  if (!fieldEl) {
    console.error(`[exportPdf] Element not found: #${config.fieldElementId}`);
    return;
  }

  // Temporarily hide interactive controls inside the field (edit handles, selects)
  const noExportEls = fieldEl.querySelectorAll<HTMLElement>('.no-export');
  noExportEls.forEach(el => { el.style.visibility = 'hidden'; });

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(fieldEl, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#3b8c5a', // lighter grass green for print
      logging: false,
    });
  } finally {
    noExportEls.forEach(el => { el.style.visibility = ''; });
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // 2. Create jsPDF document A4 landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  // ── Background ──
  doc.setFillColor(DARK);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── Red accent bar top ──
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  let cursorY = 8;

  if (config.mode === 'tactica') {
    // ── Logo / Title ──
    doc.setTextColor(WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PIZARRA TÁCTICA', MARGIN, cursorY);

    doc.setFontSize(10);
    doc.setTextColor(RED);
    doc.text('indautxu_26_27', PAGE_W - MARGIN, cursorY, { align: 'right' });

    cursorY += 5;
    drawDivider(doc, cursorY);
    cursorY += 5;

    // ── Alineación name ──
    doc.setFontSize(13);
    doc.setTextColor(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(config.lineupName || 'Alineación sin nombre', MARGIN, cursorY);
    cursorY += 6;

    // ── Partido ──
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    doc.text('Partido:', MARGIN, cursorY);
    doc.setTextColor(WHITE);
    doc.text(config.partido, MARGIN + 18, cursorY);
    cursorY += 5;

    // ── Sistemas ──
    doc.setTextColor(GRAY);
    doc.text('Nuestro sistema:', MARGIN, cursorY);
    doc.setTextColor(WHITE);
    doc.text(config.sistemaPropio, MARGIN + 30, cursorY);

    doc.setTextColor(GRAY);
    doc.text('Sistema rival:', MARGIN + 75, cursorY);
    doc.setTextColor(WHITE);
    doc.text(config.sistemaRival, MARGIN + 103, cursorY);
    cursorY += 5;

    // ── Notas ──
    if (config.notas && config.notas.trim()) {
      doc.setTextColor(GRAY);
      doc.text('Notas:', MARGIN, cursorY);
      doc.setTextColor(WHITE);
      doc.setFontSize(7.5);
      const notasLines = wrapText(doc, config.notas.trim(), PAGE_W / 2 - MARGIN - 20, 7.5);
      const notasToShow = notasLines.slice(0, 3); // max 3 lines
      notasToShow.forEach((line) => {
        doc.text(line, MARGIN + 15, cursorY);
        cursorY += 3.5;
      });
    }

    drawDivider(doc, cursorY);
    cursorY += 4;

    // ── Field image — centered in the page ──
    const availableW = PAGE_W - 2 * MARGIN;
    const availableH = PAGE_H - cursorY - MARGIN;
    const fieldAspect = canvas.width / canvas.height; 
    
    let fieldW = availableW;
    let fieldH = fieldW / fieldAspect;
    
    if (fieldH > availableH) {
      fieldH = availableH;
      fieldW = fieldH * fieldAspect;
    }

    // Center the field image on the page
    const fieldX = (PAGE_W - fieldW) / 2;
    doc.addImage(imgData, 'JPEG', fieldX, cursorY, fieldW, fieldH);

    // ── Footer ──
    doc.setFontSize(6);
    doc.setTextColor(GRAY);
    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Generado: ${dateStr}`, MARGIN, PAGE_H - 4);
    doc.text('Athletic Club Indautxu · Temporada 26/27', PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });

  } else {
    // ── ABP Mode ──
    doc.setTextColor(WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTRATEGIA ABP', MARGIN, cursorY);

    doc.setFontSize(10);
    doc.setTextColor(RED);
    doc.text('indautxu_26_27', PAGE_W - MARGIN, cursorY, { align: 'right' });

    cursorY += 5;
    drawDivider(doc, cursorY);
    cursorY += 5;

    doc.setFontSize(13);
    doc.setTextColor(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(config.playName || 'Jugada sin nombre', MARGIN, cursorY);
    cursorY += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    doc.text('Tipo ABP:', MARGIN, cursorY);
    doc.setTextColor(WHITE);
    doc.text(config.tipoABP, MARGIN + 18, cursorY);
    cursorY += 5;

    if (config.instrucciones && config.instrucciones.trim()) {
      doc.setTextColor(GRAY);
      doc.text('Instrucciones:', MARGIN, cursorY);
      doc.setTextColor(WHITE);
      doc.setFontSize(7.5);
      const lines = wrapText(doc, config.instrucciones.trim(), PAGE_W / 2 - MARGIN - 20, 7.5);
      lines.slice(0, 3).forEach((line) => {
        doc.text(line, MARGIN + 26, cursorY);
        cursorY += 3.5;
      });
    }

    drawDivider(doc, cursorY);
    cursorY += 4;

    // Field image
    const availableH = PAGE_H - cursorY - MARGIN - 20; // leave space for legend
    const fieldAspect = canvas.width / canvas.height; // approx 4:3 → 1.33
    const fieldH = Math.min(availableH, 110);
    const fieldW = fieldH * fieldAspect;
    const fieldX = (PAGE_W - fieldW) / 2;
    doc.addImage(imgData, 'JPEG', fieldX, cursorY, fieldW, fieldH);

    // Legend
    const legendY = cursorY + fieldH + 5;
    const legendEntries = Object.entries(config.leyenda);
    const colW = (PAGE_W - MARGIN * 2) / Math.min(legendEntries.length, 8);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RED);
    doc.text('LEYENDA:', MARGIN, legendY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    legendEntries.slice(0, 8).forEach(([abbr, full], i) => {
      const lx = MARGIN + 20 + i * colW;
      doc.setTextColor(WHITE);
      doc.text(abbr, lx, legendY);
      doc.setTextColor(GRAY);
      doc.text(`=${full}`, lx + doc.getTextWidth(abbr) + 0.5, legendY);
    });

    // Second legend row if needed
    if (legendEntries.length > 8) {
      const row2Y = legendY + 4;
      legendEntries.slice(8, 16).forEach(([abbr, full], i) => {
        const lx = MARGIN + 20 + i * colW;
        doc.setTextColor(WHITE);
        doc.text(abbr, lx, row2Y);
        doc.setTextColor(GRAY);
        doc.text(`=${full}`, lx + doc.getTextWidth(abbr) + 0.5, row2Y);
      });
    }

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(GRAY);
    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Generado: ${dateStr}`, MARGIN, PAGE_H - 4);
    doc.text('Athletic Club Indautxu · Temporada 26/27', PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });
  }

  // 3. Save
  doc.save(config.filename);
}

// ─── Filename helpers ─────────────────────────────────────────────────────────

/** Sanitizes a string for use in a filename */
function sanitize(str: string): string {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Builds a filename for a Pizarra Táctica PDF.
 * E.g.: J31_SD_Eibar_Once_Inicial.pdf
 */
export function buildTacticaFilename(opts: {
  jornada?: number | string;
  rival?: string;
  lineupName: string;
}): string {
  const parts: string[] = [];
  if (opts.jornada) parts.push(`J${opts.jornada}`);
  if (opts.rival) parts.push(sanitize(opts.rival));
  parts.push(sanitize(opts.lineupName) || 'Pizarra');
  return parts.join('_') + '.pdf';
}

export function buildABPFilename(opts: {
  tipoABP: string;
  playName: string;
}): string {
  return 'ABP_' + sanitize(opts.tipoABP) + '_' + sanitize(opts.playName) + '.pdf';
}

// ─── Multi-page ABP Plan Export ───────────────────────────────────────────────

export interface ABPPlanExportConfig {
  filename: string;
  matchInfo: {
    jornada: number | string;
    rival: string;
    fecha: string;
    competicion: string;
    equipo: string;
  };
  plays: Array<{
    fieldElementId: string;
    playName: string;
    tipoABP: string;
    instrucciones: string;
  }>;
}

export async function exportABPPlanToPDF(config: ABPPlanExportConfig): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  if (config.plays.length === 0) {
    console.warn('No hay jugadas para exportar');
    return;
  }

  // Guardar posición de scroll original
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;

  try {
    for (let i = 0; i < config.plays.length; i++) {
      const play = config.plays[i];
      
      if (i > 0) doc.addPage();

      const fieldEl = document.getElementById(play.fieldElementId);
      if (!fieldEl) {
        console.warn(`Elemento no encontrado: ${play.fieldElementId}`);
        continue;
      }

      // Asegurar que el elemento está en el viewport para que html2canvas lo dibuje completo y no salga en blanco
      fieldEl.scrollIntoView({ block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const noExportEls = fieldEl.querySelectorAll<HTMLElement>('.no-export');
      noExportEls.forEach(el => { el.style.visibility = 'hidden'; });

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(fieldEl, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#3b8c5a',
          logging: false,
        });
      } finally {
        noExportEls.forEach(el => { el.style.visibility = ''; });
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Fondo
    doc.setFillColor(DARK);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    // --- CABECERA ---
    const headerH = 20;
    const infoPanelW = 55; // Reducido de 104mm (35%) a 55mm para que el campo de juego sea casi el tamaño A4
    const fieldW = PAGE_W - infoPanelW - MARGIN * 3; // 297 - 55 - 36 = 206mm
    const maxFieldW = 210;
    const finalFieldW = Math.min(fieldW, maxFieldW);
    const scale = finalFieldW / canvas.width;
    const finalFieldH = canvas.height * scale; // 206 * 0.75 = 154.5mm

    const topY = MARGIN + headerH + 5;
    
    // Título Principal (Match Info)
    doc.setTextColor(WHITE);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = config.matchInfo.jornada === 'draft' 
       ? 'PLAN ABP - BORRADOR' 
       : `PLAN ABP - JORNADA ${config.matchInfo.jornada} VS ${config.matchInfo.rival.toUpperCase()}`;
    doc.text(title, MARGIN, MARGIN + 6);

    // Subtítulo Match
    doc.setFontSize(9);
    doc.setTextColor(GRAY);
    doc.setFont('helvetica', 'normal');
    let subTitle = `${config.matchInfo.equipo}`;
    if (config.matchInfo.jornada !== 'draft') {
        subTitle += ` | ${config.matchInfo.competicion} | ${config.matchInfo.fecha}`;
    }
    doc.text(subTitle, MARGIN, MARGIN + 12);

    // Page indicator
    doc.setFontSize(9);
    doc.setTextColor(RED);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jugada ${i + 1} de ${config.plays.length}`, PAGE_W - MARGIN, MARGIN + 6, { align: 'right' });

    drawDivider(doc, MARGIN + headerH);

    // --- CAMPO ---
    const fieldX = PAGE_W - MARGIN - finalFieldW;
    doc.setDrawColor(LIGHT_GRAY);
    doc.setLineWidth(0.5);
    doc.rect(fieldX, topY, finalFieldW, finalFieldH);
    doc.addImage(imgData, 'JPEG', fieldX, topY, finalFieldW, finalFieldH);

    // --- PANEL IZQUIERDO (Info de la jugada) ---
    let textY = topY + 4;
    
    // Título de la jugada
    doc.setTextColor(RED);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE ABP', MARGIN, textY);
    textY += 6;
    doc.setTextColor(WHITE);
    doc.setFontSize(12);
    doc.text(play.tipoABP.toUpperCase(), MARGIN, textY);

    textY += 12;
    doc.setTextColor(RED);
    doc.setFontSize(10);
    doc.text('NOMBRE DE JUGADA', MARGIN, textY);
    textY += 6;
    doc.setTextColor(WHITE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const wrapPlayName = wrapText(doc, play.playName || 'Sin título', infoPanelW, 11);
    doc.text(wrapPlayName, MARGIN, textY);
    textY += wrapPlayName.length * 5 + 8;

    // Instrucciones
    doc.setTextColor(RED);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUCCIONES', MARGIN, textY);
    textY += 6;
    
    doc.setTextColor(GRAY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const obs = play.instrucciones || 'Sin instrucciones adicionales.';
    const wrapObs = wrapText(doc, obs, infoPanelW, 9);
    doc.text(wrapObs, MARGIN, textY);
    
    // --- PIE DE PÁGINA ---
    doc.setFontSize(6);
    doc.setTextColor(GRAY);
    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Generado: ${dateStr}`, MARGIN, PAGE_H - 4);
    doc.text('Athletic Club Indautxu · Temporada 26/27', PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });
  }

  doc.save(config.filename);
  } finally {
    // Restablecer posición de scroll original
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
