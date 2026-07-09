'use client';
import React, { useState } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubVideos, ClubVideo } from '@/hooks/useClubVideos';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Film, Plus, Trash2, Search, PlayCircle, ExternalLink, Calendar, Tag } from 'lucide-react';

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este vídeo?')) {
      await deleteVideo(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingVideo(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Determinar si es una URL de YouTube para mostrar thumbnail
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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
          {filteredVideos.map(video => {
            const ytId = getYouTubeId(video.url);
            
            return (
              <div 
                key={video.id} 
                className="group bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-[#CC0E21]/40 transition-all flex flex-col relative cursor-pointer"
                onClick={() => window.open(video.url, '_blank')}
              >
                {/* Miniatura del vídeo */}
                <div className="aspect-video bg-slate-950 relative border-b border-slate-800/50 overflow-hidden flex items-center justify-center">
                  {ytId ? (
                    <img 
                      src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                      onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`; }}
                      alt={video.titulo} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center">
                      <Film className="h-10 w-10 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </div>
                  )}
                  
                  {/* Overlay Play Icon */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-12 w-12 text-white/90 drop-shadow-lg" />
                  </div>

                  {/* Etiquetas Overlay */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <span className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] uppercase font-bold text-slate-200">
                      {video.tipo || 'Vídeo'}
                    </span>
                  </div>

                  {/* Actions */}
                  {isEditMode && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(video); }} 
                        className="p-1.5 bg-black/60 backdrop-blur-sm text-slate-300 hover:text-white transition-colors rounded-md"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(video.id, e)} 
                        className="p-1.5 bg-black/60 backdrop-blur-sm text-slate-300 hover:text-red-500 transition-colors rounded-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h4 className="font-bold text-slate-200 line-clamp-2 leading-tight group-hover:text-[#CC0E21] transition-colors">{video.titulo}</h4>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {video.categoria || 'Sin clasificar'}
                    </span>
                    {video.fecha && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(video.fecha).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>

                  {video.descripcion && (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {video.descripcion}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
