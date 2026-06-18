import React from 'react';
import { Metadata } from 'next';
import { AnalisisClient } from '@/components/analisis/AnalisisClient';

export const metadata: Metadata = {
  title: 'Comparador - indautxu_26_27',
  description: 'Comparativa interactiva de rendimiento 1vs1 de los futbolistas.',
};

export default function Page() {
  return <AnalisisClient mode="comparator" />;
}
