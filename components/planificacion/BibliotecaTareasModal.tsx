import React, { useState, useEffect } from 'react';
import {
  Search, BookOpen, Clock, Users, Maximize, Target, Check, Trash2, X,
  Sparkles, CheckCircle2, ArrowRight, Shuffle, Link2, FileText, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PlanningTaskLibrary } from '@/types';
import { Button } from '@/components/ui/Button';
import { getStaffPasskey } from '@/lib/passkey';
import { useEditMode } from '@/context/EditModeContext';

interface BibliotecaTareasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: PlanningTaskLibrary) => void;
}

const CATEGORIAS_LIBRERIA = [
  'Todos',
  'Calentamiento',
  'Rondo',
  'Posesión',
  'Finalización',
  'ABP',
  'Técnica',
  'Táctica',
  'Físico',
  'Fuerza',
  'Velocidad',
  'Recuperación',
  'Partido condicionado'
];

export function BibliotecaTareasModal({ isOpen, onClose, onSelectTask }: BibliotecaTareasModalProps) {
  const { currentUser } = useEditMode();

  const [activeTab, setActiveTab] = useState<'activas' | 'borradores'>('activas');
  const [activeTasks, setActiveTasks] = useState<PlanningTaskLibrary[]>([]);
  const [draftTasks, setDraftTasks] = useState<PlanningTaskLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [previewTask, setPreviewTask] = useState<PlanningTaskLibrary | null>(null);

  // Estado de aprobación
  const [approving, setApproving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [actRes, draftRes] = await Promise.all([
        supabase
          .from('planning_task_library')
          .select('*')
          .or('aprobada.is.null,aprobada.eq.true')  // NULL=legado · TRUE=aprobada
          .order('nombre', { ascending: true }),
        supabase
          .from('planning_task_library')
          .select('*')
          .eq('aprobada', false)                    // FALSE=borradores desde PDF
          .order('created_at', { ascending: false }),
      ]);

      if (actRes.error) throw actRes.error;
      const act = actRes.data || [];
      const drafts = draftRes.data || [];

      setActiveTasks(act);
      setDraftTasks(drafts);

      // Si hay una previsualización activa, refrescar su estado
      if (previewTask) {
        const found = [...act, ...drafts].find(t => t.id === previewTask.id);
        if (found) setPreviewTask(found);
      }
    } catch (e) {
      console.error('Error fetching library tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    } else {
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea de la biblioteca?')) return;
    try {
      const headers: Record<string, string> = {};
      const staffPasskey = getStaffPasskey();
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const response = await fetch(`/api/planificacion/library?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(resJson?.error || `Error ${response.status} al eliminar la tarea`);
      }

      setActiveTasks(prev => prev.filter(t => t.id !== taskId));
      setDraftTasks(prev => prev.filter(t => t.id !== taskId));
      if (previewTask?.id === taskId) {
        setPreviewTask(null);
      }
      setFeedbackMsg({ type: 'success', text: 'Tarea eliminada correctamente.' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar la tarea.' });
    }
  };

  // ── APROBAR BORRADOR ──
  const handleApproveDraft = async (task: PlanningTaskLibrary) => {
    if (!task) return;
    setApproving(true);
    setFeedbackMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const staffPasskey = getStaffPasskey();
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const staffName = currentUser?.name?.trim() ? currentUser.name.trim() : 'Cuerpo Técnico';

      const response = await fetch('/api/planificacion/library', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: task.id,
          revisada_por: staffName,
        }),
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok || !resJson?.ok) {
        throw new Error(resJson?.error || `Error ${response.status} al aprobar la tarea`);
      }

      const approvedTask: PlanningTaskLibrary = resJson.task || {
        ...task,
        aprobada: true,
        revisada_por: staffName,
        revisada_at: new Date().toISOString(),
      };

      // Mover de borradores a tareas activas sin modificar ninguna otra tarea
      setDraftTasks(prev => prev.filter(t => t.id !== task.id));
      setActiveTasks(prev => [approvedTask, ...prev]);
      setPreviewTask(approvedTask);
      setFeedbackMsg({
        type: 'success',
        text: `✓ ¡Tarea "${task.nombre}" aprobada por ${staffName} e incorporada a la biblioteca activa!`
      });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al aprobar la tarea.' });
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen) return null;

  const currentList = activeTab === 'activas' ? activeTasks : draftTasks;

  const filteredTasks = currentList.filter(t => {
    const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.objetivo && t.objetivo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todos' || t.tipo_tarea === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#CC0E21]" />
            <h2 className="text-lg font-black text-slate-100">Biblioteca Táctica</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas: Biblioteca Activa vs Borradores PDF */}
        <div className="flex items-center gap-4 px-6 pt-2 border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => { setActiveTab('activas'); setPreviewTask(null); }}
            className={`pb-2.5 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'activas'
                ? 'border-[#CC0E21] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Biblioteca Activa
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {activeTasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('borradores'); setPreviewTask(null); }}
            className={`pb-2.5 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'borradores'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-amber-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Borradores PDF · Staff
            {draftTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-black border border-amber-500/30">
                {draftTasks.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`px-6 py-2 text-xs font-bold flex items-center justify-between border-b ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
              : 'bg-red-950/40 text-red-300 border-red-800/40'
          }`}>
            <span className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {feedbackMsg.text}
            </span>
            <button type="button" onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Search & Category filter */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Buscar en ${activeTab === 'activas' ? 'biblioteca activa' : 'borradores PDF'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#CC0E21] placeholder-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-1 items-center overflow-x-auto pb-0.5 max-w-full md:max-w-2/3">
            {CATEGORIAS_LIBRERIA.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedCategory === cat
                    ? activeTab === 'borradores' ? 'bg-amber-600 text-white' : 'bg-[#CC0E21] text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content split screen */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left panel: List */}
          <div className="w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/20">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Cargando tareas...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                <p>
                  {activeTab === 'borradores'
                    ? 'No hay borradores PDF pendientes de aprobación.'
                    : 'No se encontraron ejercicios en esta categoría.'}
                </p>
                {activeTab === 'borradores' && (
                  <p className="text-[10px] text-slate-600">
                    Puedes analizar un PDF de sesión y guardar ejercicios como borrador para revisarlos aquí.
                  </p>
                )}
              </div>
            ) : (
              filteredTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => setPreviewTask(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                    previewTask?.id === t.id
                      ? activeTab === 'borradores'
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-lg'
                        : 'bg-slate-800/80 border-[#CC0E21]/60 shadow-lg'
                      : 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 pr-3 truncate flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-200 truncate">{t.nombre}</div>
                      {t.aprobada === false && (
                        <span className="shrink-0 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          Borrador PDF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {t.tipo_tarea}
                      </span>
                      <span>{t.minutos_defecto} min</span>
                      {t.creado_por && (
                        <span className="text-slate-500 truncate">· {t.creado_por}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleDeleteTask(t.id, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {t.aprobada === false ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewTask(t); handleApproveDraft(t); }}
                        disabled={approving}
                        className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition-all shadow"
                        title="Aprobar e incorporar"
                      >
                        <Check className="h-3 w-3" />
                        Aprobar
                      </button>
                    ) : (
                      <Button
                        onClick={(e) => { e.stopPropagation(); onSelectTask(t); }}
                        className="flex items-center gap-1 text-[10px] px-2 py-1"
                      >
                        <Check className="h-3 w-3" />
                        Importar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel: Details preview */}
          <div className="hidden md:block w-1/2 overflow-y-auto p-5 bg-slate-900/40 space-y-5">
            {previewTask ? (
              <div className="space-y-4">
                
                {/* Banner de Borrador si está en estado borrador */}
                {previewTask.aprobada === false && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Borrador PDF · Pendiente de Aprobación
                      </span>
                      {previewTask.confianza_global && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Confianza: {previewTask.confianza_global}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                      Este ejercicio fue extraído desde un PDF de sesión. No es visible en la biblioteca activa hasta que pulses el botón de aprobación.
                    </p>
                    <button
                      type="button"
                      disabled={approving}
                      onClick={() => handleApproveDraft(previewTask)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow disabled:opacity-50"
                    >
                      {approving ? (
                        <>
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Aprobando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar e incorporar a Biblioteca
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Banner de tarea aprobada previamente */}
                {previewTask.aprobada === true && previewTask.revisada_por && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Tarea aprobada e incorporada
                    </span>
                    <span className="text-slate-400">
                      Revisada por: <strong>{previewTask.revisada_por}</strong>
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-[#CC0E21] bg-[#CC0E21]/10 px-2 py-0.5 rounded-md">
                    {previewTask.tipo_tarea}
                  </span>
                  <h3 className="text-xl font-black text-slate-100 mt-2">{previewTask.nombre}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Creado por: {previewTask.creado_por || 'Cuerpo Técnico'}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mb-0.5" />
                    <span className="text-[9px] text-slate-500 font-bold">DURACIÓN</span>
                    <span className="text-xs font-black text-slate-200">{previewTask.minutos_defecto} min</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-slate-400 mb-0.5" />
                    <span className="text-[9px] text-slate-500 font-bold">JUGADORES</span>
                    <span className="text-xs font-black text-slate-200">
                      {previewTask.jugadores_defecto ? `${previewTask.jugadores_defecto} jug` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Maximize className="h-3.5 w-3.5 text-slate-400 mb-0.5" />
                    <span className="text-[9px] text-slate-500 font-bold">ESPACIO</span>
                    <span className="text-xs font-black text-slate-200 truncate max-w-full">
                      {previewTask.espacio_defecto || 'N/A'}
                    </span>
                  </div>
                </div>

                {previewTask.objetivo && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Target className="h-3.5 w-3.5 text-[#CC0E21]" />
                      Objetivo
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {previewTask.objetivo}
                    </div>
                  </div>
                )}

                {previewTask.desarrollo && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-sky-400" />
                      Desarrollo
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {previewTask.desarrollo}
                    </div>
                  </div>
                )}

                {previewTask.organizacion && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400">Organización</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {previewTask.organizacion}
                    </div>
                  </div>
                )}

                {previewTask.consignas && previewTask.consignas.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400">Consignas</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      {previewTask.consignas.map((c, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <span className="text-[#CC0E21] font-black">•</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(previewTask.transicion_rec || previewTask.transicion_perd) && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400">Transiciones</span>
                    <div className="grid grid-cols-2 gap-2">
                      {previewTask.transicion_rec && (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-900/30 space-y-0.5">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <ArrowRight className="h-2.5 w-2.5" /> Tras recuperación
                          </span>
                          <p className="text-[11px] text-slate-300">{previewTask.transicion_rec}</p>
                        </div>
                      )}
                      {previewTask.transicion_perd && (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-red-900/30 space-y-0.5">
                          <span className="text-[9px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                            <Shuffle className="h-2.5 w-2.5" /> Tras pérdida
                          </span>
                          <p className="text-[11px] text-slate-300">{previewTask.transicion_perd}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {previewTask.descripcion && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400">Descripción / Notas adicionales</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {previewTask.descripcion}
                    </div>
                  </div>
                )}

                {previewTask.observaciones && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400">Observaciones / Variantes</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 italic">
                      {previewTask.observaciones}
                    </div>
                  </div>
                )}

                {/* Trazabilidad de origen */}
                {(previewTask.fuente_pdf_url || previewTask.numero_tarea_pdf || previewTask.pagina_pdf) && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      <Link2 className="h-3 w-3" /> Trazabilidad de origen
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[10px]">
                      {previewTask.fuente_pdf_url && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold w-16 shrink-0">PDF:</span>
                          <a href={previewTask.fuente_pdf_url} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline truncate">
                            {previewTask.fuente_pdf_url.split('/').pop()}
                          </a>
                        </div>
                      )}
                      {previewTask.numero_tarea_pdf && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold w-16 shrink-0">Nº Tarea:</span>
                          <span className="text-slate-300">Tarea {previewTask.numero_tarea_pdf}</span>
                        </div>
                      )}
                      {previewTask.pagina_pdf && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold w-16 shrink-0">Página:</span>
                          <span className="text-slate-300">Pág. {previewTask.pagina_pdf}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <BookOpen className="h-8 w-8 text-slate-600 mb-2" />
                Selecciona un ejercicio para ver su previsualización detallada.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/20 flex justify-between items-center gap-2">
          <div className="text-[10px] text-slate-500">
            {activeTab === 'borradores' ? (
              <span>Modo Staff: Los borradores solo son visibles para el cuerpo técnico hasta su aprobación.</span>
            ) : (
              <span>Ejercicios activos disponibles para planificar sesiones.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {previewTask && previewTask.aprobada === false && (
              <Button
                onClick={() => handleApproveDraft(previewTask)}
                disabled={approving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Aprobar e Incorporar
              </Button>
            )}
            {previewTask && previewTask.aprobada !== false && (
              <Button onClick={() => onSelectTask(previewTask)}>
                Importar Ejercicio
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
