import React from 'react';
import { Metadata } from 'next';
import { RivalDetailsClient } from '@/components/rivales/RivalDetailsClient';

export const metadata: Metadata = {
  title: 'Detalle del Rival - indautxu_26_27',
  description: 'Información detallada, táctica y scouting del equipo rival.',
};

export default function Page({ params }: { params: { id: string } }) {
  return <RivalDetailsClient rivalId={params.id} />;
}
