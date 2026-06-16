import React from 'react';
import { Metadata } from 'next';
import { EvaluacionesClient } from '@/components/evaluations/EvaluacionesClient';

export const metadata: Metadata = {
  title: 'Evaluaciones de Rendimiento - Mi Equipo',
  description: 'Historial de evaluaciones de rendimiento deportivo, gráficas de evolución y rankings de jugadores.',
};

export default function Page() {
  return <EvaluacionesClient />;
}
