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
  origen?: 'manual' | 'documento' | 'fvf' | 'die_ligen' | 'combinado' | 'rfef' | null;
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
  // Semántica RFEF:
  dobles_amarillas?: number | null; // Expulsiones por acumulación de segunda tarjeta amarilla (RFEF)
  rojas_directas?: number | null;   // Expulsiones por tarjeta roja directa (RFEF)
  expulsiones_totales?: number | null; // Total de expulsiones (dobles_amarillas + rojas_directas)
  tarjetas_rojas?: number | null;   // Expulsiones totales (alias para compatibilidad con componentes UI existentes)
  dorsal_partido_reciente?: number | null;
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
    doble_amarilla?: boolean;
    roja_directa?: boolean;
    tarjetas_rojas?: number; // 1 si fue expulsado en el partido (roja directa o doble amarilla), 0 si no
    sistema?: string | null;
  }>;
}

interface OfficialMatchRel {
  id?: string;
  jornada?: number;
  fecha?: string;
  local?: { nombre?: string } | null;
  visitor?: { nombre?: string } | null;
}

interface MatchPlayerStatRow {
  id: string;
  club_player_id: string;
  dorsal_partido: number | null;
  convocado: boolean;
  titular: boolean;
  minuto_entrada: number | null;
  minuto_salida: number | null;
  minutos: number;
  goles: number;
  amarillas: number;
  doble_amarilla: boolean;
  roja: boolean;
  official_matches: OfficialMatchRel | null;
}

