import { useState, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { getStaffPasskey } from '@/lib/passkey';

export interface BriefingPlayerPayload {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number;
  demarcacion: string;
  label_posicion: string;
  x: number;
  y: number;
}

export interface BriefingRoleCardPayload {
  posicion_label: string;
  linea: string;
  fase_ofensiva: string | null;
  fase_defensiva: string | null;
  transiciones: string | null;
  instrucciones_especificas: string | null;
}

export interface TacticalBriefingPayload {
  rivalName: string;
  sistemaPropio: string;
  sistemaRival: string;
  ventajas: string;
  desventajas: string;
  zonaConflicto: string;
  dueloClave: string;
  tareasLineas: string;
  onceInicial?: BriefingPlayerPayload[];
  roleCards?: BriefingRoleCardPayload[];
}

export interface SynthesizedLinesResponse {
  porteria: string[];
  defensa: string[];
  mediocampo: string[];
  delantera: string[];
}

export interface SynthesizedPlayerInstructions {
  playerId: string;
  posicion_label: string;
  fase_ofensiva: string;
  fase_defensiva: string;
  transiciones: string;
  instrucciones_especificas: string;
}

export interface SynthesizedPlayersResponse {
  players: SynthesizedPlayerInstructions[];
}

export function useTacticalBriefing() {
  const [isGeneratingLines, setIsGeneratingLines] = useState(false);
  const [isGeneratingPlayers, setIsGeneratingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const synthesizeLines = useCallback(async (payload: TacticalBriefingPayload): Promise<SynthesizedLinesResponse | null> => {
    setIsGeneratingLines(true);
    setError(null);
    try {
      verifyWritePermission();

      const passkey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const response = await fetch('/api/tactical-briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coach-staff-passkey': passkey,
          'x-staff-passkey': passkey
        },
        body: JSON.stringify({
          ...payload,
          actionType: 'synthesize_lines'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al sintetizar el briefing por líneas.');
      }

      const data = await response.json();
      return data as SynthesizedLinesResponse;
    } catch (err: unknown) {
      console.error('Error in synthesizeLines hook:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Error al comunicarse con el preparador de briefing.');
      return null;
    } finally {
      setIsGeneratingLines(false);
    }
  }, [verifyWritePermission]);

  const synthesizePlayers = useCallback(async (payload: TacticalBriefingPayload): Promise<SynthesizedPlayersResponse | null> => {
    setIsGeneratingPlayers(true);
    setError(null);
    try {
      verifyWritePermission();

      const passkey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const response = await fetch('/api/tactical-briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coach-staff-passkey': passkey,
          'x-staff-passkey': passkey
        },
        body: JSON.stringify({
          ...payload,
          actionType: 'synthesize_players'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al sintetizar las fichas individuales.');
      }

      const data = await response.json();
      return data as SynthesizedPlayersResponse;
    } catch (err: any) {
      console.error('Error in synthesizePlayers hook:', err);
      setError(err.message || 'Error al comunicarse con el preparador de briefing.');
      return null;
    } finally {
      setIsGeneratingPlayers(false);
    }
  }, [verifyWritePermission]);

  return {
    synthesizeLines,
    synthesizePlayers,
    isGeneratingLines,
    isGeneratingPlayers,
    error,
    setError
  };
}
