import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, FileText } from 'lucide-react';
import { Evaluation } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface EvaluationCardProps {
  evaluation: Evaluation;
}

export function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const media = (evaluation.tecnica + evaluation.tactica + evaluation.condicional) / 3;

  const getMediaColorClass = (val: number) => {
    if (val >= 4.0) return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (val >= 3.0) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  };

  const getProgressBarColor = (val: number) => {
    if (val >= 4) return 'bg-green-500';
    if (val >= 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('es-ES', options);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Fila superior: Fecha y Media */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            {formatDate(evaluation.fecha_evaluacion)}
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getMediaColorClass(media)}`}>
            Media: {media.toFixed(1)}
          </div>
        </div>

        {/* Listado de Métricas (1-5) */}
        <div className="space-y-3 pt-2">
          {/* Técnica */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Técnica</span>
              <span className="text-slate-100">{evaluation.tecnica} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(evaluation.tecnica)}`}
                style={{ width: `${(evaluation.tecnica / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Táctica */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Táctica</span>
              <span className="text-slate-100">{evaluation.tactica} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(evaluation.tactica)}`}
                style={{ width: `${(evaluation.tactica / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Condicional */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Físico / Condicional</span>
              <span className="text-slate-100">{evaluation.condicional} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(evaluation.condicional)}`}
                style={{ width: `${(evaluation.condicional / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sección expandible de notas */}
        {evaluation.notas && (
          <div className="pt-2 border-t border-slate-800/60">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 focus:outline-none transition-colors duration-200"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{isExpanded ? 'Ocultar anotaciones' : 'Ver anotaciones'}</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            
            {isExpanded && (
              <p className="mt-2 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-850 leading-relaxed whitespace-pre-line">
                {evaluation.notas}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
