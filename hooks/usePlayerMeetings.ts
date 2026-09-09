import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface PlayerMeeting {
  id: string;
  player_id: string;
  fecha: string;
  solicitada_por: 'Jugador' | 'Staff';
  motivo: string;
  desarrollo?: string | null;
  resolucion?: string | null;
  estado: 'Pendiente' | 'En seguimiento' | 'Resuelta';
  participantes?: string[] | null;
  adjuntos?: any[] | null;
  firma_url?: string | null;
  seguimiento_notas?: string | null;
  recordatorio_fecha?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function usePlayerMeetings(playerId: string | null) {
  const [meetings, setMeetings] = useState<PlayerMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchMeetings = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('player_meetings')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha', { ascending: false });

      if (supabaseError) throw supabaseError;
      setMeetings((data || []) as PlayerMeeting[]);
    } catch (err: any) {
      setError(err.message || 'Error al obtener reuniones');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const createMeeting = useCallback(async (meeting: Omit<PlayerMeeting, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerMeeting | null> => {
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al crear la reunión');
      }

      const created = result?.data as PlayerMeeting;
      setMeetings((prev) => [created, ...prev]);
      return created;
    } catch (err: any) {
      setError(err.message || 'Error al crear la reunión');
      return null;
    }
  }, [verifyWritePermission]);

  const updateMeeting = useCallback(async (meetingId: string, updates: Partial<PlayerMeeting>): Promise<boolean> => {
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/players/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meetingId, updates }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al actualizar la reunión');
      }

      await fetchMeetings();
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la reunión');
      return false;
    }
  }, [verifyWritePermission, fetchMeetings]);

  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/players/meetings?id=${encodeURIComponent(meetingId)}`, {
        method: 'DELETE',
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || 'Error al eliminar la reunión');
      }

      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la reunión');
      return false;
    }
  }, [verifyWritePermission]);

  useEffect(() => {
    if (playerId) {
      fetchMeetings();
    } else {
      setMeetings([]);
    }
  }, [playerId, fetchMeetings]);

  return {
    meetings,
    loading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    refetch: fetchMeetings
  };
}
