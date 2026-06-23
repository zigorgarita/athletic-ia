import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Clock, Users, Maximize, Target, Check, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PlanningTaskLibrary } from '@/types';
import { Button } from '@/components/ui/Button';

interface BibliotecaTareasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: PlanningTaskLibrary) => void;
}

const CATEGORIAS_LIBRERIA = [
  'Todos',
  'Rondo',
  'Posesión',
  'Finalización',
  'ABP',
  'Fuerza',
  'Velocidad',
  'Recuperación',
  'Partido condicionado'
];

export function BibliotecaTareasModal({ isOpen, onClose, onSelectTask }: BibliotecaTareasModalProps) {
  const [tasks, setTasks] = useState<PlanningTaskLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [previewTask, setPreviewTask] = useState<PlanningTaskLibrary | null>(null);

  useEffect(() => {
    const fetchLibraryTasks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('planning_task_library')
          .select('*')
          .order('nombre', { ascending: true });
        if (error) throw error;
        setTasks(data || []);
        if (data && data.length > 0 && !previewTask) {
          setPreviewTask(data[0]);
        }
      } catch (e) {
        console.error('Error fetching library tasks:', e);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchLibraryTasks();
    }
  }, [isOpen, previewTask]);

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea de la biblioteca táctica permanente?')) return;
    try {
      const { error } = await supabase
        .from('planning_task_library')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (previewTask?.id === taskId) {
        setPreviewTask(null);
      }
      alert('Tarea eliminada correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la tarea de la biblioteca.');
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => {
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
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#CC0E21]" />
            <h2 className="text-xl font-bold text-slate-100">Biblioteca Táctica Reutilizable</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Category filter */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, objetivo o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21] placeholder-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-1 items-center overflow-x-auto pb-1 max-w-full md:max-w-2/3">
            {CATEGORIAS_LIBRERIA.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#CC0E21] text-white'
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
          <div className="w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/20">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Cargando biblioteca...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No se encontraron ejercicios en esta categoría.
              </div>
            ) : (
              filteredTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => setPreviewTask(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                    previewTask?.id === t.id
                      ? 'bg-slate-800/80 border-[#CC0E21]/60 shadow-lg'
                      : 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 pr-4 truncate">
                    <div className="text-sm font-bold text-slate-200 truncate">{t.nombre}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {t.tipo_tarea}
                      </span>
                      <span>{t.minutos_defecto} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteTask(t.id, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all"
                      title="Eliminar de la biblioteca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Button
                      onClick={() => onSelectTask(t)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Importar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel: Details preview */}
          <div className="hidden md:block w-1/2 overflow-y-auto p-6 bg-slate-900/40 space-y-6">
            {previewTask ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#CC0E21] bg-[#CC0E21]/10 px-2 py-1 rounded-md">
                    {previewTask.tipo_tarea}
                  </span>
                  <h3 className="text-2xl font-black text-slate-100 mt-2">{previewTask.nombre}</h3>
                  <p className="text-xs text-slate-500 mt-1">Creado por: {previewTask.creado_por}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Clock className="h-4 w-4 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold">DURACIÓN</span>
                    <span className="text-xs font-black text-slate-200">{previewTask.minutos_defecto} min</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Users className="h-4 w-4 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold">JUGADORES</span>
                    <span className="text-xs font-black text-slate-200">
                      {previewTask.jugadores_defecto ? `${previewTask.jugadores_defecto} jug` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                    <Maximize className="h-4 w-4 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold">ESPACIO</span>
                    <span className="text-xs font-black text-slate-200 truncate max-w-full">
                      {previewTask.espacio_defecto || 'N/A'}
                    </span>
                  </div>
                </div>

                {previewTask.objetivo && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Target className="h-4 w-4 text-[#CC0E21]" />
                      Objetivo
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                      {previewTask.objetivo}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300">Descripción</span>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {previewTask.descripcion}
                  </div>
                </div>

                {previewTask.observaciones && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-400">Observaciones / Variantes</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 italic">
                      {previewTask.observaciones}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                <BookOpen className="h-8 w-8 text-slate-600 mb-2" />
                Selecciona un ejercicio para ver su previsualización detallada.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/20 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {previewTask && (
            <Button onClick={() => onSelectTask(previewTask)}>
              Importar Ejercicio Seleccionado
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
