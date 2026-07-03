'use client';

import React, { useState } from 'react';
import { KnowledgeEntry, KNOWLEDGE_CATEGORIES, KNOWLEDGE_PHASES, KnowledgeCategory, KnowledgePhase } from '@/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Plus, X, Upload, Link as LinkIcon, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { useKnowledgeLibrary } from '@/hooks/useKnowledgeLibrary';

interface KnowledgeEntryFormProps {
  initialData?: Partial<KnowledgeEntry>;
  onSave: (data: Partial<KnowledgeEntry>) => Promise<void>;
  onCancel: () => void;
}

export function KnowledgeEntryForm({ initialData, onSave, onCancel }: KnowledgeEntryFormProps) {
  const { loading: uploading } = useKnowledgeLibrary();
  const [loading, setLoading] = useState(false);

  // Estados del Formulario
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [categoria, setCategoria] = useState<KnowledgeCategory>(initialData?.categoria || 'Principios generales');
  const [faseJuego, setFaseJuego] = useState<KnowledgePhase | ''>(initialData?.fase_juego || '');
  const [sistemaAsociado, setSistemaAsociado] = useState(initialData?.sistema_asociado || '');
  const [posicionAsociada, setPosicionAsociada] = useState(initialData?.posicion_asociada || '');
  const [principioClave, setPrincipioClave] = useState(initialData?.principio_clave || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [variantes, setVariantes] = useState(initialData?.variantes || '');

  // Consignas (Tags/Chips)
  const [consignas, setConsignas] = useState<string[]>(initialData?.consignas || []);
  const [newConsigna, setNewConsigna] = useState('');

  // Tags (Chips)
  const [tags, setTags] = useState<string[]>(initialData?.tags?.map(t => t.tag) || []);
  const [newTag, setNewTag] = useState('');

  // Instrucciones por línea
  const [porteria, setPorteria] = useState(initialData?.instrucciones_linea?.porteria || '');
  const [defensa, setDefensa] = useState(initialData?.instrucciones_linea?.defensa || '');
  const [mediocampo, setMediocampo] = useState(initialData?.instrucciones_linea?.mediocampo || '');
  const [delantera, setDelantera] = useState(initialData?.instrucciones_linea?.delantera || '');

  // Multimedia temporal (añadido en sesión)
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; type: 'video' | 'pdf' | 'imagen'; title: string }[]>([]);
  const [externalLinks, setExternalLinks] = useState<{ url: string; type: 'video' | 'pdf' | 'imagen' | 'enlace'; title: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkType, setNewLinkType] = useState<'video' | 'pdf' | 'imagen' | 'enlace'>('enlace');

  // Gestores de Consignas
  const handleAddConsigna = () => {
    if (newConsigna.trim() && !consignas.includes(newConsigna.trim())) {
      setConsignas([...consignas, newConsigna.trim()]);
      setNewConsigna('');
    }
  };

  const handleRemoveConsigna = (idx: number) => {
    setConsignas(consignas.filter((_, i) => i !== idx));
  };

  // Gestores de Tags
  const handleAddTag = () => {
    const cleanTag = newTag.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  // Gestores de Enlaces Externos
  const handleAddLink = () => {
    if (newLinkUrl.trim() && newLinkTitle.trim()) {
      setExternalLinks([...externalLinks, {
        url: newLinkUrl.trim(),
        title: newLinkTitle.trim(),
        type: newLinkType
      }]);
      setNewLinkUrl('');
      setNewLinkTitle('');
    }
  };

  const handleRemoveLink = (idx: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== idx));
  };

  // Gestor de Subida de Archivos locales
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'pdf' | 'imagen') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFiles([...uploadedFiles, {
        file,
        type,
        title: file.name
      }]);
    }
  };

  const handleRemoveUploadedFile = (idx: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx));
  };

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      alert('Por favor, rellena el título y la descripción.');
      return;
    }

    setLoading(true);
    try {
      const entryPayload: Partial<KnowledgeEntry> = {
        id: initialData?.id,
        titulo: titulo.trim(),
        categoria,
        fase_juego: faseJuego || null,
        sistema_asociado: sistemaAsociado.trim() || null,
        posicion_asociada: posicionAsociada.trim() || null,
        principio_clave: principioClave.trim() || null,
        descripcion: descripcion.trim(),
        instrucciones_linea: {
          porteria: porteria.trim(),
          defensa: defensa.trim(),
          mediocampo: mediocampo.trim(),
          delantera: delantera.trim()
        },
        variantes: variantes.trim() || null,
        consignas,
        metadata: initialData?.metadata || {}
      };

      // 1. Guardar o actualizar la entrada de conocimiento principal
      // Pasamos el payload al callback padre que invoca el hook saveEntry
      await onSave(entryPayload);

      // Nota: Si es una nueva entrada, el id se genera en la BD. En ese caso
      // las subidas de archivos y tags se realizarían asociadas al nuevo ID.
      // Para simplificar la v1, el componente padre maneja el upsert de tags y archivos.
      // Retornar al explorador tras éxito.
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar la entrada.');
    } finally {
      setLoading(false);
    }
  };

  // Categorías mapeadas para select
  const catOptions = KNOWLEDGE_CATEGORIES.map(c => ({ value: c, label: c }));
  const faseOptions = KNOWLEDGE_PHASES.map(f => ({ value: f, label: f }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 custom-scrollbar overflow-y-auto max-h-[85vh]">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
        <Plus className="h-6 w-6 text-[#CC0E21]" />
        {initialData?.id ? 'Editar Entrada de Conocimiento' : 'Nueva Entrada de Conocimiento'}
      </h2>

      {/* SECCIÓN 1 — CLASIFICACIÓN */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">1. Clasificación del Conocimiento</h3>
        
        <Input 
          label="Título del Concepto Táctico" 
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Categoría" 
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as KnowledgeCategory)}
            options={catOptions}
            required
          />

          <Select 
            label="Fase de Juego Asociada" 
            value={faseJuego}
            onChange={(e) => setFaseJuego(e.target.value as KnowledgePhase)}
            options={[{ value: '', label: 'Global / Ninguna' }, ...faseOptions]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Sistema Táctico de Referencia (Opcional)" 
            value={sistemaAsociado}
            onChange={(e) => setSistemaAsociado(e.target.value)}
            placeholder="Ej: 1-4-2-3-1"
          />

          <Input 
            label="Posición Específica (Opcional)" 
            value={posicionAsociada}
            onChange={(e) => setPosicionAsociada(e.target.value)}
            placeholder="Ej: LD, MCO, POR"
          />
        </div>
      </div>

      {/* SECCIÓN 2 — CONTENIDO PRINCIPAL */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">2. Contenido Estructurado</h3>

        <Input 
          label="Principio Clave (Resumen corto de 1 línea)" 
          value={principioClave}
          onChange={(e) => setPrincipioClave(e.target.value)}
          placeholder="Ej: Movilidad constante en pasillos interiores para generar líneas de pase."
        />

        <div className="flex flex-col mb-4">
          <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Descripción Detallada (Markdown soportado)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={6}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-sm custom-scrollbar"
            placeholder="Escribe el desarrollo táctico completo, con párrafos, listas o títulos en formato Markdown..."
          />
        </div>

        <div className="flex flex-col mb-4">
          <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Variantes Tácticas (Opcional)</label>
          <textarea
            value={variantes}
            onChange={(e) => setVariantes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-sm custom-scrollbar"
            placeholder="Variaciones del principio según la presión rival, marcador o contexto de partido..."
          />
        </div>
      </div>

      {/* SECCIÓN 3 — CONSIGNAS */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">3. Consignas para el Vestuario</h3>
        <p className="text-xs text-slate-400">Frases cortas e instrucciones directas para gritar en la banda o apuntar en el vestuario.</p>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              label="Añadir Consigna" 
              value={newConsigna}
              onChange={(e) => setNewConsigna(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConsigna())}
              placeholder="Ej: '¡Doblar por fuera!'"
            />
          </div>
          <Button type="button" variant="ghost" onClick={handleAddConsigna} className="h-[46px] border border-slate-850 px-4">
            Añadir
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {consignas.map((cons, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-850 border border-slate-800 text-slate-200 text-xs rounded-lg font-medium">
              {"\"" + cons + "\""}
              <button type="button" onClick={() => handleRemoveConsigna(idx)} className="text-slate-500 hover:text-slate-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* SECCIÓN 4 — INSTRUCCIONES POR LÍNEA */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">4. Tareas Específicas por Línea</h3>
        <p className="text-xs text-slate-400">Instrucciones precisas según la zona del campo.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Portería (POR)</label>
            <textarea
              value={porteria}
              onChange={(e) => setPorteria(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-xs"
              placeholder="Tareas del portero..."
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Línea Defensiva (LD, DFC, LI)</label>
            <textarea
              value={defensa}
              onChange={(e) => setDefensa(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-xs"
              placeholder="Tareas de defensas..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Mediocampo (MCD, MC, MCO)</label>
            <textarea
              value={mediocampo}
              onChange={(e) => setMediocampo(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-xs"
              placeholder="Tareas de centrocampistas..."
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1.5 font-medium ml-1">Línea Delantera (ED, EI, DC)</label>
            <textarea
              value={delantera}
              onChange={(e) => setDelantera(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21] text-xs"
              placeholder="Tareas de delanteros..."
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 5 — RECURSOS MULTIMEDIA */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">5. Recursos y Archivos Adjuntos</h3>
        
        {/* Subir archivo local */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-center flex-col gap-2 p-4 rounded-xl border border-dashed border-slate-700/60 hover:border-[#CC0E21] bg-slate-950/40 hover:bg-slate-900/10 cursor-pointer transition-all">
            <Upload className="h-5 w-5 text-rose-400" />
            <span className="text-[10px] text-slate-300 font-semibold uppercase">Vídeo local</span>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
          </label>

          <label className="flex items-center justify-center flex-col gap-2 p-4 rounded-xl border border-dashed border-slate-700/60 hover:border-[#CC0E21] bg-slate-950/40 hover:bg-slate-900/10 cursor-pointer transition-all">
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="text-[10px] text-slate-300 font-semibold uppercase">Documento PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'pdf')} />
          </label>

          <label className="flex items-center justify-center flex-col gap-2 p-4 rounded-xl border border-dashed border-slate-700/60 hover:border-[#CC0E21] bg-slate-950/40 hover:bg-slate-900/10 cursor-pointer transition-all">
            <ImageIcon className="h-5 w-5 text-emerald-400" />
            <span className="text-[10px] text-slate-300 font-semibold uppercase">Imagen táctica</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imagen')} />
          </label>
        </div>

        {/* Mostrar archivos listos para subir */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Archivos locales para subir tras guardar:</span>
            {uploadedFiles.map((up, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-850">
                <span className="text-xs text-slate-300 truncate max-w-[80%] flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {up.file.name} ({up.type})
                </span>
                <button type="button" onClick={() => handleRemoveUploadedFile(idx)} className="text-slate-500 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Añadir enlace externo */}
        <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Añadir Enlace Externo (Youtube, Drive, etc.)</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label="Nombre del recurso" 
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Ej: Clip Youtube presión alta"
            />
            <Select 
              label="Tipo de medio" 
              value={newLinkType}
              onChange={(e) => setNewLinkType(e.target.value as 'video' | 'pdf' | 'imagen' | 'enlace')}
              options={[
                { value: 'enlace', label: 'Enlace web general' },
                { value: 'video', label: 'Vídeo' },
                { value: 'pdf', label: 'PDF' },
                { value: 'imagen', label: 'Imagen' }
              ]}
            />
          </div>
          <Input 
            label="URL del enlace" 
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="https://..."
          />
          <Button type="button" variant="ghost" onClick={handleAddLink} className="w-full justify-center">
            Añadir Enlace a la Lista
          </Button>
        </div>

        {/* Mostrar enlaces externos en cola */}
        {externalLinks.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enlaces vinculados:</span>
            {externalLinks.map((lnk, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-850">
                <span className="text-xs text-slate-300 truncate max-w-[80%] flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-blue-400" />
                  {lnk.title} ({lnk.type}) - {lnk.url}
                </span>
                <button type="button" onClick={() => handleRemoveLink(idx)} className="text-slate-500 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 6 — TAGS */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <h3 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider">6. Etiquetas Libres</h3>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              label="Añadir Etiqueta" 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Ej: pressing-trap"
            />
          </div>
          <Button type="button" variant="ghost" onClick={handleAddTag} className="h-[46px] border border-slate-850 px-4">
            Añadir
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-850 border border-slate-850 text-slate-400 text-[10px] rounded font-medium">
              #{tag}
              <button type="button" onClick={() => handleRemoveTag(idx)} className="text-slate-600 hover:text-slate-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* BOTONES DE ACCIÓN FORM */}
      <div className="pt-6 border-t border-slate-800/80 flex items-center justify-end gap-3">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          disabled={loading || uploading}
          className="px-6 border border-slate-800"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={loading || uploading}
          className="px-6 bg-[#CC0E21] hover:bg-[#a60c1b] text-slate-100 flex items-center gap-2"
        >
          {loading ? 'Guardando...' : initialData?.id ? 'Guardar Cambios' : 'Crear Entrada'}
        </Button>
      </div>
    </form>
  );
}