export function useClubPlayers(seasonId: string | undefined, clubId?: string, temporada?: string) {
  const [players, setPlayers] = useState<ClubPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadPlayers = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener jugadores de la plantilla
      const { data, error: err } = await supabase
        .from('club_players')
        .select('*')
        .eq('club_season_id', seasonId)
        .order('posicion', { ascending: true })
        .order('dorsal', { ascending: true })
        .order('nombre', { ascending: true });

      if (err) throw err;
      const rawPlayers: ClubPlayer[] = data || [];

      if (rawPlayers.length === 0) {
        setPlayers([]);
        return;
      }

      // 2. Determinar club_id y temporada para calcular el denominador de partidos oficiales del equipo
      let targetClubId = clubId;
      let targetTemporada = temporada;

      if (!targetClubId || !targetTemporada) {
        const { data: seasonData } = await supabase
          .from('club_seasons')
          .select('club_id, temporada')
          .eq('id', seasonId)
          .maybeSingle();
        if (seasonData) {
          if (!targetClubId) targetClubId = seasonData.club_id;
          if (!targetTemporada) targetTemporada = seasonData.temporada;
        }
      }

      // 3. Consultar partidos oficiales del club en la temporada realmente jugados (con acta / jugado = true)
      // y cargar las estadísticas de los jugadores en paralelo
      const playerIds = rawPlayers.map(p => p.id);

      const [matchesCountRes, statsRes] = await Promise.all([
        targetClubId && targetTemporada
          ? supabase
              .from('official_matches')
              .select('id', { count: 'exact', head: true })
              .or(`local_club_id.eq.${targetClubId},visitor_club_id.eq.${targetClubId}`)
              .eq('temporada', targetTemporada)
              .eq('jugado', true)
          : Promise.resolve({ count: 0, error: null }),
        supabase
          .from('club_match_player_stats')
          .select(`
            id,
            club_player_id,
            dorsal_partido,
            convocado,
            titular,
            minuto_entrada,
            minuto_salida,
            minutos,
            goles,
            amarillas,
            doble_amarilla,
            roja,
            official_matches (
              id,
              jornada,
              fecha,
              local:local_club_id (nombre),
              visitor:visitor_club_id (nombre)
            )
          `)
          .in('club_player_id', playerIds)
      ]);

      const partidosEquipoJugados = (matchesCountRes as { count?: number | null }).count ?? 0;
      const minutosPosiblesEquipo = partidosEquipoJugados > 0 ? partidosEquipoJugados * 90 : null;

      const { data: statsData, error: statsErr } = statsRes as { data: MatchPlayerStatRow[] | null; error: Error | null };
      if (statsErr) {
        console.warn('[useClubPlayers] Advertencia al cargar estadísticas oficiales:', statsErr.message);
      }

      const statsMap = new Map<string, MatchPlayerStatRow[]>();
      ((statsData || []) as MatchPlayerStatRow[]).forEach(stat => {
        const list = statsMap.get(stat.club_player_id) || [];
        list.push(stat);
        statsMap.set(stat.club_player_id, list);
      });

      const enrichedPlayers: ClubPlayer[] = rawPlayers.map(player => {
        const pStats = statsMap.get(player.id) || [];
        const hasMatchStats = pStats.length > 0;

        // Si el equipo aún no tiene partidos oficiales jugados/importados y el jugador no tiene estadísticas:
        if (partidosEquipoJugados === 0 && !hasMatchStats) {
          return player;
        }

        // Ordenación cronológica determinista:
        // 1. fecha oficial (YYYY-MM-DD)
        // 2. jornada (número)
        // 3. id del partido oficial (desempate estable)
        // 4. id del registro de estadística (desempate final absoluto)
        pStats.sort((a, b) => {
          const dateA = a.official_matches?.fecha || '';
          const dateB = b.official_matches?.fecha || '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);

          const jA = a.official_matches?.jornada ?? 0;
          const jB = b.official_matches?.jornada ?? 0;
          if (jA !== jB) return jA - jB;

          const mIdA = a.official_matches?.id || '';
          const mIdB = b.official_matches?.id || '';
          if (mIdA !== mIdB) return mIdA.localeCompare(mIdB);

          return a.id.localeCompare(b.id);
        });

        const partidosDisponibles = pStats.filter(s => s.convocado).length;
        // PJ: convocado titular o que jugó minutos > 0. Suplente convocado que no juega: PJ = 0, minutos = 0
        const partidosJugados = pStats.filter(s => s.titular || (s.minutos && s.minutos > 0)).length;
        const titularidades = pStats.filter(s => s.titular).length;
        const entradasBanquillo = pStats.filter(s => !s.titular && s.minutos && s.minutos > 0).length;
        const minutosJugados = pStats.reduce((acc, s) => acc + (s.minutos || 0), 0);
        const goles = pStats.reduce((acc, s) => acc + (s.goles || 0), 0);

        // Semántica RFEF y distinciones:
        // amarillas: suma total de tarjetas amarillas recibidas
        const tarjetasAmarillas = pStats.reduce((acc, s) => acc + (s.amarillas || 0), 0);
        // dobles_amarillas: expulsiones por segunda tarjeta amarilla
        const doblesAmarillas = pStats.filter(s => s.doble_amarilla).length;
        // rojas_directas: expulsiones por roja directa (roja = true y no doble_amarilla)
        const rojasDirectas = pStats.filter(s => s.roja && !s.doble_amarilla).length;
        // expulsiones_totales: suma acumulada de todas las expulsiones (dobles amarillas + rojas directas)
        const expulsionesTotales = doblesAmarillas + rojasDirectas;
        // tarjetas_rojas: se preserva con el valor de expulsiones_totales para retrocompatibilidad con la UI
        const tarjetasRojas = expulsionesTotales;

        // Minutos posibles y porcentaje de participación (8C):
        // El denominador pertenece al equipo (partidos_oficiales_importados_y_jugados * 90)
        const minutosPosibles = minutosPosiblesEquipo;
        const porcentajeParticipacion = (minutosPosibles && minutosPosibles > 0)
          ? Number(((minutosJugados / minutosPosibles) * 100).toFixed(1))
          : null;

        // Determinación del dorsal oficial del partido más reciente:
        // No depende del orden de BD ni exclusivamente de jornada.
        // Utiliza la ordenación determinista por fecha oficial (con desempates estables)
        // para seleccionar el dorsal del último partido oficial registrado con dorsal válido.
        const statsConDorsal = pStats.filter(
          (s): s is MatchPlayerStatRow & { dorsal_partido: number } =>
            typeof s.dorsal_partido === 'number' && s.dorsal_partido > 0
        );
        const dorsalReciente = statsConDorsal.length > 0
          ? statsConDorsal[statsConDorsal.length - 1].dorsal_partido
          : null;

        const historialPartidos = pStats.map(s => {
          const match = s.official_matches;
          const localName = match?.local?.nombre || 'Local';
          const visitorName = match?.visitor?.nombre || 'Visitante';
          const esDobleAmarilla = Boolean(s.doble_amarilla);
          const esRojaDirecta = Boolean(s.roja && !s.doble_amarilla);
          const esExpulsion = esDobleAmarilla || esRojaDirecta || Boolean(s.roja);

          return {
            jornada: match?.jornada ?? '—',
            partido: `${localName} vs ${visitorName}`,
            fecha: match?.fecha || undefined,
            titular: Boolean(s.titular),
            minutos: s.minutos || 0,
            minuto_entrada: s.minuto_entrada,
            minuto_salida: s.minuto_salida,
            posicion: player.posicion || null,
            goles: s.goles || 0,
            tarjetas_amarillas: s.amarillas || 0,
            doble_amarilla: esDobleAmarilla,
            roja_directa: esRojaDirecta,
            tarjetas_rojas: esExpulsion ? 1 : 0,
          };
        });

        return {
          ...player,
          partidos_disponibles: partidosDisponibles,
          partidos_jugados: partidosJugados,
          titularidades: titularidades,
          entradas_banquillo: entradasBanquillo,
          minutos_jugados: minutosJugados,
          minutos_posibles: minutosPosibles,
          porcentaje_participacion: porcentajeParticipacion,
          goles: goles,
          tarjetas_amarillas: tarjetasAmarillas,
          dobles_amarillas: doblesAmarillas,
          rojas_directas: rojasDirectas,
          expulsiones_totales: expulsionesTotales,
          tarjetas_rojas: tarjetasRojas,
          dorsal_partido_reciente: dorsalReciente,
          historial_partidos: historialPartidos,
        };
      });

      setPlayers(enrichedPlayers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantilla');
    } finally {
      setLoading(false);
    }
  }, [seasonId, clubId, temporada]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const savePlayer = async (data: Partial<ClubPlayer>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      const isNew = !data.id;

      // Lista explícita y blindada de campos reales y persistentes de la tabla club_players
      // Se excluyen rigurosamente todas las propiedades calculadas o visuales de participación
      const payload: Record<string, unknown> = {
        club_season_id: seasonId,
        nombre: data.nombre ? data.nombre.trim() : '',
        foto_url: data.foto_url !== undefined ? data.foto_url : null,
        fecha_nacimiento: data.fecha_nacimiento || null,
        altura: data.altura !== undefined && data.altura !== null && (data.altura as unknown) !== '' ? Number(data.altura) : null,
        peso: data.peso !== undefined && data.peso !== null && (data.peso as unknown) !== '' ? Number(data.peso) : null,
        pierna_dominante: data.pierna_dominante || null,
        posicion: data.posicion || null,
        dorsal: data.dorsal !== undefined && data.dorsal !== null && (data.dorsal as unknown) !== '' ? Number(data.dorsal) : null,
        minutos_jugados: data.minutos_jugados !== undefined && data.minutos_jugados !== null ? Number(data.minutos_jugados) : 0,
        caracteristicas: data.caracteristicas || null,
        fortalezas: data.fortalezas || null,
        debilidades: data.debilidades || null,
        observaciones: data.observaciones || null,
        origen: data.origen || 'manual',
      };

      if (!isNew && data.id) {
        payload.id = data.id;
      }
      
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
