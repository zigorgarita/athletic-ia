import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { DatosIndautxuDieLigueClient } from '@/components/datos-indautxu-die-ligue/DatosIndautxuDieLigueClient';

export const metadata: Metadata = {
  title: 'Datos Indautxu · Die Ligue - indautxu_26_27',
  description: 'Panel integral de rendimiento de Liga, estadísticas acumuladas, clasificación calculada y calendario alimentado por Die Ligue.',
};

export default function DatosIndautxuDieLiguePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
          <div className="h-44 w-full rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="h-96 w-full rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800" />
        </div>
      }
    >
      <DatosIndautxuDieLigueClient />
    </Suspense>
  );
}
