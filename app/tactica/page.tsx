import React from 'react';
import { Metadata } from 'next';
import { TacticaClient } from '@/components/tactica/TacticaClient';

export const metadata: Metadata = {
  title: 'Pizarra Táctica y ABP - Mi Equipo',
  description: 'Planificación de alineaciones, sistemas de juego y jugadas de estrategia a balón parado.',
};

export default function Page() {
  return <TacticaClient />;
}
