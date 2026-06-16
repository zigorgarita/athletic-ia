import React from 'react';
import { Metadata } from 'next';
import { VideosClient } from '@/components/videos/VideosClient';

export const metadata: Metadata = {
  title: 'Videos de Partidos y Análisis Táctico - Mi Equipo',
  description: 'Visualice, organice y reproduzca videos de partidos de fútbol con su respectivo análisis y anotaciones tácticas.',
};

export default function Page() {
  return <VideosClient />;
}
