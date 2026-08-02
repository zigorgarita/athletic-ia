'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePendientesCount() {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      try {
        const [injRes, finesRes, meetRes] = await Promise.all([
          supabase
            .from('player_injuries')
            .select('*', { count: 'exact', head: true })
            .in('estado', ['Activa', 'En recuperación', 'Recaída']),
          supabase
            .from('player_fines')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'Pendiente'),
          supabase
            .from('player_meetings')
            .select('*', { count: 'exact', head: true })
            .in('estado', ['Pendiente', 'En seguimiento']),
        ]);

        if (cancelled) return;

        const injuries = injRes.count ?? 0;
        const fines = finesRes.count ?? 0;
        const meetings = meetRes.count ?? 0;
        setTotal(injuries + fines + meetings);
      } catch {
        // silently fail — badge simply won't show
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  return { total, loading };
}
