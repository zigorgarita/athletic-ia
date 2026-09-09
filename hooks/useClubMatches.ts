import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ClubMatch {
  id: string;
  club_season_id: string;
  our_match_id: string | null;
  fecha: string | null;
  hora: string | null;
  competicion: string | null;
  jornada: string | null;
  rival_en_ese_partido: string | null;
  local_visitante: 'Local' | 'Visitante' | null;
  campo: string | null;
  arbitro: string | null;
  resultado: string | null;
  goles_favor: number | null;
  goles_contra: number | null;
  sistema_rival: string | null;
  sistema_nuestro: string | null;
  alineacion_rival: any;
  estadisticas: any;
  informe_analista: string | null;
  informe_ia: string | null;
  observaciones_mister: string | null;
  valoracion: number | null;
  distancia_km: number | null;
  tiempo_viaje_min: number | null;
  created_at: string;
}

export function useClubMatches(seasonId: string | undefined) {
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadMatches = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('club_scouting_matches')
        .select('*')
        .eq('club_season_id', seasonId)
        .order('fecha', { ascending: false });

      if (err) throw err;
      setMatches(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar partidos del rival');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const saveMatch = async (data: Partial<ClubMatch>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();

      const payload = { ...data, club_season_id: seasonId };
      const res = await fetch('/api/clubs/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error al guardar partido del rival (${res.status})`);
      }

      await loadMatches();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar partido del rival');
      return false;
    }
  };

  const deleteMatch = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const res = await fetch(`/api/clubs/matches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error al borrar partido del rival (${res.status})`);
      }

      setMatches(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar partido del rival');
      return false;
    }
  };

  return { matches, loading, error, refetch: loadMatches, saveMatch, deleteMatch };
}
