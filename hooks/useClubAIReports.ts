import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

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
  const { verifyWritePermission } = useEditMode();

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

  return { reports, loading, error, refetch: loadReports, saveReport, deleteReport };
}
