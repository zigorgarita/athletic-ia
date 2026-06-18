import React from 'react';
import { Metadata } from 'next';
import { ABPClient } from '@/components/tactica/ABPClient';

export const metadata: Metadata = {
  title: 'Estrategia ABP - indautxu_26_27',
  description: 'Diseño y almacenamiento de acciones a balón parado.',
};

export default function Page() {
  return <ABPClient />;
}
