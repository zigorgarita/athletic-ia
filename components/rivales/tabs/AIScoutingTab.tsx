'use client';
import React, { useState } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubAIReports, ClubAIReport } from '@/hooks/useClubAIReports';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Brain, Trash2, Calendar, Target, Shield, AlertTriangle, Lightbulb, UserCheck, Zap, Bot, Wand2 } from 'lucide-react';

interface AIScoutingTabProps {
  season: ClubSeason | null;
}

const TIPOS_IA = [
  'Informe inicial',
  'Actualización',
  'Comparativa',
  'Evolución temporada'
];

export function AIScoutingTab({ season }: AIScoutingTabProps) {
  const { reports, loading, saveReport, deleteReport } = useClubAIReports(season?.id);
  const { isEditMode } = useEditMode();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<ClubAIReport> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const handleOpenModal = (report?: ClubAIReport) => {
    if (report) {
      setEditingReport(report);
    } else {
      setEditingReport({
        tipo: 'Informe inicial',
        fecha: new Date().toISOString().split('T')[0],
        editado_por_mister: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simular generación de IA
    setTimeout(() => {
      setEditingReport(prev => prev ? {
        ...prev,
        informe_completo: "El rival destaca por una alta intensidad en la presión tras pérdida y transiciones muy verticales. Sufren en repliegue bajo si se les expone a centros laterales cruzados.",
        fortalezas: "1. Transición ofensiva rapidísima.\n2. Juego aéreo ofensivo.\n3. Presión asfixiante en saques de puerta rivales.",
        debilidades: "1. Espacios a la espalda de sus laterales.\n2. Lentitud en el repliegue de los pivotes.\n3. Sufrimiento defendiendo el segundo palo en ABP.",
        jugadores_clave: "El extremo derecho (Dorsal 7) es su principal vía de escape. El mediapunta (Dorsal 10) filtra balones con mucha facilidad.",
        como_atacarles: "Atraer su presión a un lado y cambiar la orientación rápidamente al extremo opuesto. Aprovechar la espalda de sus laterales con balones largos de nuestros centrales.",
        como_defenderles: "Bloque medio-bajo juntando mucho las líneas. Evitar pérdidas en inicio de jugada, si no se ve claro, balón largo a nuestros puntas.",
        riesgos: "Altísima probabilidad de sufrir goles de contraataque si nuestro equipo se despliega mal tras pérdida.",
        plan_recomendado: "Partido de contención y transiciones. Cederles el balón en ciertas fases para que se desordenen.",
        alertas: "Ojo al balón parado ofensivo de ellos, tienen una jugada ensayada al primer palo muy peligrosa."
      } : null);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !editingReport.tipo) return;
    
    setIsSaving(true);
    const success = await saveReport(editingReport);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
      // Expande el recién creado o editado automáticamente si se puede, pero recargará la lista
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este informe de IA?')) {
      await deleteReport(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingReport(prev => prev ? { 
      ...prev, 
      [name]: value,
      editado_por_mister: true // Si edita manualmente, se marca como editado
    } : null);
  };

  const toggleExpand = (id: string) => {
    setExpandedReportId(prev => prev === id ? null : id);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-indigo-400/70 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">
      
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-indigo-950/10 p-4 rounded-3xl border border-indigo-900/40">
        <div className="flex items-center gap-3 ml-2">
          <Brain className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-indigo-200">Scouting impulsado por IA</h3>
        </div>
        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shrink-0 flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generar Informe IA
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1].map(i => <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <Bot className="h-12 w-12 text-indigo-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Sin análisis de IA</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">Athletic IA puede analizar automáticamente los datos, modelo de juego y vídeos del rival para generar un informe de scouting estructurado.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white border-none">
              Solicitar Análisis IA
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const isExpanded = expandedReportId === report.id;
            
            return (
              <div 
                key={report.id} 
                className={`bg-slate-900/40 border ${isExpanded ? 'border-indigo-500/40' : 'border-slate-800/80'} rounded-2xl overflow-hidden transition-all`}
              >
                {/* Cabecera del informe (siempre visible) */}
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleExpand(report.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 bg-slate-950 rounded-xl border flex items-center justify-center shrink-0 ${isExpanded ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-800'}`}>
                      <Brain className={`h-5 w-5 ${isExpanded ? 'text-indigo-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">{report.tipo}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.fecha ? new Date(report.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                        </span>
                        {report.editado_por_mister && (
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                            <Target className="h-3 w-3" /> Revisado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <>
                        <Button 
                          variant="ghost" 
                          className="text-xs py-1 px-2"
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(report); }}
                        >
                          Ajustar
                        </Button>
                        <button 
                          onClick={(e) => handleDelete(report.id, e)} 
                          className="p-2 text-slate-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contenido expandido */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-800/80 bg-slate-950/30 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                    
                    {/* Decoración IA */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                    {report.informe_completo && (
                      <div className="md:col-span-2 space-y-2 relative z-10">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                          <Brain className="h-4 w-4" /> Resumen Ejecutivo IA
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-indigo-950/20 p-4 rounded-xl border border-indigo-900/30">{report.informe_completo}</p>
                      </div>
                    )}

                    {report.plan_recomendado && (
                      <div className="md:col-span-2 space-y-2 relative z-10">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          <Lightbulb className="h-4 w-4" /> Plan de Partido Recomendado
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.plan_recomendado}</p>
                      </div>
                    )}

                    {report.como_atacarles && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                          <Zap className="h-4 w-4" /> Cómo Atacarles
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.como_atacarles}</p>
                      </div>
                    )}

                    {report.como_defenderles && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                          <Shield className="h-4 w-4" /> Cómo Defenderles
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.como_defenderles}</p>
                      </div>
                    )}

                    {report.fortalezas && (
                      <div className="space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Fortalezas Detectadas
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.fortalezas}</p>
                      </div>
                    )}

                    {report.debilidades && (
                      <div className="space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Debilidades Identificadas
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.debilidades}</p>
                      </div>
                    )}

                    {report.jugadores_clave && (
                      <div className="space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                          <UserCheck className="h-4 w-4" /> Jugadores Clave
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.jugadores_clave}</p>
                      </div>
                    )}

                    {(report.riesgos || report.alertas) && (
                      <div className="space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                          <AlertTriangle className="h-4 w-4" /> Riesgos y Alertas
                        </h5>
                        {report.riesgos && <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-2"><span className="text-slate-500">Riesgos:</span> {report.riesgos}</p>}
                        {report.alertas && <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed"><span className="text-slate-500">Alertas:</span> {report.alertas}</p>}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar Informe IA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingReport?.id ? "Ajustar Informe IA" : "Nuevo Análisis IA"}>
        {editingReport && (
          <form onSubmit={handleSave} className="space-y-5">
            
            {!editingReport.id && (
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-sm text-indigo-200">Pulsa el botón para que Athletic IA analice los datos actuales del rival y proponga un borrador.</p>
                <Button 
                  type="button" 
                  onClick={handleGenerateAI} 
                  loading={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white w-full sm:w-auto"
                >
                  <Wand2 className="h-4 w-4 mr-2" /> Generar Borrador Táctico
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de Análisis <span className="text-red-500">*</span></label>
                <select required name="tipo" value={editingReport.tipo || ''} onChange={handleChange} className={inputClass}>
                  {TIPOS_IA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" name="fecha" value={editingReport.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Resumen Ejecutivo</label>
              <textarea name="informe_completo" value={editingReport.informe_completo || ''} onChange={handleChange} rows={3} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cómo Atacarles</label>
                <textarea name="como_atacarles" value={editingReport.como_atacarles || ''} onChange={handleChange} rows={3} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Cómo Defenderles</label>
                <textarea name="como_defenderles" value={editingReport.como_defenderles || ''} onChange={handleChange} rows={3} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Plan de Partido Recomendado</label>
              <textarea name="plan_recomendado" value={editingReport.plan_recomendado || ''} onChange={handleChange} rows={2} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fortalezas</label>
                <textarea name="fortalezas" value={editingReport.fortalezas || ''} onChange={handleChange} rows={2} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Debilidades</label>
                <textarea name="debilidades" value={editingReport.debilidades || ''} onChange={handleChange} rows={2} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Jugadores Clave</label>
              <textarea name="jugadores_clave" value={editingReport.jugadores_clave || ''} onChange={handleChange} rows={2} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Riesgos</label>
                <textarea name="riesgos" value={editingReport.riesgos || ''} onChange={handleChange} rows={2} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Alertas (Situaciones críticas)</label>
                <textarea name="alertas" value={editingReport.alertas || ''} onChange={handleChange} rows={2} className={inputClass} />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving || isGenerating}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving} disabled={isGenerating}>Guardar Informe IA</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
