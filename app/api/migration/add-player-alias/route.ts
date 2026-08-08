import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Ruta de migración puntual: añade la columna `alias TEXT NULL` a la tabla `players`.
 * Solo accesible internamente; no expuesta en producción de forma permanente.
 * Ejecutar UNA SOLA VEZ vía POST /api/migration/add-player-alias
 */
export async function POST() {
  try {
    const supabase = getSupabaseServerClient();

    // Ejecutar ALTER TABLE usando la API de Supabase con service_role
    // Supabase JS no permite DDL directamente; lo hacemos a través de la función rpc exec_sql si existe,
    // o a través de un UPDATE ficticio que fuerza a Supabase a revalidar el schema cache.
    // La alternativa más segura: usar el cliente REST de Supabase para ejecutar SQL raw via pg_catalog.

    // Intentamos con exec_sql (disponible en algunos proyectos con service_role)
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.players ADD COLUMN IF NOT EXISTS alias TEXT NULL;'
    });

    if (error) {
      // Si exec_sql no está disponible, informamos al usuario con las instrucciones manuales
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          instructions: [
            'La función exec_sql no está disponible via RPC.',
            'Ejecuta manualmente en el SQL Editor de Supabase:',
            'ALTER TABLE public.players ADD COLUMN IF NOT EXISTS alias TEXT NULL;'
          ]
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
