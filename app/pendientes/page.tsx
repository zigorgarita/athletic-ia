import React from 'react';
import { Metadata } from 'next';
import { PendientesClient } from '@/components/pendientes/PendientesClient';

export const metadata: Metadata = {
  title: 'Pendientes - Indautxu 26/27',
  description: 'Resumen de lesiones activas, multas pendientes y reuniones abiertas del equipo.',
};

export default function Page() {
  return <PendientesClient />;
}
