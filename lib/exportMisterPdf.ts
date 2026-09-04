/**
 * lib/exportMisterPdf.ts
 *
 * PDF MÍSTER — Módulo de exportación aislado para Pizarra Táctica.
 *
 * Principios:
 *  - jsPDF puro (sin html2canvas): el contenido es 100% texto estructurado.
 *  - A4 portrait (210 × 297 mm), fondo blanco, tipografía negra.
 *  - Rojo (#CC0E21) únicamente como acento visual (cabeceras de sección).
 *  - Sin límite artificial de páginas: salto automático cuando se agota el espacio.
 *  - Solo imprime secciones con contenido real.
 *  - No llama a ninguna API ni IA durante la exportación.
 *
 * Archivo NUEVO. No modifica ningún archivo existente del proyecto.
 */

import jsPDF from 'jspdf';
import { GameModelAnalysis, Observation, TacticalRoleCard, Player, PositionNode } from '@/types';

// ─── Constantes de diseño ─────────────────────────────────────────────────────

const RED       = '#CC0E21';
const BLACK     = '#0F172A';
const MUTED     = '#475569';
const LIGHT     = '#94A3B8';
const BG_WHITE  = '#FFFFFF';

// A4 portrait
const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 14;
const COL_W     = PAGE_W - MARGIN * 2;

