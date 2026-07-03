'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useKnowledgeLinks } from '@/hooks/useKnowledgeLinks';
import { KnowledgeEntry } from '@/types';
import { BookOpen, X, ChevronRight } from 'lucide-react';
import { KnowledgeExplorer } from './KnowledgeExplorer';

interface KnowledgeLinkBadgeProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export function KnowledgeLinkBadge({ entityType, entityId, className = '' }: KnowledgeLinkBadgeProps) {
  const { fetchLinksForEntity, loading } = useKnowledgeLinks();
  const [linkedEntries, setLinkedEntries] = useState<KnowledgeEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [selectedExplorerEntry, setSelectedExplorerEntry] = useState<KnowledgeEntry | undefined>(undefined);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Cargar links de conocimiento vinculados
  useEffect(() => {
    if (entityId) {
      fetchLinksForEntity(entityType, entityId).then(setLinkedEntries);
    }
  }, [entityType, entityId, fetchLinksForEntity]);

  // Cerrar popover al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (loading || linkedEntries.length === 0) return null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Badge Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 text-[10px] font-semibold text-blue-400 cursor-pointer transition-all ${className}`}
        title="Ver conceptos tácticos vinculados"
      >
        <BookOpen className="h-3 w-3 text-blue-400" />
        <span>Táctica ({linkedEntries.length})</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-40 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              Conceptos Vinculados
            </span>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-900 custom-scrollbar">
            {linkedEntries.map((entry) => (
              <div 
                key={entry.id}
                onClick={() => {
                  setSelectedExplorerEntry(entry);
                  setIsExplorerOpen(true);
                  setIsOpen(false);
                }}
                className="p-2.5 hover:bg-slate-900/50 cursor-pointer transition-colors flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5 flex-1">
                  <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1">{entry.titulo}</h4>
                  {entry.principio_clave && (
                    <p className="text-[9px] text-slate-400 line-clamp-1 italic">{"\"" + entry.principio_clave + "\""}</p>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-slate-650 shrink-0 self-center" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explorador Modal */}
      {isExplorerOpen && (
        <KnowledgeExplorer 
          isOpen={isExplorerOpen} 
          onClose={() => setIsExplorerOpen(false)} 
          initialContext={selectedExplorerEntry ? {
            sistema: selectedExplorerEntry.sistema_asociado || undefined,
            fase: selectedExplorerEntry.fase_juego || undefined,
            posicion: selectedExplorerEntry.posicion_asociada || undefined
          } : undefined}
        />
      )}
    </div>
  );
}
