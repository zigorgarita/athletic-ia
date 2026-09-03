'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { getStaffPasskey } from '@/lib/passkey';
import {
  CloudCheck,
  CloudOff,
  Loader2,
  RefreshCw,
  Trophy,
  Calendar,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export type DieLigenErrorCode =
  | 'APP_AUTH_UNAUTHORIZED'
  | 'DIE_LIGEN_CONFIG_MISSING'
  | 'DIE_LIGEN_TOKEN_FAILED'
  | 'DIE_LIGEN_UPSTREAM_UNAUTHORIZED'
  | 'DIE_LIGEN_UPSTREAM_ERROR';

interface DieLigenStatusResponse {
  connected: boolean;
  errorCode: DieLigenErrorCode | null;
  error: string | null;
  temporadaActual: string | null;
  competiciones: string[];
}

const ERROR_PHASE_CONFIG: Record<
  DieLigenErrorCode,
  { label: string; title: string; hint: string }
> = {
  APP_AUTH_UNAUTHORIZED: {
    label: 'Error Autenticación App (401)',
    title: 'Autorización de aplicación requerida',
    hint: 'La ruta interna /api/die-ligen/status no pudo validar las credenciales de cuerpo técnico de la app. Activa el modo edición o verifica las claves de staff.',
  },
  DIE_LIGEN_CONFIG_MISSING: {
    label: 'Configuración Incompleta',
    title: 'Variables no configuradas en servidor',
    hint: 'Faltan DIE_LIGEN_USERNAME o DIE_LIGEN_PASSWORD en las variables de entorno de Vercel.',
  },
  DIE_LIGEN_TOKEN_FAILED: {
    label: 'Fallo de Token Externo',
    title: 'Credenciales de Die Ligen rechazadas',
    hint: 'El endpoint POST /oauth/token de Die Ligen rechazó las credenciales configuradas en el servidor.',
  },
  DIE_LIGEN_UPSTREAM_UNAUTHORIZED: {
    label: 'Token Rechazado por Die Ligen (401)',
    title: 'Acceso no autorizado en Die Ligen',
    hint: 'La API externa de Die Ligen rechazó el token de autorización tras el intento de renovación.',
  },
  DIE_LIGEN_UPSTREAM_ERROR: {
    label: 'Error de Red / Servicio Externo',
    title: 'Error de comunicación con Die Ligen',
    hint: 'Se produjo un error al consultar los endpoints de temporadas o competiciones en coaches.ligen.football.',
  },
};

/**
 * DieLigenTab — Fase 2A (Conexión Segura con Die Ligen)
 *
 * Conecta exclusivamente a la ruta interna de servidor /api/die-ligen/status.
 * Utiliza exactamente el mismo patrón de autorización que los hooks existentes:
 * envía x-editor-user y x-editor-pass únicamente si hay contraseña disponible,
 * permitiendo que el fallback del servidor funcione si no hay credenciales activas.
 */
export function DieLigenTab() {
  const { currentUser } = useEditMode();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DieLigenStatusResponse | null>(null);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      // Mismo origen y formato de credenciales que hooks existentes (useClubDocuments, useClubAIReports)
      const staffPass = (currentUser?.pass || getStaffPasskey() || '').trim();
      const staffUser = (currentUser?.id || 'zigor').trim().toLowerCase();

      // Enviar credenciales de staff ÚNICAMENTE si existe contraseña no vacía
      // para evitar que una cabecera vacía anule el fallback del servidor
      if (staffPass) {
        headers['x-editor-user'] = staffUser;
        headers['x-editor-pass'] = staffPass;
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
        errorCode: 'DIE_LIGEN_UPSTREAM_ERROR',
        error: msg,
        temporadaActual: null,
        competiciones: [],
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

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
  const errorCode = status?.errorCode;
  const errorConfig = errorCode ? ERROR_PHASE_CONFIG[errorCode] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra superior de estado */}
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
              {errorConfig?.label || 'Error de conexión'}
            </span>
          )}

          {/* TEMPORADA: se muestra ÚNICAMENTE si está conectado y viene un valor real */}
          {isConnected && status?.temporadaActual && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Temporada {status.temporadaActual}
            </span>
          )}

          {/* COMPETICIONES: se muestran ÚNICAMENTE si está conectado y vienen en la respuesta */}
          {isConnected && status?.competiciones && status.competiciones.length > 0 && (
            status.competiciones.map((comp, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {comp}
              </span>
            ))
          )}
        </div>

        {/* Botón de comprobación manual */}
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
           ESTADO 3: Error de conexión detallado por fase
           ──────────────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-900/20 border border-slate-800/60 rounded-3xl max-w-2xl mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-center mb-5">
            {errorCode === 'APP_AUTH_UNAUTHORIZED' ? (
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            ) : (
              <CloudOff className="h-8 w-8 text-amber-500" />
            )}
          </div>

          {/* Código de fase del error */}
          {errorCode && (
            <span className="inline-block mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
              Fase: {errorCode}
            </span>
          )}

          <h3 className="text-base font-bold text-slate-200 mb-2">
            {errorConfig?.title || 'Error de conexión con Die Ligen'}
          </h3>

          <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-3">
            {status?.error || 'No se pudo establecer comunicación con el servicio.'}
          </p>

          {errorConfig?.hint && (
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
              {errorConfig.hint}
            </p>
          )}

          <button
            onClick={checkConnection}
            className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar comprobación
          </button>
        </div>
      )}
    </div>
  );
}
