'use client';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { setStaffPasskey } from '@/lib/passkey';

interface LoginScreenProps {
  children: React.ReactNode;
}

export function LoginScreen({ children }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); // null mientras lee localStorage
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Comprobar si ya estaba autorizado previamente
    const savedAuth = localStorage.getItem('coach_authorized');
    if (savedAuth === 'true') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        localStorage.setItem('coach_authorized', 'true');
        setStaffPasskey(password.trim());
        setIsAuthorized(true);
      } else {
        setIsShaking(true);
        setError(data.error || 'Contraseña de acceso incorrecta');
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch {
      setIsShaking(true);
      setError('Error de conexión al verificar la clave');
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // Si aún no hemos leído localStorage, no mostramos nada para evitar parpadeos
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#CC0E21]" />
      </div>
    );
  }

  // Si ya está autorizado, renderizar el panel principal
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Pantalla de bloqueo de acceso
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Círculos decorativos desenfocados en el fondo (Efecto Glassmorphism) */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-[#CC0E21]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-green-600/5 blur-[100px] pointer-events-none" />

      {/* Tarjeta de Login */}
      <div
        className={`w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl z-10 transition-all duration-200 ${
          isShaking ? 'animate-bounce' : ''
        }`}
        style={{
          animationIterationCount: isShaking ? 2 : 'unset',
          animationDuration: isShaking ? '0.2s' : 'unset',
        }}
      >
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg shadow-red-500/5 mb-2">
            <img src="/escudo.jpg" alt="S.D. Indautxu" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-1.5">
            Acceso Autorizado
          </h2>
          <p className="text-slate-400 text-xs max-w-xs mt-1 leading-relaxed">
            Esta sección contiene información deportiva del club. Ingrese la clave de entrenadores para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-center gap-2 animate-pulse">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Contraseña */}
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña de Entrenadores"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-11 py-3 text-sm rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#CC0E21] focus:ring-1 focus:ring-[#CC0E21]"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 outline-none"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Botón Ingresar */}
          <Button type="submit" className="w-full flex items-center justify-center gap-2 font-bold py-3" disabled={loading}>
            <ShieldCheck className="h-4 w-4" />
            {loading ? 'Verificando...' : 'Verificar Acceso'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
            Indautxu DH 2026-27
          </span>
        </div>
      </div>
    </div>
  );
}
