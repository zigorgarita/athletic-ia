import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 1. Validar sesión server-side de staff (HttpOnly Cookie)
    const session = await getStaffSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere inicio de sesión del cuerpo técnico.' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const playerId = resolvedParams.id;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'ID de jugador no proporcionado' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

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
