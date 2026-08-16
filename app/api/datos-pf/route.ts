import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cliente Supabase de servidor con credencial administrativa privada (Zero Public Fallback)
function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jdkshextphguyyiwwtyt.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey.trim().length === 0) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables privadas de servidor.');
  }

  return createClient(url, serviceKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: Request) {
  try {
    // 1. Validar sesión server-side de staff (HttpOnly Cookie)
    const session = await getStaffSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere inicio de sesión del cuerpo técnico.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'ID de jugador no proporcionado' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // 2. Consultar tests físicos
    const { data: tests, error: testsError } = await supabase
      .from('player_physical_tests')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (testsError) {
      console.error('Error consultando player_physical_tests:', testsError.message);
      return NextResponse.json(
        { success: false, error: 'Error al consultar tests físicos' },
        { status: 500 }
      );
    }

    // 3. Consultar mediciones corporales
    const { data: measurements, error: medsError } = await supabase
      .from('player_body_measurements')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (medsError) {
      console.error('Error consultando player_body_measurements:', medsError.message);
      return NextResponse.json(
        { success: false, error: 'Error al consultar mediciones corporales' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playerId,
      tests: tests || [],
      measurements: measurements || [],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('Error interno en API datos-pf:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
