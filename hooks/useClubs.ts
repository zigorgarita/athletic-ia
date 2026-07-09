import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface Club {
  id: string;
  nombre: string;
  nombre_corto: string | null;
  escudo_url: string | null;
  imagen_fondo_url: string | null;
  tipo: string;
  ciudad: string | null;
  provincia: string | null;
  comunidad_autonoma: string | null;
  ano_fundacion: number | null;
  colores: string | null;
  equipacion_local: string | null;
  equipacion_visitante: string | null;
  presidente: string | null;
  director_deportivo: string | null;
  web: string | null;
  redes_sociales: Record<string, string> | null;
  cantera: string | null;
  campo_nombre: string | null;
  campo_direccion: string | null;
  campo_google_maps: string | null;
  coordenadas_gps: string | null;
  tiempo_viaje: string | null;
  campo_cesped: string | null;
  campo_dimensiones: string | null;
  campo_capacidad: string | null;
  vestuarios: string | null;
  banquillos: string | null;
  zona_grabacion: string | null;
  observaciones_campo: string | null;
  observaciones_generales: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubSeason {
  id: string;
  club_id: string;
  temporada: string;
  grupo: string | null;
  categoria: string | null;
  estado_scouting: string;
  nivel_dificultad: number;
  estadisticas?: any;
  created_at: string;
  updated_at: string;
}

export interface ClubWithSeason extends Club {
  season?: ClubSeason;
  completitud?: number;
}

/** Calcula el índice de completitud (0-100) en base a qué secciones tienen datos */
function calcCompletitud(club: Club, counts: Record<string, number>): number {
  const checks = [
    // Datos generales del club
    !!(club.ciudad || club.provincia),
    // Campo
    !!(club.campo_nombre),
    // Directiva
    !!(club.presidente || club.director_deportivo || club.web),
    // Escudo
    !!(club.escudo_url),
    // Plantilla
    (counts.players || 0) > 0,
    // Staff
    (counts.staff || 0) > 0,
    // Modelo de juego
    (counts.play_models || 0) > 0,
    // Vídeos
    (counts.videos || 0) > 0,
    // Informes
    (counts.reports || 0) > 0,
    // IA
    (counts.ai_reports || 0) > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function useClubs(temporada: string = '2026-27') {
  const [clubs, setClubs] = useState<ClubWithSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch clubs with their season for the given temporada
      const { data: clubsData, error: clubsErr } = await supabase
        .from('clubs')
        .select('*')
        .eq('tipo', 'LIGA')
        .order('nombre', { ascending: true });

      if (clubsErr) throw clubsErr;

      const { data: seasonsData, error: seasonsErr } = await supabase
        .from('club_seasons')
        .select('*')
        .eq('temporada', temporada);

      if (seasonsErr) throw seasonsErr;

      // Build a map of club_id -> season
      const seasonMap: Record<string, ClubSeason> = {};
      seasonsData?.forEach((s: ClubSeason) => {
        seasonMap[s.club_id] = s;
      });

      // Fetch counts for completitud index
      const seasonIds = seasonsData?.map((s: ClubSeason) => s.id) || [];

      let playerCounts: Record<string, number> = {};
      let staffCounts: Record<string, number> = {};
      let playModelCounts: Record<string, number> = {};
      let videoCounts: Record<string, number> = {};
      let reportCounts: Record<string, number> = {};
      let aiReportCounts: Record<string, number> = {};

      if (seasonIds.length > 0) {
        // Players count per season
        const { data: players } = await supabase
          .from('club_players')
          .select('club_season_id')
          .in('club_season_id', seasonIds);
        players?.forEach((p: { club_season_id: string }) => {
          playerCounts[p.club_season_id] = (playerCounts[p.club_season_id] || 0) + 1;
        });

        // Staff
        const { data: staff } = await supabase
          .from('club_staff')
          .select('club_season_id')
          .in('club_season_id', seasonIds);
        staff?.forEach((s: { club_season_id: string }) => {
          staffCounts[s.club_season_id] = (staffCounts[s.club_season_id] || 0) + 1;
        });

        // Play models
        const { data: models } = await supabase
          .from('club_play_models')
          .select('club_season_id')
          .in('club_season_id', seasonIds);
        models?.forEach((m: { club_season_id: string }) => {
          playModelCounts[m.club_season_id] = (playModelCounts[m.club_season_id] || 0) + 1;
        });

        // Reports
        const { data: reports } = await supabase
          .from('club_reports')
          .select('club_season_id')
          .in('club_season_id', seasonIds);
        reports?.forEach((r: { club_season_id: string }) => {
          reportCounts[r.club_season_id] = (reportCounts[r.club_season_id] || 0) + 1;
        });

        // AI Reports
        const { data: aiReports } = await supabase
          .from('club_ai_reports')
          .select('club_season_id')
          .in('club_season_id', seasonIds);
        aiReports?.forEach((r: { club_season_id: string }) => {
          aiReportCounts[r.club_season_id] = (aiReportCounts[r.club_season_id] || 0) + 1;
        });
      }

      // Videos count per club
      const clubIds = clubsData?.map((c: Club) => c.id) || [];
      if (clubIds.length > 0) {
        const { data: vids } = await supabase
          .from('club_videos')
          .select('club_id')
          .in('club_id', clubIds);
        vids?.forEach((v: { club_id: string }) => {
          videoCounts[v.club_id] = (videoCounts[v.club_id] || 0) + 1;
        });
      }

      // Merge
      const merged: ClubWithSeason[] = (clubsData || []).map((club: Club) => {
        const season = seasonMap[club.id];
        const sId = season?.id || '';
        const counts = {
          players: playerCounts[sId] || 0,
          staff: staffCounts[sId] || 0,
          play_models: playModelCounts[sId] || 0,
          videos: videoCounts[club.id] || 0,
          reports: reportCounts[sId] || 0,
          ai_reports: aiReportCounts[sId] || 0,
        };
        return {
          ...club,
          season,
          completitud: calcCompletitud(club, counts),
        };
      });

      setClubs(merged);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los clubes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [temporada]);

  const updateClub = useCallback(async (id: string, data: Partial<Club>): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: { ...data, id },
        conflict_columns: '{id}',
        staff_passkey: passkey,
      });
      if (rpcErr) throw rpcErr;
      await fetchClubs();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar';
      setError(message);
      return false;
    }
  }, [verifyWritePermission, fetchClubs]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { clubs, loading, error, refetch: fetchClubs, updateClub };
}
