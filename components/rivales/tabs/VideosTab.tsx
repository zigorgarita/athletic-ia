'use client';
import React, { useState } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubVideos, ClubVideo } from '@/hooks/useClubVideos';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Film, Plus, Search } from 'lucide-react';
import { VideoCard } from '@/components/videos/VideoCard';
import { MatchVideo } from '@/types';

interface VideosTabProps {
  club: Club | null;
  season: ClubSeason | null;
}

const CATEGORIAS = [
  'Salida de balón', 'Presión', 'Ataque organizado', 'Defensa organizada',
  'Transición ofensiva', 'Transición defensiva', 'ABP', 'Finalización', 'Jugadores'
];

export function VideosTab({ club, season }: VideosTabProps) {
  const { videos, loading, saveVideo, deleteVideo } = useClubVideos(club?.id, season?.id);
  const { isEditMode } = useEditMode();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<ClubVideo> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVideos = videos.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (v.titulo.toLowerCase().includes(term) ||
            v.categoria?.toLowerCase().includes(term) ||
            v.descripcion?.toLowerCase().includes(term));
  });

  const handleOpenModal = (video?: ClubVideo) => {
    if (video) {
      setEditingVideo(video);
    } else {
      setEditingVideo({
        tipo_origen: 'Enlace',
        tipo: 'Corte',
        categoria: 'Ataque organizado',
        fecha: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || !editingVideo.titulo || !editingVideo.url) return;
    
    setIsSaving(true);
    const success = await saveVideo(editingVideo);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  // Adaptador para usar VideoCard
  const mapToMatchVideo = (cv: ClubVideo): MatchVideo => ({
    id: cv.id,
    titulo: cv.titulo,
    descripcion: cv.descripcion,
    video_url: cv.url,
    fecha_partido: cv.fecha || cv.created_at,
    created_at: cv.created_at,
  });

  const handlePlayAdapter = (video: MatchVideo) => {
    window.open(video.video_url, '_blank');
  };

  const handleEditAdapter = (video: MatchVideo) => {
    const original = videos.find(v => v.id === video.id);
    if (original) handleOpenModal(original);
  };

  const handleDeleteAdapter = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este vídeo?')) {
      await deleteVideo(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingVideo(prev => prev ? { ...prev, [name]: value } : null);
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
              placeholder="Buscar vídeos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Añadir Vídeo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <Film className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Sin vídeos</h3>
          <p className="text-slate-500 text-sm mt-2">No hay cortes de vídeo ni partidos subidos para este rival.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primer vídeo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(video => (
            <VideoCard 
              key={video.id} 
              video={mapToMatchVideo(video)} 
              onPlay={handlePlayAdapter} 
              onEdit={handleEditAdapter} 
              onDelete={handleDeleteAdapter} 
            />
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Vídeo */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVideo?.id ? "Editar Vídeo" : "Añadir Vídeo"}>
        {editingVideo && (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className={labelClass}>Título del vídeo <span className="text-red-500">*</span></label>
              <input required type="text" name="titulo" value={editingVideo.titulo || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Salida de balón presionados" />
            </div>

            <div>
              <label className={labelClass}>URL del Vídeo (YouTube, Hudl, Drive...) <span className="text-red-500">*</span></label>
              <input required type="url" name="url" value={editingVideo.url || ''} onChange={handleChange} className={inputClass} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Categoría Táctica</label>
                <select name="categoria" value={editingVideo.categoria || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de Vídeo</label>
                <select name="tipo" value={editingVideo.tipo || ''} onChange={handleChange} className={inputClass}>
                  <option value="Corte">Corte táctico</option>
                  <option value="Partido completo">Partido completo</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" name="fecha" value={editingVideo.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Descripción / Notas</label>
              <textarea name="descripcion" value={editingVideo.descripcion || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Anotaciones sobre este corte..." />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Vídeo</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
