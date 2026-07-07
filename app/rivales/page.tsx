import React from 'react';
import { Metadata } from 'next';
import { RivalesClient } from '@/components/rivales/RivalesClient';

export const metadata: Metadata = {
  title: 'Rivales - indautxu_26_27',
  description: 'Scouting de Rivales del Indautxu Juvenil A.',
};

export default function Page() {
  return <RivalesClient />;
}
