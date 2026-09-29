'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { DieLigenMatchReportData } from '@/lib/die-ligen/parser';
import { DieLigenIndividualReportViewer } from './DieLigenIndividualReportViewer';

export interface DieLigenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DieLigenMatchReportData | null;
  fileName?: string;
}

export function DieLigenReportModal({
  isOpen,
  onClose,
  data,
  fileName,
}: DieLigenReportModalProps) {
  if (!isOpen || !data) return null;

  const title = `Informe Die Ligen — Jornada ${data.cabecera.jornada}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-5xl"
    >
      <div className="max-h-[82vh] overflow-y-auto p-4 sm:p-6 space-y-6">
        <DieLigenIndividualReportViewer
          data={data}
          fileName={fileName}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
}
