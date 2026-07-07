'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRivals } from '@/hooks/useRivals';
import { Rival, RivalVideo } from '@/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Target, ArrowLeft, Info, Film, Video, BarChart2, BookOpen, Save, MapPin, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { Modal } from '@/components/ui/Modal';

type TabType = 'INFO' | 'VIDEOS_COMPLETOS' | 'CORTES' | 'STATS' | 'NOTAS';

export function RivalDetailsClient({ rivalId }: { rivalId: string }) {
  const router = useRouter();
  const { isEditMode } = useEditMode();
  const { getRival, updateRival, getRivalVideos, createRivalVideo, deleteRivalVideo } = useRivals();
  
  const [rival, setRival] = useState<Rival | null>(null);
  const [videos, setVideos] = useState<RivalVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('INFO');
  
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Rival>>({});

  // Video Modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoType, setVideoType] = useState<'COMPLETO' | 'CORTE'>('COMPLETO');
  const [videoForm, setVideoForm] = useState({ titulo: '', url: '', comentarios: '' });
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const r = await getRival(rivalId);
      if (r) {
        setRival(r);
        setEditForm(r);
        const v = await getRivalVideos(rivalId);
        setVideos(v);
      }
      setLoading(false);
    };
    loadData();
  }, [rivalId, getRival, getRivalVideos]);

  const handleSaveInfo = async () => {
    if (!rival) return;
    setIsSaving(true);
    const updated = await updateRival(rival.id, editForm);
    if (updated) {
      setRival(updated);
    }
    setIsSaving(false);
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.titulo || !videoForm.url) return;
    
    setIsSubmittingVideo(true);
    const newVideo = await createRivalVideo({
      rival_id: rivalId,
      tipo: videoType,
      titulo: videoForm.titulo,
      url: videoForm.url,
      comentarios: videoForm.comentarios || null,
    });
    
    setIsSubmittingVideo(false);
    if (newVideo) {
      setVideos([newVideo, ...videos]);
      setIsVideoModalOpen(false);
      setVideoForm({ titulo: '', url: '', comentarios: '' });
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm('¿Eliminar este vídeo del scouting?')) {
      const success = await deleteRivalVideo(id);
      if (success) {
        setVideos(videos.filter(v => v.id !== id));
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <Skeleton className="h-10 w-32 bg-slate-800" />
        <Skeleton className="h-32 w-full bg-slate-800 rounded-3xl" />
        <Skeleton className="h-64 w-full bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (!rival) {
    return (
      <div className="p-4 md:p-8 text-center text-slate-400">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
        Rival no encontrado.
        <div className="mt-4">
          <Button onClick={() => router.push('/rivales')} variant="secondary">Volver</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'INFO', label: 'Info & Campo', icon: Info },
    { id: 'VIDEOS_COMPLETOS', label: 'Vídeos Completos', icon: Film },
    { id: 'CORTES', label: 'Cortes Tácticos', icon: Video },
    { id: 'STATS', label: 'Estadísticas', icon: BarChart2 },
    { id: 'NOTAS', label: 'La Libreta del Míster', icon: BookOpen },
  ] as const;

  const completos = videos.filter(v => v.tipo === 'COMPLETO');
  const cortes = videos.filter(v => v.tipo === 'CORTE');

  const getYoutubeEmbedUrl = (url: string) => {
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 p-4 md:p-8">
      {/* Botón Volver */}
      <Link
        href="/rivales"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Rivales
      </Link>

      {/* Header Rival */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CC0E21]/5 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="h-24 w-24 shrink-0 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden z-10 shadow-xl shadow-black/50">
          {rival.escudo_url ? (
            <img src={rival.escudo_url} alt={rival.nombre} className="h-20 w-20 object-contain" />
          ) : (
            <Target className="h-10 w-10 text-slate-600" />
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
            {rival.nombre}
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-slate-400">
            <span className="flex items-center gap-1.5 text-sm bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
              <MapPin className="h-4 w-4 text-[#CC0E21]" />
              {rival.campo_nombre || 'Sin definir'}
            </span>
            <span className="flex items-center gap-1.5 text-sm bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {rival.campo_superficie || 'Sin definir'}
            </span>
          </div>
        </div>
      </div>

      {/* Navegación Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-800 text-[#CC0E21] border border-[#CC0E21]/20 shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#CC0E21]' : ''}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido Tabs */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 min-h-[400px]">
        {/* PESTAÑA INFO Y CAMPO */}
        {activeTab === 'INFO' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-200">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Dimensiones del Campo
                  </label>
                  <input
                    type="text"
                    value={editForm.campo_dimensiones || ''}
                    onChange={(e) => setEditForm({...editForm, campo_dimensiones: e.target.value})}
                    disabled={!isEditMode}
                    placeholder="Ej: 100x65m"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Superficie
                  </label>
                  <input
                    type="text"
                    value={editForm.campo_superficie || ''}
                    onChange={(e) => setEditForm({...editForm, campo_superficie: e.target.value})}
                    disabled={!isEditMode}
                    placeholder="Ej: Hierba Artificial Última Generación"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Apuntes Adicionales (Distancia, vestuarios, etc)
                </label>
                <textarea
                  value={editForm.info_general || ''}
                  onChange={(e) => setEditForm({...editForm, info_general: e.target.value})}
                  disabled={!isEditMode}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 disabled:opacity-50 resize-none"
                  placeholder="Apuntes sobre la expedición o el campo..."
                />
              </div>
            </div>
            {isEditMode && (
              <div className="flex justify-end pt-4 border-t border-slate-800/50">
                <Button onClick={handleSaveInfo} variant="primary" loading={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Info
                </Button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA NOTAS (LA LIBRETA) */}
        {activeTab === 'NOTAS' && (
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                La Libreta del Míster
              </h3>
              {isEditMode && (
                <Button onClick={handleSaveInfo} variant="primary" loading={isSaving}>
                  Guardar Notas
                </Button>
              )}
            </div>
            <textarea
              value={editForm.notas_entrenador || ''}
              onChange={(e) => setEditForm({...editForm, notas_entrenador: e.target.value})}
              disabled={!isEditMode}
              className="w-full flex-1 min-h-[400px] bg-amber-50/5 border border-amber-900/30 rounded-xl p-6 text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-amber-700/50 resize-none disabled:opacity-70 shadow-inner"
              placeholder="Escribe aquí tu análisis táctico del rival. Puntos fuertes, debilidades, por dónde atacar, a quién marcar al hombre..."
            />
          </div>
        )}

        {/* PESTAÑA VÍDEOS / CORTES (Renderizado dinámico similar) */}
        {(activeTab === 'VIDEOS_COMPLETOS' || activeTab === 'CORTES') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                {activeTab === 'VIDEOS_COMPLETOS' ? <Film className="h-5 w-5 text-blue-500" /> : <Video className="h-5 w-5 text-purple-500" />}
                {activeTab === 'VIDEOS_COMPLETOS' ? 'Partidos Completos' : 'Cortes Analíticos'}
              </h3>
              {isEditMode && (
                <Button 
                  onClick={() => {
                    setVideoType(activeTab === 'VIDEOS_COMPLETOS' ? 'COMPLETO' : 'CORTE');
                    setIsVideoModalOpen(true);
                  }}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Añadir
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'VIDEOS_COMPLETOS' ? completos : cortes).map(video => (
                <div key={video.id} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col group">
                  <div className="aspect-video bg-black relative">
                    <iframe
                      src={getYoutubeEmbedUrl(video.url)}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200 line-clamp-1">{video.titulo}</h4>
                      {video.comentarios && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{video.comentarios}</p>
                      )}
                    </div>
                    {isEditMode && (
                      <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-end">
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(activeTab === 'VIDEOS_COMPLETOS' ? completos : cortes).length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-slate-700/50 rounded-2xl">
                  <p className="text-slate-500">No hay vídeos subidos en esta categoría.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA STATS (placeholder por ahora) */}
        {activeTab === 'STATS' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="h-16 w-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-300">Estadísticas en Desarrollo</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              Esta sección servirá para integrar datos de proveedores externos en el futuro.
            </p>
          </div>
        )}
      </div>

      {/* Modal Añadir Video */}
      <Modal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        title={`Añadir ${videoType === 'COMPLETO' ? 'Partido Completo' : 'Corte de Vídeo'}`}
      >
        <form onSubmit={handleCreateVideo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título</label>
            <input
              type="text"
              required
              value={videoForm.titulo}
              onChange={e => setVideoForm({...videoForm, titulo: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200"
              placeholder="Ej: Jornada 1 vs Eibar"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">URL (YouTube / Drive)</label>
            <input
              type="url"
              required
              value={videoForm.url}
              onChange={e => setVideoForm({...videoForm, url: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Comentarios (Opcional)</label>
            <textarea
              value={videoForm.comentarios}
              onChange={e => setVideoForm({...videoForm, comentarios: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 resize-none"
              rows={3}
              placeholder="Apuntes sobre este vídeo..."
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsVideoModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={isSubmittingVideo}>Añadir Vídeo</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
