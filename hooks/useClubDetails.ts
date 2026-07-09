import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Club, ClubSeason } from './useClubs';
import { useEditMode } from '@/context/EditModeContext';

// Global variable to prevent infinite loops even if the component unmounts/remounts
let globalLastFetchTime = 0;
let globalFetchCount = 0;

export function useClubDetails(clubId: string, temporada: string = '2026-27') {
  const [club, setClub] = useState<Club | null>(null);
  const [season, setSeason] = useState<ClubSeason | null>(null);
  const [completitud, setCompletitud] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadData = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      setError('ID de club no especificado');
      return;
    }

    const now = Date.now();
    if (now - globalLastFetchTime < 10000) {
      console.warn('loadData called too frequently (possible infinite loop), blocking fetch.');
      setLoading(false); // Make sure it stops showing skeletons!
      return;
    }
    
    globalFetchCount += 1;
    console.log(`[useClubDetails] Fetching data for clubId: ${clubId} (Attempt: ${globalFetchCount})`);

    setLoading(true);
    setError(null);
    try {
      const { data: clubData, error: clubErr } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      if (clubErr) throw clubErr;
      setClub(clubData);

      const { data: seasonData, error: seasonErr } = await supabase
        .from('club_seasons')
        .select('*')
        .eq('club_id', clubId)
        .eq('temporada', temporada)
        .single();

      if (seasonErr && seasonErr.code !== 'PGRST116') {
        throw seasonErr;
      }
      setSeason(seasonData || null);

      // Calcular completitud básica de la ficha
      const checks = [
        !!(clubData.ciudad || clubData.provincia),
        !!(clubData.campo_nombre),
        !!(clubData.presidente || clubData.director_deportivo || clubData.web),
        !!(clubData.escudo_url),
        !!(clubData.colores),
        !!(clubData.equipacion_local),
        !!(clubData.coordenadas_gps),
      ];
      const filled = checks.filter(Boolean).length;
      setCompletitud(Math.round((filled / checks.length) * 100));

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar';
      setError(msg);
      console.error('[useClubDetails] Error fetching:', err);
    } finally {
      setLoading(false);
      globalLastFetchTime = Date.now();
      console.log(`[useClubDetails] Finished fetching data for clubId: ${clubId}`);
    }
  }, [clubId, temporada]);

  useEffect(() => {
    loadData();
  }, []); // Force run only once on mount

  const updateClub = async (data: Partial<Club>): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: { ...data, id: clubId },
        conflict_columns: '{id}',
        staff_passkey: passkey,
      });
      if (rpcErr) throw rpcErr;
      await loadData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      setError(msg);
      return false;
    }
  };

  const updateSeason = async (data: Partial<ClubSeason>): Promise<boolean> => {
    try {
      if (!season?.id) return false;
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_seasons',
        payload: { ...data, id: season.id },
        conflict_columns: '{id}',
        staff_passkey: passkey,
      });
      if (rpcErr) throw rpcErr;
      await loadData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar season';
      setError(msg);
      return false;
    }
  };

  return { club, season, completitud, loading, error, refetch: loadData, updateClub, updateSeason };
}
