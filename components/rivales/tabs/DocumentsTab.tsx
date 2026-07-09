'use client';
import React, { useState } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubDocuments, ClubDocument } from '@/hooks/useClubDocuments';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FolderOpen, Plus, Trash2, Search, ExternalLink, Calendar, File, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface DocumentsTabProps {
  club: Club | null;
  season: ClubSeason | null;
}

const TIPOS_DOCUMENTO = ['PDF', 'Informe', 'PowerPoint', 'Word', 'Excel', 'Imagen', 'Enlace'];

export function DocumentsTab({ club, season }: DocumentsTabProps) {
  const { documents, loading, saveDocument, deleteDocument } = useClubDocuments(club?.id, season?.id);
  const { isEditMode } = useEditMode();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<ClubDocument> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (d.nombre.toLowerCase().includes(term) ||
            d.tipo?.toLowerCase().includes(term) ||
            d.comentario?.toLowerCase().includes(term));
  });

  const handleOpenModal = (doc?: ClubDocument) => {
    if (doc) {
      setEditingDoc(doc);
    } else {
      setEditingDoc({
        tipo: 'PDF',
        fecha: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.nombre || !editingDoc.url) return;
    
    setIsSaving(true);
    const success = await saveDocument(editingDoc);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      await deleteDocument(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingDoc(prev => prev ? { ...prev, [name]: value } : null);
  };

  const getDocIcon = (tipo: string | null) => {
    switch (tipo) {
      case 'PDF': return <FileText className="h-8 w-8 text-red-500" />;
      case 'PowerPoint': return <File className="h-8 w-8 text-orange-500" />;
      case 'Word': return <File className="h-8 w-8 text-blue-500" />;
      case 'Excel': return <File className="h-8 w-8 text-emerald-500" />;
      case 'Imagen': return <ImageIcon className="h-8 w-8 text-purple-500" />;
      case 'Enlace': return <LinkIcon className="h-8 w-8 text-slate-400" />;
      default: return <File className="h-8 w-8 text-slate-500" />;
    }
  };

  if (!club) {
    return <div className="p-8 text-center text-slate-400">No hay datos del club disponibles.</div>;
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
              placeholder="Buscar documentos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Subir Documento
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Carpeta vacía</h3>
          <p className="text-slate-500 text-sm mt-2">No hay documentos ni informes adjuntos para este rival.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map(doc => (
            <div 
              key={doc.id} 
              className="group bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col hover:border-[#CC0E21]/40 transition-all cursor-pointer relative"
              onClick={() => window.open(doc.url, '_blank')}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/50">
                  {getDocIcon(doc.tipo)}
                </div>
                
                {isEditMode && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(doc); }} 
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(doc.id, e)} 
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-[#CC0E21] transition-colors">{doc.nombre}</h4>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase text-slate-300">
                    {doc.tipo || 'Doc'}
                  </span>
                  {doc.fecha && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.fecha).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                {doc.comentario && (
                  <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.comentario}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Documento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDoc?.id ? "Editar Documento" : "Añadir Documento"}>
        {editingDoc && (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className={labelClass}>Nombre del documento <span className="text-red-500">*</span></label>
              <input required type="text" name="nombre" value={editingDoc.nombre || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Dosier Táctico Jornada 14" />
            </div>

            <div>
              <label className={labelClass}>URL del Archivo (Drive, Dropbox...) <span className="text-red-500">*</span></label>
              <input required type="url" name="url" value={editingDoc.url || ''} onChange={handleChange} className={inputClass} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de Documento</label>
                <select name="tipo" value={editingDoc.tipo || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" name="fecha" value={editingDoc.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Comentarios / Notas</label>
              <textarea name="comentario" value={editingDoc.comentario || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Anotaciones sobre este documento..." />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Documento</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
