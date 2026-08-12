import React from 'react';
import { Metadata } from 'next';
import { AnalisisClient } from '@/components/analisis/AnalisisClient';

export const metadata: Metadata = {
  title: 'Dashboard Plantilla - indautxu_26_27',
  description: 'Resumen de evaluaciones del staff, distribución de plantilla y minutos registrados.',
};

export default function Page() {
  return <AnalisisClient mode="dashboard" />;
}
