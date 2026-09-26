'use client';

import React, { useState, useEffect } from 'react';
import {
  X, BookOpen, AlertTriangle, CheckCircle2, Zap, Sparkles, HelpCircle,
  Target, Users, Clock, Maximize2, List, Shuffle, ArrowRight, Plus, Check,
  FileText, Link2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStaffPasskey } from '@/lib/passkey';
import { useEditMode } from '@/context/EditModeContext';
import type { PlanningTaskLibrary } from '@/types';
import type { PdfTaskDraft, FieldConfianza } from '@/app/api/planificacion/analyze-pdf/route';
import { detectDuplicate, LibraryDuplicateAlert, DuplicateMatch } from './LibraryDuplicateAlert';

// ──────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE CONCEPTOS (espejo del que existe en PlanificacionClient)
// ──────────────────────────────────────────────────────────────────────────────
const CONCEPTOS_TACTICOS = {
  'ATAQUE': ['Ataque Organizado', 'Ataque Rápido / Contraataque', 'Salida de Balón', 'Progresión en el Juego', 'Finalización'],
  'DEFENSA': ['Defensa Organizada', 'Presión tras Pérdida', 'Presión Alta', 'Defensa de Centros', 'Basculaciones'],
  'TRANSICIONES': ['Transición Ofensiva', 'Transición Defensiva', 'Reorganización Defensiva'],
  'ABP': ['Córner Ofensivo', 'Córner Defensivo', 'Falta Ofensiva', 'Falta Defensiva', 'Penaltis', 'Saques de Banda'],
  'CONDICIONAL': ['Fuerza', 'Resistencia', 'Velocidad', 'Recuperación'],
  'MENTAL': ['Cohesión Grupal', 'Charla Táctica', 'Concentración'],
} as const;

type CategoriaConcepto = keyof typeof CONCEPTOS_TACTICOS;

const TIPOS_TAREA = [
  'Calentamiento', 'Rondo', 'Posesión', 'Finalización', 'ABP', 'Técnica',
  'Táctica', 'Físico', 'Partido condicionado', 'Juego Aéreo', 'Recuperación',
];

