import React from 'react';
import { Metadata } from 'next';
import { TacticaClient } from '@/components/tactica/TacticaClient';

export const metadata: Metadata = {
  title: 'Pizarra Táctica y ABP - indautxu_26_27',
  description: 'Planificación de alineaciones, sistemas de juego y jugadas de estrategia a balón parado.',
};

export default function Page() {
  return <TacticaClient />;
}
