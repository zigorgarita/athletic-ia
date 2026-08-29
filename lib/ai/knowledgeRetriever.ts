import { SupabaseClient } from '@supabase/supabase-js';

export interface KnowledgeQueryOptions {
  systemOwn?: string;
  systemRival?: string;
  category?: string;
  includePrecedents?: boolean;
  limit?: number;
}

export interface FormattedKnowledgeEntry {
  titulo: string;
  categoria: string;
  principio_clave: string | null;
  descripcion: string;
  consignas: string[] | null;
  metadata?: Record<string, unknown>;
}

/**
 * Recuperador común de conocimiento táctico y precedentes de Aitor (RAG ligero)
 * Utilizado de manera unificada por IA Pizarra e IA Scouting.
 */
export async function fetchRelevantKnowledge(
  supabaseClient: SupabaseClient,
  options: KnowledgeQueryOptions = {}
): Promise<string> {
  const {
    systemOwn = '1-4-2-3-1',
    systemRival,
    category,
    includePrecedents = true,
    limit = 10
  } = options;

  try {
    let query = supabaseClient
      .from('knowledge_entries')
      .select('titulo, categoria, principio_clave, descripcion, consignas, metadata')
      .eq('activo', true);

    // Filtros por sistema o generales
    const systemFilters: string[] = ['sistema_asociado.is.null'];
    if (systemOwn) systemFilters.push(`sistema_asociado.eq.${systemOwn}`);
    if (systemRival) systemFilters.push(`sistema_asociado.eq.${systemRival}`);

    query = query.or(systemFilters.join(','));

    if (category) {
      query = query.eq('categoria', category);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.warn('[fetchRelevantKnowledge] Advertencia al consultar knowledge_entries:', error.message);
      return '';
    }

    if (!data || data.length === 0) {
      return '';
    }

    let entries = data as FormattedKnowledgeEntry[];
    
    if (!includePrecedents) {
      entries = entries.filter(k => k.metadata?.tipo !== 'precedente_entrenador' && k.categoria !== 'Casos Míster');
    }

    const lines: string[] = [];

    entries.forEach((k) => {
      const isPrecedent = k.metadata?.tipo === 'precedente_entrenador' || k.categoria === 'Casos Míster';
      const label = isPrecedent ? `[PRECEDENTE ENTRENADOR / CASO MÍSTER]` : `[${k.categoria}]`;
      let entryText = `${label} ${k.titulo}`;
      if (k.principio_clave) entryText += `\n- Principio: ${k.principio_clave}`;
      if (k.consignas && k.consignas.length > 0) entryText += `\n- Consignas: ${k.consignas.join(', ')}`;
      if (k.descripcion && k.descripcion.length < 250) entryText += `\n- Detalle: ${k.descripcion}`;
      lines.push(entryText);
    });

    return lines.join('\n\n');
  } catch (err: unknown) {
    console.warn('[fetchRelevantKnowledge] Error inesperado en recuperación:', err);
    return '';
  }
}
