import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, FileText } from 'lucide-react';
import { DetailedEvaluation } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';

interface EvaluationCardProps {
  evaluation: DetailedEvaluation;
}

export function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group metrics calculations
  const tecnica = (
    evaluation.pase_corto + evaluation.pase_largo + evaluation.control_orientado + 
    evaluation.regate + evaluation.centros + evaluation.finalizacion + 
    evaluation.disparo_lejano + evaluation.trabajo_ofensivo
  ) / 8;

  const tactica = (
    evaluation.vision_juego + evaluation.inteligencia_tactica + evaluation.liderazgo
  ) / 3;

  const condicional = (
    evaluation.velocidad + evaluation.aceleracion + evaluation.fuerza + 
    evaluation.resistencia + evaluation.juego_aereo
  ) / 5;

  const defensiva = (
    evaluation.marcaje + evaluation.entrada_defensiva + 
    evaluation.posicionamiento_defensivo + evaluation.trabajo_defensivo
  ) / 4;

  const media = (tecnica + tactica + condicional + defensiva) / 4;

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
    <Card className="overflow-hidden bg-slate-900/35 border-slate-800/80">
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

        {/* Listado de Métricas Agrupadas */}
        <div className="space-y-3 pt-2">
          {/* Técnica */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Técnica</span>
              <span className="text-slate-100">{tecnica.toFixed(1)} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(tecnica)}`}
                style={{ width: `${(tecnica / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Táctica */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Táctica</span>
              <span className="text-slate-100">{tactica.toFixed(1)} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(tactica)}`}
                style={{ width: `${(tactica / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Condicional */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Físico / Condicional</span>
              <span className="text-slate-100">{condicional.toFixed(1)} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(condicional)}`}
                style={{ width: `${(condicional / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Defensiva */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Defensiva</span>
              <span className="text-slate-100">{defensiva.toFixed(1)} / 5</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(defensiva)}`}
                style={{ width: `${(defensiva / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ver detalle métricas individuales en formato expandido */}
        <div className="pt-2 border-t border-slate-850">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 focus:outline-none transition-colors duration-200"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{isExpanded ? 'Ocultar desglose de 20 métricas' : 'Ver desglose de 20 métricas'}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          
          {isExpanded && (
            <div className="mt-3 text-[11px] text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-850 grid grid-cols-2 gap-x-4 gap-y-2">
              <div><strong className="text-slate-400">Velocidad:</strong> {evaluation.velocidad}</div>
              <div><strong className="text-slate-400">Aceleración:</strong> {evaluation.aceleracion}</div>
              <div><strong className="text-slate-400">Fuerza:</strong> {evaluation.fuerza}</div>
              <div><strong className="text-slate-400">Resistencia:</strong> {evaluation.resistencia}</div>
              <div><strong className="text-slate-400">Juego Aéreo:</strong> {evaluation.juego_aereo}</div>
              <div><strong className="text-slate-400">Marcaje:</strong> {evaluation.marcaje}</div>
              <div><strong className="text-slate-400">Entrada Def.:</strong> {evaluation.entrada_defensiva}</div>
              <div><strong className="text-slate-400">Pos. Defensivo:</strong> {evaluation.posicionamiento_defensivo}</div>
              <div><strong className="text-slate-400">Trabajo Def.:</strong> {evaluation.trabajo_defensivo}</div>
              <div><strong className="text-slate-400">Pase Corto:</strong> {evaluation.pase_corto}</div>
              <div><strong className="text-slate-400">Pase Largo:</strong> {evaluation.pase_largo}</div>
              <div><strong className="text-slate-400">Control Orien.:</strong> {evaluation.control_orientado}</div>
              <div><strong className="text-slate-400">Regate:</strong> {evaluation.regate}</div>
              <div><strong className="text-slate-400">Centros:</strong> {evaluation.centros}</div>
              <div><strong className="text-slate-400">Finalización:</strong> {evaluation.finalizacion}</div>
              <div><strong className="text-slate-400">Disparo Lej.:</strong> {evaluation.disparo_lejano}</div>
              <div><strong className="text-slate-400">Trabajo Ofen.:</strong> {evaluation.trabajo_ofensivo}</div>
              <div><strong className="text-slate-400">Visión Juego:</strong> {evaluation.vision_juego}</div>
              <div><strong className="text-slate-400">Intel. Táctica:</strong> {evaluation.inteligencia_tactica}</div>
              <div><strong className="text-slate-400">Liderazgo:</strong> {evaluation.liderazgo}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
