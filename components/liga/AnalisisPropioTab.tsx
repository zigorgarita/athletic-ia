'use client';

import React, { useState } from 'react';
import { Match } from '@/types';
import { useMatchOwnAnalysisVideos } from '@/hooks/useMatchOwnAnalysisVideos';
import { DriveResumableUploader } from '@/lib/drive-resumable';
import { DriveUploadContext } from '@/lib/drive-folders';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { VideoPlayerModal } from './VideoPlayerModal';
import {
  Film, Link as LinkIcon, Upload, Play, Trash2, Plus, AlertCircle,
  Video, Sparkles, RefreshCw, Shield, Sword,
  Zap, Target, Eye, User, Activity, FolderOpen
} from 'lucide-react';

interface AnalisisPropioTabProps {
  match: Match;
}

interface CategoryConfig {
  id: string;
  label: string;
  subCategoryFolder: string;
  icon: React.ElementType;
  description: string;
  allowUpload: boolean; // false for "Partido completo" (URL only)
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'PARTIDO_COMPLETO',
    label: 'Partido completo',
    subCategoryFolder: 'Partido_Completo',
    icon: Film,
    description: 'Enlace de YouTube del partido completo (principalmente en vídeo externo).',
    allowUpload: false
  },
  {
    id: 'ANALISIS_DEL_PARTIDO',
    label: 'Análisis del partido',
    subCategoryFolder: 'Analisis_del_Partido',
    icon: Activity,
    description: 'Vídeos y análisis globales exportados desde NACSPORT.',
    allowUpload: true
  },
  {
    id: 'GOLES_A_FAVOR',
    label: 'Goles a favor',
    subCategoryFolder: 'Goles_A_Favor',
    icon: Target,
    description: 'Acciones de gol marcados por nuestro equipo.',
    allowUpload: true
  },
  {
    id: 'GOLES_EN_CONTRA',
    label: 'Goles en contra',
    subCategoryFolder: 'Goles_En_Contra',
    icon: Shield,
    description: 'Acciones de gol encajados para análisis defensivo.',
    allowUpload: true
  },
  {
    id: 'ATAQUES',
    label: 'Ataques',
    subCategoryFolder: 'Ataques',
    icon: Sword,
    description: 'Secuencias ofensivas en campo contrario.',
    allowUpload: true
  },
  {
    id: 'TRANSICIONES_OFENSIVAS',
    label: 'Transiciones ofensivas',
    subCategoryFolder: 'Transiciones_Ofensivas',
    icon: Zap,
    description: 'Contraataques y robos tras pérdida rival.',
    allowUpload: true
  },
  {
    id: 'OCASIONES_A_FAVOR',
    label: 'Ocasiones a favor',
    subCategoryFolder: 'Ocasiones_A_Favor',
    icon: Sparkles,
    description: 'Remates y acciones de peligro generado.',
    allowUpload: true
  },
  {
    id: 'DEFENSA',
    label: 'Defensa',
    subCategoryFolder: 'Defensa',
    icon: Shield,
    description: 'Organización y bloques defensivos.',
    allowUpload: true
  },
  {
    id: 'TRANSICIONES_DEFENSIVAS',
    label: 'Transiciones defensivas',
    subCategoryFolder: 'Transiciones_Defensivas',
    icon: RefreshCw,
    description: 'Pérdidas de balón y repliegue defensivo.',
    allowUpload: true
  },
  {
    id: 'OCASIONES_EN_CONTRA',
    label: 'Ocasiones en contra',
    subCategoryFolder: 'Ocasiones_En_Contra',
    icon: AlertCircle,
    description: 'Acciones de peligro concedidas al rival.',
    allowUpload: true
  },
  {
    id: 'ACCIONES_A_VIGILAR',
    label: 'Acciones a vigilar',
    subCategoryFolder: 'Acciones_A_Vigilar',
    icon: Eye,
    description: 'Detalles específicos y correcciones individuales/colectivas.',
    allowUpload: true
  },
  {
    id: 'PERSONALIZADOS',
    label: 'Vídeos personalizados',
    subCategoryFolder: 'Videos_Personalizados',
    icon: Video,
    description: 'Cortes personalizados del cuerpo técnico.',
    allowUpload: true
  },
  {
    id: 'VIDEOS_AITOR',
    label: 'Vídeos Aitor',
    subCategoryFolder: 'Videos_Aitor',
    icon: User,
    description: 'Cortes e informes preparados por Aitor.',
    allowUpload: true
  }
];

