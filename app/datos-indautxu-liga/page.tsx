import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { DatosIndautxuLigaClient } from '@/components/datos-indautxu/DatosIndautxuLigaClient';

export const metadata: Metadata = {
  title: 'Datos Indautxu de Liga - indautxu_26_27',
  description: 'Panel oficial de estadísticas de plantilla, clasificación RFEF y calendario de Liga del SD Indautxu.',
};

export default function DatosIndautxuLigaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
          <div className="h-40 w-full rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="h-96 w-full rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800" />
        </div>
      }
    >
      <DatosIndautxuLigaClient />
    </Suspense>
  );
}
