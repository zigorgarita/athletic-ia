'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useEditMode } from '@/context/EditModeContext';

interface EditModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditModeModal({ isOpen, onClose }: EditModeModalProps) {
  const { unlockEditing } = useEditMode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await unlockEditing(username, password);
      if (res.success) {
        setUsername('');
        setPassword('');
        onClose();
      } else {
        setError(res.error || 'No autorizado');
      }
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Desbloquear Edición">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center text-center gap-2 mb-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1">
            <ShieldAlert size={24} />
          </div>
          <p className="text-slate-400 text-xs max-w-xs">
            Ingrese sus credenciales de entrenador autorizado para activar el modo de edición.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Editor autorizado
            </label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
              required
              disabled={loading}
              autoFocus
            >
              <option value="" disabled className="bg-slate-900 text-slate-500">
                Selecciona un editor
              </option>
              <option value="zigor" className="bg-slate-900 text-slate-100">
                Zigor
              </option>
              <option value="aitor" className="bg-slate-900 text-slate-100">
                Aitor
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Contraseña de edición
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 font-semibold"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 font-semibold flex items-center justify-center gap-1.5"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Desbloquear edición'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
