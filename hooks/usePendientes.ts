'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PendientePlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number;
  demarcacion: string;
  foto_url: string | null;
}

export interface PendienteInjury {
  id: string;
  player_id: string;
  tipo_lesion: string;
  diagnostico: string;
  estado: 'Activa' | 'En recuperación' | 'Recaída';
  fecha_lesion: string;
  fecha_prevista_recuperacion: string | null;
  zona_afectada: string | null;
  player: PendientePlayer;
}

export interface PendienteFine {
  id: string;
  player_id: string;
  motivo: string;
  fecha: string;
  contexto: string;
  importe: number;
  cantidad: number;
  estado: 'Pendiente';
  observaciones: string | null;
  player: PendientePlayer;
}

export type MeetingEstado = 'Pendiente' | 'En seguimiento';
export type MeetingClasificacion = 'Vencida' | 'Hoy' | 'Próxima';

export interface PendienteMeeting {
  id: string;
  player_id: string;
  motivo: string;
  fecha: string;
  estado: MeetingEstado;
  solicitada_por: 'Jugador' | 'Staff';
  clasificacion: MeetingClasificacion;
  player: PendientePlayer;
}

export interface PendientesData {
  injuries: PendienteInjury[];
  fines: PendienteFine[];
  meetings: PendienteMeeting[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function classifyMeeting(fecha: string): MeetingClasificacion {
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  if (fecha < todayStr) return 'Vencida';
  if (fecha === todayStr) return 'Hoy';
  return 'Próxima';
}

function sortMeetings(meetings: PendienteMeeting[]): PendienteMeeting[] {
  const order: Record<MeetingClasificacion, number> = {
    Vencida: 0,
    Hoy: 1,
    Próxima: 2,
  };
  return [...meetings].sort((a, b) => {
    const classDiff = order[a.clasificacion] - order[b.clasificacion];
    if (classDiff !== 0) return classDiff;
    // Within same class: ascending by fecha (closest first)
    return a.fecha.localeCompare(b.fecha);
  });
}

export function usePendientes(): PendientesData {
  const [injuries, setInjuries] = useState<PendienteInjury[]>([]);
  const [fines, setFines] = useState<PendienteFine[]>([]);
  const [meetings, setMeetings] = useState<PendienteMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [injRes, finesRes, meetRes] = await Promise.all([
          supabase
            .from('player_injuries')
            .select('id, player_id, tipo_lesion, diagnostico, estado, fecha_lesion, fecha_prevista_recuperacion, zona_afectada, players(id, nombre, apellidos, dorsal, demarcacion, foto_url)')
            .in('estado', ['Activa', 'En recuperación', 'Recaída'])
            .order('fecha_lesion', { ascending: false }),

          supabase
            .from('player_fines')
            .select('id, player_id, motivo, fecha, contexto, importe, cantidad, estado, observaciones, players(id, nombre, apellidos, dorsal, demarcacion, foto_url)')
            .eq('estado', 'Pendiente')
            .order('fecha', { ascending: false }),

          supabase
            .from('player_meetings')
            .select('id, player_id, motivo, fecha, estado, solicitada_por, players(id, nombre, apellidos, dorsal, demarcacion, foto_url)')
            .in('estado', ['Pendiente', 'En seguimiento'])
            .order('fecha', { ascending: true }),
        ]);

        if (cancelled) return;

        if (injRes.error) throw injRes.error;
        if (finesRes.error) throw finesRes.error;
        if (meetRes.error) throw meetRes.error;

        const injuryData: PendienteInjury[] = (injRes.data ?? []).map((row: any) => ({
          id: row.id,
          player_id: row.player_id,
          tipo_lesion: row.tipo_lesion,
          diagnostico: row.diagnostico,
          estado: row.estado,
          fecha_lesion: row.fecha_lesion,
          fecha_prevista_recuperacion: row.fecha_prevista_recuperacion,
          zona_afectada: row.zona_afectada,
          player: row.players as PendientePlayer,
        }));

        const fineData: PendienteFine[] = (finesRes.data ?? []).map((row: any) => ({
          id: row.id,
          player_id: row.player_id,
          motivo: row.motivo,
          fecha: row.fecha,
          contexto: row.contexto,
          importe: row.importe,
          cantidad: row.cantidad,
          estado: row.estado,
          observaciones: row.observaciones,
          player: row.players as PendientePlayer,
        }));

        const meetingData: PendienteMeeting[] = sortMeetings(
          (meetRes.data ?? []).map((row: any) => ({
            id: row.id,
            player_id: row.player_id,
            motivo: row.motivo,
            fecha: row.fecha,
            estado: row.estado,
            solicitada_por: row.solicitada_por,
            clasificacion: classifyMeeting(row.fecha),
            player: row.players as PendientePlayer,
          }))
        );

        setInjuries(injuryData);
        setFines(fineData);
        setMeetings(meetingData);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Error al cargar pendientes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [tick]);

  const total = injuries.length + fines.length + meetings.length;
  return { injuries, fines, meetings, total, loading, error, refetch };
}
