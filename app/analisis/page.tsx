import React from 'react';
import { Metadata } from 'next';
import { AnalisisClient } from '@/components/analisis/AnalisisClient';

export const metadata: Metadata = {
  title: 'Panel Analítico y Comparador - Mi Equipo',
  description: 'Análisis de rendimiento integral de la plantilla y comparativa de jugadores basada en datos reales de Supabase.',
};

export default function Page() {
  return <AnalisisClient />;
}