interface ConceptoAprobado {
  categoria: CategoriaConcepto;
  concepto: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// MINI BADGE DE CONFIANZA
// ──────────────────────────────────────────────────────────────────────────────
function MiniConfBadge({ confianza }: { confianza: FieldConfianza }) {
  if (confianza === 'alta') return (
    <span className="inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <CheckCircle2 className="h-2 w-2" />Detectado
    </span>
  );
  if (confianza === 'media') return (
    <span className="inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25">
      <Zap className="h-2 w-2" />Interpretado
    </span>
  );
  if (confianza === 'baja') return (
    <span className="inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
      <Sparkles className="h-2 w-2" />Sugerido IA
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
      <HelpCircle className="h-2 w-2" />Revisión
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPER: label de campo con badge de confianza
// ──────────────────────────────────────────────────────────────────────────────
function FieldLabel({
  icon, label, confianza
}: { icon: React.ReactNode; label: string; confianza?: FieldConfianza }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {confianza && <MiniConfBadge confianza={confianza} />}
    </div>
  );
}

function parseUnambiguousInt(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Detecta únicamente números puros inequívocos (ej: "20", "20 min", "15'", "22", "22 jug")
  const match = trimmed.match(/^(\d+)(?:\s*(?:min|minutos|'|jug|jugadores|j))?$/i);
  if (match) {
    const val = parseInt(match[1], 10);
    return isNaN(val) ? '' : String(val);
  }
  // Si contiene series, rangos, grupos o texto explicativo, se deja en blanco para no falsear el número
  return '';
}

// ──────────────────────────────────────────────────────────────────────────────
// PROPS DEL MODAL
// ──────────────────────────────────────────────────────────────────────────────
interface TaskToLibraryModalProps {
  isOpen: boolean;
  tarea: PdfTaskDraft;
  pdfUrl: string;
  sessionId?: string;
  sessionDate?: string;       // YYYY-MM-DD
  totalTareasPdf?: number;    // total de tareas en el PDF
  onClose: () => void;
  onSaved: (libraryId: string) => void;
}

export function TaskToLibraryModal({
  isOpen,
  tarea,
  pdfUrl,
  sessionId,
  sessionDate,
  totalTareasPdf,
  onClose,
  onSaved,
}: TaskToLibraryModalProps) {
  // ── Estado del formulario ──
  const [nombre, setNombre] = useState('');
  const [tipoTarea, setTipoTarea] = useState('');
  const [minutos, setMinutos] = useState<string>('');
  const [jugadores, setJugadores] = useState<string>('');
  const [espacio, setEspacio] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [desarrollo, setDesarrollo] = useState('');
  const [descripcion, setDescripcion] = useState(''); // campo libre, no prerrellenado
  const [transicionRec, setTransicionRec] = useState('');
  const [transicionPerd, setTransicionPerd] = useState('');

  // Consignas: checkbox por ítem
  const [consignasItems, setConsignasItems] = useState<{ texto: string; activa: boolean }[]>([]);
  const [nuevaConsigna, setNuevaConsigna] = useState('');

  // Conceptos: aprobados uno a uno
  const [conceptosSugeridos, setConceptosSugeridos] = useState<
    { categoria: CategoriaConcepto | null; concepto: string; estado: 'pendiente' | 'aprobado' | 'rechazado' }[]
  >([]);
  const [manualConceptoCat, setManualConceptoCat] = useState<CategoriaConcepto>('ATAQUE');
  const [manualConceptoVal, setManualConceptoVal] = useState('');
  const [manualConceptosExtra, setManualConceptosExtra] = useState<ConceptoAprobado[]>([]);

  // Control UI
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);
  const [existingTasks, setExistingTasks] = useState<PlanningTaskLibrary[]>([]);
  const [viewingDuplicate, setViewingDuplicate] = useState<PlanningTaskLibrary | null>(null);

  const { currentUser } = useEditMode();

  // ── Prerellenar formulario desde la tarea PDF ──
  useEffect(() => {
    if (!isOpen) return;
    setNombre(tarea.nombre.valor ?? '');
    setTipoTarea(tarea.tipo_tarea.valor ?? '');
    // Solo rellenar numérico si el texto del PDF es inequívoco (sin series, rangos ni grupos)
    setMinutos(parseUnambiguousInt(tarea.duracion_minutos.valor));
    setJugadores(parseUnambiguousInt(tarea.num_jugadores.valor));
    setEspacio(tarea.espacio.valor ?? '');
    setObjetivo(tarea.objetivo.valor ?? '');
    setOrganizacion(tarea.organizacion.valor ?? '');
    setDesarrollo(tarea.desarrollo.valor ?? '');
    setDescripcion(''); // campo libre, siempre vacío al abrir
    setTransicionRec(tarea.transicion_tras_recuperacion.valor ?? '');
    setTransicionPerd(tarea.transicion_tras_perdida.valor ?? '');
    // Consignas: normalizar con robustez ante string[], string multilínea o texto
    let consignasArray: string[] = [];
    const val: unknown = tarea.consignas?.valor;
    if (Array.isArray(val)) {
      consignasArray = val.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof val === 'string' && val.trim().length > 0) {
      consignasArray = val
        .split(/\r?\n/)
        .map(s => s.replace(/^[-•*–—\d+.)\s]+/, '').trim())
        .filter(Boolean);
    }
    setConsignasItems(
      consignasArray.map(c => ({ texto: c, activa: true }))
    );
    setNuevaConsigna('');
    // Conceptos sugeridos
    const conceptos = (tarea.conceptos_sugeridos.valor ?? []).map(c => {
      // Inferir categoría desde el catálogo SOLO si hay coincidencia exacta (sin fallback a ATAQUE)
      let cat: CategoriaConcepto | null = null;
      const cNorm = c.trim().toLowerCase();
      for (const [k, vs] of Object.entries(CONCEPTOS_TACTICOS)) {
        if (vs.some(v => v.trim().toLowerCase() === cNorm)) {
          cat = k as CategoriaConcepto;
          break;
        }
      }
      return { categoria: cat, concepto: c, estado: 'pendiente' as const };
    });
    setConceptosSugeridos(conceptos);
    setManualConceptosExtra([]);
    setSaveError(null);
    setDuplicate(null);
    setIgnoreDuplicate(false);
    setViewingDuplicate(null);
  }, [isOpen, tarea]);

  // ── Cargar tareas existentes para detección de duplicados ──
  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('planning_task_library')
      .select('*')
      .or('aprobada.is.null,aprobada.eq.true')  // solo tareas activas
      .then(({ data }) => setExistingTasks((data ?? []) as PlanningTaskLibrary[]));
  }, [isOpen]);

  // ── Detección de duplicado en tiempo real ──
  useEffect(() => {
    if (!nombre || !tipoTarea) return;
    const min = parseInt(minutos) || 0;
    const match = detectDuplicate(nombre, tipoTarea, min, existingTasks);
    setDuplicate(match);
    setIgnoreDuplicate(false);
  }, [nombre, tipoTarea, minutos, existingTasks]);

  if (!isOpen) return null;

  // ── Conceptos finales a guardar ──
  const conceptosAprobados: ConceptoAprobado[] = [
    ...conceptosSugeridos
      .filter((c): c is typeof c & { categoria: CategoriaConcepto } => c.estado === 'aprobado' && c.categoria !== null)
      .map(c => ({ categoria: c.categoria, concepto: c.concepto })),
    ...manualConceptosExtra,
  ];

  const handleAddManualConcepto = () => {
    if (!manualConceptoVal.trim()) return;
    const already = conceptosAprobados.some(
      c => c.categoria === manualConceptoCat && c.concepto === manualConceptoVal.trim()
    );
    if (already) return;
    setManualConceptosExtra(prev => [...prev, { categoria: manualConceptoCat, concepto: manualConceptoVal.trim() }]);
    setManualConceptoVal('');
  };

  const handleSave = async () => {
    if (!nombre.trim()) { setSaveError('El nombre es obligatorio.'); return; }
    if (!tipoTarea.trim()) { setSaveError('El tipo de tarea es obligatorio.'); return; }
    if (duplicate && !ignoreDuplicate) {
      setSaveError('Hay un posible duplicado. Confirma que deseas guardar de todas formas.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const passkey = getStaffPasskey();
      if (passkey) headers['x-staff-passkey'] = passkey;

      const staffName = currentUser?.name?.trim() ? currentUser.name.trim() : 'Cuerpo Técnico';

      const parsedMin = parseInt(minutos, 10);
      const parsedJug = parseInt(jugadores, 10);

      const payload = {
        nombre: nombre.trim(),
        tipo_tarea: tipoTarea.trim(),
        creado_por: staffName,
        minutos_defecto: !isNaN(parsedMin) && parsedMin > 0 ? parsedMin : null,
        jugadores_defecto: !isNaN(parsedJug) && parsedJug > 0 ? parsedJug : null,
        duracion_texto_pdf: tarea.duracion_minutos.valor?.trim() || null,
        jugadores_texto_pdf: tarea.num_jugadores.valor?.trim() || null,
        pagina_pdf: tarea.pagina_pdf?.valor ?? null,
        espacio_defecto: espacio.trim() || null,
        objetivo: objetivo.trim() || null,
        descripcion: descripcion.trim() || '',
        organizacion: organizacion.trim() || null,
        desarrollo: desarrollo.trim() || null,
        consignas: consignasItems.filter(c => c.activa && c.texto.trim()).map(c => c.texto.trim()),
        transicion_rec: transicionRec.trim() || null,
        transicion_perd: transicionPerd.trim() || null,
        fuente_pdf_url: pdfUrl || null,
        sesion_origen_id: sessionId ?? null,
        numero_tarea_pdf: tarea.numero_tarea ?? null,
        confianza_global: (['alta', 'media', 'baja'] as const).find(
          c => c === tarea.nombre.confianza
        ) ?? null,
        conceptos_aprobados: conceptosAprobados,
      };

      const res = await fetch('/api/planificacion/library', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Error ${res.status}`);

      onSaved(data.id);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── RENDER ──
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#CC0E21]" />
            <div>
              <h3 className="text-sm font-black text-slate-100">Guardar en Biblioteca Táctica</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Borrador · Tarea {tarea.numero_tarea}{totalTareasPdf ? ` de ${totalTareasPdf}` : ''} · Revisión obligatoria
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Banner aviso */}
        <div className="px-5 py-2.5 bg-amber-500/5 border-b border-amber-500/10 shrink-0">
          <p className="text-[9px] text-amber-400/80 font-semibold">
            ⚠ Nada se guardará hasta que pulses &quot;Guardar como Borrador&quot;. Revisa y edita cada campo.
          </p>
        </div>

        {/* Scroll content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* IDENTIFICACIÓN */}
          <section className="space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">
              Identificación
            </h4>

            <div className="space-y-1">
              <FieldLabel icon={<FileText className="h-3 w-3"/>} label="Nombre *" confianza={tarea.nombre.valor ? tarea.nombre.confianza : 'no_detectado'} />
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FieldLabel icon={<List className="h-3 w-3"/>} label="Tipo *" confianza={tarea.tipo_tarea.valor ? tarea.tipo_tarea.confianza : 'no_detectado'} />
                <select
                  value={tipoTarea}
                  onChange={e => setTipoTarea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors"
                >
                  <option value="">-- Selecciona --</option>
                  {TIPOS_TAREA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <FieldLabel icon={<Clock className="h-3 w-3"/>} label="Duración (minutos)" confianza={tarea.duracion_minutos.valor ? tarea.duracion_minutos.confianza : 'no_detectado'} />
                <input
                  type="number"
                  value={minutos}
                  onChange={e => setMinutos(e.target.value)}
                  placeholder="ej: 20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors"
                />
                {tarea.duracion_minutos.valor && (
                  <p className="text-[9px] text-slate-500 font-mono truncate" title={tarea.duracion_minutos.valor}>
                    📄 PDF: &quot;{tarea.duracion_minutos.valor}&quot;
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FieldLabel icon={<Users className="h-3 w-3"/>} label="Jugadores (nº)" confianza={tarea.num_jugadores.valor ? tarea.num_jugadores.confianza : 'no_detectado'} />
                <input
                  type="number"
                  value={jugadores}
                  onChange={e => setJugadores(e.target.value)}
                  placeholder="ej: 22"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors"
                />
                {tarea.num_jugadores.valor && (
                  <p className="text-[9px] text-slate-500 font-mono truncate" title={tarea.num_jugadores.valor}>
                    📄 PDF: &quot;{tarea.num_jugadores.valor}&quot;
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <FieldLabel icon={<Maximize2 className="h-3 w-3"/>} label="Espacio" confianza={tarea.espacio.valor ? tarea.espacio.confianza : 'no_detectado'} />
                <input
                  type="text"
                  value={espacio}
                  onChange={e => setEspacio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors"
                />
              </div>
            </div>
          </section>

          {/* CONTENIDO TÁCTICO */}
          <section className="space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">
              Contenido táctico
            </h4>

            <div className="space-y-1">
              <FieldLabel icon={<Target className="h-3 w-3"/>} label="Objetivo *" confianza={tarea.objetivo.valor ? tarea.objetivo.confianza : 'no_detectado'} />
              <textarea
                value={objetivo}
                onChange={e => setObjetivo(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors resize-none"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel icon={<Users className="h-3 w-3"/>} label="Organización" confianza={tarea.organizacion.valor ? tarea.organizacion.confianza : 'no_detectado'} />
              <textarea
                value={organizacion}
                onChange={e => setOrganizacion(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors resize-none"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel icon={<List className="h-3 w-3"/>} label="Desarrollo (nuevo campo — prerellenado desde PDF)" confianza={tarea.desarrollo.valor ? tarea.desarrollo.confianza : 'no_detectado'} />
              <textarea
                value={desarrollo}
                onChange={e => setDesarrollo(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors resize-none"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel icon={<FileText className="h-3 w-3"/>} label="Descripción (campo libre — no prerellenado)" />
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Notas adicionales propias…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#CC0E21] transition-colors resize-none placeholder-slate-600"
              />
            </div>
          </section>

          {/* CONSIGNAS */}
          <section className="space-y-2">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>Consignas</span>
              <MiniConfBadge confianza={tarea.consignas?.valor ? tarea.consignas.confianza : 'no_detectado'} />
            </h4>
            {consignasItems.length > 0 ? (
              <>
                <p className="text-[9px] text-slate-500 italic">Desmarca las que no quieras conservar:</p>
                <div className="space-y-1.5">
                  {consignasItems.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={item.activa}
                        onChange={e => setConsignasItems(prev =>
                          prev.map((c, idx) => idx === i ? { ...c, activa: e.target.checked } : c)
                        )}
                        className="mt-0.5 shrink-0 accent-[#CC0E21]"
                      />
                      <span className={`text-[10px] leading-snug transition-colors ${
                        item.activa ? 'text-slate-300' : 'text-slate-600 line-through'
                      }`}>
                        {item.texto}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-slate-600 italic">Sin consignas detectadas en el PDF.</p>
            )}

            {/* Añadir consigna manual */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={nuevaConsigna}
                onChange={e => setNuevaConsigna(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nuevaConsigna.trim()) {
                      setConsignasItems(prev => [...prev, { texto: nuevaConsigna.trim(), activa: true }]);
                      setNuevaConsigna('');
                    }
                  }
                }}
                placeholder="Añadir consigna..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-[#CC0E21]"
              />
              <button
                type="button"
                onClick={() => {
                  if (nuevaConsigna.trim()) {
                    setConsignasItems(prev => [...prev, { texto: nuevaConsigna.trim(), activa: true }]);
                    setNuevaConsigna('');
                  }
                }}
                disabled={!nuevaConsigna.trim()}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                + Añadir
              </button>
            </div>
          </section>

          {/* TRANSICIONES */}
          <section className="space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">
              Transiciones
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">
                <ArrowRight className="h-3 w-3" /> Tras recuperación
                <MiniConfBadge confianza={tarea.transicion_tras_recuperacion.valor ? tarea.transicion_tras_recuperacion.confianza : 'no_detectado'} />
              </div>
              <textarea
                value={transicionRec}
                onChange={e => setTransicionRec(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-emerald-900/30 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-700/50 transition-colors resize-none"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-red-500 uppercase tracking-wider mb-1">
                <Shuffle className="h-3 w-3" /> Tras pérdida
                <MiniConfBadge confianza={tarea.transicion_tras_perdida.valor ? tarea.transicion_tras_perdida.confianza : 'no_detectado'} />
              </div>
              <textarea
                value={transicionPerd}
                onChange={e => setTransicionPerd(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-red-900/30 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-red-700/50 transition-colors resize-none"
              />
            </div>
          </section>

          {/* CONCEPTOS TÁCTICOS */}
          <section className="space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">
              Conceptos tácticos
            </h4>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2">
              <p className="text-[9px] text-amber-400/80 font-semibold">
                ⚡ Sugerencias de la IA — aprueba solo los que sean correctos. Nunca se guardan automáticamente.
              </p>
            </div>

            {conceptosSugeridos.length > 0 && (
              <div className="space-y-1.5">
                {conceptosSugeridos.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/50 border border-slate-800 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1">
                        <select
                          value={c.categoria ?? ''}
                          onChange={e => {
                            const val = (e.target.value || null) as CategoriaConcepto | null;
                            setConceptosSugeridos(prev =>
                              prev.map((x, idx) => idx === i ? { ...x, categoria: val, estado: val ? x.estado : 'pendiente' } : x)
                            );
                          }}
                          className={`text-[8px] font-black uppercase tracking-wider rounded px-1.5 py-0.5 outline-none border transition-colors ${
                            c.categoria
                              ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-[#CC0E21]'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 focus:border-amber-400'
                          }`}
                        >
                          <option value="">Sin categoría / Revisión necesaria</option>
                          {Object.keys(CONCEPTOS_TACTICOS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-slate-300 font-semibold">{c.concepto}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={!c.categoria}
                        title={!c.categoria ? 'Selecciona una categoría antes de aprobar' : undefined}
                        onClick={() => setConceptosSugeridos(prev =>
                          prev.map((x, idx) => idx === i ? { ...x, estado: 'aprobado' } : x)
                        )}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                          c.estado === 'aprobado'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : !c.categoria
                            ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-700'
                        }`}
                      >
                        <Check className="h-3 w-3 inline mr-0.5" />Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConceptosSugeridos(prev =>
                          prev.map((x, idx) => idx === i ? { ...x, estado: 'rechazado' } : x)
                        )}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                          c.estado === 'rechazado'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-red-300 border border-slate-700'
                        }`}
                      >
                        <X className="h-3 w-3 inline mr-0.5" />Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Añadir concepto manual */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">+ Añadir concepto manualmente</p>
              <div className="flex gap-2">
                <select
                  value={manualConceptoCat}
                  onChange={e => setManualConceptoCat(e.target.value as CategoriaConcepto)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-[#CC0E21]"
                >
                  {Object.keys(CONCEPTOS_TACTICOS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={manualConceptoVal}
                  onChange={e => setManualConceptoVal(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-[#CC0E21]"
                >
                  <option value="">-- Concepto --</option>
                  {CONCEPTOS_TACTICOS[manualConceptoCat].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddManualConcepto}
                  disabled={!manualConceptoVal}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[9px] font-bold transition-colors disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {manualConceptosExtra.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {manualConceptosExtra.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      {c.concepto}
                      <button type="button" onClick={() => setManualConceptosExtra(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* TRAZABILIDAD (solo staff/editor) */}
          <section className="space-y-2">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Trazabilidad de origen · solo staff
            </h4>
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 space-y-1.5 text-[10px]">
              {pdfUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold w-20 shrink-0">PDF origen</span>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 underline truncate max-w-[260px] transition-colors">
                    {pdfUrl.split('/').pop() ?? pdfUrl}
                  </a>
                </div>
              )}
              {sessionDate && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold w-20 shrink-0">Sesión</span>
                  <span className="text-slate-400">{sessionDate}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold w-20 shrink-0">Nº tarea PDF</span>
                <span className="text-slate-400">
                  Tarea {tarea.numero_tarea}{totalTareasPdf ? ` de ${totalTareasPdf}` : ''}
                </span>
              </div>
              {tarea.pagina_pdf?.valor && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold w-20 shrink-0">Página PDF</span>
                  <span className="text-slate-400">Pág. {tarea.pagina_pdf.valor}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold w-20 shrink-0">Confianza IA</span>
                <MiniConfBadge confianza={tarea.nombre.confianza} />
              </div>
              <p className="text-[8px] text-slate-700 italic pt-0.5">
                📁 Archivado Drive: previsto para implementación futura (trazabilidad ya conservada)
              </p>
            </div>
          </section>

          {/* DUPLICADO */}
          {duplicate && !ignoreDuplicate && (
            <LibraryDuplicateAlert
              match={duplicate}
              onIgnore={() => setIgnoreDuplicate(true)}
              onView={task => setViewingDuplicate(task)}
            />
          )}
          {!duplicate && nombre.trim() && tipoTarea.trim() && (
            <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                tarea nueva
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                — Sin coincidencias en la biblioteca existente
              </span>
            </div>
          )}
          {ignoreDuplicate && duplicate && (
            <p className="text-[9px] text-slate-500 italic">
              ✓ Duplicado ignorado — se guardará como nueva entrada independiente.
            </p>
          )}

          {/* Preview de tarea duplicada */}
          {viewingDuplicate && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tarea existente en biblioteca</p>
                <button type="button" onClick={() => setViewingDuplicate(null)} className="text-slate-600 hover:text-slate-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-200">{viewingDuplicate.nombre}</p>
              <p className="text-[9px] text-slate-500">{viewingDuplicate.tipo_tarea} · {viewingDuplicate.minutos_defecto} min</p>
              {viewingDuplicate.objetivo && <p className="text-[10px] text-slate-400 leading-snug">{viewingDuplicate.objetivo}</p>}
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-950/20 border border-red-800/40 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-300 leading-snug">{saveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[9px] text-slate-600">
            aprobada = FALSE · Borrador no visible en biblioteca activa
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !nombre.trim() || !tipoTarea.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all bg-[#CC0E21]/90 hover:bg-[#CC0E21] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando...</>
              ) : (
                <><BookOpen className="h-3.5 w-3.5" />Guardar como Borrador</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
