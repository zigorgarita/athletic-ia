'use client';

import React from 'react';
import { ClubDocument } from '@/hooks/useClubDocuments';
import { TacticalLineupReportSelection } from '@/types';
import { FileText, CheckSquare, Square, Info } from 'lucide-react';

interface MatchReportSelectorProps {
  documents: ClubDocument[];
  selections: TacticalLineupReportSelection[];
  selectedRivalSystem?: string | null;
  onToggleSelection: (documentId: string, isSelected: boolean) => void;
  approvedCount: number;
  sourcesLabels: string[];
}

export function MatchReportSelector({
  documents,
  selections,
  onToggleSelection,
  approvedCount,
  sourcesLabels,
}: MatchReportSelectorProps) {
  if (documents.length === 0 && approvedCount === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 text-slate-500 shrink-0" />
          <span>No existen informes específicos validados para este rival.</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
          Análisis mediante Modelo Indautxu puro
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-md">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#CC0E21]" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Informes de Scouting Seleccionados para este Partido
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
            {approvedCount} observaciones aprobadas
          </span>
        </div>

        {sourcesLabels.length > 0 && (
          <div className="text-[10px] text-slate-400">
            Fuentes activas: <strong className="text-slate-200">{sourcesLabels.join(', ')}</strong>
          </div>
        )}
      </div>

      {/* Lista de Documentos Seleccionables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {documents.map(doc => {
          const selectionObj = selections.find(s => s.document_id === doc.id);
          const isSelected = selectionObj ? selectionObj.selected : true; // Por defecto seleccionado

          return (
            <div
              key={doc.id}
              onClick={() => onToggleSelection(doc.id, !isSelected)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-slate-950 border-[#CC0E21]/50 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-[#CC0E21] shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-slate-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{doc.nombre}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{doc.tipo || 'PDF'}</span>
                    {doc.fecha && <span>· {new Date(doc.fecha).toLocaleDateString('es-ES')}</span>}
                  </div>
                </div>
              </div>

              {/* Badges de Advertencia / Estado */}
              <div className="flex items-center gap-1 shrink-0">
                {doc.extraccion_json?.metadatos?.tipoInformeDetectado && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300">
                    {doc.extraccion_json.metadatos.tipoInformeDetectado[0] || 'Informe'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
