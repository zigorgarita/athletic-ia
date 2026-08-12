import React from 'react';
import { Metadata } from 'next';
import { AnalisisClient } from '@/components/analisis/AnalisisClient';

export const metadata: Metadata = {
  title: 'Comparador Plantilla - indautxu_26_27',
  description: 'Comparación 1vs1 de evaluación del staff y estadísticas de temporada.',
};

export default function Page() {
  return <AnalisisClient mode="comparator" />;
}
