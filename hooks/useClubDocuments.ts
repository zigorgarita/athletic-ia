import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';

export interface ClubDocument {
  id: string;
  club_id: string;
  club_season_id: string | null;
  scouting_match_id: string | null;
  nombre: string;
  tipo: 'PDF' | 'Informe' | 'PowerPoint' | 'Word' | 'Excel' | 'Imagen' | 'Enlace' | null;
  url: string;
  comentario: string | null;
  fecha: string | null;
  created_at: string;
}

export function useClubDocuments(clubId: string | undefined, seasonId: string | undefined) {
  const [documents, setDocuments] = useState<ClubDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadDocuments = useCallback(async () => {
    if (!clubId && !seasonId) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('club_documents').select('*');
      
      if (seasonId) {
        query = query.or(`club_season_id.eq.${seasonId},club_season_id.is.null`).eq('club_id', clubId);
      } else if (clubId) {
        query = query.eq('club_id', clubId);
      }
      
      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;
      setDocuments(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [clubId, seasonId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const saveDocument = async (data: Partial<ClubDocument>): Promise<boolean> => {
    try {
      if (!clubId) throw new Error('No club ID');
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      
      const isNew = !data.id;
      const payload = { 
        ...data, 
        club_id: clubId,
        club_season_id: data.club_season_id || seasonId || null 
      };
      
      const { error: rpcErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'club_documents',
        payload: payload,
        conflict_columns: isNew ? null : '{id}',
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      await loadDocuments();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar documento');
      return false;
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error: rpcErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'club_documents',
        record_id: id,
        staff_passkey: passkey,
      });

      if (rpcErr) throw rpcErr;
      setDocuments(prev => prev.filter(d => d.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al borrar documento');
      return false;
    }
  };

  return { documents, loading, error, refetch: loadDocuments, saveDocument, deleteDocument };
}
