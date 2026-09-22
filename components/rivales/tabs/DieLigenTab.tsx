'use client';
import React, { useState, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { getStaffPasskey, setStaffPasskey } from '@/lib/passkey';
import { StaffPasskeyModal } from '@/components/common/StaffPasskeyModal';
import {
  RefreshCw,
  Trophy,
  Calendar,
  AlertCircle,
  Key,
} from 'lucide-react';

import { Club, ClubSeason } from '@/hooks/useClubs';
import { DieLigenMatchReportViewer } from '../dieligen/DieLigenMatchReportViewer';

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

interface DieLigenTabProps {
  club?: Club | null;
  season?: ClubSeason | null;
}

/**
 * DieLigenTab — Fase 1 (Visor de Informes Offline + Conexión Segura con Die Ligen)
 *
 * Mantiene intacta la infraestructura de conexión existente para comprobaciones manuales,
 * pero no realiza llamadas automáticas en el montaje para permitir el trabajo offline fluido.
 */
export function DieLigenTab({ club, season }: DieLigenTabProps) {
  const { currentUser } = useEditMode();
  // Inicializado en false para no bloquear la vista con pantalla de carga al montar
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DieLigenStatusResponse | null>(null);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);

  const checkConnection = useCallback(async (explicitPass?: string) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      const staffPass = (explicitPass || currentUser?.pass || getStaffPasskey() || '').trim();
      const staffUser = (currentUser?.id || 'zigor').trim().toLowerCase();

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

  // En esta fase offline NO se ejecuta checkConnection automáticamente al montar,
  // preservando la función para activación manual con el botón "Comprobar estado".

  const isConnected = Boolean(status?.connected);
  const errorCode = status?.errorCode;
  const errorConfig = errorCode ? ERROR_PHASE_CONFIG[errorCode] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra superior de estado de conexión (conservada íntegramente) */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Badge de estado */}
          {status === null ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/80 border border-slate-700/80 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Modo Offline (Sin llamada automática)
            </span>
          ) : isConnected ? (
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

          {/* TEMPORADA */}
          {isConnected && status?.temporadaActual && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Temporada {status.temporadaActual}
            </span>
          )}

          {/* COMPETICIONES */}
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
          type="button"
          onClick={() => checkConnection()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all disabled:opacity-50"
          title="Reintentar comprobación"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Comprobando...' : 'Comprobar estado'}</span>
        </button>
      </div>

      {/* Aviso discreto si hubo error en comprobación manual */}
      {status !== null && !isConnected && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{errorConfig?.title || 'Aviso de conexión'}: </span>
              <span className="text-amber-200/90">{status?.error}</span>
            </div>
          </div>
          {errorCode === 'APP_AUTH_UNAUTHORIZED' && (
            <button
              type="button"
              onClick={() => setIsPasskeyModalOpen(true)}
              className="px-3 py-1 text-[11px] font-bold text-white bg-[#CC0E21] hover:bg-red-700 rounded-lg shrink-0 flex items-center gap-1.5"
            >
              <Key className="w-3 h-3" />
              Introducir clave staff
            </button>
          )}
        </div>
      )}

      {/* ─── VISOR DEL INFORME DE PARTIDO (PROTOTIPO 2) ─────────────────── */}
      <DieLigenMatchReportViewer club={club} season={season} />

      {/* Modal de autorización con clave de staff cuando sea requerida */}
      <StaffPasskeyModal
        isOpen={isPasskeyModalOpen}
        onClose={() => setIsPasskeyModalOpen(false)}
        onSuccess={(newKey) => {
          setStaffPasskey(newKey);
          setIsPasskeyModalOpen(false);
          checkConnection(newKey);
        }}
        title="Autorización del Cuerpo Técnico"
        description="Introduce la clave de acceso privada del cuerpo técnico para autorizar la conexión con Die Ligen."
        errorMsg={status?.errorCode === 'APP_AUTH_UNAUTHORIZED' ? status.error : null}
      />
    </div>
  );
}
