'use client';

import React, { useState, useEffect } from 'react';
import { useKnowledgeLibrary } from '@/hooks/useKnowledgeLibrary';
import { KnowledgeEntry } from '@/types';
import { BookOpen, ChevronRight, HelpCircle, Import, ArrowUpRight } from 'lucide-react';
import { KnowledgeExplorer } from './KnowledgeExplorer';

interface KnowledgePanelProps {
  systemOwn: string;
  systemRival: string;
  matchupId: string | null;
  matchId: string | null;
  onImportToAnalysis?: (data: { ventajas?: string; desventajas?: string; tareas?: string }) => void;
}

export function KnowledgePanel({ systemOwn, systemRival, onImportToAnalysis }: KnowledgePanelProps) {
  const { getKnowledgeForContext, loading } = useKnowledgeLibrary();
  const [relevantEntries, setRelevantEntries] = useState<KnowledgeEntry[]>([]);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerContext, setExplorerContext] = useState<{ sistema?: string; fase?: string; posicion?: string } | undefined>(undefined);

  // Cargar conocimiento relevante basado en el matchup/sistemas activos
  useEffect(() => {
    const fetchRelevant = async () => {
      // Consultar principios vinculados al sistema propio, rival o generales
      const entries = await getKnowledgeForContext({
        sistema: systemOwn,
        limit: 5
      });
      setRelevantEntries(entries);
    };

    fetchRelevant();
  }, [systemOwn, systemRival, getKnowledgeForContext]);

  // Importar textos al comparador de la pizarra
  const handleImport = (entry: KnowledgeEntry) => {
    if (!onImportToAnalysis) return;

    let tareasStr = '';
    if (entry.instrucciones_linea) {
      tareasStr = Object.entries(entry.instrucciones_linea)
        .filter((tuple) => tuple[1] && tuple[1].trim() !== '')
        .map(([line, text]) => `${line.toUpperCase()}: ${text}`)
        .join('\n');
    }

    onImportToAnalysis({
      ventajas: entry.categoria === 'Principio ofensivo' ? `${entry.titulo}: ${entry.principio_clave || entry.descripcion}` : undefined,
      desventajas: entry.categoria === 'Principio defensivo' ? `${entry.titulo}: ${entry.principio_clave || entry.descripcion}` : undefined,
      tareas: tareasStr || undefined
    });
  };

  const handleOpenExplorerWithContext = (entry?: KnowledgeEntry) => {
    setExplorerContext({
      sistema: systemOwn,
      fase: entry?.fase_juego || undefined,
      posicion: entry?.posicion_asociada || undefined
    });
    setIsExplorerOpen(true);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Cabecera del Panel */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#CC0E21]" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">Base de Conocimiento Táctico</h3>
            <p className="text-[10px] text-slate-400">Principios tácticos sugeridos para el matchup {systemOwn} vs {systemRival}.</p>
          </div>
        </div>

        <button
          onClick={() => {
            setExplorerContext(undefined);
            setIsExplorerOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-750/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <span>Abrir Biblioteca Completa</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-450" />
        </button>
      </div>

      {/* Listado compacto */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-slate-650 border-t-[#CC0E21] rounded-full animate-spin" />
            <span>Buscando principios tácticos...</span>
          </div>
        ) : relevantEntries.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 space-y-1">
            <HelpCircle className="h-6 w-6 text-slate-700 mx-auto" />
            <p>No hay principios cargados específicamente para {systemOwn} aún.</p>
            <button 
              onClick={() => {
                setExplorerContext(undefined);
                setIsExplorerOpen(true);
              }}
              className="text-blue-400 hover:underline text-[10px]"
            >
              Explorar la biblioteca general
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relevantEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="bg-slate-950/40 border border-slate-850 hover:border-slate-700 p-3.5 rounded-xl flex flex-col justify-between gap-3 transition-colors relative overflow-hidden group"
              >
                {/* Badge categoría */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {entry.categoria}
                  </span>
                  {entry.fase_juego && (
                    <span className="text-[8px] bg-slate-900 border border-slate-850 px-1.5 py-0.2 rounded text-slate-400">
                      {entry.fase_juego}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-slate-100 transition-colors">
                    {entry.titulo}
                  </h4>
                  {entry.principio_clave && (
                    <p className="text-[10px] text-slate-400 line-clamp-2 italic leading-relaxed">
                      {"\"" + entry.principio_clave + "\""}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between border-t border-slate-900 pt-2 mt-1">
                  <button
                    onClick={() => handleOpenExplorerWithContext(entry)}
                    className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Ver fundamento
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  {onImportToAnalysis && (
                    <button
                      onClick={() => handleImport(entry)}
                      className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-750 transition-colors flex items-center gap-1 text-[9px]"
                      title="Importar al análisis de la pizarra"
                    >
                      <Import className="h-2.5 w-2.5" />
                      Importar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explorador Modal */}
      {isExplorerOpen && (
        <KnowledgeExplorer 
          isOpen={isExplorerOpen} 
          onClose={() => setIsExplorerOpen(false)} 
          initialContext={explorerContext}
        />
      )}
    </div>
  );
}
