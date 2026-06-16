import React from 'react';
import { Metadata } from 'next';
import { PlantillaClient } from '@/components/players/PlantillaClient';

export const metadata: Metadata = {
  title: 'Plantilla de Jugadores - Mi Equipo',
  description: 'Gestione la plantilla de jugadores de fútbol, dorsales y demarcaciones del club.',
};

export default function Page() {
  return <PlantillaClient />;
}