// Tipografías / tamaños
const SZ_TITLE      = 18;
const SZ_SUBTITLE   = 11;
const SZ_SECTION    = 9.5;
const SZ_BODY       = 8.5;
const SZ_SMALL      = 7.5;
const SZ_TINY       = 6.5;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MisterPdfConfig {
  /** Datos del partido */
  jornada?: number | string;
  rival?: string;
  fecha?: string;
  esLocal?: boolean;
  tipoPartido?: string;

  /** Sistemas */
  sistemaPropio: string;
  sistemaRival: string;

  /** Nombre pizarra / notas entrenador */
  lineupName?: string;
  lineupNotes?: string;

  /** Análisis táctico estructural (Analista Táctico) */
  ventajas?: string;
  desventajas?: string;
  zonaConflicto?: string;
  dueloClave?: string;
  tareasLineas?: string;

  /** Análisis Modelo de Juego Indautxu */
  analisisModeloJuego?: GameModelAnalysis;

  /** Once inicial (para instrucciones nominales) */
  nodesPropio?: PositionNode[];
  players?: Player[];

  /** Fichas de rol configuradas */
  roleCards?: TacticalRoleCard[];

  /** Observaciones de scouting aprobadas */
  approvedObservations?: Observation[];
  sourcesLabels?: string[];
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Quita asteriscos, almohadillas y backticks Markdown residuales */
function clean(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`/g, '')
    .trim();
}

/** Devuelve true si el string tiene contenido útil tras limpiar */
function hasContent(text?: string | null): boolean {
  return clean(text).length > 3;
}

/** Divide un texto en líneas wrapeadas respetando anchoMax (mm) */
function wrapLines(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

/** Divide un texto en puntos breves (separador: punto+espacio, nueva línea, guión) */
function toBullets(text: string): string[] {
  const raw = clean(text);
  if (!raw) return [];
  // Dividir por: nueva línea, o '. ' antes de mayúscula, o ' - ', o '; '
  const parts = raw
    .split(/\n|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])|(?:\.\s{2,})|(?:;\s+)/)
    .map(p => p.trim())
    .filter(p => p.length > 3);
  return parts;
}

// ─── Motor de renderizado ─────────────────────────────────────────────────────

interface RenderCtx {
  doc: jsPDF;
  y: number;      // cursor Y actual en mm
}

/**
 * Comprueba si quedan menos de `needed` mm en la página.
 * Si no, añade nueva página y reinicia el cursor.
 */
function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > PAGE_H - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 4;
  }
}

/** Dibuja la barra roja de acento superior */
function drawAccentBar(doc: jsPDF): void {
  doc.setFillColor(RED);
  doc.rect(0, 0, PAGE_W, 2.5, 'F');
}

/** Cabecera de sección (etiqueta roja + línea divisora) */
function renderSectionHeader(ctx: RenderCtx, title: string): void {
  ensureSpace(ctx, 10);
  const { doc } = ctx;

  // Línea roja izquierda (acento)
  doc.setFillColor(RED);
  doc.rect(MARGIN, ctx.y - 0.5, 2.5, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SECTION);
  doc.setTextColor(RED);
  doc.text(title.toUpperCase(), MARGIN + 4, ctx.y + 4);
  ctx.y += 7;

  // Línea divisora gris suave
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 3;
}

/** Texto de cuerpo normal (negro) */
function renderBodyText(ctx: RenderCtx, text: string, italic = false): void {
  if (!hasContent(text)) return;
  const { doc } = ctx;
  doc.setFont('helvetica', italic ? 'italic' : 'normal');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(BLACK);
  const lines = wrapLines(doc, clean(text), COL_W, SZ_BODY);
  lines.forEach(line => {
    ensureSpace(ctx, 4.5);
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 4.2;
  });
  ctx.y += 1;
}

/** Punto de lista con viñeta (•) */
function renderBullet(ctx: RenderCtx, text: string, indent = 0): void {
  if (!hasContent(text)) return;
  const { doc } = ctx;
  const xBullet = MARGIN + indent;
  const xText   = xBullet + 4;
  const maxW    = COL_W - indent - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(BLACK);

  const lines = wrapLines(doc, clean(text), maxW, SZ_BODY);
  lines.forEach((line, i) => {
    ensureSpace(ctx, 4.5);
    if (i === 0) {
      doc.setTextColor(RED);
      doc.text('•', xBullet, ctx.y);
      doc.setTextColor(BLACK);
    }
    doc.text(line, xText, ctx.y);
    ctx.y += 4.2;
  });
}

/** Lista de bullets automática a partir de un texto largo */
function renderBulletsFromText(ctx: RenderCtx, text: string): void {
  const bullets = toBullets(text);
  if (bullets.length === 0) return;
  // Si hay un solo elemento corto, renderizar como texto normal
  if (bullets.length === 1 && bullets[0].length < 80) {
    renderBodyText(ctx, bullets[0]);
    return;
  }
  bullets.forEach(b => renderBullet(ctx, b));
}

/** Mini-etiqueta de posición (badge) + instrucción */
function renderRoleLine(ctx: RenderCtx, badge: string, label: string, text: string): void {
  if (!hasContent(text)) return;
  const { doc } = ctx;

  ensureSpace(ctx, 6);

  // Badge rojo
  const badgeW = doc.getTextWidth(badge) + 4;
  doc.setFillColor(RED);
  doc.roundedRect(MARGIN, ctx.y - 3.2, badgeW, 4.5, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(BG_WHITE);
  doc.text(badge, MARGIN + 2, ctx.y);

  // Label + texto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(BLACK);
  doc.text(label, MARGIN + badgeW + 2, ctx.y);

  ctx.y += 4.5;

  const lines = wrapLines(doc, clean(text), COL_W - 6, SZ_BODY);
  lines.forEach(line => {
    ensureSpace(ctx, 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED);
    doc.text(line, MARGIN + 6, ctx.y);
    ctx.y += 4.2;
  });
  ctx.y += 1;
}

/** Pie de página (número de página + crédito) */
function renderFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_TINY);
  doc.setTextColor(LIGHT);
  doc.text(`Generado: ${dateStr}`, MARGIN, PAGE_H - 5);
  doc.text(
    `Athletic Club Indautxu · Temporada 26/27 · Pág. ${pageNum} / ${totalPages}`,
    PAGE_W - MARGIN,
    PAGE_H - 5,
    { align: 'right' }
  );
  // Línea de pie
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_H - 7.5, PAGE_W - MARGIN, PAGE_H - 7.5);
}

// ─── Función principal de exportación ────────────────────────────────────────

export async function exportMisterToPDF(config: MisterPdfConfig): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  const ctx: RenderCtx = { doc, y: MARGIN + 4 };

  const gm = config.analisisModeloJuego || {};

  // ── PÁGINA 1: CABECERA ────────────────────────────────────────────────────

  drawAccentBar(doc);

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_TITLE);
  doc.setTextColor(BLACK);
  doc.text('INFORME DE PARTIDO', MARGIN, ctx.y + 4);

  // Etiqueta roja "PDF MÍSTER" a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SMALL);
  doc.setTextColor(RED);
  doc.text('PDF MÍSTER', PAGE_W - MARGIN, ctx.y + 4, { align: 'right' });

  ctx.y += 10;

  // Línea divisora principal
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 5;

  // Datos del partido
  const partidoStr = config.rival
    ? `${config.esLocal ? 'vs' : '@'} ${config.rival.toUpperCase()}`
    : 'Sin partido vinculado';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ_SUBTITLE + 1);
  doc.setTextColor(BLACK);
  doc.text(partidoStr, MARGIN, ctx.y);
  ctx.y += 6;

  // Metadatos en línea (jornada, fecha, tipo)
  const metaParts: string[] = [];
  if (config.jornada) metaParts.push(`Jornada ${config.jornada}`);
  if (config.fecha)   metaParts.push(config.fecha);
  if (config.tipoPartido) metaParts.push(config.tipoPartido);

  if (metaParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_BODY);
    doc.setTextColor(MUTED);
    doc.text(metaParts.join('  ·  '), MARGIN, ctx.y);
    ctx.y += 5;
  }

  // Sistemas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ_BODY);
  doc.setTextColor(MUTED);
  doc.text('Nuestro sistema:', MARGIN, ctx.y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text(config.sistemaPropio, MARGIN + 30, ctx.y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  doc.text('Sistema rival:', MARGIN + 65, ctx.y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text(config.sistemaRival, MARGIN + 90, ctx.y);
  ctx.y += 6;

  // Nombre de la pizarra (si existe)
  if (hasContent(config.lineupName)) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(MUTED);
    doc.text(`Pizarra: ${config.lineupName}`, MARGIN, ctx.y);
    ctx.y += 5;
  }

  // Notas del entrenador (si existen)
  if (hasContent(config.lineupNotes)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SZ_SMALL);
    doc.setTextColor(MUTED);
    const notasLines = wrapLines(doc, `Notas previas: ${clean(config.lineupNotes)}`, COL_W, SZ_SMALL);
    notasLines.slice(0, 3).forEach(line => {
      doc.text(line, MARGIN, ctx.y);
      ctx.y += 3.8;
    });
    ctx.y += 1;
  }

  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 6;

  // ── SECCIÓN: RESUMEN TÁCTICO ──────────────────────────────────────────────

  if (hasContent(config.zonaConflicto) || hasContent(config.dueloClave)) {
    renderSectionHeader(ctx, 'Resumen Táctico');

    if (hasContent(config.zonaConflicto)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(BLACK);
      ensureSpace(ctx, 5);
      doc.text('Zona de conflicto:', MARGIN, ctx.y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(RED);
      const zc = clean(config.zonaConflicto);
      const zcShort = zc.length > 80 ? zc.substring(0, 80) + '…' : zc;
      doc.text(zcShort, MARGIN + 33, ctx.y);
      ctx.y += 5;
    }

    if (hasContent(config.dueloClave)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_BODY);
      doc.setTextColor(BLACK);
      ensureSpace(ctx, 5);
      doc.text('Duelo clave:', MARGIN, ctx.y);
      ctx.y += 5;
      renderBulletsFromText(ctx, config.dueloClave || '');
    }
    ctx.y += 2;
  }

  // ── SECCIÓN: VENTAJAS ─────────────────────────────────────────────────────

  if (hasContent(config.ventajas)) {
    renderSectionHeader(ctx, 'Ventajas Tácticas');
    renderBulletsFromText(ctx, config.ventajas || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: RIESGOS / DESVENTAJAS ───────────────────────────────────────

  if (hasContent(config.desventajas) || hasContent(gm.riesgosAsumidos)) {
    renderSectionHeader(ctx, 'Riesgos y Desventajas');
    if (hasContent(config.desventajas)) {
      renderBulletsFromText(ctx, config.desventajas || '');
    }
    if (hasContent(gm.riesgosAsumidos)) {
      // Evitar duplicar si el texto es muy similar
      const rA = clean(config.desventajas);
      const rB = clean(gm.riesgosAsumidos);
      if (!rA || (rB && !rB.startsWith(rA.substring(0, 40)))) {
        renderBulletsFromText(ctx, rB);
      }
    }
    ctx.y += 2;
  }

  // ── SECCIÓN: CON BALÓN ────────────────────────────────────────────────────

  const planAtaque = hasContent(gm.planAtaque) ? gm.planAtaque : gm.ataque_posicional;
  if (hasContent(planAtaque)) {
    renderSectionHeader(ctx, 'Con Balón — Plan de Ataque y Progresión');
    renderBulletsFromText(ctx, planAtaque || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: SIN BALÓN ────────────────────────────────────────────────────

  const planDefensivo = hasContent(gm.planDefensivo) ? gm.planDefensivo : gm.defensa_posicional;
  if (hasContent(planDefensivo)) {
    renderSectionHeader(ctx, 'Sin Balón — Plan Defensivo y Presión');
    renderBulletsFromText(ctx, planDefensivo || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: TRANSICIÓN OFENSIVA (Defensa→Ataque) ────────────────────────

  const transAtaque = hasContent(gm.transicionDefensaAtaque)
    ? gm.transicionDefensaAtaque
    : gm.transicion_recuperacion;
  if (hasContent(transAtaque)) {
    renderSectionHeader(ctx, 'Transición Ofensiva — Tras Recuperación');
    renderBulletsFromText(ctx, transAtaque || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: TRANSICIÓN DEFENSIVA (Ataque→Defensa) ───────────────────────

  const transDefensa = hasContent(gm.transicionAtaqueDefensa)
    ? gm.transicionAtaqueDefensa
    : gm.transicion_perdida;
  if (hasContent(transDefensa)) {
    renderSectionHeader(ctx, 'Transición Defensiva — Tras Pérdida');
    renderBulletsFromText(ctx, transDefensa || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: AJUSTES ESPECÍFICOS DEL MÍSTER ──────────────────────────────

  const ajustesMister = hasContent(gm.ajustesMister) ? gm.ajustesMister : gm.ajustes_especificos;
  if (hasContent(ajustesMister)) {
    renderSectionHeader(ctx, 'Ajustes Específicos del Míster');
    renderBulletsFromText(ctx, ajustesMister || '');
    ctx.y += 2;
  }

  // ── SECCIÓN: INSTRUCCIONES POR LÍNEAS (tareasLineas del Analista) ─────────

  if (hasContent(config.tareasLineas)) {
    renderSectionHeader(ctx, 'Instrucciones por Líneas');
    const lines = (config.tareasLineas || '').split('\n').map(l => l.trim()).filter(l => l.length > 2);
    lines.forEach(line => {
      // Detectar si es un header de línea (Defensa:, Medios:, etc.)
      if (/^(Portería|Portero|Defensa|Medios|Mediocampo|Delantera|Delanteros|Mediapunta):/i.test(line)) {
        ensureSpace(ctx, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(BLACK);
        doc.text(line, MARGIN, ctx.y);
        ctx.y += 5;
      } else {
        renderBullet(ctx, line);
      }
    });
    ctx.y += 2;
  }

  // ── SECCIÓN: INSTRUCCIONES INDIVIDUALES POR PUESTO (Modelo de Juego) ─────

  const roles = gm.instruccionesPorPuesto;
  if (roles) {
    const ROLE_MAP: { key: keyof typeof roles; badge: string; label: string }[] = [
      { key: 'portero',           badge: 'POR', label: 'Portero' },
      { key: 'centralIzquierdo',  badge: 'DCI', label: 'Central Izquierdo' },
      { key: 'centralDerecho',    badge: 'DCD', label: 'Central Derecho' },
      { key: 'lateralIzquierdo',  badge: 'LI',  label: 'Lateral Izquierdo' },
      { key: 'lateralDerecho',    badge: 'LD',  label: 'Lateral Derecho' },
      { key: 'pivoteDefensivo',   badge: 'MCD', label: 'Pivote Defensivo' },
      { key: 'pivoteOfensivo',    badge: 'MC',  label: 'Pivote Ofensivo' },
      { key: 'mediapunta',        badge: 'MCO', label: 'Mediapunta' },
      { key: 'extremoIzquierdo',  badge: 'EI',  label: 'Extremo Izquierdo' },
      { key: 'extremoDerecho',    badge: 'ED',  label: 'Extremo Derecho' },
      { key: 'delantero',         badge: 'DC',  label: 'Delantero Centro' },
    ];

    // Filtrar solo los que tienen contenido real
    const rolesWithContent = ROLE_MAP.filter(r => hasContent(roles[r.key]));

    if (rolesWithContent.length > 0) {
      renderSectionHeader(ctx, 'Instrucciones Individuales — 11 Roles');

      // Correlacionar con jugador asignado si disponemos del once inicial
      const nodesByLabel = new Map<string, PositionNode>();
      if (config.nodesPropio) {
        config.nodesPropio.forEach(n => nodesByLabel.set(n.label, n));
      }

      const labelToBadge: Record<string, string> = {
        POR: 'portero', LD: 'lateralDerecho', LI: 'lateralIzquierdo',
        DFC: 'centralIzquierdo', DCI: 'centralIzquierdo', DCD: 'centralDerecho',
        MCD: 'pivoteDefensivo', MC: 'pivoteOfensivo', MCO: 'mediapunta',
        ED: 'extremoDerecho', EI: 'extremoIzquierdo', DC: 'delantero',
        SD: 'delantero'
      };

      rolesWithContent.forEach(r => {
        const text = clean(roles[r.key]);

        // Buscar jugador asignado a este puesto
        let playerName = '';
        if (config.nodesPropio && config.players) {
          // Mapear badge de rol a etiqueta de pizarra
          const pizarraLabel = Object.entries(labelToBadge).find(([, v]) => v === r.key)?.[0];
          const node = pizarraLabel ? nodesByLabel.get(pizarraLabel) : undefined;
          if (node?.player_id) {
            const p = config.players.find(pl => pl.id === node.player_id);
            if (p) playerName = ` (${p.nombre} ${p.apellidos} · D${p.dorsal})`;
          }
        }

        renderRoleLine(ctx, r.badge, `${r.label}${playerName}`, text);
      });
      ctx.y += 2;
    }
  }

  // ── SECCIÓN: FICHAS DE ROL (si existen y son distintas del Modelo de Juego) ─

  if (config.roleCards && config.roleCards.length > 0) {
    const hasRoleCardContent = config.roleCards.some(rc =>
      hasContent(rc.fase_ofensiva) || hasContent(rc.fase_defensiva) ||
      hasContent(rc.transiciones) || hasContent(rc.instrucciones_especificas)
    );

    if (hasRoleCardContent) {
      renderSectionHeader(ctx, 'Fichas de Rol — Posiciones Configuradas');

      config.roleCards.forEach(rc => {
        if (!hasContent(rc.fase_ofensiva) && !hasContent(rc.fase_defensiva) &&
            !hasContent(rc.transiciones) && !hasContent(rc.instrucciones_especificas)) return;

        ensureSpace(ctx, 8);
        // Cabecera de posición
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(SZ_BODY);
        doc.setTextColor(RED);
        doc.text(`[${rc.posicion_label}] ${rc.linea}`, MARGIN, ctx.y);
        ctx.y += 5;

        if (hasContent(rc.fase_ofensiva)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_SMALL);
          doc.setTextColor(MUTED);
          ensureSpace(ctx, 4);
          doc.text('Ofensiva:', MARGIN + 4, ctx.y);
          ctx.y += 4;
          renderBodyText(ctx, rc.fase_ofensiva || '');
        }
        if (hasContent(rc.fase_defensiva)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_SMALL);
          doc.setTextColor(MUTED);
          ensureSpace(ctx, 4);
          doc.text('Defensiva:', MARGIN + 4, ctx.y);
          ctx.y += 4;
          renderBodyText(ctx, rc.fase_defensiva || '');
        }
        if (hasContent(rc.transiciones)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_SMALL);
          doc.setTextColor(MUTED);
          ensureSpace(ctx, 4);
          doc.text('Transiciones:', MARGIN + 4, ctx.y);
          ctx.y += 4;
          renderBodyText(ctx, rc.transiciones || '');
        }
        if (hasContent(rc.instrucciones_especificas)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(SZ_SMALL);
          doc.setTextColor(MUTED);
          ensureSpace(ctx, 4);
          doc.text('Específicas:', MARGIN + 4, ctx.y);
          ctx.y += 4;
          renderBodyText(ctx, rc.instrucciones_especificas || '');
        }
        ctx.y += 1;
      });
      ctx.y += 2;
    }
  }

  // ── SECCIÓN: ALERTAS DEL RIVAL (Observaciones aprobadas de scouting) ──────

  if (config.approvedObservations && config.approvedObservations.length > 0) {
    // Separar alertas normales de sugerencias IA
    const alertas = config.approvedObservations.filter(o => !o.esPropuestaAnalista);
    const sugerenciasIA = config.approvedObservations.filter(o => o.esPropuestaAnalista);

    if (alertas.length > 0) {
      renderSectionHeader(ctx, 'Alertas del Rival — Scouting Validado');
      alertas.forEach(obs => {
        if (!hasContent(obs.contenido)) return;
        const prioLabel = obs.prioridad === 'clave' ? '⚑ ' : '';
        const catLabel = obs.categoria ? `[${obs.categoria}] ` : '';
        renderBullet(ctx, `${prioLabel}${catLabel}${clean(obs.contenido)}`);
      });
      ctx.y += 2;
    }

    // ── SECCIÓN: SUGERENCIAS IA (claramente diferenciadas) ────────────────

    if (sugerenciasIA.length > 0) {
      renderSectionHeader(ctx, 'Sugerencias IA — Propuestas del Analista');

      // Aviso diferenciador
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(SZ_SMALL);
      doc.setTextColor(MUTED);
      ensureSpace(ctx, 5);
      doc.text(
        'Las siguientes son propuestas del análisis IA, no observaciones confirmadas del rival.',
        MARGIN,
        ctx.y
      );
      ctx.y += 5;

      sugerenciasIA.forEach(obs => {
        if (!hasContent(obs.contenido)) return;
        renderBullet(ctx, `[IA] ${clean(obs.contenido)}`);
      });
      ctx.y += 2;
    }
  }

  // ── SECCIÓN: FUENTES Y PRINCIPIOS UTILIZADOS ──────────────────────────────

  const fuentes = gm.fuentesUtilizadas ?? [];
  const principios = gm.principiosIndautxuAplicados ?? [];
  const extraLabels = config.sourcesLabels ?? [];

  const todasFuentes = Array.from(new Set([...fuentes, ...extraLabels])).filter(f => f && f.trim().length > 0);

  if (todasFuentes.length > 0 || principios.length > 0) {
    renderSectionHeader(ctx, 'Fuentes y Principios Aplicados');

    if (todasFuentes.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SMALL);
      doc.setTextColor(MUTED);
      ensureSpace(ctx, 4);
      doc.text('Fuentes del análisis:', MARGIN, ctx.y);
      ctx.y += 4;
      todasFuentes.forEach(f => renderBullet(ctx, f, 4));
    }

    if (principios.length > 0) {
      ctx.y += 1;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SZ_SMALL);
      doc.setTextColor(MUTED);
      ensureSpace(ctx, 4);
      doc.text('Principios Indautxu aplicados:', MARGIN, ctx.y);
      ctx.y += 4;
      principios.forEach(p => renderBullet(ctx, p, 4));
    }
    ctx.y += 2;
  }

  // ── SECCIÓN: NOTAS DEL MÍSTER ─────────────────────────────────────────────

  // Asegurar que la sección de Notas tenga suficiente espacio; si no, nueva página
  ensureSpace(ctx, 55);

  renderSectionHeader(ctx, 'Notas del Míster');

  // Líneas de escritura (al menos 8 líneas)
  const lineHeight = 7.5;
  const linesCount = Math.max(8, Math.floor((PAGE_H - MARGIN - ctx.y - 10) / lineHeight));
  doc.setDrawColor(LIGHT);
  doc.setLineWidth(0.25);
  for (let i = 0; i < linesCount; i++) {
    ensureSpace(ctx, lineHeight);
    doc.line(MARGIN, ctx.y + lineHeight - 1, PAGE_W - MARGIN, ctx.y + lineHeight - 1);
    ctx.y += lineHeight;
  }

  // ── PIES DE PÁGINA ────────────────────────────────────────────────────────

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(doc, p, totalPages);
  }

  // ── GUARDAR ───────────────────────────────────────────────────────────────

  const filename = buildMisterFilename(config);
  doc.save(filename);
}

// ─── Helpers de nombre de archivo ─────────────────────────────────────────────

function sanitizeFilename(str: string): string {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildMisterFilename(config: Pick<MisterPdfConfig, 'jornada' | 'rival' | 'lineupName'>): string {
  const parts: string[] = [];
  if (config.jornada)   parts.push(`J${config.jornada}`);
  if (config.rival)     parts.push(sanitizeFilename(config.rival));
  parts.push('Informe_Mister');
  return parts.join('_') + '.pdf';
}
