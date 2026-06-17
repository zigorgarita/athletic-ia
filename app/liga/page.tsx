import React from 'react';
import { Metadata } from 'next';
import { LigaClient } from '@/components/liga/LigaClient';

export const metadata: Metadata = {
  title: 'Liga y Jornadas - Mi Equipo',
  description: 'Gestión de convocatorias, marcadores y estadísticas de partidos del Indautxu Juvenil A.',
};

export default function Page() {
  return <LigaClient />;
}
