import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { DieLigueActasClient } from '@/components/die-ligue-actas/DieLigueActasClient';

export const metadata: Metadata = {
  title: 'Indautxu · Die Ligue - indautxu_26_27',
  description: 'Visor paralelo de actas deportivas, minutaje y eventos tácticos alimentado exclusivamente por Die Ligue.',
};

export default function IndautxuDieLiguePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
          <div className="h-40 w-full rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="h-96 w-full rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800" />
        </div>
      }
    >
      <DieLigueActasClient />
    </Suspense>
  );
}
