'use client';

import React, { useState } from 'react';
import { X, Search, Copy, Check, Database, FileSpreadsheet } from 'lucide-react';
import { BetoPlayerSession } from '@/types';

interface BetoRawMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerSession: BetoPlayerSession | null;
}

export function BetoRawMetricsModal({
  isOpen,
  onClose,
  playerSession,
}: BetoRawMetricsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !playerSession) return null;

  const rawMetrics = playerSession.raw_metrics || {};
  const entries = Object.entries(rawMetrics);

  const filteredEntries = entries.filter(([key, val]) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const keyMatch = key.toLowerCase().includes(term);
    const valMatch = String(val).toLowerCase().includes(term);
    return keyMatch || valMatch;
  });

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(rawMetrics, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-[#CC0E21] border border-red-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Métricas Originales OLIVER
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  raw_metrics
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {playerSession.source_player_name} {playerSession.dorsal ? `(#${playerSession.dorsal})` : ''} — {playerSession.oliver_player_id ? `ID: ${playerSession.oliver_player_id}` : 'Sin Oliver ID'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar columna o valor original..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron campos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-1/2">Columna Original (Header)</th>
                    <th className="py-2.5 px-4 w-1/2">Valor Importado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEntries.map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-300 select-all">
                        {key}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-100 select-all">
                        {val === null || val === undefined || val === '' ? (
                          <span className="text-slate-600 italic">null / vacío</span>
                        ) : typeof val === 'object' ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Total columnas preservadas: <strong>{entries.length}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
