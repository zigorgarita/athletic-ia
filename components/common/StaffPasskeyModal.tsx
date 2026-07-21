import React, { useState } from 'react';
import { Lock, Key, AlertTriangle, X } from 'lucide-react';
import { setStaffPasskey } from '@/lib/passkey';

interface StaffPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passkey: string) => void;
  title?: string;
  description?: string;
  errorMsg?: string | null;
}

export function StaffPasskeyModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Acceso del Cuerpo Técnico',
  description = 'Introduce la clave de acceso privada del cuerpo técnico para autorizar esta operación.',
  errorMsg,
}: StaffPasskeyModalProps) {
  const [inputPasskey, setInputPasskey] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputPasskey.trim();
    if (!cleanKey) {
      setLocalError('Debes introducir la clave de acceso del cuerpo técnico.');
      return;
    }
    setLocalError(null);
    setStaffPasskey(cleanKey);
    onSuccess(cleanKey);
    setInputPasskey('');
  };

  const activeError = errorMsg || localError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 flex flex-col gap-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Descripción */}
        <p className="text-xs text-slate-400 leading-relaxed">
          {description}
        </p>

        {/* Alerta de Error */}
        {activeError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Clave de Acceso (COACH_STAFF_PASSKEY)
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputPasskey}
                onChange={(e) => setInputPasskey(e.target.value)}
                placeholder="Introduce la clave del cuerpo técnico..."
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-600 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              Autorizar e Integrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
