'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRivals } from '@/hooks/useRivals';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Target, Plus, MapPin, Trash2 } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';

export function RivalesClient() {
  const { isEditMode } = useEditMode();
  const { rivals, loading, error, createRival, deleteRival, refetch } = useRivals();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    escudo_url: '',
    campo_nombre: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    
    setIsSubmitting(true);
    const success = await createRival({
      nombre: formData.nombre,
      escudo_url: formData.escudo_url || null,
      campo_nombre: formData.campo_nombre || null,
      campo_dimensiones: null,
      campo_superficie: null,
      info_general: null,
      estadisticas: {},
      notas_entrenador: null,
    });
    
    setIsSubmitting(false);
    if (success) {
      setIsModalOpen(false);
      setFormData({ nombre: '', escudo_url: '', campo_nombre: '' });
      refetch();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este rival? Todo su scouting se borrará.')) {
      await deleteRival(id);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 bg-slate-800" />
          <Skeleton className="h-10 w-32 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-64 rounded-3xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Target className="h-8 w-8 text-[#CC0E21]" />
            Scouting de Rivales
          </h1>
          <p className="text-slate-400 mt-1 text-sm max-w-2xl">
            Cuartel general para analizar a todos los equipos de la liga. Información del campo, vídeos, estadísticas y notas del cuerpo técnico.
          </p>
        </div>
        {isEditMode && (
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Rival
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Grid de Rivales */}
      {rivals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-3xl text-center">
          <Target className="h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-200">No hay rivales registrados</h3>
          <p className="text-slate-400 mt-2 max-w-md">
            Comienza añadiendo los equipos a los que te vas a enfrentar para preparar los partidos.
          </p>
          {isEditMode && (
            <Button onClick={() => setIsModalOpen(true)} variant="secondary" className="mt-6">
              Añadir Primer Rival
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rivals.map((rival) => (
            <Link
              key={rival.id}
              href={`/rivales/${rival.id}`}
              className="group relative flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-3xl overflow-hidden hover:border-[#CC0E21]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,14,33,0.1)] hover:-translate-y-1"
            >
              {/* Parte superior con Escudo y Fondo */}
              <div className="h-32 bg-slate-950 relative flex items-center justify-center p-6 border-b border-slate-800/50">
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent z-0" />
                
                {rival.escudo_url ? (
                  <img
                    src={rival.escudo_url}
                    alt={rival.nombre}
                    className="h-20 w-20 object-contain z-10 group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10 group-hover:scale-110 transition-transform duration-500">
                    <Target className="h-8 w-8 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Info inferior */}
              <div className="p-5 flex-1 flex flex-col justify-between relative bg-slate-900/40">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-[#CC0E21] transition-colors leading-tight">
                    {rival.nombre}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-xs font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{rival.campo_nombre || 'Campo sin especificar'}</span>
                  </div>
                </div>
                
                {isEditMode && (
                  <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(rival.id, e)}
                      className="p-1.5 bg-red-950 text-red-500 hover:text-red-400 rounded-lg transition-colors border border-red-900/50"
                      title="Eliminar rival"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal Nuevo Rival */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Añadir Nuevo Rival"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nombre del Equipo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] transition-colors"
              placeholder="Ej: Danok Bat Juvenil A"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              URL del Escudo (Opcional)
            </label>
            <input
              type="url"
              value={formData.escudo_url}
              onChange={(e) => setFormData({ ...formData, escudo_url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-slate-600 transition-colors"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nombre del Campo (Opcional)
            </label>
            <input
              type="text"
              value={formData.campo_nombre}
              onChange={(e) => setFormData({ ...formData, campo_nombre: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-slate-600 transition-colors"
              placeholder="Ej: Mallona"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !formData.nombre.trim()}
              loading={isSubmitting}
            >
              Crear Rival
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
