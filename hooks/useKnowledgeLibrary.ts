import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditMode } from '@/context/EditModeContext';
import { 
  KnowledgeEntry, 
  KnowledgeCategory, 
  KnowledgePhase, 
  KnowledgeQueryContext,
  KnowledgeMedia
} from '@/types';
import { uploadToStorage, STORAGE_PATHS } from '@/lib/storage';

export interface KnowledgeFilters {
  categoria?: string;
  fase_juego?: string;
  sistema_asociado?: string;
  posicion_asociada?: string;
  search?: string;
  activo?: boolean;
  tag?: string;
}

export function useKnowledgeLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();
  const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

  // Obtener todas las entradas con filtros
  const fetchEntries = useCallback(async (filters?: KnowledgeFilters): Promise<KnowledgeEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('knowledge_entries')
        .select(`
          *,
          media:knowledge_media(*),
          tags:knowledge_tags(*),
          links:knowledge_links(*)
        `)
        .order('created_at', { ascending: false });

      if (filters) {
        if (filters.activo !== undefined) {
          query = query.eq('activo', filters.activo);
        } else {
          // Por defecto mostrar solo activos
          query = query.eq('activo', true);
        }

        if (filters.categoria) {
          query = query.eq('categoria', filters.categoria);
        }
        if (filters.fase_juego) {
          query = query.eq('fase_juego', filters.fase_juego);
        }
        if (filters.sistema_asociado) {
          query = query.eq('sistema_asociado', filters.sistema_asociado);
        }
        if (filters.posicion_asociada) {
          query = query.eq('posicion_asociada', filters.posicion_asociada);
        }
        if (filters.search) {
          query = query.ilike('titulo', `%${filters.search}%`);
        }
      } else {
        query = query.eq('activo', true);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      let result = (data || []) as KnowledgeEntry[];

      // Filtrar por tag en memoria si se especifica (para evitar joins complejos)
      if (filters?.tag) {
        const cleanTag = filters.tag.toLowerCase().trim();
        result = result.filter(entry => 
          entry.tags?.some(t => t.tag.toLowerCase().trim() === cleanTag)
        );
      }

      return result;
    } catch (err: any) {
      console.error('Error al obtener entradas de conocimiento:', err);
      setError(err.message || 'Error al obtener biblioteca de conocimiento.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener una única entrada
  const fetchEntry = useCallback(async (id: string): Promise<KnowledgeEntry | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('knowledge_entries')
        .select(`
          *,
          media:knowledge_media(*),
          tags:knowledge_tags(*),
          links:knowledge_links(*)
        `)
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;
      return data as KnowledgeEntry;
    } catch (err: any) {
      console.error(`Error al obtener la entrada ${id}:`, err);
      setError(err.message || 'Error al obtener detalle del conocimiento.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar entradas usando Full-Text Search o coincidencia
  const searchEntries = useCallback(async (searchQuery: string): Promise<KnowledgeEntry[]> => {
    if (!searchQuery.trim()) return fetchEntries();
    setLoading(true);
    setError(null);
    try {
      // Intentar textSearch en español, si falla usar ilike como fallback
      const { data, error: searchErr } = await supabase
        .from('knowledge_entries')
        .select(`
          *,
          media:knowledge_media(*),
          tags:knowledge_tags(*),
          links:knowledge_links(*)
        `)
        .eq('activo', true)
        .textSearch('titulo', searchQuery, { config: 'spanish', type: 'websearch' });

      if (searchErr) {
        // Fallback simple si no hay índices configurados aún en local
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('knowledge_entries')
          .select(`
            *,
            media:knowledge_media(*),
            tags:knowledge_tags(*),
            links:knowledge_links(*)
          `)
          .eq('activo', true)
          .or(`titulo.ilike.%${searchQuery}%,descripcion.ilike.%${searchQuery}%,principio_clave.ilike.%${searchQuery}%`);
        
        if (fallbackErr) throw fallbackErr;
        return (fallbackData || []) as KnowledgeEntry[];
      }

      return (data || []) as KnowledgeEntry[];
    } catch (err: any) {
      console.error('Error al buscar conocimiento:', err);
      setError(err.message || 'Error al buscar en la biblioteca.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchEntries]);

  // Consulta universal para el asistente IA y otros componentes
  const getKnowledgeForContext = useCallback(async (ctx: KnowledgeQueryContext): Promise<KnowledgeEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('knowledge_entries')
        .select(`
          *,
          media:knowledge_media(*),
          tags:knowledge_tags(*),
          links:knowledge_links(*)
        `)
        .eq('activo', true);

      // Filtros del contexto
      if (ctx.sistema) {
        query = query.or(`sistema_asociado.eq.${ctx.sistema},sistema_asociado.is.null`);
      }
      if (ctx.fase) {
        query = query.or(`fase_juego.eq.${ctx.fase},fase_juego.eq.Global,fase_juego.is.null`);
      }
      if (ctx.posicion) {
        query = query.or(`posicion_asociada.eq.${ctx.posicion},posicion_asociada.is.null`);
      }
      if (ctx.categoria) {
        query = query.eq('categoria', ctx.categoria);
      }

      if (ctx.limit) {
        query = query.limit(ctx.limit);
      } else {
        query = query.limit(20); // Limite por defecto razonable
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      let result = (data || []) as KnowledgeEntry[];

      // Filtrado adicional en memoria por tags si aplica
      if (ctx.tags && ctx.tags.length > 0) {
        const cleanTags = ctx.tags.map(t => t.toLowerCase().trim());
        result = result.filter(entry => 
          entry.tags?.some(t => cleanTags.includes(t.tag.toLowerCase().trim()))
        );
      }

      return result;
    } catch (err: any) {
      console.error('Error en getKnowledgeForContext:', err);
      setError(err.message || 'Error en consulta contextual.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar entrada (insert/update)
  const saveEntry = useCallback(async (entry: Partial<KnowledgeEntry>): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      
      const payload = {
        ...entry,
        updated_at: new Date().toISOString()
      };

      const { data, error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_entries',
        payload,
        conflict_columns: ['id'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      
      // La rpc devuelve el registro insertado/modificado como JSONB
      const saved = data as any;
      return saved?.id || entry.id || null;
    } catch (err: any) {
      console.error('Error al guardar entrada de conocimiento:', err);
      setError(err.message || 'Error al guardar conocimiento.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Archivar entrada (soft-delete)
  const archiveEntry = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      
      const { error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_entries',
        payload: { id, activo: false, updated_at: new Date().toISOString() },
        conflict_columns: ['id'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      return true;
    } catch (err: any) {
      console.error('Error al archivar entrada de conocimiento:', err);
      setError(err.message || 'Error al archivar conocimiento.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Eliminar entrada permanente (hard-delete)
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      
      const { data, error: delErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'knowledge_entries',
        record_id: id,
        staff_passkey: passkey
      });

      if (delErr) throw delErr;
      return !!data;
    } catch (err: any) {
      console.error('Error al eliminar entrada permanentemente:', err);
      setError(err.message || 'Error al eliminar conocimiento.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Agregar medio a una entrada
  const addMedia = useCallback(async (media: Omit<KnowledgeMedia, 'id' | 'created_at'>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const { error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_media',
        payload: media,
        conflict_columns: ['id'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      return true;
    } catch (err: any) {
      console.error('Error al añadir recurso multimedia:', err);
      setError(err.message || 'Error al añadir multimedia.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Quitar medio
  const removeMedia = useCallback(async (mediaId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const { data, error: delErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'knowledge_media',
        record_id: mediaId,
        staff_passkey: passkey
      });

      if (delErr) throw delErr;
      return !!data;
    } catch (err: any) {
      console.error('Error al eliminar recurso multimedia:', err);
      setError(err.message || 'Error al eliminar multimedia.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Subir archivo real a Supabase Storage y registrar en la BD
  const uploadFile = useCallback(async (
    entryId: string, 
    file: File, 
    tipo: 'video' | 'pdf' | 'imagen' | 'enlace',
    titulo?: string,
    descripcion?: string
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      // Determinar la subcarpeta organizada por tipo de archivo
      let storageFolder: string = STORAGE_PATHS.knowledge.exports;
      if (tipo === 'video') storageFolder = STORAGE_PATHS.knowledge.videos;
      if (tipo === 'pdf') storageFolder = STORAGE_PATHS.knowledge.pdfs;
      if (tipo === 'imagen') storageFolder = STORAGE_PATHS.knowledge.images;

      // Subir archivo al bucket jerárquico indautxu-assets
      const publicUrl = await uploadToStorage(storageFolder, file);

      if (!publicUrl) throw new Error('No se pudo obtener la URL pública tras la subida.');

      // Registrar en la tabla de recursos multimedia vinculados
      const success = await addMedia({
        knowledge_entry_id: entryId,
        tipo_media: tipo,
        titulo: titulo || file.name,
        url: publicUrl,
        tipo_origen: 'Archivo',
        descripcion: descripcion || `Archivo subido: ${file.name}`,
        orden: 0,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      if (!success) throw new Error('Error al registrar el archivo subido en la base de datos.');

      return publicUrl;
    } catch (err: any) {
      console.error('Error en uploadFile:', err);
      setError(err.message || 'Error al subir y registrar archivo.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission, addMedia]);

  // Añadir Tag
  const addTag = useCallback(async (entryId: string, tag: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      
      const cleanTag = tag.trim();
      if (!cleanTag) return false;

      const { error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_tags',
        payload: { knowledge_entry_id: entryId, tag: cleanTag },
        conflict_columns: ['knowledge_entry_id', 'tag'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      return true;
    } catch (err: any) {
      console.error('Error al añadir etiqueta:', err);
      setError(err.message || 'Error al añadir etiqueta.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Quitar Tag
  const removeTag = useCallback(async (tagId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const { data, error: delErr } = await supabase.rpc('exec_secure_delete', {
        target_table: 'knowledge_tags',
        record_id: tagId,
        staff_passkey: passkey
      });

      if (delErr) throw delErr;
      return !!data;
    } catch (err: any) {
      console.error('Error al eliminar etiqueta:', err);
      setError(err.message || 'Error al eliminar etiqueta.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  // Listar todas las etiquetas del sistema para autocompletado
  const fetchAllTags = useCallback(async (): Promise<string[]> => {
    try {
      const { data, error: qErr } = await supabase
        .from('knowledge_tags')
        .select('tag');
      
      if (qErr) throw qErr;
      
      const rawTags = data?.map(t => t.tag) || [];
      // Devolver elementos únicos sin duplicados
      return Array.from(new Set(rawTags)).sort();
    } catch (err) {
      console.error('Error al obtener etiquetas:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    fetchEntries,
    fetchEntry,
    searchEntries,
    getKnowledgeForContext,
    saveEntry,
    archiveEntry,
    deleteEntry,
    addMedia,
    removeMedia,
    uploadFile,
    addTag,
    removeTag,
    fetchAllTags
  };
}
