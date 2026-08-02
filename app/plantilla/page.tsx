import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { PlantillaClient } from '@/components/players/PlantillaClient';

export const metadata: Metadata = {
  title: 'Plantilla de Jugadores - indautxu_26_27',
  description: 'Gestione la plantilla de jugadores de fútbol, dorsales y demarcaciones del club.',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-8 w-full animate-pulse rounded-xl bg-slate-900" />}>
      <PlantillaClient />
    </Suspense>
  );
}
