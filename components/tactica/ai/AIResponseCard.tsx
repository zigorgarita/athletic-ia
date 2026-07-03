'use client';

import React from 'react';
import { AIMessage } from '@/types';
import { AIActionButton } from './AIActionButton';
import { Bot, User } from 'lucide-react';

interface AIResponseCardProps {
  message: AIMessage;
  onNotification?: (msg: string) => void;
}

// Simple custom Markdown parser that handles headers, lists, and tables
function renderRichAIContent(text: string) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: string[][] = [];
  let inTable = false;

  const parseInline = (str: string) => {
    const parts = str.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-slate-100 font-bold">{part}</strong>;
      }
      return part;
    });
  };

  const flushTable = (key: number) => {
    if (currentTable.length === 0) return null;
    const headerRow = currentTable[0];
    const bodyRows = currentTable.slice(2); // Omitir el separador |---|

    const tableEl = (
      <div key={`table-${key}`} className="overflow-x-auto my-4 rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              {headerRow.map((cell, idx) => (
                <th key={idx} className="px-4 py-3 font-semibold text-slate-200 uppercase tracking-wider">{cell.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-900/10">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 text-slate-350">{parseInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = [];
    inTable = false;
    return tableEl;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detección de Tabla
    if (line.startsWith('|')) {
      inTable = true;
      const columns = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      currentTable.push(columns);
      continue;
    } else if (inTable) {
      const tableEl = flushTable(i);
      if (tableEl) elements.push(tableEl);
    }

    // Encabezados
    if (line.startsWith('###')) {
      elements.push(<h4 key={i} className="text-sm font-bold text-slate-100 mt-4 mb-2">{line.replace('###', '').trim()}</h4>);
      continue;
    }
    if (line.startsWith('##')) {
      elements.push(<h3 key={i} className="text-base font-bold text-slate-100 mt-5 mb-2 border-b border-slate-800/80 pb-1">{line.replace('##', '').trim()}</h3>);
      continue;
    }
    if (line.startsWith('#')) {
      elements.push(<h2 key={i} className="text-lg font-extrabold text-slate-50 mt-6 mb-3">{line.replace('#', '').trim()}</h2>);
      continue;
    }

    // Elementos de lista
    if (line.startsWith('-') || line.startsWith('*')) {
      elements.push(
        <ul key={i} className="list-disc pl-5 my-1 text-slate-350 text-xs">
          <li>{parseInline(line.substring(1).trim())}</li>
        </ul>
      );
      continue;
    }

    // Listas numeradas
    if (/^\d+\./.test(line)) {
      elements.push(
        <ol key={i} className="list-decimal pl-5 my-1 text-slate-350 text-xs">
          <li>{parseInline(line.replace(/^\d+\./, '').trim())}</li>
        </ol>
      );
      continue;
    }

    // Citas / Blockquotes
    if (line.startsWith('>')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-[#CC0E21] bg-slate-900/30 p-3 rounded-r-lg my-3 text-xs italic text-slate-300">
          {parseInline(line.substring(1).trim())}
        </blockquote>
      );
      continue;
    }

    // Línea en blanco
    if (line === '') {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    // Párrafo general
    elements.push(<p key={i} className="text-slate-350 text-xs leading-relaxed mb-1.5">{parseInline(line)}</p>);
  }

  // Flush de tabla final si quedó abierta
  if (inTable) {
    const tableEl = flushTable(lines.length);
    if (tableEl) elements.push(tableEl);
  }

  return elements;
}

export function AIResponseCard({ message, onNotification }: AIResponseCardProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      
      {/* Icon Avatar */}
      <div className={`p-2 rounded-xl border flex-shrink-0 h-9 w-9 flex items-center justify-center ${
        isUser 
          ? 'bg-slate-900 border-slate-700/60 text-slate-400' 
          : 'bg-rose-500/10 border-rose-500/20 text-[#CC0E21]'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble Content */}
      <div className={`flex flex-col gap-2 rounded-2xl p-4 shadow-md ${
        isUser 
          ? 'bg-slate-800/80 border border-slate-700/60 rounded-tr-none' 
          : 'bg-slate-900/60 border border-slate-800/80 rounded-tl-none backdrop-blur-xl'
      }`}>
        
        {/* Mensaje de texto */}
        <div className="space-y-1">
          {isUser ? (
            <p className="text-xs text-slate-200 leading-relaxed">{message.content}</p>
          ) : (
            <div className="space-y-1">{renderRichAIContent(message.content)}</div>
          )}
        </div>

        {/* Acciones sugeridas de la IA (solo para respuestas del asistente) */}
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/80 mt-2">
            {message.suggestedActions.map((action, idx) => (
              <AIActionButton 
                key={idx} 
                action={action} 
                onApplied={onNotification} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
