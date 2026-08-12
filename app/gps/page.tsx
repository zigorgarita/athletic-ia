import React from 'react';
import { Metadata } from 'next';
import { GPSClient } from '@/components/gps/GPSClient';

export const metadata: Metadata = {
  title: 'Rendimiento Físico GPS por Partido - indautxu_26_27',
  description: 'Análisis y métricas de rendimiento físico GPS asociadas a partidos de Liga y Amistosos.',
};

export default function Page() {
  return <GPSClient />;
}
