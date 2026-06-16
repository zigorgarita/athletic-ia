import React from 'react';
import { Evaluation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

interface EvaluationChartProps {
  evaluations: Evaluation[];
}

export function EvaluationChart({ evaluations }: EvaluationChartProps) {
  // Ordenar de más antigua a más reciente para mostrar evolución
  const sortedData = [...evaluations].sort(
    (a, b) => new Date(a.fecha_evaluacion).getTime() - new Date(b.fecha_evaluacion).getTime()
  );

  const pointsCount = sortedData.length;

  if (pointsCount < 2) {
    return (
      <Card className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 border-slate-800">
        <TrendingUp className="h-10 w-10 text-slate-600 mb-2" />
        <h4 className="font-semibold text-slate-350 text-sm">Historial insuficiente</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Registra al menos 2 evaluaciones para poder visualizar la gráfica de evolución temporal.
        </p>
      </Card>
    );
  }

  // Dimensiones del gráfico SVG
  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 35, left: 30 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Escalar Y (1 a 5)
  const getY = (val: number) => {
    // 5 es arriba, 1 es abajo
    const ratio = (val - 1) / 4;
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Escalar X (distribución uniforme de los índices)
  const getX = (index: number) => {
    return padding.left + (index / (pointsCount - 1)) * chartWidth;
  };

  // Generar strings de ruta (d) para SVG
  const getPathData = (metric: 'tecnica' | 'tactica' | 'condicional') => {
    return sortedData.reduce((path, item, idx) => {
      const x = getX(idx);
      const y = getY(item[metric]);
      return path + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  };

  // Formatear fecha corta (dd/mm)
  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Evolución del Rendimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative w-full aspect-[5/2] min-h-[200px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid Lines Horizontales (Líneas guía de puntuación 1-5) */}
            {[1, 2, 3, 4, 5].map((level) => {
              const y = getY(level);
              return (
                <g key={level} className="opacity-40">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="semibold"
                    textAnchor="end"
                  >
                    {level}
                  </text>
                </g>
              );
            })}

            {/* Dibujar líneas de evolución métricas */}
            {/* Técnica -> Verde */}
            <path
              d={getPathData('tecnica')}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_2px_4px_rgba(34,197,94,0.15)]"
            />
            {/* Táctica -> Azul/Cian */}
            <path
              d={getPathData('tactica')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_2px_4px_rgba(59,130,246,0.15)]"
            />
            {/* Condicional -> Amarillo */}
            <path
              d={getPathData('condicional')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.15)]"
            />

            {/* Puntos y etiquetas en el eje X */}
            {sortedData.map((item, idx) => {
              const x = getX(idx);
              const yT = getY(item.tecnica);
              const yTa = getY(item.tactica);
              const yC = getY(item.condicional);

              return (
                <g key={item.id}>
                  {/* Círculos guía */}
                  <circle cx={x} cy={yT} r="3" fill="#22c55e" />
                  <circle cx={x} cy={yTa} r="3" fill="#3b82f6" />
                  <circle cx={x} cy={yC} r="3" fill="#f59e0b" />

                  {/* Etiquetas de fechas en eje X */}
                  <text
                    x={x}
                    y={height - padding.bottom + 18}
                    fill="#64748b"
                    fontSize="8"
                    fontWeight="semibold"
                    textAnchor="middle"
                  >
                    {formatShortDate(item.fecha_evaluacion)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Leyenda explicativa en la base */}
        <div className="flex justify-center items-center gap-6 pt-3 mt-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-slate-400">Técnica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">Táctica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-400">Físico</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