export function AnalisisPropioTab({ match }: AnalisisPropioTabProps) {
  const { isEditMode } = useEditMode();
  const { videos, loading, creating, deleting, addVideo, deleteVideo } = useMatchOwnAnalysisVideos(match.id);

  // Selected video modal player
  const [activeVideoModal, setActiveVideoModal] = useState<{ url: string; title: string; origin: 'Enlace' | 'Archivo' } | null>(null);

  // Forms per category
  const [activeForms, setActiveForms] = useState<Record<string, { mode: 'link' | 'file'; url: string; title: string }>>({});
  const [activeFiles, setActiveFiles] = useState<Record<string, File | null>>({});
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const getFormState = (catId: string) => {
    return activeForms[catId] || { mode: 'link', url: '', title: '' };
  };

  const updateFormState = (catId: string, updates: Partial<{ mode: 'link' | 'file'; url: string; title: string }>) => {
    setActiveForms((prev) => ({
      ...prev,
      [catId]: { ...getFormState(catId), ...updates }
    }));
  };

  // Submit Link URL
  const handleAddLink = async (category: CategoryConfig) => {
    const form = getFormState(category.id);
    if (!form.url.trim()) return;

    await addVideo({
      match_id: match.id,
      categoria: category.id,
      titulo: form.title.trim() || category.label,
      video_url: form.url.trim(),
      drive_file_id: null,
      tipo_origen: 'Enlace',
      tamano_bytes: null
    });

    updateFormState(category.id, { url: '', title: '' });
  };

  // Submit File Upload to Drive
  const handleUploadFile = async (category: CategoryConfig) => {
    const file = activeFiles[category.id];
    if (!file) return;

    setUploadingCategory(category.id);
    setUploadProgress(0);

    try {
      const uploadContext: DriveUploadContext = {
        season: '2026-27',
        module: 'PARTIDOS',
        entityName: `${match.fecha}_J${match.jornada ? String(match.jornada).padStart(2, '0') : '00'}_${match.rival}`,
        subCategory: `Analisis_Propio/${category.subCategoryFolder}`
      };

      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const uploader = new DriveResumableUploader({
        file,
        passkey,
        uploadContext,
        onProgress: (info) => {
          setUploadProgress(info.percent);
        }
      });

      const info = await uploader.start();

      if (info.driveFileId) {
        const form = getFormState(category.id);
        await addVideo({
          match_id: match.id,
          categoria: category.id,
          titulo: form.title.trim() || file.name,
          video_url: null,
          drive_file_id: info.driveFileId,
          tipo_origen: 'Archivo',
          tamano_bytes: file.size
        });

        setActiveFiles((prev) => ({ ...prev, [category.id]: null }));
        updateFormState(category.id, { title: '' });
      }
    } catch (err: unknown) {
      alert(`Error subiendo vídeo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploadingCategory(null);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 bg-slate-800 rounded-xl" />
          <Skeleton className="h-32 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 sm:p-4">
      {/* Banner de Cabecera de Análisis Propio */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Análisis Propio — NACSPORT & Multimedia</h2>
            <p className="text-sm text-slate-400">
              Espacio exclusivo del analista. Vídeos exportados de NACSPORT organizados por categorías en Google Drive 5 TB.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de las 13 Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CATEGORIES.map((category) => {
          const categoryVideos = videos.filter((v) => v.categoria === category.id);
          const form = getFormState(category.id);
          const currentFile = activeFiles[category.id];
          const isCategoryUploading = uploadingCategory === category.id;

          const IconComponent = category.icon;

          return (
            <div
              key={category.id}
              className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 ${
                category.id === 'PARTIDO_COMPLETO'
                  ? 'border-red-500/30 bg-gradient-to-b from-red-950/10 via-slate-900 to-slate-900 lg:col-span-2'
                  : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header de la Categoría */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        category.id === 'PARTIDO_COMPLETO'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-slate-800 text-indigo-400 border border-slate-700'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        {category.label}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-normal">
                          {categoryVideos.length} {categoryVideos.length === 1 ? 'vídeo' : 'vídeos'}
                        </span>
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4">{category.description}</p>

                {/* Formulario de Añadir (Si Modo Edición Activo) */}
                {isEditMode && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-4 space-y-3">
                    {/* Selector Pegar URL vs Arrastrar/Subir archivo */}
                    {category.allowUpload ? (
                      <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-medium w-fit">
                        <button
                          type="button"
                          onClick={() => updateFormState(category.id, { mode: 'link' })}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                            form.mode === 'link'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          Pegar URL
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormState(category.id, { mode: 'file' })}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                            form.mode === 'file'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Arrastrar / Subir archivo
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                        <LinkIcon className="w-3.5 h-3.5" />
                        Pegar URL (YouTube / Enlace Externo)
                      </div>
                    )}

                    {/* Título opcional */}
                    <input
                      type="text"
                      placeholder="Título / Descripción opcional..."
                      value={form.title}
                      onChange={(e) => updateFormState(category.id, { title: e.target.value })}
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    {/* Input de Enlace */}
                    {form.mode === 'link' || !category.allowUpload ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder={
                            category.id === 'PARTIDO_COMPLETO'
                              ? 'https://www.youtube.com/watch?v=...'
                              : 'URL del vídeo (YouTube, Drive, MP4)...'
                          }
                          value={form.url}
                          onChange={(e) => updateFormState(category.id, { url: e.target.value })}
                          className="flex-1 text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <Button
                          disabled={!form.url.trim() || creating}
                          onClick={() => handleAddLink(category)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Añadir
                        </Button>
                      </div>
                    ) : (
                      /* Input de Archivo Drive */
                      <div className="space-y-2">
                        <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 text-center transition-colors">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setActiveFiles((prev) => ({ ...prev, [category.id]: e.target.files![0] }));
                              }
                            }}
                            className="hidden"
                            id={`file-upload-${category.id}`}
                          />
                          <label
                            htmlFor={`file-upload-${category.id}`}
                            className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                          >
                            <Upload className="w-5 h-5 text-indigo-400" />
                            <span className="text-xs text-slate-300 font-medium">
                              {currentFile ? currentFile.name : 'Haz clic o arrastra un vídeo exportado de NACSPORT'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Subida directa al Google Drive de 5 TB
                            </span>
                          </label>
                        </div>

                        {/* Barra de Progreso */}
                        {isCategoryUploading && (
                          <div className="space-y-1 bg-slate-900 p-2.5 rounded-lg border border-indigo-500/30">
                            <div className="flex justify-between text-xs text-slate-300">
                              <span>Subiendo a Google Drive...</span>
                              <span className="font-bold text-indigo-400">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {currentFile && !isCategoryUploading && (
                          <Button
                            onClick={() => handleUploadFile(category)}
                            disabled={uploadingCategory !== null}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Subir archivo a Google Drive
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de Vídeos Subidos / Enlazados */}
                {categoryVideos.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                    Sin vídeos registrados en esta categoría
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {categoryVideos.map((vid) => (
                      <div
                        key={vid.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl hover:border-indigo-500/40 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <button
                            onClick={() =>
                              setActiveVideoModal({
                                url: vid.video_url || `drive://${vid.drive_file_id}`,
                                title: vid.titulo || category.label,
                                origin: vid.tipo_origen
                              })
                            }
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4 fill-indigo-400" />
                          </button>
                          <div className="truncate text-left">
                            <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                              {vid.titulo || category.label}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                {vid.tipo_origen === 'Archivo' ? (
                                  <>
                                    <FolderOpen className="w-3 h-3 text-emerald-400" />
                                    Google Drive
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="w-3 h-3 text-blue-400" />
                                    Enlace
                                  </>
                                )}
                              </span>
                              {vid.tamano_bytes && (
                                <span>{(vid.tamano_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setActiveVideoModal({
                                url: vid.video_url || `drive://${vid.drive_file_id}`,
                                title: vid.titulo || category.label,
                                origin: vid.tipo_origen
                              })
                            }
                            className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                          >
                            Ver
                          </button>
                          {isEditMode && (
                            <button
                              disabled={deleting === vid.id}
                              onClick={() => deleteVideo(vid.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor Modal de Vídeo */}
      {activeVideoModal && (
        <VideoPlayerModal
          isOpen={!!activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
          videoUrl={activeVideoModal.url}
          title={activeVideoModal.title}
          tipoOrigen={activeVideoModal.origin}
        />
      )}
    </div>
  );
}
