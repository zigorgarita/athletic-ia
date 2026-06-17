import React from 'react';
import { Metadata } from 'next';
import { GPSClient } from '@/components/gps/GPSClient';

export const metadata: Metadata = {
  title: 'Rendimiento Físico GPS - indautxu_26_27',
  description: 'Importador de logs GPS y análisis del rendimiento físico e intensidad de la plantilla.',
};

export default function Page() {
  return <GPSClient />;
}
