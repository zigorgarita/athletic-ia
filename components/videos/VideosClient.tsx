'use client';

import React, { useState, useMemo } from 'react';
import { Film, Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMatchVideos } from '@/hooks/useMatchVideos';
import { useUpdateMatchVideo } from '@/hooks/useUpdateMatchVideo';
import { useDeleteMatchVideo } from '@/hooks/useDeleteMatchVideo';
import { MatchVideo } from '@/types';
import { VideoCard } from '@/components/videos/VideoCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEditMode } from '@/context/EditModeContext';

// Lazy load modales pesados
const VideoFormModal = dynamic(
  () => import('@/components/videos/VideoFormModal').then((mod) => mod.VideoFormModal),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full rounded-2xl" />,
  }
);

const VideoPlayerModal = dynamic(
  () => import('@/components/videos/VideoPlayerModal').then((mod) => mod.VideoPlayerModal),
  {
    ssr: false,
  }
);

const MESES = [
  { value: 'all', label: 'Todos los meses' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function VideosClient() {
  const { isEditMode } = useEditMode();
  const { videos, loading, creating, error: fetchError, createVideo, refetch } = useMatchVideos();
  const { updateVideo, loading: updating } = useUpdateMatchVideo();
  const { deleteVideo } = useDeleteMatchVideo();

  // Estados de control de modales
  const [activeVideo, setActiveVideo] = useState<MatchVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MatchVideo | null>(null);

  // Estados de filtrado
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  const [actionError, setActionError] = useState<string | null>(null);

  // Obtener los años únicos disponibles en los videos para el filtro, más años base
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    videos.forEach((v) => {
      if (v.fecha_partido) {
        const year = v.fecha_partido.split('-')[0];
        if (year) years.add(year);
      }
    });
    // Asegurar que al menos el año actual y anterior estén
    const currentYear = new Date().getFullYear().toString();
    const prevYear = (new Date().getFullYear() - 1).toString();
    years.add(currentYear);
    years.add(prevYear);

    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'all', label: 'Todos los años' },
      ...sortedYears.map((y) => ({ value: y, label: y })),
    ];
  }, [videos]);

  // Filtrado de videos en el cliente
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = video.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.descripcion && video.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!video.fecha_partido) return matchesSearch;
      const [year, month] = video.fecha_partido.split('-');

      const matchesMonth = selectedMonth === 'all' || Number(month) === Number(selectedMonth);
      const matchesYear = selectedYear === 'all' || year === selectedYear;

      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [videos, searchQuery, selectedMonth, selectedYear]);

  // Manejar el submit del formulario (Creación y Edición)
  const handleFormSubmit = async (data: Omit<MatchVideo, 'id' | 'created_at'>) => {
    setActionError(null);
    try {
      if (editingVideo) {
        // Modo Edición
        const updated = await updateVideo(editingVideo.id, data);
        if (updated) {
          setIsFormOpen(false);
          setEditingVideo(null);
          refetch();
        } else {
          setActionError('Error al actualizar el video.');
        }
      } else {
        // Modo Creación
        const created = await createVideo(data);
        if (created) {
          setIsFormOpen(false);
          refetch();
        } else {
          setActionError('Error al registrar el video.');
        }
      }
    } catch (err) {
      console.error(err);
      setActionError('Ocurrió un error inesperado al guardar el video.');
    }
  };

  // Abrir reproductor
  const handlePlayVideo = (video: MatchVideo) => {
    setActiveVideo(video);
    setIsPlaying(true);
  };

  // Abrir formulario de edición
  const handleEditVideo = (video: MatchVideo) => {
    setEditingVideo(video);
    setIsFormOpen(true);
  };

  // Abrir formulario de creación
  const handleCreateVideoClick = () => {
    setEditingVideo(null);
    setIsFormOpen(true);
  };

  // Eliminar video
  const handleDeleteVideo = async (id: string) => {
    const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este video de análisis de partido?');
    if (!confirmDelete) return;

    const success = await deleteVideo(id);
    if (success) {
      refetch();
    } else {
      alert('Error al intentar eliminar el video.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Film className="h-8 w-8 text-[#CC0E21]" />
            Videos de Partidos
          </h1>
          <p className="text-slate-400 text-sm">
            Visualiza, añade y analiza resúmenes de partidos y análisis tácticos en video.
          </p>
        </div>
        {isEditMode && (
          <Button onClick={handleCreateVideoClick} className="flex items-center gap-1.5 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Añadir Video
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm shadow-md">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por título o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
          />
        </div>

        {/* Filtro Mes */}
        <Select
          label="Mes"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          options={MESES}
          className="bg-slate-950/60 border border-slate-800 focus:border-[#CC0E21] text-sm"
        />

        {/* Filtro Año */}
        <Select
          label="Año"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          options={yearOptions}
          className="bg-slate-950/60 border border-slate-800 focus:border-[#CC0E21] text-sm"
        />
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl animate-pulse" />
        </div>
      ) : fetchError ? (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/30 flex items-center justify-between text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h4 className="font-bold">Error al cargar videos</h4>
              <p className="text-xs text-red-500 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={refetch} className="flex items-center gap-1 hover:bg-red-500/10 py-1.5 px-3">
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-16 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <Film className="h-12 w-12 text-slate-700" />
          <div>
            <h3 className="text-lg font-bold text-slate-300">No se encontraron videos</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1 mx-auto">
              {videos.length === 0
                ? 'Aún no hay videos registrados en el sistema. Presiona "Añadir Video" arriba para comenzar.'
                : 'No hay videos que coincidan con los filtros aplicados actualmente. Intenta cambiar los criterios de búsqueda.'}
            </p>
          </div>
        </div>
      ) : (
        /* Listado Timeline Vertical */
        <div className="relative pl-6 border-l-2 border-slate-800/80 space-y-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="relative">
              {/* Indicador de Timeline (Punto rojo) */}
              <div className="absolute -left-[31px] top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950 border-2 border-[#CC0E21] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#CC0E21]" />
              </div>

              <VideoCard
                video={video}
                onPlay={handlePlayVideo}
                onEdit={handleEditVideo}
                onDelete={handleDeleteVideo}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal del Formulario (Crear/Editar) */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingVideo ? 'Editar Video de Análisis' : 'Añadir Video de Partido'}
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs">
              {actionError}
            </div>
          )}
          {isFormOpen && (
            <VideoFormModal
              video={editingVideo}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={creating || updating}
            />
          )}
        </div>
      </Modal>

      {/* Reproductor de Video */}
      <VideoPlayerModal
        isOpen={isPlaying}
        onClose={() => {
          setIsPlaying(false);
          setActiveVideo(null);
        }}
        video={activeVideo}
      />
    </div>
  );
}
