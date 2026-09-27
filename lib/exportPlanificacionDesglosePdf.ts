import jsPDF from 'jspdf';
import type { PdfAnalysisResult, PdfTaskDraft, GrupoJugadores } from '@/app/api/planificacion/analyze-pdf/route';

export interface ExportPlanificacionDesglosePdfOptions {
  fecha: string; // YYYY-MM-DD
  tituloSesion?: string | null;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  result: PdfAnalysisResult;
  action?: 'download' | 'preview'; // 'download' por defecto, 'preview' abre en nueva pestaña
}

// ─── CONSTANTES GEOMÉTRICAS Y DE COLOR (A4) ───────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colores corporativos SD Indautxu / Athletic IA
const RED: [number, number, number] = [204, 14, 33];         // #CC0E21
const DARK_SLATE: [number, number, number] = [15, 23, 42];   // #0F172A
const SLATE_TXT: [number, number, number] = [51, 65, 85];    // #334155
const SLATE_MUTED: [number, number, number] = [100, 116, 139]; // #64748B
const LIGHT_BG: [number, number, number] = [248, 250, 252];  // #F8FAFC
const BORDER_COLOR: [number, number, number] = [226, 232, 240]; // #E2E8F0
const GREEN_ACCENT: [number, number, number] = [16, 149, 106]; // #10956A
const AMBER_ACCENT: [number, number, number] = [180, 83, 9];   // #B45309

// ─── HELPERS DE TEXTO Y LIMPIEZA ──────────────────────────────────────────────
/** Limpia caracteres especiales o emojis no soportados por fuentes nativas jsPDF */
function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[^\x00-\x7F\xC0-\xFF]/g, (char) => {
      // Reemplazos específicos comunes
      if (char === '•' || char === '●' || char === '▪') return '-';
      if (char === '·') return '-';
      if (char === '—' || char === '–') return '-';
      if (char === '’' || char === '‘') return "'";
      if (char === '“' || char === '”') return '"';
      return ' ';
    })
    .trim();
}

/** Devuelve el texto o "No detectado" si está vacío */
function formatDetectedValue(val: string | number | null | undefined, fallback = 'No detectado'): string {
  if (val === null || val === undefined || String(val).trim() === '') {
    return fallback;
  }
  return cleanText(String(val));
}

// ─── CONTEXTO DE RENDERIZADO ──────────────────────────────────────────────────
interface RenderCtx {
  doc: jsPDF;
  y: number;
}

function ensureSpace(ctx: RenderCtx, neededMm: number): void {
  if (ctx.y + neededMm > PAGE_H - MARGIN - 12) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 4;
  }
}

/** Dibuja la barra superior corporativa */
function drawTopBar(doc: jsPDF): void {
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 3, 'F');
}

/** Renderiza el pie de página en todas las páginas */
function renderAllFooters(doc: jsPDF, fecha: string): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Barra superior en todas las páginas
    drawTopBar(doc);

    // Línea separadora de pie
    const footerY = PAGE_H - MARGIN + 4;
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, footerY, PAGE_W - MARGIN, footerY);

    // Texto de pie
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(
      `Athletic IA · SD Indautxu Juvenil DH 26/27 | Sesión ${fecha} | Desglose generado desde PDF original`,
      MARGIN,
      footerY + 4
    );

    const pageStr = `Pág. ${i} / ${totalPages}`;
    doc.text(pageStr, PAGE_W - MARGIN - doc.getTextWidth(pageStr), footerY + 4);
  }
}

// ─── COMPONENTES VISUALES ─────────────────────────────────────────────────────

