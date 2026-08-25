'use client';

import React, { useState, useRef } from 'react';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { useEditMode } from '@/context/EditModeContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  Upload, Camera, CheckCircle2, AlertTriangle, 
  Sparkles, RefreshCw, Info
} from 'lucide-react';

interface ExtractedPlayer {
  id: string; // ID temporal para la UI
  dorsal: number | null;
  nombre: string;
  posicion: string | null;
  selected: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
}

interface ImportPlantillaModalProps {
  isOpen: boolean;
  onClose: () => void;
  rivalName: string;
  existingPlayers: ClubPlayer[];
  onImport: (playersToInsert: Array<Pick<ClubPlayer, 'nombre'> & Partial<ClubPlayer>>) => Promise<boolean>;
}

const POSICIONES_OPCIONES = [
  'Sin Posición',
  'Portero',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Defensa Central',
  'Pivote',
  'Medio Centro',
  'Interior Derecho',
  'Interior Izquierdo',
  'Media Punta',
  'Extremo Derecho',
  'Extremo Izquierdo',
  'Delantero Centro'
];

export function ImportPlantillaModal({
  isOpen,
  onClose,
  rivalName,
  existingPlayers,
  onImport,
}: ImportPlantillaModalProps) {
  const { currentUser } = useEditMode();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedList, setExtractedList] = useState<ExtractedPlayer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setExtractedList([]);
    setErrorMessage(null);
    setIsSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Normalizador de texto para comparar nombres
  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Evalúa si un jugador extraído coincide con alguno existente
  const checkDuplicate = (nombre: string, dorsal: number | null): { isDup: boolean; reason?: string } => {
    const normNombre = normalize(nombre);
    for (const ep of existingPlayers) {
      const epNorm = normalize(ep.nombre);
      // Coincidencia exacta o muy cercana de nombre
      if (normNombre === epNorm || (normNombre.length > 4 && (epNorm.includes(normNombre) || normNombre.includes(epNorm)))) {
        return { isDup: true, reason: `Coincide con "${ep.nombre}" en plantilla` };
      }
      // Coincidencia de dorsal
      if (dorsal !== null && ep.dorsal !== null && dorsal === ep.dorsal) {
        return { isDup: true, reason: `Dorsal ${dorsal} ya asignado a "${ep.nombre}"` };
      }
    }
    return { isDup: false };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setStep('analyzing');

    try {
      // Convertir a base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || result;
          resolve(base64Data);
        };
        reader.onerror = error => reject(error);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const editorUser = currentUser?.id || 'aitor';
      const editorPass = currentUser?.pass || '';

      const res = await fetch('/api/rivales/extract-plantilla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-user': editorUser,
          'x-editor-pass': editorPass,
        },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: file.type || 'image/jpeg',
          rivalName: rivalName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error en el análisis (${res.status})`);
      }

      const players: Array<{ dorsal: number | null; nombre: string; posicion: string | null }> = data.players || [];
      if (players.length === 0) {
        throw new Error('No se detectaron jugadores legibles en el documento. Asegúrate de que los nombres y números sean visibles.');
      }

      // Mapear jugadores y evaluar duplicados
      const mapped: ExtractedPlayer[] = players.map((p, idx) => {
        const dupCheck = checkDuplicate(p.nombre, p.dorsal);
        return {
          id: `temp_${Date.now()}_${idx}`,
          dorsal: p.dorsal,
          nombre: p.nombre,
          posicion: p.posicion,
          // Regla: si es posible duplicado -> desmarcado por defecto. Si es nuevo -> seleccionado por defecto.
          selected: !dupCheck.isDup,
          isDuplicate: dupCheck.isDup,
          duplicateReason: dupCheck.reason,
        };
      });

      setExtractedList(mapped);
      setStep('review');
    } catch (err: unknown) {
      console.error('Error procesando alineación:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setStep('upload');
    }
  };

  const handleTogglePlayer = (id: string) => {
    setExtractedList(prev =>
      prev.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleFieldChange = (id: string, field: 'nombre' | 'dorsal' | 'posicion', value: string) => {
    setExtractedList(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        if (field === 'dorsal') {
          const num = value === '' ? null : parseInt(value, 10);
          const newDorsal = isNaN(num as number) ? null : num;
          const dupCheck = checkDuplicate(p.nombre, newDorsal);
          return { ...p, dorsal: newDorsal, isDuplicate: dupCheck.isDup, duplicateReason: dupCheck.reason };
        }
        if (field === 'nombre') {
          const dupCheck = checkDuplicate(value, p.dorsal);
          return { ...p, nombre: value, isDuplicate: dupCheck.isDup, duplicateReason: dupCheck.reason };
        }
        if (field === 'posicion') {
          return { ...p, posicion: value === 'Sin Posición' ? null : value };
        }
        return p;
      })
    );
  };

  const handleSelectAllNew = () => {
    setExtractedList(prev =>
      prev.map(p => (p.isDuplicate ? { ...p, selected: false } : { ...p, selected: true }))
    );
  };

  const handleDeselectAll = () => {
    setExtractedList(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const handleSaveApproved = async () => {
    const toImport = extractedList.filter(p => p.selected && p.nombre.trim().length > 0);
    if (toImport.length === 0) {
      setErrorMessage('Selecciona al menos un jugador para integrar en la plantilla.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload = toImport.map(p => ({
      nombre: p.nombre.trim(),
      dorsal: p.dorsal,
      posicion: p.posicion || null,
      origen: 'documento' as const,
    }));

    const success = await onImport(payload);
    setIsSaving(false);

    if (success) {
      handleClose();
    } else {
      setErrorMessage('Hubo un error al guardar los jugadores. Inténtalo de nuevo.');
    }
  };

  const selectedCount = extractedList.filter(p => p.selected).length;
  const duplicatesCount = extractedList.filter(p => p.isDuplicate).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Digitalizar Plantilla — ${rivalName}`}>
      <div className="space-y-5 max-w-3xl">
        {errorMessage && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASO 1: SUBIR ARCHIVO */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <Camera className="h-4 w-4 text-[#CC0E21]" />
                <span>Extracción de Jugadores desde Foto o Documento</span>
              </div>
              <p>
                Sube una fotografía de la alineación, acta de partido o documento oficial donde aparezcan dorsales y nombres.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>La IA transcribirá fielmente los datos visibles (sin inferir ni completar datos ausentes).</li>
                <li>Podrás revisar, editar y confirmar cada jugador antes de que se guarde en la plantilla.</li>
                <li>Los jugadores con posible duplicado se mantendrán desmarcados por defecto para proteger los datos existentes.</li>
              </ul>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-[#CC0E21] bg-slate-900/30 hover:bg-slate-900/60 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform mb-3 border border-slate-700">
                <Upload className="h-8 w-8 text-slate-400 group-hover:text-[#CC0E21] transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Haz clic para seleccionar o tomar una fotografía</h4>
              <p className="text-xs text-slate-500 mt-1">Formatos soportados: JPG, PNG, WEBP o PDF</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* PASO 2: ANALIZANDO CON IA */}
        {step === 'analyzing' && (
          <div className="py-16 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-[#CC0E21] animate-spin mx-auto" />
              <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-200">Leyendo y transcribiendo documento con IA...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Identificando dorsales y nombres visibles en {selectedFile?.name || 'la imagen'}
              </p>
            </div>
          </div>
        )}

        {/* PASO 3: REVISIÓN HUMANA EDITABLE */}
        {step === 'review' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Cabecera resumen */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{extractedList.length} jugadores detectados</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-bold">{selectedCount} seleccionados para importar</span>
                </div>
                {duplicatesCount > 0 && (
                  <p className="text-[11px] text-amber-400 mt-0.5">
                    ⚠️ {duplicatesCount} posible(s) duplicado(s) detectado(s) y desmarcado(s) automáticamente.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="ghost" onClick={handleSelectAllNew} className="text-xs px-3 py-1.5">
                  Solo Nuevos
                </Button>
                <Button variant="ghost" onClick={handleDeselectAll} className="text-xs px-3 py-1.5 text-slate-400">
                  Desmarcar Todos
                </Button>
              </div>
            </div>

            {/* Aviso de seguridad */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Control estricto:</strong> Ningún dato existente se sobrescribirá. Solo los jugadores con la casilla marcada se añadirán como nuevos integrantes de la plantilla.
              </span>
            </div>

            {/* Tabla editable */}
            <div className="max-h-[380px] overflow-y-auto border border-slate-800/80 rounded-2xl divide-y divide-slate-850 bg-slate-950/40">
              {extractedList.map(player => (
                <div
                  key={player.id}
                  className={`p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-colors ${
                    player.selected ? 'bg-slate-900/40' : 'bg-slate-950/20 opacity-75'
                  }`}
                >
                  {/* Checkbox de aprobación */}
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={player.selected}
                      onChange={() => handleTogglePlayer(player.id)}
                      className="rounded bg-slate-950 border-slate-700 text-[#CC0E21] focus:ring-[#CC0E21] h-4.5 w-4.5"
                    />
                    <span className="text-[10px] font-bold text-slate-500 sm:hidden">Incluir</span>
                  </label>

                  {/* Dorsal editable */}
                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      placeholder="Nº"
                      value={player.dorsal ?? ''}
                      onChange={e => handleFieldChange(player.id, 'dorsal', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-xs font-bold text-slate-200 focus:outline-none focus:border-[#CC0E21]/60"
                    />
                  </div>

                  {/* Nombre editable */}
                  <div className="flex-1 min-w-[180px] w-full">
                    <input
                      type="text"
                      placeholder="Nombre del jugador"
                      value={player.nombre}
                      onChange={e => handleFieldChange(player.id, 'nombre', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#CC0E21]/60"
                    />
                  </div>

                  {/* Posición dropdown */}
                  <div className="w-36 shrink-0">
                    <select
                      value={player.posicion || 'Sin Posición'}
                      onChange={e => handleFieldChange(player.id, 'posicion', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#CC0E21]/60"
                    >
                      {POSICIONES_OPCIONES.map(pos => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado / Badge de duplicado */}
                  <div className="shrink-0 w-full sm:w-auto flex justify-end">
                    {player.isDuplicate ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        title={player.duplicateReason}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Posible Duplicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones del pie */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={handleReset} disabled={isSaving} className="text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Subir otra imagen
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveApproved}
                  loading={isSaving}
                  disabled={selectedCount === 0}
                  className="px-5"
                >
                  Importar ({selectedCount}) Jugadores Aprobados
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
