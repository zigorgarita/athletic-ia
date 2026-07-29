'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState } from 'react';
import { Player } from '@/types';
import { usePlayerMultimedia } from '@/hooks/usePlayerMultimedia';
import { usePlayers } from '@/hooks/usePlayers';
import { DriveResumableUploader } from '@/lib/drive-resumable';
import { DriveUploadContext, sanitizeFolderName } from '@/lib/drive-folders';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { VideoPlayerModal } from '@/components/liga/VideoPlayerModal';
import { supabase } from '@/lib/supabase';
import {
  Film, Link as LinkIcon, Upload, Play, Trash2, Plus, AlertCircle,
  Video, Sparkles, FolderOpen, Eye, Check, Activity, Shield, User,
  Calendar, Layers, Filter
} from 'lucide-react';

interface PlayerMultimediaTabProps {
  player: Player;
}

export function PlayerMultimediaTab({ player }: PlayerMultimediaTabProps) {
  const { isEditMode } = useEditMode();
  const { items, loading, error, refetch, removePlayerAssignment } = usePlayerMultimedia(player.id);
  const { players } = usePlayers();

  // Filter state
  const [filter, setFilter] = useState<'ALL' | 'PARTIDO' | 'INDIVIDUAL'>('ALL');

  // Video viewer modal state
  const [activeVideoModal, setActiveVideoModal] = useState<{
    url: string;
    title: string;
    origin: 'Enlace' | 'Archivo';
    driveFileId?: string | null;
  } | null>(null);

  // Upload modal state (Type B: Individual Video)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Seguimiento Individual');
  const [comment, setComment] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [secondaryPlayerIds, setSecondaryPlayerIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const otherPlayers = players.filter((p) => p.id !== player.id);

  const filteredItems = items.filter((item) => {
    if (filter === 'PARTIDO') return item.tipo_origen_video === 'PARTIDO';
    if (filter === 'INDIVIDUAL') return item.tipo_origen_video === 'INDIVIDUAL';
    return true;
  });

  const handleToggleSecondaryPlayer = (pId: string) => {
    setSecondaryPlayerIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Seguimiento Individual');
    setComment('');
    setUrl('');
    setSelectedFile(null);
    setSecondaryPlayerIds([]);
    setUploadMode('link');
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Submit Link (Type B)
  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsUploading(true);
    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const videoId = crypto.randomUUID();

      // 1. Create player_videos record
      const { error: vidErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'player_videos',
        payload: {
          id: videoId,
          titulo: title.trim() || `Vídeo Individual - ${player.nombre}`,
          categoria: category.trim() || 'Seguimiento Individual',
          comentario_tecnico: comment.trim() || null,
          video_url: url.trim(),
          drive_file_id: null,
          tipo_origen: 'Enlace',
          tamano_bytes: null
        },
        conflict_columns: ['id'],
        staff_passkey: passkey
      });

      if (vidErr) throw vidErr;

      // 2. Target primary player
      const { error: targetErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'player_video_targets',
        payload: {
          video_id: videoId,
          player_id: player.id,
          is_primary: true
        },
        conflict_columns: ['video_id', 'player_id'],
        staff_passkey: passkey
      });

      if (targetErr) throw targetErr;

      // 3. Target secondary players
      for (const sId of secondaryPlayerIds) {
        await supabase.rpc('exec_secure_upsert', {
          target_table: 'player_video_targets',
          payload: {
            video_id: videoId,
            player_id: sId,
            is_primary: false
          },
          conflict_columns: ['video_id', 'player_id'],
          staff_passkey: passkey
        });
      }

      setIsUploadModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      alert(`Error al guardar vídeo: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit File Upload to Drive (Type B)
  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const uploadContext: DriveUploadContext = {
        season: '2026-27',
        module: 'SCOUTING',
        entityName: 'Jugadores',
        subCategory: sanitizeFolderName(`${player.nombre}_${player.apellidos}`)
      };

      const uploader = new DriveResumableUploader({
        file: selectedFile,
        passkey,
        uploadContext,
        onProgress: (info) => {
          setUploadProgress(info.percent);
        }
      });

      const info = await uploader.start();

      if (info.driveFileId) {
        const videoId = crypto.randomUUID();

        // 1. Create player_videos record
        const { error: vidErr } = await supabase.rpc('exec_secure_upsert', {
          target_table: 'player_videos',
          payload: {
            id: videoId,
            titulo: title.trim() || selectedFile.name,
            categoria: category.trim() || 'Seguimiento Individual',
            comentario_tecnico: comment.trim() || null,
            video_url: null,
            drive_file_id: info.driveFileId,
            tipo_origen: 'Archivo',
            tamano_bytes: selectedFile.size
          },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

        if (vidErr) throw vidErr;

        // 2. Target primary player
        const { error: targetErr } = await supabase.rpc('exec_secure_upsert', {
          target_table: 'player_video_targets',
          payload: {
            video_id: videoId,
            player_id: player.id,
            is_primary: true
          },
          conflict_columns: ['video_id', 'player_id'],
          staff_passkey: passkey
        });

        if (targetErr) throw targetErr;

        // 3. Target secondary players
        for (const sId of secondaryPlayerIds) {
          await supabase.rpc('exec_secure_upsert', {
            target_table: 'player_video_targets',
            payload: {
              video_id: videoId,
              player_id: sId,
              is_primary: false
            },
            conflict_columns: ['video_id', 'player_id'],
            staff_passkey: passkey
          });
        }

        setIsUploadModalOpen(false);
        resetForm();
        refetch();
      }
    } catch (err: any) {
      alert(`Error al subir archivo a Google Drive: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAssignment = async (item: typeof items[0]) => {
    const confirmMsg = `¿Deseas desvincular a ${player.nombre} de este vídeo?\n(El archivo original y la presencia en otros partidos/jugadores no se borrarán).`;
    if (!confirm(confirmMsg)) return;

    const ok = await removePlayerAssignment(item.id, item.tipo_origen_video);
    if (!ok) {
      alert('Error al desvincular el vídeo.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-full bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 bg-slate-800 rounded-xl" />
          <Skeleton className="h-40 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar with Action & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Videoteca de {player.nombre} {player.apellidos}
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                {items.length} vídeos
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cortes asignados de partidos (Tipo A) y vídeos de seguimiento individual (Tipo B).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isEditMode && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Añadir Vídeo Individual
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-850 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            filter === 'ALL'
              ? 'bg-slate-800 text-slate-100 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          Todos ({items.length})
        </button>
        <button
          onClick={() => setFilter('PARTIDO')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            filter === 'PARTIDO'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Cortes de Partido ({items.filter((i) => i.tipo_origen_video === 'PARTIDO').length})
        </button>
        <button
          onClick={() => setFilter('INDIVIDUAL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            filter === 'INDIVIDUAL'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Seguimiento Individual ({items.filter((i) => i.tipo_origen_video === 'INDIVIDUAL').length})
        </button>
      </div>

      {/* Grid of Video Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-2">
          <Film className="w-10 h-10 text-slate-700 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-400">Sin vídeos registrados</h4>
          <p className="text-xs text-slate-500">
            {filter === 'ALL'
              ? 'No hay vídeos de partido ni seguimiento individual vinculados a este jugador.'
              : filter === 'PARTIDO'
              ? 'No se han asignado cortes de partido a este jugador.'
              : 'No se han registrado vídeos de seguimiento individual.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isMatch = item.tipo_origen_video === 'PARTIDO';
            return (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden hover:border-indigo-500/40 transition-all shadow-sm group"
              >
                {/* Top Border Indicator */}
                <div
                  className={`absolute top-0 right-0 left-0 h-1 ${
                    isMatch ? 'bg-indigo-500' : 'bg-purple-500'
                  }`}
                />

                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                        isMatch
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}
                    >
                      {isMatch ? 'Corte de Partido' : 'Seguimiento Individual'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">
                      {item.categoria}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {item.titulo}
                  </h4>

                  {/* Contextual Metadata */}
                  {isMatch && item.matchContext ? (
                    <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-850 p-2 rounded-lg space-y-0.5">
                      <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {item.matchContext.jornada} vs {item.matchContext.rival}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.matchContext.fecha} ({item.matchContext.es_local ? 'Local' : 'Visitante'})
                      </div>
                    </div>
                  ) : null}

                  {/* Comments */}
                  {item.comentario_tecnico && (
                    <p className="text-xs text-slate-400 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-850">
                      "{item.comentario_tecnico}"
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-2">
                  <button
                    onClick={() =>
                      setActiveVideoModal({
                        url: item.video_url || (item.drive_file_id ? `/api/google-drive/stream/${item.drive_file_id}` : ''),
                        title: item.titulo,
                        origin: item.tipo_origen,
                        driveFileId: item.drive_file_id
                      })
                    }
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-lg transition-colors font-medium"
                  >
                    <Play className="w-3.5 h-3.5 fill-indigo-400" />
                    Ver Vídeo
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      {item.tipo_origen === 'Archivo' ? (
                        <>
                          <FolderOpen className="w-3 h-3 text-emerald-400" />
                          Drive
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-3 h-3 text-blue-400" />
                          Enlace
                        </>
                      )}
                    </span>

                    {isEditMode && (
                      <button
                        onClick={() => handleRemoveAssignment(item)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Desvincular vídeo de este jugador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Subir Vídeo Individual (Tipo B) */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => {
            if (!isUploading) {
              setIsUploadModalOpen(false);
              resetForm();
            }
          }}
          title={`Añadir Vídeo Individual: ${player.nombre} ${player.apellidos}`}
        >
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setUploadMode('link')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  uploadMode === 'link'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Pegar URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  uploadMode === 'file'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Arrastrar / Subir archivo
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título del Vídeo</label>
                <input
                  type="text"
                  placeholder="Ej: Análisis de desmarques al espacio"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Seguimiento Individual"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Jugador Principal</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-400 font-bold flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    #{player.dorsal} {player.nombre} {player.apellidos}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Comentario / Observación Técnica</label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos o aspectos a corregir..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              {/* Mode Link Input */}
              {uploadMode === 'link' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Dirección / URL del vídeo</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/... o enlace externo de Drive"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}

              {/* Mode File Drag & Drop */}
              {uploadMode === 'file' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Archivo de vídeo</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="player-file-upload"
                    />
                    <label htmlFor="player-file-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      <Upload className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs text-slate-300 font-medium">
                        {selectedFile ? selectedFile.name : 'Haz clic o arrastra el archivo de vídeo'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Se guardará en 06_SCOUTING/Jugadores/{player.nombre}_{player.apellidos} en Google Drive
                      </span>
                    </label>
                  </div>

                  {isUploading && (
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
                </div>
              )}

              {/* Secondary Players Selection */}
              {otherPlayers.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Etiquetar a otros jugadores secundarios (opcional)
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-850 rounded-xl p-2 bg-slate-950/40">
                    {otherPlayers.map((op) => {
                      const isChecked = secondaryPlayerIds.includes(op.id);
                      return (
                        <div
                          key={op.id}
                          onClick={() => handleToggleSecondaryPlayer(op.id)}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer border text-xs transition-colors ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-slate-100'
                              : 'bg-slate-900/30 border-slate-850 text-slate-400 hover:border-slate-750'
                          }`}
                        >
                          <span>
                            #{op.dorsal} {op.nombre} {op.apellidos} ({op.demarcacion})
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <Button
                variant="secondary"
                disabled={isUploading}
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetForm();
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={(e) => {
                  if (uploadMode === 'link') handleSubmitLink(e);
                  else handleUploadFile();
                }}
                disabled={isUploading || (uploadMode === 'link' ? !url.trim() : !selectedFile)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                {isUploading ? 'Subiendo...' : 'Guardar Vídeo Individual'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Visor Modal de Vídeo */}
      {activeVideoModal && (
        <VideoPlayerModal
          isOpen={!!activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
          videoUrl={activeVideoModal.url}
          title={activeVideoModal.title}
          tipoOrigen={activeVideoModal.origin}
          driveFileId={activeVideoModal.driveFileId}
        />
      )}
    </div>
  );
}
