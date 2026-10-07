import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/planificacion/library-concepts
 * Retorna las tuplas de conceptos asignados a tareas de la biblioteca (planning_task_library_concepts).
 * Utiliza getSupabaseServerClient para leer la base de datos con permisos de servidor,
 * evitando el bloqueo de RLS para clientes anónimos en la vista de análisis.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('planning_task_library_concepts')
      .select('id, library_id, categoria, concepto, aprobado_por, aprobado_at, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API /api/planificacion/library-concepts] Error fetching concepts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: data || []
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[API /api/planificacion/library-concepts] Excepción:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
