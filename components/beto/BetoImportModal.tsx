/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HardDrive,
  RefreshCw,
  Info,
} from 'lucide-react';

interface BetoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
  season?: string;
}

export function BetoImportModal({
  isOpen,
  onClose,
  onSuccess,
  season = '2026-27',
}: BetoImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionType, setSessionType] = useState<'ENTRENAMIENTO' | 'PARTIDO' | 'OTRO'>('ENTRENAMIENTO');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    type: string;
    existing_session: any;
    message: string;
  } | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setDuplicateWarning(null);
      setSuccessData(null);

      // Autocompletar nombre preliminar a partir del archivo
      if (!sessionName) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setSessionName(cleanName);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      setError(null);
      setDuplicateWarning(null);
      setSuccessData(null);

      if (!sessionName) {
        const cleanName = dropped.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setSessionName(cleanName);
      }
    }
  };

  const handleUpload = async (forceOverwrite = false) => {
    if (!file) {
      setError('Por favor, selecciona un archivo Excel o CSV de OLIVER.');
      return;
    }

    setLoading(true);
    setError(null);
    if (!forceOverwrite) setDuplicateWarning(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('season', season);
      if (sessionName.trim()) formData.append('session_name', sessionName.trim());
      if (sessionDate.trim()) formData.append('session_date', sessionDate.trim());
      formData.append('session_type', sessionType);

      if (forceOverwrite) {
        formData.append('overwrite', 'true');
        if (duplicateWarning?.existing_session?.id) {
          formData.append('replace_session_id', duplicateWarning.existing_session.id);
        }
      }

      const res = await fetch('/api/beto/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la importación.');
      }

      if (data.duplicate_found) {
        setDuplicateWarning({
          type: data.duplicate_type,
          existing_session: data.existing_session,
          message: data.message,
        });
        setLoading(false);
        return;
      }

      // Éxito
      setSuccessData(data);
      setLoading(false);
      setTimeout(() => {
        if (data.session?.id) {
          onSuccess(data.session.id);
        }
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error inesperado al importar el archivo.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setSessionName('');
    setSessionDate('');
    setSessionType('ENTRENAMIENTO');
    setError(null);
    setDuplicateWarning(null);
    setSuccessData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-[#CC0E21] border border-red-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Importar Sesión OLIVER</h3>
              <p className="text-xs text-slate-400">
                Sube el archivo Excel (.xlsx, .xls) o CSV original de OLIVER
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Dropzone */}
          {!successData && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-950/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar archivo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Arrastra tu archivo aquí o <span className="text-[#CC0E21] underline">haz clic</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Formatos compatibles: .xlsx, .xls, .csv</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuración opcional */}
          {!successData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre de la Sesión (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: MD-2 Táctico o J03 vs Rival"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fecha (Opcional si viene en Excel)
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Sesión
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ENTRENAMIENTO', 'PARTIDO', 'OTRO'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSessionType(t)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        sessionType === t
                          ? 'bg-red-600/20 text-white border-red-500/50 shadow-sm'
                          : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advertencia de duplicado */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5 text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-sm">Sesión ya existente detectada</p>
                  <p className="text-slate-300">{duplicateWarning.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reemplazar / Actualizar Sesión
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Éxito Banner */}
          {successData && (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">¡Sesión Importada con Éxito!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Se registraron <strong>{successData.total_players}</strong> jugadores ({successData.mapped_players} vinculados a la plantilla).
                </p>
              </div>

              {successData.drive_file_url && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 mt-2">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copia original respaldada en Google Drive</span>
                </div>
              )}
            </div>
          )}

          {/* Info footer */}
          {!successData && (
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                El archivo original se guardará automáticamente en Google Drive y todas las columnas originales se preservarán en <code>raw_metrics</code>.
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        {!successData && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleUpload(false)}
              disabled={loading || !file}
              className="flex items-center gap-2 px-5 py-2 bg-[#CC0E21] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/10 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando y Guardando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar Sesión</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
