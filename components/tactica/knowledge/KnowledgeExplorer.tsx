'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  KnowledgeEntry, 
  KNOWLEDGE_CATEGORIES, 
  KNOWLEDGE_PHASES, 
  KnowledgePhase 
} from '@/types';
import { useKnowledgeLibrary } from '@/hooks/useKnowledgeLibrary';
import { useEditMode } from '@/context/EditModeContext';
import { KnowledgeDetailView } from './KnowledgeDetailView';
import { KnowledgeEntryForm } from './KnowledgeEntryForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  BookOpen, Search, Filter, Plus, X, ChevronRight, 
  Video, Tag
} from 'lucide-react';

interface KnowledgeExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    sistema?: string;
    fase?: string;
    posicion?: string;
  };
}

export function KnowledgeExplorer({ isOpen, onClose, initialContext }: KnowledgeExplorerProps) {
  const { isEditMode } = useEditMode();
  const { 
    fetchEntries, 
    saveEntry, 
    archiveEntry, 
    deleteEntry, 
    addTag,
    fetchAllTags
  } = useKnowledgeLibrary();

  // Estados del Explorador
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Partial<KnowledgeEntry> | undefined>(undefined);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [selectedSistema, setSelectedSistema] = useState<string>(initialContext?.sistema || '');
  const [selectedPosicion, setSelectedPosicion] = useState<string>(initialContext?.posicion || '');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  // Carga inicial y recarga
  const loadData = useCallback(async () => {
    const filters = {
      categoria: selectedCategory || undefined,
      fase_juego: selectedFase || undefined,
      sistema_asociado: selectedSistema || undefined,
      posicion_asociada: selectedPosicion || undefined,
      search: searchQuery || undefined,
      activo: showArchived ? undefined : true, // si es true en el select, traer todos (activo: undefined)
      tag: selectedTag || undefined
    };

    const data = await fetchEntries(filters);
    setEntries(data);
    
    // Si hay una seleccionada, refrescar su detalle
    if (selectedEntry) {
      const refreshed = data.find(e => e.id === selectedEntry.id);
      if (refreshed) {
        setSelectedEntry(refreshed);
      } else {
        setSelectedEntry(data[0] || null);
      }
    } else {
      setSelectedEntry(data[0] || null);
    }
  }, [fetchEntries, selectedCategory, selectedFase, selectedSistema, selectedPosicion, searchQuery, showArchived, selectedTag, selectedEntry]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      fetchAllTags().then(setAllTags);
    }
  }, [isOpen, selectedCategory, selectedFase, selectedSistema, selectedPosicion, showArchived, selectedTag, loadData, fetchAllTags]);

  // Ejecutar búsqueda por texto al presionar Enter
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadData();
    }
  };

  // Crear nueva entrada (abrir form vacío)
  const handleCreateNew = () => {
    setEditingData({
      sistema_asociado: initialContext?.sistema || '',
      fase_juego: (initialContext?.fase as KnowledgePhase) || '',
      posicion_asociada: initialContext?.posicion || ''
    });
    setIsEditing(true);
  };

  // Editar entrada seleccionada
  const handleEdit = () => {
    if (selectedEntry) {
      setEditingData(selectedEntry);
      setIsEditing(true);
    }
  };

  // Guardar entrada (insert/update) y subir adjuntos
  const handleSave = async (payload: Partial<KnowledgeEntry>) => {
    try {
      const entryId = await saveEntry(payload);
      if (!entryId) {
        alert('Error al guardar la entrada.');
        return;
      }

      // Si el formulario incluyó tags en texto libre, guardarlos
      if (payload.tags && Array.isArray(payload.tags)) {
        for (const t of payload.tags) {
          const tagStr = typeof t === 'string' ? t : (t as { tag?: string })?.tag;
          if (tagStr) {
            await addTag(entryId, tagStr);
          }
        }
      }

      setIsEditing(false);
      setEditingData(undefined);
      
      // Recargar lista y seleccionar la entrada editada
      const data = await fetchEntries({ activo: showArchived ? undefined : true });
      setEntries(data);
      const saved = data.find(e => e.id === entryId || e.titulo === payload.titulo);
      if (saved) {
        setSelectedEntry(saved);
      }
      fetchAllTags().then(setAllTags);
    } catch (err) {
      console.error(err);
      alert('Error en el guardado.');
    }
  };

  // Archivar (soft delete)
  const handleArchive = async () => {
    if (selectedEntry && confirm('¿Estás seguro de que deseas archivar este concepto táctico? No se mostrará en las pizarras.')) {
      const success = await archiveEntry(selectedEntry.id);
      if (success) {
        loadData();
      }
    }
  };

  // Eliminar permanente (hard delete)
  const handleDelete = async () => {
    if (selectedEntry && confirm('ATENCIÓN: ¿Estás seguro de que deseas eliminar permanentemente este concepto táctico? Esta acción NO se puede deshacer.')) {
      const success = await deleteEntry(selectedEntry.id);
      if (success) {
        setSelectedEntry(null);
        loadData();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-7xl h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Cabecera del Modal */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#CC0E21]" />
            <div>
              <h1 className="text-lg font-extrabold text-slate-100 uppercase tracking-wide">Biblioteca de Conocimiento Táctico</h1>
              <p className="text-[10px] text-slate-400">Fuente única de verdad de la pizarra, entrenamientos y asistente IA.</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-750 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo del Modal con layout de 3 columnas */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* COLUMNA 1: Filtros de Búsqueda (Lateral Izquierda) */}
          <div className="w-64 border-r border-slate-800 p-4 space-y-4 overflow-y-auto bg-slate-900/10 custom-scrollbar hidden md:block">
            <div className="flex items-center gap-1 text-[#CC0E21] font-bold text-xs uppercase tracking-wider mb-2">
              <Filter className="h-4 w-4" />
              <span>Filtros de Búsqueda</span>
            </div>

            {/* Búsqueda textual */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Buscar por Texto</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  placeholder="Presiona Enter..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs outline-none focus:border-[#CC0E21]"
                />
                <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>

            {/* Categorías */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs outline-none focus:border-[#CC0E21] appearance-none"
              >
                <option value="">Todas las categorías</option>
                {KNOWLEDGE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Fases */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fase de Juego</label>
              <select
                value={selectedFase}
                onChange={(e) => setSelectedFase(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs outline-none focus:border-[#CC0E21] appearance-none"
              >
                <option value="">Cualquier fase</option>
                {KNOWLEDGE_PHASES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Sistema Asociado */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sistema de Juego</label>
              <select
                value={selectedSistema}
                onChange={(e) => setSelectedSistema(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs outline-none focus:border-[#CC0E21] appearance-none"
              >
                <option value="">Cualquier sistema</option>
                <option value="1-4-2-3-1">1-4-2-3-1</option>
                <option value="1-4-3-3">1-4-3-3</option>
                <option value="1-4-4-2">1-4-4-2</option>
                <option value="1-3-5-2">1-3-5-2</option>
                <option value="1-5-3-2">1-5-3-2</option>
              </select>
            </div>

            {/* Posición */}
            <Input 
              label="Posición"
              value={selectedPosicion}
              onChange={(e) => setSelectedPosicion(e.target.value)}
              placeholder="Ej: LD, MCO"
              className="text-xs"
            />

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Filtrar por Etiqueta</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg text-xs outline-none focus:border-[#CC0E21] appearance-none"
              >
                <option value="">Todas las etiquetas</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>

            {/* Toggle Archivados */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="showArchived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-800 text-[#CC0E21] bg-slate-900 focus:ring-0"
              />
              <label htmlFor="showArchived" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">
                Mostrar Archivados
              </label>
            </div>
            
            <Button 
              type="button" 
              onClick={loadData}
              className="w-full mt-4 justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 border border-slate-700/60"
            >
              Aplicar Filtros
            </Button>
          </div>

          {/* COLUMNA 2: Lista de Entradas (Columna Central) */}
          <div className="w-full md:w-96 border-r border-slate-800 flex flex-col bg-slate-900/5">
            {/* Cabecera de la Lista */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Conceptos Tácticos ({entries.length})
              </span>
              
              {isEditMode && (
                <button
                  onClick={handleCreateNew}
                  className="px-2 py-1 bg-[#CC0E21]/15 hover:bg-[#CC0E21]/25 text-[#CC0E21] hover:text-red-400 border border-[#CC0E21]/25 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo
                </button>
              )}
            </div>

            {/* Listado en Scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-900">
              {entries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-650 mx-auto" />
                  <p className="text-xs">No se encontraron conceptos tácticos con los filtros seleccionados.</p>
                </div>
              ) : (
                entries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <div 
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsEditing(false);
                      }}
                      className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-2 hover:bg-slate-900/30 ${
                        isSelected ? 'bg-slate-900/50 border-l-4 border-l-[#CC0E21]' : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {entry.categoria}
                          </span>
                          {!entry.activo && (
                            <span className="bg-amber-950/40 text-amber-500 border border-amber-900/50 px-1.5 py-0.2 rounded text-[8px] font-semibold uppercase">
                              Archivado
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{entry.titulo}</h3>
                        {entry.principio_clave && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">{"\"" + entry.principio_clave + "\""}</p>
                        )}
                        
                        <div className="flex items-center gap-2 pt-1">
                          {entry.media && entry.media.length > 0 && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5" title="Medios vinculados">
                              <Video className="h-2.5 w-2.5" />
                              {entry.media.length}
                            </span>
                          )}
                          {entry.links && entry.links.length > 0 && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5" title="Vínculos">
                              <Filter className="h-2.5 w-2.5" />
                              {entry.links.length}
                            </span>
                          )}
                          {entry.tags && entry.tags.length > 0 && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5" title="Etiquetas">
                              <Tag className="h-2.5 w-2.5" />
                              {entry.tags.length}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-650 shrink-0 self-center" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMNA 3: Vista de Detalle o Formulario (Derecha / Contenido Principal) */}
          <div className="flex-1 bg-slate-950/20 overflow-hidden relative">
            {isEditing && editingData ? (
              <div className="h-full p-4 overflow-hidden">
                <KnowledgeEntryForm 
                  initialData={editingData}
                  onSave={handleSave}
                  onCancel={() => {
                    setIsEditing(false);
                    setEditingData(undefined);
                  }}
                />
              </div>
            ) : selectedEntry ? (
              <div className="h-full p-4">
                <KnowledgeDetailView 
                  entry={selectedEntry}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2 p-8">
                <BookOpen className="h-12 w-12 text-slate-700" />
                <p className="text-sm">Selecciona una entrada de conocimiento para ver su detalle.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
