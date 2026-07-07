import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Rival, RivalVideo } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

export function useRivals() {
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchRivals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('rivals')
        .select('*')
        .order('nombre', { ascending: true });

      if (supabaseError) throw supabaseError;
      setRivals(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la lista de rivales');
    } finally {
      setLoading(false);
    }
  }, []);

  const getRival = async (id: string): Promise<Rival | null> => {
    try {
      const { data, error } = await supabase
        .from('rivals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching rival:', err);
      return null;
    }
  };

  const createRival = async (rivalData: Omit<Rival, 'id' | 'created_at'>): Promise<Rival | null> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'rivals',
          payload: rivalData,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setRivals((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al crear el rival');
      return null;
    }
  };

  const updateRival = async (id: string, rivalData: Partial<Omit<Rival, 'id' | 'created_at'>>): Promise<Rival | null> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'rivals',
          payload: { ...rivalData, id },
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setRivals((prev) => prev.map((r) => (r.id === id ? data : r)));
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el rival');
      return null;
    }
  };

  const deleteRival = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'rivals',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      setRivals((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el rival');
      return false;
    }
  };

  // --- VIDEOS ---

  const getRivalVideos = async (rivalId: string): Promise<RivalVideo[]> => {
    try {
      const { data, error } = await supabase
        .from('rival_videos')
        .select('*')
        .eq('rival_id', rivalId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching rival videos:', err);
      return [];
    }
  };

  const createRivalVideo = async (videoData: Omit<RivalVideo, 'id' | 'created_at'>): Promise<RivalVideo | null> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data, error: supabaseError } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'rival_videos',
          payload: videoData,
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return data;
    } catch (err: any) {
      console.error('Error creando video de rival:', err);
      return null;
    }
  };

  const deleteRivalVideo = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: supabaseError } = await supabase
        .rpc('exec_secure_delete', {
          target_table: 'rival_videos',
          record_id: id,
          staff_passkey: passkey
        });

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      console.error('Error eliminando video de rival:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchRivals();
  }, [fetchRivals]);

  return {
    rivals,
    loading,
    error,
    getRival,
    createRival,
    updateRival,
    deleteRival,
    getRivalVideos,
    createRivalVideo,
    deleteRivalVideo,
    refetch: fetchRivals,
  };
}
