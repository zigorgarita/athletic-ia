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
  estado_analisis?: 'sin_analizar' | 'pendiente_confirmar' | 'analizado' | 'error' | null;
  extraccion_json?: any | null;
  analysis_generated_at?: string | null;
  analyzed_at?: string | null;
  file_hash?: string | null;
  document_group_id?: string | null;
  version?: number;
  parent_document_id?: string | null;
  is_current_version?: boolean;
  created_at: string;
}

export function useClubDocuments(clubId: string | undefined, seasonId: string | undefined) {
  const [documents, setDocuments] = useState<ClubDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission, currentUser } = useEditMode();

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
      setError(null);

      const editorUser = currentUser?.id || 'zigor';
      const editorPass = currentUser?.pass || '';

      const res = await fetch('/api/rivales/save-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-user': editorUser,
          'x-editor-pass': editorPass,
        },
        body: JSON.stringify({
          clubId,
          clubSeasonId: data.club_season_id || seasonId || null,
          nombre: data.nombre,
          url: data.url,
          tipo: data.tipo,
          fecha: data.fecha,
          comentario: data.comentario,
        }),
      });

      const resText = await res.text();
      let resJson: Record<string, any> = {};
      try {
        resJson = JSON.parse(resText);
      } catch {
        throw new Error(`Error en respuesta del servidor [${res.status}]: ${resText.slice(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(resJson.error || `Error al guardar documento [${res.status}]`);
      }

      if (resJson.isDuplicate) {
        alert(resJson.message);
        return false;
      }

      await loadDocuments();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar documento';
      setError(msg);
      alert(`No se pudo guardar el documento: ${msg}`);
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
