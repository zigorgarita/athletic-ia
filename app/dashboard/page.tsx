import React from 'react';
import { Metadata } from 'next';
import { AnalisisClient } from '@/components/analisis/AnalisisClient';

export const metadata: Metadata = {
  title: 'Dashboard - indautxu_26_27',
  description: 'Panel general de rendimiento, estadísticas acumuladas y rankings de la plantilla.',
};

export default function Page() {
  return <AnalisisClient mode="dashboard" />;
}
