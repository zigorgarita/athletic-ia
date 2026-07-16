import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Normalizar nombres para mapearlos uniformemente
export function normalizeClubName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quita acentos y diacríticos
    .replace(/[^a-z0-9]/g, ''); // Deja solo letras y números
}

export function useClubLogos() {
  const [logosMap, setLogosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogos() {
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('nombre, escudo_url');
        
        if (error) throw error;

        const map: Record<string, string> = {};
        data?.forEach((c: { nombre: string; escudo_url: string | null }) => {
          if (c.escudo_url) {
            map[normalizeClubName(c.nombre)] = c.escudo_url;
          }
        });
        setLogosMap(map);
      } catch (err) {
        console.error('Error fetching club logos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogos();
  }, []);

  const getLogo = (clubName: string): string | null => {
    if (!clubName) return null;
    return logosMap[normalizeClubName(clubName)] || null;
  };

  return { getLogo, logosMap, loading };
}
