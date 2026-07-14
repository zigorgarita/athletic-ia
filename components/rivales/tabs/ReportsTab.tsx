'use client';
import React, { useState } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubReports, ClubReport } from '@/hooks/useClubReports';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FileText, Plus, Trash2, Calendar, Target, Shield, AlertTriangle, MessageSquare, ListTodo, Search, Download, Link as LinkIcon, Paperclip } from 'lucide-react';

interface ReportsTabProps {
  season: ClubSeason | null;
}

const TIPOS_INFORME = [
  'Pretemporada',
  'Liga',
  'Copa',
  'Amistoso',
  'Playoff',
  'Seguimiento',
  'Postpartido',
  'Observación en directo'
];

const ESTADOS = ['Borrador', 'Definitivo', 'Cerrado'];

export function ReportsTab({ season }: ReportsTabProps) {
  const { reports, loading, saveReport, deleteReport } = useClubReports(season?.id);
  const { isEditMode } = useEditMode();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<ClubReport> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (r.titulo?.toLowerCase().includes(term) ||
            r.tipo.toLowerCase().includes(term) ||
            r.plan_partido?.toLowerCase().includes(term));
  });

  const handleOpenModal = (report?: ClubReport) => {
    if (report) {
      setEditingReport(report);
    } else {
      setEditingReport({
        tipo: 'Liga',
        estado: 'Borrador',
        fecha: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !editingReport.tipo) return;
    
    setIsSaving(true);
    const success = await saveReport(editingReport);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este informe?')) {
      await deleteReport(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingReport(prev => prev ? { ...prev, [name]: value } : null);
  };

  const toggleExpand = (id: string) => {
    setExpandedReportId(prev => prev === id ? null : id);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">
      
      {/* Cabecera y Buscador */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar informes por título, tipo o contenido..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
          <div className="text-sm text-slate-500 py-2">
            {filteredReports.length} {filteredReports.length === 1 ? 'informe' : 'informes'}
          </div>
        </div>
        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear Informe
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Sin informes</h3>
          <p className="text-slate-500 text-sm mt-2">Aún no hay informes del míster para este rival.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Redactar el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(report => {
            const isExpanded = expandedReportId === report.id;
            
            return (
              <div 
                key={report.id} 
                className={`bg-slate-900/40 border ${isExpanded ? 'border-[#CC0E21]/40 shadow-[0_8px_30px_rgb(204,14,33,0.1)]' : 'border-slate-800/80 hover:border-[#CC0E21]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]'} rounded-2xl overflow-hidden transition-all duration-300`}
              >
                {/* Cabecera del informe (siempre visible) */}
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleExpand(report.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shrink-0">
                      <FileText className={`h-5 w-5 ${isExpanded ? 'text-[#CC0E21]' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">{report.titulo || 'Informe sin título'}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.fecha ? new Date(report.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                        </span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300">
                          {report.tipo}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          report.estado === 'Definitivo' ? 'bg-emerald-500/20 text-emerald-400' :
                          report.estado === 'Cerrado' ? 'bg-slate-700 text-slate-300' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {report.estado || 'Borrador'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="hidden sm:flex items-center gap-2 text-xs py-1 px-2" onClick={(e) => { e.stopPropagation(); alert('Exportación a PDF en desarrollo'); }}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                    {isEditMode && (
                      <>
                        <Button 
                          variant="ghost" 
                          className="text-xs py-1 px-2"
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(report); }}
                        >
                          Editar
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
                  <div className="p-6 border-t border-slate-800/80 bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                    
                    {report.plan_partido && (
                      <div className="md:col-span-2 space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                          <ListTodo className="h-4 w-4" /> Plan de Partido
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.plan_partido}</p>
                      </div>
                    )}

                    {report.objetivos && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                          <Target className="h-4 w-4" /> Objetivos Principales
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.objetivos}</p>
                      </div>
                    )}

                    {report.mensaje_equipo && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                          <MessageSquare className="h-4 w-4" /> Mensaje al Equipo
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed italic border-l-2 border-purple-500/50 pl-3">&quot;{report.mensaje_equipo}&quot;</p>
                      </div>
                    )}

                    {report.que_atacar && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                          <AlertTriangle className="h-4 w-4" /> Qué Atacar (Debilidades Rival)
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.que_atacar}</p>
                      </div>
                    )}

                    {report.que_proteger && (
                      <div className="space-y-2">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CC0E21]">
                          <Shield className="h-4 w-4" /> Qué Proteger (Amenazas)
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.que_proteger}</p>
                      </div>
                    )}

                    {report.consignas && (
                      <div className="md:col-span-2 space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Consignas y Tareas Específicas
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.consignas}</p>
                      </div>
                    )}

                    {report.contenido_libre && (
                      <div className="md:col-span-2 space-y-2 pt-4 border-t border-slate-800/50">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Otras anotaciones
                        </h5>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{report.contenido_libre}</p>
                      </div>
                    )}

                    <div className="md:col-span-2 space-y-2 pt-4 border-t border-slate-800/50 flex flex-wrap gap-4">
                       <Button variant="secondary" className="flex items-center gap-2 text-xs py-1.5 px-3">
                         <Paperclip className="h-4 w-4" /> Ver Archivos Adjuntos (0)
                       </Button>
                       <Button variant="secondary" className="flex items-center gap-2 text-xs py-1.5 px-3">
                         <LinkIcon className="h-4 w-4" /> Ver Enlaces Relacionados (0)
                       </Button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar Informe */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingReport?.id ? "Editar Informe" : "Nuevo Informe"}>
        {editingReport && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Título del Informe</label>
                <input type="text" name="titulo" value={editingReport.titulo || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Informe Previo Jornada 14" />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" name="fecha" value={editingReport.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de Informe <span className="text-red-500">*</span></label>
                <select required name="tipo" value={editingReport.tipo || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_INFORME.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Estado <span className="text-red-500">*</span></label>
                <select required name="estado" value={editingReport.estado || 'Borrador'} onChange={handleChange} className={inputClass}>
                  {ESTADOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Plan de Partido (Estrategia global)</label>
              <textarea name="plan_partido" value={editingReport.plan_partido || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Planteamiento general para este partido..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Qué Atacar (Dónde hacer daño)</label>
                <textarea name="que_atacar" value={editingReport.que_atacar || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Debilidades detectadas a explotar..." />
              </div>
              <div>
                <label className={labelClass}>Qué Proteger (De qué cuidarse)</label>
                <textarea name="que_proteger" value={editingReport.que_proteger || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Amenazas del rival a neutralizar..." />
              </div>
            </div>

            <div>
              <label className={labelClass}>Consignas Tácticas</label>
              <textarea name="consignas" value={editingReport.consignas || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Reglas e instrucciones específicas para el equipo..." />
            </div>

            <div>
              <label className={labelClass}>Mensaje Clave al Equipo (Motivacional/Foco)</label>
              <textarea name="mensaje_equipo" value={editingReport.mensaje_equipo || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Ej: Intensidad desde el minuto 1, evitar faltas cerca del área..." />
            </div>

            <div>
              <label className={labelClass}>Contenido Libre / Otras anotaciones</label>
              <textarea name="contenido_libre" value={editingReport.contenido_libre || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Anotaciones extra que no encajen arriba..." />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Informe</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
