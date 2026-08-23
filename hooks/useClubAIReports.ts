import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ScoutingBlock {
  capaA_evidencias: string[];
  capaB_interpretacion: string;
  capaC_propuestaIndautxu: string;
  evidenciasIds?: string[];
}

export interface ThreatItem {
  jugador?: string;
  dorsal?: string;
  posicion?: string;
  peligro?: 'critico' | 'alto' | 'medio';
  capaA_evidencia: string;
  capaB_interpretacion: string;
  capaC_propuestaIndautxu: string;
  evidenciaId?: string;
}

export interface WeaknessItem {
  aspecto: string;
  capaA_evidencia: string;
  capaB_interpretacion: string;
  capaC_propuestaIndautxu: string;
  evidenciaId?: string;
}

export interface LineInstructions {
  porteria?: string;
  defensa?: string;
  mediocampo?: string;
  delantera?: string;
}

export interface StructuredScoutingPlan {
  resumenEjecutivo: string;
  sistemaRivalIdentificado?: string;
  comoDefenderles?: ScoutingBlock;
  comoAtacarles?: ScoutingBlock;
  presionYActivadores?: ScoutingBlock;
  salidaBalon?: ScoutingBlock;
  transicionOfensiva?: ScoutingBlock;
  transicionDefensiva?: ScoutingBlock;
  abpOfensivo?: ScoutingBlock;
  abpDefensivo?: ScoutingBlock;
  amenazasPrincipales?: ThreatItem[];
  debilidadesExplotar?: WeaknessItem[];
  consignasPorLineas?: LineInstructions;
  riesgosDelPlan?: string[];
  metadatosAnalisis?: {
    totalObservacionesUsadas?: number;
    documentosFuentes?: string[];
    fechaGeneracion?: string;
  };
}

export interface ClubAIReport {
  id: string;
  club_season_id: string;
  scouting_match_id: string | null;
  tipo: 'Informe inicial' | 'Actualización' | 'Comparativa' | 'Evolución temporada';
  fecha: string | null;
  informe_completo: string | null;
  fortalezas: string | null;
  debilidades: string | null;
  jugadores_clave: string | null;
  como_atacarles: string | null;
  como_defenderles: string | null;
  riesgos: string | null;
  plan_recomendado: string | null;
  alertas: string | null;
  editado_por_mister: boolean;
  created_at: string;
}

export function useClubAIReports(seasonId: string | undefined) {
  const [reports, setReports] = useState<ClubAIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission, currentUser } = useEditMode();

  const loadReports = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('club_ai_reports')
        .select('*')
        .eq('club_season_id', seasonId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setReports(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar informes de IA');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const generateAIScouting = async (
    clubId: string,
    rivalName?: string,
    seasonStr?: string
  ): Promise<{ success: boolean; scouting?: StructuredScoutingPlan; error?: string }> => {
    try {
      if (!seasonId || !clubId) throw new Error('Faltan identificadores de temporada o club.');
      verifyWritePermission();

      const user = currentUser?.id || 'aitor';
      const pass = currentUser?.pass || '';

      const res = await fetch('/api/rivales/generate-ai-scouting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-user': user,
          'x-editor-pass': pass,
        },
        body: JSON.stringify({
          clubId,
          seasonId,
          rivalName,
          season: seasonStr,
        }),
      });

      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? `Respuesta no estructurada del servidor: ${rawText.slice(0, 200)}`
            : `Error del servidor [${res.status}]: ${rawText.slice(0, 300)}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error((data.error as string) || `Error generando scouting [${res.status}]`);
      }

      await loadReports();
      return { success: true, scouting: data.scouting as StructuredScoutingPlan };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar análisis de IA';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const saveReport = async (data: Partial<ClubAIReport>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const isNew = !data.id;
      const payload = { ...data, club_season_id: seasonId };

      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_ai_reports',
        payload: payload,
        conflict_columns: isNew ? null : '{id}',
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadReports();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar informe de IA');
      return false;
    }
  };

  const deleteReport = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'club_ai_reports',
        record_id: id,
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      setReports(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar informe de IA');
      return false;
    }
  };

  return {
    reports,
    loading,
    error,
    refetch: loadReports,
    generateAIScouting,
    saveReport,
    deleteReport,
  };
}
