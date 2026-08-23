'use client';
import React, { useState, useRef } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubDocuments, ClubDocument } from '@/hooks/useClubDocuments';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ReviewExtractedReportModal } from '../modals/ReviewExtractedReportModal';
import { FlexibleReportExtraction } from '@/types';
import { DriveResumableUploader, UploadProgressInfo } from '@/lib/drive-resumable';
import {
  FolderOpen, Plus, Trash2, Search, ExternalLink, Calendar,
  File, FileText, Image as ImageIcon, Link as LinkIcon,
  Sparkles, Upload, UploadCloud, CheckCircle2,
} from 'lucide-react';

interface DocumentsTabProps {
  club: Club | null;
  season: ClubSeason | null;
}

const TIPOS_DOCUMENTO = ['PDF', 'Informe', 'PowerPoint', 'Word', 'Excel', 'Imagen', 'Enlace'];

// Modo de origen del documento en el modal de creación
type UploadMode = 'file' | 'url';

export function DocumentsTab({ club, season }: DocumentsTabProps) {
  const { documents, loading, saveDocument, deleteDocument, refetch } = useClubDocuments(club?.id, season?.id);
  const { isEditMode, currentUser } = useEditMode();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<ClubDocument> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // IA Analysis states — sin cambios respecto al original
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [activeExtraction, setActiveExtraction] = useState<FlexibleReportExtraction | null>(null);
  const [activeDocForReview, setActiveDocForReview] = useState<ClubDocument | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Drive upload states — solo para el modal de creación
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<DriveResumableUploader | null>(null);

  // ────────────────────────────────────────────────────────────
  // Análisis IA — lógica original sin modificar
  // ────────────────────────────────────────────────────────────
  const handleAnalyzeDocument = async (doc: ClubDocument) => {
    try {
      setAnalyzingDocId(doc.id);

      if (doc.extraccion_json) {
        setActiveExtraction(doc.extraccion_json as FlexibleReportExtraction);
        setActiveDocForReview(doc);
        setIsReviewModalOpen(true);
        setAnalyzingDocId(null);
        return;
      }

      const editorUser = currentUser?.id || 'aitor';
      const editorPass = currentUser?.pass || '';

      const res = await fetch('/api/rivales/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-user': editorUser,
          'x-editor-pass': editorPass,
        },
        body: JSON.stringify({
          documentId: doc.id,
          clubId: club?.id,
          clubSeasonId: season?.id,
          rivalName: club?.nombre,
          season: season?.temporada,
          fileUrl: doc.url,
        }),
      });

      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? `Respuesta inesperada del servidor (no es JSON): ${rawText.slice(0, 200)}`
            : `Error del servidor [${res.status}]: ${rawText.slice(0, 300)}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error((data.error as string) || `Error al analizar documento [${res.status}]`);
      }

      const extraction = data.extraction as FlexibleReportExtraction | undefined;
      let totalObs = 0;
      if (extraction?.observacionesRival) {
        Object.values(extraction.observacionesRival).forEach((arr: unknown) => {
          if (Array.isArray(arr)) totalObs += arr.length;
        });
      }
      if (extraction?.propuestasDelAnalista) {
        Object.values(extraction.propuestasDelAnalista).forEach((arr: unknown) => {
          if (Array.isArray(arr)) totalObs += arr.length;
        });
      }
      if (Array.isArray(extraction?.amenazasJugadores)) {
        totalObs += extraction.amenazasJugadores.length;
      }

      if (totalObs === 0) {
        throw new Error('La IA no ha podido extraer observaciones tácticas del documento. Comprueba que el archivo contiene información deportiva comprensible y reinténtalo.');
      }

      setActiveExtraction(data.extraction as FlexibleReportExtraction);
      setActiveDocForReview(doc);
      setIsReviewModalOpen(true);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al procesar informe táctico: ${msg}`);
    } finally {
      setAnalyzingDocId(null);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Helpers de estado del modal
  // ────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.nombre.toLowerCase().includes(term) ||
      d.tipo?.toLowerCase().includes(term) ||
      d.comentario?.toLowerCase().includes(term)
    );
  });

  const resetUploadState = () => {
    setUploadProgress(null);
    setIsUploading(false);
    setSelectedFileName(null);
    uploaderRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenModal = (doc?: ClubDocument) => {
    if (doc) {
      setEditingDoc(doc);
      setUploadMode('url'); // Al editar un doc existente, siempre modo URL
    } else {
      setEditingDoc({ tipo: 'PDF', fecha: new Date().toISOString().split('T')[0] });
      setUploadMode('file'); // Al crear, por defecto modo subida
    }
    resetUploadState();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (uploaderRef.current && isUploading) {
      uploaderRef.current.cancel();
    }
    resetUploadState();
    setIsModalOpen(false);
  };

  // ────────────────────────────────────────────────────────────
  // Subida a Google Drive con DriveResumableUploader (existente)
  // ────────────────────────────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar formato
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Solo se admiten archivos PDF en este campo. Para otros formatos usa la opción "Enlace externo".');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validar tamaño (25 MB máximo — límite de Gemini para multimodal)
    const MAX_PDF_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_PDF_BYTES) {
      alert(`El archivo supera el límite de 25 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Comprime el PDF e inténtalo de nuevo.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFileName(file.name);
    setIsUploading(true);
    setUploadProgress({ status: 'pendiente', bytesUploaded: 0, totalBytes: file.size, percent: 0, speedMBps: 0 });

    // Rellenar nombre del documento si está vacío
    if (!editingDoc?.nombre) {
      const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
      setEditingDoc(prev => prev ? { ...prev, nombre: cleanName } : null);
    }

    const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
    const rivalSlug = club?.nombre ? club.nombre.replace(/\s+/g, '_') : 'Rival';

    const uploader = new DriveResumableUploader({
      file,
      passkey,
      uploadContext: {
        module: 'RIVALES',
        season: season?.temporada || '2026-27',
        entityName: rivalSlug,
        subCategory: 'Informes',
      },
      onProgress: (info: UploadProgressInfo) => {
        setUploadProgress(info);
      },
    });

    uploaderRef.current = uploader;

    try {
      const result = await uploader.start();

      if (result.status === 'completado' && result.driveFileId) {
        // La URL de Drive /view es exactamente el formato que downloadFileFromUrl
        // ya sabe convertir a descarga directa para el análisis con Gemini
        const driveViewUrl = `https://drive.google.com/file/d/${result.driveFileId}/view`;
        setEditingDoc(prev => prev ? { ...prev, url: driveViewUrl, tipo: 'PDF' } : null);
        setIsUploading(false);
      } else if (result.status === 'fallido') {
        throw new Error(result.errorMessage || 'Error desconocido durante la subida a Drive.');
      } else if (result.status === 'cancelado') {
        resetUploadState();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al subir el PDF a Google Drive: ${msg}`);
      resetUploadState();
    }
  };

  // ────────────────────────────────────────────────────────────
  // Guardar documento — lógica original sin modificar
  // ────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.nombre || !editingDoc.url) return;

    setIsSaving(true);
    const success = await saveDocument(editingDoc);
    setIsSaving(false);

    if (success) {
      handleCloseModal();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      await deleteDocument(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingDoc(prev => prev ? { ...prev, [name]: value } : null);
  };

  const getDocIcon = (tipo: string | null) => {
    switch (tipo) {
      case 'PDF': return <FileText className="h-8 w-8 text-red-500" />;
      case 'PowerPoint': return <File className="h-8 w-8 text-orange-500" />;
      case 'Word': return <File className="h-8 w-8 text-blue-500" />;
      case 'Excel': return <File className="h-8 w-8 text-emerald-500" />;
      case 'Imagen': return <ImageIcon className="h-8 w-8 text-purple-500" />;
      case 'Enlace': return <LinkIcon className="h-8 w-8 text-slate-400" />;
      default: return <File className="h-8 w-8 text-slate-500" />;
    }
  };

  if (!club) {
    return <div className="p-8 text-center text-slate-400">No hay datos del club disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  // El botón Guardar se deshabilita si está subiendo, guardando, o faltan campos obligatorios
  const isSaveDisabled = isSaving || isUploading || !editingDoc?.nombre || !editingDoc?.url;

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">

      {/* Cabecera y Buscador */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Subir Documento
          </Button>
        )}
      </div>

      {/* Lista de documentos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Carpeta vacía</h3>
          <p className="text-slate-500 text-sm mt-2">No hay documentos ni informes adjuntos para este rival.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="group bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col hover:border-[#CC0E21]/50 transition-all duration-300 cursor-pointer relative hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
              onClick={() => window.open(doc.url, '_blank')}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-800 to-slate-700 opacity-0 group-hover:opacity-100 group-hover:from-[#CC0E21] group-hover:to-red-500 transition-all duration-300 rounded-t-2xl" />
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/50">
                  {getDocIcon(doc.tipo)}
                </div>

                {isEditMode && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(doc); }}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-[#CC0E21] transition-colors">{doc.nombre}</h4>
                <div className="flex items-center flex-wrap gap-2 mt-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase text-slate-300">
                    {doc.tipo || 'Doc'}
                  </span>
                  {doc.version && (
                    <span className="bg-blue-950/80 text-blue-300 border border-blue-800/50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      v{doc.version}
                    </span>
                  )}
                  {doc.is_current_version === false && (
                    <span className="bg-amber-950/80 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      Histórica
                    </span>
                  )}
                  {doc.fecha && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.fecha).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                {doc.comentario && (
                  <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.comentario}
                  </p>
                )}
              </div>

              {/* Acciones de Análisis IA — sin cambios */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-semibold flex items-center gap-1">
                  {doc.estado_analisis === 'analizado' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Analizado {doc.analyzed_at ? `(${new Date(doc.analyzed_at).toLocaleDateString('es-ES')})` : ''}
                    </span>
                  ) : doc.estado_analisis === 'pendiente_confirmar' || doc.extraccion_json ? (
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      Pendiente de confirmar
                    </span>
                  ) : doc.estado_analisis === 'error' ? (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Error al procesar
                    </span>
                  ) : (
                    <span className="text-slate-500">Sin analizar</span>
                  )}
                </span>

                <button
                  onClick={(e) => { e.stopPropagation(); handleAnalyzeDocument(doc); }}
                  disabled={analyzingDocId === doc.id}
                  className="px-3 py-1.5 rounded-xl bg-[#CC0E21]/10 hover:bg-[#CC0E21] text-[#CC0E21] hover:text-white border border-[#CC0E21]/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${analyzingDocId === doc.id ? 'animate-spin' : ''}`} />
                  {analyzingDocId === doc.id
                    ? 'Analizando...'
                    : doc.estado_analisis === 'analizado'
                    ? 'Ver análisis'
                    : doc.extraccion_json || doc.estado_analisis === 'pendiente_confirmar'
                    ? 'Revisar Ingestión'
                    : 'Analizar informe con IA'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL Crear / Editar Documento
      ───────────────────────────────────────────────────────── */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDoc?.id ? 'Editar Documento' : 'Añadir Documento'}>
        {editingDoc && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Selector de modo — solo visible al CREAR (no al editar) */}
            {!editingDoc.id && (
              <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  id="doc-mode-file"
                  onClick={() => {
                    setUploadMode('file');
                    resetUploadState();
                    setEditingDoc(prev => prev ? { ...prev, url: undefined } : null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    uploadMode === 'file'
                      ? 'bg-[#CC0E21] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Subir desde mi ordenador
                </button>
                <button
                  type="button"
                  id="doc-mode-url"
                  onClick={() => {
                    setUploadMode('url');
                    resetUploadState();
                    setEditingDoc(prev => prev ? { ...prev, url: undefined } : null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    uploadMode === 'url'
                      ? 'bg-slate-700 text-slate-100 border border-slate-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Enlace externo
                </button>
              </div>
            )}

            {/* Nombre del documento */}
            <div>
              <label className={labelClass}>Nombre del documento <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                name="nombre"
                value={editingDoc.nombre || ''}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ej: Informe Rival Real Sociedad"
              />
            </div>

            {/* ── MODO ARCHIVO: selector de PDF con subida a Drive ── */}
            {uploadMode === 'file' && !editingDoc.id && (
              <div>
                <label className={labelClass}>Archivo PDF <span className="text-red-500">*</span></label>

                {/* Estado inicial: no se ha seleccionado archivo aún */}
                {!uploadProgress && !editingDoc.url && (
                  <label
                    htmlFor="pdf-file-input"
                    className="flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed border-slate-700 rounded-xl p-8 cursor-pointer hover:border-[#CC0E21]/50 hover:bg-slate-900/30 transition-all group"
                  >
                    <Upload className="h-8 w-8 text-slate-500 group-hover:text-[#CC0E21] transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                        Haz clic para seleccionar un PDF
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Se subirá a Google Drive · Máx. 25 MB</p>
                    </div>
                    <input
                      id="pdf-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleFileSelected}
                      disabled={isUploading}
                    />
                  </label>
                )}

                {/* Estado: subiendo en progreso */}
                {uploadProgress && (uploadProgress.status === 'subiendo' || uploadProgress.status === 'pendiente') && (
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="font-mono truncate max-w-[200px]">{selectedFileName}</span>
                      <span className="font-bold text-slate-200">{uploadProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#CC0E21] to-red-400 transition-all duration-300"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Subiendo a Google Drive...</span>
                      <span>{uploadProgress.speedMBps > 0 ? `${uploadProgress.speedMBps} MB/s` : ''}</span>
                    </div>
                  </div>
                )}

                {/* Estado: subida completada — Drive URL disponible */}
                {editingDoc.url && uploadProgress?.status === 'completado' && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-950/30 rounded-xl border border-emerald-800/50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-300">PDF subido a Google Drive</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{selectedFileName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetUploadState();
                        setEditingDoc(prev => prev ? { ...prev, url: undefined } : null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 shrink-0 ml-auto underline"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── MODO URL: campo de enlace externo (comportamiento original) ── */}
            {(uploadMode === 'url' || editingDoc.id) && (
              <div>
                <label className={labelClass}>URL del Archivo (Drive, Dropbox...) <span className="text-red-500">*</span></label>
                <input
                  required
                  type="url"
                  name="url"
                  value={editingDoc.url || ''}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Tipo y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de Documento</label>
                <select name="tipo" value={editingDoc.tipo || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" name="fecha" value={editingDoc.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            {/* Comentarios */}
            <div>
              <label className={labelClass}>Comentarios / Notas</label>
              <textarea
                name="comentario"
                value={editingDoc.comentario || ''}
                onChange={handleChange}
                rows={3}
                className={inputClass}
                placeholder="Anotaciones sobre este documento..."
              />
            </div>

            {/* Acciones del modal */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={handleCloseModal} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSaving}
                disabled={isSaveDisabled}
              >
                Guardar Documento
              </Button>
            </div>

          </form>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────
          Modal de Revisión Humana — sin cambios
      ───────────────────────────────────────────────────────── */}
      <ReviewExtractedReportModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        extraction={activeExtraction}
        documentId={activeDocForReview?.id}
        documentName={activeDocForReview?.nombre}
        clubId={club?.id}
        clubSeasonId={season?.id}
        rivalName={club?.nombre}
        season={season?.temporada}
      />

    </div>
  );
}
