'use client';

import React from 'react';
import { KnowledgeEntry, KnowledgeMedia } from '@/types';
import { 
  FileText, Film, Image as ImageIcon, Link as LinkIcon, 
  User, Calendar, Shield, Cpu, Tag, Edit2, Archive, Trash2 
} from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';

interface KnowledgeDetailViewProps {
  entry: KnowledgeEntry;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

// Simple custom Markdown renderer to present structured content beautifully
function renderMarkdown(text: string) {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    // Headers
    if (trimmed.startsWith('###')) {
      return <h4 key={idx} className="text-md font-bold text-slate-100 mt-4 mb-2">{trimmed.replace('###', '').trim()}</h4>;
    }
    if (trimmed.startsWith('##')) {
      return <h3 key={idx} className="text-lg font-bold text-slate-100 mt-5 mb-3 border-b border-slate-800 pb-1">{trimmed.replace('##', '').trim()}</h3>;
    }
    
    // List items
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const content = trimmed.substring(1).trim();
      return (
        <ul key={idx} className="list-disc pl-5 my-1 text-slate-300 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ul>
      );
    }
    
    // Numbered lists
    if (/^\d+\./.test(trimmed)) {
      const content = trimmed.replace(/^\d+\./, '').trim();
      return (
        <ol key={idx} className="list-decimal pl-5 my-1 text-slate-300 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ol>
      );
    }
    
    // Paragraphs
    if (trimmed === '') {
      return <div key={idx} className="h-2" />;
    }
    
    return <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-2">{parseInlineMarkdown(trimmed)}</p>;
  });
}

function parseInlineMarkdown(text: string) {
  // Simple bold parser **text**
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="text-slate-100 font-semibold">{part}</strong>;
    }
    return part;
  });
}

export function KnowledgeDetailView({ entry, onEdit, onArchive, onDelete }: KnowledgeDetailViewProps) {
  const { isEditMode } = useEditMode();

  // Helper de colores de badges por categoría
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Sistema de juego': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Modelo de juego': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Principio ofensivo': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Principio defensivo': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ABP / Estrategia': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Transición ofensiva': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Transición defensiva': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Salida de balón': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Presión': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'Rol por posición': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700/60';
    }
  };

  const hasLineInstructions = entry.instrucciones_linea && 
    Object.values(entry.instrucciones_linea).some(v => v && v.trim() !== '');

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
      {/* Cabecera del detalle */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-900/40 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${getCategoryColor(entry.categoria)}`}>
              {entry.categoria}
            </span>
            {entry.fase_juego && (
              <span className="bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                {entry.fase_juego}
              </span>
            )}
            {entry.sistema_asociado && (
              <span className="bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                Formación: {entry.sistema_asociado}
              </span>
            )}
            {entry.posicion_asociada && (
              <span className="bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                Posición: {entry.posicion_asociada}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">{entry.titulo}</h2>
          
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-500" />
              Por: {entry.creado_por}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Temp: {entry.temporada}
            </span>
          </div>
        </div>

        {/* Acciones de Edición */}
        {isEditMode && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button 
                onClick={onEdit}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition-colors"
                title="Editar entrada"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onArchive && entry.activo && (
              <button 
                onClick={onArchive}
                className="p-2 rounded-lg bg-slate-800 hover:bg-amber-950/40 text-slate-300 hover:text-amber-400 border border-slate-700/60 hover:border-amber-900/50 transition-colors"
                title="Archivar entrada (Ocultar)"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/60 hover:border-red-900/50 transition-colors"
                title="Eliminar permanentemente"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contenido en Scroll */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Principio Clave destacado */}
        {entry.principio_clave && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-950/20 to-slate-900/40 border-l-4 border-blue-500 text-slate-300 text-sm flex gap-3 items-start">
            <Cpu className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-200 mb-0.5">Principio Clave</h4>
              <p className="italic text-slate-300">{entry.principio_clave}</p>
            </div>
          </div>
        )}

        {/* Descripción / Contenido */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Concepto y Desarrollo</h3>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/80">
            {renderMarkdown(entry.descripcion)}
          </div>
        </div>

        {/* Instrucciones específicas por línea */}
        {hasLineInstructions && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Instrucciones por Línea</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(entry.instrucciones_linea || {}).map(([line, text]) => {
                if (!text || text.trim() === '') return null;
                const lineTitles: Record<string, string> = {
                  porteria: 'Portería',
                  defensa: 'Línea Defensiva',
                  mediocampo: 'Mediocampo',
                  delantera: 'Línea Delantera'
                };
                return (
                  <div key={line} className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/80">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      {lineTitles[line] || line.toUpperCase()}
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Variantes tácticas */}
        {entry.variantes && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Variantes y Alternativas</h3>
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/40 text-slate-300 text-xs leading-relaxed">
              {renderMarkdown(entry.variantes)}
            </div>
          </div>
        )}

        {/* Consignas de campo */}
        {entry.consignas && entry.consignas.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Consignas para el Campo</h3>
            <div className="flex flex-wrap gap-2">
              {entry.consignas.map((cons, i) => (
                <span key={i} className="px-3 py-1 bg-slate-850 border border-slate-800 text-slate-300 text-xs rounded-lg font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CC0E21]" />
                  {"\"" + cons + "\""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Galería Multimedia */}
        {entry.media && entry.media.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recursos y Medios Adjuntos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entry.media.map((med: KnowledgeMedia) => (
                <div key={med.id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-850 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-slate-850 border border-slate-800 text-blue-400">
                      {med.tipo_media === 'video' && <Film className="h-5 w-5 text-rose-400" />}
                      {med.tipo_media === 'pdf' && <FileText className="h-5 w-5 text-amber-400" />}
                      {med.tipo_media === 'imagen' && <ImageIcon className="h-5 w-5 text-emerald-400" />}
                      {med.tipo_media === 'enlace' && <LinkIcon className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{med.titulo || 'Recurso sin título'}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{med.descripcion || 'Sin descripción'}</p>
                      <a 
                        href={med.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        Abrir recurso externo
                        <LinkIcon className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="pt-4 border-t border-slate-850 flex items-center flex-wrap gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-500 mr-1" />
            {entry.tags.map((t) => (
              <span key={t.id} className="bg-slate-850 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-medium">
                #{t.tag}
              </span>
            ))}
          </div>
        )}

        {/* Vinculaciones activas */}
        {entry.links && entry.links.length > 0 && (
          <div className="pt-4 border-t border-slate-850 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-500" />
              Módulos Vinculados
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {entry.links.map((link) => (
                <span key={link.id} className="bg-slate-900/60 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="font-semibold">{link.linked_entity_type.replace('planning_', '').replace('tactical_', '').replace('_', ' ')}:</span>
                  <span className="text-slate-400">{link.relacion}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
