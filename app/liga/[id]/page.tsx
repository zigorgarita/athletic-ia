import React from 'react';
import { Metadata } from 'next';
import { CentroPartidoClient } from '@/components/liga/CentroPartidoClient';

export const metadata: Metadata = {
  title: 'Centro de Partido - indautxu_26_27',
  description: 'Análisis táctico, vídeos, ABP, informe del analista y documentación del encuentro.',
};

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return <CentroPartidoClient matchId={params.id} />;
}
