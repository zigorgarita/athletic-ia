'use client';

import React from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { ABPSection } from './ABPSection';
import { Skeleton } from '@/components/ui/Skeleton';
import { Shield } from 'lucide-react';

export function ABPClient() {
  const { players, loading: loadingPlayers } = usePlayers();

  if (loadingPlayers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
          <Shield className="h-8 w-8 text-[#CC0E21]" />
          Estrategia ABP
        </h1>
        <p className="text-slate-400 text-sm">
          Diseño, posicionamiento y roles para jugadas ensayadas a balón parado.
        </p>
      </div>

      <ABPSection players={players} />
    </div>
  );
}
