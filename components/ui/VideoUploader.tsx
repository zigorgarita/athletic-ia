'use client';

import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Film, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { isValidVideoUrl, parseVideoUrl } from '@/lib/video';

interface VideoUploaderProps {
  initialUrl?: string;
  onVideoSelected: (data: { url: string; driveFileId?: string; fileType: 'Enlace' | 'Archivo'; fileName?: string }) => void;
  className?: string;
}

export function VideoUploader({ initialUrl = '', onVideoSelected, className = '' }: VideoUploaderProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time URL validation
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    setUrlError(null);

    if (!val.trim()) return;

    if (!isValidVideoUrl(val.trim())) {
      setUrlError('URL de vídeo no reconocida. Introduce un enlace válido de YouTube, YouTube Shorts, Google Drive o archivo mp4.');
    } else {
      setUrlError(null);
      onVideoSelected({
        url: val.trim(),
        fileType: 'Enlace'
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Por favor, selecciona un archivo de vídeo válido (MP4, MOV, WEBM, etc.).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    setUploadStatus('Preparando envío a Google Drive (5 TB)...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Intentar subir mediante API de servidor de Google Drive
      const res = await fetch('/api/google-drive/upload', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(70);

      const data = await res.json();

      if (res.ok && data.url) {
        setUploadProgress(100);
        setUploadStatus('Vídeo subido con éxito a Google Drive.');
        onVideoSelected({
          url: data.url,
          driveFileId: data.driveFileId,
          fileType: 'Archivo',
          fileName: file.name
        });
      } else {
        // Si las credenciales de Google Drive no están configuradas en .env.local, mostrar aviso claro
        const errMsg = data.error || 'Configuración de Google Drive pendiente en el servidor.';
        setUploadError(errMsg);
      }
    } catch (err: unknown) {
      console.error('Error al subir vídeo:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`Error de red al subir el vídeo: ${msg}`);
    } finally {
      setIsUploading(false);
    }
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

  return (
    <div className={`space-y-4 bg-slate-950/60 border border-slate-850 p-4.5 rounded-2xl ${className}`}>
      
      {/* Selector de Modalidad (Pestañas Conjuntas) */}
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
            <LinkIcon className="h-3 w-3" /> Pegar Enlace (YouTube / Drive)
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
              URL del Vídeo (YouTube, YouTube Shorts, Google Drive, MP4 Directo) <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="Ej: https://www.youtube.com/watch?v=... o https://drive.google.com/file/d/..."
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

      {/* MODALIDAD B: Arrastrar o Seleccionar Archivo a Google Drive */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
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
              Soporta vídeos horizontales (16:9) y verticales (9:16 Shorts/Reels). Almacenamiento directo en Google Drive (5 TB).
            </p>
          </div>

          {isUploading && (
            <div className="space-y-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#CC0E21]" />
                  {uploadStatus || 'Subiendo archivo...'}
                </span>
                <span className="font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#CC0E21] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Aviso de Configuración de Google Drive</span>
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
