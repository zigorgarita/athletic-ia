import React from 'react';
import { Metadata } from 'next';
import { PlanificacionClient } from '@/components/planificacion/PlanificacionClient';

export const metadata: Metadata = {
  title: 'Planificación de Temporada - indautxu_26_27',
  description: 'Organización de pretemporada, mesociclos, microciclos, sesiones de entrenamiento, conceptos de trabajo y control de cargas.',
};

export default function Page() {
  return <PlanificacionClient />;
}
