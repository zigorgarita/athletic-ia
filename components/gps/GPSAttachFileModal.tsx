'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GPSSession } from '@/types';
import { getStaffPasskey } from '@/lib/passkey';

interface GPSAttachFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: GPSSession | null;
  matchTitle: string;
  matchDate?: string;
  matchType?: string;
  onSuccess: (updated: {
    sessionId: string;
    drive_file_id: string;
    drive_file_url: string;
    file_name: string;
    file_hash: string;
  }) => void;
}

export function GPSAttachFileModal({
  isOpen,
  onClose,
  session,
  matchTitle,
  matchDate,
  matchType,
  onSuccess,
}: GPSAttachFileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    file_name: string;
    drive_file_url: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !session) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
        setErrorMsg('Formato no válido. Únicamente se admiten archivos brutos .xlsx y .csv del preparador físico.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
        setErrorMsg('Formato no válido. Únicamente se admiten archivos brutos .xlsx y .csv del preparador físico.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Selecciona un archivo .xlsx o .csv antes de continuar.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('session_id', session.id);

      const staffPasskey = getStaffPasskey();
      const headers: Record<string, string> = {};
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const res = await fetch('/api/gps/sessions/attach-file', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al subir el archivo a Google Drive.');
      }

      setSuccessInfo({
        file_name: data.file_name,
        drive_file_url: data.drive_file_url,
      });

      onSuccess({
        sessionId: session.id,
        drive_file_id: data.drive_file_id,
        drive_file_url: data.drive_file_url,
        file_name: data.file_name,
        file_hash: data.file_hash,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al adjuntar el archivo.';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setErrorMsg(null);
    setSuccessInfo(null);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Adjuntar Archivo Original a Drive
              </h3>
              <p className="text-xs text-slate-400">
                Sesión Histórica · Archivado Documental Seguro
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Match & Session Info */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-200">{matchTitle}</span>
              {matchDate && (
                <span className="text-slate-400 ml-2">
                  • {new Date(matchDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {matchType && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#CC0E21]/20 text-[#CC0E21]">
                {matchType}
              </span>
            )}
          </div>

          {/* Guarantee / Safe Guard Notice */}
          <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs space-y-1 text-indigo-200">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Garantía de inmutabilidad analítica</span>
            </div>
            <p className="text-indigo-300/80 leading-relaxed text-[11px]">
              Este proceso sube el archivo original (<code className="text-indigo-200 font-mono">.xlsx</code> / <code className="text-indigo-200 font-mono">.csv</code>) a Google Drive bajo <span className="font-semibold text-slate-200">01_PARTIDOS/&lt;Partido&gt;/GPS</span> y registra su enlace en la sesión. <strong className="text-white">NO se recalculan métricas, medias, gráficos ni datos de jugadores</strong>.
            </p>
          </div>

          {successInfo ? (
            /* Success State */
            <div className="p-5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-200">
                Archivo Original Vinculado con Éxito
              </h4>
              <p className="text-xs text-slate-300">
                Fichero: <span className="font-mono font-bold text-white">{successInfo.file_name}</span>
              </p>
              <div className="pt-2">
                <a
                  href={successInfo.drive_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Abrir en Google Drive
                </a>
              </div>
            </div>
          ) : (
            /* Upload State */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? 'border-indigo-500/60 bg-indigo-500/5'
                    : 'border-slate-750 hover:border-slate-600 bg-slate-950/30 hover:bg-slate-950/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-8 w-8 text-indigo-400 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <span className="inline-block text-[11px] text-indigo-400 font-semibold underline pt-1">
                      Clic para cambiar de archivo
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="h-8 w-8 text-slate-500 mx-auto" />
                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        Arrastra o haz clic para seleccionar el archivo bruto
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Formatos soportados: Excel (.xlsx) o CSV (.csv)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          {successInfo ? (
            <Button variant="secondary" onClick={handleClose}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Archivando en Drive...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Archivar y Enlazar</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
