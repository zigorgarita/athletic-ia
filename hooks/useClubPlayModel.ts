import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ClubPlayModel {
  id: string;
  club_season_id: string;
  version: number;
  fecha: string | null;
  sistema_principal: string | null;
  sistemas_alternativos: string | null;
  salida_balon: string | null;
  construccion: string | null;
  ataque_organizado: string | null;
  ataque_bandas: string | null;
  ataque_interior: string | null;
  transicion_ofensiva: string | null;
  transicion_defensiva: string | null;
  presion: string | null;
  bloque_defensivo: string | null;
  defensa_area: string | null;
  abp_ofensiva: string | null;
  abp_defensiva: string | null;
  created_at: string;
}

export function useClubPlayModel(seasonId: string | undefined) {
  const [playModel, setPlayModel] = useState<ClubPlayModel | null>(null);
  const [history, setHistory] = useState<ClubPlayModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadModel = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('club_play_models')
        .select('*')
        .eq('club_season_id', seasonId)
        .order('version', { ascending: false });

      if (err) throw err;
      
      if (data && data.length > 0) {
        setPlayModel(data[0]);
        setHistory(data);
      } else {
        setPlayModel(null);
        setHistory([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar modelo de juego');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const saveModel = async (data: Partial<ClubPlayModel>, createNewVersion = false): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      const isNew = createNewVersion || !playModel?.id;
      const payload = { 
        ...data, 
        club_season_id: seasonId,
        version: isNew ? (playModel ? playModel.version + 1 : 1) : (playModel?.version || 1),
        fecha: new Date().toISOString().split('T')[0]
      };

      if (createNewVersion) {
        delete payload.id;
      }
      
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_play_models',
        payload: payload,
        conflict_columns: isNew ? null : '{id}',
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadModel();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar modelo de juego');
      return false;
    }
  };

  return { playModel, history, loading, error, refetch: loadModel, saveModel };
}