/** Cabecera principal del documento */
function renderMainHeader(
  ctx: RenderCtx,
  fecha: string,
  tituloSesion: string | null | undefined,
  pdfUrl?: string | null,
  numTareas = 0
): void {
  const { doc } = ctx;

  // Subtítulo superior
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text('SD INDAUTXU 1924 · CUADERNO DE ENTRENAMIENTO 2026/27', MARGIN, ctx.y);
  ctx.y += 4.5;

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...DARK_SLATE);
  const displayTitle = tituloSesion ? cleanText(tituloSesion) : `SESIÓN DE ENTRENAMIENTO - ${fecha}`;
  doc.text(displayTitle, MARGIN, ctx.y);
  ctx.y += 6;

  // Tarjeta de metadatos de sesión
  const cardY = ctx.y;
  const cardH = 18;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, cardY, CONTENT_W, cardH, 2, 2, 'FD');

  // Borde rojo izquierdo decorativo
  doc.setFillColor(...RED);
  doc.rect(MARGIN, cardY, 2.5, cardH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_TXT);

  // Columna 1: Fecha y Tareas
  doc.text(`FECHA DE SESIÓN:`, MARGIN + 5, cardY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(fecha, MARGIN + 35, cardY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`TAREAS DETECTADAS:`, MARGIN + 5, cardY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${numTareas} ejercicios estructurados`, MARGIN + 38, cardY + 11.5);

  // Columna 2: Referencia PDF de Aitor
  doc.setFont('helvetica', 'bold');
  doc.text(`DOCUMENTO ORIGINAL (AITOR):`, MARGIN + 90, cardY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const originalRef = pdfUrl ? cleanText(pdfUrl) : 'Asociado en la sesión de Planificación';
  const wrappedUrl = doc.splitTextToSize(originalRef, 90);
  doc.text(wrappedUrl[0] || 'Asociado', MARGIN + 90, cardY + 10);
  if (wrappedUrl.length > 1) {
    doc.text(wrappedUrl[1], MARGIN + 90, cardY + 13.5);
  }

  ctx.y = cardY + cardH + 6;
}

/** Sección de Grupos Globales de Portada */
function renderGlobalGroups(ctx: RenderCtx, grupos: GrupoJugadores[]): void {
  const { doc } = ctx;

  ensureSpace(ctx, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text('GRUPOS GLOBALES DE JUGADORES (PORTADA)', MARGIN, ctx.y);
  ctx.y += 3;

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 3.5;

  if (!grupos || grupos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_MUTED);
    doc.text('No se detectaron asignaciones globales de grupos en la portada del PDF original.', MARGIN, ctx.y);
    ctx.y += 6;
    return;
  }

  grupos.forEach((grupo) => {
    const cleanNombre = cleanText(grupo.nombre).toUpperCase() || 'GRUPO';
    const cleanJugadores = (grupo.jugadores || []).map(j => cleanText(j)).join(' - ');
    const displayJugadores = cleanJugadores || 'Sin jugadores especificados';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const splitPlayers = doc.splitTextToSize(displayJugadores, CONTENT_W - 8);
    const boxH = Math.max(10, 6 + splitPlayers.length * 3.5);

    ensureSpace(ctx, boxH + 2);

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(MARGIN, ctx.y, CONTENT_W, boxH, 1.5, 1.5, 'FD');

    // Nombre de grupo
    doc.setTextColor(...DARK_SLATE);
    doc.text(cleanNombre, MARGIN + 3, ctx.y + 4.5);

    // Jugadores
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_TXT);
    let playerY = ctx.y + 8;
    splitPlayers.forEach((line: string) => {
      doc.text(line, MARGIN + 3, playerY);
      playerY += 3.5;
    });

    ctx.y += boxH + 2.5;
  });

  ctx.y += 2;
}

/** Renderiza una fila de campo con etiqueta y valor */
function renderFieldRow(
  ctx: RenderCtx,
  label: string,
  value: string | string[] | null | undefined,
  confianza?: string,
  isBulletList = false
): void {
  const { doc } = ctx;
  const isNoDetectado =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  ensureSpace(ctx, 9);

  // Etiqueta + indicador de confianza
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_MUTED);
  doc.text(label.toUpperCase(), MARGIN + 2, ctx.y);

  if (confianza && !isNoDetectado) {
    const confLabel = confianza === 'alta' ? '[Detectado]' : confianza === 'media' ? '[Interpretado]' : '[Sugerido IA]';
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(confianza === 'alta' ? GREEN_ACCENT[0] : RED[0], confianza === 'alta' ? GREEN_ACCENT[1] : RED[1], confianza === 'alta' ? GREEN_ACCENT[2] : RED[2]);
    doc.text(confLabel, MARGIN + 2 + doc.getTextWidth(label.toUpperCase()) + 2, ctx.y);
  }

  ctx.y += 3.8;

  if (isNoDetectado) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text('No detectado', MARGIN + 2, ctx.y);
    ctx.y += 4.5;
    return;
  }

  if (isBulletList && Array.isArray(value)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_SLATE);

    value.forEach((item) => {
      const cleanItem = cleanText(item);
      const lines = doc.splitTextToSize(`- ${cleanItem}`, CONTENT_W - 6);
      ensureSpace(ctx, lines.length * 3.5);
      lines.forEach((line: string) => {
        doc.text(line, MARGIN + 4, ctx.y);
        ctx.y += 3.4;
      });
    });
    ctx.y += 1.5;
    return;
  }

  // Texto estándar multilínea
  const rawText = Array.isArray(value) ? value.join(', ') : String(value);
  const cleanStr = cleanText(rawText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_SLATE);

  const lines = doc.splitTextToSize(cleanStr, CONTENT_W - 4);
  lines.forEach((line: string) => {
    ensureSpace(ctx, 3.8);
    doc.text(line, MARGIN + 2, ctx.y);
    ctx.y += 3.5;
  });

  ctx.y += 1.5;
}

/** Renderiza una tarea completa */
function renderTaskCard(ctx: RenderCtx, tarea: PdfTaskDraft): void {
  const { doc } = ctx;

  ensureSpace(ctx, 25);

  const numTarea = tarea.numero_tarea || 1;
  const nombreTarea = formatDetectedValue(tarea.nombre.valor, `Tarea ${numTarea}`);
  const tipoTarea = formatDetectedValue(tarea.tipo_tarea.valor, 'Tipo no detectado');
  const paginaPdf = tarea.pagina_pdf?.valor ? `Pág. ${tarea.pagina_pdf.valor}` : 'Pág. N/A';

  // Barra de cabecera de tarea
  const headerY = ctx.y;
  const headerH = 7.5;
  doc.setFillColor(...DARK_SLATE);
  doc.roundedRect(MARGIN, headerY, CONTENT_W, headerH, 1.5, 1.5, 'F');

  // Acento rojo izquierdo
  doc.setFillColor(...RED);
  doc.rect(MARGIN, headerY, 3, headerH, 'F');

  // Título de tarea
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`TAREA ${numTarea} · ${nombreTarea.toUpperCase()}`, MARGIN + 5, headerY + 5.2);

  // Chips derechos (Tipo y Página)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const rightTag = `${tipoTarea} | ${paginaPdf}`;
  const rightTagW = doc.getTextWidth(rightTag);
  doc.text(rightTag, PAGE_W - MARGIN - rightTagW - 2, headerY + 5.2);

  ctx.y = headerY + headerH + 3.5;

  // Fila resumen de métricas clave (Duración / Jugadores / Espacio)
  const duracion = formatDetectedValue(tarea.duracion_minutos.valor);
  const jugadores = formatDetectedValue(tarea.num_jugadores.valor);
  const espacio = formatDetectedValue(tarea.espacio.valor);

  const metricsY = ctx.y;
  const metricsH = 7;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, metricsY, CONTENT_W, metricsH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_MUTED);

  const colW = CONTENT_W / 3;
  // Duración
  doc.text('DURACIÓN:', MARGIN + 3, metricsY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_SLATE);
  doc.text(duracion, MARGIN + 20, metricsY + 4.5);

  // Jugadores
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_MUTED);
  doc.text('JUGADORES:', MARGIN + colW + 3, metricsY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_SLATE);
  doc.text(jugadores, MARGIN + colW + 22, metricsY + 4.5);

  // Espacio
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_MUTED);
  doc.text('ESPACIO:', MARGIN + colW * 2 + 3, metricsY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_SLATE);
  doc.text(espacio, MARGIN + colW * 2 + 18, metricsY + 4.5);

  ctx.y = metricsY + metricsH + 4;

  // Campos detallados obligatorios
  renderFieldRow(ctx, 'Objetivo', tarea.objetivo.valor, tarea.objetivo.confianza);
  renderFieldRow(ctx, 'Organización', tarea.organizacion.valor, tarea.organizacion.confianza);
  renderFieldRow(ctx, 'Desarrollo', tarea.desarrollo.valor, tarea.desarrollo.confianza);

  // Consignas y reglas
  renderFieldRow(ctx, 'Consignas / Reglas de Provocación', tarea.consignas.valor, tarea.consignas.confianza, true);

  // Transiciones
  const tieneTransiciones =
    (tarea.transicion_tras_recuperacion.valor && tarea.transicion_tras_recuperacion.valor.trim() !== '') ||
    (tarea.transicion_tras_perdida.valor && tarea.transicion_tras_perdida.valor.trim() !== '');

  if (tieneTransiciones) {
    if (tarea.transicion_tras_recuperacion.valor) {
      renderFieldRow(
        ctx,
        'Transición Tras Recuperación',
        tarea.transicion_tras_recuperacion.valor,
        tarea.transicion_tras_recuperacion.confianza
      );
    }
    if (tarea.transicion_tras_perdida.valor) {
      renderFieldRow(
        ctx,
        'Transición Tras Pérdida',
        tarea.transicion_tras_perdida.valor,
        tarea.transicion_tras_perdida.confianza
      );
    }
  } else {
    renderFieldRow(ctx, 'Transiciones', null, 'no_detectado');
  }

  // Conceptos tácticos sugeridos (siempre identificados explícitamente como sugerencias)
  if (tarea.conceptos_sugeridos?.valor && tarea.conceptos_sugeridos.valor.length > 0) {
    ensureSpace(ctx, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...AMBER_ACCENT);
    doc.text('CONCEPTOS TÁCTICOS SUGERIDOS (SUGERENCIA AUTOMÁTICA IA - NO VALIDADA):', MARGIN + 2, ctx.y);
    ctx.y += 3.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_SLATE);
    const conceptosStr = tarea.conceptos_sugeridos.valor.map(c => cleanText(c)).join(' · ');
    const lines = doc.splitTextToSize(conceptosStr, CONTENT_W - 4);
    lines.forEach((line: string) => {
      ensureSpace(ctx, 3.8);
      doc.text(line, MARGIN + 4, ctx.y);
      ctx.y += 3.5;
    });
    ctx.y += 2;
  }

  // Separador suave entre tareas
  ctx.y += 2;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 5;
}

// ─── FUNCIÓN PRINCIPAL DE EXPORTACIÓN ─────────────────────────────────────────

/**
 * Genera el documento PDF con el desglose estructurado completo y
 * ejecuta la descarga directa en el navegador o abre una previsualización en pestaña nueva.
 */
export function exportPlanificacionDesglosePdf(options: ExportPlanificacionDesglosePdfOptions): jsPDF {
  const { fecha, tituloSesion, pdfUrl, result, action = 'download' } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const ctx: RenderCtx = {
    doc,
    y: MARGIN + 4,
  };

  // 1. Barra superior
  drawTopBar(doc);

  // 2. Cabecera principal y metadatos
  renderMainHeader(ctx, fecha, tituloSesion || result.titulo_sesion, pdfUrl, result.num_tareas_detectadas || result.tareas?.length || 0);

  // 3. Grupos globales de portada
  renderGlobalGroups(ctx, result.grupos_globales || []);

  // 4. Encabezado de la lista de tareas
  ensureSpace(ctx, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text(`DESGLOSE ESTRUCTURADO TAREA A TAREA (${result.tareas?.length || 0})`, MARGIN, ctx.y);
  ctx.y += 3.5;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 5;

  // 5. Tareas ordenadas
  if (result.tareas && result.tareas.length > 0) {
    result.tareas.forEach((tarea) => {
      renderTaskCard(ctx, tarea);
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text('No se detectaron tareas individuales en el PDF.', MARGIN, ctx.y);
    ctx.y += 6;
  }

  // 6. Pie de página en todas las páginas generadas
  renderAllFooters(doc, fecha);

  // 7. Nombre canónico del archivo: YYYY-MM-DD - Desglose Athletic IA.pdf
  const fileName = `${fecha} - Desglose Athletic IA.pdf`;

  if (action === 'preview') {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } else {
    doc.save(fileName);
  }

  return doc;
}
