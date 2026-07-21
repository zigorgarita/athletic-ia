import { useState, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { getStaffPasskey } from '@/lib/passkey';

export interface TacticalAnalystPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number;
  demarcacion: string;
  label_posicion: string;
  x: number;
  y: number;
}

export interface TacticalAnalystRivalNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface TacticalAnalystPayload {
  matchId: string | null;
  rivalName: string;
  sistemaPropio: string;
  sistemaRival: string;
  onceInicial: TacticalAnalystPlayer[];
  nodosRival: TacticalAnalystRivalNode[];
}

export interface TacticalAnalystReport {
  ventajas: string;
  desventajas: string;
  zona_conflicto: 'central' | 'interior' | 'exterior';
  duelo_clave: string;
  tareas_lineas: string;
}

export function useTacticalAnalyst() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();
  const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

  const analyzeMatch = useCallback(async (payload: TacticalAnalystPayload): Promise<TacticalAnalystReport | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      verifyWritePermission();

      const passkey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const response = await fetch('/api/tactical-analyst', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coach-staff-passkey': passkey,
          'x-staff-passkey': passkey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al comunicarse con el Analista Táctico.');
      }

      const data = await response.json();
      return data as TacticalAnalystReport;
      
    } catch (err: any) {
      console.error('Error en useTacticalAnalyst:', err);
      const errMsg = err.message || 'Ocurrió un error inesperado al analizar el partido.';
      setError(errMsg);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [verifyWritePermission, passkey]);

  return {
    analyzeMatch,
    isAnalyzing,
    error,
    setError
  };
}
