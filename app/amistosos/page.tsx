import React from 'react';
import { Metadata } from 'next';
import { MatchCenterClient } from '@/components/liga/MatchCenterClient';

export const metadata: Metadata = {
  title: 'Partidos Amistosos - indautxu_26_27',
  description: 'Gestión de convocatorias, marcadores y estadísticas de partidos amistosos del Indautxu Juvenil A.',
};

export default function Page() {
  return <MatchCenterClient matchType="AMISTOSO" />;
}
