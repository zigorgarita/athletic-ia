'use client';

import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Film, AlertCircle, CheckCircle2, Loader2, Pause, Play, X } from 'lucide-react';
import { isValidVideoUrl, parseVideoUrl } from '@/lib/video';
import { DriveResumableUploader, UploadProgressInfo } from '@/lib/drive-resumable';

interface VideoUploaderProps {
  initialUrl?: string;
  onVideoSelected: (data: {
    url: string;
    driveFileId?: string;
    fileType: 'Enlace' | 'Archivo';
    fileName?: string;
    mimeType?: string;
    tamanoBytes?: number;
  }) => void;
  className?: string;
}

export function VideoUploader({ initialUrl = '', onVideoSelected, className = '' }: VideoUploaderProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Resumable Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [uploader, setUploader] = useState<DriveResumableUploader | null>(null);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar URL en tiempo real
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    setUrlError(null);

    if (!val.trim()) return;

    if (!isValidVideoUrl(val.trim())) {
      setUrlError('URL de vídeo no reconocida. Introduce un enlace válido de YouTube, YouTube Shorts, Google Drive, Veo o MP4.');
    } else {
      setUrlError(null);
      onVideoSelected({
        url: val.trim(),
        fileType: 'Enlace'
      });
    }
  };

  // Subida por bloques reanudables a Google Drive
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i)) {
      setUploadError('Por favor, selecciona un archivo de vídeo válido (MP4, MOV, WEBM, MKV, etc.).');
      return;
    }

    setUploadError(null);
    const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

    const newUploader = new DriveResumableUploader({
      file,
      passkey,
      onProgress: (info) => {
        setProgressInfo(info);
        if (info.status === 'completado' && info.driveFileId) {
          onVideoSelected({
            url: info.videoUrl || `https://drive.google.com/file/d/${info.driveFileId}/preview`,
            driveFileId: info.driveFileId,
            fileType: 'Archivo',
            fileName: file.name,
            mimeType: file.type || 'video/mp4',
            tamanoBytes: file.size,
          });
        }
      },
    });

    setUploader(newUploader);
    const result = await newUploader.start();

    if (result.status === 'fallido') {
      setUploadError(result.errorMessage || 'Error durante la subida por bloques a Google Drive.');
    }
  };

  const handlePause = () => {
    if (uploader) uploader.pause();
  };

  const handleResume = () => {
    if (uploader) uploader.start();
  };

  const handleCancel = () => {
    if (uploader) uploader.cancel();
    setUploader(null);
    setProgressInfo(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const parsedInfo = urlInput.trim() ? parseVideoUrl(urlInput.trim()) : null;
  const isUploading = progressInfo?.status === 'subiendo' || progressInfo?.status === 'pausado';

  return (
    <div className={`space-y-4 bg-slate-950/60 border border-slate-850 p-4.5 rounded-2xl ${className}`}>
      
      {/* Selector de Modalidad */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 text-[#CC0E21]" /> Método de Incorporación de Vídeo
        </span>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'url' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="h-3 w-3" /> Pegar Enlace (YouTube / Drive / Veo)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'upload' ? 'bg-[#CC0E21] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="h-3 w-3" /> Arrastrar / Subir Archivo
          </button>
        </div>
      </div>

      {/* MODALIDAD A: Pegar URL */}
      {activeTab === 'url' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              URL del Vídeo (YouTube, Shorts, Drive, Veo o MP4 Directo) <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="Ej: https://app.veo.co/matches/... o https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600"
            />
          </div>

          {urlError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{urlError}</span>
            </div>
          )}

          {parsedInfo && !urlError && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              <span>Vídeo reconocido correctamente ({parsedInfo.type.toUpperCase()}).</span>
            </div>
          )}
        </div>
      )}

      {/* MODALIDAD B: Arrastrar o Seleccionar Archivo (Google Drive Resumable API) */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          {!isUploading && progressInfo?.status !== 'completado' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[#CC0E21] bg-[#CC0E21]/10 scale-[1.01]'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              
              <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Upload className="h-6 w-6 text-[#CC0E21]" />
              </div>

              <p className="text-xs font-bold text-slate-200 mb-1">
                Arrastra y suelta tu archivo de vídeo aquí, o <span className="text-[#CC0E21] underline">examina tus archivos</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Soporta partidos enteros (500 MB a 2 GB+). Subida reanudable directa a Google Drive por bloques de 8 MB.
              </p>
            </div>
          )}

          {/* Panel de Progreso Activo */}
          {isUploading && progressInfo && (
            <div className="space-y-3 p-4 bg-slate-900 rounded-xl border border-slate-800 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-[#CC0E21]" />
                  {progressInfo.status === 'pausado' ? 'Subida en Pausa' : 'Subiendo a Google Drive...'}
                </span>
                <span className="font-bold text-[#CC0E21] text-sm">{progressInfo.percent}%</span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-[#CC0E21] h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(204,14,33,0.5)]"
                  style={{ width: `${progressInfo.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {(progressInfo.bytesUploaded / (1024 * 1024)).toFixed(1)} MB de {(progressInfo.totalBytes / (1024 * 1024)).toFixed(1)} MB
                  {progressInfo.speedMBps > 0 && ` (${progressInfo.speedMBps} MB/s)`}
                </span>

                <div className="flex items-center gap-2">
                  {progressInfo.status === 'subiendo' ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded flex items-center gap-1 text-[10px]"
                    >
                      <Pause className="h-3 w-3" /> Pausar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="px-2 py-1 bg-[#CC0E21] hover:bg-[#b00c1c] text-white rounded flex items-center gap-1 text-[10px]"
                    >
                      <Play className="h-3 w-3" /> Reanudar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-2 py-1 bg-slate-800 hover:bg-red-950 text-red-400 rounded flex items-center gap-1 text-[10px]"
                  >
                    <X className="h-3 w-3" /> Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Estado de Finalización */}
          {progressInfo?.status === 'completado' && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span>Vídeo subido y registrado con éxito en Google Drive.</span>
              </div>
              <button
                type="button"
                onClick={() => { setProgressInfo(null); setUploader(null); }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Subir otro
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Aviso de Subida</span>
              </div>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                {uploadError}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
