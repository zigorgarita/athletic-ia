import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ClubPlayer {
  id: string;
  club_season_id: string;
  nombre: string;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  altura: number | null;
  peso: number | null;
  pierna_dominante: 'Diestro' | 'Zurdo' | 'Ambidiestro' | null;
  posicion: string | null;
  dorsal: number | null;
  minutos_jugados: number;
  caracteristicas: string | null;
  fortalezas: string | null;
  debilidades: string | null;
  observaciones: string | null;
  origen?: 'manual' | 'documento' | 'fvf' | 'die_ligen' | 'combinado' | null;
  created_at: string;
  // Campos de participación visual (opcionales)
  partidos_disponibles?: number | null;
  partidos_jugados?: number | null;
  titularidades?: number | null;
  entradas_banquillo?: number | null;
  partidos_completos?: number | null;
  minutos_posibles?: number | null;
  porcentaje_participacion?: number | null;
  minuto_habitual_cambio?: string | null;
  goles?: number | null;
  tarjetas_amarillas?: number | null;
  tarjetas_rojas?: number | null;
  goles_encajados?: number | null;
  porterias_cero?: number | null;
  ultimas_jornadas?: Array<{ jornada: number | string; estado: 'T' | 'S' | 'NC' | 'SD'; minutos?: number }>;
  historial_partidos?: Array<{
    jornada: string | number;
    partido: string;
    fecha?: string;
    titular: boolean;
    minutos: number;
    minuto_entrada?: number | null;
    minuto_salida?: number | null;
    posicion?: string | null;
    goles?: number;
    goles_encajados?: number;
    tarjetas_amarillas?: number;
    tarjetas_rojas?: number;
    sistema?: string | null;
  }>;
}

export function useClubPlayers(seasonId: string | undefined) {
  const [players, setPlayers] = useState<ClubPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadPlayers = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('club_players')
        .select('*')
        .eq('club_season_id', seasonId)
        .order('posicion', { ascending: true })
        .order('dorsal', { ascending: true })
        .order('nombre', { ascending: true });

      if (err) throw err;
      setPlayers(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantilla');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const savePlayer = async (data: Partial<ClubPlayer>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      const isNew = !data.id;
      const payload = { ...data, club_season_id: seasonId, origen: data.origen || 'manual' };
      
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_players',
        payload: payload,
        conflict_columns: isNew ? null : '{id}',
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadPlayers();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar jugador');
      return false;
    }
  };

  const insertBulkPlayers = async (newPlayers: Array<Pick<ClubPlayer, 'nombre'> & Partial<ClubPlayer>>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      if (newPlayers.length === 0) return true;
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const payloads = newPlayers.map(p => ({
        club_season_id: seasonId,
        nombre: p.nombre.trim(),
        dorsal: p.dorsal ?? null,
        posicion: p.posicion ?? null,
        origen: p.origen || 'documento',
        minutos_jugados: 0,
      }));

      const { error: rpcErr } = await supabase.rpc('exec_secure_bulk_upsert', {
        target_table: 'club_players',
        payloads: payloads,
        conflict_columns: null, // Solo inserción limpia de nuevos jugadores
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadPlayers();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al importar jugadores');
      return false;
    }
  };

  const deletePlayer = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'club_players',
        record_id: id,
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      setPlayers(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar jugador');
      return false;
    }
  };

  return { players, loading, error, refetch: loadPlayers, savePlayer, insertBulkPlayers, deletePlayer };
}
