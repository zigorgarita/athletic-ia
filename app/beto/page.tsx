import React from 'react';
import { Metadata } from 'next';
import { BetoClient } from '@/components/beto/BetoClient';

export const metadata: Metadata = {
  title: 'BETO — Rendimiento & GPS OLIVER | Indautxu DH 2026-27',
  description: 'Módulo de análisis de rendimiento físico y gestión de sesiones exportadas desde dispositivos GPS OLIVER.',
};

export default function BetoPage() {
  return <BetoClient />;
}
