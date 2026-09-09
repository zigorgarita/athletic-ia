import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ClubStaff {
  id: string;
  club_season_id: string;
  nombre: string;
  rol: 'Entrenador' | 'Segundo entrenador' | 'Preparador físico' | 'Entrenador de porteros' | 'Analista' | 'Delegado' | 'Otro';
  foto_url: string | null;
  observaciones: string | null;
  created_at: string;
}

export function useClubStaff(seasonId: string | undefined) {
  const [staff, setStaff] = useState<ClubStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadStaff = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('club_staff')
        .select('*')
        .eq('club_season_id', seasonId)
        // Damos prioridad al Entrenador, luego a los demás, y luego por nombre.
        // Pero en Supabase sin un enum complejo o un sort custom, simplemente ordenamos por nombre.
        // En el componente los agruparemos o ordenaremos.
        .order('nombre', { ascending: true });

      if (err) throw err;
      setStaff(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuerpo técnico');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const saveStaff = async (data: Partial<ClubStaff>): Promise<boolean> => {
    try {
      if (!seasonId) throw new Error('No season ID');
      verifyWritePermission();

      const payload = { ...data, club_season_id: seasonId };
      const res = await fetch('/api/clubs/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error al guardar staff (${res.status})`);
      }

      await loadStaff();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar staff');
      return false;
    }
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const res = await fetch(`/api/clubs/staff?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error al borrar staff (${res.status})`);
      }

      setStaff(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar staff');
      return false;
    }
  };

  return { staff, loading, error, refetch: loadStaff, saveStaff, deleteStaff };
}
