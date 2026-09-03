'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import {
  CloudCheck,
  CloudOff,
  Loader2,
  RefreshCw,
  Trophy,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface DieLigenStatusResponse {
  connected: boolean;
  temporadaActual: string | null;
  competiciones: string[];
  error: string | null;
}

/**
 * DieLigenTab — Fase 2A (Conexión Segura con Die Ligen)
 *
 * Conecta exclusivamente a la ruta interna de servidor /api/die-ligen/status.
 * Muestra el estado de la conexión, temporada actual, competiciones suscritas
 * y el estado de partidos sin exponer jamás credenciales ni almacenar datos.
 */
export function DieLigenTab() {
  const { currentUser } = useEditMode();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DieLigenStatusResponse | null>(null);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id && currentUser?.pass) {
        headers['x-editor-user'] = currentUser.id;
        headers['x-editor-pass'] = currentUser.pass;
      }

      const res = await fetch('/api/die-ligen/status', {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      const data: DieLigenStatusResponse = await res.json();
      setStatus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de comunicación con el servidor';
      setStatus({
        connected: false,
        temporadaActual: null,
        competiciones: [],
        error: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Formateador amigable de la temporada
  const formatSeason = (raw: string | null): string => {
    if (!raw) return 'Temporada 26/27';
    if (raw.includes('26') || raw.includes('2026') || raw.includes('27') || raw.includes('2027')) {
      return 'Temporada 26/27';
    }
    return `Temporada ${raw}`;
  };

  // ────────────────────────────────────────────────────────────
  // ESTADO 1: Comprobando conexión
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#CC0E21] animate-spin" />
          </div>
          <span className="absolute -top-2 -right-2 bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
            Comprobando conexión
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-2">
          Verificando enlace con Die Ligen
        </h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Consultando estado de autenticación, temporada activa y competiciones suscritas...
        </p>
      </div>
    );
  }

  const isConnected = Boolean(status?.connected);
  const competiciones = status?.competiciones && status.competiciones.length > 0
    ? status.competiciones
    : ['División de Honor Juvenil Grupo 2'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra de estado de conexión y contexto */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Badge de estado */}
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Error de conexión
            </span>
          )}

          {/* Temporada */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {formatSeason(status?.temporadaActual || null)}
          </span>

          {/* Competición asignada */}
          {competiciones.map((comp, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {comp}
            </span>
          ))}
        </div>

        {/* Botón de recarga manual */}
        <button
          onClick={checkConnection}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all disabled:opacity-50"
          title="Reintentar comprobación"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Comprobar estado</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────
          ESTADO 2: Conectado con éxito
          ──────────────────────────────────────────────────────────── */}
      {isConnected ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-slate-900/20 border border-slate-800/60 rounded-3xl">
          <div className="h-16 w-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center mb-5">
            <CloudCheck className="h-8 w-8 text-emerald-400" />
          </div>

          <h3 className="text-base font-bold text-slate-200 mb-2">
            Conectado, todavía sin partidos
          </h3>

          <p className="text-sm text-slate-500 max-w-md leading-relaxed">
            Cuando haya partidos sincronizados aparecerán aquí para analizarlos,
            revisar sus conclusiones y aprobarlas.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            0 partidos sincronizados en local
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────
           ESTADO 3: Error de conexión
           ──────────────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-slate-900/20 border border-slate-800/60 rounded-3xl">
          <div className="h-16 w-16 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-center mb-5">
            <CloudOff className="h-8 w-8 text-amber-500" />
          </div>

          <h3 className="text-base font-bold text-slate-200 mb-2">
            Error de conexión con Die Ligen
          </h3>

          <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-4">
            {status?.error || 'No se pudo establecer comunicación con el servicio de Die Ligen.'}
          </p>

          <p className="text-xs text-slate-500 max-w-sm">
            Verifica que las variables de entorno <code className="text-slate-400 font-mono">DIE_LIGEN_USERNAME</code> y{' '}
            <code className="text-slate-400 font-mono">DIE_LIGEN_PASSWORD</code> estén configuradas en el servidor.
          </p>

          <button
            onClick={checkConnection}
            className="mt-6 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar conexión
          </button>
        </div>
      )}
    </div>
  );
}
