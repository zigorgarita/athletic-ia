'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PlanningTaskLibrary } from '@/types';
import { BibliotecaTareasView } from './BibliotecaTareasView';

interface BibliotecaTareasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: PlanningTaskLibrary) => void;
}

export function BibliotecaTareasModal({
  isOpen,
  onClose,
  onSelectTask
}: BibliotecaTareasModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 md:p-6 overflow-hidden flex flex-col h-full space-y-2">
          <div className="flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar biblioteca"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <BibliotecaTareasView
              isModal={true}
              onClose={onClose}
              onSelectTask={onSelectTask}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
