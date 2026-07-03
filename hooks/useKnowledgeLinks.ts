import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';
import { KnowledgeLink, KnowledgeEntry } from '@/types';

export function useKnowledgeLinks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();
  const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

  // Obtener todos los vínculos para una entrada de conocimiento concreta
  const fetchLinksForEntry = useCallback(async (entryId: string): Promise<KnowledgeLink[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('knowledge_links')
        .select('*')
        .eq('knowledge_entry_id', entryId);

      if (fetchErr) throw fetchErr;
      return (data || []) as KnowledgeLink[];
    } catch (err: any) {
      console.error(`Error al obtener vínculos de la entrada ${entryId}:`, err);
      setError(err.message || 'Error al obtener vinculaciones.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener todas las entradas de conocimiento vinculadas a una entidad externa
  const fetchLinksForEntity = useCallback(async (entityType: string, entityId: string): Promise<KnowledgeEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('knowledge_links')
        .select(`
          id,
          relacion,
          notas,
          entry:knowledge_entries (
            *,
            media:knowledge_media(*),
            tags:knowledge_tags(*)
          )
        `)
        .eq('linked_entity_type', entityType)
        .eq('linked_entity_id', entityId)
        .eq('entry.activo', true);

      if (fetchErr) throw fetchErr;

      // Filtrar aquellos donde entry es nulo (por ej. si está inactivo)
      const links = (data || []) as any[];
      const entries = links
        .filter(l => l.entry)
        .map(l => ({
          ...l.entry,
          // Guardar información del vínculo dentro de la propiedad link metadata
          linkInfo: {
            link_id: l.id,
            relacion: l.relacion,
            notas: l.notas
          }
        }));

      return entries as KnowledgeEntry[];
    } catch (err: any) {
      console.error(`Error al obtener conocimiento vinculado a ${entityType}/${entityId}:`, err);
      setError(err.message || 'Error al obtener conocimiento vinculado.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear una vinculación polimórfica
  const createLink = useCallback(async (
    entryId: string,
    entityType: string,
    entityId: string,
    relacion: string = 'relacionado',
    notas?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const payload = {
        knowledge_entry_id: entryId,
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        relacion,
        notas: notas || null
      };

      const { error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_links',
        payload,
        conflict_columns: ['knowledge_entry_id', 'linked_entity_type', 'linked_entity_id'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      return true;
    } catch (err: any) {
      console.error('Error al crear vinculación de conocimiento:', err);
      setError(err.message || 'Error al vincular conocimiento.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Quitar una vinculación
  const removeLink = useCallback(async (linkId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const { data, error: delErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'knowledge_links',
        record_id: linkId,
        staff_passkey: passkey
      });

      if (delErr) throw delErr;
      return !!data;
    } catch (err: any) {
      console.error('Error al eliminar vinculación:', err);
      setError(err.message || 'Error al desvincular conocimiento.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return {
    loading,
    error,
    fetchLinksForEntry,
    fetchLinksForEntity,
    createLink,
    removeLink
  };
}
